import logoArahkita from "../../assets/Logo.png";

function WelcomeStep() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-between overflow-hidden bg-[#0C3C6F]">
      {/* Teks Sambutan (Centered Sesuai Mockup) */}
      <div className="text-center w-full max-w-xl mx-auto pt-52 sm:pt-28 shrink-0 flex flex-col items-center">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight leading-snug text-center">
          welcome to Arahkita
        </h1>
        <p className="text-xs sm:text-sm text-white/90 font-normal leading-relaxed mt-2.5 max-w-xs sm:max-w-sm md:max-w-md mx-auto px-4 text-center">
          Dengan arahkita, akan membantu kalian menemukan minat bakat serta
          jurusan yang tepat untuk masa depan.
        </p>
      </div>

      {/* Ilustrasi Logo dalam Oval Putih Miring (Centered sesuai mockup) */}
      <div className="my-auto flex items-center justify-center shrink-0">
        <div className="w-67.5 h-57.5 sm:w-80 sm:h-65 md:w-90 md:h-72.5 bg-white rounded-[50%] rotate-[-26deg] flex items-center justify-center shadow-2xl">
          <div className="rotate-26 flex items-center justify-center">
            <img
              src={logoArahkita}
              alt="Logo Arahkita"
              className="w-26.25 sm:w-31.25 md:w-35 h-auto object-contain drop-shadow-sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default WelcomeStep;
