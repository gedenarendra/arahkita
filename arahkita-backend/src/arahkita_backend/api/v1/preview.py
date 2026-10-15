from typing import Annotated
from fastapi import APIRouter, Depends, Path

from arahkita_backend.adapters.openrouter_adapter import OpenRouterAdapter
from arahkita_backend.deps import get_openrouter_adapter
from arahkita_backend.schemas.preview import (
    GeneratePreviewRequest,
    MajorNodePreview,
)
from arahkita_backend.services.preview_service import generate_major_preview

router = APIRouter(prefix="/preview", tags=["Preview"])


@router.post("/{major_node_id}", response_model=MajorNodePreview)
async def get_major_node_preview(
    major_node_id: Annotated[
        str,
        Path(
            ...,
            pattern=r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
            description="UUID v4 node rekomendasi jurusan",
        ),
    ],
    payload: GeneratePreviewRequest,
    adapter: Annotated[OpenRouterAdapter, Depends(get_openrouter_adapter)],
) -> MajorNodePreview:
    """Endpoint untuk mendapatkan rangkuman evaluasi (preview) dan jalur karir dari 1 jurusan.

    Menghasilkan:
    1. matching_percentage (1–100%) hasil formula deterministik terbobot.
    2. preview (narasi rangkuman evaluasi maksimal 200 kata dari LLM).
    3. career_paths (1 s.d. 4 rekomendasi profesi karir dengan judul maksimal 2 kata).
    Semua entitas memiliki UUID v4 dan siap disimpan langsung ke IndexedDB (Dexie.js).
    """
    return await generate_major_preview(major_node_id, payload, adapter)
