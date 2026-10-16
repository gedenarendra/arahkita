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

  const isCluster = Boolean(data?.isCluster);

  return (
    <div
      className={`w-full h-full relative flex items-center justify-center select-none animate-node-pop ${
        isCluster
          ? "cursor-default pointer-events-none"
          : "group cursor-pointer"
      }`}
      style={{
        animationDelay: `${staggerDelay}ms`,
      }}
    >
      {/* Handle atas dan kiri untuk target koneksi edge */}
      <Handle
        type="target"
        position={Position.Top}
        className="opacity-0 pointer-events-none"
        id="target-top"
      />
      <Handle
        type="target"
        position={Position.Left}
        className="opacity-0 pointer-events-none"
        id="target-left"
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
          className={`w-full h-full block filter drop-shadow-[0_6px_10px_rgba(7,101,200,0.3)] transition-transform duration-150 ${
            isCluster ? "" : "group-hover:scale-105 group-active:scale-95"
          }`}
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

      {/* Badge Penanda Khusus jika Node adalah Rumpun Bidang */}
      {data?.isCluster && (
        <div className="absolute -top-2.5 z-20 pointer-events-none animate-fadeIn">
          <span className="bg-white/95 text-gray-900 border border-gray-200/80 font-black text-[8px] sm:text-[8.5px] px-2 py-0.5 rounded-full shadow-xs tracking-wider uppercase flex items-center gap-1">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: data?.color || "#0070E0" }}
            />
            Rumpun
          </span>
        </div>
      )}

      {/* Teks Label di Atas Permukaan Platform: Tampil untuk Rumpun & Jurusan (tanpa bintang) */}
      {!hasStar && label && (
        <div className="absolute inset-x-0 top-0 bottom-[12%] flex items-center justify-center px-2 pointer-events-none">
          <span
            className={`text-white font-bold tracking-wider uppercase text-center select-none drop-shadow-xs leading-tight ${
              data?.isCluster
                ? "text-[10px] sm:text-[11.5px] font-extrabold max-w-[85%]"
                : "text-[10px] sm:text-[11px]"
            }`}
          >
            {label}
          </span>
        </div>
      )}

      {/* Handle bawah dan kanan untuk sumber koneksi edge */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="opacity-0 pointer-events-none"
        id="source-bottom"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="opacity-0 pointer-events-none"
        id="source-right"
      />
    </div>
  );
}

export default PlatformNode;
