# AGENTS.md — Panduan Konteks & Standar Teknis ArahKita Backend

Dokumen ini adalah acuan utama bagi AI Coding Agent dan pengembang manusia dalam memahami visi produk, arsitektur teknis, serta aturan penulisan kode (*code guidelines*) untuk repositori **`arahkita-backend`**.

---

## 1. 🎯 Visi & Konteks Produk

### 1.1. Latar Belakang & Tema
- **Nama Proyek**: ArahKita
- **Tujuan**: Mengikuti kompetisi Hackathon dengan tema **Edukasi**.
- **Sub-Tema Masalah**:
  > *"Siswa SMA/SMK kelas akhir yang sedang bingung/kesulitan menentukan jurusan, memilih jalur pendidikan, dan merencanakan karir sesuai minat serta kemampuan yang dimiliki."*
- **Deliverable Akhir**: **Prototipe Fungsional** (bukan MVP penuh) yang berfokus mendalam pada 2 fitur inti.

### 1.2. Dua Fitur Utama Prototipe
1. **Onboarding Survey & Rekomendasi Jurusan (Root Nodes)**:
   - Saat pengguna pertama kali membuka aplikasi frontend, mereka mengisi survei minat dan nilai mata pelajaran akhir (`Matematika`, `IPA`, `Bahasa_Inggris`) sesuai skema [`InputKeminatan`](src/arahkita_backend/schemas/input.py).
   - Backend memproses data tersebut menggunakan LLM dan mengembalikan 2–6 pilihan rekomendasi jurusan kuliah dalam bentuk node visual (`MajorNode`) yang siap disimpan di SQLite lokal frontend untuk kapabilitas offline.
2. **Eksplorasi Pohon Jurusan & Interactive Trial (Child Nodes & Summary)**:
   - Pengguna memilih salah satu jurusan rekomendasi yang membuat mereka penasaran.
   - Node pertama (nomor 1) dialokasikan khusus untuk panduan/aturan pengerjaan (*rules*) yang dikelola langsung oleh frontend di state/SQLite lokal.
   - Backend men-generate *child nodes* studi kasus (`MinicaseNode`) dari jurusan tersebut, dengan nomor urut `minicase_number` dimulai dari **2 hingga maksimal 11** (berasal dari 3–5 mata kuliah dasar × 2 studi kasus: 1 Pilihan Ganda + 1 Esai).
   - Pengguna menyelesaikan trial satu demi satu.
   - Setelah trial selesai, backend menyusun dan mengembalikan sebuah **Rangkuman Keminatan Komprehensif** berdasarkan performa dan preferensi siswa selama trial.

---

## 2. 🧠 Karakteristik & Arsitektur Backend

Backend ArahKita bersifat **LLM-Centric** (berpusat pada kapabilitas penalaran dan generasi AI).

### 2.1. Tanggung Jawab Utama Backend
- **Generasi Jurusan Awal**: Analisis minat & nilai menjadi 2–6 jurusan relevan.
- **Generasi Pohon Node & Mini-case Trial**: Pembuatan studi kasus interaktif untuk setiap child node.
- **Sintesis Rangkuman Evaluasi**: Merangkum hasil penyelesaian trial siswa menjadi saran karir konkret.
- **Dukungan Status Generasi**: Streaming atau pengiriman status progress berkala ketika LLM men-generate batch mini-case dan rangkuman.
- **Enrichment RAG (Opsional / Next Step)**: Memberikan basis data statistik riil, pasar kerja, dan survei alumni/industri ke dalam prompt LLM untuk legitimasi rekomendasi tanpa halusinasi.

### 2.2. Tech Stack Inti
- **Language**: Python `>= 3.12`
- **Package Manager**: [`uv`](https://docs.astral.sh/uv/) (cepat, deterministik via `uv.lock`)
- **Web Framework**: FastAPI (asynchronous, performan tinggi)
- **Validation**: Pydantic v2 (skema data request, response, dan structured output LLM)
- **LLM Gateway**: OpenRouter menggunakan client `AsyncOpenAI` dari official SDK `openai>=1.50.0`
- **Model Default**: `deepseek/deepseek-v4-flash-0731` (atau model lain via env `OPENROUTER_MODEL`)
- **Server Runner**: Uvicorn

### 2.3. Pola Desain (Pragmatic Functional)
- **Pure Async Functions**: Business logic diisolasi dalam fungsi-fungsi async murni tanpa *state* tersembunyi.
- **Light Dependency Injection**: Memanfaatkan `Depends()` FastAPI untuk menyuplai konfigurasi (`Settings`) dan client adapter (`OpenRouterAdapter`).
- **Pemisahan Lapisan Bersih**:
  - `config/`: Immutable settings via `@dataclass(frozen=True)`.
  - `schemas/`: Pydantic models untuk kontrak API dan parsing output LLM.
  - `adapters/`: Lapisan I/O pihak ketiga (OpenRouter API).
  - `services/`: Orkestrasi logika bisnis dan perakitan model data.
  - `api/v1/`: Endpoint router modular berbasis prefix dan tags.
  - `utils/`: Fungsi utilitas deterministik (UUID, palet warna).

---

## 3. 📂 Struktur Direktori Proyek

```text
arahkita-backend/
├── Dockerfile
├── docker-compose.yaml
├── pyproject.toml
├── uv.lock
├── README.md
├── AGENTS.md
└── src/arahkita_backend/
    ├── __init__.py                 # Package root & app exports
    ├── __main__.py                 # Runner entrypoint (python -m arahkita_backend)
    ├── main.py                     # Instance FastAPI app, middleware, & health check
    ├── deps.py                     # FastAPI dependency injection providers
    ├── config/
    │   ├── __init__.py
    │   └── settings.py             # Immutable settings (@dataclass(frozen=True))
    ├── schemas/
    │   ├── __init__.py
    │   ├── input.py                # Schema input: InputKeminatan, SubjectsScore
    │   └── major_node.py           # Schema output: MajorNode, LLM response wrappers
    ├── adapters/
    │   ├── __init__.py
    │   └── openrouter_adapter.py   # Komunikasi OpenAI SDK ke OpenRouter
    ├── services/
    │   ├── __init__.py
    │   └── major_service.py        # Logika perakitan node & rekomendasi jurusan
    ├── utils/
    │   ├── __init__.py
    │   ├── colors.py               # Palet kurasi warna hex ramah mata & selector
    │   └── ids.py                  # Generator UUID v4
    └── api/
        ├── __init__.py
        └── v1/
            ├── __init__.py
            └── majors.py           # APIRouter: POST /api/v1/majors/recommend
```

---

## 4. 📏 Standar Penulisan Kode: Python Strict (Pylance / Pyright)

Seluruh kontribusi kode di repositori ini **WAJIB lolos pemeriksaan Pylance / Pyright dengan mode `strict`**. Tidak ada toleransi untuk tipe implisit atau *unsafe casting*.

### 4.1. Anotasi Tipe Penuh (Complete Type Annotations)
- Semua fungsi, metode kelas, argumen, dan nilai kembalian (*return type*) **harus** memiliki anotasi tipe eksplisit.
- Dilarang membuat fungsi tanpa tipe return, termasuk `-> None`:
  ```python
  # ❌ SALAH
  def hitung_nilai(skor):
      return skor * 10

  # ✅ BENAR
  def hitung_nilai(skor: int) -> int:
      return skor * 10
  ```

### 4.2. Larangan Penggunaan `Any` Tanpa Batasan
- Hindari `typing.Any` sebisa mungkin.
- Jika menerima data JSON mentah yang belum divalidasi, gunakan tipe yang lebih semantik seperti `dict[str, object]` atau validasikan segera ke dalam **Pydantic Model**.
- Jika `Any` mutlak diperlukan karena batasan third-party library, lakukan *type narrowing* (`isinstance`) sesegera mungkin.

### 4.3. Sintaks Python 3.12+ Modern
Gunakan sintaks tipe bawaan Python modern:
- Gunakan `list[T]`, `dict[K, V]`, `set[T]`, `tuple[T, ...]` (bukan `typing.List`, `typing.Dict`, dll).
- Gunakan union operator `|` untuk tipe opsional atau alternatif:
  - `str | None` (bukan `typing.Optional[str]` atau `typing.Union[str, None]`).
  - `int | float` (bukan `typing.Union[int, float]`).

### 4.4. Validasi Null Safety & Type Narrowing
- Pylance mode `strict` melarang dereferensi variabel yang berpotensi bernilai `None`.
- Selalu gunakan pengecekan eksplisit / guard clause sebelum mengakses properti objek:
  ```python
  # ❌ SALAH (Pylance strict error: Object of type "None" cannot be used as ...)
  raw_content: str | None = response.choices[0].message.content
  cleaned = raw_content.strip()

  # ✅ BENAR
  raw_content: str | None = response.choices[0].message.content
  if not raw_content:
      raise ValueError("Konten respons kosong dari OpenRouter")
  cleaned = raw_content.strip()
  ```

### 4.5. Standar Pydantic v2
- Gunakan `pydantic.Field` untuk memberikan metadata, batas nilai, dan deskripsi:
  ```python
  class SubjectsScore(BaseModel):
      Matematika: int = Field(..., ge=0, le=100, description="Nilai Matematika (0-100)")
  ```
- Gunakan metode v2 seperti `model_validate()`, `model_validate_json()`, dan `model_dump()` (hindari metode v1 yang deprecated seperti `.dict()` atau `.parse_raw()`).

### 4.6. Imutabilitas & Penanganan Modul
- Modul konfigurasi harus imutabel (`@dataclass(frozen=True)`).
- Setiap package `__init__.py` harus secara eksplisit mendefinisikan `__all__ = [...]` untuk menghindari *implicit re-export warnings* di Pyright.

### 4.7. Dependency Injection di FastAPI
- Gunakan `typing.Annotated` bersama `Depends()` untuk injeksi parameter di handler router:
  ```python
  @router.post("/recommend", response_model=list[MajorNode])
  async def recommend_majors(
      payload: InputKeminatan,
      adapter: Annotated[OpenRouterAdapter, Depends(get_openrouter_adapter)],
  ) -> list[MajorNode]:
      return await get_major_recommendations(payload, adapter)
  ```

---

## 5. 🛠️ Workflow & Perintah Penting

Semua perintah dijalankan menggunakan **`uv`**:

```bash
# Sinkronisasi dependensi
uv sync

# Menambah dependensi baru
uv add <package_name>

# Menjalankan server lokal (auto-reload)
uv run python -m arahkita_backend

# Menjalankan type checker (verifikasi strict Pylance/Pyright)
uv run pyright

# Menjalankan unit test
uv run python -m unittest discover -s tests
```
