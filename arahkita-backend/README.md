# ArahKita Backend

Backend service untuk aplikasi **ArahKita** (Sistem Rekomendasi Jurusan & Peminatan Kuliah). Menggunakan arsitektur *Pragmatic Functional* dengan FastAPI, validasi Pydantic v2, light dependency injection, serta integrasi LLM OpenRouter (`deepseek/deepseek-v4-flash-0731`).

---

## 🚀 Memulai (Local Development)

### 1. Prasyarat
- Python `>= 3.12`
- [`uv`](https://docs.astral.sh/uv/) (direkomendasikan) atau `pip`

### 2. Konfigurasi Environment
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Isi variabel berikut:
```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxx
OPENROUTER_MODEL=deepseek/deepseek-v4-flash-0731
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
APP_HOST=0.0.0.0
APP_PORT=8000
```

### 3. Install Dependensi & Jalankan Server
Menggunakan `uv`:
```bash
# Sinkronisasi dependensi
uv sync

# Menjalankan server development dengan auto-reload
uv run python -m arahkita_backend
```
Server akan berjalan di `http://localhost:8000`.

---

## 🐳 Menjalankan dengan Docker & Docker Compose

### Menjalankan Container 24/7 di Server Lokal
```bash
# Build dan jalankan container di background
docker compose up -d --build

# Melihat log container
docker compose logs -f

# Menghentikan container
docker compose down
```

---

## 🌐 Panduan Deployment: Ubuntu Server + Cloudflare Tunnel

Untuk menjalankan backend 24/7 di Ubuntu Server lokal (misal laptop server rumah) dan mengeksposnya ke publik secara aman tanpa port forwarding / IP publik statis:

### 1. Pasang `cloudflared` di Ubuntu Server
```bash
# Download paket deb cloudflared
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb

# Install paket
sudo dpkg -i cloudflared.deb
```

### 2. Login ke Akun Cloudflare
```bash
cloudflared tunnel login
```
Perintah ini akan membuka tautan otorisasi browser untuk memilih domain aktif Anda di Cloudflare.

### 3. Buat Tunnel Baru
```bash
cloudflared tunnel create arahkita-tunnel
```
Catat `Tunnel ID` yang dihasilkan (misal `UUID-TUNNEL`).

### 4. Konfigurasi File Ingress Tunnel
Buat file konfigurasi di `~/.cloudflared/config.yml`:
```yaml
tunnel: UUID-TUNNEL
credentials-file: /home/USERNAME/.cloudflared/UUID-TUNNEL.json

ingress:
  # Rute domain publik ke backend FastAPI lokal
  - hostname: api.nyomanyogi.my.id
    service: http://localhost:8000
  # Catch-all rule (wajib ada di baris terakhir)
  - service: http_status:404
```

### 5. Hubungkan Subdomain DNS ke Tunnel
```bash
cloudflared tunnel route dns arahkita-tunnel api.nyomanyogi.my.id
```

### 6. Jalankan Cloudflare Tunnel sebagai System Service (Otomatis Aktif Saat Boot)
```bash
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```
Sekarang backend Anda aktif secara publik dan aman via HTTPS di `https://api.nyomanyogi.my.id`!

---

## 📡 Dokumentasi Endpoint API

Panduan integrasi lengkap untuk frontend (React + Vite, JavaScript) dapat dilihat di file **[`api_docs.md`](api_docs.md)**.

- **Live Production URL**: `https://api.nyomanyogi.my.id/api/v1`
- **Interactive Swagger UI**: `https://api.nyomanyogi.my.id/docs` (atau lokal `http://localhost:8000/docs`)
- **ReDoc**: `https://api.nyomanyogi.my.id/redoc` (atau lokal `http://localhost:8000/redoc`)
- **Health Check**: `GET https://api.nyomanyogi.my.id/health`

### `POST /api/v1/majors/recommend`

**Request Body:**
```json
{
  "minat": "Saya suka pemrograman web, robotika, dan analisis data",
  "nilai": {
    "Matematika": 88,
    "IPA": 85,
    "Bahasa_Inggris": 90
  }
}
```

**Response (`200 OK`):**
```json
[
  {
    "id": "2d14cb4a-8b63-4a15-bbf0-6be3f4b64811",
    "major_name": "Teknik Informatika",
    "circle_color": "#4F46E5",
    "child_id": null
  },
  {
    "id": "e93ad3a8-e161-4507-b353-8d0ceb4a6825",
    "major_name": "Sistem Informasi",
    "circle_color": "#059669",
    "child_id": null
  }
]
```
