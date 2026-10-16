from typing import Annotated
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from arahkita_backend.adapters.openrouter import OpenRouterAdapter
from arahkita_backend.deps import get_openrouter_adapter
from arahkita_backend.schemas.input import InputKeminatan
from arahkita_backend.schemas.knowledge_cluster import RecommendClustersResponse
from arahkita_backend.services.cluster_service import (
    ClusterSSEService,
    get_cluster_recommendations,
)

router = APIRouter(prefix="/clusters", tags=["Clusters"])


@router.post("/recommend-stream")
async def recommend_clusters_stream(
    payload: InputKeminatan,
    adapter: Annotated[OpenRouterAdapter, Depends(get_openrouter_adapter)],
) -> StreamingResponse:
    """Men-generate rekomendasi rumpun keilmuan dan jurusan secara streaming Server-Sent Events (SSE).

    Setiap event dikirim dalam format envelope JSON:
    data: {"type": "status" | "cluster" | "major" | "done" | "error", "data": ...}

    - "status": Progres tahapan analisis minat, generasi 5 jurusan, clustering, dan perakitan.
    - "cluster": Objek KnowledgeCluster individual (id, cluster_name, circle_color, major_group).
    - "major": Objek MajorNode individual (id, cluster_id, major_name, circle_color, child_id).
    - "done": Sinyal bahwa seluruh cluster dan major node selesai dirakit.
    - "error": Pesan kegagalan jika terjadi kendala pada proses generasi.
    """
    service = ClusterSSEService()
    return StreamingResponse(
        service.stream_recommendations(payload, adapter),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@router.post("/recommend", response_model=RecommendClustersResponse)
async def recommend_clusters(
    payload: InputKeminatan,
    adapter: Annotated[OpenRouterAdapter, Depends(get_openrouter_adapter)],
) -> RecommendClustersResponse:
    """Endpoint fallback sinkron untuk merekomendasikan rumpun keilmuan dan jurusan kuliah."""
    return await get_cluster_recommendations(payload, adapter)
