import { useState, useEffect } from "react";

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos] = useState(() => {
    if (typeof window === "undefined") return false;
    return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
  });
  const [showPrompt, setShowPrompt] = useState(() => {
    if (typeof window === "undefined") return false;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;
    if (isStandalone) return false;
    const isDismissed = sessionStorage.getItem("pwa_prompt_dismissed");
    const isIosDevice = /iphone|ipad|ipod/.test(
      window.navigator.userAgent.toLowerCase(),
    );
    return Boolean(isIosDevice && !isDismissed);
  });
  const [showIosGuide, setShowIosGuide] = useState(false);

  useEffect(() => {
    // Cek apakah sudah dalam mode standalone (aplikasi terinstall)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      return;
    }

    const isDismissed = sessionStorage.getItem("pwa_prompt_dismissed");

    // Tangkap event instalasi browser (Chrome, Edge, Android)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isDismissed) {
        setShowPrompt(true);
      }
    };

    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      sessionStorage.setItem("pwa_prompt_dismissed", "true");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    setShowIosGuide(false);
    sessionStorage.setItem("pwa_prompt_dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-50 animate-in fade-in slide-in-from-bottom duration-300">
      <div className="bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-2xl rounded-2xl p-4 flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <img
            src="/Logo.png"
            alt="ArahKita Logo"
            className="w-12 h-12 rounded-xl object-contain shadow-sm border border-slate-100 shrink-0 p-1 bg-white"
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-slate-800 text-sm truncate">
              Install Aplikasi ArahKita
            </h4>
            <p className="text-xs text-slate-500 line-clamp-2">
              Akses lebih cepat dan lancar langsung dari layar utama perangkat
              Anda.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            aria-label="Tutup"
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Panduan khusus iOS */}
        {showIosGuide && (
          <div className="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-3 text-xs flex flex-col gap-1.5">
            <div className="font-medium flex items-center gap-1">
              <span>Cara Pasang di Safari iOS:</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-700">
              <li>
                Tekan tombol Bagikan/Share{" "}
                <span className="font-semibold">⎋</span> di browser Safari.
              </li>
              <li>
                Gulir ke bawah dan pilih{" "}
                <span className="font-semibold">
                  &quot;Tambahkan ke Layar Utama&quot; (Add to Home Screen)
                </span>
                .
              </li>
              <li>
                Pilih <span className="font-semibold">&quot;Tambah&quot;</span>.
              </li>
            </ol>
          </div>
        )}

        {/* Tombol Aksi */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            onClick={handleDismiss}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Nanti Saja
          </button>
          <button
            onClick={handleInstallClick}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 rounded-lg shadow-sm transition-all"
          >
            {isIos ? "Cara Install" : "Install Sekarang"}
          </button>
        </div>
      </div>
    </div>
  );
}
