import rafikiIllustration from "../../assets/rafikiwelcome.svg";

function InterestStep() {
  return (
    <div className="w-full flex-1 flex flex-col justify-between sm:justify-start min-h-0">
      {/* Teks Judul & Deskripsi (Rata Kiri, Sesuai Mockup) */}
      <div className="text-left w-full max-w-xl md:max-w-2xl mx-auto pt-24 sm:pt-3 md:pt-4 ps-8 sm:ps-1 shrink-0">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-tight">
          Temukan jurusan mu,
          <br />
          bersama arahkita
        </h1>
        <p className="text-xs sm:text-xs md:text-sm text-white/90 font-normal leading-relaxed mt-1 sm:mt-1.5 max-w-70 sm:max-w-sm md:max-w-md">
          Terkadang kita tidak tau bahwa minat dan bakat itu terpendam pada
          diri kita, sehingga dengan arahkita akan membantu progress pencarian
          minat mu yang tepat.
        </p>
      </div>

      {/* Ilustrasi Orang dengan Kaca Pembesar & Rak Tas dengan Platform Oval Putih (Centered di Desktop & Mobile) */}
      <div className="flex-1 w-full flex flex-col items-center justify-center shrink-0 py-2 sm:py-4">
        <div className="relative flex flex-col items-center">
          <img
            src={rafikiIllustration}
            alt="Temukan Jurusan"
            className="w-full max-w-56 sm:max-w-64 md:max-w-72 lg:max-w-80 h-auto max-h-[24vh] sm:max-h-[28vh] md:max-h-[32vh] object-contain drop-shadow-md"
          />
          {/* Platform Oval Putih Di Bawah Kaki & Meja Sesuai Desain */}
          <div className="w-44 sm:w-52 md:w-60 h-2 sm:h-3 bg-white rounded-[50%] -mt-1 sm:-mt-1.5 shadow-sm" />
        </div>
      </div>
    </div>
  );
}

export default InterestStep;
