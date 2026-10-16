import asyncio
import logging
from collections.abc import AsyncGenerator
from typing import Literal, NamedTuple

from arahkita_backend.adapters.openrouter import OpenRouterAdapter
from arahkita_backend.schemas.essay_eval import (
    EssayEvaluationRequest,
    EssayEvaluationResult,
)
from arahkita_backend.schemas.minicase_node import (
    GenerateMinicasesRequest,
    MinicaseNode,
    SSEMinicaseMessage,
    SubjectTrialLLMItem,
)
from arahkita_backend.utils.ids import generate_uuid

logger = logging.getLogger(__name__)


class _DraftMinicaseNode(NamedTuple):
    subject_name: str
    node_type: Literal["multiple_choice", "essay"]
    minicase_title: str
    question: str
    options: list[str] | None
    correct_answer: str | None
    evaluation_hint: str | None


def sanitize_title(raw_title: str) -> str:
    """Memastikan judul minicase interaktif maksimal terdiri dari 2 kata."""
    words = raw_title.strip().split()
    if len(words) > 2:
        return " ".join(words[:2])
    return raw_title.strip() or "Studi Kasus"


def assemble_nodes_from_subjects(
    request: GenerateMinicasesRequest,
    subjects: list[SubjectTrialLLMItem],
) -> list[MinicaseNode]:
    """Merakit list SubjectTrialLLMItem menjadi daftar MinicaseNode dengan rantai relasi lengkap."""
    raw_nodes_data: list[_DraftMinicaseNode] = []
    for subject in subjects:
        # Node Pilihan Ganda (Objektif)
        raw_nodes_data.append(
            _DraftMinicaseNode(
                subject_name=subject.subject_name,
                node_type="multiple_choice",
                minicase_title=sanitize_title(subject.mcq.minicase_title),
                question=subject.mcq.question,
                options=subject.mcq.options,
                correct_answer=subject.mcq.correct_answer,
                evaluation_hint=None,
            )
        )
        # Node Esai Reflektif
        raw_nodes_data.append(
            _DraftMinicaseNode(
                subject_name=subject.subject_name,
                node_type="essay",
                minicase_title=sanitize_title(subject.essay.minicase_title),
                question=subject.essay.question,
                options=None,
                correct_answer=None,
                evaluation_hint=subject.essay.evaluation_hint,
            )
        )

    total_nodes = len(raw_nodes_data)
    node_ids: list[str] = [generate_uuid() for _ in range(total_nodes)]

    assembled_nodes: list[MinicaseNode] = []
    for idx, data in enumerate(raw_nodes_data):
        is_last = idx == total_nodes - 1
        child_id = None if is_last else node_ids[idx + 1]

        assembled_nodes.append(
            MinicaseNode(
                id=node_ids[idx],
                parent_id=request.major_id,
                minicase_number=idx + 2,
                minicase_title=data.minicase_title,
                subject_name=data.subject_name,
                node_type=data.node_type,
                question=data.question,
                options=data.options,
                correct_answer=data.correct_answer,
                evaluation_hint=data.evaluation_hint,
                is_parent=not is_last,
                circle_color=request.circle_color,
                is_done=False,
                child_id=child_id,
            )
        )

    return assembled_nodes


async def generate_minicases_tree(
    request: GenerateMinicasesRequest,
    adapter: OpenRouterAdapter,
) -> list[MinicaseNode]:
    """Men-generate rantai node minicase secara paralel (Tahap 1 + Tahap 2) dengan fallback."""
    try:
        # Tahap 1: Tentukan 3–5 mata kuliah dasar esensial
        core_subjects = await adapter.fetch_core_subjects(
            major_name=request.major_name,
            profile=request.profile,
        )

        # Tahap 2: Buat studi kasus per mata kuliah secara paralel
        tasks = [
            adapter.fetch_single_subject_trials(
                major_name=request.major_name,
                subject_name=subj,
                profile=request.profile,
            )
            for subj in core_subjects
        ]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        successful_subjects: list[SubjectTrialLLMItem] = [
            res for res in results if isinstance(res, SubjectTrialLLMItem)
        ]

        if len(successful_subjects) >= 3:
            return assemble_nodes_from_subjects(request, successful_subjects)

        logger.warning(
            "Hasil paralel kurang dari 3 subjek (%d didapat). Melakukan fallback ke single prompt legacy.",
            len(successful_subjects),
        )
    except Exception as exc:
        logger.warning(
            "Gagal melakukan generasi minicases paralel: %s. Melakukan fallback ke single prompt legacy.",
            exc,
        )

    # Fallback ke generasi legacy single-prompt jika paralel gagal
    legacy_subjects = await adapter.fetch_minicases_generation(request)
    return assemble_nodes_from_subjects(request, legacy_subjects)


async def stream_minicases_tree(
    request: GenerateMinicasesRequest,
    adapter: OpenRouterAdapter,
) -> AsyncGenerator[str, None]:
    """Generator asinkron untuk streaming Server-Sent Events (SSE) pembentukan minicases tree."""
    # 1. Status awal
    init_msg = SSEMinicaseMessage(
        type="status",
        data={
            "stage": "analyzing",
            "message": f"Menganalisis kurikulum dasar {request.major_name}...",
            "progress": 10,
        },
    )
    yield f"data: {init_msg.model_dump_json()}\n\n"

    # 2. Tahap 1: Mengambil mata kuliah dasar
    try:
        core_subjects = await adapter.fetch_core_subjects(
            major_name=request.major_name,
            profile=request.profile,
        )
    except Exception as exc:
        logger.error("Gagal mendapatkan kurikulum dasar: %s", exc)
        err_msg = SSEMinicaseMessage(
            type="error",
            data={"message": f"Gagal menganalisis kurikulum dasar: {exc}"},
        )
        yield f"data: {err_msg.model_dump_json()}\n\n"
        return

    curriculum_msg = SSEMinicaseMessage(
        type="status",
        data={
            "stage": "curriculum_ready",
            "message": f"Ditemukan {len(core_subjects)} mata kuliah dasar inti.",
            "subjects": core_subjects,
            "progress": 25,
        },
    )
    yield f"data: {curriculum_msg.model_dump_json()}\n\n"

    # 3. Luncurkan seluruh task pembuatan studi kasus secara bersamaan di background
    tasks: list[asyncio.Task[SubjectTrialLLMItem]] = [
        asyncio.create_task(
            adapter.fetch_single_subject_trials(
                major_name=request.major_name,
                subject_name=subj,
                profile=request.profile,
            )
        )
        for subj in core_subjects
    ]

    total_possible_nodes = len(core_subjects) * 2
    node_ids: list[str] = [generate_uuid() for _ in range(total_possible_nodes)]

    emitted_nodes: list[MinicaseNode] = []
    total_subjects = len(core_subjects)

    for idx, (subj_name, task) in enumerate(zip(core_subjects, tasks)):
        progress_pct = 25 + int(((idx + 1) / total_subjects) * 65)
        case_status_msg = SSEMinicaseMessage(
            type="status",
            data={
                "stage": "generating_case",
                "message": f"Menyusun studi kasus #{idx + 1}: {subj_name}...",
                "progress": progress_pct,
            },
        )
        yield f"data: {case_status_msg.model_dump_json()}\n\n"

        try:
            subject_result = await task
        except Exception as exc:
            logger.warning(
                "Gagal men-generate studi kasus untuk '%s': %s", subj_name, exc
            )
            continue

        # Node Pilihan Ganda (MCQ)
        mcq_idx = len(emitted_nodes)
        mcq_node = MinicaseNode(
            id=node_ids[mcq_idx],
            parent_id=request.major_id,
            minicase_number=mcq_idx + 2,
            minicase_title=sanitize_title(subject_result.mcq.minicase_title),
            subject_name=subject_result.subject_name,
            node_type="multiple_choice",
            question=subject_result.mcq.question,
            options=subject_result.mcq.options,
            correct_answer=subject_result.mcq.correct_answer,
            evaluation_hint=None,
            is_parent=True,
            circle_color=request.circle_color,
            is_done=False,
            child_id=node_ids[mcq_idx + 1],
        )
        emitted_nodes.append(mcq_node)
        yield f"data: {SSEMinicaseMessage(type='node', data=mcq_node).model_dump_json()}\n\n"

        # Node Esai Reflektif
        essay_idx = len(emitted_nodes)
        is_last_subject = idx == total_subjects - 1
        essay_node = MinicaseNode(
            id=node_ids[essay_idx],
            parent_id=request.major_id,
            minicase_number=essay_idx + 2,
            minicase_title=sanitize_title(subject_result.essay.minicase_title),
            subject_name=subject_result.subject_name,
            node_type="essay",
            question=subject_result.essay.question,
            options=None,
            correct_answer=None,
            evaluation_hint=subject_result.essay.evaluation_hint,
            is_parent=not is_last_subject,
            circle_color=request.circle_color,
            is_done=False,
            child_id=None if is_last_subject else node_ids[essay_idx + 1],
        )
        emitted_nodes.append(essay_node)
        yield f"data: {SSEMinicaseMessage(type='node', data=essay_node).model_dump_json()}\n\n"

    # Evaluasi hasil akhir pengumpulan node
    if len(emitted_nodes) < 6:
        logger.error(
            "Total node terkumpul (%d) kurang dari batas minimal 6 (3 matkul).",
            len(emitted_nodes),
        )
        fail_msg = SSEMinicaseMessage(
            type="error",
            data={"message": "Gagal menghasilkan minimal 3 mata kuliah dasar."},
        )
        yield f"data: {fail_msg.model_dump_json()}\n\n"
        return

    # Jika subject terakhir gagal tapi subject sebelumnya berhasil, sesuaikan node penutup
    last_node = emitted_nodes[-1]
    if last_node.is_parent or last_node.child_id is not None:
        patched_last_node = MinicaseNode(
            id=last_node.id,
            parent_id=last_node.parent_id,
            minicase_number=last_node.minicase_number,
            minicase_title=last_node.minicase_title,
            subject_name=last_node.subject_name,
            node_type=last_node.node_type,
            question=last_node.question,
            options=last_node.options,
            correct_answer=last_node.correct_answer,
            evaluation_hint=last_node.evaluation_hint,
            is_parent=False,
            circle_color=last_node.circle_color,
            is_done=last_node.is_done,
            child_id=None,
        )
        yield f"data: {SSEMinicaseMessage(type='node', data=patched_last_node).model_dump_json()}\n\n"

    # 4. Sinyal selesai (done)
    done_msg = SSEMinicaseMessage(
        type="done",
        data={
            "total_nodes": len(emitted_nodes),
            "status": "completed",
            "message": "Seluruh studi kasus berhasil digenerasi.",
        },
    )
    yield f"data: {done_msg.model_dump_json()}\n\n"


async def evaluate_student_essay(
    request: EssayEvaluationRequest,
    adapter: OpenRouterAdapter,
) -> EssayEvaluationResult:
    """Mengevaluasi esai siswa menggunakan adapter AI."""
    return await adapter.evaluate_essay_answer(request)

