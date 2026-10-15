from typing import Annotated
from fastapi import APIRouter, Depends

from arahkita_backend.adapters.openrouter_adapter import OpenRouterAdapter
from arahkita_backend.deps import get_openrouter_adapter
from arahkita_backend.schemas.input import InputKeminatan
from arahkita_backend.schemas.major_node import MajorNode
from arahkita_backend.services.major_service import get_major_recommendations

router = APIRouter(prefix="/majors", tags=["Majors"])


@router.post("/recommend", response_model=list[MajorNode])
async def recommend_majors(
    payload: InputKeminatan,
    adapter: Annotated[OpenRouterAdapter, Depends(get_openrouter_adapter)],
) -> list[MajorNode]:
    """Endpoint untuk merekomendasikan jurusan kuliah berdasarkan keminatan dan nilai siswa."""
    return await get_major_recommendations(payload, adapter)
