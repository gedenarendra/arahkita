import { useState, useEffect } from "react";
import AnimationPages from "./pages/AnimationPages";
import SplashPages from "./pages/splashPages";
import GraphNodePages from "./pages/graphNodePages";
import RecomendationPages from "./pages/recomendationPages";
import ProfilPages from "./pages/profilPages";
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import { getCachedMajors } from "./api/majorApi";

function App() {
  // Splash animation muncul saat pertama kali aplikasi dibuka
  const [showSplash, setShowSplash] = useState(true);

  // Inisialisasi onboarding: jika user sudah pernah onboarding / memiliki data, lewati onboarding
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return localStorage.getItem("has_onboarded") !== "true";
  });

  // Active Tab Navigasi: 'home' | 'recomendation' | 'profile'
  const [activeTab, setActiveTab] = useState("home");
  // Mapped Major Nodes yang dihasilkan dari Onboarding / API
  const [majorNodes, setMajorNodes] = useState(null);

  // Periksa IndexedDB saat startup untuk memastikan data jurusan dimuat langsung
  useEffect(() => {
    let isMounted = true;

    getCachedMajors().then((result) => {
      if (!isMounted) return;

      if (result?.mappedNodes && result.mappedNodes.length > 0) {
        setMajorNodes(result.mappedNodes);
        setShowOnboarding(false);
        localStorage.setItem("has_onboarded", "true");
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="relative w-full h-dvh overflow-hidden">
      {/* Halaman Utama Aplikasi: SplashPages (Onboarding) kemudian Halaman Aktif sesuai Tab */}
      {showOnboarding ? (
        <SplashPages
          onComplete={(nodes) => {
            if (nodes && Array.isArray(nodes)) {
              setMajorNodes(nodes);
            }
            localStorage.setItem("has_onboarded", "true");
            setShowOnboarding(false);
          }}
        />
      ) : activeTab === "recomendation" ? (
        <RecomendationPages
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
        />
      ) : activeTab === "profile" ? (
        <ProfilPages
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          onResetOnboarding={() => {
            setMajorNodes(null);
            setShowOnboarding(true);
            setActiveTab("home");
          }}
        />
      ) : (
        <GraphNodePages
          nodes={majorNodes}
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
        />
      )}

      {/* Animation Splash Screen (Muncul pertama kali saat membuka PWA) */}
      {showSplash && <AnimationPages onFinish={() => setShowSplash(false)} />}

      {/* Prompt / Banner Pasang Aplikasi PWA */}
      <PwaInstallPrompt />
    </div>
  );
}

export default App;
