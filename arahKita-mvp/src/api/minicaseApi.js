import apiClient from '../lib/apiClient';
import minicaseRepository from '../repositories/minicaseRepository';
import recommendationRepository from '../repositories/recommendationRepository';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const HEX_COLOR_REGEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Memastikan circle_color berupa format hex yang sah (#RGB atau #RRGGBB).
 */
export function sanitizeCircleColor(color) {
  if (typeof color === 'string' && HEX_COLOR_REGEX.test(color.trim())) {
    return color.trim();
  }
  return '#4F46E5';
}

/**
 * Men-generate atau mengambil minicases untuk sebuah jurusan dengan strategi cache-first.
 * 1. Periksa apakah sudah tersimpan di IndexedDB (Dexie).
 * 2. Jika ada, langsung kembalikan cache lokal (fromCache: true).
 * 3. Jika belum ada, panggil POST /api/v1/minicases/generate ke backend.
 * 4. Simpan hasil response ke IndexedDB untuk penggunaan offline selanjutnya.
 *
 * @param {object} params
 * @param {string} params.major_id - UUID v4 jurusan induk
 * @param {string} params.major_name - Nama resmi jurusan kuliah
 * @param {string} params.circle_color - Hex color lingkaran jurusan
 * @param {object|null} [params.profile] - Profil keminatan siswa (opsional)
 * @returns {Promise<{ success: boolean, data: Array, fromCache: boolean, error: string|null }>}
 */
export async function generateMinicases({
  major_id,
  major_name,
  circle_color,
  profile,
}) {
  if (!major_id) {
    return {
      success: false,
      data: [],
      fromCache: false,
      error: 'ID Jurusan tidak valid',
    };
  }

  // 1. Cek cache lokal IndexedDB terlebih dahulu
  const cached = await minicaseRepository.getMinicasesByMajorId(major_id);
  if (cached && cached.length > 0) {
    return {
      success: true,
      data: cached,
      fromCache: true,
      error: null,
    };
  }

  // 2. Validasi UUID sebelum dikirim ke backend guna mencegah error 422
  if (!UUID_REGEX.test(String(major_id))) {
    return {
      success: false,
      data: [],
      fromCache: false,
      error: 'ID Jurusan bukan format UUID v4 yang valid',
    };
  }

  // 3. Ambil data profil jika belum disediakan pemanggil
  const userProfile = profile || (await recommendationRepository.getUserProfile());

  const payload = {
    major_id: String(major_id),
    major_name: String(major_name || 'Jurusan'),
    circle_color: sanitizeCircleColor(circle_color),
    profile: userProfile || null,
  };

  const response = await apiClient.post('/api/v1/minicases/generate', payload);

  if (response.success && Array.isArray(response.data) && response.data.length > 0) {
    await minicaseRepository.saveMinicases(major_id, response.data);

    return {
      success: true,
      data: response.data,
      fromCache: false,
      error: null,
    };
  }

  return {
    success: false,
    data: [],
    fromCache: false,
    error: response.error || 'Gagal men-generate studi kasus interaktif dari server',
  };
}

/**
 * Mengirimkan jawaban esai siswa ke backend (POST /api/v1/minicases/evaluate-essay).
 * Backend mengevaluasi kualitas analitis, sinyal minat, dan keseriusan jawaban.
 *
 * @param {object} params
 * @param {string} params.question - Pertanyaan esai
 * @param {string} params.evaluation_hint - Pedoman kriteria penilaian
 * @param {string} params.user_answer - Teks jawaban siswa
 * @param {string} [params.minicase_id] - UUID minicase
 * @returns {Promise<{ success: boolean, data: object|null, error: string|null }>}
 */
export async function evaluateEssayAnswer({
  question,
  evaluation_hint,
  user_answer,
  minicase_id,
}) {
  const trimmedAnswer = String(user_answer || '').trim();
  if (!trimmedAnswer) {
    return {
      success: false,
      data: null,
      error: 'Jawaban esai tidak boleh kosong.',
    };
  }

  const payload = {
    question: String(question || 'Pertanyaan studi kasus'),
    evaluation_hint: String(evaluation_hint || 'Kriteria analitis dan minat'),
    user_answer: trimmedAnswer,
    minicase_id: minicase_id && UUID_REGEX.test(String(minicase_id)) ? String(minicase_id) : null,
  };

  const response = await apiClient.post('/api/v1/minicases/evaluate-essay', payload);

  if (response.success && response.data) {
    if (minicase_id) {
      await minicaseRepository.submitEssayAnswer(minicase_id, trimmedAnswer, response.data);
    }

    return {
      success: true,
      data: response.data,
      error: null,
    };
  }

  return {
    success: false,
    data: null,
    error: response.error || 'Gagal mengevaluasi esai dari server.',
  };
}

/**
 * Mengirimkan metrik pengerjaan siswa ke backend (POST /api/v1/preview/{major_node_id}).
 * Backend menghitung matching_percentage, narasi preview, dan jalur karir.
 *
 * @param {object} major - Objek jurusan { id, major_name }
 * @param {object} [options]
 * @param {boolean} [options.forceRefresh=false] - Paksa request baru ke server mengabaikan cache
 * @returns {Promise<{ success: boolean, data: object|null, fromCache: boolean, error: string|null }>}
 */
export async function generateMajorPreview(major, { forceRefresh = false } = {}) {
  if (!major?.id) {
    return {
      success: false,
      data: null,
      fromCache: false,
      error: 'ID Jurusan wajib disertakan',
    };
  }

  // 1. Cek apakah preview untuk jurusan ini sudah tersimpan di IndexedDB
  if (!forceRefresh) {
    const cachedPreview = await recommendationRepository.getPreviewByMajorId(major.id);
    if (cachedPreview) {
      return {
        success: true,
        data: cachedPreview,
        fromCache: true,
        error: null,
      };
    }
  }

  // 2. Validasi format UUID v4 sebelum request jaringan
  if (!UUID_REGEX.test(String(major.id))) {
    return {
      success: false,
      data: null,
      fromCache: false,
      error: 'ID Jurusan bukan format UUID v4 yang valid',
    };
  }

  // 3. Ambil metrik performa lokal dari IndexedDB
  const metrics = await minicaseRepository.calculateMajorMetrics(major.id);
  const userProfile = await recommendationRepository.getUserProfile();

  const payload = {
    major_name: String(major.major_name || 'Jurusan'),
    mcq_accuracy: metrics.mcq_accuracy,
    essay_analytical_score: metrics.essay_analytical_score,
    essay_interest_score: metrics.essay_interest_score,
    total_trials_completed: metrics.total_trials_completed,
    user_satisfaction_rating: null,
    profile: userProfile || null,
  };

  // 4. Panggil endpoint backend POST /api/v1/preview/{major_node_id}
  const response = await apiClient.post(`/api/v1/preview/${major.id}`, payload);

  if (response.success && response.data) {
    await recommendationRepository.savePreview({
      ...response.data,
      major_node_id: major.id,
    });

    return {
      success: true,
      data: response.data,
      fromCache: false,
      error: null,
    };
  }

  return {
    success: false,
    data: null,
    fromCache: false,
    error: response.error || 'Gagal men-generate preview jurusan dari server.',
  };
}

export const minicaseApi = {
  generateMinicases,
  evaluateEssayAnswer,
  generateMajorPreview,
  sanitizeCircleColor,
};

export default minicaseApi;
