import logoArahkita from "../../assets/Logo.png";
import mathIllustration from "../../assets/math_illustration.png";

// Helper untuk mengekstrak angka numerik persentase
const parseScoreToNumber = (val) => {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return val;
  const num = parseFloat(String(val).replace(/[^0-9.-]/g, ""));
  return isNaN(num) ? 0 : num;
};

// Data Rekomendasi Default jika props belum disediakan
const DEFAULT_RECOMMENDATION_ITEMS = [
  {
    id: "math",
    major: "Math",
    titleIndo: "Matematika (Mathematics)",
    score: "98%",
    cardScore: "98%",
    matching_percentage: 98,
    is_completed: true,
    testProgress: 100,
    statusLabel: "Selesai",
    statusVariant: "success",
    tags: ["Matematika", "Pendidikan"],
    illustration: mathIllustration,
  },
  {
    id: "teknologi",
    major: "Teknologi",
    titleIndo: "Teknologi Informasi (Information Technology)",
    score: "87%",
    cardScore: "87%",
    matching_percentage: 87,
    is_completed: true,
    testProgress: 55,
    statusLabel: "Selesai",
    statusVariant: "success",
    tags: ["Teknologi", "Informatika"],
    illustration: mathIllustration,
  },
];

/**
 * Komponen Donut Progress Penyelesaian Jurusan:
 * - 100% (Selesai): Warna hijau & bundaran penuh
 * - >0% dan <100% (Sebagian): Warna orange & bundaran sebagian
 * - 0% (Belum selesai): Abu-abu penuh
 */
function ProgressDonut({ progress = 0 }) {
  const normalized = Math.min(100, Math.max(0, Number(progress) || 0));
  const isComplete = normalized >= 100;
  const isStarted = normalized > 0;

  const radius = 14;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalized / 100) * circumference;

  let strokeColor = "#9ca3af";
  if (isComplete) {
    strokeColor = "#48bb78";
  } else if (isStarted) {
    strokeColor = "#f59e0b";
  }

  return (
    <div
      className="relative w-9 h-9 shrink-0 flex items-center justify-center"
      title={`Progress: ${normalized}%`}
    >
      <svg className="w-9 h-9 transform -rotate-90" viewBox="0 0 36 36">
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="#d5d5d5"
          stroke="#b5b5b5"
          strokeWidth="3.8"
        />
        {isStarted && (
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth="3.8"
            strokeDasharray={circumference}
            strokeDashoffset={isComplete ? 0 : strokeDashoffset}
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
}

/**
 * Normalisasi satu objek hasil rekomendasi (dari backend MajorRecommendationResult atau props lokal)
 */
function normalizeItem(raw) {
  const majorName = raw.major_name || raw.major || "Jurusan";
  const percentage =
    raw.matching_percentage !== undefined
      ? Number(raw.matching_percentage) || 0
      : parseScoreToNumber(raw.score ?? raw.cardScore ?? 0);

  const isCompleted = Boolean(raw.is_completed);

  // Status label & variant
  let statusLabel = raw.statusLabel;
  let statusVariant = raw.statusVariant;

  if (!statusLabel) {
    if (!isCompleted) {
      statusLabel = "Belum Dikerjakan";
      statusVariant = "neutral";
    } else {
      statusLabel = "Selesai";
      statusVariant = "success";
    }
  }

  // Tags: extract dari subject_relevances jika ada
  let tags = [];
  if (
    Array.isArray(raw.subject_relevances) &&
    raw.subject_relevances.length > 0
  ) {
    tags = raw.subject_relevances
      .map((sr) => sr?.subject_name || sr?.name || String(sr))
      .filter(Boolean);
  } else if (Array.isArray(raw.tags)) {
    tags = raw.tags;
  }

  return {
    ...raw,
    id: raw.id || majorName,
    major: majorName,
    major_name: majorName,
    matching_percentage: percentage,
    score: `${percentage}%`,
    cardScore: `${percentage}%`,
    testProgress: isCompleted ? 100 : 0,
    is_completed: isCompleted,
    statusLabel,
    statusVariant,
    tags,
    preview: raw.preview || null,
    illustration: raw.illustration || mathIllustration,
  };
}

/**
 * Komponen 1: Halaman Ringkasan Hasil Rekomendasi
 */
function RecommendationSummaryComponent({
  recommendations = DEFAULT_RECOMMENDATION_ITEMS,
  topRecommendation,
  onSelectMajor = () => {},
}) {
  const rawList =
    Array.isArray(recommendations) && recommendations.length > 0
      ? recommendations
      : DEFAULT_RECOMMENDATION_ITEMS;

  const items = rawList.map(normalizeItem);

  // Cari jurusan dengan persentase tertinggi yang SUDAH selesai
  const completedItems = items.filter((item) => item.is_completed);
  const highestCompleted =
    completedItems.length > 0
      ? completedItems.reduce(
          (highest, curr) =>
            curr.matching_percentage > highest.matching_percentage
              ? curr
              : highest,
          completedItems[0],
        )
      : null;

  // Jika ada rekomendasi yang sudah selesai, tampilkan persentase tertinggi.
  // Jika belum ada yang selesai sama sekali, tampilkan 0% sesuai kesepakatan.
  const hasCompleted = Boolean(highestCompleted);
  const top = topRecommendation
    ? normalizeItem(topRecommendation)
    : highestCompleted;

  const topNumeric = hasCompleted && top ? top.matching_percentage : 0;
  const topFormattedScore = `${topNumeric}%`;
  const topLabel = hasCompleted && top ? top.major : "Belum Ada Hasil";

  // SVG Gauge besar lingkaran keliling (Radius 48, keliling ≈ 301.59)
  const topRadius = 48;
  const topCircumference = 2 * Math.PI * topRadius;
  const topDashoffset =
    topCircumference -
    (Math.min(100, Math.max(0, topNumeric)) / 100) * topCircumference;

  return (
    <div className="w-full h-full flex flex-col bg-white font-sans overflow-hidden select-none">
      {/* ── 1. Top Header (Judul 'Hasil Rekomendasi' & Logo Arahkita) ── */}
      <header className="shrink-0 flex items-center justify-between px-6 pt-7 pb-2 max-w-md mx-auto w-full">
        <h1 className="text-[22px] font-extrabold text-gray-950 tracking-tight">
          Hasil Rekomendasi
        </h1>

        <div className="flex items-center">
          <img src={logoArahkita} alt="Arahkita" className="h-7 w-auto" />
          <span className="text-[22px] font-bold text-gray-950 tracking-tight">
            rahkita
          </span>
        </div>
      </header>

      {/* ── 2. Lingkaran Gauge Besar: Persentase Terbesar (Fixed / Non-scrollable) ── */}
      <div className="shrink-0 my-4 relative flex items-center justify-center max-w-md mx-auto w-full px-6">
        <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 120 120">
          <circle
            cx="60"
            cy="60"
            r={topRadius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="9"
          />
          {topNumeric > 0 && (
            <circle
              cx="60"
              cy="60"
              r={topRadius}
              fill="none"
              stroke="#3B82F6"
              strokeWidth="9"
              strokeDasharray={topCircumference}
              strokeDashoffset={topDashoffset}
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Teks di Tengah Lingkaran */}
        <div className="absolute inset-0 flex flex-col items-center justify-center select-none text-center px-4">
          <span className="text-4xl font-extrabold text-gray-950 tracking-tight leading-none">
            {topFormattedScore}
          </span>
          <span className="text-xs sm:text-sm font-semibold text-gray-800 mt-1 truncate max-w-32">
            {topLabel}
          </span>
        </div>
      </div>

      {/* ── 3. Daftar Card Jurusan (Scrollable Area) ── */}
      <div className="flex-1 min-h-0 px-6 pt-1 pb-3 overflow-y-auto max-w-md mx-auto w-full scrollbar-thin">
        <div className="w-full space-y-4 pb-2">
          {items.map((item, index) => {
            const isClickable = item.is_completed;
            const currentProgress = item.testProgress;
            const displayedScore = item.cardScore;

            return (
              <div
                key={item.id || index}
                onClick={isClickable ? () => onSelectMajor(item) : undefined}
                className={`w-full bg-[#d9d9d9] rounded-3xl p-3 shadow-md flex items-center overflow-hidden transition-all ${
                  isClickable
                    ? "hover:shadow-lg active:scale-98 cursor-pointer"
                    : "opacity-75 cursor-not-allowed"
                }`}
                title={
                  isClickable
                    ? `Lihat detail hasil ${item.major}`
                    : "Jurusan belum dikerjakan. Selesaikan tantangan di Beranda terlebih dahulu."
                }
              >
                {/* Gambar Ilustrasi di Kiri */}
                <div className="w-34 sm:w-36 shrink-0 h-28 flex items-center justify-center overflow-hidden">
                  <img
                    src={item.illustration}
                    alt={item.major}
                    className="h-full w-full object-contain object-left drop-shadow-xs"
                  />
                </div>

                {/* Konten Kanan */}
                <div className="flex-1 min-w-0 pl-2">
                  <h2 className="text-[19px] font-extrabold text-gray-950 tracking-tight leading-tight truncate">
                    {item.major}
                  </h2>

                  {/* Donut Gauge Progress Penyelesaian Jurusan + Skor */}
                  <div className="flex items-center gap-2 mt-1 mb-1.5">
                    <ProgressDonut progress={currentProgress} />

                    <div className="bg-white px-2.5 py-0.5 rounded-full shadow-xs">
                      <span className="text-xs font-extrabold text-gray-950">
                        {displayedScore}
                      </span>
                    </div>
                  </div>

                  {/* Badge Status (Selesai / Belum Dikerjakan) */}
                  <div className="mb-2">
                    <div
                      className={`w-full py-0.5 rounded-full text-center text-xs font-bold text-white shadow-xs ${
                        item.statusVariant === "neutral"
                          ? "bg-[#64748B]"
                          : item.statusVariant === "danger"
                            ? "bg-[#EF4444]"
                            : "bg-[#10B981]"
                      }`}
                    >
                      {item.statusLabel}
                    </div>
                  </div>

                  {/* Tag Pills Relevansi Mata Pelajaran */}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="bg-[#1d3d63] text-white text-[10px] sm:text-[11px] font-semibold px-2.5 py-0.5 rounded-full shadow-xs capitalize"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RecommendationSummaryComponent;
