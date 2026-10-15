/**
 * Ikon Navigasi Aplikasi Sesuai Mockup Desain:
 * 1. RecommendationNavIcon: Bola solid dengan lengkungan pantulan cahaya (arc highlight)
 * 2. HomeNavIcon: Dokumen/kartu solid dengan dua garis cut-out horizontal
 * 3. ProfileNavIcon: Siluet avatar solid (kepala lingkaran + bahu melengkung)
 */

export function RecommendationNavIcon({
  className = "w-6 h-6",
  cutoutColor = "#d9d9d9",
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="9.6" />
      <path
        d="M6.2 10.5A6.2 6.2 0 0 1 10.5 6.2"
        fill="none"
        stroke={cutoutColor}
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HomeNavIcon({
  className = "w-6 h-6",
  cutoutColor = "#d9d9d9",
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Dokumen / Kartu Utama */}
      <rect x="3" y="2" width="18" height="20" rx="5" />
      {/* Garis cut-out horizontal atas */}
      <rect x="7.5" y="9" width="9" height="2" rx="1" fill={cutoutColor} />
      {/* Garis cut-out horizontal bawah */}
      <rect x="7.5" y="13" width="6" height="2" rx="1" fill={cutoutColor} />
    </svg>
  );
}

export function ProfileNavIcon({ className = "w-6 h-6" }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Kepala */}
      <circle cx="12" cy="7.6" r="4.1" />
      {/* Bahu */}
      <path d="M4.2 20.5C4.2 15.6 7.8 13.5 12 13.5C16.2 13.5 19.8 15.6 19.8 20.5C19.8 21.1 19.1 21.6 18.3 21.6H5.7C4.9 21.6 4.2 21.1 4.2 20.5Z" />
    </svg>
  );
}
