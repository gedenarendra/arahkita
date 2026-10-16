# 🧭 Panduan Integrasi Frontend: Changelog Backend & Implementasi Streaming SSE

Dokumen ini memuat catatan teknis seluruh pembaruan backend terbaru untuk tim Frontend (React + Vite, JavaScript, IndexedDB/Dexie.js), agar dapat langsung mengimplementasikan integrasi endpoint baru bersamaan dengan pembaruan backend.

---

## ⚡ 1. Ringkasan Perubahan Backend Terbaru (Changelog)

### 1.1. Endpoint Baru: Streaming Server-Sent Events (SSE)
- **URL**: `POST /api/v1/minicases/generate-stream`
- **Tujuan**: Mengatasi masalah layar *loading* kosong ~30–40 detik saat LLM men-generate pohon studi kasus.
- **Header**: `Accept: text/event-stream`
- **Cara Kerja**: Backend memancarkan status berpikir AI secara berkala (`type: "status"`), mengirimkan node soal individual begitu siap (`type: "node"`), dan memberikan sinyal selesai (`type: "done"`).

### 1.2. Paralelisasi Generasi & Early Interaction (~5–7 Detik)
- Backend kini memecah generasi studi kasus menjadi 2 tahap menggunakan `asyncio.gather`:
  1. **Tahap 1**: Menentukan 3–5 mata kuliah dasar inti (~1–2 detik).
  2. **Tahap 2 (Paralel)**: Merakit studi kasus (1 MCQ + 1 Esai) untuk masing-masing mata kuliah secara simultan.
- **Keuntungan UX**: Mata kuliah pertama (**Node #2: Pilihan Ganda** dan **Node #3: Esai**) selesai dibuat dalam **~5–6 detik** dan langsung dikirim ke frontend. Siswa dapat langsung mulai membaca dan berinteraksi dengan soal pertama, sementara sisa node disimpan otomatis di latar belakang.

### 1.3. Optimasi Routing Throughput OpenRouter
- Seluruh pemanggilan OpenRouter di backend telah dikonfigurasi dengan `"provider": {"sort": "throughput"}` dan mematikan reasoning token yang tidak perlu, sehingga kecepatan token per detik meningkat signifikan.

### 1.4. Input Nilai Mata Pelajaran Tetap Dinamis Penuh
- Form onboarding menerima **minimal 3 dan maksimal 10 mata pelajaran** bebas dengan nilai integer `0–100`.
- Backend otomatis menormalisasi semua nama mata pelajaran menjadi huruf kecil murni (*lowercase*).

### 1.5. Penomoran Node & Aturan Rules
- Node studi kasus dari backend memiliki `minicase_number` dimulai dari **2 hingga 11**.
- Node **nomor 1** dialokasikan khusus untuk kartu panduan/aturan pengerjaan (*Rules Card*) yang dikelola langsung di state / IndexedDB lokal frontend.

---

## 📦 2. Kontrak Data Server-Sent Events (SSE)

Setiap baris data dikirim dalam format envelope JSON tunggal:
```http
data: {"type": "<status|node|done|error>", "data": <payload>}

```

### Daftar Tipe Event:

| `type` | Isi `data` | Kapan Dikirim & Kegunaan di Frontend |
| :--- | :--- | :--- |
| `"status"` | `{"stage": string, "message": string, "progress": number, "subjects"?: string[]}` | Dikirim saat AI sedang menganalisis kurikulum & membuat kasus. Gunakan untuk memperbarui **progress bar** atau **teks animasi berpikir**. |
| `"node"` | Objek `MinicaseNode` lengkap | Dikirim tiap kali satu node soal selesai dirakit. Simpan langsung ke database lokal: `await db.minicases.put(event.data)` dan render node ke pohon visual. |
| `"done"` | `{"total_nodes": number, "status": "completed", "message": string}` | Dikirim saat seluruh batch selesai. Matikan mode loading pada UI. |
| `"error"` | `{"message": string}` | Dikirim jika terjadi kendala kritis. Tampilkan pesan kesalahan atau tombol coba lagi. |

---

## 💻 3. Kode Implementasi Frontend Siap Pakai

### 3.1. Service Layer (`src/services/minicaseService.js`)

Tambahkan fungsi pembaca stream berikut menggunakan standard `fetch` dan `ReadableStream`:

```javascript
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.nyomanyogi.my.id/api/v1';

/**
 * Melakukan streaming generasi rantai minicase via Server-Sent Events (SSE).
 * 
 * @param {Object} payload - GenerateMinicasesRequest { major_id, major_name, circle_color, profile }
 * @param {Object} callbacks
 * @param {Function} callbacks.onStatus - Menerima update progres { stage, message, progress }
 * @param {Function} callbacks.onNode - Menerima objek MinicaseNode individual
 * @param {Function} callbacks.onDone - Dipanggil saat seluruh generasi selesai { total_nodes, status }
 * @param {Function} callbacks.onError - Dipanggil jika terjadi kesalahan { message }
 */
export async function streamMinicasesTree(payload, { onStatus, onNode, onDone, onError }) {
  try {
    const response = await fetch(`${BASE_URL}/minicases/generate-stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Gagal menghubungi server (Status: ${response.status})`);
    }

    if (!response.body) {
      throw new Error('Response body tidak mendukung streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';

      for (const chunk of chunks) {
        const line = chunk.trim();
        if (!line.startsWith('data: ')) continue;

        try {
          const event = JSON.parse(line.slice(6));
          switch (event.type) {
            case 'status':
              onStatus?.(event.data);
              break;
            case 'node':
              onNode?.(event.data);
              break;
            case 'done':
              onDone?.(event.data);
              break;
            case 'error':
              onError?.(event.data);
              break;
            default:
              console.warn('Unknown event type received:', event);
          }
        } catch (parseErr) {
          console.error('Gagal mem-parsing chunk SSE:', line, parseErr);
        }
      }
    }
  } catch (err) {
    onError?.({ message: err.message || 'Terjadi gangguan jaringan saat streaming.' });
    throw err;
  }
}
```

---

### 3.2. Pola Integrasi Komponen & Penyimpanan Dexie.js

Saat pengguna memilih salah satu jurusan rekomendasi, panggil fungsi streaming ini:

```javascript
import React, { useState } from 'react';
import { db } from '../db';
import { streamMinicasesTree } from '../services/minicaseService';

export function MajorTrialExplorer({ selectedMajor, userProfile }) {
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [nodes, setNodes] = useState([]);

  const handleStartExploration = async () => {
    setLoading(true);
    setProgress(5);
    setStatusMessage('Menghubungkan ke konsultan AI...');

    // 1. Simpan Rules Card (Node #1) ke database lokal jika belum ada
    const rulesNode = {
      id: `rules-${selectedMajor.id}`,
      parent_id: selectedMajor.id,
      minicase_number: 1,
      minicase_title: 'Panduan Ujian',
      subject_name: 'Aturan Pengerjaan',
      node_type: 'rules',
      question: 'Kerjakan soal pilihan ganda dan esai reflektif dengan jujur.',
      is_parent: true,
      circle_color: selectedMajor.circle_color,
      is_done: true,
      child_id: null, // akan diupdate saat node #2 tiba
    };
    await db.minicases.put(rulesNode);

    // 2. Jalankan streaming SSE
    await streamMinicasesTree(
      {
        major_id: selectedMajor.id,
        major_name: selectedMajor.major_name,
        circle_color: selectedMajor.circle_color,
        profile: userProfile,
      },
      {
        onStatus: (statusData) => {
          setStatusMessage(statusData.message);
          setProgress(statusData.progress);
        },
        onNode: async (nodeData) => {
          // Simpan node secara idempoten ke IndexedDB browser
          await db.minicases.put(nodeData);

          // Hubungkan child_id dari node rules jika ini adalah node pertama (#2)
          if (nodeData.minicase_number === 2) {
            await db.minicases.update(rulesNode.id, { child_id: nodeData.id });
          }

          // Perbarui state UI agar node baru langsung muncul di visual tree
          setNodes((prev) => [...prev, nodeData]);
        },
        onDone: (doneData) => {
          setLoading(false);
          setProgress(100);
          setStatusMessage(doneData.message);
        },
        onError: (errData) => {
          setLoading(false);
          alert(`Gagal membuat studi kasus: ${errData.message}`);
        },
      }
    );
  };

  return (
    <div className="explorer-container">
      {loading && (
        <div className="ai-loading-bar">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
          <p className="status-text">{statusMessage} ({progress}%)</p>
        </div>
      )}

      {/* Tampilan Visual Tree Node */}
      <div className="nodes-tree">
        {nodes.map((node) => (
          <div key={node.id} className="tree-node-card" style={{ borderColor: node.circle_color }}>
            <h4>#{node.minicase_number} {node.minicase_title}</h4>
            <p>{node.subject_name} • {node.node_type}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🗄️ 4. Struktur Database Lokal (Dexie.js)

Skema database IndexedDB lokal `ArahKitaDB` **tidak mengalami perubahan struktur**. Seluruh properti `MinicaseNode` kompatibel 100%:

```javascript
import Dexie from 'dexie';

export const db = new Dexie('ArahKitaDB');

db.version(1).stores({
  profile: '++id',
  majors: 'id, major_name',
  minicases: 'id, parent_id, minicase_number, is_done, node_type',
  previews: 'id, major_node_id, matching_percentage',
});
```

> 💡 **Keuntungan Operasi `put()`**: Operasi `db.minicases.put(event.data)` bersifat *upsert* (insert jika belum ada, replace jika ID sama). Jika node penutup disesuaikan di akhir stream oleh backend, pemanggilan `put` akan memperbarui record secara mulus.

---

## 🔄 5. Kompatibilitas Endpoint Lama (Fallback)

Endpoint non-streaming lama **`POST /api/v1/minicases/generate`** tetap aktif:
- Mengembalikan response `list[MinicaseNode]` sekaligus dalam bentuk array JSON standar (`200 OK`).
- Di backend, endpoint lama ini juga **telah dipercepat** menggunakan paralelisasi internal yang sama (~6–8 detik).
- Jika ada kendala koneksi streaming pada browser pengguna tertentu, frontend dapat menggunakan endpoint lama ini sebagai mekanisme *graceful fallback*.
