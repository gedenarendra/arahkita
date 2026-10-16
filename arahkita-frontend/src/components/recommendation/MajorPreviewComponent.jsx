import logoArahkita from "../../assets/Logo.png";
import mathIllustration from "../../assets/math_illustration.png";

const DEFAULT_CAREERS = [
  {
    id: "pengajar",
    title: "Pengajar",
    description:
      "mengajar adalah profesi di bidang pendidikan yang berfokus pada mendidik, mengajar, membimbing, dan mengevaluasi peserta didik baik secara akademis maupun pembentukan karakter",
    workEnvironments: [
      {
        label: "Guru Sekolah Formal",
        description: "PAUD, TK, SD, SMP, hingga SMA/SMK.",
      },
      {
        label: "Dosen",
        description: "Pengajar di tingkat perguruan tinggi.",
      },
      {
        label: "Pengajar Non-Formal",
        description:
          "Guru les privat atau instruktur di lembaga bimbingan belajar (bimbel).",
      },
    ],
  },
  {
    id: "les_matematika",
    title: "les matematika",
    description:
      "profesi instruktur bimbingan belajar atau pembimbing privat yang berfokus pada pendalaman rumus, konsep analitis matematika, dan persiapan ujian kompetitif.",
    workEnvironments: [
      {
        label: "Bimbingan Belajar (Bimbel)",
        description: "Lembaga bimbel persiapan UTBK/Olimpiade.",
      },
      {
        label: "Tutor Privat Mandiri",
        description: "Pendidikan personal 1-on-1 tatap muka atau online.",
      },
      {
        label: "EduTech Content Creator",
        description:
          "Penyusun materi pembelajaran di platform pendidikan digital.",
      },
    ],
  },
  {
    id: "manajemen",
    title: "manajemen",
    description:
      "profesi yang menerapkan logika berpikir sistematis, pemodelan data numerik, dan optimasi operasional dalam memimpin tim serta strategi bisnis.",
    workEnvironments: [
      {
        label: "Korporasi & Startup",
        description: "Product Manager, Business Operations, Project Lead.",
      },
      {
        label: "Konsultan Bisnis",
        description: "Analisis efisiensi biaya dan alur kerja perusahaan.",
      },
      {
        label: "Sektor Perbankan",
        description: "Risk Management & Financial Planning.",
      },
    ],
  },
  {
    id: "analis_data",
    title: "analis data",
    description:
      "profesi yang mengolah kumpulan data mentah menjadi wawasan bermakna dengan statistika, machine learning, dan pemodelan prediktif untuk keputusan bisnis.",
    workEnvironments: [
      {
        label: "Perusahaan Teknologi",
        description: "Data Analyst, Business Intelligence, Data Scientist.",
      },
      {
        label: "Fintech & E-commerce",
        description: "Fraud Detection & Market Trend Analysis.",
      },
      {
        label: "Lembaga Riset",
        description:
          "Survei statistik, riset pasar, dan institusi riset publik.",
      },
    ],
  },
];

/**
 * Komponen 2: Preview / Detail Rekomendasi Jurusan (Sesuai Gambar 2)
 */
function MajorPreviewComponent({
  majorData = null,
  major: propMajor = "Math",
  titleIndo: propTitleIndo = "Matematika (Mathematics)",
  matchPercentage: propMatchPercentage = "87%",
  onBack = () => {},
  onSelectCareer = () => {},
}) {
  const major = majorData?.major_name || majorData?.major || propMajor;
  const titleIndo = majorData?.titleIndo || propTitleIndo || major;
  const matchPercentage =
    majorData?.matching_percentage !== undefined
      ? `${majorData.matching_percentage}%`
      : majorData?.score || majorData?.matchPercentage || propMatchPercentage;
  const statusLabel = majorData?.statusLabel || "Selesai";
  const tagLabel = majorData?.tags?.[0] || major;

  // Ekstrak daftar karir dari preview backend (preview.career_paths)
  const rawCareers =
    majorData?.preview?.career_paths ||
    majorData?.career_paths ||
    majorData?.careers;

  const careersList =
    Array.isArray(rawCareers) && rawCareers.length > 0
      ? rawCareers.map((c) => ({
          id: c.id,
          title: c.title,
          description: c.detail || c.description || "",
          workEnvironments: c.workEnvironments || [
            {
              label: "Sektor Industri",
              description: `Bidang profesi terkait ${major}.`,
            },
          ],
        }))
      : DEFAULT_CAREERS;

  const narrative = majorData?.preview?.preview || null;
  const illustration = majorData?.illustration || mathIllustration;

  return (
    <div className="w-full h-full flex flex-col bg-white font-sans overflow-hidden select-none">
      {/* ── 1. Top Header (Tombol Back Bulat & Logo Arahkita) ── */}
      <header className="shrink-0 flex items-center justify-between px-6 pt-7 pb-2 max-w-md mx-auto w-full">
        {/* Tombol Back Bulat Abu-abu */}
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

        {/* Logo Arahkita di Kanan */}
        <div className="flex items-center">
          <img src={logoArahkita} alt="Arahkita" className="h-7 w-auto" />
          <span className="text-[22px] font-bold text-gray-950 tracking-tight">
            rahkita
          </span>
        </div>
      </header>

      {/* ── 2. Konten Scrollable ── */}
      <div className="flex-1 min-h-0 px-6 pt-1 pb-3 overflow-y-auto max-w-md mx-auto w-full">
        {/* Judul 'Priview' */}
        <h1 className="text-[22px] font-extrabold text-gray-950 tracking-tight mb-3">
          Priview
        </h1>

        {/* Hero Card Navy Blue */}
        <div className="w-full rounded-[22px] bg-[#164173] p-3 sm:p-4 shadow-hero flex items-center overflow-hidden mb-4 relative">
          {/* Ilustrasi Guru / Papan Tulis di Kiri */}
          <div className="w-36 sm:w-40 shrink-0 h-32 flex items-center justify-center overflow-hidden">
            <img
              src={illustration}
              alt={major}
              className="h-full w-full object-contain object-left drop-shadow-sm"
            />
          </div>

          {/* Konten Kanan Card */}
          <div className="flex-1 min-w-0 pl-3">
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              {major}
            </h2>

            {/* Badges: Status (Logis) & Persentase (87%) */}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="bg-[#86efac] text-[#064e3b] text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize">
                {statusLabel}
              </span>
              <span className="bg-white text-gray-950 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                {matchPercentage}
              </span>
            </div>

            <p className="text-[11px] text-blue-200 font-medium mt-1.5">
              kecocokan: {matchPercentage}
            </p>

            {/* Pill Biru Tag Jurusan */}
            <div className="mt-2.5">
              <span className="bg-[#2563eb] text-white text-[11px] font-semibold px-3 py-1 rounded-full inline-block shadow-xs">
                {tagLabel}
              </span>
            </div>
          </div>
        </div>

        {/* ── 3. Box Deskripsi Jurusan ── */}
        <div className="w-full border border-gray-300 rounded-sm p-4 bg-white mb-4 text-left shadow-2xs">
          <h3 className="text-sm sm:text-[15px] font-bold text-gray-950 leading-snug">
            {titleIndo}
          </h3>

          <p className="text-xs sm:text-[13px] font-bold text-gray-900 mt-2.5 mb-2">
            Kecocokan: {matchPercentage}
          </p>

          <div className="space-y-3 text-[11px] sm:text-xs text-gray-700 leading-relaxed font-normal">
            {narrative ? (
              <p className="whitespace-pre-line">{narrative}</p>
            ) : (
              <>
                <p>
                  Mengapa Jurusan Ini Cocok Untukmu? Berdasarkan jawaban dan
                  pilihan yang kamu berikan, kamu menunjukkan pola pikir yang
                  sangat analitis, terstruktur, dan logis. Pendekatan berpikirmu
                  yang objektif ini adalah fondasi utama yang sangat dibutuhkan
                  dalam program studi {major}.
                </p>
                <p>
                  Di jurusan ini, kamu akan mengasah kemampuan problem-solving
                  tingkat lanjut yang membuatmu siap berkarir di berbagai
                  industri modern dan berkembang.
                </p>
              </>
            )}
          </div>
        </div>

        {/* ── 4. Section Karir Path ── */}
        <div className="w-full text-left">
          <h3 className="text-[17px] font-bold text-gray-950 mb-2.5">
            Karir path
          </h3>

          {/* Grid 2x2 Tombol Karir */}
          <div className="grid grid-cols-2 gap-2.5 pb-2">
            {careersList.map((career) => (
              <button
                key={career.id}
                type="button"
                onClick={() => onSelectCareer(career)}
                className="w-full h-10 bg-[#213F73] hover:bg-[#1b3562] active:scale-97 rounded-xl font-bold text-xs sm:text-sm text-white flex items-center justify-center transition-all cursor-pointer shadow-2xs"
              >
                {career.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default MajorPreviewComponent;
