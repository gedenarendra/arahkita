# 🧭 Arahkita MVP

**Arahkita** adalah platform aplikasi web progresif (*Progressive Web App / PWA*) yang dirancang untuk membantu siswa dan pelajar menemukan minat, bakat, serta rekomendasi jurusan perguruan tinggi yang paling tepat untuk masa depan mereka.

---

## 🚀 Fitur Utama

### 1. **Onboarding & Splash Screen**
- **Animasi Selamat Datang**: Transisi awal interaktif berbasis Lottie animasi.
- **Pengenalan Platform**: Panduan awal yang ramah pengguna untuk mengenalkan visi Arahkita.

### 2. **Personalisasi Nilai & Minat (*Grades & Interest Discovery*)**
- **Input Nilai Rata-rata**:
  - Pencarian dan pemilihan mata pelajaran (Matematika, IPA, IPS, Fisika, Biologi, dsb.).
  - Input nilai akademik (0–100) dengan validasi angka positif.
- **Eksplorasi Minat (*Interests*)**:
  - Pemilihan kategori visual berbasis gelembung (*category bubbles*): Geografi, Bisnis, Teknologi, Sosial, Sains, Komunikasi, Riset.
  - Penambahan minat kustom manual via input interaktif.
  - Daftar minat yang dapat dikelola (tambah & hapus).
- **Proses Rekomendasi (*Generating*)**: Tampilan animasi pemrosesan hasil rekomendasi jurusan.

### 3. **Peta Jalur Belajar & Latihan (*Learning Graph Roadmap*)**
- Tampilan jalur *node* bertingkat interaktif dengan indikator level (*star badge platform*).
- Status level terbuka (*unlocked*) dan terkunci (*locked*).
- Animasi bertahap untuk transisi antar level latihan.

### 4. **Uji Diagnostik Jurusan (*Diagnostic Test*)**
- **Syarat & Ketentuan (*Terms & Policy*)**: Konfirmasi sebelum memulai tes.
- **Soal Pilihan Ganda**: Pilihan opsi responsif dengan penanda visual status terpilih.
- **Soal Esai**: Input jawaban esai dengan judul jurusan dinamis sesuai pilihan siswa.

### 5. **Dukungan Progressive Web App (PWA)**
- Dapat diinstal langsung di perangkat mobile maupun desktop (*Add to Home Screen*).
- Dukungan offline cache dengan Service Worker dan Workbox.

---

## 🛠️ Teknologi yang Digunakan

| Teknologi | Keterangan |
|---|---|
| **React 19** | Library UI modern untuk performa tinggi |
| **Vite** | Build tool dan dev server berkecepatan tinggi |
| **Tailwind CSS v4** | Framework styling berbasis utilitas modern |
| **Vite PWA Plugin** | Konfigurasi PWA, Service Worker, dan Web Manifest |
| **Lottie Web** | Rendering animasi vektor interaktif berbasis JSON |

---

## 📁 Struktur Direktori

```plaintext
arahKita-mvp/
├── public/                     # Aset statis PWA (ikon, manifest, dsb.)
├── src/
│   ├── assets/                 # Gambar, vektor SVG, dan animasi Lottie
│   ├── components/             # Komponen UI modular
│   │   ├── splash/             # Komponen tahapan onboarding & splash
│   │   │   ├── WelcomeStep.jsx
│   │   │   ├── InterestStep.jsx
│   │   │   ├── GradesStep.jsx
│   │   │   ├── GradesComponent.jsx
│   │   │   ├── InterestComponent.jsx
│   │   │   └── GeneratingStep.jsx
│   │   ├── test/               # Komponen uji diagnostik (Terms, Soal)
│   │   │   ├── TermsPolicyComponent.jsx
│   │   │   └── QuestionComponent.jsx
│   │   ├── GraphNodeComponent.jsx
│   │   ├── PlatformNode.jsx
│   │   └── MajorTestComponent.jsx
│   ├── pages/                  # Halaman utama aplikasi
│   │   ├── AnimationPages.jsx
│   │   ├── splashPages.jsx
│   │   ├── graphNodePages.jsx
│   │   └── TestPages.jsx
│   ├── App.jsx                 # Entrypoint routing & alur aplikasi
│   ├── main.jsx                # Render React root & Service Worker
│   └── index.css               # Styling global & Tailwind setup
├── .gitignore                  # Aturan file yang diabaikan Git
├── index.html                  # Dokumen HTML utama
├── package.json                # Dependencies & scripts
└── vite.config.js              # Konfigurasi Vite & plugin PWA
```

---

## 💻 Memulai Pengembangan Lokal (*Getting Started*)

### Prasyarat
- Pastikan telah menginstal **Node.js** (versi 18+ direkomendasikan) dan **npm**.

### 1. Clone Repositori
```bash
git clone https://github.com/USERNAME/NAMA-REPO.git
cd arahKita-mvp
```

### 2. Instalasi Dependensi
```bash
npm install
```

### 3. Menjalankan Server Pengembangan
```bash
npm run dev
```
Buka browser dan akses alamat lokal yang ditampilkan (biasanya `http://localhost:5173`).

### 4. Build untuk Produksi
```bash
npm run build
```
Hasil build yang siap dideploy akan berada di folder `dist/`.

### 5. Preview Hasil Build
```bash
npm run preview
```

---

## 📄 Lisensi
Proyek ini dikembangkan untuk kebutuhan internal dan pengembangan platform **Arahkita**.
