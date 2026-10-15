import { useState, useRef, useEffect } from "react";
import {
  formatInterestsForBackend,
  MAX_INTERESTS_COUNT,
} from "../../utils/interestUtils";

// ── SVG Ikon untuk 7 Gelembung Minat (Sesuai Gambar 1) ──

function MapLocationIcon({ className = "w-8 h-8" }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      {/* Peta Terlipat */}
      <path
        d="M6 13L18 9L30 13L42 9V35L30 39L18 35L6 39V13Z"
        fill="#E2E8F0"
        stroke="#1E293B"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M18 9V35"
        stroke="#1E293B"
        strokeWidth="2.5"
        strokeDasharray="3 3"
      />
      <path
        d="M30 13V39"
        stroke="#1E293B"
        strokeWidth="2.5"
        strokeDasharray="3 3"
      />
      {/* Pin Lokasi Biru 1 */}
      <circle cx="24" cy="18" r="3" fill="#2563EB" />
      <path
        d="M24 21V26"
        stroke="#2563EB"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Pin Lokasi Biru 2 */}
      <circle cx="36" cy="16" r="3" fill="#2563EB" />
      <path
        d="M36 19V24"
        stroke="#2563EB"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function HandshakeIcon({ className = "w-7 h-7" }) {
  return (
    <svg viewBox="0 0 40 40" fill="none" className={className}>
      {/* Lengan Baju Biru */}
      <path d="M4 16L12 12L15 18L7 22Z" fill="#2563EB" />
      <path d="M36 16L28 12L25 18L33 22Z" fill="#1E293B" />
      {/* Tangan Berjabat */}
      <path
        d="M12 18L18 24L24 18L28 20L22 26L16 26L10 20Z"
        fill="#FDE68A"
        stroke="#1E293B"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M18 20L22 24"
        stroke="#1E293B"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoneyBundleIcon({ className = "w-8 h-8" }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      {/* Seikat Uang Kertas Miring */}
      <rect
        x="8"
        y="14"
        width="30"
        height="18"
        rx="2"
        transform="rotate(-8 8 14)"
        fill="#FFFFFF"
        stroke="#1E293B"
        strokeWidth="2.5"
      />
      <rect
        x="10"
        y="16"
        width="30"
        height="18"
        rx="2"
        transform="rotate(6 10 16)"
        fill="#F8FAFC"
        stroke="#1E293B"
        strokeWidth="2.5"
      />
      {/* Pita Biru Pengikat */}
      <rect
        x="22"
        y="14"
        width="7"
        height="22"
        transform="rotate(6 22 14)"
        fill="#2563EB"
      />
      {/* Kilau Bintang */}
      <path
        d="M41 10L42 13L45 14L42 15L41 18L40 15L37 14L40 13Z"
        fill="#1E293B"
      />
      <path d="M6 32L7 34L9 35L7 36L6 38L5 36L3 35L5 34Z" fill="#1E293B" />
    </svg>
  );
}

function PhoneChecklistIcon({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" className={className}>
      <rect
        x="7"
        y="4"
        width="22"
        height="28"
        rx="4"
        fill="#FFFFFF"
        stroke="#1E293B"
        strokeWidth="2"
      />
      {/* Garis & Kotak Centang */}
      <rect x="11" y="9" width="14" height="3" rx="1.5" fill="#E2E8F0" />
      <rect x="11" y="15" width="14" height="4" rx="1" fill="#2563EB" />
      <path
        d="M12 23H24"
        stroke="#1E293B"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12 27H20"
        stroke="#1E293B"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function EnvelopeCheckIcon({ className = "w-9 h-9" }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className}>
      {/* Amplop Terbuka Biru */}
      <rect x="6" y="18" width="36" height="24" rx="3" fill="#4376F7" />
      {/* Kertas Keluar */}
      <rect
        x="11"
        y="8"
        width="26"
        height="18"
        rx="2"
        fill="#FFFFFF"
        stroke="#1E293B"
        strokeWidth="2"
      />
      {/* Tanda Centang */}
      <path
        d="M16 17L21 21L31 12"
        stroke="#2563EB"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Lipatan Amplop */}
      <path d="M6 20L24 33L42 20" stroke="#1D4ED8" strokeWidth="2.5" />
      {/* Sparkles */}
      <path d="M4 14L5 16L7 17L5 18L4 20L3 18L1 17L3 16Z" fill="#1E293B" />
      <path
        d="M43 28L44 30L46 31L44 32L43 34L42 32L40 31L42 30Z"
        fill="#1E293B"
      />
    </svg>
  );
}

function MicroscopeIcon({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" className={className}>
      {/* Mikroskop / Lab Flask */}
      <path
        d="M15 6L21 6M18 6V14M12 18L24 14"
        stroke="#1E293B"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <rect x="10" y="22" width="16" height="3" rx="1.5" fill="#2563EB" />
      <path
        d="M18 22V27M10 28H26"
        stroke="#1E293B"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MagnifyingGlassIcon({ className = "w-6 h-6" }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" className={className}>
      <circle
        cx="15"
        cy="15"
        r="7"
        stroke="#1E293B"
        strokeWidth="2.5"
        fill="#E2E8F0"
      />
      <path
        d="M20 20L28 28"
        stroke="#1E293B"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M12 12C13 10.5 15 10 16 10"
        stroke="#2563EB"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M7 6L8 8L10 9L8 10L7 12L6 10L4 9L6 8Z" fill="#1E293B" />
    </svg>
  );
}

function InterestComponent({
  subStep = 1,
  onSubStepChange,
  selectedInterests = [],
  setSelectedInterests,
  errorMessage = "",
  maxInterests = MAX_INTERESTS_COUNT,
  onBackendPayloadChange,
}) {
  const [inputValue, setInputValue] = useState("");
  const [localInterests, setLocalInterests] = useState([]);
  const [localError, setLocalError] = useState("");

  const inputRef = useRef(null);

  const interests = setSelectedInterests ? selectedInterests : localInterests;
  const updateInterests = setSelectedInterests || setLocalInterests;

  // Fokus otomatis saat beralih ke subStep 2
  useEffect(() => {
    if (subStep === 2 && inputRef.current) {
      inputRef.current.focus();
    }
  }, [subStep]);

  // Sync string payload ke parent jika interests berubah
  const notifyBackendPayload = (items) => {
    if (onBackendPayloadChange) {
      // Contoh hasil: "bisnis dan keuangan, informatika"
      const payloadString = formatInterestsForBackend(items, maxInterests);
      onBackendPayloadChange(payloadString);
    }
  };

  // Tambah minat saat gelembung dipilih
  const handleSelectBubble = (name) => {
    setLocalError("");

    // Aturan 1: Maksimal hanya bisa memilih 5 minat
    if (interests.length >= maxInterests) {
      setLocalError(`Maksimal hanya dapat memilih ${maxInterests} minat.`);
      return;
    }

    // Hindari duplikasi minat yang sama
    const alreadyExists = interests.some(
      (item) => item.name.toLowerCase() === name.toLowerCase(),
    );
    if (alreadyExists) {
      setLocalError(`Minat "${name}" sudah ada dalam daftar.`);
      return;
    }

    const newItem = {
      instanceId: `interest-${Date.now()}-${Math.random()}`,
      name,
    };
    const updated = [...interests, newItem];
    updateInterests(updated);
    notifyBackendPayload(updated);

    if (onSubStepChange) {
      onSubStepChange(2);
    }
  };

  // Tambah minat baru dari input
  const handleAddSubmit = (e) => {
    e.preventDefault();
    setLocalError("");
    const cleanText = inputValue.trim();
    if (!cleanText) return;

    // Aturan 1: Maksimal hanya bisa memilih 5 minat
    if (interests.length >= maxInterests) {
      setLocalError(`Maksimal hanya dapat memilih ${maxInterests} minat.`);
      return;
    }

    // Hindari duplikasi
    const alreadyExists = interests.some(
      (item) => item.name.toLowerCase() === cleanText.toLowerCase(),
    );
    if (alreadyExists) {
      setLocalError(`Minat "${cleanText}" sudah ada dalam daftar.`);
      return;
    }

    const newItem = {
      instanceId: `interest-${Date.now()}-${Math.random()}`,
      name: cleanText,
    };

    const updated = [...interests, newItem];
    updateInterests(updated);
    notifyBackendPayload(updated);
    setInputValue("");
  };

  // Hapus minat berdasarkan id
  const handleRemoveInterest = (instanceId) => {
    setLocalError("");
    const updated = interests.filter((item) => item.instanceId !== instanceId);
    updateInterests(updated);
    notifyBackendPayload(updated);

    if (updated.length === 0 && subStep === 2 && onSubStepChange) {
      onSubStepChange(1);
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-y-auto font-sans select-none">
      {/* ── Teks Judul & Deskripsi (Sesuai Mockup) ── */}
      <div className="text-left w-full max-w-xl md:max-w-2xl mx-auto pt-24 sm:pt-14 ps-4 shrink-0">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
          Tentukan minat mu
        </h1>
        <p className="text-xs sm:text-sm text-white/90 font-normal leading-relaxed mt-2 max-w-sm sm:max-w-md">
          Masukan nilai rata” setiap mata pelajaran yang sesuai dengan kategori,
          agar membantu proses pencocokan jurusan
        </p>
      </div>

      {/* ── 1. Tampilan Gelembung Ikon & Kotak '+' (Sesuai Gambar 1) ── */}
      {subStep === 1 && (
        <div className="mt-4 sm:mt-2 mb-auto flex flex-col items-center justify-center shrink-0 w-full py-4">
          <div className="relative w-72 sm:w-80 h-72 sm:h-80 flex items-center justify-center">
            {/* 1. Gelembung Atas: Peta & Lokasi */}
            <button
              type="button"
              onClick={() => handleSelectBubble("Geografi & Lingkungan")}
              className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-16 sm:w-17 sm:h-17 bg-[#CED8E2] rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Peta & Geografi"
            >
              <MapLocationIcon className="w-9 h-9" />
            </button>

            {/* 2. Gelembung Kanan-Atas: Jabat Tangan */}
            <button
              type="button"
              onClick={() => handleSelectBubble("Sosial & Hubungan")}
              className="absolute top-6 right-5 sm:right-6 w-13 h-13 sm:w-14 sm:h-14 bg-[#CED8E2] rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Sosial & Negosiasi"
            >
              <HandshakeIcon className="w-7 h-7" />
            </button>

            {/* 3. Gelembung Kanan: Uang Kertas */}
            <button
              type="button"
              onClick={() => handleSelectBubble("Bisnis & Keuangan")}
              className="absolute top-1/2 -translate-y-1/2 right-0 w-16 h-16 sm:w-17 sm:h-17 bg-[#CED8E2] rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Keuangan & Bisnis"
            >
              <MoneyBundleIcon className="w-9 h-9" />
            </button>

            {/* 4. Gelembung Kanan-Bawah: Smartphone / Formulir */}
            <button
              type="button"
              onClick={() => handleSelectBubble("Teknologi & Informasi")}
              className="absolute bottom-11 right-10 sm:right-12 w-11 h-11 sm:w-12 sm:h-12 bg-[#CED8E2] rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Teknologi & Dokumen"
            >
              <PhoneChecklistIcon className="w-6 h-6" />
            </button>

            {/* 5. Gelembung Kiri-Bawah: Amplop Terbuka */}
            <button
              type="button"
              onClick={() => handleSelectBubble("Komunikasi & Bahasa")}
              className="absolute bottom-1 left-9 sm:left-10 w-18 h-18 sm:w-20 sm:h-20 bg-[#CED8E2] rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Komunikasi & Berkas"
            >
              <EnvelopeCheckIcon className="w-10 h-10" />
            </button>

            {/* 6. Gelembung Kiri-Tengah: Mikroskop */}
            <button
              type="button"
              onClick={() => handleSelectBubble("Sains & Kesehatan")}
              className="absolute top-1/2 -translate-y-1/2 left-1 sm:left-2 w-11 h-11 sm:w-12 sm:h-12 bg-[#CED8E2] rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Sains & Penelitian"
            >
              <MicroscopeIcon className="w-6 h-6" />
            </button>

            {/* 7. Gelembung Kiri-Atas: Kaca Pembesar */}
            <button
              type="button"
              onClick={() => handleSelectBubble("Riset & Analisis")}
              className="absolute top-8 left-6 sm:left-7 w-12 h-12 sm:w-13 sm:h-13 bg-[#CED8E2] rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Investigasi & Analisis"
            >
              <MagnifyingGlassIcon className="w-7 h-7" />
            </button>

            {/* Kotak Putih Tombol '+' di Tengah */}
            <button
              type="button"
              onClick={() => onSubStepChange && onSubStepChange(2)}
              className="w-24 sm:w-26 h-14 sm:h-15 bg-white rounded-xl shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all z-20 group"
              title="Tambah Minat"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="#D1D5DB"
                strokeWidth={4.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8 group-hover:text-gray-400 transition-colors"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>

          {/* Indikator Jumlah Minat Terpilih */}
          {interests.length > 0 && (
            <div className="mt-3 text-xs text-white/90 font-semibold bg-white/10 px-3 py-1 rounded-full">
              {interests.length}/{maxInterests} minat terpilih
            </div>
          )}

          {/* Pesan Kesalahan jika ada */}
          {(errorMessage || localError) && (
            <p className="mt-2 text-amber-200 text-xs text-center font-medium px-4">
              {errorMessage || localError}
            </p>
          )}
        </div>
      )}

      {/* ── 2. Tampilan Input & Daftar Minat (Sesuai Gambar 2) ── */}
      {subStep === 2 && (
        <div className="mt-6 sm:mt-4 mb-auto flex flex-col items-center justify-center shrink-0 w-full py-2">
          {/* Indikator Jumlah Minat */}
          <div className="text-xs text-white/90 font-semibold mb-2 bg-white/10 px-3 py-1 rounded-full">
            {interests.length}/{maxInterests} minat terpilih
          </div>

          {/* Kotak Putih "masukan sini" */}
          <form
            onSubmit={handleAddSubmit}
            className={`w-full max-w-65 sm:max-w-72 h-12 sm:h-13 bg-white rounded-xl flex items-center justify-center px-4 shadow-sm ${
              interests.length >= maxInterests ? "opacity-75" : ""
            }`}
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={interests.length >= maxInterests}
              placeholder={
                interests.length >= maxInterests
                  ? "Maksimal 5 minat"
                  : "masukan sini"
              }
              className="w-full text-center font-bold text-base text-gray-900 placeholder:text-gray-950 placeholder:font-bold outline-none bg-transparent disabled:cursor-not-allowed"
            />
          </form>

          {/* Pesan Kesalahan jika ada */}
          {(errorMessage || localError) && (
            <p className="mt-2 text-amber-200 text-xs text-center font-medium px-4">
              {errorMessage || localError}
            </p>
          )}

          {/* Daftar Kartu Minat (Background Abu-abu dengan Teks Tengah & Tombol 'X' di Kanan) */}
          <div className="w-full max-w-75 sm:max-w-82 space-y-2.5 mt-6 sm:mt-8">
            {interests.map((item) => (
              <div
                key={item.instanceId}
                className="w-full h-10.5 sm:h-11.5 bg-[#D9D9D9] rounded-xl flex items-center justify-between px-4 sm:px-5 shadow-xs relative"
              >
                {/* Teks Minat Terpusat Sesuai Gambar 2 */}
                <span className="flex-1 text-center font-semibold text-gray-900 text-sm sm:text-base truncate px-2">
                  {item.name}
                </span>

                {/* Tombol X Biru Tua (#0C3C6F) di Kanan */}
                <button
                  type="button"
                  onClick={() => handleRemoveInterest(item.instanceId)}
                  className="text-[#0C3C6F] font-black text-lg hover:scale-125 active:scale-95 transition-transform cursor-pointer p-0.5 shrink-0"
                  title={`Hapus ${item.name}`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4.5 h-4.5"
                  >
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          {/* Tombol Kembali ke Tampilan Gelembung / Tambah */}
          {onSubStepChange && (
            <button
              type="button"
              onClick={() => onSubStepChange(1)}
              className="mt-4 text-xs text-white/80 hover:text-white flex items-center gap-1 font-semibold transition-colors cursor-pointer"
            >
              + Pilih dari Kategori / Gelembung
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default InterestComponent;
