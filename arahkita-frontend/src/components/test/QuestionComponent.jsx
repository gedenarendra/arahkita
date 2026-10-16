import { useState } from "react";
import logoArahkita from "../../assets/Logo.png";

const DEFAULT_OPTIONS = [
  { id: 0, text: "Mengurangi aliran darah ke otot" },
  { id: 1, text: "Mengurangi aliran darah ke otot" },
  { id: 2, text: "Mengurangi aliran darah ke otot" },
  { id: 3, text: "Mengurangi aliran darah ke otot" },
];

function QuestionComponent({
  major = "Math",
  level = 2,
  questionData,
  currentQuestion,
  totalQuestions,
  progress,
  isReadOnly = false,
  isSubmitting = false,
  errorMessage = "",
  onBack,
  onSubmit,
}) {
  // Dukungan jika questionData menyediakan daftar array soal: questions = [{ question, options, type, subtext }, ...]
  const hasMultipleQuestions =
    Array.isArray(questionData?.questions) && questionData.questions.length > 0;
  const questionsList = hasMultipleQuestions ? questionData.questions : null;

  // Index soal internal jika menggunakan array questions
  const [internalQuestionIndex, setInternalQuestionIndex] = useState(0);

  // Soal yang sedang aktif saat ini
  const activeQuestion = hasMultipleQuestions
    ? questionsList[internalQuestionIndex]
    : questionData;

  // Total jumlah soal & nomor soal yang sedang aktif
  const total =
    totalQuestions ||
    questionData?.totalQuestions ||
    (hasMultipleQuestions ? questionsList.length : 7);

  const current = hasMultipleQuestions
    ? internalQuestionIndex + 1
    : currentQuestion ||
      questionData?.questionNumber ||
      (level > 1 ? level - 1 : 1);

  // Perhitungan persentase progres bar aktif
  const progressPercentage =
    progress !== undefined && progress !== null
      ? Math.min(100, Math.max(0, Number(progress)))
      : Math.min(100, Math.max(5, Math.round((current / total) * 100)));

  // Tipe soal ditentukan langsung dari data objek yang diterima ('multiple' atau 'essay')
  const type =
    activeQuestion?.type ||
    (activeQuestion?.options && activeQuestion.options.length > 0
      ? "multiple"
      : "multiple");

  // Title dinamis mengikuti state jurusan yang dipilih (misal: Sosiologi Question, Sport Question, Math Question)
  const title = major
    ? `${major} Question`
    : activeQuestion?.title || "Question";
  const questionText =
    activeQuestion?.question ||
    "Manakah dari angka berikut yang merupakan bilangan prima?";
  const subtext =
    activeQuestion?.subtext ||
    "Silakan pilih semua opsi yang benar, Anda bisa mengubah jawaban ini nanti sebelum dikumpulkan.";
  const options = activeQuestion?.options || DEFAULT_OPTIONS;

  // State jawaban untuk pilihan ganda & essay (mendukung multi-question dictionary atau single)
  const [answers, setAnswers] = useState({});

  const activeAnswerKey = hasMultipleQuestions ? internalQuestionIndex : level;
  const currentAnswer = answers[activeAnswerKey];

  const selectedOption =
    currentAnswer?.option !== undefined
      ? currentAnswer.option
      : activeQuestion?.user_answer !== undefined
        ? activeQuestion.user_answer
        : activeQuestion?.defaultSelected !== undefined
          ? activeQuestion.defaultSelected
          : null;

  const essayAnswer =
    currentAnswer?.essay !== undefined
      ? currentAnswer.essay
      : activeQuestion?.user_answer !== undefined
        ? String(activeQuestion.user_answer)
        : activeQuestion?.initialAnswer || "";

  const handleSelectOption = (optId) => {
    if (isReadOnly || isSubmitting) return;
    setAnswers((prev) => ({
      ...prev,
      [activeAnswerKey]: {
        ...prev[activeAnswerKey],
        option: optId,
      },
    }));
  };

  const handleEssayChange = (text) => {
    if (isReadOnly || isSubmitting) return;
    setAnswers((prev) => ({
      ...prev,
      [activeAnswerKey]: {
        ...prev[activeAnswerKey],
        essay: text,
      },
    }));
  };

  const handleBackAction = () => {
    if (hasMultipleQuestions && internalQuestionIndex > 0) {
      setInternalQuestionIndex((prev) => prev - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const handleNextOrSubmit = () => {
    if (isReadOnly || isSubmitting) return;

    if (
      hasMultipleQuestions &&
      internalQuestionIndex < questionsList.length - 1
    ) {
      setInternalQuestionIndex((prev) => prev + 1);
    } else if (onSubmit) {
      onSubmit({
        level,
        type,
        current,
        total,
        answer: type === "multiple" ? selectedOption : essayAnswer,
        allAnswers: answers,
      });
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-white font-sans overflow-hidden select-none">
      {/* ── 1. Header (Tombol Back Bulat Abu-abu & Logo Arahkita) ── */}
      <header className="shrink-0 flex items-center justify-between px-5 pt-8 pb-3">
        <button
          type="button"
          onClick={handleBackAction}
          disabled={isSubmitting}
          className="w-8.5 h-8.5 rounded-full bg-[#E0E0E0] hover:bg-[#D4D4D4] active:scale-90 flex items-center justify-center transition-all cursor-pointer shadow-xs text-white disabled:opacity-50"
          aria-label="Kembali"
        >
          <svg
            className="w-4.5 h-4.5 -ml-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
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

      {/* ── 2. Konten Pertanyaan (Scrollable) ── */}
      <div className="flex-1 min-h-0 px-5 pt-2 pb-2 overflow-y-auto">
        <div>
          {/* Judul Pertanyaan Jurusan & Indikator Soal */}
          <div className="mb-2.5 flex items-center justify-between">
            <h1
              className="text-xl sm:text-2xl font-bold text-[#2C2C2C] tracking-tight"
              style={{ color: "#2C2C2C" }}
            >
              {title}
            </h1>
            <div className="flex items-center gap-2">
              {isReadOnly && (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  ✓ Review Mode
                </span>
              )}
              <span className="text-xs font-semibold text-gray-500">
                {current} / {total}
              </span>
            </div>
          </div>

          {/* Progress Bar (Garis Biru & Abu-abu Aktif Menyesuaikan Jumlah Soal) */}
          <div className="w-full h-2.5 bg-[#D9D9D9] rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-[#1879DF] rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>

          {/* Teks Soal & Petunjuk */}
          <div className="mb-6 text-left">
            <h2
              className="text-sm sm:text-base font-bold text-[#2C2C2C] leading-snug"
              style={{ color: "#2C2C2C" }}
            >
              {questionText}
            </h2>
            <p className="text-xs text-gray-500 font-normal mt-1 leading-relaxed">
              {subtext}
            </p>
          </div>

          {/* ── Render Pilihan Ganda Jika Tipe 'multiple' (Persis Gambar 2) ── */}
          {type === "multiple" && (
            <div className="space-y-3.5">
              {options.map((opt, idx) => {
                const optId = opt.id !== undefined ? opt.id : idx;
                const isSelected = selectedOption === optId || selectedOption === opt;
                const displayText =
                  opt.text ||
                  opt.title ||
                  (typeof opt === "string" ? opt : `Opsi ${idx + 1}`);

                return (
                  <button
                    key={optId}
                    type="button"
                    onClick={() => handleSelectOption(optId)}
                    disabled={isReadOnly || isSubmitting}
                    className={`w-full min-h-14 py-3.5 px-4 rounded-xl flex items-center justify-center text-center transition-all shadow-md select-none ${
                      isReadOnly
                        ? isSelected
                          ? "bg-[#407BFF] text-white font-semibold ring-2 ring-blue-300 cursor-default"
                          : "bg-[#EAEAEA] text-gray-400 opacity-70 cursor-default"
                        : isSelected
                          ? "bg-[#407BFF] text-white active:scale-[0.99] cursor-pointer"
                          : "bg-[#D9D9D9] text-[#1E1E1E] hover:bg-[#D0D0D4] active:scale-[0.99] cursor-pointer"
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-medium leading-snug">
                      {displayText}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Render Essay Jika Tipe 'essay' (Persis Gambar 1) ── */}
          {type === "essay" && (
            <div className="w-full text-left">
              {/* Garis Pembatas Biru Tua Membentang Penuh Sesuai Gambar */}
              <div className="-mx-5 h-0.5 bg-[#0C3C6F] mt-7 mb-4" />

              <div className="flex items-center justify-between mb-3">
                <h3
                  className="font-bold text-[#2C2C2C] text-base"
                  style={{ color: "#2C2C2C" }}
                >
                  Your Answer
                </h3>
                {isReadOnly && (
                  <span className="text-xs text-gray-500 font-medium">
                    (Jawaban tersimpan)
                  </span>
                )}
              </div>

              {/* Area Kotak Teks Abu-abu Solid Besar */}
              <textarea
                value={essayAnswer}
                onChange={(e) => handleEssayChange(e.target.value)}
                readOnly={isReadOnly || isSubmitting}
                placeholder={isReadOnly ? "Tidak ada jawaban tertulis." : "Tuliskan pandangan atau solusimu di sini..."}
                rows={7}
                className={`w-full rounded-xs p-4 h-48 sm:h-52 text-xs sm:text-sm outline-none resize-none font-medium transition-all ${
                  isReadOnly
                    ? "bg-[#E6E6E6] text-gray-800 cursor-default border border-gray-300"
                    : "bg-[#D9D9D9] text-gray-900 focus:ring-1 focus:ring-blue-500"
                }`}
              />
              {!isReadOnly && (
                <p className="text-[11px] text-gray-500 mt-1.5 italic">
                  {essayAnswer.trim().length === 0
                    ? "Tuliskan jawaban analisismu minimal beberapa kata sebelum mengirim."
                    : `${essayAnswer.trim().length} karakter`}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── 2.5 In-place Error Banner Jika Terjadi Kegagalan Jaringan / API ── */}
      {errorMessage && !isReadOnly && (
        <div className="shrink-0 mx-5 mb-2 px-3.5 py-2.5 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-700 text-xs shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-red-500 font-bold shrink-0">⚠️</span>
            <span className="leading-tight">{errorMessage}</span>
          </div>
        </div>
      )}

      {/* ── 3. Tombol Aksi (Back & Submit Sesuai Gambar / Review Kembali) ── */}
      {isReadOnly ? (
        <div className="shrink-0 px-5 py-2 flex items-center justify-center">
          <button
            type="button"
            onClick={handleBackAction}
            className="w-full sm:w-56 h-10 bg-[#0970DD] hover:bg-[#0765C8] active:scale-95 text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center"
          >
            Kembali ke Pohon Jurusan
          </button>
        </div>
      ) : (
        <div className="shrink-0 px-5 py-2 flex items-center justify-between">
          <button
            type="button"
            onClick={handleBackAction}
            disabled={isSubmitting}
            className="w-23 h-9 bg-[#E0E0E0] hover:bg-[#D4D4D4] active:scale-95 text-gray-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center disabled:opacity-50"
          >
            Back
          </button>
          <button
            type="button"
            onClick={handleNextOrSubmit}
            disabled={
              isSubmitting ||
              (type === "multiple"
                ? selectedOption === null || selectedOption === undefined
                : !essayAnswer.trim())
            }
            className={`w-28 h-9 font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all flex items-center justify-center ${
              isSubmitting ||
              (type === "multiple"
                ? selectedOption === null || selectedOption === undefined
                : !essayAnswer.trim())
                ? "bg-[#0970DD]/50 text-white/80 cursor-not-allowed"
                : "bg-[#0970DD] hover:bg-[#0765C8] active:scale-95 text-white cursor-pointer"
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center gap-1.5">
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="text-xs">Menilai...</span>
              </div>
            ) : hasMultipleQuestions &&
              internalQuestionIndex < questionsList.length - 1 ? (
              "Next"
            ) : (
              "Submit"
            )}
          </button>
        </div>
      )}
    </div>
  );
}

export default QuestionComponent;
