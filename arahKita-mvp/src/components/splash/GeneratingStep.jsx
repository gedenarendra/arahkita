import { useState, useEffect, useCallback } from "react";
import { formatInterestsForBackend } from "../../utils/interestUtils";
import { mapSubjectsToBackendPayload } from "../../utils/subjectMapping";
import { fetchRecommendedMajors, mapMajorNodesToUi } from "../../api/majorApi";
import recommendationRepository from "../../repositories/recommendationRepository";

const DEMO_MAJOR_NODES = [
  { id: "demo-1", major_name: "SOSIOLOGI", circle_color: "#0970DD", child_id: null },
  { id: "demo-2", major_name: "SPORT", circle_color: "#0970DD", child_id: null },
  { id: "demo-3", major_name: "MANAGEMENT", circle_color: "#0970DD", child_id: null },
  { id: "demo-4", major_name: "MATH", circle_color: "#0970DD", child_id: null },
  { id: "demo-5", major_name: "TEKNOLOGI", circle_color: "#0970DD", child_id: null },
];

function GeneratingStep({
  onComplete,
  selectedSubjects = [],
  selectedInterests = [],
}) {
  const [dots, setDots] = useState("..");
  const [status, setStatus] = useState("loading"); // "loading" | "error"
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (status !== "loading") return;

    const dotInterval = setInterval(() => {
      setDots((prev) => (prev === "..." ? "." : prev + "."));
    }, 500);

    return () => clearInterval(dotInterval);
  }, [status]);

  const runRecommendationFetch = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");

    const startTime = Date.now();
    const minat = formatInterestsForBackend(selectedInterests);
    const nilai = mapSubjectsToBackendPayload(selectedSubjects);

    try {
      const result = await fetchRecommendedMajors({ minat, nilai });

      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 1800 - elapsed);

      if (
        result.success &&
        Array.isArray(result.mappedNodes) &&
        result.mappedNodes.length > 0
      ) {
        // Simpan profil siswa (minat & nilai) untuk keperluan endpoint recommendation-results
        recommendationRepository.saveUserProfile({ minat, nilai });

        setTimeout(() => {
          if (onComplete) onComplete(result.mappedNodes);
        }, remainingTime);
      } else {
        setTimeout(() => {
          setStatus("error");
          setErrorMessage(
            result.error || "Gagal memuat rekomendasi jurusan dari server."
          );
        }, remainingTime);
      }
    } catch (err) {
      const elapsed = Date.now() - startTime;
      const remainingTime = Math.max(0, 1800 - elapsed);

      setTimeout(() => {
        setStatus("error");
        setErrorMessage(
          err.message || "Terjadi kesalahan saat memproses rekomendasi jurusan."
        );
      }, remainingTime);
    }
  }, [selectedInterests, selectedSubjects, onComplete]);

  useEffect(() => {
    runRecommendationFetch();
  }, [runRecommendationFetch]);

  const handleContinueWithDemo = () => {
    const minat = formatInterestsForBackend(selectedInterests);
    const nilai = mapSubjectsToBackendPayload(selectedSubjects);
    recommendationRepository.saveUserProfile({ minat, nilai });

    const demoMappedNodes = mapMajorNodesToUi(DEMO_MAJOR_NODES);
    if (onComplete) {
      onComplete(demoMappedNodes);
    }
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {/* Ilustrasi Folder & Dokumen Generating */}
      <div className="relative w-64 sm:w-72 h-56 flex items-center justify-center">
        {/* Latar Belakang Rak */}
        <div className="absolute inset-0 flex items-center justify-center opacity-30 pointer-events-none">
          <div className="w-48 h-36 border border-white/40 rounded-lg grid grid-cols-2 grid-rows-2 p-2 gap-2">
            <div className="bg-white/10 rounded"></div>
            <div className="bg-white/10 rounded"></div>
            <div className="bg-white/10 rounded"></div>
            <div className="bg-white/10 rounded"></div>
          </div>
        </div>

        {/* Karakter Siluet di Belakang */}
        <div className="absolute right-12 top-4 w-16 h-28 opacity-80 animate-pulse">
          <svg viewBox="0 0 60 100" fill="none" className="w-full h-full">
            <circle cx="30" cy="18" r="9" fill="#1E293B" />
            <circle cx="37" cy="14" r="5" fill="#1E293B" />
            <circle cx="30" cy="20" r="7" fill="#FBCFE8" />
            <path d="M22 28 C22 26 38 26 38 28 L40 55 L20 55 Z" fill="#2563EB" />
            <path d="M20 55 L40 55 L44 85 L32 85 L30 65 L28 85 L16 85 Z" fill="#1D4ED8" />
          </svg>
        </div>

        {/* Kaca Pembesar Melingkar */}
        <div className="absolute left-16 top-6 w-24 h-24 rounded-full border-4 border-[#2563EB] bg-blue-400/20 backdrop-blur-[1px] shadow-lg pointer-events-none z-10 flex items-center justify-center">
          <div className="w-full h-0.5 bg-blue-300/30 transform -rotate-45" />
        </div>

        {/* Folder Biru & Kertas Tumpuk */}
        <div className="relative z-20 mt-12">
          {/* Kertas di Dalam Folder */}
          <div
            className={`absolute -top-6 left-3 w-40 h-24 bg-white/95 rounded-t-lg shadow-md transform -rotate-3 transition-transform ${
              status === "loading" ? "animate-bounce" : ""
            }`}
          >
            <div className="p-2 space-y-1.5 opacity-40">
              <div className="h-1.5 bg-gray-400 rounded w-3/4"></div>
              <div className="h-1.5 bg-gray-400 rounded w-1/2"></div>
              <div className="h-1.5 bg-gray-400 rounded w-5/6"></div>
            </div>
          </div>
          <div className="absolute -top-4 left-6 w-36 h-20 bg-gray-100 rounded-t-lg shadow-sm transform rotate-2">
            <div className="p-2 space-y-1.5 opacity-30">
              <div className="h-1.5 bg-gray-400 rounded w-2/3"></div>
              <div className="h-1.5 bg-gray-400 rounded w-3/4"></div>
            </div>
          </div>

          {/* Badan Folder Biru */}
          <svg
            viewBox="0 0 160 100"
            fill="none"
            className="w-48 sm:w-52 h-auto drop-shadow-2xl"
          >
            <path
              d="M5 25 C5 21 8 18 12 18 L55 18 C58 18 61 20 63 23 L70 32 L148 32 C152 32 155 35 155 39 L155 90 C155 94 152 97 148 97 L12 97 C8 97 5 94 5 90 Z"
              fill="#1D4ED8"
            />
            <path
              d="M1 40 C1 36 4 33 8 33 L62 33 C66 33 69 36 71 39 L78 47 L152 47 C156 47 159 50 159 54 L151 92 C150 96 147 99 143 99 L17 99 C13 99 9 96 8 92 Z"
              fill="#2563EB"
            />
          </svg>

          {/* Bayangan Oval Bawah */}
          <div className="w-44 h-3 bg-black/25 rounded-[50%] mx-auto -mt-1 blur-[2px]" />
        </div>
      </div>

      {/* Teks Status Generating / Error */}
      {status === "loading" ? (
        <div className="text-center mt-7">
          <h2 className="text-[25px] font-bold text-white tracking-tight">
            Generating{dots}
          </h2>
          <p className="text-[13px] text-white/80 font-normal mt-1.5 tracking-wide">
            Mohon menunggu respon
          </p>
        </div>
      ) : (
        <div className="text-center mt-6 max-w-sm px-4">
          <p className="text-amber-200 font-semibold text-sm leading-relaxed">
            {errorMessage || "Gagal memuat rekomendasi jurusan dari server."}
          </p>
          <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={runRecommendationFetch}
              className="w-full sm:w-auto px-4 py-2 bg-[#0070E0] hover:bg-[#0060C5] text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer"
            >
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={handleContinueWithDemo}
              className="w-full sm:w-auto px-4 py-2 bg-white/20 hover:bg-white/30 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all cursor-pointer"
            >
              Lanjut dengan Data Demo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default GeneratingStep;
