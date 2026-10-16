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

  /**
   * Menyimpan daftar knowledge cluster ke IndexedDB.
   */
  async saveClusters(clusters = []) {
    if (!Array.isArray(clusters) || clusters.length === 0) return [];
    await db.clusters.clear();
    await db.clusters.bulkPut(clusters);
    return clusters;
  },

  /**
   * Mengambil semua data knowledge cluster dari IndexedDB.
   */
  async getAllClusters() {
    return db.clusters.toArray();
  },

  /**
   * Menghapus seluruh data knowledge cluster yang tersimpan di IndexedDB.
   */
  async clearClusters() {
    return db.clusters.clear();
  },

  /**
   * Menyimpan batch Knowledge Clusters dan Major Nodes secara atomik.
   * Membersihkan batch lama sebelum menyimpan data baru.
   */
  async saveClustersAndMajors({ clusters = [], majors = [] }) {
    await db.transaction('rw', [db.clusters, db.majorNodes], async () => {
      await db.clusters.clear();
      await db.majorNodes.clear();

      if (Array.isArray(clusters) && clusters.length > 0) {
        await db.clusters.bulkPut(clusters);
      }
      if (Array.isArray(majors) && majors.length > 0) {
        await db.majorNodes.bulkPut(majors);
      }
    });

    return { clusters, majors };
  },

  /**
   * Mengambil seluruh data clusters dan majors dari IndexedDB.
   */
  async getAllClustersAndMajors() {
    const [clusters, majors] = await Promise.all([
      db.clusters.toArray(),
      db.majorNodes.toArray(),
    ]);

    return {
      clusters: clusters || [],
      majors: majors || [],
    };
  },
};

export default majorRepository;
