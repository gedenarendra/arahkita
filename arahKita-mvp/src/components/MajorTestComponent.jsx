import { useState, useEffect } from "react";
import GraphNodeComponent from "./graphNodeComponent";
import TestPages from "../pages/testPages";
import logoArahkita from "../assets/Logo.png";
import mathIllustration from "../assets/math_illustration.png";
import {
  POSITION_TEMPLATES,
  generateNodesList,
  mapMinicasesToTestNodes,
} from "../utils/testNodeUtils";
import {
  generateMinicases,
  evaluateEssayAnswer,
  generateMajorPreview,
} from "../api/minicaseApi";
import minicaseRepository from "../repositories/minicaseRepository";
import recommendationRepository from "../repositories/recommendationRepository";

function MajorTestComponent({
  majorData = null,
  major = "Math",
  onBack,
  onNavigateToRecommendation,
  nodesData = null,
  totalNodes = 8,
  positionTemplate = POSITION_TEMPLATES.ZIGZAG_LEFT,
  hiddens = null,
}) {
  const [unlockedLevel, setUnlockedLevel] = useState(2);
  const [completedLevels, setCompletedLevels] = useState([]);
  const [activeTestView, setActiveTestView] = useState(null);

  // State untuk fetch minicases dari backend / IndexedDB
  const [minicases, setMinicases] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(majorData?.id));
  const [errorMessage, setErrorMessage] = useState("");
  const [useFallbackMock, setUseFallbackMock] = useState(!majorData?.id);

  // State untuk submit esai dan pembuatan preview trial
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testErrorMessage, setTestErrorMessage] = useState("");
  const [showSpamWarningModal, setShowSpamWarningModal] = useState(false);
  const [pendingSpamSubmission, setPendingSpamSubmission] = useState(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [previewResult, setPreviewResult] = useState(null);

  // Ambil atau generate minicases saat komponen dibuka
  useEffect(() => {
    if (!majorData?.id) {
      return;
    }

    let isMounted = true;

    // Periksa apakah preview jurusan sudah pernah dihasilkan sebelumnya
    recommendationRepository.getPreviewByMajorId(majorData.id).then((prev) => {
      if (isMounted && prev) {
        setPreviewResult(prev);
      }
    });

    generateMinicases({
      major_id: majorData.id,
      major_name: major,
      circle_color: majorData.circle_color,
    })
      .then((res) => {
        if (!isMounted) return;
        setIsLoading(false);

        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setMinicases(res.data);
          setErrorMessage("");

          // Restore progress jika ada minicase yang sudah selesai sebelumnya
          const doneLevels = res.data
            .filter((mc) => mc.is_done)
            .map((mc) => mc.minicase_number);

          if (doneLevels.length > 0) {
            setCompletedLevels((prev) => [
              ...new Set([...prev, 1, ...doneLevels]),
            ]);
            setUnlockedLevel((prev) =>
              Math.max(prev, Math.max(...doneLevels) + 1),
            );
          }
        } else {
          setErrorMessage(
            res.error ||
              "Gagal memuat studi kasus interaktif untuk jurusan ini.",
          );
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setIsLoading(false);
        setErrorMessage(err?.message || "Terjadi kesalahan jaringan.");
      });

    return () => {
      isMounted = false;
    };
  }, [majorData?.id, major, majorData?.circle_color]);

  const handleRetry = () => {
    if (!majorData?.id) return;
    setIsLoading(true);
    setErrorMessage("");

    generateMinicases({
      major_id: majorData.id,
      major_name: major,
      circle_color: majorData.circle_color,
    })
      .then((res) => {
        setIsLoading(false);
        if (res.success && Array.isArray(res.data) && res.data.length > 0) {
          setMinicases(res.data);
          setErrorMessage("");
        } else {
          setErrorMessage(
            res.error ||
              "Gagal memuat studi kasus interaktif untuk jurusan ini.",
          );
        }
      })
      .catch((err) => {
        setIsLoading(false);
        setErrorMessage(err?.message || "Terjadi kesalahan jaringan.");
      });
  };

  // Buat seluruh node dinamis:
  // - Jika ada minicases dari backend / IndexedDB: gunakan mapMinicasesToTestNodes
  // - Jika menggunakan fallback: gunakan generateNodesList
  const allGeneratedNodes =
    Array.isArray(minicases) && minicases.length > 0
      ? mapMinicasesToTestNodes({
          minicases,
          major,
          template: positionTemplate,
        })
      : generateNodesList({
          nodesData,
          totalCount: totalNodes,
          template: positionTemplate,
          major,
        });

  // Logika penyembunyian node menggunakan props hiddens
  const isNodeHidden = (node, index) => {
    if (hiddens === null || hiddens === undefined) {
      return node.data.level > unlockedLevel;
    }
    if (Array.isArray(hiddens)) {
      return (
        hiddens.includes(node.id) ||
        hiddens.includes(node.data?.level) ||
        hiddens.includes(String(node.data?.level))
      );
    }
    if (typeof hiddens === "number") {
      return index >= hiddens;
    }
    if (typeof hiddens === "boolean") {
      return hiddens ? node.data.level > unlockedLevel : false;
    }
    if (typeof hiddens === "function") {
      return hiddens(node, index);
    }
    return false;
  };

  // Filter node yang tampil dan tandai status penyelesaian
  const visibleNodes = allGeneratedNodes
    .filter((node, index) => !isNodeHidden(node, index))
    .map((node) => ({
      ...node,
      data: {
        ...node.data,
        hasStar: true,
        isCompleted: completedLevels.includes(node.data.level),
        isActive:
          node.data.level ===
          (completedLevels.length === 0 ? 1 : Math.max(...completedLevels) + 1),
      },
    }));

  const handleNodeClick = (_event, node) => {
    const lvl = node?.data?.level;
    if (!lvl) return;

    setTestErrorMessage("");
    const isCompleted = completedLevels.includes(lvl);

    if (lvl === 1) {
      setActiveTestView({ mode: "terms", level: 1, isReadOnly: isCompleted });
    } else {
      setActiveTestView({
        mode: "question",
        level: lvl,
        isReadOnly: isCompleted,
        questionData: {
          ...node?.data?.questionData,
          title: `${major} Question`,
        },
      });
    }
  };

  const checkAndTriggerCompletion = async (
    currentCompletedLevels,
    { forceRefresh = false } = {},
  ) => {
    if (!allGeneratedNodes || allGeneratedNodes.length === 0) return;

    const allLevels = allGeneratedNodes.map((n) => n.data.level);
    const isAllComplete =
      allLevels.length > 0 &&
      allLevels.every((lvl) => currentCompletedLevels.includes(lvl));

    if (isAllComplete && majorData?.id) {
      setShowCompletionModal(true);
      setIsGeneratingPreview(true);
      try {
        const res = await generateMajorPreview(
          {
            id: majorData.id,
            major_name: major,
            circle_color: majorData.circle_color,
          },
          { forceRefresh },
        );
        if (res.success && res.data) {
          setPreviewResult(res.data);
        }
      } finally {
        setIsGeneratingPreview(false);
      }
    }
  };

  const finalizeQuestionSubmission = (currentLvl, rawMinicaseId, answer) => {
    const newCompleted = [...new Set([...completedLevels, currentLvl])];
    setCompletedLevels(newCompleted);

    if (rawMinicaseId) {
      setMinicases((prev) =>
        prev?.map((mc) =>
          mc.id === rawMinicaseId
            ? { ...mc, is_done: true, user_answer: answer }
            : mc,
        ),
      );
    }

    if (
      currentLvl >= 2 &&
      currentLvl === unlockedLevel &&
      unlockedLevel < allGeneratedNodes.length
    ) {
      const nextLvl = unlockedLevel + 1;
      setUnlockedLevel(nextLvl);
    }

    setActiveTestView(null);
    setTestErrorMessage("");
    checkAndTriggerCompletion(newCompleted);
  };

  const handleForceContinueSpam = () => {
    if (!pendingSpamSubmission) return;
    const { level, rawMinicase, submitData } = pendingSpamSubmission;
    setShowSpamWarningModal(false);
    setPendingSpamSubmission(null);
    finalizeQuestionSubmission(level, rawMinicase?.id, submitData?.answer);
  };

  const handleSubmitQuestion = async (submitData) => {
    if (activeTestView?.isReadOnly) {
      setActiveTestView(null);
      return;
    }

    setTestErrorMessage("");
    const currentLvl = activeTestView.level;
    const rawMinicase = activeTestView.questionData?.raw;

    if (rawMinicase?.id) {
      if (activeTestView.questionData?.type === "essay") {
        setIsSubmitting(true);
        const res = await evaluateEssayAnswer({
          question:
            rawMinicase.question || activeTestView.questionData?.question,
          evaluation_hint: rawMinicase.evaluation_hint,
          user_answer: submitData?.answer,
          minicase_id: rawMinicase.id,
        });
        setIsSubmitting(false);

        if (!res.success) {
          setTestErrorMessage(
            res.error ||
              "Gagal terhubung ke AI. Silakan periksa koneksi dan coba lagi.",
          );
          return;
        }

        // Cek Guardrail Anti-Spam: jika is_serious_attempt bernilai false
        if (res.data?.is_serious_attempt === false) {
          setPendingSpamSubmission({
            submitData,
            rawMinicase,
            level: currentLvl,
          });
          setShowSpamWarningModal(true);
          return;
        }

        finalizeQuestionSubmission(
          currentLvl,
          rawMinicase.id,
          submitData?.answer,
        );
      } else {
        await minicaseRepository.submitMultipleChoiceAnswer(
          rawMinicase.id,
          submitData?.answer,
          rawMinicase.correct_answer,
        );
        finalizeQuestionSubmission(
          currentLvl,
          rawMinicase.id,
          submitData?.answer,
        );
      }
    } else {
      finalizeQuestionSubmission(currentLvl, null, submitData?.answer);
    }
  };

  // Jika sedang membuka layar soal atau syarat ketentuan
  if (activeTestView) {
    return (
      <TestPages
        mode={activeTestView.mode}
        level={activeTestView.level}
        questionData={activeTestView.questionData}
        major={major}
        currentQuestion={
          activeTestView.level > 1 ? activeTestView.level - 1 : 1
        }
        totalQuestions={Math.max(1, allGeneratedNodes.length - 1)}
        isReadOnly={activeTestView.isReadOnly}
        isSubmitting={isSubmitting}
        errorMessage={testErrorMessage}
        onBack={() => {
          setTestErrorMessage("");
          setActiveTestView(null);
        }}
        onAgreeTerms={() => {
          if (!completedLevels.includes(1)) {
            const newCompleted = [...new Set([...completedLevels, 1])];
            setCompletedLevels(newCompleted);
            checkAndTriggerCompletion(newCompleted);
          }
          setActiveTestView(null);
        }}
        onSubmitQuestion={handleSubmitQuestion}
      />
    );
  }

  const isAllLevelsCompleted =
    allGeneratedNodes.length > 0 &&
    allGeneratedNodes.every((n) => completedLevels.includes(n.data.level));

  return (
    <div className="w-full h-full flex flex-col bg-white font-sans overflow-hidden relative">
      {/* ── 1. Header (Tombol Back Bulat & Logo Arahkita) ── */}
      <header className="shrink-0 flex items-center justify-between px-5 pt-8 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="w-8.5 h-8.5 rounded-full bg-[#E2E8F0] hover:bg-[#CBD5E1] active:scale-90 flex items-center justify-center transition-all cursor-pointer shadow-xs text-gray-700"
          aria-label="Kembali"
        >
          <svg
            className="w-4.5 h-4.5 -ml-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="flex items-center">
          <img src={logoArahkita} alt="Arahkita" className="h-7 w-auto" />
          <span className="text-[22px] font-bold text-gray-950 tracking-tight">
            rahkita
          </span>
        </div>
      </header>

      {/* ── 2. Hero Card Jurusan ── */}
      <div className="shrink-0 mx-5 mb-1">
        <div className="w-full h-38 sm:h-40 rounded-[20px] bg-linear-to-r from-[#21436c] via-[#2f557d] to-[#456b92] shadow-hero flex items-center overflow-hidden relative px-3 py-2">
          <div className="w-36 sm:w-40 shrink-0 h-full flex items-center justify-center overflow-hidden">
            <img
              src={mathIllustration}
              alt={major}
              className="h-full w-full object-contain object-left drop-shadow-sm"
            />
          </div>

          <div className="flex-1 min-w-0 pl-2.5 pr-2 z-10">
            <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight leading-tight capitalize truncate">
              {major}
            </h2>
            <p className="text-[11px] sm:text-xs text-white/85 font-normal leading-relaxed mt-1.5">
              Soal-soal ini membantu sejauh mana kamu menemukan passion yang pas
              untuk jurusan kamu.
            </p>
          </div>
        </div>
      </div>

      {/* ── 2.5 Banner Hasil Trial Jika Seluruh Tantangan Selesai ── */}
      {isAllLevelsCompleted && (
        <div className="shrink-0 mx-5 mt-2 mb-1 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between shadow-xs">
          <span className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
            <span>🎓</span> Seluruh tantangan jurusan selesai!
          </span>
          <button
            type="button"
            onClick={() => {
              setShowCompletionModal(true);
              if (!previewResult && majorData?.id) {
                checkAndTriggerCompletion(completedLevels);
              }
            }}
            className="text-xs font-bold text-[#0070E0] hover:underline cursor-pointer"
          >
            Lihat Hasil Evaluasi →
          </button>
        </div>
      )}

      {/* ── 3. Judul Section 'Latihan test' & Indikator Progress ── */}
      <div className="shrink-0 px-6 pt-3 pb-1 flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-bold text-gray-950 tracking-tight">
          Latihan test
        </h3>
        <span className="text-xs font-semibold text-gray-950 px-2.5 py-0.5 rounded-full">
          Level {unlockedLevel - 1}/{allGeneratedNodes.length} Terbuka
        </span>
      </div>

      {/* ── 4. Graph Area / Loading / Error State ── */}
      <div className="flex-1 min-h-0 relative">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none bg-white">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-[#0070E0] rounded-full animate-spin mb-4" />
            <h2 className="text-gray-950 font-extrabold text-base sm:text-lg tracking-tight">
              Menyiapkan studi kasus interaktif...
            </h2>
            <p className="text-gray-500 text-xs mt-1.5 max-w-xs leading-relaxed">
              AI sedang merancang soal studi kasus aplikatif & reflektif untuk
              jurusan {major}.
            </p>
          </div>
        ) : errorMessage &&
          !useFallbackMock &&
          (!minicases || minicases.length === 0) ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none bg-white max-w-sm mx-auto">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold mb-3">
              !
            </div>
            <h3 className="text-gray-950 font-bold text-base mb-1">
              Gagal Memuat Soal Latihan
            </h3>
            <p className="text-gray-500 text-xs mb-5 leading-relaxed">
              {errorMessage}
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full justify-center">
              <button
                type="button"
                onClick={handleRetry}
                className="w-full sm:w-auto px-4 py-2 bg-[#0070E0] hover:bg-[#0060C5] text-white font-semibold text-xs rounded-xl shadow-md cursor-pointer transition-all"
              >
                Coba Lagi
              </button>
              <button
                type="button"
                onClick={() => setUseFallbackMock(true)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold text-xs rounded-xl cursor-pointer transition-all"
              >
                Gunakan Soal Bawaan
              </button>
            </div>
          </div>
        ) : (
          <GraphNodeComponent
            nodes={visibleNodes}
            edges={[]}
            fitView={false}
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            panOnDrag={true}
            panOnScroll={true}
            panOnScrollMode="vertical"
            zoomOnScroll={false}
            zoomOnPinch={false}
            zoomOnDoubleClick={false}
            preventScrolling={false}
            nodesDraggable={false}
            nodesConnectable={false}
            nodesFocusable={false}
            elementsSelectable={false}
            onNodeClick={handleNodeClick}
            translateExtent={[
              [-20, -10],
              [420, Math.max(450, visibleNodes.length * 110)],
            ]}
            backgroundProps={{
              variant: "dots",
              color: "#c8c8c8",
              gap: 40,
              size: 3,
            }}
          />
        )}
      </div>

      {/* ── 5. Modal Hasil Evaluasi Trial (Completion Modal) ── */}
      {showCompletionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center max-h-[90vh] overflow-y-auto">
            {/* Tombol Tutup X */}
            <button
              type="button"
              onClick={() => setShowCompletionModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 cursor-pointer transition-all"
              aria-label="Tutup"
            >
              ✕
            </button>

            {isGeneratingPreview ? (
              <div className="py-10 flex flex-col items-center select-none">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-[#0070E0] rounded-full animate-spin mb-4" />
                <h3 className="font-bold text-gray-900 text-base">
                  Menganalisis Hasil Trial...
                </h3>
                <p className="text-xs text-gray-500 mt-2 max-w-xs leading-relaxed">
                  AI sedang menyusun evaluasi kecocokan keminatan dan jalur
                  karir potensial untuk jurusan {major}.
                </p>
              </div>
            ) : previewResult ? (
              <>
                <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-3xl mb-3 shadow-inner">
                  🎓
                </div>

                <h2 className="text-xl font-extrabold text-gray-950 tracking-tight mb-0.5">
                  Trial Selesai!
                </h2>
                <p className="text-xs text-gray-500 mb-4">
                  Jurusan{" "}
                  <strong className="text-gray-900 font-semibold">
                    {major}
                  </strong>
                </p>

                {/* Kartu Skor Kecocokan */}
                <div className="w-full bg-linear-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 mb-4 shadow-xs">
                  <span className="text-[11px] font-bold text-blue-600 tracking-wider uppercase">
                    Kecocokan Keminatan
                  </span>
                  <div className="text-3xl font-black text-[#0070E0] mt-0.5">
                    {previewResult.matching_percentage ?? 0}%
                  </div>
                </div>

                {/* Narasi Ringkasan Preview */}
                {previewResult.preview && (
                  <div className="w-full text-left bg-gray-50 rounded-xl p-3.5 mb-4 border border-gray-100">
                    <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                      Analisis Potensi
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed font-normal">
                      {previewResult.preview}
                    </p>
                  </div>
                )}

                {/* Peluang Karir Terkait */}
                {Array.isArray(previewResult.career_paths) &&
                  previewResult.career_paths.length > 0 && (
                    <div className="w-full text-left mb-5">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                          Peluang Karir Terkait
                        </h4>
                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {previewResult.career_paths.length} Jalur Profesi
                        </span>
                      </div>
                      <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                        {previewResult.career_paths.map((cp, idx) => (
                          <div
                            key={cp.id || `career-${idx}`}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-left transition-all hover:bg-slate-100/70"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-900">
                                {cp.title || cp.career_name}
                              </span>
                              {cp.salary_range && (
                                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                  {cp.salary_range}
                                </span>
                              )}
                            </div>
                            {(cp.detail || cp.description) && (
                              <p className="text-[11px] text-gray-600 mt-1.5 leading-relaxed font-normal">
                                {cp.detail || cp.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Tombol Aksi */}
                <div className="w-full flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCompletionModal(false);
                      if (onNavigateToRecommendation) {
                        onNavigateToRecommendation();
                      }
                    }}
                    className="w-full py-3 bg-[#0070E0] hover:bg-[#0060C5] active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
                  >
                    Lihat Leaderboard Rekomendasi
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCompletionModal(false)}
                    className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-700 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                  >
                    Kembali ke Pohon Jurusan
                  </button>
                </div>
              </>
            ) : (
              <div className="py-6 select-none">
                <div className="text-3xl mb-2">⚠️</div>
                <h3 className="font-bold text-gray-900 text-sm mb-1">
                  Gagal Memuat Hasil Evaluasi
                </h3>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed max-w-xs">
                  Terjadi kendala saat menyusun preview dari server. Pastikan
                  koneksi internet stabil.
                </p>
                <button
                  type="button"
                  onClick={() =>
                    checkAndTriggerCompletion(completedLevels, {
                      forceRefresh: true,
                    })
                  }
                  className="px-4 py-2 bg-[#0070E0] hover:bg-[#0060C5] text-white font-semibold text-xs rounded-xl cursor-pointer"
                >
                  Coba Analisis Ulang
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 6. Modal Edukatif Anti-Spam (Guardrail: is_serious_attempt == false) ── */}
      {showSpamWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-2xl mb-3 shadow-inner">
              💡
            </div>
            <h3 className="text-lg font-bold text-gray-950 tracking-tight mb-2">
              Jawaban Belum Relevan
            </h3>
            <p className="text-xs text-gray-600 leading-relaxed mb-6">
              Jawabanmu belum sesuai dengan skenario studi kasus. Yuk, coba
              ceritakan solusimu agar minat dan potensi analisismu terpetakan
              lebih akurat!
            </p>
            <div className="w-full flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowSpamWarningModal(false);
                  setPendingSpamSubmission(null);
                }}
                className="w-full py-3 bg-[#0070E0] hover:bg-[#0060C5] active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer"
              >
                Perbaiki Jawaban
              </button>
              <button
                type="button"
                onClick={handleForceContinueSpam}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 active:scale-95 text-gray-600 font-semibold text-xs rounded-xl transition-all cursor-pointer"
              >
                Tetap Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MajorTestComponent;
