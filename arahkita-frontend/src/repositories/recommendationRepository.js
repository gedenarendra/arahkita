import db from '../lib/dexie';

export const recommendationRepository = {
  /**
   * Menyimpan daftar MajorRecommendationResult ke IndexedDB.
   * Selalu membersihkan hasil lama agar tidak terjadi duplikasi.
   *
   * @param {Array<object>} results
   */
  async saveResults(results = []) {
    if (!Array.isArray(results) || results.length === 0) return [];
    await db.recommendationResults.clear();
    await db.recommendationResults.bulkPut(results);
    return results;
  },

  /**
   * Mengambil semua data MajorRecommendationResult dari IndexedDB.
   */
  async getAllResults() {
    return db.recommendationResults.toArray();
  },

  /**
   * Menyimpan profil minat dan nilai siswa dari onboarding ke IndexedDB dan localStorage.
   *
   * @param {{ minat: string, nilai: Record<string, number> }} profile
   */
  async saveUserProfile(profile) {
    if (!profile) return null;
    const record = {
      id: 'current_user',
      minat: profile.minat || '',
      nilai: profile.nilai || {},
      updatedAt: new Date().toISOString(),
    };
    try {
      await db.userProfile.put(record);
    } catch {
      // Fallback diam jika IndexedDB terkendala
    }
    try {
      localStorage.setItem('user_profile_data', JSON.stringify(record));
    } catch {
      // Fallback
    }
    return record;
  },

  /**
   * Mengambil profil minat dan nilai siswa dari IndexedDB atau fallback localStorage.
   */
  async getUserProfile() {
    try {
      const fromDb = await db.userProfile.get('current_user');
      if (fromDb?.nilai) {
        return {
          minat: fromDb.minat,
          nilai: fromDb.nilai,
        };
      }
    } catch {
      // Abaikan dan lanjut ke localStorage
    }

    try {
      const raw = localStorage.getItem('user_profile_data');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.nilai) {
          return {
            minat: parsed.minat,
            nilai: parsed.nilai,
          };
        }
      }
    } catch {
      // Abaikan
    }

    return null;
  },

  /**
   * Mengambil daftar seluruh preview evaluasi trial dari IndexedDB.
   */
  async getAllPreviews() {
    try {
      return await db.previews.toArray();
    } catch {
      return [];
    }
  },

  /**
   * Mengambil preview evaluasi trial untuk suatu jurusan spesifik.
   *
   * @param {string} majorId
   * @returns {Promise<object|null>}
   */
  async getPreviewByMajorId(majorId) {
    if (!majorId) return null;
    try {
      return (await db.previews.where('major_node_id').equals(String(majorId)).first()) || null;
    } catch {
      return null;
    }
  },

  /**
   * Menyimpan hasil evaluasi preview jurusan ke IndexedDB.
   */
  async savePreview(preview) {
    if (!preview?.id) return null;
    await db.previews.put(preview);
    return preview;
  },
};

export default recommendationRepository;
