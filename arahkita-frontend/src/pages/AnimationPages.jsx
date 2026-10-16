import { useState, useEffect, useRef, useCallback } from "react";
import { Lottie } from "lottie-react";
import splashAnimation from "../assets/splashAnimation.json";

function AnimationPages({ onFinish }) {
  const [isFading, setIsFading] = useState(false);
  const timerRef = useRef(null);

  const handleComplete = useCallback(() => {
    setIsFading((prev) => {
      if (prev) return prev;
      setTimeout(() => {
        if (onFinish) {
          onFinish();
        }
      }, 500);
      return true;
    });
  }, [onFinish]);

  useEffect(() => {
    // Fallback timer (durasi animasi ~3 detik) untuk memastikan transisi jika event selesai terlambat
    timerRef.current = setTimeout(() => {
      handleComplete();
    }, 3500);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [handleComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 w-screen h-dvh bg-white flex items-center justify-center overflow-hidden transition-opacity duration-500 ease-out font-sans ${
        isFading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      {/* 
        Container Animasi Full Screen:
        Mengisi 100% seluruh layar (w-full h-full) tanpa batas max-width / padding,
        dengan preserveAspectRatio 'xMidYMid slice' agar memenuhi seluruh layar edge-to-edge.
      */}
      <div className="w-full h-full flex items-center justify-center">
        <Lottie
          src={splashAnimation}
          autoplay={true}
          loop={false}
          className="w-full h-full"
          style={{ width: "100%", height: "100%" }}
          rendererSettings={{
            preserveAspectRatio: "xMidYMid slice",
          }}
          subscriptions={{ complete: handleComplete }}
        />
      </div>
    </div>
  );
}

export default AnimationPages;
