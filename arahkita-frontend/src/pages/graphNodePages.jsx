import { useState, useEffect, useMemo } from "react";
import GraphNodeComponent from "../components/graphNodeComponent";
import MajorTestComponent from "../components/MajorTestComponent";
import BottomNavigation from "../components/BottomNavigation";
import logoArahkita from "../assets/Logo.png";
import heroIllustration from "../assets/rafiki.svg";
import { getCachedMajors } from "../api/majorApi";
import { getInitialClusterGraph } from "../utils/clusterGraphUtils";

const initialGraph = getInitialClusterGraph();
const initialNodes = initialGraph.nodes;
const initialEdges = initialGraph.edges;

const getTimeGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return "Good morning";
  }
  if (hour >= 12 && hour < 18) {
    return "Good afternoon";
  }
  return "Good evening";
};

function GraphNodePages({
  nodes: propNodes,
  edges: propEdges,
  activeTab: controlledActiveTab,
  onTabChange,
}) {
  const greeting = getTimeGreeting();
  const [internalActiveTab, setInternalActiveTab] = useState("home");
  const [selectedMajor, setSelectedMajor] = useState(null);
  const [cachedGraph, setCachedGraph] = useState(null);

  useEffect(() => {
    // Hanya skip jika propNodes DAN propEdges KEDUANYA sudah lengkap
    if (
      Array.isArray(propNodes) &&
      propNodes.length > 0 &&
      Array.isArray(propEdges) &&
      propEdges.length > 0
    ) {
      return;
    }

    let isMounted = true;
    getCachedMajors().then((result) => {
      if (isMounted && result?.nodes && result.nodes.length > 0) {
        setCachedGraph({
          nodes: result.nodes,
          edges: result.edges || [],
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [propNodes, propEdges]);

  const hasOnboarded =
    typeof window !== "undefined" &&
    localStorage.getItem("has_onboarded") === "true";

  const displayedNodes = useMemo(() => {
    return Array.isArray(propNodes) && propNodes.length > 0
      ? propNodes
      : cachedGraph?.nodes && cachedGraph.nodes.length > 0
        ? cachedGraph.nodes
        : hasOnboarded
          ? []
          : initialNodes;
  }, [propNodes, cachedGraph, hasOnboarded]);

  const displayedEdges = useMemo(() => {
    if (Array.isArray(propEdges) && propEdges.length > 0) {
      return propEdges;
    }
    if (cachedGraph?.edges && cachedGraph.edges.length > 0) {
      return cachedGraph.edges;
    }
    return hasOnboarded ? [] : initialEdges;
  }, [propEdges, cachedGraph, hasOnboarded]);

  const activeTab =
    controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const handleNodeClick = (_event, node) => {
    // Jika yang diklik adalah Node Rumpun Bidang, abaikan pembukaan soal
    if (node?.data?.isCluster) {
      return;
    }

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

  // Hitung batas gerak canvas (bounding box) agar node dan edge tidak bisa digeser keluar layar
  const translateExtent = useMemo(() => {
    if (!displayedNodes || displayedNodes.length === 0) {
      return [
        [-50, -50],
        [500, 800],
      ];
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    displayedNodes.forEach((node) => {
      const x = node.position?.x ?? 0;
      const y = node.position?.y ?? 0;
      const w = Number(node.style?.width) || 145;
      const h = Number(node.style?.height) || 76;

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x + w > maxX) maxX = x + w;
      if (y + h > maxY) maxY = y + h;
    });

    const paddingX = 60;
    const paddingY = 60;

    return [
      [minX - paddingX, minY - paddingY],
      [maxX + paddingX, maxY + paddingY],
    ];
  }, [displayedNodes]);

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
                  Hi, {greeting}
                </p>
                <p className="text-[19px] font-extrabold text-white tracking-tight leading-snug">
                  Welcome to Arahkita
                </p>
              </div>
            </div>
          </div>

          {/* ── Graph Area ── */}
          <div className="flex-1 min-h-0">
            <GraphNodeComponent
              nodes={displayedNodes}
              edges={displayedEdges}
              fitView
              fitViewOptions={{ padding: 0.15 }}
              translateExtent={translateExtent}
              minZoom={0.65}
              maxZoom={1.3}
              panOnDrag={true}
              panOnScroll={true}
              zoomOnScroll={false}
              zoomOnPinch={true}
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
