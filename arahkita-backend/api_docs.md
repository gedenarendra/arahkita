# 📖 Panduan API ArahKita Backend

Dokumentasi resmi kontrak antarmuka API (*API Contract*) antara **ArahKita Backend** dan **ArahKita Frontend** (React + Vite, JavaScript). Dokumen ini dirancang modular agar setiap penambahan endpoint baru dapat dengan mudah ditambahkan di bagian bawah.

---

## 📌 Daftar Isi
1. [Konfigurasi Lingkungan & Base URL](#1-konfigurasi-lingkungan--base-url)
2. [Format Standar Error Response](#2-format-standar-error-response)
3. [Daftar Endpoint](#3-daftar-endpoint)
   - [3.1. POST /api/v1/majors/recommend](#31-post-apiv1majorsrecommend)
   - [3.2. POST /api/v1/recommendation-results](#32-post-apiv1recommendation-results)
   - [3.3. POST /api/v1/minicases/generate](#33-post-apiv1minicasesgenerate)
   - [3.4. POST /api/v1/minicases/evaluate-essay](#34-post-apiv1minicasesevaluate-essay)
   - [3.5. POST /api/v1/preview/{major_node_id}](#35-post-apiv1previewmajor_node_id)
4. [Contoh Implementasi Frontend (React + Vite)](#4-contoh-implementasi-frontend-react--vite)
   - [4.1. File Service: src/services/majorService.js](#41-file-service-srcservicesmajorservicejs)
   - [4.2. File Service: src/services/recommendationService.js](#42-file-service-srcservicesrecommendationservicejs)
   - [4.3. File Service: src/services/minicaseService.js](#43-file-service-srcservicesminicaseservicejs)
   - [4.4. Komponen Form Onboarding: src/components/OnboardingSurvey.jsx](#44-komponen-form-onboarding-srccomponentsonboardingsurveyjsx)
   - [4.5. Komponen Leaderboard: src/components/RecommendationLeaderboard.jsx](#45-komponen-leaderboard-srccomponentsrecommendationleaderboardjsx)
   - [4.6. Komponen Trial Esai: src/components/EssayTrialCard.jsx](#46-komponen-trial-esai-srccomponentsessaytrialcardjsx)
   - [4.7. File Service: src/services/previewService.js](#47-file-service-srcservicespreviewservicejs)
   - [4.8. Komponen Modal Preview: src/components/MajorPreviewModal.jsx](#48-komponen-modal-preview-srccomponentsmajorpreviewmodaljsx)

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

### 3.1. `POST /api/v1/majors/recommend`

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

### 3.2. `POST /api/v1/recommendation-results`

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

### 3.3. `POST /api/v1/minicases/generate`

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

---

### 3.4. `POST /api/v1/minicases/evaluate-essay`

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

### 3.5. `POST /api/v1/preview/{major_node_id}`

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

---

## 4. Contoh Implementasi Frontend (React + Vite)

### 4.1. File Service: `src/services/majorService.js`

```javascript
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.nyomanyogi.my.id/api/v1';

/**
 * Mengirim survei minat dan nilai siswa untuk mendapatkan rekomendasi jurusan kuliah.
 * 
 * @param {Object} payload
 * @param {string} payload.minat - Deskripsi minat siswa
 * @param {Object.<string, number>} payload.nilai - Objek nilai mata pelajaran dinamis (minimal 3, maksimal 10 mapel, nilai 0-100)
 * @returns {Promise<Array<{ id: string, major_name: string, circle_color: string, child_id: string|null }>>}
 */
export async function getMajorRecommendations(payload) {
  try {
    const response = await fetch(`${BASE_URL}/majors/recommend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      
      if (response.status === 422) {
        const errorMessages = errorData?.detail
          ? errorData.detail.map((err) => `${err.loc.join('.')}: ${err.msg}`).join(', ')
          : 'Validasi form tidak valid.';
        throw new Error(`Validasi Gagal: ${errorMessages}`);
      }

      const serverMessage = errorData?.detail || 'Terjadi kesalahan pada server backend.';
      throw new Error(`Error (${response.status}): ${serverMessage}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Gagal mengambil rekomendasi jurusan:', error);
    throw error;
  }
}
```

---

### 4.2. File Service: `src/services/recommendationService.js`

```javascript
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.nyomanyogi.my.id/api/v1';

/**
 * Mengirim data major_nodes, previews yang telah diselesaikan, dan profil keminatan
 * untuk mendapatkan leaderboard rekomendasi jurusan beserta badge mata pelajaran relevan.
 * 
 * @param {Object} payload
 * @param {Array<Object>} payload.major_nodes - Daftar node jurusan dari local storage/state
 * @param {Array<Object>} payload.previews - Daftar preview hasil trial yang telah diselesaikan
 * @param {Object|null} [payload.profile] - Profil keminatan dan nilai awal siswa (opsional)
 * @returns {Promise<Array<Object>>} Daftar MajorRecommendationResult terurut descending
 */
export async function getRecommendationResults(payload) {
  try {
    const response = await fetch(`${BASE_URL}/recommendation-results`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      if (response.status === 422) {
        const errorMessages = errorData?.detail
          ? errorData.detail.map((err) => `${err.loc.join('.')}: ${err.msg}`).join(', ')
          : 'Format payload request tidak valid.';
        throw new Error(`Validasi Gagal: ${errorMessages}`);
      }

      const serverMessage = errorData?.detail || 'Terjadi kesalahan pada server backend.';
      throw new Error(`Error (${response.status}): ${serverMessage}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Gagal mengambil leaderboard rekomendasi:', error);
    throw error;
  }
}
```

---

### 4.3. File Service: `src/services/minicaseService.js`

```javascript
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.nyomanyogi.my.id/api/v1';

/**
 * Men-generate pohon studi kasus (minicase nodes) untuk jurusan yang dipilih siswa.
 * Nomor node dimulai dari 2 s.d. 11 (nomor 1 dialokasikan untuk rules pengerjaan di frontend).
 * 
 * @param {Object} payload
 * @param {string} payload.major_id - UUID v4 node jurusan yang dipilih siswa
 * @param {string} payload.major_name - Nama jurusan kuliah (contoh: "Teknik Informatika")
 * @param {string} payload.circle_color - Kode hex warna lingkaran (contoh: "#4F46E5")
 * @param {Object|null} [payload.profile] - Profil keminatan & nilai siswa (opsional untuk personalisasi)
 * @returns {Promise<Array<Object>>} Daftar MinicaseNode terurut sekuensial
 */
export async function generateMinicases(payload) {
  try {
    const response = await fetch(`${BASE_URL}/minicases/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      if (response.status === 422) {
        const errorMessages = errorData?.detail
          ? errorData.detail.map((err) => `${err.loc.join('.')}: ${err.msg}`).join(', ')
          : 'Format request pembuatan minicase tidak valid.';
        throw new Error(`Validasi Gagal: ${errorMessages}`);
      }

      const serverMessage = errorData?.detail || 'Terjadi kesalahan pada server saat membuat minicase.';
      throw new Error(`Error (${response.status}): ${serverMessage}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Gagal men-generate minicases:', error);
    throw error;
  }
}

/**
 * Mengevaluasi jawaban esai reflektif siswa secara real-time menggunakan AI.
 * 
 * @param {Object} payload
 * @param {string} payload.question - Pertanyaan studi kasus (dari node.question)
 * @param {string} payload.evaluation_hint - Rubrik pedoman penilaian (dari node.evaluation_hint)
 * @param {string} payload.user_answer - Teks jawaban esai siswa
 * @param {string|null} [payload.minicase_id] - UUID v4 node minicase (opsional)
 * @returns {Promise<{ analytical_fit: number, interest_signal: number, is_serious_attempt: boolean }>}
 */
export async function evaluateEssayAnswer(payload) {
  try {
    const response = await fetch(`${BASE_URL}/minicases/evaluate-essay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      if (response.status === 422) {
        const errorMessages = errorData?.detail
          ? errorData.detail.map((err) => `${err.loc.join('.')}: ${err.msg}`).join(', ')
          : 'Format request evaluasi esai tidak valid.';
        throw new Error(`Validasi Gagal: ${errorMessages}`);
      }

      const serverMessage = errorData?.detail || 'Terjadi kesalahan pada server saat mengevaluasi esai.';
      throw new Error(`Error (${response.status}): ${serverMessage}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Gagal mengevaluasi esai:', error);
    throw error;
  }
}
```

---

### 4.4. Komponen Form Onboarding: `src/components/OnboardingSurvey.jsx`

```jsx
import React, { useState } from 'react';
import { getMajorRecommendations } from '../services/majorService';

export default function OnboardingSurvey({ onRecommendationsReceived }) {
  const [minat, setMinat] = useState('');
  // Siswa memasukkan minimal 3 dan maksimal 10 mata pelajaran
  const [subjects, setSubjects] = useState([
    { name: 'Matematika', score: 85 },
    { name: 'Fisika', score: 80 },
    { name: 'Bahasa Inggris', score: 88 },
  ]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectScore, setNewSubjectScore] = useState(80);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const handleAddSubject = () => {
    if (!newSubjectName.trim()) return;
    if (subjects.length >= 10) {
      setErrorMessage('Maksimal hanya boleh menambahkan 10 mata pelajaran.');
      return;
    }
    const cleanName = newSubjectName.trim();
    if (subjects.some((s) => s.name.toLowerCase() === cleanName.toLowerCase())) {
      setErrorMessage(`Mata pelajaran '${cleanName}' sudah ada di daftar.`);
      return;
    }

    setSubjects([...subjects, { name: cleanName, score: Number(newSubjectScore) }]);
    setNewSubjectName('');
    setNewSubjectScore(80);
    setErrorMessage(null);
  };

  const handleRemoveSubject = (index) => {
    if (subjects.length <= 3) {
      setErrorMessage('Minimal harus mempertahankan 3 mata pelajaran.');
      return;
    }
    setSubjects(subjects.filter((_, i) => i !== index));
    setErrorMessage(null);
  };

  const handleScoreChange = (index, newScore) => {
    const updated = [...subjects];
    updated[index].score = Number(newScore);
    setSubjects(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (subjects.length < 3) {
      setErrorMessage('Minimal harus mengisi 3 mata pelajaran.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    // Bentuk key-value object: {"matematika": 85, "fisika": 80, ...}
    const nilaiObj = {};
    for (const s of subjects) {
      nilaiObj[s.name] = Number(s.score);
    }

    const payload = {
      minat: minat.trim(),
      nilai: nilaiObj,
    };

    try {
      const recommendations = await getMajorRecommendations(payload);
      // Simpan rekomendasi ke state parent atau IndexedDB lokal frontend
      if (onRecommendationsReceived) {
        onRecommendationsReceived(recommendations);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Gagal terhubung ke server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 500, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h3>Survei Keminatan & Nilai Mata Pelajaran</h3>

      {errorMessage && (
        <div style={{ color: '#EF4444', backgroundColor: '#FEE2E2', padding: 10, borderRadius: 6, fontSize: '0.9rem' }}>
          {errorMessage}
        </div>
      )}

      <label>
        <strong>Minat / Bakat / Ketertarikan:</strong>
        <textarea
          value={minat}
          onChange={(e) => setMinat(e.target.value)}
          placeholder="Ceritakan minat, kegiatan favorit, atau topik yang ingin kamu tekuni..."
          required
          rows={3}
          style={{ width: '100%', marginTop: 4, padding: 8, borderRadius: 6, border: '1px solid #D1D5DB' }}
        />
      </label>

      <div>
        <strong>Daftar Nilai Mata Pelajaran (3 - 10 Mapel):</strong>
        <p style={{ margin: '4px 0 10px 0', fontSize: '0.85rem', color: '#6B7280' }}>
          Masukkan mata pelajaran yang paling kamu percaya diri dengan nilainya (skala 0 - 100).
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {subjects.map((subj, index) => (
            <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8, backgroundColor: '#F9FAFB', padding: 8, borderRadius: 6 }}>
              <span style={{ flex: 1, fontWeight: 500 }}>{subj.name}</span>
              <input
                type="number"
                min="0"
                max="100"
                value={subj.score}
                onChange={(e) => handleScoreChange(index, e.target.value)}
                required
                style={{ width: 70, padding: 4, textAlign: 'center' }}
              />
              <button
                type="button"
                onClick={() => handleRemoveSubject(index)}
                disabled={subjects.length <= 3}
                style={{ background: 'none', border: 'none', color: '#EF4444', cursor: subjects.length <= 3 ? 'not-allowed' : 'pointer' }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Form Tambah Mapel Baru */}
        {subjects.length < 10 && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input
              type="text"
              placeholder="Mapel baru (misal: Sosiologi, Kimia)..."
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              style={{ flex: 1, padding: 6, borderRadius: 6, border: '1px solid #D1D5DB' }}
            />
            <input
              type="number"
              min="0"
              max="100"
              value={newSubjectScore}
              onChange={(e) => setNewSubjectScore(e.target.value)}
              style={{ width: 70, padding: 6, textAlign: 'center', borderRadius: 6, border: '1px solid #D1D5DB' }}
            />
            <button
              type="button"
              onClick={handleAddSubject}
              style={{ padding: '6px 12px', backgroundColor: '#E5E7EB', border: 'none', borderRadius: 6, cursor: 'pointer' }}
            >
              + Tambah
            </button>
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading || subjects.length < 3}
        style={{
          marginTop: 12,
          padding: 12,
          backgroundColor: '#4F46E5',
          color: '#FFFFFF',
          border: 'none',
          borderRadius: 8,
          fontWeight: 'bold',
          cursor: isLoading ? 'not-allowed' : 'pointer',
        }}
      >
        {isLoading ? 'Menganalisis Keminatan AI...' : 'Dapatkan Rekomendasi Jurusan 🚀'}
      </button>
    </form>
  );
}
```

---

### 4.5. Komponen Leaderboard: `src/components/RecommendationLeaderboard.jsx`

```jsx
import React, { useEffect, useState } from 'react';
import { getRecommendationResults } from '../services/recommendationService';

export default function RecommendationLeaderboard({ majorNodes, previews, profile }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchLeaderboard() {
      if (!majorNodes || majorNodes.length === 0) return;

      setIsLoading(true);
      setError(null);

      try {
        const results = await getRecommendationResults({
          major_nodes: majorNodes,
          previews: previews || [],
          profile: profile || null,
        });
        setLeaderboard(results);
      } catch (err) {
        setError(err.message || 'Gagal memuat leaderboard.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboard();
  }, [majorNodes, previews, profile]);

  if (isLoading) {
    return <p>Menyusun peringkat rekomendasi jurusan...</p>;
  }

  if (error) {
    return <p style={{ color: '#EF4444' }}>{error}</p>;
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <h2>🏆 Leaderboard Rekomendasi Jurusan</h2>
      {leaderboard.map((item, index) => (
        <div
          key={item.id}
          style={{
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            padding: 16,
            borderLeft: `6px solid ${item.circle_color}`,
            backgroundColor: item.is_completed ? '#FFFFFF' : '#F9FAFB',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ margin: 0 }}>
              #{index + 1} {item.major_name}
            </h4>
            <span
              style={{
                fontWeight: 'bold',
                fontSize: '1.1rem',
                color: item.is_completed ? item.circle_color : '#9CA3AF',
              }}
            >
              {item.is_completed ? `${item.matching_percentage}%` : 'Belum Trial'}
            </span>
          </div>

          {/* Badge Relevansi Mata Pelajaran SMA/SMK */}
          {item.subject_relevances && item.subject_relevances.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.8rem', color: '#6B7280' }}>Mapel Relevan:</span>
              {item.subject_relevances.map((sr) => (
                <span
                  key={sr.id}
                  style={{
                    backgroundColor: '#EEF2FF',
                    color: '#4F46E5',
                    padding: '2px 8px',
                    borderRadius: 12,
                    fontSize: '0.75rem',
                    fontWeight: 600,
                  }}
                >
                  {sr.subject_name}
                </span>
              ))}
            </div>
          )}

          {/* Narasi Preview & Karir jika sudah selesai */}
          {item.preview && (
            <div style={{ marginTop: 12, fontSize: '0.9rem', color: '#374151' }}>
              <p style={{ margin: '0 0 8px 0' }}>{item.preview.preview}</p>
              {item.preview.career_paths?.length > 0 && (
                <div>
                  <strong>Jalur Karir: </strong>
                  {item.preview.career_paths.map((cp) => cp.title).join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

---

### 4.6. Komponen Trial Esai: `src/components/EssayTrialCard.jsx`

Komponen interaktif untuk menampilkan studi kasus esai reflektif, memanggil API evaluasi esai, menampilkan feedback skor analitis & minat, serta menangani guardrail jika jawaban terindikasi asal-asalan:

```jsx
import React, { useState } from 'react';
import { evaluateEssayAnswer } from '../services/minicaseService';

export default function EssayTrialCard({ node, onCompleted }) {
  const [userAnswer, setUserAnswer] = useState(node.user_answer || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [evalResult, setEvalResult] = useState(
    node.is_done ? { analytical_fit: node.analytical_fit, interest_signal: node.interest_signal } : null
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userAnswer.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await evaluateEssayAnswer({
        question: node.question,
        evaluation_hint: node.evaluation_hint,
        user_answer: userAnswer.trim(),
        minicase_id: node.id,
      });

      setEvalResult(result);

      // Teruskan hasil ke parent component untuk disimpan ke IndexedDB
      if (onCompleted) {
        onCompleted({
          ...node,
          user_answer: userAnswer.trim(),
          analytical_fit: result.analytical_fit,
          interest_signal: result.interest_signal,
          is_serious_attempt: result.is_serious_attempt,
          is_done: true,
        });
      }
    } catch (err) {
      setError(err.message || 'Gagal mengevaluasi esai.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, backgroundColor: '#FFFFFF', maxWidth: 600, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: node.circle_color }}>
          Node #{node.minicase_number} • {node.subject_name}
        </span>
        <span style={{ fontSize: '0.75rem', backgroundColor: '#FEF3C7', color: '#D97706', padding: '2px 8px', borderRadius: 8 }}>
          Esai Reflektif
        </span>
      </div>

      <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>{node.minicase_title}</h3>
      <p style={{ color: '#374151', lineHeight: 1.5, marginBottom: 16 }}>{node.question}</p>

      {error && (
        <div style={{ backgroundColor: '#FEE2E2', color: '#DC2626', padding: 8, borderRadius: 6, marginBottom: 12 }}>
          {error}
        </div>
      )}

      {/* Tampilan Skor Evaluasi setelah selesai */}
      {evalResult && (
        <div style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <h4 style={{ margin: '0 0 8px 0', color: '#166534' }}>✨ Hasil Evaluasi AI:</h4>
          <div style={{ display: 'flex', gap: 16 }}>
            <span>🧠 Daya Analitis: <strong>{evalResult.analytical_fit} / 5</strong></span>
            <span>🔥 Sinyal Minat: <strong>{evalResult.interest_signal} / 5</strong></span>
          </div>
          {evalResult.is_serious_attempt === false && (
            <p style={{ margin: '8px 0 0 0', color: '#B45309', fontSize: '0.85rem' }}>
              ⚠️ AI mendeteksi jawaban ini belum menunjukkan usaha yang optimal. Coba jawab lebih mendalam di trial berikutnya agar minatmu terpetakan akurat.
            </p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <textarea
          rows={4}
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          placeholder="Ceritakan pandangan dan solusimu secara terstruktur..."
          required
          disabled={isLoading || node.is_done}
          style={{ width: '100%', padding: 10, borderRadius: 6, border: '1px solid #D1D5DB', boxSizing: 'border-box' }}
        />

        {!node.is_done && (
          <button
            type="submit"
            disabled={isLoading || !userAnswer.trim()}
            style={{
              marginTop: 12,
              padding: '10px 20px',
              backgroundColor: node.circle_color || '#4F46E5',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 6,
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
            }}
          >
            {isLoading ? 'Mengevaluasi Jawaban AI...' : 'Kirim Jawaban & Lanjut'}
          </button>
        )}
      </form>
    </div>
  );
}
```

---

### 4.7. File Service: `src/services/previewService.js`

File service untuk memanggil endpoint evaluasi akhir (`POST /api/v1/preview/{major_node_id}`) guna mendapatkan narasi rangkuman AI, persentase kecocokan terbobot, dan rekomendasi jalur karir:

```javascript
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.nyomanyogi.my.id/api/v1';

/**
 * Mengirimkan ringkasan agregasi metrik trial siswa pada suatu jurusan untuk
 * mendapatkan narasi evaluasi kecocokan AI, persentase matching deterministik,
 * dan daftar rekomendasi jalur karir.
 *
 * @param {string} majorNodeId - UUID v4 node jurusan yang dievaluasi
 * @param {Object} payload
 * @param {string} payload.major_name - Nama jurusan kuliah (contoh: "Teknik Informatika")
 * @param {number} payload.mcq_accuracy - Akurasi jawaban MCQ siswa (0.0 s.d. 100.0)
 * @param {number} payload.essay_analytical_score - Rata-rata skor daya analitis esai (1.0 s.d. 5.0)
 * @param {number} payload.essay_interest_score - Rata-rata skor sinyal minat esai (1.0 s.d. 5.0)
 * @param {number} payload.total_trials_completed - Total studi kasus yang dikerjakan (min 0)
 * @param {number|null} [payload.user_satisfaction_rating] - Rating kepuasan subjektif siswa (1.0 s.d. 5.0, opsional)
 * @param {Object|null} [payload.profile] - Profil minat & nilai awal siswa dari onboarding (opsional)
 * @returns {Promise<{
 *   id: string,
 *   major_node_id: string,
 *   preview: string,
 *   matching_percentage: number,
 *   career_paths: Array<{ id: string, major_node_preview_id: string, title: string, detail: string }>
 * }>}
 */
export async function getMajorPreview(majorNodeId, payload) {
  try {
    const response = await fetch(`${BASE_URL}/preview/${majorNodeId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);

      if (response.status === 422) {
        const errorMessages = errorData?.detail
          ? errorData.detail.map((err) => `${err.loc.join('.')}: ${err.msg}`).join(', ')
          : 'Format request pembuatan preview tidak valid.';
        throw new Error(`Validasi Gagal: ${errorMessages}`);
      }

      const serverMessage = errorData?.detail || 'Terjadi kesalahan pada server saat membuat preview jurusan.';
      throw new Error(`Error (${response.status}): ${serverMessage}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Gagal mengambil preview jurusan:', error);
    throw error;
  }
}
```

---

### 4.8. Komponen Modal Preview: `src/components/MajorPreviewModal.jsx`

Komponen dialog modal interaktif untuk menampilkan rangkuman evaluasi keminatan AI setelah siswa menyelesaikan seluruh trial di suatu jurusan, lengkap dengan persentase kecocokan, narasi analisis, dan kartu rekomendasi karir masa depan:

```jsx
import React, { useState, useEffect } from 'react';
import { getMajorPreview } from '../services/previewService';

export default function MajorPreviewModal({
  isOpen,
  onClose,
  major,
  previewData,
  trialsMetrics,
  profile,
  onSavePreview,
  onGoToLeaderboard,
}) {
  const [preview, setPreview] = useState(previewData || null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Jika previewData belum ada, otomatis fetch dari backend menggunakan metrics
  useEffect(() => {
    if (!isOpen || preview || !major) return;

    if (!trialsMetrics) {
      setError('Metrik trial belum tersedia.');
      return;
    }

    async function fetchPreview() {
      setIsLoading(true);
      setError(null);

      try {
        const result = await getMajorPreview(major.id, {
          major_name: major.major_name,
          mcq_accuracy: trialsMetrics.mcq_accuracy,
          essay_analytical_score: trialsMetrics.essay_analytical_score,
          essay_interest_score: trialsMetrics.essay_interest_score,
          total_trials_completed: trialsMetrics.total_trials_completed,
          user_satisfaction_rating: trialsMetrics.user_satisfaction_rating || null,
          profile: profile || null,
        });

        setPreview(result);

        // Teruskan ke parent agar tersimpan permanen di IndexedDB (Dexie.js)
        if (onSavePreview) {
          onSavePreview(result);
        }
      } catch (err) {
        setError(err.message || 'Gagal menyusun preview evaluasi AI.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchPreview();
  }, [isOpen, preview, major, trialsMetrics, profile, onSavePreview]);

  if (!isOpen) return null;

  const circleColor = major?.circle_color || '#4F46E5';

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          maxWidth: 650,
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
          padding: 24,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #E5E7EB', paddingBottom: 16 }}>
          <div>
            <span
              style={{
                display: 'inline-block',
                backgroundColor: `${circleColor}15`,
                color: circleColor,
                fontWeight: 'bold',
                fontSize: '0.75rem',
                padding: '4px 10px',
                borderRadius: 20,
                marginBottom: 6,
              }}
            >
              Rangkuman Trial Keminatan
            </span>
            <h2 style={{ margin: 0, fontSize: '1.4rem', color: '#111827' }}>
              {major?.major_name}
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#9CA3AF',
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>✨</div>
            <h4 style={{ margin: '0 0 6px 0', color: '#374151' }}>Menyusun Rangkuman AI...</h4>
            <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem' }}>
              AI sedang menganalisis kecocokan responmu dan memetakan prospek karir masa depan.
            </p>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div style={{ margin: '20px 0', padding: 14, backgroundColor: '#FEE2E2', borderRadius: 8, color: '#DC2626' }}>
            <p style={{ margin: '0 0 8px 0', fontWeight: 'bold' }}>Gagal memuat rangkuman:</p>
            <p style={{ margin: 0, fontSize: '0.9rem' }}>{error}</p>
          </div>
        )}

        {/* Content Body */}
        {preview && !isLoading && (
          <div style={{ marginTop: 20 }}>
            {/* Banner Persentase Kecocokan */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 16,
                borderRadius: 12,
                backgroundColor: `${circleColor}10`,
                border: `1px solid ${circleColor}30`,
                marginBottom: 20,
              }}
            >
              <div>
                <span style={{ fontSize: '0.85rem', color: '#4B5563', fontWeight: 500 }}>
                  Tingkat Kecocokan Jurusan
                </span>
                <h3 style={{ margin: '4px 0 0 0', color: circleColor, fontSize: '1.75rem' }}>
                  {preview.matching_percentage}% Cocok
                </h3>
              </div>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  backgroundColor: circleColor,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.4rem',
                  fontWeight: 'bold',
                }}
              >
                🎯
              </div>
            </div>

            {/* Narasi Rangkuman Evaluasi AI */}
            <div style={{ marginBottom: 24 }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: '#1F2937' }}>
                💡 Analisis Potensi & Evaluasi:
              </h4>
              <p
                style={{
                  margin: 0,
                  color: '#4B5563',
                  lineHeight: 1.6,
                  fontSize: '0.95rem',
                  backgroundColor: '#F9FAFB',
                  padding: 14,
                  borderRadius: 10,
                  borderLeft: `4px solid ${circleColor}`,
                }}
              >
                {preview.preview}
              </p>
            </div>

            {/* Kartu Rekomendasi Jalur Karir */}
            {preview.career_paths && preview.career_paths.length > 0 && (
              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '1rem', color: '#1F2937' }}>
                  🚀 Rekomendasi Jalur Karir Terkait:
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                  {preview.career_paths.map((cp) => (
                    <div
                      key={cp.id}
                      style={{
                        padding: 14,
                        borderRadius: 10,
                        border: '1px solid #E5E7EB',
                        backgroundColor: '#FFFFFF',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          backgroundColor: '#EEF2FF',
                          color: '#4F46E5',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          padding: '2px 8px',
                          borderRadius: 6,
                          marginBottom: 6,
                        }}
                      >
                        Profesi
                      </span>
                      <h5 style={{ margin: '0 0 6px 0', fontSize: '1rem', color: '#111827' }}>
                        {cp.title}
                      </h5>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280', lineHeight: 1.4 }}>
                        {cp.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div
          style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid #E5E7EB',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 12,
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '10px 18px',
              backgroundColor: '#F3F4F6',
              color: '#374151',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Tutup
          </button>
          {onGoToLeaderboard && (
            <button
              onClick={() => {
                onClose();
                onGoToLeaderboard();
              }}
              style={{
                padding: '10px 20px',
                backgroundColor: circleColor,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Lihat Semua di Leaderboard 🏆
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

