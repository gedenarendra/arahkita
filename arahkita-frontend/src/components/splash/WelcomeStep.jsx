import logoArahkita from "../../assets/Logo.png";

function WelcomeStep() {
  return (
    <div className="w-full flex-1 flex flex-col items-center justify-between sm:justify-start min-h-0 bg-[#0C3C6F]">
      {/* Teks Sambutan (Centered Sesuai Mockup) */}
      <div className="text-center w-full max-w-xl mx-auto pt-52 sm:pt-4 md:pt-6 shrink-0 flex flex-col items-center">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight leading-snug text-center">
          Welcome to Arahkita
        </h1>
        <p className="text-xs sm:text-xs md:text-sm text-white/90 font-normal leading-relaxed mt-1.5 sm:mt-2 max-w-xs sm:max-w-sm md:max-w-md mx-auto px-4 text-center">
          Dengan arahkita, akan membantu kalian menemukan minat bakat serta
          jurusan yang tepat untuk masa depan.
        </p>
      </div>

      {/* Ilustrasi Logo dalam Oval Putih Miring (Centered di Desktop & Mobile) */}
      <div className="flex-1 w-full flex items-center justify-center shrink-0 py-2 sm:py-4">
        <div className="w-56 h-46 sm:w-64 sm:h-52 md:w-72 md:h-58 lg:w-80 lg:h-64 max-h-[26vh] sm:max-h-[30vh] md:max-h-[34vh] aspect-1.25/1 bg-white rounded-[50%] rotate-[-26deg] flex items-center justify-center shadow-2xl">
          <div className="rotate-26 flex items-center justify-center">
            <img
              src={logoArahkita}
              alt="Logo Arahkita"
              className="w-22 sm:w-26 md:w-28 lg:w-32 h-auto object-contain drop-shadow-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeStep;
