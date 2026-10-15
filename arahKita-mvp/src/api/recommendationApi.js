import apiClient from '../lib/apiClient';
import majorRepository from '../repositories/majorRepository';
import recommendationRepository from '../repositories/recommendationRepository';

const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

/**
 * Memfilter array node agar hanya menyertakan node dengan UUID v4 yang valid,
 * guna mencegah HTTP 422 jika terdapat id mockup lokal seperti "n1" atau "demo-1".
 *
 * @param {Array<object>} nodes
 * @returns {Array<{ id: string, major_name: string, circle_color: string, child_id: string|null }>}
 */
export function sanitizeMajorNodesForBackend(nodes = []) {
  if (!Array.isArray(nodes)) return [];

  return nodes
    .filter((n) => n?.id && UUID_REGEX.test(String(n.id)))
    .map((n) => ({
      id: String(n.id),
      major_name: String(n.major_name || n.label || ''),
      circle_color: String(n.circle_color || n.color || '#4F46E5'),
      child_id: n.child_id ? String(n.child_id) : null,
    }));
}

/**
 * Melakukan fetch POST /api/v1/recommendation-results dengan strategi offline-first.
 * 1. Mengambil major_nodes tersimpan di IndexedDB.
 * 2. Mengambil previews trial dan profil keminatan siswa.
 * 3. Memanggil backend API.
 * 4. Jika sukses, simpan hasil leaderboard ke IndexedDB (recommendationResults).
 * 5. Jika gagal / offline, otomatis membaca dari IndexedDB lokal.
 *
 * @returns {Promise<{ success: boolean, data: Array, fromCache: boolean, error: string|null }>}
 */
export async function fetchRecommendationResults() {
  const localMajors = await majorRepository.getAllMajors();
  const validMajorNodes = sanitizeMajorNodesForBackend(localMajors);

  const previews = await recommendationRepository.getAllPreviews();
  const profile = await recommendationRepository.getUserProfile();

  const payload = {
    major_nodes: validMajorNodes,
    previews: Array.isArray(previews) ? previews : [],
    profile: profile || null,
  };

  const response = await apiClient.post('/api/v1/recommendation-results', payload);

  if (response.success && Array.isArray(response.data)) {
    await recommendationRepository.saveResults(response.data);

    return {
      success: true,
      data: response.data,
      fromCache: false,
      error: null,
    };
  }

  // Fallback offline-first: Ambil data dari IndexedDB jika jaringan gagal/offline
  const cached = await recommendationRepository.getAllResults();
  if (cached && cached.length > 0) {
    return {
      success: true,
      data: cached,
      fromCache: true,
      error: null,
    };
  }

  return {
    success: false,
    data: [],
    fromCache: false,
    error: response.error || 'Gagal memuat hasil rekomendasi jurusan',
  };
}

/**
 * Mengambil hasil rekomendasi jurusan yang tersimpan di cache IndexedDB.
 */
export async function getCachedRecommendationResults() {
  const cached = await recommendationRepository.getAllResults();
  return {
    data: cached || [],
  };
}

export const recommendationApi = {
  fetchRecommendationResults,
  getCachedRecommendationResults,
  sanitizeMajorNodesForBackend,
};

export default recommendationApi;
