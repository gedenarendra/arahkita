# AGENTS.md — Panduan Konteks & Standar Teknis ArahKita Frontend

Dokumen ini adalah acuan utama bagi AI Coding Agent dan pengembang manusia dalam memahami visi produk, arsitektur teknis, aliran data offline-first, serta aturan penulisan kode (*code guidelines*) untuk repositori **`ArahKita`** (Frontend).

---

## 1. 🎯 Visi & Konteks Produk

### 1.1. Latar Belakang & Tema
- **Nama Proyek**: ArahKita
- **Tujuan**: Mengikuti kompetisi Hackathon dengan tema **Edukasi**.
- **Sub-Tema Masalah**:
  > *"Siswa SMA/SMK kelas akhir yang sedang bingung/kesulitan menentukan jurusan, memilih jalur pendidikan, dan merencanakan karir sesuai minat serta kemampuan yang dimiliki."*
- **Deliverable Akhir**: **Prototipe Fungsional PWA (Progressive Web App)** yang berfokus mendalam pada 2 fitur inti interaktif dengan pendekatan visual gamified.

### 1.2. Dua Fitur Utama Prototipe
1. **Onboarding Survey & Rekomendasi Jurusan (Root Nodes)**:
   - Pengguna baru menjalani proses onboarding terarah: Welcome screen, pengenalan minat, input nilai mata pelajaran dinamis (3 hingga 10 mata pelajaran, skor 0–100), dan pemilihan minat berbasis visual bubble/tags (maksimal 5 minat).
   - Frontend memanggil endpoint `POST /api/v1/majors/recommend` pada backend LLM selama fase animasi *Generating*.
   - Hasil rekomendasi jurusan (2–6 node visual `MajorNode`) disimpan ke IndexedDB lokal (Dexie) dan dipetakan ke layout visual node silinder isometrik 3D.
2. **Eksplorasi Pohon Jurusan & Interactive Trial (Child Nodes & Summary)**:
   - Pengguna mengeksplorasi node-node jurusan pada graph interaktif berbasis XYFlow (`GraphNodePages`).
   - Setiap node jurusan dapat diklik untuk membuka tantangan simulasi mini-case/soal interaktif bertingkat (`MajorTestComponent`).
   - Progres dan ringkasan kecocokan keminatan dapat dipantau pada halaman ringkasan rekomendasi (`RecomendationPages` & `RecommendationSummaryComponent`).

---

## 2. 📱 Karakteristik & Arsitektur Frontend

Frontend ArahKita dirancang sebagai **Mobile-First Progressive Web App (PWA)** dengan visual interaktif yang kaya animasi dan mendukung kapabilitas **Offline-First**.

### 2.1. Tanggung Jawab Utama Frontend
- **Interaksi Gamified Visual**: Navigasi node jurusan 3D isometrik bertingkat menggunakan graf node XYFlow tanpa batas scroll yang kaku.
- **Normalisasi Data Input**: Menjamin payload nilai dan minat selalu sinkron dan sesuai dengan kontrak skema backend (Pydantic) sebelum transmisi jaringan.
- **Strategi Offline-First & Caching**:
  - Menyimpan batch rekomendasi jurusan ke IndexedDB via Dexie.js.
  - Memastikan user yang sudah menyelesaikan onboarding tidak pernah terlempar kembali ke onboarding saat menutup/membuka kembali aplikasi (`localStorage.getItem("has_onboarded")`).
  - Menyediakan fallback data lokal otomatis jika koneksi jaringan offline atau API gagal merespons.
- **PWA Ready**: Mendukung instalasi aplikasi mandiri pada perangkat Android/iOS/Desktop melalui *service worker* dan prompt instalasi terintegrasi.

### 2.2. Tech Stack Inti
- **Framework**: [React 19](https://react.dev/) (dengan hooks modern)
- **Build Tool**: [Vite 8](https://vitejs.dev/) + [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/) via `@tailwindcss/vite`
- **Graph / Node Engine**: [@xyflow/react v12](https://reactflow.dev/) (render platform node visual)
- **Local Database (IndexedDB)**: [Dexie.js v4](https://dexie.org/) (repositori data offline-first)
- **HTTP Client**: [Axios](https://axios-http.com/) dengan interceptors dan fallback terpusat
- **Animation**: [Lottie-React](https://github.com/Gamote/lottie-react) & CSS Keyframes Animation
- **PWA**: [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Service Worker generator & manifest)
- **Code Quality**: ESLint v10 + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh`

### 2.3. Pola Desain & Paradigma Arsitektur
- **Layered Architecture (Pemisahan Tanggung Jawab)**:
  - `pages/`: Pengatur alur halaman utama, tabs, dan orkestrasi view.
  - `components/`: Komponen UI modular dan reusable (splash, test, recommendation, graph).
  - `api/`: Lapisan layanan pemanggilan backend API dan pemetaan data visual.
  - `repositories/`: Lapisan akses database IndexedDB (Dexie).
  - `utils/`: Logika bisnis murni deterministik (normalisasi subject, formatting string minat, generator node level).
  - `lib/`: Konfigurasi singleton instance third-party (Axios instance, Dexie DB schema).
  - `config/`: Konfigurasi global lingkungan runtime (`apiBaseUrl`, `isDev`).
- **Offline-First Data Pipeline**:
  ```text
  User Input (Grades & Interests)
           │
           ▼
  Subject Normalizer (subjectMapping.js)
           │
           ▼
  API Client (POST /api/v1/majors/recommend)
           │
     ┌─────┴─────┐
  (Success)   (Failure / Offline)
     │           │
     ▼           ▼
  Clear & Save   Read from IndexedDB
  to IndexedDB      (Dexie Cache)
     │           │
     └─────┬─────┘
           ▼
  mapMajorNodesToUi()
           │
           ▼
  Render in GraphNodePages (XYFlow)
  ```

---

## 3. 📂 Struktur Direktori Proyek

```text
arahkita/
├── index.html
├── package.json
├── vite.config.js
├── eslint.config.js
├── README.md
├── AGENTS.md
└── src/
    ├── main.jsx                        # Entrypoint React DOM & PWA register
    ├── App.jsx                         # Root application controller (tabs, onboarding, session)
    ├── assets/                         # SVG, PNG, CSS, dan file animasi Lottie JSON
    │   ├── index.css                   # Global styles & Tailwind CSS v4 directive
    │   ├── App.css                     # Custom animations & utility classes
    │   └── splashAnimation.json        # Animasi splash pembuka
    ├── config/
    │   └── config.js                   # Konfigurasi aplikasi & base URL API
    ├── lib/
    │   ├── apiClient.js                # Wrapper Axios client dengan error interceptor
    │   └── dexie.js                    # Inisialisasi & skema tabel IndexedDB Dexie
    ├── repositories/
    │   └── majorRepository.js          # Repository CRUD IndexedDB untuk rekomendasi jurusan
    ├── api/
    │   └── majorApi.js                 # API service, offline fallback, & mapper visual node
    ├── utils/
    │   ├── subjectMapping.js           # Constant mapper nilai mata pelajaran ke skema backend
    │   ├── interestUtils.js            # Pemformat & pembatas array minat ke string backend
    │   └── testNodeUtils.js            # Generator node soal, level, dan template posisi graf
    ├── components/
    │   ├── PlatformNode.jsx            # Custom node XYFlow: silinder isometrik 3D & bintang
    │   ├── graphNodeComponent.jsx      # Wrapper ReactFlow / XYFlow canvas
    │   ├── MajorTestComponent.jsx      # Alur latihan tes jurusan & level unlocking
    │   ├── BottomNavigation.jsx        # Navigation bar bawah (Home, Recommendation, Profile)
    │   ├── NavigationIcons.jsx         # Ikon SVG navigasi
    │   ├── PwaInstallPrompt.jsx        # Banner prompt instalasi PWA
    │   ├── splash/
    │   │   ├── WelcomeStep.jsx         # Onboarding Slide 1: Sambutan
    │   │   ├── InterestStep.jsx        # Onboarding Slide 2: Edukasi minat
    │   │   ├── GradesStep.jsx          # Wrapper slide nilai dan minat
    │   │   ├── GradesComponent.jsx     # Slide 3: Cari & input angka nilai mata pelajaran
    │   │   ├── InterestComponent.jsx   # Slide 4: Pemilihan gelembung minat & input manual
    │   │   └── GeneratingStep.jsx      # Slide 5: Panggilan API real-time, loading, & error state
    │   ├── test/
    │   │   ├── QuestionComponent.jsx   # Komponen tampilan pertanyaan soal
    │   │   └── TermsPolicyComponent.jsx # Komponen syarat & ketentuan level 1
    │   └── recommendation/
    │       ├── RecommendationSummaryComponent.jsx # Ringkasan kecocokan jurusan & donut progress
    │       ├── MajorPreviewComponent.jsx          # Kartu pratinjau jurusan
    │       └── CareerDetailModal.jsx              # Modal detail prospek karir
    └── pages/
        ├── splashPages.jsx             # Kontroller wizard multi-step onboarding
        ├── graphNodePages.jsx          # Halaman utama visual graf node jurusan
        ├── recomendationPages.jsx      # Halaman daftar hasil & evaluasi rekomendasi
        ├── testPages.jsx               # Halaman pengerjaan tes interaktif
        ├── dashboardPages.jsx          # Halaman dashboard pendukung
        ├── destinationPages.jsx        # Halaman informasi destinasi karir
        └── AnimationPages.jsx          # Splash screen animasi pembuka saat app dimuat
```

---

## 4. 📏 Standar Penulisan Kode: JavaScript & React

Seluruh kode dalam repositori ini **wajib lolos linter ESLint bawaan tanpa error maupun peringatan (`0 errors, 0 warnings`)**.

### 4.1. Modern ES Modules & Sintaks React 19
- Gunakan ES Modules murni (`import` / `export`).
- Gunakan *functional components* dengan hooks standar (`useState`, `useEffect`, `useCallback`, `useMemo`, `useRef`).
- Deklarasikan default props menggunakan parameter default JavaScript ES6 (hindari `defaultProps` yang sudah deprecated di React modern):
  ```javascript
  // ❌ SALAH
  function PlatformNode(props) { ... }
  PlatformNode.defaultProps = { nodes: [] };

  // ✅ BENAR
  function PlatformNode({ nodes = [], activeTab = "home" }) { ... }
  ```

### 4.2. Aturan Hooks & Pencegahan Cascading Renders
- **Dilarang memanggil `setState` secara sinkron langsung di dalam tubuh `useEffect`**:
  ```javascript
  // ❌ SALAH: Menimbulkan eslint react-hooks/set-state-in-effect error
  useEffect(() => {
    if (propNodes.length > 0) {
      setDisplayedNodes(propNodes);
    }
  }, [propNodes]);

  // ✅ BENAR: Gunakan pola Derived State
  const displayedNodes = Array.isArray(propNodes) && propNodes.length > 0
    ? propNodes
    : cachedNodes || initialNodes;
  ```
- Jika harus melakukan fetch asinkron di dalam `useEffect`, selalu gunakan flag pembersihan (*cleanup flag*) untuk menghindari *race conditions* atau *memory leak* pada komponen yang sudah unmount:
  ```javascript
  useEffect(() => {
    let isMounted = true;

    getCachedMajors().then((result) => {
      if (isMounted && result?.mappedNodes) {
        setCachedNodes(result.mappedNodes);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);
  ```

### 4.3. Normalisasi Payload & Defensive Programming (Kontrak Backend)
- Backend menggunakan validasi ketat Pydantic (HTTP 422 jika format tidak cocok).
- **Semua payload nilai WAJIB melalui [`mapSubjectsToBackendPayload`](src/utils/subjectMapping.js)** untuk menjamin kriteria skema backend:
  - Jumlah mata pelajaran: **3 hingga 10 mata pelajaran**.
  - Key dinormalisasi ke huruf kecil murni (*lowercase*, misal `"fisika"`, `"matematika"`).
  - Skor bernilai integer 0–100.
  ```json
  {
    "matematika": 85,
    "fisika": 80,
    "kimia": 90
  }
  ```
- Gunakan utility dan constant yang terpusat di `src/utils/subjectMapping.js`:
  ```javascript
  import { mapSubjectsToBackendPayload, MIN_SUBJECTS_COUNT, MAX_SUBJECTS_COUNT } from '../utils/subjectMapping';

  const sanitizedNilai = mapSubjectsToBackendPayload(userInputNilai);
  ```
- Nilai default adalah `80` jika skor belum diisi user pada UI.

### 4.4. Manajemen Database Lokal (IndexedDB via Dexie)
- Rekomendasi jurusan baru dari backend adalah kumpulan satu kesatuan (*batch*).
- **Wajib membersihkan data lama sebelum menyimpan batch baru** agar node tidak menumpuk:
  ```javascript
  async saveMajors(majors = []) {
    if (!Array.isArray(majors) || majors.length === 0) return [];
    await db.majorNodes.clear(); // Bersihkan batch sebelumnya
    await db.majorNodes.bulkPut(majors);
    return majors;
  }
  ```
- **Data Mockup DILARANG disimpan ke IndexedDB**. IndexedDB murni dialokasikan untuk data rekomendasi riil dari backend.
- **Persistensi Sesi**: Saat user menyelesaikan onboarding, catat `localStorage.setItem("has_onboarded", "true")`. Ketika aplikasi dibuka ulang, langsung muat data dari Dexie dan lewati onboarding.

### 4.5. Standar Styling Tailwind CSS v4 & Aksesibilitas Visual
- Gunakan utility classes Tailwind CSS v4 modern (`bg-linear-to-r`, arbitrary values `h-dvh`, dll).
- Pastikan interaksi sentuh ramah pengguna ponsel pintar (*minimum touch target* $\ge 40\times 40\text{ px}$ untuk tombol).
- Gunakan transisi halus pada tombol dan elemen interaktif (`transition-all active:scale-95 cursor-pointer`).
- Dukung pewarnaan dinamis graf node: Silinder platform pada [`PlatformNode.jsx`](src/components/PlatformNode.jsx) harus merender `data.color` (`circle_color` dari backend) dengan bayangan kedalaman isometrik tanpa merusak kontras teks.

### 4.6. Code Hygiene & Anti-Slop Guidelines
- **Pertahankan Integritas Komentar**: Pertahankan komentar bisnis yang menjelaskan *why* di balik keputusan arsitektur.
- **Hindari Komentar AI Generik**: Jangan menambahkan komentar redundan yang hanya mengulang fungsi sintaks (contoh: `// import react`, `// return div`).
- **Penamaan Simbol Semantik**:
  - Komponen: PascalCase (`GeneratingStep.jsx`, `PlatformNode.jsx`).
  - Fungsi utilitas: camelCase (`formatInterestsForBackend`, `mapMajorNodesToUi`).
  - Constants: UPPER_SNAKE_CASE (`BACKEND_SUBJECT_KEYS`, `DEFAULT_GRADE`).

---

## 5. 🛠️ Workflow & Perintah Penting

Semua perintah dijalankan menggunakan **`npm`**:

```bash
# Instalasi dependensi
npm install

# Menjalankan development server lokal (Vite auto-reload)
npm run dev

# Memeriksa standar kode dan hooks (wajib 0 error sebelum commit)
npm run lint

# Menjalankan build produksi PWA
npm run build

# Menjalankan pratinjau hasil build produksi lokal
npm run preview
```
