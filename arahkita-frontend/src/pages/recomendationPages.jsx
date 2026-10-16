import { useState, useEffect } from "react";
import RecommendationSummaryComponent from "../components/recommendation/RecommendationSummaryComponent";
import MajorPreviewComponent from "../components/recommendation/MajorPreviewComponent";
import CareerDetailModal from "../components/recommendation/CareerDetailModal";
import BottomNavigation from "../components/BottomNavigation";
import {
  fetchRecommendationResults,
  getCachedRecommendationResults,
} from "../api/recommendationApi";

/**
 * Halaman Utama Rekomendasi (RecomendationPages)
 * Mengkoordinasikan 3 komponen sesuai desain:
 * 1. RecommendationSummaryComponent: Ringkasan hasil rekomendasi (Lingkaran 98% & list kartu)
 * 2. MajorPreviewComponent: Detail/Preview jurusan terpilih (Kartu biru & karir path)
 * 3. CareerDetailModal: Bottom sheet informasi profesi & lingkungan kerja
 */
function RecomendationPages({
  recommendations: propRecommendations,
  topRecommendation,
  activeTab = "recomendation",
  onTabChange = () => {},
}) {
  // State data hasil rekomendasi internal (dari API / IndexedDB)
  const [internalResults, setInternalResults] = useState([]);
  const [isLoading, setIsLoading] = useState(
    !(Array.isArray(propRecommendations) && propRecommendations.length > 0)
  );
  const [errorMessage, setErrorMessage] = useState("");

  const displayedResults =
    Array.isArray(propRecommendations) && propRecommendations.length > 0
      ? propRecommendations
      : internalResults;

  // State untuk jurusan yang sedang di-preview (null = tampilkan ringkasan hasil rekomendasi)
  const [selectedMajor, setSelectedMajor] = useState(null);

  // State untuk modal detail karir yang sedang dibuka (null = modal tertutup)
  const [selectedCareer, setSelectedCareer] = useState(null);

  const handleRetry = () => {
    setIsLoading(true);
    setErrorMessage("");
    fetchRecommendationResults()
      .then((response) => {
        setIsLoading(false);
        if (response.success && Array.isArray(response.data) && response.data.length > 0) {
          setInternalResults(response.data);
          setErrorMessage("");
        } else {
          setErrorMessage(response.error || "Gagal memuat hasil rekomendasi dari server.");
        }
      })
      .catch((err) => {
        setIsLoading(false);
        setErrorMessage(err?.message || "Terjadi kesalahan jaringan.");
      });
  };

  useEffect(() => {
    if (Array.isArray(propRecommendations) && propRecommendations.length > 0) {
      return;
    }

    let isMounted = true;

    // 1. Coba baca cache lokal terlebih dahulu agar transisi UI instan
    getCachedRecommendationResults().then((cached) => {
      if (isMounted && cached?.data && cached.data.length > 0) {
        setInternalResults(cached.data);
        setIsLoading(false);
      }
    });

    // 2. Lakukan request ke backend POST /api/v1/recommendation-results
    fetchRecommendationResults()
      .then((response) => {
        if (!isMounted) return;
        setIsLoading(false);

        if (response.success && Array.isArray(response.data) && response.data.length > 0) {
          setInternalResults(response.data);
          setErrorMessage("");
        } else if (!response.success) {
          setErrorMessage(response.error || "Gagal memuat hasil rekomendasi dari server.");
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
  }, [propRecommendations]);

  const handleSelectMajor = (majorItem) => {
    setSelectedMajor(majorItem);
  };

  const handleBackToSummary = () => {
    setSelectedMajor(null);
  };

  const handleTabClick = (tab) => {
    if (tab === "home") {
      setSelectedMajor(null);
      setSelectedCareer(null);
    }
    onTabChange(tab);
  };

  return (
    <div className="w-full h-dvh flex flex-col bg-white font-sans overflow-hidden relative">
      {/* ── Area Konten (Komponen 1 atau Komponen 2) ── */}
      <div className="flex-1 min-h-0">
        {isLoading && displayedResults.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="w-11 h-11 border-4 border-blue-200 border-t-[#0070E0] rounded-full animate-spin mb-4" />
            <h2 className="text-gray-900 font-bold text-base tracking-tight">
              Memuat Hasil Rekomendasi...
            </h2>
            <p className="text-gray-500 text-xs mt-1">
              Menyusun peringkat evaluasi jurusan terbaik untukmu
            </p>
          </div>
        ) : errorMessage && displayedResults.length === 0 ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center select-none max-w-sm mx-auto">
            <p className="text-gray-800 font-bold text-sm mb-1">
              Belum Dapat Memuat Data
            </p>
            <p className="text-gray-500 text-xs mb-4 leading-relaxed">
              {errorMessage}
            </p>
            <button
              type="button"
              onClick={handleRetry}
              className="px-4 py-2 bg-[#0070E0] hover:bg-[#0060C5] text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer"
            >
              Coba Lagi
            </button>
          </div>
        ) : selectedMajor ? (
          <MajorPreviewComponent
            majorData={selectedMajor}
            onBack={handleBackToSummary}
            onSelectCareer={(career) => setSelectedCareer(career)}
          />
        ) : (
          <RecommendationSummaryComponent
            recommendations={displayedResults}
            topRecommendation={topRecommendation}
            onSelectMajor={handleSelectMajor}
          />
        )}
      </div>

      {/* ── Komponen 3: Bottom Sheet Modal Detail Karir Path ── */}
      <CareerDetailModal
        career={selectedCareer}
        onClose={() => setSelectedCareer(null)}
      />

      {/* ── Bottom Navigation Bar (Terpusat di Level Page) ── */}
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabClick} />
    </div>
  );
}

export default RecomendationPages;
