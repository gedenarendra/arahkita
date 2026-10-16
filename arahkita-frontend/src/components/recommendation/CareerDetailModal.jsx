import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Komponen 3: Bottom Sheet Modal Detail Karir Path
 * Menampilkan rincian profesi, deskripsi, dan pilihan lingkungan kerja
 * Fitur:
 * - Animasi muncul seret ke atas (slide-up) saat modal dibuka
 * - Interaksi seret ke bawah (drag/swipe down) untuk menutup modal
 * - Penutupan dengan tap backdrop atau tombol Escape dengan animasi slide-down
 */
function CareerDetailModal({ career, onClose = () => {} }) {
  const [activeCareer, setActiveCareer] = useState(career);
  const [prevCareer, setPrevCareer] = useState(career);
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // Sinkronisasi state saat prop career berubah tanpa cascading render
  if (career !== prevCareer) {
    setPrevCareer(career);
    if (career) {
      setActiveCareer(career);
      setIsClosing(false);
      setDragOffset(0);
      setIsDragging(false);
    }
  }

  const dragStartYRef = useRef(0);
  const isDraggingRef = useRef(false);

  // Animasi penutupan bertahap
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setIsVisible(false);

    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setActiveCareer(null);
      setDragOffset(0);
    }, 260);
  }, [isClosing, onClose]);

  // Trigger animasi slide-up secara asinkron via requestAnimationFrame
  useEffect(() => {
    if (career) {
      const frame = requestAnimationFrame(() => {
        setIsVisible(true);
      });
      return () => cancelAnimationFrame(frame);
    } else {
      const frame = requestAnimationFrame(() => {
        setIsVisible(false);
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [career]);

  // Handle tombol Escape keyboard untuk aksesibilitas
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && career) {
        handleClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [career, handleClose]);

  // Touch Gesture Handlers (Seret ke bawah pada ponsel)
  const handleTouchStart = (e) => {
    dragStartYRef.current = e.touches[0].clientY;
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDraggingRef.current) return;
    const currentY = e.touches[0].clientY;
    const deltaY = currentY - dragStartYRef.current;

    // Tarik ke bawah: ikuti pergerakan; tarik ke atas: berikan efek hambatan (rubber-band)
    if (deltaY > 0) {
      setDragOffset(deltaY);
    } else {
      setDragOffset(deltaY * 0.18);
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    setIsDragging(false);

    setDragOffset((prevOffset) => {
      if (prevOffset > 75) {
        handleClose();
        return prevOffset;
      }
      return 0; // Kembalikan ke posisi semula
    });
  };

  // Mouse Drag Handlers (Mendukung drag pada desktop/laptop)
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Hanya klik kiri
    dragStartYRef.current = e.clientY;
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  useEffect(() => {
    const handleWindowMouseMove = (e) => {
      if (!isDraggingRef.current) return;
      const deltaY = e.clientY - dragStartYRef.current;
      if (deltaY > 0) {
        setDragOffset(deltaY);
      } else {
        setDragOffset(deltaY * 0.18);
      }
    };

    const handleWindowMouseUp = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      setDragOffset((prevOffset) => {
        if (prevOffset > 75) {
          handleClose();
          return prevOffset;
        }
        return 0;
      });
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [handleClose]);

  if (!career && !activeCareer) return null;

  const currentData = career || activeCareer;
  const isSheetVisible = isVisible && !isClosing;

  // Hitung transformasi gaya inline saat drag aktif atau animasi CSS saat pasif
  const sheetTransformStyle = isDragging
    ? {
        transform: `translateY(${Math.max(0, dragOffset)}px)`,
        transition: "none",
      }
    : isClosing
      ? {
          transform: "translateY(100%)",
          transition: "transform 260ms cubic-bezier(0.4, 0, 1, 1)",
        }
      : isSheetVisible
        ? {
            transform: "translateY(0%)",
            transition: "transform 320ms cubic-bezier(0.16, 1, 0.3, 1)",
          }
        : {
            transform: "translateY(100%)",
            transition: "transform 320ms cubic-bezier(0.16, 1, 0.3, 1)",
          };

  // Opacity backdrop meredup seiring jarak seretan ke bawah
  const backdropOpacity = isDragging
    ? Math.max(0, 1 - dragOffset / 320)
    : isSheetVisible
      ? 1
      : 0;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col justify-end bg-black/45 backdrop-blur-[1px] select-none ${
        isDragging ? "" : "transition-opacity duration-300"
      }`}
      style={{ opacity: backdropOpacity }}
      onClick={handleClose}
    >
      {/* Bottom Sheet Box */}
      <div
        className="w-full bg-white rounded-t-4xl sm:rounded-t-[36px] px-6 sm:px-8 md:px-10 pt-3 pb-10 shadow-2xl overflow-hidden flex flex-col will-change-transform"
        style={sheetTransformStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full max-w-2xl lg:max-w-3xl mx-auto flex flex-col">
          {/* Handle Bar Area (Touch Target Drag-to-Dismiss) */}
          <div
            className="w-full pt-2 pb-4 flex flex-col items-center justify-center cursor-grab active:cursor-grabbing touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            title="Tarik ke bawah untuk menutup"
          >
            {/* Baris Handle Kapsul */}
            <div className="w-12 h-1.5 bg-gray-300 rounded-full transition-colors hover:bg-gray-400" />
          </div>

          {/* Header Profesi (Dapat di-drag juga untuk kenyamanan mobile) */}
          <div
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
            className="cursor-grab active:cursor-grabbing touch-none"
          >
            {/* Judul Profesi */}
            <h2 className="text-2xl sm:text-[26px] font-extrabold text-gray-950 tracking-tight mb-2">
              {currentData.title}
            </h2>

            {/* Garis Divider Abu-abu Tebal */}
            <div className="w-full h-1 bg-gray-200 rounded-full mb-5" />
          </div>

          {/* Konten Scrollable jika deskripsi panjang */}
          <div className="overflow-y-auto max-h-[60vh] scrollbar-thin pr-1">
            {/* Deskripsi Profesi */}
            <p className="text-xs sm:text-[13px] text-gray-800 leading-relaxed font-normal mb-8">
              {currentData.description}
            </p>

            {/* Section Pilihan Lingkungan Kerja */}
            {Array.isArray(currentData.workEnvironments) &&
              currentData.workEnvironments.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-950">
                    Pilihan Lingkungan Kerja
                  </h3>
                  <ul className="text-xs sm:text-[12.5px] text-gray-800 space-y-1.5 font-normal pl-3">
                    {currentData.workEnvironments.map((env, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2 text-gray-900">•</span>
                        <span>
                          <strong className="font-semibold text-gray-950">
                            {env.label}:
                          </strong>{" "}
                          {env.description}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CareerDetailModal;
