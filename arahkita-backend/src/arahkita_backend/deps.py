from typing import Annotated
from fastapi import Depends

from arahkita_backend.adapters.openrouter_adapter import OpenRouterAdapter
from arahkita_backend.config.settings import Settings, get_settings


def get_app_settings() -> Settings:
    """Dependency provider untuk konfigurasi aplikasi (Settings)."""
    return get_settings()


def get_openrouter_adapter(
    settings: Annotated[Settings, Depends(get_app_settings)],
) -> OpenRouterAdapter:
    """Dependency provider untuk menginstansiasi OpenRouterAdapter."""
    return OpenRouterAdapter(settings=settings)
