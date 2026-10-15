import { useState, useEffect } from "react";
import GraphNodeComponent from "../components/graphNodeComponent";
import MajorTestComponent from "../components/MajorTestComponent";
import BottomNavigation from "../components/BottomNavigation";
import logoArahkita from "../assets/Logo.png";
import heroIllustration from "../assets/rafiki.svg";
import { getCachedMajors } from "../api/majorApi";

// Helper node platform 3D silinder isometrik dengan index animasi berurutan
const platformNode = (w, h, label, index = 0) => ({
  id: label || Math.random().toString(),
  type: "platform",
  data: { label, index },
  style: {
    width: w,
    height: h,
    background: "transparent",
    border: "none",
    boxShadow: "none",
    padding: 0,
  },
});

const initialNodes = [
  // Row 1 — SOSIOLOGI & SPORT
  {
    ...platformNode(125, 75, "SOSIOLOGI", 0),
    id: "n1",
    position: { x: 45, y: 30 },
  },
  {
    ...platformNode(115, 70, "SPORT", 1),
    id: "n2",
    position: { x: 250, y: 18 },
  },
  // Row 2 — MANAGEMENT & MATH
  {
    ...platformNode(152, 78, "MANAGEMENT", 2),
    id: "n3",
    position: { x: 18, y: 178 },
  },
  {
    ...platformNode(118, 72, "MATH", 3),
    id: "n4",
    position: { x: 245, y: 210 },
  },
  // Row 3 — TEKNOLOGI
  {
    ...platformNode(140, 75, "TEKNOLOGI", 4),
    id: "n5",
    position: { x: 130, y: 355 },
  },
];

const initialEdges = [];

function GraphNodePages({
  nodes: propNodes,
  activeTab: controlledActiveTab,
  onTabChange,
}) {
  const [internalActiveTab, setInternalActiveTab] = useState("home");
  const [selectedMajor, setSelectedMajor] = useState(null);
  const [cachedNodes, setCachedNodes] = useState(null);

  useEffect(() => {
    if (Array.isArray(propNodes) && propNodes.length > 0) {
      return;
    }

    let isMounted = true;
    getCachedMajors().then((result) => {
      if (isMounted && result?.mappedNodes && result.mappedNodes.length > 0) {
        setCachedNodes(result.mappedNodes);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [propNodes]);

  const hasOnboarded =
    typeof window !== "undefined" &&
    localStorage.getItem("has_onboarded") === "true";

  const displayedNodes =
    Array.isArray(propNodes) && propNodes.length > 0
      ? propNodes
      : cachedNodes && cachedNodes.length > 0
      ? cachedNodes
      : hasOnboarded
      ? []
      : initialNodes;

  const activeTab =
    controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const handleNodeClick = (_event, node) => {
    const rawData = node?.data?.raw || {};
    const label = node?.data?.label || rawData.major_name || "Math";
    const majorObj = {
      id: node?.data?.id || rawData.id || node?.id,
      major_name: rawData.major_name || label,
      circle_color: node?.data?.color || rawData.circle_color || "#4F46E5",
      child_id: node?.data?.childId || rawData.child_id || null,
      raw: rawData,
    };
    setSelectedMajor(majorObj);
  };

  const handleTabChange = (tab) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
    if (tab === "home") {
      setSelectedMajor(null);
    }
  };

  return (
    <div className="w-full h-dvh flex flex-col bg-white font-sans overflow-hidden">
      {/* Jika user memilih jurusan, render MajorTestComponent di area konten */}
      {selectedMajor ? (
        <div className="flex-1 min-h-0">
          <MajorTestComponent
            majorData={selectedMajor}
            major={selectedMajor.major_name || "Math"}
            onBack={() => setSelectedMajor(null)}
            onNavigateToRecommendation={() => {
              setSelectedMajor(null);
              handleTabChange("recomendation");
            }}
          />
        </div>
      ) : (
        <>
          {/* ── Header ── */}
          <header className="shrink-0 flex items-center justify-end px-5 pt-8 pb-8">
            <div className="flex items-center">
              <img src={logoArahkita} alt="Arahkita" className="h-7 w-auto" />
              <span className="text-[22px] font-bold text-gray-950 tracking-tight">
                rahkita
              </span>
            </div>
          </header>

          {/* ── Hero Greeting Card ── */}
          <div className="shrink-0 mx-5 mb-1">
            <div className="w-full h-36 rounded-[18px] bg-linear-to-r from-[#2b4f7a] via-[#3d6892] to-[#5a7ea8] shadow-hero flex items-center overflow-hidden relative">
              {/* Ilustrasi — full height, contain, tengah */}
              <div className="absolute left-0 top-0 bottom-0 w-40 flex items-center justify-center overflow-hidden">
                <img
                  src={heroIllustration}
                  alt="ilustrasi"
                  className="h-full w-full object-contain object-center"
                />
              </div>
              {/* Teks Greeting */}
              <div className="ml-40 pl-4 z-10">
                <p className="text-sm text-blue-200 font-semibold leading-tight">
                  Hai, Goodmorning
                </p>
                <p className="text-[19px] font-extrabold text-white tracking-tight leading-snug">
                  welcome to arahkita
                </p>
              </div>
            </div>
          </div>

          {/* ── Graph Area ── */}
          <div className="flex-1 min-h-0">
            <GraphNodeComponent
              nodes={displayedNodes}
              edges={initialEdges}
              fitView
              fitViewOptions={{ padding: 0.25 }}
              panOnDrag={false}
              panOnScroll={false}
              zoomOnScroll={false}
              zoomOnPinch={false}
              zoomOnDoubleClick={false}
              nodesDraggable={false}
              nodesConnectable={false}
              nodesFocusable={false}
              edgesFocusable={false}
              elementsSelectable={false}
              preventScrolling={false}
              onNodeClick={handleNodeClick}
              backgroundProps={{
                variant: "dots",
                color: "#c8c8c8",
                gap: 40,
                size: 3,
              }}
            />
          </div>
        </>
      )}

      {/* ── Bottom Navigation Bar (Dikelola di Level Page) ── */}
      <BottomNavigation activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}

export default GraphNodePages;
