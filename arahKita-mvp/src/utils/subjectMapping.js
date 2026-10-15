/**
 * Mapping constant dan utility untuk normalisasi payload nilai mata pelajaran dinamis ke backend.
 * Sesuai arsitektur terbaru:
 * - Mata pelajaran bersifat dinamis (3 hingga 10 mata pelajaran)
 * - Semua key dinormalisasi menjadi huruf kecil murni (lowercase) tanpa spasi ekstra
 * - Skor bernilai integer antara 0 hingga 100
 */

export const MIN_SUBJECTS_COUNT = 3;
export const MAX_SUBJECTS_COUNT = 10;
export const DEFAULT_GRADE = 80;

/**
 * Normalisasi nama mata pelajaran menjadi key lowercase standar backend.
 *
 * @param {string} rawName
 * @returns {string}
 */
export function normalizeSubjectKey(rawName = "") {
  if (typeof rawName !== "string") return "";
  return rawName.trim().toLowerCase();
}

/**
 * Memvalidasi apakah jumlah mata pelajaran memenuhi kriteria (minimal 3, maksimal 10).
 *
 * @param {Array<any> | Record<string, any>} subjects
 * @returns {{ isValid: boolean, error: string | null }}
 */
export function validateSubjectsCount(subjects) {
  const count = Array.isArray(subjects)
    ? subjects.length
    : subjects && typeof subjects === "object"
      ? Object.keys(subjects).length
      : 0;

  if (count < MIN_SUBJECTS_COUNT) {
    return {
      isValid: false,
      error: `Silakan tambahkan minimal ${MIN_SUBJECTS_COUNT} mata pelajaran terlebih dahulu.`,
    };
  }

  if (count > MAX_SUBJECTS_COUNT) {
    return {
      isValid: false,
      error: `Maksimal hanya dapat memilih ${MAX_SUBJECTS_COUNT} mata pelajaran.`,
    };
  }

  return { isValid: true, error: null };
}

/**
 * Menghasilkan dictionary nilai mata pelajaran dinamis yang selalu valid sesuai skema backend:
 * {
 *   "fisika": 85,
 *   "kimia": 80,
 *   "matematika": 90
 * }
 *
 * @param {Array<{ name: string, grade: number|string }> | Record<string, number|string>} input
 * @param {number} defaultGrade - Nilai default jika skor belum diisi (default: 80)
 * @returns {Record<string, number>}
 */
export function mapSubjectsToBackendPayload(
  input,
  defaultGrade = DEFAULT_GRADE
) {
  const payload = {};

  const parseGrade = (val) => {
    if (val === "" || val === undefined || val === null) return defaultGrade;
    const num = Number(val);
    if (isNaN(num)) return defaultGrade;
    return Math.min(100, Math.max(0, Math.round(num)));
  };

  // Jika input berupa Array (dari state UI selectedSubjects)
  if (Array.isArray(input)) {
    input.forEach((item) => {
      const cleanKey = normalizeSubjectKey(item?.name);
      if (cleanKey) {
        payload[cleanKey] = parseGrade(item.grade);
      }
    });
    return payload;
  }

  // Jika input berupa Objek key-value
  if (input && typeof input === "object") {
    Object.entries(input).forEach(([key, val]) => {
      const cleanKey = normalizeSubjectKey(key);
      if (cleanKey) {
        payload[cleanKey] = parseGrade(val);
      }
    });
  }

  return payload;
}

export default {
  MIN_SUBJECTS_COUNT,
  MAX_SUBJECTS_COUNT,
  DEFAULT_GRADE,
  normalizeSubjectKey,
  validateSubjectsCount,
  mapSubjectsToBackendPayload,
};
