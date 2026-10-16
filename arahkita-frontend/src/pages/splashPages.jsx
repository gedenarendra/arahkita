import { useState } from "react";
import logoArahkita from "../assets/Logo.png";
import WelcomeStep from "../components/splash/WelcomeStep";
import InterestStep from "../components/splash/InterestStep";
import GradesStep from "../components/splash/GradesStep";
import GeneratingStep from "../components/splash/GeneratingStep";
import {
  formatInterestsForBackend,
  MAX_INTERESTS_COUNT,
} from "../utils/interestUtils";
import {
  MIN_SUBJECTS_COUNT,
  MAX_SUBJECTS_COUNT,
} from "../utils/subjectMapping";

function SplashPages({ onComplete }) {
  // Step 1: Welcome | Step 2: Interest Intro | Step 3: Grades | Step 4: Interest Minat | Step 5: Generating
  const [currentStep, setCurrentStep] = useState(1);
  const [gradesSubStep, setGradesSubStep] = useState(1); // 1: Cari Mata Pelajaran, 2: Isi Nilai
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [gradesError, setGradesError] = useState("");

  const [interestSubStep, setInterestSubStep] = useState(1); // 1: Bubble / Plus, 2: Masukan Sini & List
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [interestError, setInterestError] = useState("");

  const handleNext = () => {
    // Jika di Step 3 (Grades)
    if (currentStep === 3) {
      if (gradesSubStep === 1) {
        if (selectedSubjects.length < MIN_SUBJECTS_COUNT) {
          setGradesError(
            `Silakan cari dan tambahkan minimal ${MIN_SUBJECTS_COUNT} mata pelajaran terlebih dahulu.`,
          );
          return;
        }
        if (selectedSubjects.length > MAX_SUBJECTS_COUNT) {
          setGradesError(
            `Maksimal hanya dapat memilih ${MAX_SUBJECTS_COUNT} mata pelajaran.`,
          );
          return;
        }
        setGradesError("");
        setGradesSubStep(2);
        return;
      }
      if (gradesSubStep === 2) {
        if (selectedSubjects.length < MIN_SUBJECTS_COUNT) {
          setGradesError(
            `Silakan tambahkan minimal ${MIN_SUBJECTS_COUNT} mata pelajaran terlebih dahulu.`,
          );
          setGradesSubStep(1);
          return;
        }
        if (selectedSubjects.length > MAX_SUBJECTS_COUNT) {
          setGradesError(
            `Maksimal hanya dapat memilih ${MAX_SUBJECTS_COUNT} mata pelajaran.`,
          );
          return;
        }
        setGradesError("");
        setCurrentStep(4);
        return;
      }
    }

    // Jika di Step 4 (Interest)
    if (currentStep === 4) {
      if (interestSubStep === 1) {
        setInterestSubStep(2);
        return;
      }
      if (interestSubStep === 2) {
        if (selectedInterests.length === 0) {
          setInterestError(
            "Silakan tambahkan minimal satu minat terlebih dahulu.",
          );
          return;
        }
        if (selectedInterests.length > MAX_INTERESTS_COUNT) {
          setInterestError(
            `Maksimal hanya dapat memilih ${MAX_INTERESTS_COUNT} minat.`,
          );
          return;
        }
        setInterestError("");

        // Format data string yang wajib dikirim ke backend:
        // Contoh: "bisnis dan keuangan, informatika"
        const backendInterestsString = formatInterestsForBackend(
          selectedInterests,
          MAX_INTERESTS_COUNT,
        );
        console.log(
          "Payload minat untuk backend (string):",
          backendInterestsString,
        );

        setCurrentStep(5);
        return;
      }
    }

    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    // Navigasi mundur di Step 4 (Interest)
    if (currentStep === 4) {
      if (interestSubStep === 2) {
        setInterestSubStep(1);
        return;
      }
      if (interestSubStep === 1) {
        setCurrentStep(3);
        setGradesSubStep(2);
        return;
      }
    }

    // Navigasi mundur di Step 3 (Grades)
    if (currentStep === 3) {
      if (gradesSubStep === 2) {
        setGradesSubStep(1);
        return;
      }
      if (gradesSubStep === 1) {
        setCurrentStep(2);
        return;
      }
    }

    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <div
      className={`w-full h-dvh flex flex-col justify-between overflow-hidden font-sans select-none ${
        currentStep === 1 ? "bg-[#0C3C6F]" : "bg-white"
      }`}
    >
      {/* ── 1. Header Putih Atas (Hanya tampil di Slide 2, 3, 4, 5 dengan Logo Arahkita) ── */}
      {currentStep > 1 && (
        <header className="shrink-0 w-full flex items-center justify-end bg-white z-10 pt-8 pb-4 sm:pt-9 sm:pb-5 md:pt-10 md:pb-6">
          <div className="w-full max-w-2xl lg:max-w-3xl mx-auto flex items-center justify-end px-6 sm:px-8">
            <div className="flex items-center">
              <img
                src={logoArahkita}
                alt="Arahkita"
                className="h-7 w-auto object-contain"
              />
              <span className="text-[22px] font-bold text-gray-950 tracking-tight">
                rahkita
              </span>
            </div>
          </div>
        </header>
      )}

      {/* ── 2. Badan Biru Tua ── */}
      <div
        className={`flex-1 min-h-0 w-full flex flex-col relative ${
          currentStep === 1 ? "bg-[#0C3C6F]" : ""
        }`}
      >
        {/* Lengkungan Kubah Atas (Hanya tampil di Slide 2, 3, 4, 5) */}
        {currentStep > 1 && (
          <div className="w-full overflow-hidden leading-none -mb-px shrink-0 bg-white">
            <svg
              viewBox="0 0 1000 30"
              fill="none"
              preserveAspectRatio="none"
              className="w-full h-3 sm:h-4 md:h-5 block"
            >
              <path
                d="M 0,0 L 1000,0 L 1000,30 Q 500,0 0,30 Z"
                fill="#FFFFFF"
              />
              <path
                d="M 0,30 Q 500,0 1000,30 L 1000,30 L 0,30 Z"
                fill="#0C3C6F"
              />
            </svg>
          </div>
        )}

        {/* Isi Konten Tiap Step di Dalam Area Biru (Scrollable jika layar pendek/zoom 200%) */}
        <div className="flex-1 min-h-0 w-full bg-[#0C3C6F] overflow-y-auto scrollbar-thin flex flex-col">
          <div className="flex-1 min-h-full w-full max-w-2xl lg:max-w-3xl mx-auto px-4 sm:px-8 flex flex-col justify-between py-1">
            {currentStep === 1 && <WelcomeStep />}
            {currentStep === 2 && <InterestStep />}
            {currentStep === 3 && (
              <GradesStep
                view="grades"
                subStep={gradesSubStep}
                onSubStepChange={(step) => {
                  setGradesError("");
                  setGradesSubStep(step);
                }}
                selectedSubjects={selectedSubjects}
                setSelectedSubjects={(subs) => {
                  setGradesError("");
                  setSelectedSubjects(subs);
                }}
                errorMessage={gradesError}
              />
            )}
            {currentStep === 4 && (
              <GradesStep
                view="interest"
                interestSubStep={interestSubStep}
                onInterestSubStepChange={(step) => {
                  setInterestError("");
                  setInterestSubStep(step);
                }}
                selectedInterests={selectedInterests}
                setSelectedInterests={(items) => {
                  setInterestError("");
                  setSelectedInterests(items);
                }}
                interestErrorMessage={interestError}
              />
            )}
            {currentStep === 5 && (
              <GeneratingStep
                onComplete={onComplete}
                selectedSubjects={selectedSubjects}
                selectedInterests={selectedInterests}
              />
            )}
          </div>
        </div>

        {/* Gelombang Asimetris Bawah (Slide 2, 3, 4) / Spacer Biru (Slide 1) & Indikator Titik Pinned di Bawah Wave */}
        {currentStep > 1 && currentStep < 5 ? (
          <div className="w-full overflow-hidden leading-none -mt-px shrink-0 bg-white relative">
            <svg
              viewBox="0 0 1000 100"
              fill="none"
              preserveAspectRatio="none"
              className="w-full h-8 sm:h-10 md:h-12 block"
            >
              {/* Bagian Bawah Putih Menuju Tombol */}
              <path
                d="M 0,98 C 220,98 440,0 650,0 C 780,0 920,35 1000,45 L 1000,100 L 0,100 Z"
                fill="#FFFFFF"
              />
              {/* Gelombang Biru Atas */}
              <path
                d="M 0,0 L 1000,0 L 1000,45 C 920,35 780,0 650,0 C 440,0 220,98 0,98 Z"
                fill="#0C3C6F"
              />
            </svg>

            {/* Indikator Titik Terpusat di Paling Bawah Wave */}
            <div className="absolute inset-x-0 bottom-1 sm:bottom-1.5 flex items-center justify-center gap-2.5 z-10 pointer-events-none">
              <span
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors duration-200 ${
                  currentStep === 1 ? "bg-[#0070E0]" : "bg-gray-300"
                }`}
              />
              <span
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors duration-200 ${
                  currentStep === 2 ? "bg-[#0070E0]" : "bg-gray-300"
                }`}
              />
              <span
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors duration-200 ${
                  currentStep === 3 ? "bg-[#0070E0]" : "bg-gray-300"
                }`}
              />
              <span
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors duration-200 ${
                  currentStep === 4 ? "bg-[#0070E0]" : "bg-gray-300"
                }`}
              />
            </div>
          </div>
        ) : currentStep === 1 ? (
          <div className="w-full h-8 sm:h-10 md:h-12 shrink-0 bg-[#0C3C6F] relative flex items-center justify-center">
            {/* Indikator Titik Terpusat di Bagian Bawah untuk Step 1 */}
            <div className="flex items-center justify-center gap-2.5 pb-1 sm:pb-1.5">
              <span
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors duration-200 ${
                  currentStep === 1 ? "bg-[#0070E0]" : "bg-[#E2E8F0]"
                }`}
              />
              <span
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors duration-200 ${
                  currentStep === 2 ? "bg-[#0070E0]" : "bg-[#E2E8F0]"
                }`}
              />
              <span
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors duration-200 ${
                  currentStep === 3 ? "bg-[#0070E0]" : "bg-[#E2E8F0]"
                }`}
              />
              <span
                className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors duration-200 ${
                  currentStep === 4 ? "bg-[#0070E0]" : "bg-[#E2E8F0]"
                }`}
              />
            </div>
          </div>
        ) : null}
      </div>

      {/* ── 3. Area Tombol Navigasi Bawah (Hanya Slide 1, 2, 3, 4) ── */}
      {currentStep < 5 && (
        <div
          className={`shrink-0 w-full z-10 pt-1.5 sm:pt-2 pb-3.5 sm:pb-5 md:pb-6 ${
            currentStep === 1 ? "bg-[#0C3C6F]" : "bg-white"
          }`}
        >
          <div
            className={`w-full max-w-2xl lg:max-w-3xl mx-auto px-6 sm:px-8 flex items-center ${
              currentStep === 1 ? "justify-end" : "justify-between"
            }`}
          >
            {currentStep > 1 ? (
              <button
                onClick={handleBack}
                className="w-20 sm:w-24 h-8.5 sm:h-9 bg-[#D9D9D9] hover:bg-[#C8C8C8] active:scale-95 text-gray-900 font-semibold text-xs sm:text-sm rounded-xl shadow-sm flex items-center justify-center transition-all cursor-pointer"
              >
                Back
              </button>
            ) : null}

            <button
              onClick={handleNext}
              className="w-20 sm:w-24 h-8.5 sm:h-9 bg-[#0070E0] hover:bg-[#0060C5] active:scale-95 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/25 flex items-center justify-center transition-all cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SplashPages;
