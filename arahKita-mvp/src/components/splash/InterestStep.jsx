import rafikiIllustration from "../../assets/rafikiwelcome.svg";

function InterestStep() {
  return (
    <div className="w-full h-full flex flex-col justify-between overflow-hidden">
      {/* Teks Judul & Deskripsi (Rata Kiri, Sesuai Mockup) */}
      <div className="text-left w-full max-w-xl md:max-w-2xl mx-auto pt-24 sm:pt-10 ps-8 shrink-0">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-tight">
          Temukan jurusan mu,
          <br />
          bersama arahkita
        </h1>
        <p className="text-xs sm:text-sm text-white/90 font-normal leading-relaxed mt-2.5 max-w-70 sm:max-w-sm md:max-w-md">
          Terkadang kita tidak tau bahwa minat dan bakat itu terpendalm pada
          diri kita, sehingga dengan arahkita akan membentu progress pencaharian
          minat mu yang tepat.
        </p>
      </div>

      {/* Ilustrasi Orang dengan Kaca Pembesar & Rak Tas dengan Platform Oval Putih */}
      <div className="my-auto flex flex-col items-center justify-center shrink-0">
        <div className="relative flex flex-col items-center">
          <img
            src={rafikiIllustration}
            alt="Temukan Jurusan"
            className="w-full max-w-77.5 sm:max-w-87.5 md:max-w-77.5 h-auto max-h-[38vh] object-contain drop-shadow-md"
          />
          {/* Platform Oval Putih Di Bawah Kaki & Meja Sesuai Desain */}
          <div className="w-56 sm:w-64 md:w-72 h-3.5 sm:h-4 bg-white rounded-[50%] -mt-2 sm:-mt-2.5 shadow-sm" />
        </div>
      </div>
    </div>
  );
}

export default InterestStep;
