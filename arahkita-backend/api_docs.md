# 📖 Panduan API ArahKita Backend

Dokumentasi resmi kontrak antarmuka API (*API Contract*) antara **ArahKita Backend** dan **ArahKita Frontend** (React + Vite, JavaScript). Dokumen ini dirancang modular agar setiap penambahan endpoint baru dapat dengan mudah ditambahkan di bagian bawah.

---

## 📌 Daftar Isi
1. [Konfigurasi Lingkungan & Base URL](#1-konfigurasi-lingkungan--base-url)
2. [Format Standar Error Response](#2-format-standar-error-response)
3. [Daftar Endpoint](#3-daftar-endpoint)
   - [3.1. POST /api/v1/clusters/recommend-stream (Streaming SSE Onboarding)](#31-post-apiv1clustersrecommend-stream-streaming-sse-onboarding)
   - [3.2. POST /api/v1/clusters/recommend (Fallback Sync Onboarding)](#32-post-apiv1clustersrecommend-fallback-sync-onboarding)
   - [3.3. POST /api/v1/majors/recommend (Legacy Fallback)](#33-post-apiv1majorsrecommend-legacy-fallback)
   - [3.4. POST /api/v1/recommendation-results](#34-post-apiv1recommendation-results)
   - [3.5. POST /api/v1/minicases/generate](#35-post-apiv1minicasesgenerate)
   - [3.6. POST /api/v1/minicases/generate-stream (Streaming SSE)](#36-post-apiv1minicasesgenerate-stream-streaming-sse)
   - [3.7. POST /api/v1/minicases/evaluate-essay](#37-post-apiv1minicasesevaluate-essay)
   - [3.8. POST /api/v1/preview/{major_node_id}](#38-post-apiv1previewmajor_node_id)

---

## 1. Konfigurasi Lingkungan & Base URL

Backend ArahKita telah aktif dan di-hosting secara publik dengan protokol HTTPS di:
- **Production Base URL**: `https://api.nyomanyogi.my.id/api/v1`
- **Development (Local) Base URL**: `http://localhost:8000/api/v1`
- **Health Check**: `https://api.nyomanyogi.my.id/health`

Di project **React + Vite**, buat atau tambahkan variabel lingkungan pada file `.env`:

```env
# URL dasar backend ArahKita (Production)
VITE_API_BASE_URL=https://api.nyomanyogi.my.id/api/v1

# Untuk pengembangan lokal (opsional):
# VITE_API_BASE_URL=http://localhost:8000/api/v1
```

> 💡 **Catatan CORS & HTTPS**: Backend sudah mendukung HTTPS dan mengizinkan `allow_origins=["*"]`, sehingga frontend React + Vite (baik saat running di `localhost:5173` maupun setelah dideploy ke Vercel/Netlify/GitHub Pages) dapat langsung berkomunikasi secara aman tanpa kendala Mixed Content ataupun CORS.

---

## 2. Format Standar Error Response

Backend menggunakan FastAPI dan Pydantic v2. Format pesan error mengikuti standar berikut:

### 2.1. Validasi Input Gagal (`422 Unprocessable Entity`)
Terjadi jika format JSON salah, tipe data tidak sesuai, atau ada batas nilai yang dilanggar.
```json
{
  "detail": [
    {
      "type": "less_than_equal",
      "loc": ["body", "nilai", "Matematika"],
      "msg": "Input should be less than or equal to 100",
      "input": 105,
      "ctx": {
        "le": 100
      }
    }
  ]
}
```

### 2.2. Kesalahan Server / LLM (`500 Internal Server Error`)
Terjadi jika OpenRouter/LLM mengalami gangguan atau output tidak dapat diparsing.
```json
{
  "detail": "Internal Server Error"
}
```

---

## 3. Daftar Endpoint

---

### 3.1. `POST /api/v1/clusters/recommend-stream` (Streaming SSE Onboarding)

#### 🎯 Deskripsi
Endpoint utama onboarding siswa dengan kapabilitas **Server-Sent Events (SSE)**.
Mengalirkan progres evaluasi profil keminatan siswa secara real-time, lalu memancarkan node **Knowledge Cluster** (payung rumpun keilmuan, 1–5 rumpun) dan **Major Node** (5 jurusan rekomendasi dengan foreign key `cluster_id`) satu per satu ke frontend untuk disimpan langsung ke SQLite/IndexedDB (Dexie.js).

##### 🏗️ Hirarki Graf:
1. **Knowledge Cluster (Rumpun Keilmuan)**: Payung visual utama (misal: "Teknologi & Rekayasa", "Bisnis & Manajemen") yang menyambut siswa di dashboard. Memiliki atribut `major_group` berisi list ID `major_node`.
2. **Major Node (Jurusan)**: Node anak di bawah rumpun yang mereferensikan `cluster_id`. Saat siswa mengklik salah satu rumpun, frontend langsung membuka jurusan-jurusan di bawahnya dari IndexedDB lokal tanpa perlu panggil API ulang.

---

#### 🌐 HTTP Request
- **Method**: `POST`
- **URL**: `${VITE_API_BASE_URL}/clusters/recommend-stream` (atau `https://api.nyomanyogi.my.id/api/v1/clusters/recommend-stream`)
- **Headers**:
  ```http
  Content-Type: application/json
  Accept: text/event-stream
  ```

---

#### 📥 Request Body
Berupa JSON object `InputKeminatan`:

```json
{
  "minat": "Tertarik dengan teknologi, coding, artificial intelligence, dan robotika",
  "nilai": {
    "matematika": 90,
    "ipa": 85,
    "informatika": 92
  }
}
```

---

#### 📤 SSE Response Envelope
Format pesan Server-Sent Events dikirim per baris `data: <JSON>\n\n` dengan struktur konsisten:

```json
{
  "type": "status" | "cluster" | "major" | "done" | "error",
  "data": { ... }
}
```

##### 1. Event `type: "status"` (Progress Tahapan)
Memberikan umpan balik loading interaktif untuk UI:
```json
data: {"type": "status", "data": {"stage": "analyzing", "message": "Menganalisis keminatan dan nilai mata pelajaran siswa...", "progress": 15}}

data: {"type": "status", "data": {"stage": "generating_majors", "message": "Menghasilkan 5 jurusan rekomendasi...", "progress": 45}}

data: {"type": "status", "data": {"stage": "clustering", "message": "Mengelompokkan jurusan ke dalam rumpun keilmuan...", "progress": 75}}

data: {"type": "status", "data": {"stage": "assembling", "message": "Merakit visualisasi graf rumpun keilmuan...", "progress": 90}}
```

##### 2. Event `type: "cluster"` (KnowledgeCluster Node)
Dipancarkan untuk setiap rumpun keilmuan yang terbentuk (1–5 node):
```json
data: {"type": "cluster", "data": {"id": "11111111-1111-4111-8111-111111111111", "cluster_name": "Teknologi & Rekayasa", "circle_color": "#4F46E5", "major_group": ["aaaaaa11-1111-4111-8111-111111111111", "aaaaaa22-2222-4222-8222-222222222222"]}}
```

##### 3. Event `type: "major"` (MajorNode)
Dipancarkan untuk setiap jurusan (5 node). Setiap node memiliki `cluster_id` yang terhubung ke induknya dan warna lingkaran mandiri:
```json
data: {"type": "major", "data": {"id": "aaaaaa11-1111-4111-8111-111111111111", "cluster_id": "11111111-1111-4111-8111-111111111111", "major_name": "Teknik Informatika", "circle_color": "#06B6D4", "child_id": null}}
```

##### 4. Event `type: "done"` (Sinyal Selesai)
```json
data: {"type": "done", "data": {"clusters_count": 2, "majors_count": 5, "message": "Rekomendasi rumpun keilmuan dan jurusan berhasil dibuat."}}
```

##### 5. Event `type: "error"` (Jika Terjadi Kendala)
```json
data: {"type": "error", "data": {"message": "Pesan kendala teknis..."}}
```

---

#### 💻 Contoh Konsumsi Frontend (JavaScript / React + Dexie.js)
```javascript
import { db } from '../db'; // Dexie database instance

export async function fetchClustersStream(profile, onProgress) {
  const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/clusters/recommend-stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(profile),
  });

  if (!response.body) throw new Error('ReadableStream tidak didukung');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n\n');
    buffer = lines.pop() || '';

    for (const block of lines) {
      const trimmed = block.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const event = JSON.parse(trimmed.replace(/^data:\s*/, ''));

      if (event.type === 'status') {
        onProgress?.(event.data);
      } else if (event.type === 'cluster') {
        await db.knowledge_clusters.put(event.data);
      } else if (event.type === 'major') {
        await db.major_nodes.put(event.data);
      } else if (event.type === 'done') {
        console.log('Graf onboarding selesai disimpan ke IndexedDB!', event.data);
      } else if (event.type === 'error') {
        throw new Error(event.data.message);
      }
    }
  }
}
```

---

### 3.2. `POST /api/v1/clusters/recommend` (Fallback Sync Onboarding)

#### 🎯 Deskripsi
Fallback endpoint berbasis synchronous JSON request-response standar (tanpa streaming) yang langsung mengembalikan bundle data lengkap rumpun keilmuan dan jurusannya.

---

#### 🌐 HTTP Request
- **Method**: `POST`
- **URL**: `${VITE_API_BASE_URL}/clusters/recommend`
- **Headers**:
  ```http
  Content-Type: application/json
  Accept: application/json
  ```

---

#### 📤 Response Body (`200 OK`)
```json
{
  "clusters": [
    {
      "id": "11111111-1111-4111-8111-111111111111",
      "cluster_name": "Teknologi & Rekayasa",
      "circle_color": "#4F46E5",
      "major_group": [
        "aaaaaa11-1111-4111-8111-111111111111",
        "aaaaaa22-2222-4222-8222-222222222222",
        "aaaaaa33-3333-4333-8333-333333333333"
      ]
    },
    {
      "id": "22222222-2222-4222-8222-222222222222",
      "cluster_name": "Bisnis & Manajemen",
      "circle_color": "#D97706",
      "major_group": [
        "aaaaaa44-4444-4444-8444-444444444444",
        "aaaaaa55-5555-4555-8555-555555555555"
      ]
    }
  ],
  "majors": [
    {
      "id": "aaaaaa11-1111-4111-8111-111111111111",
      "cluster_id": "11111111-1111-4111-8111-111111111111",
      "major_name": "Teknik Informatika",
      "circle_color": "#06B6D4",
      "child_id": null
    },
    {
      "id": "aaaaaa22-2222-4222-8222-222222222222",
      "cluster_id": "11111111-1111-4111-8111-111111111111",
      "major_name": "Sistem Informasi",
      "circle_color": "#10B981",
      "child_id": null
    },
    {
      "id": "aaaaaa33-3333-4333-8333-333333333333",
      "cluster_id": "11111111-1111-4111-8111-111111111111",
      "major_name": "Sains Data",
      "circle_color": "#8B5CF6",
      "child_id": null
    },
    {
      "id": "aaaaaa44-4444-4444-8444-444444444444",
      "cluster_id": "22222222-2222-4222-8222-222222222222",
      "major_name": "Manajemen Bisnis",
      "circle_color": "#EC4899",
      "child_id": null
    },
    {
      "id": "aaaaaa55-5555-4555-8555-555555555555",
      "cluster_id": "22222222-2222-4222-8222-222222222222",
      "major_name": "Akuntansi",
      "circle_color": "#F59E0B",
      "child_id": null
    }
  ]
}
```

---

### 3.3. `POST /api/v1/majors/recommend` (Legacy Fallback)

#### 🎯 Deskripsi
Menganalisis minat serta nilai mata pelajaran akhir siswa secara **dinamis** (contoh: `matematika`, `fisika`, `kimia`, `sosiologi`, `ekonomi`, `bahasa inggris`, dsb.), kemudian menghasilkan **2 hingga 6 pilihan rekomendasi jurusan kuliah** dalam bentuk visual node (`MajorNode`).

##### Aturan Nilai & Normalisasi Dinamis:
1. **Dinamis & Fleksibel**: Siswa dapat menginput mata pelajaran apapun sesuai peminatan SMA/SMK mereka. Tidak ada mata pelajaran wajib tertentu.
2. **Batasan Jumlah Mata Pelajaran**: Minimal **3** dan maksimal **10** mata pelajaran yang siswa percaya diri dengan nilainya.
3. **Rentang Nilai**: Setiap mata pelajaran bernilai integer antara **0 hingga 100**.
4. **Normalisasi Lowercase Otomatis**: Backend secara otomatis menormalisasi semua nama mata pelajaran menjadi huruf kecil murni (*lowercase*) dan memotong spasi luar (`"Fisika"` → `"fisika"`, `"  KIMIA  "` → `"kimia"`).

Node-node ini siap disimpan ke dalam state frontend atau SQLite/IndexedDB lokal untuk mendukung kapabilitas offline.

---

#### 🌐 HTTP Request
- **Method**: `POST`
- **URL**: `${VITE_API_BASE_URL}/majors/recommend` (atau `https://api.nyomanyogi.my.id/api/v1/majors/recommend`)
- **Headers**:
  ```http
  Content-Type: application/json
  Accept: application/json
  ```

---

#### 📥 Request Body
Berupa JSON object sesuai skema `InputKeminatan`:

| Field | Tipe Data | Wajib | Keterangan & Validasi |
| :--- | :--- | :--- | :--- |
| `minat` | `string` | Ya | Teks deskripsi minat, hobi, atau bakat siswa (minimal 1 karakter). |
| `nilai` | `object` (`dict[string, integer]`) | Ya | Objek nilai mata pelajaran dinamis (**minimal 3, maksimal 10 mapel**, skor `0` s.d. `100`). Key otomatis dinormalisasi ke lowercase oleh backend. |

##### Contoh Request Payload:
```json
{
  "minat": "Saya suka merakit komputer, bermain logika puzzle, dan tertarik membuat game serta kecerdasan buatan.",
  "nilai": {
    "matematika": 88,
    "fisika": 82,
    "bahasa inggris": 90,
    "informatika": 95
  }
}
```

---

#### 📤 Response Body (Success: `200 OK`)
Mengembalikan **JSON Array** berisi 2 hingga 6 objek `MajorNode`.

##### Struktur Field Tiap `MajorNode`:
| Field | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `string` | UUID v4 unik untuk identifikasi node (contoh: `e4b1a2c3-...`). |
| `major_name` | `string` | Nama resmi jurusan kuliah dalam bahasa Indonesia (contoh: `"Teknik Informatika"`). |
| `circle_color` | `string` | Kode hex warna lingkaran kurasi untuk visualisasi UI (contoh: `"#4F46E5"`). |
| `child_id` | `string` atau `null` | UUID node anak pertama (bernilai `null` pada tahap inisiasi ini, akan terisi saat pohon minicase dibuat). |

##### Contoh Response Payload (`200 OK`):
```json
[
  {
    "id": "7b8d4f6c-8519-4a0b-8d77-16d2f31a1001",
    "major_name": "Teknik Informatika",
    "circle_color": "#4F46E5",
    "child_id": null
  },
  {
    "id": "9a3e2b10-72c4-48f1-bfa6-28e4a90b2002",
    "major_name": "Sistem Informasi",
    "circle_color": "#06B6D4",
    "child_id": null
  },
  {
    "id": "3c5f8e12-61d9-4b7e-9082-37f5d81c3003",
    "major_name": "Sains Data",
    "circle_color": "#10B981",
    "child_id": null
  },
  {
    "id": "1d8a4b90-50e8-46a2-a1f7-49a6c72d4004",
    "major_name": "Teknologi Game",
    "circle_color": "#F59E0B",
    "child_id": null
  }
]
```

---

#### ⚠️ Kemungkinan Respon Error

##### Kasus 1: Nilai Melebihi Batas Rentang 0–100 (`422 Unprocessable Entity`)
- **Kondisi**: Ada skor yang bernilai negatif (< 0) atau lebih dari 100 (> 100).
```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "nilai"],
      "msg": "Value error, Nilai untuk mata pelajaran 'fisika' harus berada di rentang 0 hingga 100 (diterima: 120)."
    }
  ]
}
```

##### Kasus 2: Jumlah Mata Pelajaran Kurang dari 3 atau Lebih dari 10 (`422 Unprocessable Entity`)
- **Kondisi**: Siswa hanya mengirimkan 2 mata pelajaran (misal hanya matematika dan fisika).
```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "nilai"],
      "msg": "Value error, Minimal harus menyertakan 3 mata pelajaran yang dipercaya diri (diberikan: 2)."
    }
  ]
}
```

##### Kasus 3: Duplikasi Key Setelah Normalisasi Lowercase (`422 Unprocessable Entity`)
- **Kondisi**: Mengirimkan `"Fisika"` dan `"fisika"` sekaligus di dalam objek nilai.
```json
{
  "detail": [
    {
      "type": "value_error",
      "loc": ["body", "nilai"],
      "msg": "Value error, Duplikasi mata pelajaran terdeteksi setelah normalisasi: 'fisika'."
    }
  ]
}
```

##### Kasus 4: Kesalahan Jaringan / Server Backend (`500 Internal Server Error`)
- **Kondisi**: Terjadi kendala koneksi ke LLM OpenRouter atau kuota habis.
```json
{
  "detail": "Gagal mem-parsing rekomendasi jurusan dari LLM: ..."
}
```

---

### 3.4. `POST /api/v1/recommendation-results`

#### 🎯 Deskripsi
Menyusun dan mengurutkan peringkat (*leaderboard*) rekomendasi jurusan siswa berdasarkan `matching_percentage` dari nilai tertinggi ke terendah secara *descending*.

Endpoint ini menggabungkan:
1. **`major_nodes`**: Daftar seluruh jurusan rekomendasi awal yang tersimpan di SQLite lokal / state frontend pengguna.
2. **`previews`**: Daftar hasil evaluasi trial jurusan yang telah diselesaikan oleh siswa (memuat skor kecocokan, narasi preview, dan jalur karir).
3. **`profile`** *(opsional)*: Data minat dan nilai rapor siswa dari onboarding.

##### Aturan Bisnis & Perilaku Backend:
- **Jurusan yang Selesai (`is_completed: true`)**:
  - `matching_percentage` diambil dari preview hasil trial (jika terdapat beberapa preview untuk jurusan yang sama, diambil skor tertinggi).
  - Objek `preview` lengkap dilampirkan (termasuk narasi rangkuman dan 1–4 `career_paths`).
  - Backend mengevaluasi 1 hingga 3 badge mata pelajaran SMA/SMK yang paling relevan (`subject_relevances`) secara cerdas via LLM jika profil nilai siswa disertakan.
- **Jurusan yang Belum Dikerjakan (`is_completed: false`)**:
  - `matching_percentage` otomatis bernilai `0`.
  - `preview` bernilai `null` dan `subject_relevances` berupa array kosong `[]`.
  - Secara otomatis diurutkan di bagian bawah *leaderboard*.
- **Toleransi Gangguan (Graceful Fallback)**: Jika LLM gagal saat mengevaluasi relevansi mata pelajaran, backend tetap berhasil mengembalikan response `200 OK` dengan melakukan fallback otomatis ke mata pelajaran dengan nilai tertinggi siswa.

---

#### 🌐 HTTP Request
- **Method**: `POST`
- **URL**: `${VITE_API_BASE_URL}/recommendation-results` (atau `https://api.nyomanyogi.my.id/api/v1/recommendation-results`)
- **Headers**:
  ```http
  Content-Type: application/json
  Accept: application/json
  ```

---

#### 📥 Request Body
Berupa JSON object sesuai skema `RecommendationResultsRequest`:

| Field | Tipe Data | Wajib | Keterangan & Validasi |
| :--- | :--- | :--- | :--- |
| `major_nodes` | `array` of `MajorNode` | Ya | Daftar semua node jurusan rekomendasi yang ada di lokal pengguna (bisa `[]`). |
| `previews` | `array` of `MajorNodePreview` | Ya | Daftar objek preview hasil trial yang telah diselesaikan (bisa `[]`). |
| `profile` | `object` (`InputKeminatan`) atau `null` | Tidak | Profil minat dan nilai siswa dari onboarding (opsional, digunakan untuk analisis badge mapel relevan). |

##### Contoh Request Payload:
```json
{
  "major_nodes": [
    {
      "id": "7b8d4f6c-8519-4a0b-8d77-16d2f31a1001",
      "major_name": "Teknik Informatika",
      "circle_color": "#4F46E5",
      "child_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d"
    },
    {
      "id": "9a3e2b10-72c4-48f1-bfa6-28e4a90b2002",
      "major_name": "Sistem Informasi",
      "circle_color": "#06B6D4",
      "child_id": null
    }
  ],
  "previews": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "major_node_id": "7b8d4f6c-8519-4a0b-8d77-16d2f31a1001",
      "preview": "Kamu menunjukkan potensi analitis dan ketertarikan yang sangat tinggi dalam pemecahan masalah komputasi serta logika algoritma.",
      "matching_percentage": 92,
      "career_paths": [
        {
          "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          "major_node_preview_id": "550e8400-e29b-41d4-a716-446655440000",
          "title": "Software Engineer",
          "detail": "Merancang, mengembangkan, dan memelihara arsitektur perangkat lunak skala besar serta sistem aplikasi modern."
        },
        {
          "id": "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
          "major_node_preview_id": "550e8400-e29b-41d4-a716-446655440000",
          "title": "AI Specialist",
          "detail": "Membangun model machine learning dan kecerdasan buatan untuk otomatisasi cerdas."
        }
      ]
    }
  ],
  "profile": {
    "minat": "Saya suka merakit komputer, bermain logika puzzle, dan tertarik membuat game serta kecerdasan buatan.",
    "nilai": {
      "matematika": 88,
      "fisika": 82,
      "bahasa inggris": 90
    }
  }
}
```

---

#### 📤 Response Body (Success: `200 OK`)
Mengembalikan **JSON Array** berisi objek `MajorRecommendationResult` yang telah diurutkan dari skor `matching_percentage` tertinggi ke terendah.

##### Struktur Field Tiap `MajorRecommendationResult`:
| Field | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `string` | UUID v4 node jurusan (`major_node_id`). |
| `major_name` | `string` | Nama jurusan rekomendasi. |
| `circle_color` | `string` | Kode hex warna lingkaran (`#4F46E5`). |
| `child_id` | `string` atau `null` | UUID node anak pertama minicase (jika ada). |
| `matching_percentage` | `integer` | Persentase kecocokan keminatan (`0` s.d. `100`). Bernilai `0` jika jurusan belum selesai dikerjakan. |
| `is_completed` | `boolean` | `true` jika siswa telah menyelesaikan trial jurusan ini, `false` jika belum. |
| `preview` | `object` atau `null` | Objek detail preview lengkap (narasi & karir) jika `is_completed: true`, atau `null` jika belum. |
| `subject_relevances` | `array` | Daftar 1 hingga 3 badge mata pelajaran SMA/SMK yang paling relevan untuk jurusan tersebut (format lowercase). |

##### Struktur Objek `subject_relevances`:
| Field | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `string` | UUID v4 unik badge relevansi. |
| `major_node_id` | `string` | UUID v4 jurusan terkait. |
| `subject_name` | `string` | Nama mata pelajaran relevan dalam format lowercase murni (misal: `"matematika"`, `"bahasa inggris"`, `"fisika"`). Dibatasi 1 hingga 3 mata pelajaran paling relevan. |

##### Contoh Response Payload (`200 OK`):
```json
[
  {
    "id": "7b8d4f6c-8519-4a0b-8d77-16d2f31a1001",
    "major_name": "Teknik Informatika",
    "circle_color": "#4F46E5",
    "child_id": "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
    "matching_percentage": 92,
    "is_completed": true,
    "preview": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "major_node_id": "7b8d4f6c-8519-4a0b-8d77-16d2f31a1001",
      "preview": "Kamu menunjukkan potensi analitis dan ketertarikan yang sangat tinggi dalam pemecahan masalah komputasi serta logika algoritma.",
      "matching_percentage": 92,
      "career_paths": [
        {
          "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
          "major_node_preview_id": "550e8400-e29b-41d4-a716-446655440000",
          "title": "Software Engineer",
          "detail": "Merancang, mengembangkan, dan memelihara arsitektur perangkat lunak skala besar serta sistem aplikasi modern."
        },
        {
          "id": "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
          "major_node_preview_id": "550e8400-e29b-41d4-a716-446655440000",
          "title": "AI Specialist",
          "detail": "Membangun model machine learning dan kecerdasan buatan untuk otomatisasi cerdas."
        }
      ]
    },
    "subject_relevances": [
      {
        "id": "c3a1d95e-1823-4e44-88aa-32b04f128011",
        "major_node_id": "7b8d4f6c-8519-4a0b-8d77-16d2f31a1001",
        "subject_name": "matematika"
      },
      {
        "id": "f8c2b74a-9311-419b-bb12-91e84a203922",
        "major_node_id": "7b8d4f6c-8519-4a0b-8d77-16d2f31a1001",
        "subject_name": "bahasa inggris"
      }
    ]
  },
  {
    "id": "9a3e2b10-72c4-48f1-bfa6-28e4a90b2002",
    "major_name": "Sistem Informasi",
    "circle_color": "#06B6D4",
    "child_id": null,
    "matching_percentage": 0,
    "is_completed": false,
    "preview": null,
    "subject_relevances": []
  }
]
```

---

#### ⚠️ Kemungkinan Respon Error

##### Kasus 1: Format UUID Tidak Valid (`422 Unprocessable Entity`)
- **Kondisi**: ID node bukan UUID v4 yang sah.
```json
{
  "detail": [
    {
      "type": "string_pattern_mismatch",
      "loc": ["body", "major_nodes", 0, "id"],
      "msg": "String should match pattern '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'",
      "input": "bukan-uuid"
    }
  ]
}
```

##### Kasus 2: Nilai Persentase Preview di Luar Rentang (`422 Unprocessable Entity`)
- **Kondisi**: Objek preview dikirim dengan `matching_percentage` bernilai negatif atau melebihi 100.
```json
{
  "detail": [
    {
      "type": "less_than_equal",
      "loc": ["body", "previews", 0, "matching_percentage"],
      "msg": "Input should be less than or equal to 100",
      "input": 150
    }
  ]
}
```

##### Kasus 3: Kesalahan Server Backend (`500 Internal Server Error`)
- **Kondisi**: Terjadi kesalahan internal yang tidak tertangani di backend.
```json
{
  "detail": "Internal Server Error"
}
```

---

### 3.5. `POST /api/v1/minicases/generate`

#### 🎯 Deskripsi
Men-generate rantai pohon studi kasus (*minicase nodes*) interaktif berdasarkan jurusan kuliah yang dipilih oleh siswa di frontend.

##### Alur & Karakteristik Penting:
1. **Analisis Jurusan oleh AI**: Backend mengirimkan `major_name` (dan profil minat/nilai siswa jika disertakan) ke LLM untuk merancang 3 hingga 5 mata kuliah dasar yang paling esensial.
2. **Sepasang Node per Mata Kuliah**: Untuk setiap mata kuliah, AI menghasilkan tepat 2 studi kasus:
   - **Node Pilihan Ganda (`multiple_choice`)**: Pertanyaan aplikatif pengantar konsep dengan 4 opsi dan 1 kunci jawaban benar.
   - **Node Esai Reflektif (`essay`)**: Skenario dilema atau pemecahan masalah dunia nyata dengan kriteria penilaian (`evaluation_hint`).
   - Total node yang dihasilkan berkisar antara **6 hingga 10 node**.
3. **Penomoran Node (`minicase_number`)**: Dimulai dari urutan **2 hingga maksimal 11**.
   > 💡 **Penting**: Nomor **1** dialokasikan khusus untuk panduan pengerjaan (*Rules Pengerjaan*) yang dibuat dan dikelola langsung oleh frontend di SQLite/state lokal. Node pertama yang dikembalikan backend (`response[0]`) memiliki `minicase_number: 2`.
4. **Relasi Parent-Child (1:N)**: Setiap node memiliki `parent_id` yang merujuk ke `major_id` jurusan induk, serta warna lingkaran `circle_color` yang seragam.
5. **Rantai Pointer Navigasi**: Node dihubungkan secara sekuensial (`child_id` node ke-$i$ menunjuk ke `id` node ke-$(i+1)$). Node terakhir memiliki `is_parent: false` dan `child_id: null`.
6. **Kesiapan Offline**: Struktur data response siap disimpan langsung ke penyimpanan lokal (SQLite / IndexedDB / Dexie.js).

---

#### 🌐 HTTP Request
- **Method**: `POST`
- **URL**: `${VITE_API_BASE_URL}/minicases/generate` (atau `https://api.nyomanyogi.my.id/api/v1/minicases/generate`)
- **Headers**:
  ```http
  Content-Type: application/json
  Accept: application/json
  ```

---

#### 📥 Request Body
Berupa JSON object sesuai skema `GenerateMinicasesRequest`:

| Field | Tipe Data | Wajib | Keterangan & Validasi |
| :--- | :--- | :--- | :--- |
| `major_id` | `string` | Ya | UUID v4 node jurusan (`major_node`) yang dipilih siswa. |
| `major_name` | `string` | Ya | Nama resmi jurusan kuliah (minimal 1 karakter). |
| `circle_color` | `string` | Ya | Kode hex warna lingkaran jurusan induk (contoh: `"#4F46E5"`). |
| `profile` | `object` (`InputKeminatan`) atau `null` | Tidak | Profil minat dan nilai siswa dari onboarding (opsional, untuk personalisasi soal trial). |

##### Contoh Request Payload:
```json
{
  "major_id": "2c4059b4-c692-4429-a1dc-56e004ba5297",
  "major_name": "Teknik Informatika",
  "circle_color": "#4F46E5",
  "profile": {
    "minat": "Saya suka pemrograman web, robotika, dan analisis data",
    "nilai": {
      "matematika": 88,
      "fisika": 85,
      "bahasa inggris": 90
    }
  }
}
```

---

#### 📤 Response Body (Success: `200 OK`)
Mengembalikan **JSON Array** berisi 6 hingga 10 objek `MinicaseNode` yang saling terhubung secara berurutan.

##### Struktur Field Tiap `MinicaseNode`:
| Field | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `string` | UUID v4 unik identitas node minicase. |
| `parent_id` | `string` | UUID v4 merujuk ke jurusan induk (`major_id`). |
| `minicase_number` | `integer` | Nomor urut node trial (**2 s.d. 11**, nomor 1 untuk rules di frontend). |
| `minicase_title` | `string` | Judul interaktif kontekstual (maksimal 2 kata, misal: `"Logika Coding"`). |
| `subject_name` | `string` | Nama mata kuliah dasar pengelompok (misal: `"Dasar Pemrograman"`). |
| `node_type` | `string` | Tipe soal: `"multiple_choice"` atau `"essay"`. |
| `question` | `string` | Skenario studi kasus atau pertanyaan interaktif. |
| `options` | `array` of `string` atau `null` | Daftar 4 opsi jawaban (khusus `multiple_choice`, bernilai `null` untuk `essay`). |
| `correct_answer` | `string` atau `null` | Kunci jawaban benar (khusus `multiple_choice`, bernilai `null` untuk `essay`). |
| `evaluation_hint` | `string` atau `null` | Rubrik/pedoman penilaian AI (khusus `essay`, bernilai `null` untuk `multiple_choice`). |
| `is_parent` | `boolean` | `true` jika memiliki node berikutnya, `false` jika merupakan node terakhir. |
| `circle_color` | `string` | Kode hex warna lingkaran (mengikuti jurusan induk). |
| `is_done` | `boolean` | Status penyelesaian oleh pengguna (default `false`). |
| `child_id` | `string` atau `null` | UUID node anak berikutnya (`null` pada node terakhir). |

##### Contoh Response Payload (`200 OK`):
```json
[
  {
    "id": "e1f2a3b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b",
    "parent_id": "2c4059b4-c692-4429-a1dc-56e004ba5297",
    "minicase_number": 2,
    "minicase_title": "Logika Coding",
    "subject_name": "Dasar Pemrograman",
    "node_type": "multiple_choice",
    "question": "Sebuah toko ingin memberikan diskon 10% jika total belanja minimal Rp100.000 atau pelanggan memiliki kartu member. Manakah ekspresi logika pemrograman yang tepat?",
    "options": [
      "total >= 100000 AND has_member == True",
      "total >= 100000 OR has_member == True",
      "total > 100000 AND has_member == False",
      "total == 100000 OR has_member == False"
    ],
    "correct_answer": "total >= 100000 OR has_member == True",
    "evaluation_hint": null,
    "is_parent": true,
    "circle_color": "#4F46E5",
    "is_done": false,
    "child_id": "f2a3b4c5-6d7e-8f9a-0b1c-2d3e4f5a6b7c"
  },
  {
    "id": "f2a3b4c5-6d7e-8f9a-0b1c-2d3e4f5a6b7c",
    "parent_id": "2c4059b4-c692-4429-a1dc-56e004ba5297",
    "minicase_number": 3,
    "minicase_title": "Debugging Kritis",
    "subject_name": "Dasar Pemrograman",
    "node_type": "essay",
    "question": "Aplikasi e-commerce yang kamu kembangkan tiba-tiba crash 30 menit sebelum peluncuran besar, dan rekan tim mulai panik. Langkah konkret apa yang akan kamu lakukan untuk mengidentifikasi dan menangani masalah tersebut secara tenang dan terstruktur?",
    "options": null,
    "correct_answer": null,
    "evaluation_hint": "Menilai ketenangan, kemampuan membaca error log/stack trace, isolasi perubahan kode terakhir (git revert/rollback), serta komunikasi tim yang efektif.",
    "is_parent": true,
    "circle_color": "#4F46E5",
    "is_done": false,
    "child_id": "a3b4c5d6-7e8f-9a0b-1c2d-3e4f5a6b7c8d"
  },
  {
    "id": "a3b4c5d6-7e8f-9a0b-1c2d-3e4f5a6b7c8d",
    "parent_id": "2c4059b4-c692-4429-a1dc-56e004ba5297",
    "minicase_number": 4,
    "minicase_title": "Query SQL",
    "subject_name": "Basis Data",
    "node_type": "multiple_choice",
    "question": "Perintah SQL mana yang digunakan untuk menampilkan nama mahasiswa yang memiliki IPK di atas 3.5?",
    "options": [
      "SELECT nama FROM mahasiswa WHERE ipk > 3.5;",
      "FIND nama IN mahasiswa IF ipk > 3.5;",
      "GET mahasiswa.nama WHERE ipk > 3.5;",
      "CHOOSE nama FROM mahasiswa WITH ipk > 3.5;"
    ],
    "correct_answer": "SELECT nama FROM mahasiswa WHERE ipk > 3.5;",
    "evaluation_hint": null,
    "is_parent": false,
    "circle_color": "#4F46E5",
    "is_done": false,
    "child_id": null
  }
]
```

---

#### ⚠️ Kemungkinan Respon Error

##### Kasus 1: Format UUID `major_id` Tidak Valid (`422 Unprocessable Entity`)
- **Kondisi**: ID jurusan bukan UUID v4 yang sah.
```json
{
  "detail": [
    {
      "type": "string_pattern_mismatch",
      "loc": ["body", "major_id"],
      "msg": "String should match pattern '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'",
      "input": "bukan-uuid"
    }
  ]
}
```

##### Kasus 2: Warna Hex Tidak Valid (`422 Unprocessable Entity`)
- **Kondisi**: Warna yang dikirim bukan format hex `#RGB` atau `#RRGGBB`.
```json
{
  "detail": [
    {
      "type": "string_pattern_mismatch",
      "loc": ["body", "circle_color"],
      "msg": "String should match pattern '^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$'",
      "input": "blue"
    }
  ]
}
```

##### Kasus 3: Kesalahan Server / LLM (`500 Internal Server Error`)
- **Kondisi**: Terjadi kendala timeout atau parsing JSON output LLM gagal.
```json
{
  "detail": "Gagal mem-parsing minicases dari LLM: ..."
}
```

### 3.6. `POST /api/v1/minicases/generate-stream` (Streaming Server-Sent Events)

#### 🎯 Deskripsi
Men-generate rantai node minicase secara **streaming real-time** menggunakan protokol **Server-Sent Events (SSE)** (`text/event-stream`).

Endpoint ini dirancang khusus untuk mengoptimasi *User Experience (UX)* dan menghilangkan waktu tunggu/layar kosong (*blank loading*) yang biasanya terjadi saat LLM men-generate batch soal besar:
1. **Mengapa Menggunakan Endpoint Streaming?**: Generasi 6–10 node trial secara sekuensial memakan waktu ~30–40 detik. Dengan endpoint ini, frontend menerima status berpikir (*AI thinking status*) secara live sejak detik ke-1.
2. **Pengiriman Cepat Node Pertama (Early Interaction)**: Backend memparalelkan pembuatan studi kasus. Node mata kuliah pertama (**Node #2: MCQ** dan **Node #3: Esai**) selesai dan dikirim ke frontend dalam **~5–6 detik**. Pengguna dapat langsung berinteraksi dan membaca soal pertama, sementara node berikutnya (#4 s.d. #11) terus di-stream di latar belakang tanpa mengganggu pengerjaan.
3. **Format Envelope Standar**: Setiap potongan event dikirim dalam format JSON envelope tunggal dengan field `type` (`status`, `node`, `done`, `error`) dan payload `data`.
4. **Offline-Ready & Idempoten**: Data yang dikirim pada event `node` adalah objek `MinicaseNode` utuh yang siap disimpan langsung ke SQLite/IndexedDB browser (`db.minicases.put(event.data)`).

---

#### 🌐 HTTP Request
- **Method**: `POST`
- **URL**: `${VITE_API_BASE_URL}/minicases/generate-stream` (atau `https://api.nyomanyogi.my.id/api/v1/minicases/generate-stream`)
- **Headers**:
  ```http
  Content-Type: application/json
  Accept: text/event-stream
  ```

---

#### 📥 Request Body
Menggunakan payload yang **sama persis** dengan endpoint non-streaming `POST /api/v1/minicases/generate` (`GenerateMinicasesRequest`):

| Field | Tipe Data | Wajib | Keterangan & Validasi |
| :--- | :--- | :--- | :--- |
| `major_id` | `string` | Ya | UUID v4 node jurusan (`major_node`) yang dipilih siswa. |
| `major_name` | `string` | Ya | Nama resmi jurusan kuliah (minimal 1 karakter). |
| `circle_color` | `string` | Ya | Kode hex warna lingkaran jurusan induk (contoh: `"#4F46E5"`). |
| `profile` | `object` (`InputKeminatan`) atau `null` | Tidak | Profil minat dan nilai siswa dari onboarding (opsional). |

##### Contoh Request Payload:
```json
{
  "major_id": "2c4059b4-c692-4429-a1dc-56e004ba5297",
  "major_name": "Teknik Informatika",
  "circle_color": "#4F46E5",
  "profile": {
    "minat": "Saya suka pemrograman web, robotika, dan analisis data",
    "nilai": {
      "matematika": 88,
      "fisika": 85,
      "bahasa inggris": 90
    }
  }
}
```

---

#### 📤 Response Streaming Body (`200 OK`, `text/event-stream`)
Backend mengembalikan stream data persisten dengan header:
- `Content-Type: text/event-stream`
- `Cache-Control: no-cache`
- `Connection: keep-alive`
- `X-Accel-Buffering: no`

Setiap event dikirim dalam format standar Server-Sent Events:
```http
data: {"type": "<status|node|done|error>", "data": <payload>}

```

##### 1. Event `type: "status"` (Pembaruan Progres / AI Thinking)
Dikirim berkala saat backend menganalisis kurikulum atau merancang studi kasus mata kuliah.
- **Payload `data`**:
  - `stage` (`string`): Kode tahapan (`"analyzing"`, `"curriculum_ready"`, `"generating_case"`).
  - `message` (`string`): Teks ramah pengguna untuk ditampilkan pada progress bar / animasi thinking.
  - `progress` (`integer`): Persentase perkiraan progres (0–100).
  - `subjects` (`array[string]`, opsional): Daftar nama mata kuliah dasar yang ditemukan.

##### 2. Event `type: "node"` (Pengiriman Objek MinicaseNode)
Dikirim setiap kali satu node soal berhasil dirakit secara lengkap.
- **Payload `data`**: Objek `MinicaseNode` lengkap yang memuat `id`, `parent_id`, `minicase_number`, `minicase_title`, `subject_name`, `node_type`, `question`, `options`, `correct_answer`, `evaluation_hint`, `is_parent`, `circle_color`, `is_done`, dan `child_id`.

##### 3. Event `type: "done"` (Sinyal Selesai)
Dikirim saat seluruh rangkaian minicase selesai dirakit dan di-stream.
- **Payload `data`**:
  - `total_nodes` (`integer`): Jumlah total node yang berhasil dirakit (misal: 6).
  - `status` (`string`): `"completed"`.
  - `message` (`string`): `"Seluruh studi kasus berhasil digenerasi."`.

##### 4. Event `type: "error"` (Informasi Kegagalan)
Dikirim jika terjadi kendala kritis pada koneksi OpenRouter atau validasi kurikulum.
- **Payload `data`**:
  - `message` (`string`): Rincian pesan kesalahan.

---

#### 📋 Contoh Aliran Data Real-time (Raw Stream Chunks)

```http
data: {"type":"status","data":{"stage":"analyzing","message":"Menganalisis kurikulum dasar Teknik Informatika...","progress":10}}

data: {"type":"status","data":{"stage":"curriculum_ready","message":"Ditemukan 3 mata kuliah dasar inti.","subjects":["Dasar Pemrograman","Basis Data","Jaringan Komputer"],"progress":25}}

data: {"type":"status","data":{"stage":"generating_case","message":"Menyusun studi kasus #1: Dasar Pemrograman...","progress":46}}

data: {"type":"node","data":{"id":"e1f2a3b4-5c6d-7e8f-9a0b-1c2d3e4f5a6b","parent_id":"2c4059b4-c692-4429-a1dc-56e004ba5297","minicase_number":2,"minicase_title":"Logika Coding","subject_name":"Dasar Pemrograman","node_type":"multiple_choice","question":"Sebuah toko ingin memberikan diskon 10% jika total belanja minimal Rp100.000 atau pelanggan memiliki kartu member. Manakah ekspresi logika pemrograman yang tepat?","options":["total >= 100000 AND has_member == True","total >= 100000 OR has_member == True","total > 100000 AND has_member == False","total == 100000 OR has_member == False"],"correct_answer":"total >= 100000 OR has_member == True","evaluation_hint":null,"is_parent":true,"circle_color":"#4F46E5","is_done":false,"child_id":"f2a3b4c5-6d7e-8f9a-0b1c-2d3e4f5a6b7c"}}

data: {"type":"node","data":{"id":"f2a3b4c5-6d7e-8f9a-0b1c-2d3e4f5a6b7c","parent_id":"2c4059b4-c692-4429-a1dc-56e004ba5297","minicase_number":3,"minicase_title":"Debugging Kritis","subject_name":"Dasar Pemrograman","node_type":"essay","question":"Aplikasi e-commerce yang kamu kembangkan crash 30 menit sebelum peluncuran. Apa tindakan analisismu?","options":null,"correct_answer":null,"evaluation_hint":"Menilai ketenangan dan kemampuan isolasi bug.","is_parent":true,"circle_color":"#4F46E5","is_done":false,"child_id":"a3b4c5d6-7e8f-9a0b-1c2d-3e4f5a6b7c8d"}}

data: {"type":"status","data":{"stage":"generating_case","message":"Menyusun studi kasus #2: Basis Data...","progress":68}}

data: {"type":"node","data":{"id":"a3b4c5d6-7e8f-9a0b-1c2d-3e4f5a6b7c8d","parent_id":"2c4059b4-c692-4429-a1dc-56e004ba5297","minicase_number":4,"minicase_title":"Query SQL","subject_name":"Basis Data","node_type":"multiple_choice","question":"Perintah SQL untuk menampilkan data?","options":["SELECT","UPDATE","DELETE","INSERT"],"correct_answer":"SELECT","evaluation_hint":null,"is_parent":true,"circle_color":"#4F46E5","is_done":false,"child_id":"b4c5d6e7-8f9a-0b1c-2d3e-4f5a6b7c8d9e"}}

data: {"type":"node","data":{"id":"b4c5d6e7-8f9a-0b1c-2d3e-4f5a6b7c8d9e","parent_id":"2c4059b4-c692-4429-a1dc-56e004ba5297","minicase_number":5,"minicase_title":"Normalisasi Data","subject_name":"Basis Data","node_type":"essay","question":"Mengapa data redundan berbahaya?","options":null,"correct_answer":null,"evaluation_hint":"Menilai pemahaman anomali data.","is_parent":true,"circle_color":"#4F46E5","is_done":false,"child_id":"c5d6e7f8-9a0b-1c2d-3e4f-5a6b7c8d9e0f"}}

data: {"type":"done","data":{"total_nodes":6,"status":"completed","message":"Seluruh studi kasus berhasil digenerasi."}}
```

---

#### 💻 Contoh Pola Konsumsi di Frontend (JavaScript / Fetch Streaming)

```javascript
export async function streamMinicasesTree(payload, { onStatus, onNode, onDone, onError }) {
  const response = await fetch(`${BASE_URL}/minicases/generate-stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP Error: ${response.status}`);
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

      const event = JSON.parse(line.slice(6));
      switch (event.type) {
        case 'status':
          onStatus?.(event.data);
          break;
        case 'node':
          onNode?.(event.data); // Simpan langsung ke IndexedDB: await db.minicases.put(event.data)
          break;
        case 'done':
          onDone?.(event.data);
          break;
        case 'error':
          onError?.(event.data);
          break;
      }
    }
  }
}
```

---

### 3.7. `POST /api/v1/minicases/evaluate-essay`

#### 🎯 Deskripsi
Mengevaluasi jawaban esai reflektif siswa terhadap suatu studi kasus secara *real-time* menggunakan AI psikometrik.

Backend menilai jawaban siswa berdasarkan **rubrik penilaian (`evaluation_hint`)** yang melekat pada node soal tersebut, ke dalam 3 dimensi terukur:
1. **`analytical_fit` (Skor 1–5)**:
   Apakah cara siswa memecahkan masalah masuk akal, logis, terstruktur, dan sejalan dengan kriteria di `evaluation_hint`?
2. **`interest_signal` (Skor 1–5)**:
   Apakah nada emosional siswa menunjukkan antusiasme, rasa ingin tahu, inisiatif, atau ketertarikan terhadap bidang studi tersebut?
3. **`is_serious_attempt` (`true` / `false`)**:
   **Guardrail otomatis anti-spam**. Bernilai `true` jika siswa benar-benar berusaha merespons studi kasus. Bernilai `false` jika siswa hanya mengetik karakter acak (seperti *"asdfgh"*), kata penolakan/ketidakniatan (seperti *"gak tau"*, *"malas"*, *"lanjut aja"*, *"apa ya"*), atau jawaban yang sama sekali tidak berhubungan dengan konteks soal.

> 🛡️ **Aturan Penalti Otomatis**: Jika `is_serious_attempt == false`, backend secara otomatis memaksa skor `analytical_fit: 1` dan `interest_signal: 1`. Frontend dapat menggunakan flag ini untuk memberikan notifikasi edukatif: *"Jawabanmu belum relevan. Yuk, coba ceritakan solusimu agar minatmu terpetakan lebih akurat!"*.

---

#### 🌐 HTTP Request
- **Method**: `POST`
- **URL**: `${VITE_API_BASE_URL}/minicases/evaluate-essay` (atau `https://api.nyomanyogi.my.id/api/v1/minicases/evaluate-essay`)
- **Headers**:
  ```http
  Content-Type: application/json
  Accept: application/json
  ```

---

#### 📥 Request Body
Berupa JSON object sesuai skema `EssayEvaluationRequest`:

| Field | Tipe Data | Wajib | Keterangan & Validasi |
| :--- | :--- | :--- | :--- |
| `question` | `string` | Ya | Teks pertanyaan skenario studi kasus (min. 5 karakter). Diambil dari properti `node.question`. |
| `evaluation_hint` | `string` | Ya | Rubrik/kriteria penilaian (min. 3 karakter). Diambil dari properti `node.evaluation_hint`. |
| `user_answer` | `string` | Ya | Jawaban esai yang diketik oleh siswa (min. 1 karakter). |
| `minicase_id` | `string` atau `null` | Tidak | UUID v4 node minicase yang sedang dikerjakan (opsional, untuk tracing). |

##### Contoh Request Payload:
```json
{
  "question": "Aplikasi e-commerce yang kamu kembangkan tiba-tiba crash 30 menit sebelum peluncuran besar, dan rekan tim mulai panik. Langkah konkret apa yang akan kamu lakukan untuk mengidentifikasi dan menangani masalah tersebut secara tenang dan terstruktur?",
  "evaluation_hint": "Menilai ketenangan, kemampuan membaca error log/stack trace, isolasi perubahan kode terakhir (git revert/rollback), serta komunikasi tim yang efektif.",
  "user_answer": "Pertama saya akan menenangkan tim dan memeriksa log server untuk melihat stack trace error terakhir. Jika error disebabkan oleh commit terbaru, saya akan segera melakukan rollback ke versi stabil sebelumnya, lalu melakukan debugging terisolasi di staging.",
  "minicase_id": "f2a3b4c5-6d7e-8f9a-0b1c-2d3e4f5a6b7c"
}
```

---

#### 📤 Response Body (Success: `200 OK`)
Mengembalikan JSON object berupa `EssayEvaluationResult`:

| Field | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `analytical_fit` | `integer` | Skor kemampuan pemecahan masalah dan logika berpikir (skala **1 s.d. 5**). |
| `interest_signal` | `integer` | Skor antusiasme, rasa ingin tahu, dan resiliensi terhadap tantangan (skala **1 s.d. 5**). |
| `is_serious_attempt` | `boolean` | `true` jika siswa menjawab serius, `false` jika asal-asalan/penolakan. |

##### Contoh 1: Respon Berhasil (Jawaban Serius & Masuk Akal)
```json
{
  "analytical_fit": 5,
  "interest_signal": 5,
  "is_serious_attempt": true
}
```

##### Contoh 2: Respon Terkena Penalti Guardrail (Jawaban Asal-asalan)
Misal siswa mengirim `"user_answer": "gak tau malas mikir"`:
```json
{
  "analytical_fit": 1,
  "interest_signal": 1,
  "is_serious_attempt": false
}
```

---

#### ⚠️ Kemungkinan Respon Error

##### Kasus 1: Jawaban Dibiarkan Kosong (`422 Unprocessable Entity`)
- **Kondisi**: `user_answer` dikirim berupa string kosong `""`.
```json
{
  "detail": [
    {
      "type": "string_too_short",
      "loc": ["body", "user_answer"],
      "msg": "String should have at least 1 character",
      "input": "",
      "ctx": {
        "min_length": 1
      }
    }
  ]
}
```

##### Kasus 2: Format `minicase_id` Bukan UUID Valid (`422 Unprocessable Entity`)
- **Kondisi**: ID node yang dikirim tidak sesuai pola regex UUID v4.
```json
{
  "detail": [
    {
      "type": "string_pattern_mismatch",
      "loc": ["body", "minicase_id"],
      "msg": "String should match pattern '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'",
      "input": "node-123"
    }
  ]
}
```

##### Kasus 3: Kesalahan Server / LLM (`500 Internal Server Error`)
- **Kondisi**: Terjadi gangguan jaringan ke provider LLM atau output gagal diparsing.
```json
{
  "detail": "Gagal mem-parsing evaluasi esai dari LLM: ..."
}
```

---

### 3.8. `POST /api/v1/preview/{major_node_id}`

#### 🎯 Deskripsi
Menyusun dan mengembalikan rangkuman evaluasi komprehensif (*preview naratif*) beserta **1 hingga 4 rekomendasi jalur profesi/karir nyata** ketika siswa telah menyelesaikan seluruh trial interaktif pada suatu jurusan.

##### Alur & Karakteristik Penting:
1. **Kalkulasi Deterministik**: Backend menghitung `matching_percentage` (persentase kecocokan 1–100%) menggunakan formula terbobot:
   $$\text{Matching \%} = \text{round}\left( 0.30 \times \text{MCQ} + 0.35 \times \left(\frac{\text{Analitis}}{5} \times 100\right) + 0.35 \times \left(\frac{\text{Minat}}{5} \times 100\right) \right)$$
   Nilai ini di-*clamp* secara aman pada rentang **`1%` hingga `100%`**.
2. **Generasi Narasi AI yang Suportif**: LLM menyusun teks rangkuman evaluasi (maksimal 200 kata) yang menguraikan keselarasan minat, daya analitis, dan potensi siswa di jurusan tersebut.
3. **Rekomendasi Jalur Karir Nyata**: LLM menyusun 1 hingga 4 jalur karir yang relevan dengan jurusan tersebut, masing-masing memiliki:
   - `title`: Judul profesi karir (maksimal 2 kata, misal `"Software Engineer"`, `"AI Specialist"`).
   - `detail`: Uraian peran dan tanggung jawab profesi (maksimal 100 kata).
4. **Relasi Data (1:1 & 1:N)**:
   - `MajorNodePreview` memiliki `id` UUID v4 sendiri dan Foreign Key `major_node_id` yang merujuk ke jurusan yang dievaluasi.
   - Setiap `MajorNodeCareerPath` memiliki `id` UUID v4 sendiri dan Foreign Key `major_node_preview_id`.
   - Objek ini siap disimpan langsung ke tabel `previews` di IndexedDB browser.

---

#### 🌐 HTTP Request
- **Method**: `POST`
- **URL**: `${VITE_API_BASE_URL}/preview/{major_node_id}` (atau `https://api.nyomanyogi.my.id/api/v1/preview/{major_node_id}`)
- **Path Parameter**:
  - `major_node_id` (`string`, wajib): UUID v4 dari node jurusan yang baru saja diselesaikan.
- **Headers**:
  ```http
  Content-Type: application/json
  Accept: application/json
  ```

---

#### 📥 Request Body
Berupa JSON object sesuai skema `GeneratePreviewRequest`:

| Field | Tipe Data | Wajib | Keterangan & Validasi |
| :--- | :--- | :--- | :--- |
| `major_name` | `string` | Ya | Nama resmi jurusan kuliah (min. 1 karakter). |
| `mcq_accuracy` | `number` (float) | Ya | Persentase akurasi jawaban pilihan ganda siswa (rentang `0.0` s.d. `100.0`). |
| `essay_analytical_score` | `number` (float) | Ya | Rata-rata skor kemampuan analitis esai siswa (rentang `1.0` s.d. `5.0`). |
| `essay_interest_score` | `number` (float) | Ya | Rata-rata skor sinyal minat/antusiasme esai siswa (rentang `1.0` s.d. `5.0`). |
| `total_trials_completed` | `integer` | Ya | Total trial studi kasus yang telah diselesaikan (minimal `0`). |
| `user_satisfaction_rating` | `number` atau `null` | Tidak | Rating kepuasan subjektif siswa terhadap trial jurusan (opsional, skala `1.0` s.d. `5.0`). |
| `profile` | `object` (`InputKeminatan`) atau `null` | Tidak | Profil minat dan nilai awal siswa dari onboarding (opsional untuk memperkaya konteks AI). |

##### Contoh Request Payload:
```json
{
  "major_name": "Teknik Informatika",
  "mcq_accuracy": 85.0,
  "essay_analytical_score": 4.25,
  "essay_interest_score": 4.5,
  "total_trials_completed": 6,
  "user_satisfaction_rating": 4.5,
  "profile": {
    "minat": "Saya suka pemrograman web, robotika, dan analisis data",
    "nilai": {
      "matematika": 88,
      "fisika": 85,
      "bahasa inggris": 90
    }
  }
}
```

---

#### 📤 Response Body (Success: `200 OK`)
Mengembalikan JSON object berupa `MajorNodePreview` lengkap dengan relasi array `career_paths`:

##### Struktur Field Tiap `MajorNodePreview`:
| Field | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `string` | UUID v4 unik identitas preview. |
| `major_node_id` | `string` | UUID v4 Foreign Key merujuk ke jurusan terkait (`major_node`). |
| `preview` | `string` | Teks narasi rangkuman evaluasi AI (maksimal 200 kata). |
| `matching_percentage` | `integer` | Skor persentase kecocokan keminatan ($1 - 100\%$) hasil kalkulasi terbobot. |
| `career_paths` | `array` of `object` | Daftar 1 hingga 4 rekomendasi jalur profesi karir terkait. |

##### Struktur Objek Tiap Item di `career_paths`:
| Field | Tipe Data | Keterangan |
| :--- | :--- | :--- |
| `id` | `string` | UUID v4 unik identitas jalur karir. |
| `major_node_preview_id` | `string` | Foreign Key UUID merujuk ke preview induk (`id`). |
| `title` | `string` | Nama profesi karir (maksimal 2 kata, misal: `"Software Engineer"`). |
| `detail` | `string` | Penjelasan tugas dan relevansi profesi (maksimal 100 kata). |

##### Contoh Response Payload (`200 OK`):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "major_node_id": "2c4059b4-c692-4429-a1dc-56e004ba5297",
  "preview": "Kamu menunjukkan potensi analitis dan ketertarikan yang sangat tinggi dalam pemecahan masalah komputasi serta logika algoritma. Kemampuanmu mengisolasi masalah secara tenang pada simulasi kasus menunjukkan kesiapan mental yang solid untuk menghadapi tantangan kurikulum Teknik Informatika.",
  "matching_percentage": 87,
  "career_paths": [
    {
      "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      "major_node_preview_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Software Engineer",
      "detail": "Merancang, mengembangkan, dan memelihara arsitektur perangkat lunak skala besar serta sistem aplikasi modern berbasis web atau mobile."
    },
    {
      "id": "6ba7b811-9dad-11d1-80b4-00c04fd430c8",
      "major_node_preview_id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "AI Specialist",
      "detail": "Membangun dan melatih model kecerdasan buatan serta pipeline machine learning untuk menyelesaikan masalah bisnis yang kompleks."
    }
  ]
}
```

---

#### ⚠️ Kemungkinan Respon Error

##### Kasus 1: Format `major_node_id` di URL Bukan UUID Valid (`422 Unprocessable Entity`)
- **Kondisi**: Path parameter di URL bukan UUID v4 yang sah.
```json
{
  "detail": [
    {
      "type": "string_pattern_mismatch",
      "loc": ["path", "major_node_id"],
      "msg": "String should match pattern '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'",
      "input": "jurusan-ti"
    }
  ]
}
```

##### Kasus 2: Skor di Luar Rentang Validasi (`422 Unprocessable Entity`)
- **Kondisi**: `essay_analytical_score` dikirim melebihi batas 5.0 atau kurang dari 1.0.
```json
{
  "detail": [
    {
      "type": "less_than_equal",
      "loc": ["body", "essay_analytical_score"],
      "msg": "Input should be less than or equal to 5",
      "input": 6.5,
      "ctx": {
        "le": 5.0
      }
    }
  ]
}
```

##### Kasus 3: Kesalahan Server / LLM (`500 Internal Server Error`)
- **Kondisi**: Terjadi timeout atau parsing output LLM gagal.
```json
{
  "detail": "Gagal mem-parsing preview dari LLM: ..."
}
```
