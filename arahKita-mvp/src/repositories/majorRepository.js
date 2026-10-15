import db from '../lib/dexie';

export const majorRepository = {
  /**
   * Menyimpan daftar rekomendasi jurusan (MajorNode[]) ke IndexedDB.
   * Menggunakan bulkPut agar data dengan id yang sama diperbarui.
   */
  async saveMajors(majors = []) {
    if (!Array.isArray(majors) || majors.length === 0) return [];
    await db.majorNodes.clear();
    await db.majorNodes.bulkPut(majors);
    return majors;
  },

  /**
   * Mengambil semua data rekomendasi jurusan dari IndexedDB.
   */
  async getAllMajors() {
    return db.majorNodes.toArray();
  },

  /**
   * Menghapus seluruh data jurusan yang tersimpan di IndexedDB.
   */
  async clearMajors() {
    return db.majorNodes.clear();
  },
};

export default majorRepository;
