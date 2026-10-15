import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from arahkita_backend.api.v1.majors import router as majors_router
from arahkita_backend.api.v1.minicases import router as minicases_router
from arahkita_backend.api.v1.preview import router as preview_router
from arahkita_backend.api.v1.recommendation_results import (
    router as recommendation_results_router,
)
from arahkita_backend.config.settings import get_settings

app = FastAPI(
    title="ArahKita Backend",
    version="0.1.0",
    description="Backend API untuk sistem rekomendasi keminatan jurusan ArahKita",
)

# CORS Middleware agar dapat diakses dari Frontend PWA
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrasi Modular Router
app.include_router(majors_router, prefix="/api/v1")
app.include_router(minicases_router, prefix="/api/v1")
app.include_router(preview_router, prefix="/api/v1")
app.include_router(recommendation_results_router, prefix="/api/v1")



@app.get("/health", tags=["Health"])
async def health_check() -> dict[str, str]:
    """Endpoint pengecekan status server."""
    return {"status": "ok", "version": "0.1.0"}


def main() -> None:
    """Fungsi runner server untuk local dev dan CLI entrypoint."""
    settings = get_settings()
    uvicorn.run(
        "arahkita_backend.main:app",
        host=settings.app_host,
        port=settings.app_port,
        reload=True,
    )


if __name__ == "__main__":
    main()
