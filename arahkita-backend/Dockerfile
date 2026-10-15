FROM python:3.12-slim

# Salin binary uv dari official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

# Install dependensi terlebih dahulu (memanfaatkan Docker cache layer)
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project --no-dev

# Salin seluruh kode program dan instal proyek
COPY . /app
RUN uv sync --frozen --no-dev

EXPOSE 8000

CMD ["uvicorn", "arahkita_backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
