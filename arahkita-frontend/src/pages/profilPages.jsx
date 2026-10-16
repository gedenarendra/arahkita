import { useState, useEffect } from "react";
import BottomNavigation from "../components/BottomNavigation";
import logoArahkita from "../assets/Logo.png";
import { recommendationRepository } from "../repositories/recommendationRepository";
import db from "../lib/dexie";

/**
 * Halaman Profil Pengguna (ProfilPages)
 * Menampilkan:
 * 1. Header dengan Logo ArahKita di kanan atas
 * 2. Judul 'Profil' di tengah halaman
 * 3. Avatar lingkaran hitam ikonik dengan siluet user
 * 4. Card info profil (Minat & Nilai Rapor) yang membuat halaman lebih menarik dan informatif
 * 5. Tombol 'Quit' merah: Menghapus seluruh data IndexedDB dan set has_onboarded ke false untuk reset sesi
 * 6. Bottom Navigation Bar terpadu
 */
function ProfilPages({
  activeTab = "profile",
  onTabChange = () => {},
  onResetOnboarding,
}) {
  const [userProfile, setUserProfile] = useState(null);

  // Ambil profil minat dan nilai dari IndexedDB / localStorage
  useEffect(() => {
    let isMounted = true;

    recommendationRepository.getUserProfile().then((profile) => {
      if (isMounted && profile) {
        setUserProfile(profile);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Format array minat dari string koma
  const interestsList = userProfile?.minat
    ? userProfile.minat
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : ["Teknologi", "Informatika"];

  // Ekstrak daftar nilai mata pelajaran secara dinamis dari hasil onboarding
  const parsedSubjects = (() => {
    if (!userProfile?.nilai) return null;

    if (Array.isArray(userProfile.nilai)) {
      const items = userProfile.nilai
        .map((item) => ({
          name: item?.name || item?.subject || "Mata Pelajaran",
          score: Number(item?.grade ?? item?.score) || 80,
        }))
        .filter((item) => Boolean(item.name));
      return items.length > 0 ? items : null;
    }

    if (typeof userProfile.nilai === "object") {
      const entries = Object.entries(userProfile.nilai).map(([key, val]) => ({
        name: key,
        score: Number(val) || 80,
      }));
      return entries.length > 0 ? entries : null;
    }

    return null;
  })();

  const subjectsList = parsedSubjects || [
    { name: "matematika", score: 85 },
    { name: "fisika", score: 80 },
    { name: "kimia", score: 90 },
  ];

  // Handle Quit: Hapus seluruh data di IndexedDB & set has_onboarded ke false
  const handleQuit = async () => {
    try {
      // Hapus seluruh data pada setiap tabel IndexedDB
      await Promise.all(db.tables.map((table) => table.clear()));
    } catch (error) {
      console.error("Gagal menghapus IndexedDB:", error);
    }

    // Reset status onboarding dan hapus data profil
    localStorage.removeItem("has_onboarded");
    localStorage.removeItem("user_profile_data");

    if (typeof onResetOnboarding === "function") {
      onResetOnboarding();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="w-full h-dvh flex flex-col bg-white font-sans overflow-hidden relative select-none">
      {/* ── 1. Top Header: Logo ArahKita di Kanan Atas Sesuai Mockup ── */}
      <header className="shrink-0 flex items-center justify-end px-6 pt-7 pb-2 max-w-md mx-auto w-full">
        <div className="flex items-center">
          <img src={logoArahkita} alt="Arahkita" className="h-7 w-auto" />
          <span className="text-[22px] font-bold text-gray-950 tracking-tight">
            rahkita
          </span>
        </div>
      </header>

      {/* ── 2. Konten Utama Profil (Scrollable jika layar kecil) ── */}
      <div className="flex-1 min-h-0 px-6 pt-2 pb-4 overflow-y-auto max-w-md mx-auto w-full flex flex-col items-center scrollbar-thin">
        {/* Judul Halaman Sesuai Desain Acuan */}
        <h1 className="text-2xl font-black text-gray-950 tracking-tight mb-8 text-center">
          Profil
        </h1>

        {/* Avatar Profil: Lingkaran Hitam dengan Siluet User Putih */}
        <div className="relative group mb-4">
          <div className="w-32 h-32 sm:w-36 sm:h-36 rounded-full bg-black flex items-center justify-center shadow-xl ring-4 ring-slate-100 overflow-hidden transition-transform duration-300 group-hover:scale-105">
            <svg
              viewBox="0 0 24 24"
              className="w-22 h-22 sm:w-24 sm:h-24 text-white fill-current"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Kepala Avatar */}
              <circle cx="12" cy="7.8" r="4.3" />
              {/* Bahu & Dada Avatar */}
              <path d="M4.2 20.8C4.2 15.8 7.8 13.6 12 13.6C16.2 13.6 19.8 15.8 19.8 20.8Z" />
            </svg>
          </div>

          {/* Badge Status Aktif */}
          <span className="absolute bottom-1 right-2 w-5 h-5 bg-[#10B981] border-2 border-white rounded-full shadow-xs" />
        </div>

        {/* Nama & Role Pengguna */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-extrabold text-gray-950 tracking-tight">
            Pelajar ArahKita
          </h2>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">
            Kelas XII • Eksplorasi Jurusan Aktif
          </p>
        </div>

        {/* Tombol Quit Merah Sesuai Mockup */}
        <div className="mb-7">
          <button
            type="button"
            onClick={handleQuit}
            className="bg-[#E50914] hover:bg-red-700 active:scale-95 text-white font-bold py-2.5 px-10 rounded-full shadow-md shadow-red-500/25 transition-all text-sm tracking-wide cursor-pointer"
          >
            Quit
          </button>
        </div>

        {/* ── 3. Kartu Ringkasan Informasi (Membuat Tampilan Lebih Menarik & Bernilai) ── */}
        <div className="w-full space-y-3.5 pb-2">
          {/* Card Minat Terpilih */}
          <div className="bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-extrabold text-gray-800 tracking-tight">
                Minat Terpilih
              </span>
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {interestsList.length} Minat
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {interestsList.map((interest, idx) => (
                <span
                  key={idx}
                  className="bg-[#1d3d63] text-white text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-2xs capitalize"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>

          {/* Card Nilai Rapor Terdaftar dari Onboarding */}
          <div className="bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-extrabold text-gray-800 tracking-tight">
                Nilai Mata Pelajaran
              </span>
              <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                {subjectsList.length} Mata Pelajaran
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {subjectsList.map((subject, idx) => (
                <div
                  key={idx}
                  className="bg-white p-2 rounded-xl border border-slate-200/60 shadow-2xs flex flex-col items-center justify-between min-h-14.5"
                >
                  <span
                    className="text-[10px] sm:text-[11px] text-gray-600 font-bold block capitalize tracking-tight truncate w-full"
                    title={subject.name}
                  >
                    {subject.name}
                  </span>
                  <span className="text-sm sm:text-base font-extrabold text-gray-950 mt-1">
                    {subject.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 5. Bottom Navigation Bar Terpadu ── */}
      <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}

export default ProfilPages;
