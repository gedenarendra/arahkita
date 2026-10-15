import { useState } from "react";
import logoArahkita from "../assets/Logo.png";
import BottomNavigation from "../components/BottomNavigation";
import {
  RecommendationNavIcon,
  HomeNavIcon,
  ProfileNavIcon,
} from "../components/NavigationIcons";

function DashboardPages({
  onNavigateHome,
  onNavigateRecomendation,
  onNavigateProfile,
  activeTab: controlledActiveTab,
  onTabChange,
}) {
  const [internalActiveTab, setInternalActiveTab] = useState("home");
  const activeTab =
    controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const handleTabClick = (tab) => {
    if (onTabChange) onTabChange(tab);
    setInternalActiveTab(tab);

    if (tab === "home" && onNavigateHome) onNavigateHome();
    if (tab === "recomendation" && onNavigateRecomendation)
      onNavigateRecomendation();
    if (tab === "profile" && onNavigateProfile) onNavigateProfile();
  };

  return (
    <div className="min-h-dvh w-full bg-white flex flex-col items-center overflow-x-hidden font-sans">
      {/* 
        Container utama:
        - Layar HP: max-w-107.5 (430px), persis proporsi gambar mockup (pt-12, px-5, pb-28).
        - Layar Laptop: melebar menyesuaikan layar (max-w-4xl / max-w-6xl, px-8 lg:px-12, pt-7).
      */}
      <div className="w-full max-w-107.5 md:max-w-4xl lg:max-w-6xl px-5 md:px-8 lg:px-12 pt-12 md:pt-7 pb-28 md:pb-12 flex flex-col flex-1 transition-all duration-300">
        {/* Header */}
        <header className="w-full flex items-center justify-between pb-0 md:pb-5 md:border-b md:border-gray-100">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <img
              src={logoArahkita}
              alt="Arahkita Logo"
              className="h-9.5 md:h-10 w-auto object-contain"
            />
            <span className="text-[22px] md:text-2xl font-bold text-gray-950 tracking-tight">
              Arahkita
            </span>
          </div>

          {/* Desktop Navigation (Muncul khusus di Laptop/Tablet agar layout lebih optimal) */}
          <nav className="hidden md:flex items-center gap-2 bg-[#eaeaea] p-1.5 rounded-2xl">
            {/* 1. Recomendation */}
            <button
              onClick={() => handleTabClick("recomendation")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "recomendation"
                  ? "bg-white text-[#1d154a] shadow-xs"
                  : "text-gray-600 hover:text-[#1d154a]"
              }`}
            >
              <RecommendationNavIcon
                className="w-5 h-5"
                cutoutColor={
                  activeTab === "recomendation" ? "#ffffff" : "#eaeaea"
                }
              />
              <span>Rekomendasi</span>
            </button>

            {/* 2. Home */}
            <button
              onClick={() => handleTabClick("home")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "home"
                  ? "bg-white text-[#1d154a] shadow-xs"
                  : "text-gray-600 hover:text-[#1d154a]"
              }`}
            >
              <HomeNavIcon
                className="w-5 h-5"
                cutoutColor={activeTab === "home" ? "#ffffff" : "#eaeaea"}
              />
              <span>Beranda</span>
            </button>

            {/* 3. Profile */}
            <button
              onClick={() => handleTabClick("profile")}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "bg-white text-[#1d154a] shadow-xs"
                  : "text-gray-600 hover:text-[#1d154a]"
              }`}
            >
              <ProfileNavIcon className="w-5 h-5" />
              <span>Profil</span>
            </button>
          </nav>
        </header>

        {/* Greeting Section */}
        <section className="mt-9 md:mt-8 flex flex-col">
          <p className="text-[13px] md:text-sm lg:text-base font-semibold text-[#8f96a3] tracking-wide">
            Hai, Goodmorning
          </p>
          <p className="text-xl md:text-sm lg:text-3xl font-extrabold text-black tracking-tight leading-tight">
            welcome to arahkita
          </p>
        </section>

        {/* 
          Dashboard Content Grid:
          - Mobile (< md): Vertikal persis gambar (Hero Card di atas, 3 kartu kecil di bawah).
          - Laptop (lg): 2 Kolom side-by-side (Hero Card 2/3 lebar di kiri, 3 kartu aksi di kanan vertikal).
          - Tablet (md): Hero Card di atas, 3 kartu memanjang di bawah.
        */}
        <div className="mt-4 md:mt-6 lg:grid lg:grid-cols-12 lg:gap-6 lg:items-stretch">
          {/* Big Hero Card */}
          <section
            className="w-full h-36 md:h-56 lg:h-72 lg:col-span-8 rounded-[18px] md:rounded-2xl lg:rounded-3xl bg-linear-to-b from-[#305781] via-[#466c93] to-[#5d7c9f] shadow-hero transition-all duration-300"
            aria-label="Hero Card"
          ></section>

          {/* 3 Secondary Cards */}
          <section className="mt-3 md:mt-4 lg:mt-0 grid grid-cols-3 lg:flex lg:flex-col lg:justify-between gap-2.5 md:gap-4 lg:gap-3.5 w-full lg:col-span-4">
            <div className="h-14 md:h-20 lg:h-20.5 bg-[#d9d9d9] rounded-lg md:rounded-xl shadow-subcard hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"></div>
            <div className="h-14 md:h-20 lg:h-20.5 bg-[#d9d9d9] rounded-lg md:rounded-xl shadow-subcard hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"></div>
            <div className="h-14 md:h-20 lg:h-20.5 bg-[#d9d9d9] rounded-lg md:rounded-xl shadow-subcard hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 cursor-pointer"></div>
          </section>
        </div>
      </div>

      {/* 
        Floating Bottom Navigation:
        - Khusus di layar HP (< md): Menggunakan komponen terpadu BottomNavigation (variant="floating").
        - Di layar Laptop (md:): Disembunyikan (md:hidden) karena navigasi sudah berpindah ke Top Navbar secara ergonomis.
      */}
      <BottomNavigation
        variant="floating"
        activeTab={activeTab}
        onTabChange={handleTabClick}
      />
    </div>
  );
}

export default DashboardPages;
