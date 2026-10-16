/**
 * Utility untuk Pengelolaan Data Minat (Interests)
 */

export const MAX_INTERESTS_COUNT = 5;

/**
 * Memformat array minat menjadi string yang dipisahkan koma untuk payload backend.
 * Contoh hasil: "bisnis dan keuangan, informatika"
 *
 * @param {Array<string|{name: string}>} interests - Daftar minat yang dipilih
 * @param {number} max - Batas maksimal jumlah minat (default: 5)
 * @returns {string} String minat dalam huruf kecil dipisahkan koma dan spasi
 */
export function formatInterestsForBackend(
  interests = [],
  max = MAX_INTERESTS_COUNT,
) {
  if (!Array.isArray(interests)) return "";

  return interests
    .slice(0, max)
    .map((item) => {
      const text = typeof item === "string" ? item : item?.name || "";
      return text.trim().toLowerCase();
    })
    .filter(Boolean)
    .join(", ");
}
