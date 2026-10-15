import { useState } from "react";
import {
  MIN_SUBJECTS_COUNT,
  MAX_SUBJECTS_COUNT,
} from "../../utils/subjectMapping";

function SearchIcon({ className = "w-4.5 h-4.5 text-gray-800" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function TrashIcon({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19 4h-3.5l-1-1h-5l-1 1H5v2h14M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12z" />
    </svg>
  );
}

// Preset pemetaan warna badge sesuai mockup
const getSubjectBadgeColor = (name) => {
  const lower = name.toLowerCase().trim();
  if (lower === "matematika" || lower.startsWith("matematika")) {
    return "bg-[#407BFF]";
  }
  if (
    lower === "ipa" ||
    lower.includes("fisika") ||
    lower.includes("kimia") ||
    lower.includes("biologi")
  ) {
    return "bg-[#F7A9A0]";
  }
  if (
    lower === "ips" ||
    lower.includes("ekonomi") ||
    lower.includes("geografi") ||
    lower.includes("sosiologi") ||
    lower.includes("sejarah")
  ) {
    return "bg-[#92E3A9]";
  }
  return "bg-[#407BFF]";
};

function GradesComponent({
  subStep = 1,
  onSubStepChange,
  selectedSubjects = [],
  setSelectedSubjects,
  errorMessage = "",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [localError, setLocalError] = useState("");
  // Local fallback jika props tidak disediakan
  const [localSubjects, setLocalSubjects] = useState([]);
  const subjects = setSelectedSubjects ? selectedSubjects : localSubjects;
  const updateSubjects = setSelectedSubjects || setLocalSubjects;

  const displayError = errorMessage || localError;

  // Menambahkan mata pelajaran via form pencarian
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    if (subjects.length >= MAX_SUBJECTS_COUNT) {
      setLocalError(
        `Maksimal ${MAX_SUBJECTS_COUNT} mata pelajaran sudah tercapai.`,
      );
      return;
    }

    const isDuplicate = subjects.some(
      (s) => s.name.trim().toLowerCase() === query.toLowerCase(),
    );
    if (isDuplicate) {
      setLocalError(`Mata pelajaran "${query}" sudah ditambahkan.`);
      return;
    }

    setLocalError("");
    const newEntry = {
      instanceId: `${query.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}-${Math.random()}`,
      name: query,
      badgeColor: getSubjectBadgeColor(query),
      grade: 80,
    };

    updateSubjects([...subjects, newEntry]);
    setSearchQuery("");
  };

  // Menghapus mata pelajaran
  const handleRemoveSubject = (instanceId) => {
    setLocalError("");
    const updated = subjects.filter((s) => s.instanceId !== instanceId);
    updateSubjects(updated);
    if (updated.length === 0 && subStep === 2 && onSubStepChange) {
      onSubStepChange(1);
    }
  };

  // Mengubah nilai mata pelajaran (hanya angka positif 0-100, tidak bisa minus)
  const handleGradeChange = (instanceId, rawValue) => {
    // Bersihkan karakter selain angka (menghapus minus '-', plus '+', huruf, dsb.)
    const cleanDigits = String(rawValue).replace(/\D/g, "");

    // Jika kosong, simpan string kosong agar user bisa menghapus dan mengetik ulang
    if (cleanDigits === "") {
      const updated = subjects.map((s) =>
        s.instanceId === instanceId ? { ...s, grade: "" } : s,
      );
      updateSubjects(updated);
      return;
    }

    // Batasi nilai hanya 0 sampai 100
    const numericValue = Math.min(100, Math.max(0, parseInt(cleanDigits, 10)));
    const updated = subjects.map((s) =>
      s.instanceId === instanceId ? { ...s, grade: numericValue } : s,
    );
    updateSubjects(updated);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between overflow-y-auto font-sans select-none">
      {/* ── Teks Judul & Deskripsi (Sesuai Mockup) ── */}
      <div className="text-left w-full max-w-xl md:max-w-2xl mx-auto pt-24 sm:pt-14 ps-4 shrink-0">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
          Nilai Rata- Rata
        </h1>
        <p className="text-xs sm:text-sm text-white/90 font-normal leading-relaxed mt-2 max-w-sm sm:max-w-md">
          Masukan nilai rata“ setiap mata pelajaran yang sesuai dengan kategori,
          agar membantu proses pencocokan jurusan
        </p>
      </div>

      {/* ── 1. Komponen Belum Ada Mata Pelajaran (Fase Pencarian) ── */}
      {subStep === 1 && (
        <div className="mt-8 sm:mt-5 mb-auto flex flex-col items-center justify-center shrink-0 w-full py-2">
          {/* Kotak Pencarian Putih */}
          <form
            onSubmit={handleSearchSubmit}
            className="w-full max-w-61.25 sm:max-w-65 h-10 sm:h-11 bg-white rounded-lg flex items-center justify-between px-3.5 shadow-sm"
          >
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (localError) setLocalError("");
              }}
              placeholder="Cari mata pelajaran..."
              className="w-full bg-transparent outline-none text-gray-800 text-base font-medium placeholder:text-gray-400"
            />
            <button
              type="submit"
              aria-label="Cari mata pelajaran"
              className="text-gray-900 ml-2 hover:opacity-75 cursor-pointer shrink-0"
            >
              <SearchIcon className="w-4.5 h-4.5" />
            </button>
          </form>

          {/* Pesan Kesalahan jika user klik Next / tambah melebihi limit */}
          {displayError && (
            <p className="pt-2 text-amber-200 text-xs text-center font-medium px-4">
              {displayError}
            </p>
          )}

          {/* Card Hasil Pencarian (Awalnya kosong, muncul setelah input & pencarian) */}
          {subjects.length > 0 && (
            <div className="mt-6 sm:mt-5 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 max-w-75 sm:max-w-90 mx-auto">
              {subjects.map((subject) => (
                <div
                  key={subject.instanceId}
                  className="bg-[#407BFF] text-white font-bold text-xs sm:text-sm px-3.5 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5 select-none"
                >
                  <span>{subject.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSubject(subject.instanceId)}
                    className="text-white/80 hover:text-white hover:bg-white/20 rounded-full w-4 h-4 flex items-center justify-center text-xs ml-0.5 cursor-pointer transition-colors"
                    title={`Hapus ${subject.name}`}
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Tombol Lanjut ke Isi Nilai setelah menambahkan mata pelajaran */}
          {subjects.length > 0 && onSubStepChange && (
            <div className="flex flex-col items-center gap-1.5 mt-5">
              <button
                type="button"
                onClick={() => {
                  if (subjects.length < MIN_SUBJECTS_COUNT) {
                    setLocalError(
                      `Tambahkan minimal ${MIN_SUBJECTS_COUNT} mata pelajaran sebelum mengisi nilai.`,
                    );
                    return;
                  }
                  setLocalError("");
                  onSubStepChange(2);
                }}
                className="px-4.5 py-2 bg-[#0070E0] hover:bg-[#0060C5] active:scale-95 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-500/25 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span>Lanjut Isi Nilai</span>
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
              {subjects.length < MIN_SUBJECTS_COUNT && (
                <span className="text-[11px] text-white/70">
                  Minimal {MIN_SUBJECTS_COUNT} mata pelajaran ({subjects.length}
                  /{MIN_SUBJECTS_COUNT})
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── 2. Komponen Jika Sudah Ada Mata Pelajaran (Fase Pengisian Nilai) ── */}
      {subStep === 2 && (
        <div className="mt-6 sm:mt-5 mb-auto flex flex-col items-center justify-center shrink-0 w-full py-2">
          {displayError && (
            <p className="pb-3 text-amber-200 text-xs text-center font-medium px-4">
              {displayError}
            </p>
          )}
          <div className="space-y-3 sm:space-y-3.5 w-full max-w-70 sm:max-w-77.5">
            {subjects.map((subject) => (
              <div
                key={subject.instanceId}
                className="flex items-center justify-between gap-2.5"
              >
                {/* Kotak Putih 1: Badge Mata Pelajaran */}
                <div className="w-36.25 sm:w-40 h-10 sm:h-11 bg-white rounded-lg flex items-center justify-center shadow-sm px-2.5">
                  <span
                    className={`w-full py-1 rounded-md text-white font-bold text-xs sm:text-sm text-center shadow-xs ${subject.badgeColor}`}
                  >
                    {subject.name}
                  </span>
                </div>

                {/* Kotak Putih 2: Input Angka Nilai (Hanya angka, tidak bisa minus) */}
                <div className="w-17.5 sm:w-18.75 h-10 sm:h-11 bg-white rounded-lg flex items-center justify-center shadow-sm px-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    inputMode="numeric"
                    value={subject.grade}
                    onKeyDown={(e) => {
                      if (["-", "+", "e", "E", "."].includes(e.key)) {
                        e.preventDefault();
                      }
                    }}
                    onPaste={(e) => {
                      const paste = e.clipboardData.getData("text");
                      if (!/^\d+$/.test(paste)) {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) =>
                      handleGradeChange(subject.instanceId, e.target.value)
                    }
                    className="w-full text-center text-gray-900 font-bold text-base outline-none bg-transparent"
                  />
                </div>

                {/* Tombol Hapus (Tempat Sampah Merah) */}
                <button
                  type="button"
                  onClick={() => handleRemoveSubject(subject.instanceId)}
                  className="p-1.5 text-[#E93223] hover:opacity-75 active:scale-90 transition-all cursor-pointer shrink-0"
                  title="Hapus"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>

          {/* Opsi Tambah Mata Pelajaran Lainnya (Kembali ke fase pencarian) */}
          {onSubStepChange && (
            <button
              type="button"
              onClick={() => {
                setLocalError("");
                onSubStepChange(1);
              }}
              className="mt-3.5 text-xs text-white/80 hover:text-white flex items-center gap-1 font-semibold transition-colors cursor-pointer"
            >
              + Tambah Mata Pelajaran
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default GradesComponent;
