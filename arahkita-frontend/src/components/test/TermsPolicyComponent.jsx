import logoArahkita from "../../assets/Logo.png";
import termsHeroImg from "../../assets/terms_hero.png";

function TermsPolicyComponent({
  onBack,
  onAgree,
  onDisagree,
}) {
  return (
    <div className="w-full h-full flex flex-col bg-white font-sans overflow-hidden select-none">
      {/* ── 1. Header (Tombol Back Bulat & Logo Arahkita) ── */}
      <header className="shrink-0 flex items-center justify-between px-5 sm:px-8 pt-7 pb-2.5 max-w-sm mx-auto w-full">
        <button
          type="button"
          onClick={onBack}
          className="w-8.5 h-8.5 rounded-full bg-[#E2E8F0] hover:bg-[#CBD5E1] active:scale-90 flex items-center justify-center transition-all cursor-pointer shadow-xs text-gray-700"
          aria-label="Kembali"
        >
          <svg
            className="w-4.5 h-4.5 -ml-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        <div className="flex items-center">
          <img src={logoArahkita} alt="Arahkita" className="h-7 w-auto" />
          <span className="text-[22px] font-bold text-gray-950 tracking-tight">
            rahkita
          </span>
        </div>
      </header>

      {/* ── 2. Hero Banner 'Hello Everyone' ── */}
      <div className="shrink-0 max-w-sm mx-auto w-full px-5 sm:px-8 mb-3">
        <div className="w-full rounded-[20px] overflow-hidden shadow-hero">
          <img
            src={termsHeroImg}
            alt="Hello Everyone"
            className="w-full h-auto object-cover block"
          />
        </div>
      </div>

      {/* ── 3. Content Card Syarat dan Ketentuan (Warna #D9D9D9 Persegi Sesuai Mockup) ── */}
      <div className="flex-1 min-h-0 max-w-sm mx-auto w-full px-5 sm:px-8 overflow-hidden flex flex-col">
        <div className="w-full h-full bg-[#D9D9D9] p-4.5 sm:p-5 overflow-y-auto text-left shadow-xs">
          <h2 className="text-[17px] font-bold text-black mb-3 tracking-tight">
            Syarat dan Ketentuan
          </h2>

          <div className="space-y-3 text-[10.5px] sm:text-[11px] text-black leading-relaxed font-normal">
            <div>
              <p className="font-bold text-black mb-0.5">
                1. Penerimaan Syarat
              </p>
              <p>
                Dengan menggunakan situs web atau layanan ini, Anda setuju untuk
                mematuhi dan terikat oleh syarat dan ketentuan ini. Jika Anda
                tidak setuju dengan syarat ini, mohon jangan gunakan situs web
                atau layanan ini.
              </p>
            </div>

            <div>
              <p className="font-bold text-black mb-0.5">
                2. Penggunaan Layanan
              </p>
              <p>
                Anda setuju untuk menggunakan situs web atau layanan ini hanya
                untuk tujuan yang sah dan dengan cara yang tidak melanggar hak
                orang lain atau membatasi maupun menghalangi penggunaan orang
                lain terhadap situs web atau layanan ini.
              </p>
            </div>

            <div>
              <p className="font-bold text-black mb-0.5">3. Akun Pengguna</p>
              <p>
                Anda setuju untuk menggunakan situs web atau layanan ini hanya
                untuk tujuan yang sah dan dengan cara yang tidak melanggar hak
                orang lain atau membatasi maupun menghalangi penggunaan orang
                lain terhadap situs web atau layanan ini.
              </p>
            </div>

            <div>
              <p className="font-bold text-black mb-0.5">
                4. Kebijakan Privasi
              </p>
              <p>
                Penggunaan Anda atas situs web atau layanan ini juga diatur oleh
                Kebijakan Privasi kami. Harap tinjau Kebijakan Privasi kami
                untuk memahami bagaimana kami mengumpulkan.
              </p>
            </div>

            <div>
              <p className="font-bold text-black mb-0.5">
                5. Perubahan Syarat dan Ketentuan
              </p>
              <p>
                Kami berhak untuk mengubah, memodifikasi, atau memperbarui
                syarat dan ketentuan ini kapan saja tanpa pemberitahuan
                sebelumnya. Penggunaan Anda yang berkelanjutan atas layanan ini
                setelah adanya perubahan akan dianggap sebagai persetujuan Anda
                terhadap syarat yang baru.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4. Tombol Aksi (Disagree & Agree Sesuai Warna & Ukuran Mockup) ── */}
      <div className="shrink-0 max-w-sm mx-auto w-full px-5 sm:px-8 py-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onDisagree}
          className="w-25 sm:w-27 h-8 sm:h-8.5 bg-[#E0E0E0] hover:bg-[#D5D5D5] active:scale-95 text-black font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center"
        >
          Disagree
        </button>
        <button
          type="button"
          onClick={onAgree}
          className="w-21.5 sm:w-23.5 h-8 sm:h-8.5 bg-[#8D8A9F] hover:bg-[#7D7A8F] active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center"
        >
          Agree
        </button>
      </div>
    </div>
  );
}

export default TermsPolicyComponent;
