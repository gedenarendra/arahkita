from typing import Annotated
from fastapi import APIRouter, Depends

from arahkita_backend.adapters.openrouter import OpenRouterAdapter
from arahkita_backend.deps import get_openrouter_adapter
from arahkita_backend.schemas.recommendation_result import (
    MajorRecommendationResult,
    RecommendationResultsRequest,
)
from arahkita_backend.services.recommendation_result_service import (
    calculate_recommendation_leaderboard,
)

router = APIRouter(
    prefix="/recommendation-results",
    tags=["Recommendation Results"],
)


@router.post("", response_model=list[MajorRecommendationResult])
async def get_recommendation_results(
    payload: RecommendationResultsRequest,
    adapter: Annotated[OpenRouterAdapter, Depends(get_openrouter_adapter)],
) -> list[MajorRecommendationResult]:
    """Menyusun leaderboard rekomendasi jurusan berdasarkan matching_percentage.

    Mengurutkan major_node dari persentase kecocokan tertinggi ke terendah.
    Jika ada jurusan yang belum dikerjakan, nilainya tetap 0 dan diletakkan di bawah.
    Jika seluruh jurusan belum dikerjakan, semua jurusan dikembalikan dengan matching_percentage 0.
    Untuk jurusan yang sudah diselesaikan, badge relevansi mata pelajaran SMA/SMK (1-3)
    akan dievaluasi secara cerdas menggunakan LLM jika data profil keminatan disertakan.
    """
    return await calculate_recommendation_leaderboard(payload, adapter)

