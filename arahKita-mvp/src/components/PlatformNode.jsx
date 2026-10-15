// Node Design
import { Handle, Position } from "@xyflow/react";

import starPlatformImg from "../assets/node-platform-star.png";

function PlatformNode({ id, data }) {
  const label = data?.label !== undefined ? String(data.label) : "";
  const hasStar = Boolean(data?.hasStar || data?.level !== undefined);

  // Hitung urutan index agar animasi muncul satu per satu (staggered)
  let index = data?.index;
  if (index === undefined && data?.level !== undefined) {
    index = Number(data.level) - 1;
  }
  if (index === undefined && id) {
    const numMatch = String(id).match(/\d+/);
    if (numMatch) {
      index = parseInt(numMatch[0], 10) - 1;
    }
  }
  // Delay bertahap: node 0 -> 100ms, node 1 -> 240ms, node 2 -> 380ms, dst.
  const staggerDelay = Math.max(0, (Number(index) || 0) * 140 + 80);

  return (
    <div
      className="w-full h-full relative flex items-center justify-center select-none group cursor-pointer animate-node-pop"
      style={{
        animationDelay: `${staggerDelay}ms`,
      }}
    >
      {/* Handle atas untuk koneksi edge */}
      <Handle
        type="target"
        position={Position.Top}
        className="opacity-0 pointer-events-none"
      />

      {/* Bentuk Platform 3D:
          - Untuk MajorTestComponent (hasStar === true): Menampilkan platform dengan bintang putih persis desain
          - Untuk Jurusan (hasStar === false): Menampilkan platform silinder isometrik dengan teks jurusan tanpa bintang
      */}
      {hasStar ? (
        <img
          src={starPlatformImg}
          alt={`Level ${data?.level || label}`}
          draggable={false}
          className="w-full h-full object-contain block filter drop-shadow-[0_6px_10px_rgba(7,101,200,0.3)] transition-transform duration-150 group-hover:scale-105 group-active:scale-95 pointer-events-none select-none"
        />
      ) : (
        <svg
          viewBox="0 0 100 68"
          preserveAspectRatio="none"
          className="w-full h-full block filter drop-shadow-[0_6px_10px_rgba(7,101,200,0.3)] transition-transform duration-150 group-hover:scale-105 group-active:scale-95"
        >
          {/* Sisi Ketebalan Bawah Silinder */}
          <path
            d="M 0 30 L 0 38 A 50 30 0 0 0 100 38 L 100 30 Z"
            fill={data?.color || "#0765C8"}
          />
          {data?.color && (
            <path
              d="M 0 30 L 0 38 A 50 30 0 0 0 100 38 L 100 30 Z"
              fill="black"
              opacity={0.25}
            />
          )}
          {/* Permukaan Atas Elips Silinder */}
          <ellipse
            cx="50"
            cy="30"
            rx="50"
            ry="30"
            fill={data?.color || "#0970DD"}
          />
        </svg>
      )}

      {/* Badge Selesai (Checkmark) jika level sudah dikerjakan */}
      {data?.isCompleted && (
        <div className="absolute -top-1 -right-0.5 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[10px] font-black shadow-md z-20 pointer-events-none animate-fadeIn">
          ✓
        </div>
      )}

      {/* Angka Level di Tengah Bintang (Khusus Platform Berbintang) */}
      {hasStar && (data?.level !== undefined || label) && (
        <div className="absolute inset-x-0 top-0 bottom-[18%] flex items-center justify-center pointer-events-none">
          <span className="text-[#0970DD] font-black text-lg sm:text-xl leading-none select-none drop-shadow-xs">
            {data?.level ?? label}
          </span>
        </div>
      )}

      {/* Teks Label di Atas Permukaan Platform: Hanya tampil untuk Jurusan (tanpa bintang) */}
      {!hasStar && label && (
        <div className="absolute inset-x-0 top-0 bottom-[12%] flex items-center justify-center px-2 pointer-events-none">
          <span className="text-white font-bold text-[10px] sm:text-[11px] tracking-wider uppercase text-center select-none drop-shadow-xs">
            {label}
          </span>
        </div>
      )}

      {/* Handle bawah untuk koneksi edge */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="opacity-0 pointer-events-none"
      />
    </div>
  );
}

export default PlatformNode;
