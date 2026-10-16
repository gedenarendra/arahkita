from typing import Annotated
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from arahkita_backend.adapters.openrouter import OpenRouterAdapter
from arahkita_backend.deps import get_openrouter_adapter
from arahkita_backend.schemas.essay_eval import (
    EssayEvaluationRequest,
    EssayEvaluationResult,
)
from arahkita_backend.schemas.minicase_node import (
    GenerateMinicasesRequest,
    MinicaseNode,
)
from arahkita_backend.services.minicase_service import (
    evaluate_student_essay,
    generate_minicases_tree,
    stream_minicases_tree,
)

router = APIRouter(prefix="/minicases", tags=["Minicases"])


@router.post("/generate", response_model=list[MinicaseNode])
async def generate_minicases(
    payload: GenerateMinicasesRequest,
    adapter: Annotated[OpenRouterAdapter, Depends(get_openrouter_adapter)],
) -> list[MinicaseNode]:
    """Men-generate rantai pohon minicase (6–10 node trial) berdasarkan jurusan yang dipilih.

    Hasil langsung siap disimpan secara offline ke IndexedDB (Dexie.js) pada frontend PWA.
    Node pertama ([0]) merupakan root child yang id-nya dapat disimpan sebagai child_id pada major_node.
    """
    return await generate_minicases_tree(payload, adapter)


@router.post("/generate-stream")
async def generate_minicases_stream(
    payload: GenerateMinicasesRequest,
    adapter: Annotated[OpenRouterAdapter, Depends(get_openrouter_adapter)],
) -> StreamingResponse:
    """Men-generate rantai pohon minicase secara streaming Server-Sent Events (SSE).

    Setiap event dikirim dalam format envelope JSON:
    data: {"type": "status" | "node" | "done" | "error", "data": ...}

    - "status": Informasi progress kurikulum dan penyusunan kasus trial.
    - "node": Objek MinicaseNode individual yang siap disimpan langsung ke SQLite/Dexie.js.
    - "done": Sinyal bahwa seluruh batch minicases selesai dirakit.
    - "error": Pesan kegagalan jika terjadi kendala pada proses generasi.
    """
    return StreamingResponse(
        stream_minicases_tree(payload, adapter),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )



@router.post("/evaluate-essay", response_model=EssayEvaluationResult)
async def evaluate_essay(
    payload: EssayEvaluationRequest,
    adapter: Annotated[OpenRouterAdapter, Depends(get_openrouter_adapter)],
) -> EssayEvaluationResult:
    """Mengevaluasi jawaban esai reflektif siswa secara real-time berdasarkan 3 dimensi terukur."""
    return await evaluate_student_essay(payload, adapter)
