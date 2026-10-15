import db from '../lib/dexie';

export const minicaseRepository = {
  /**
   * Mengambil seluruh minicases untuk suatu jurusan berdasarkan majorId (parent_id),
   * diurutkan berdasarkan minicase_number.
   *
   * @param {string} majorId
   * @returns {Promise<Array<object>>}
   */
  async getMinicasesByMajorId(majorId) {
    if (!majorId) return [];
    try {
      return await db.minicases
        .where('parent_id')
        .equals(String(majorId))
        .sortBy('minicase_number');
    } catch {
      return [];
    }
  },

  /**
   * Menyimpan daftar minicase ke IndexedDB untuk suatu jurusan.
   * Membersihkan data lama jurusan tersebut terlebih dahulu agar tidak menumpuk.
   *
   * @param {string} majorId
   * @param {Array<object>} minicases
   * @returns {Promise<Array<object>>}
   */
  async saveMinicases(majorId, minicases = []) {
    if (!majorId || !Array.isArray(minicases) || minicases.length === 0) return [];
    try {
      // Hapus minicases lama milik major_id ini
      await db.minicases.where('parent_id').equals(String(majorId)).delete();
      await db.minicases.bulkPut(minicases);
      return minicases;
    } catch {
      return minicases;
    }
  },

  /**
   * Mengambil data satu minicase berdasarkan ID.
   *
   * @param {string} id
   * @returns {Promise<object|null>}
   */
  async getMinicaseById(id) {
    if (!id) return null;
    try {
      return (await db.minicases.get(String(id))) || null;
    } catch {
      return null;
    }
  },

  /**
   * Menyimpan jawaban pilihan ganda (MCQ) ke IndexedDB dengan evaluasi lokal instan.
   *
   * @param {string} minicaseId
   * @param {number|string} selectedOption - Index opsi (0..3) atau nilai opsi
   * @param {string} [correctAnswer] - Kunci jawaban dari backend
   * @returns {Promise<{ isCorrect: boolean }>}
   */
  async submitMultipleChoiceAnswer(minicaseId, selectedOption, correctAnswer) {
    if (!minicaseId) return { isCorrect: false };

    const node = await db.minicases.get(String(minicaseId));
    const targetCorrect = correctAnswer !== undefined ? correctAnswer : node?.correct_answer;

    const selectedText =
      Array.isArray(node?.options) && typeof selectedOption === 'number'
        ? node.options[selectedOption]
        : selectedOption;

    const isCorrect =
      selectedOption === targetCorrect ||
      selectedText === targetCorrect ||
      (typeof targetCorrect === 'string' &&
        typeof selectedText === 'string' &&
        selectedText.trim().toLowerCase() === targetCorrect.trim().toLowerCase());

    await db.minicases.update(String(minicaseId), {
      user_answer: selectedOption,
      user_answer_text: selectedText,
      is_correct: Boolean(isCorrect),
      is_done: true,
      updated_at: new Date().toISOString(),
    });

    return { isCorrect: Boolean(isCorrect) };
  },

  /**
   * Menyimpan jawaban esai beserta skor analitis dan sinyal minat dari AI ke IndexedDB.
   *
   * @param {string} minicaseId
   * @param {string} userText
   * @param {{ analytical_fit: number, interest_signal: number, is_serious_attempt?: boolean }} evalResult
   */
  async submitEssayAnswer(minicaseId, userText, evalResult = {}) {
    if (!minicaseId) return;

    await db.minicases.update(String(minicaseId), {
      user_answer: String(userText || '').trim(),
      analytical_fit: Number(evalResult.analytical_fit) || 3,
      interest_signal: Number(evalResult.interest_signal) || 3,
      is_serious_attempt: evalResult.is_serious_attempt !== undefined ? Boolean(evalResult.is_serious_attempt) : true,
      is_done: true,
      updated_at: new Date().toISOString(),
    });
  },

  /**
   * Menghitung rekap performa metrik seluruh minicase yang telah diselesaikan untuk suatu jurusan.
   *
   * @param {string} majorId
   * @returns {Promise<{ mcq_accuracy: number, essay_analytical_score: number, essay_interest_score: number, total_trials_completed: number, total_nodes: number }>}
   */
  async calculateMajorMetrics(majorId) {
    if (!majorId) {
      return {
        mcq_accuracy: 0,
        essay_analytical_score: 3.0,
        essay_interest_score: 3.0,
        total_trials_completed: 0,
        total_nodes: 0,
      };
    }

    try {
      const nodes = await db.minicases
        .where('parent_id')
        .equals(String(majorId))
        .toArray();

      const completedNodes = nodes.filter((n) => n.is_done === true);
      const mcqNodes = completedNodes.filter((n) => n.node_type === 'multiple_choice');
      const essayNodes = completedNodes.filter((n) => n.node_type === 'essay');

      // 1. Akurasi MCQ (0 - 100%)
      const correctCount = mcqNodes.filter((n) => n.is_correct === true).length;
      const mcqAccuracy = mcqNodes.length > 0 ? (correctCount / mcqNodes.length) * 100 : 0;

      // 2. Rata-rata Skor Kemampuan Analitis Esai (skala 1.0 - 5.0)
      const totalAnalytical = essayNodes.reduce(
        (sum, n) => sum + (Number(n.analytical_fit) || 3),
        0
      );
      const avgAnalytical = essayNodes.length > 0 ? totalAnalytical / essayNodes.length : 3.0;

      // 3. Rata-rata Sinyal Minat Esai (skala 1.0 - 5.0)
      const totalInterest = essayNodes.reduce(
        (sum, n) => sum + (Number(n.interest_signal) || 3),
        0
      );
      const avgInterest = essayNodes.length > 0 ? totalInterest / essayNodes.length : 3.0;

      return {
        mcq_accuracy: Number(mcqAccuracy.toFixed(1)),
        essay_analytical_score: Number(avgAnalytical.toFixed(2)),
        essay_interest_score: Number(avgInterest.toFixed(2)),
        total_trials_completed: completedNodes.length,
        total_nodes: nodes.length,
      };
    } catch {
      return {
        mcq_accuracy: 0,
        essay_analytical_score: 3.0,
        essay_interest_score: 3.0,
        total_trials_completed: 0,
        total_nodes: 0,
      };
    }
  },

  /**
   * Memperbarui status selesai suatu minicase (is_done: true).
   *
   * @param {string} id
   * @param {boolean} isDone
   */
  async updateMinicaseDone(id, isDone = true) {
    if (!id) return;
    try {
      await db.minicases.update(String(id), { is_done: isDone });
    } catch {
      // Abaikan jika gagal update offline
    }
  },

  /**
   * Menghapus seluruh minicases dari IndexedDB.
   */
  async clearAllMinicases() {
    try {
      await db.minicases.clear();
    } catch {
      // Fallback
    }
  },
};

export default minicaseRepository;
