import apiClient from '../lib/apiClient';
import minicaseRepository from '../repositories/minicaseRepository';
import recommendationRepository from '../repositories/recommendationRepository';
import config from '../config/config';

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
 * Memeriksa apakah rantai minicases yang tersimpan di IndexedDB sudah lengkap utuh.
 * Rantai dianggap lengkap jika memiliki setidaknya 2 node dan terdapat node terminal (is_parent === false atau child_id === null).
 */
export function isMinicasesChainComplete(minicases = []) {
  if (!Array.isArray(minicases) || minicases.length < 2) return false;
  return minicases.some((m) => m.is_parent === false || m.child_id === null);
}

/**
 * Men-generate rantai node minicase secara streaming real-time menggunakan Server-Sent Events (SSE).
 * 1. Cache-first: jika minicases sudah tersimpan di IndexedDB dan rantai lengkap, langsung kembalikan cache lokal.
 * 2. Panggil SSE stream POST /api/v1/minicases/generate-stream.
 * 3. Kirim event callback onStatus saat menerima stage & progress.
 * 4. Simpan setiap node ke IndexedDB secara inkremental via minicaseRepository.saveSingleMinicase dan kirim ke onNode.
 * 5. Fallback 1: Jika SSE stream gagal/terputus, otomatis memanggil fallback sinkron POST /api/v1/minicases/generate.
 * 6. Fallback 2: Jika jaringan offline, membaca data lokal dari IndexedDB.
 *
 * @param {object} params
 * @param {string} params.major_id - UUID v4 jurusan induk
 * @param {string} params.major_name - Nama resmi jurusan
 * @param {string} params.circle_color - Hex color lingkaran jurusan
 * @param {object|null} [params.profile] - Profil keminatan siswa (opsional)
 * @param {Function} [params.onStatus] - Callback saat menerima update status berpikir AI
 * @param {Function} [params.onNode] - Callback saat satu node minicase berhasil diterima
 * @param {Function} [params.onDone] - Callback saat stream selesai
 * @param {AbortSignal} [params.signal] - AbortSignal untuk pembatalan request
 * @returns {Promise<{ success: boolean, data: Array, fromCache: boolean, error: string|null }>}
 */
export async function generateMinicasesStream({
  major_id,
  major_name,
  circle_color,
  profile,
  onStatus,
  onNode,
  onDone,
  signal,
}) {
  if (!major_id) {
    return {
      success: false,
      data: [],
      fromCache: false,
      error: 'ID Jurusan tidak valid',
    };
  }

  // 1. Cek cache lokal IndexedDB terlebih dahulu (Cache-First jika rantai lengkap)
  const cached = await minicaseRepository.getMinicasesByMajorId(major_id);
  if (cached && isMinicasesChainComplete(cached)) {
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

  // 3. Ambil data profil jika belum disediakan
  const userProfile = profile || (await recommendationRepository.getUserProfile());

  const payload = {
    major_id: String(major_id),
    major_name: String(major_name || 'Jurusan'),
    circle_color: sanitizeCircleColor(circle_color),
    profile: userProfile || null,
  };

  const baseUrl = config.apiBaseUrl.replace(/\/+$/, '');
  const streamUrl = `${baseUrl}/api/v1/minicases/generate-stream`;

  const receivedNodes = [];
  let streamSucceeded = false;

  try {
    const response = await fetch(streamUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (response.ok && response.body) {
      // Hapus data lama jurusan ini sebelum mulai streaming data baru
      await minicaseRepository.deleteMinicasesByMajorId(major_id);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      const processJsonLine = (jsonStr) => {
        let parsed;
        try {
          parsed = JSON.parse(jsonStr);
          if (!parsed || !parsed.type) return;

          if (parsed.type === 'status' && parsed.data) {
            onStatus?.(parsed.data);
          } else if (parsed.type === 'node' && parsed.data) {
            const node = parsed.data;
            if (!receivedNodes.some((n) => n.id === node.id)) {
              receivedNodes.push(node);
            }
            // Simpan inkremental ke IndexedDB
            minicaseRepository.saveSingleMinicase(node);
            onNode?.(node);
          } else if (parsed.type === 'done') {
            streamSucceeded = true;
            onDone?.(parsed.data);
          } else if (parsed.type === 'error') {
            throw new Error(parsed.data?.message || 'Gagal memproses stream minicases dari backend');
          }
        } catch (err) {
          if (parsed?.type === 'error') throw err;
        }
      };

      while (true) {
        const { done, value } = await reader.read();
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) >= 0) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);

            if (line.startsWith('data:')) {
              processJsonLine(line.slice(5).trim());
            }
          }
        }

        if (done) {
          if (buffer.trim().startsWith('data:')) {
            processJsonLine(buffer.trim().slice(5).trim());
          }
          break;
        }
      }

      if (receivedNodes.length > 0) {
        streamSucceeded = true;
      }
    }
  } catch (streamError) {
    if (streamError.name === 'AbortError') throw streamError;
    console.warn('Minicases SSE Stream kendala, beralih ke sync fallback:', streamError?.message);
  }

  // Jika streaming sukses dan menghasilkan node
  if (streamSucceeded && receivedNodes.length > 0) {
    receivedNodes.sort((a, b) => (a.minicase_number || 0) - (b.minicase_number || 0));
    return {
      success: true,
      data: receivedNodes,
      fromCache: false,
      error: null,
    };
  }

  // ── FALLBACK 1: Endpoint Sinkron POST /api/v1/minicases/generate ──
  try {
    const syncRes = await apiClient.post('/api/v1/minicases/generate', payload);
    if (syncRes.success && Array.isArray(syncRes.data) && syncRes.data.length > 0) {
      await minicaseRepository.saveMinicases(major_id, syncRes.data);
      return {
        success: true,
        data: syncRes.data,
        fromCache: false,
        error: null,
      };
    }
  } catch (syncError) {
    console.warn('Sync minicases fallback kendala:', syncError?.message);
  }

  // ── FALLBACK 2: Membaca cache lokal jika ada ──
  const fallbackCached = await minicaseRepository.getMinicasesByMajorId(major_id);
  if (fallbackCached && fallbackCached.length > 0) {
    return {
      success: true,
      data: fallbackCached,
      fromCache: true,
      error: null,
    };
  }

  return {
    success: false,
    data: [],
    fromCache: false,
    error: 'Gagal men-generate studi kasus interaktif dari server',
  };
}

/**
 * Men-generate atau mengambil minicases untuk sebuah jurusan.
 * Mendelegasikan ke generateMinicasesStream untuk kompatibilitas.
 */
export async function generateMinicases(params) {
  return generateMinicasesStream(params);
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
  generateMinicasesStream,
  generateMinicases,
  isMinicasesChainComplete,
  evaluateEssayAnswer,
  generateMajorPreview,
  sanitizeCircleColor,
};

export default minicaseApi;
