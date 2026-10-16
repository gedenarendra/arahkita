import logging
from openai import AsyncOpenAI

from arahkita_backend.adapters.openrouter.parser import (
    format_core_subjects_user_prompt,
    format_essay_eval_user_prompt,
    format_knowledge_cluster_user_prompt,
    format_minicases_user_prompt,
    format_preview_user_prompt,
    format_single_subject_user_prompt,
    format_subject_relevances_user_prompt,
    format_user_prompt,
)
from arahkita_backend.adapters.openrouter.system_prompt import (
    CORE_SUBJECTS_SYSTEM_PROMPT,
    ESSAY_EVALUATION_SYSTEM_PROMPT,
    KNOWLEDGE_CLUSTER_SYSTEM_PROMPT,
    MAJOR_RECOMMENDATION_SYSTEM_PROMPT,
    MINICASES_SYSTEM_PROMPT,
    PREVIEW_SYSTEM_PROMPT,
    SINGLE_SUBJECT_TRIAL_SYSTEM_PROMPT,
    SUBJECT_RELEVANCE_SYSTEM_PROMPT,
)
from arahkita_backend.config.settings import Settings
from arahkita_backend.schemas.essay_eval import (
    EssayEvaluationLLMResponse,
    EssayEvaluationRequest,
    EssayEvaluationResult,
)
from arahkita_backend.schemas.input import InputKeminatan
from arahkita_backend.schemas.knowledge_cluster import (
    KnowledgeClusterLLMItem,
    KnowledgeClusterLLMResponse,
)
from arahkita_backend.schemas.major_node import MajorRecommendationLLMResponse
from arahkita_backend.schemas.minicase_node import (
    CoreSubjectsLLMResponse,
    GenerateMinicasesRequest,
    MinicasesGenerationLLMResponse,
    SingleSubjectTrialLLMResponse,
    SubjectTrialLLMItem,
)
from arahkita_backend.schemas.preview import (
    GeneratePreviewRequest,
    PreviewLLMResponse,
)
from arahkita_backend.schemas.recommendation_result import (
    MajorSubjectRelevanceLLMResponse,
)
from arahkita_backend.utils.parser import clean_json_response

logger = logging.getLogger(__name__)

OPENROUTER_EXTRA_BODY: dict[str, object] = {
    "reasoning": {"effort": "none", "exclude": True},
    "provider": {"sort": "throughput"},
}


async def fetch_major_recommendations(
    profile: InputKeminatan,
    settings: Settings,
    client: AsyncOpenAI | None = None,
) -> list[str]:
    """Mengirim request ke OpenRouter untuk mendapatkan daftar 2–6 nama rekomendasi jurusan."""
    ai_client = client or AsyncOpenAI(
        base_url=settings.openrouter_base_url,
        api_key=settings.openrouter_api_key,
    )

    user_content = format_user_prompt(profile)

    response = await ai_client.chat.completions.create(
        model=settings.openrouter_model,
        messages=[
            {"role": "system", "content": MAJOR_RECOMMENDATION_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        max_tokens=1000,
        extra_body=OPENROUTER_EXTRA_BODY,
    )

    raw_content = response.choices[0].message.content
    if not raw_content:
        raise ValueError("OpenRouter mengembalikan respons kosong.")

    cleaned_json = clean_json_response(raw_content)

    try:
        parsed = MajorRecommendationLLMResponse.model_validate_json(cleaned_json)
    except Exception as exc:
        logger.error("Gagal melakukan parsing output LLM: %s. Raw: %s", exc, raw_content)
        raise ValueError(f"Gagal mem-parsing rekomendasi jurusan dari LLM: {exc}") from exc

    recommendations = [r.strip() for r in parsed.recommendations if r and r.strip()]
    return recommendations[:5]


async def fetch_knowledge_clusters(
    majors: list[str],
    settings: Settings,
    profile: InputKeminatan | None = None,
    client: AsyncOpenAI | None = None,
) -> list[KnowledgeClusterLLMItem]:
    """Mengirim request ke OpenRouter untuk mengelompokkan 5 jurusan ke dalam 1–5 rumpun keilmuan."""
    ai_client = client or AsyncOpenAI(
        base_url=settings.openrouter_base_url,
        api_key=settings.openrouter_api_key,
    )

    user_content = format_knowledge_cluster_user_prompt(majors=majors, profile=profile)

    response = await ai_client.chat.completions.create(
        model=settings.openrouter_model,
        messages=[
            {"role": "system", "content": KNOWLEDGE_CLUSTER_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        max_tokens=1000,
        extra_body=OPENROUTER_EXTRA_BODY,
    )

    raw_content = response.choices[0].message.content
    if not raw_content:
        raise ValueError("OpenRouter mengembalikan respons kosong untuk knowledge clusters.")

    cleaned_json = clean_json_response(raw_content)

    try:
        parsed = KnowledgeClusterLLMResponse.model_validate_json(cleaned_json)
    except Exception as exc:
        logger.error(
            "Gagal melakukan parsing output LLM knowledge cluster: %s. Raw: %s",
            exc,
            raw_content,
        )
        raise ValueError(
            f"Gagal mem-parsing knowledge cluster dari LLM: {exc}"
        ) from exc

    return parsed.clusters[:5]


async def fetch_minicases_generation(
    request: GenerateMinicasesRequest,
    settings: Settings,
    client: AsyncOpenAI | None = None,
) -> list[SubjectTrialLLMItem]:
    """Mengirim request ke OpenRouter untuk men-generate 3–5 mata kuliah dasar beserta studi kasus."""
    ai_client = client or AsyncOpenAI(
        base_url=settings.openrouter_base_url,
        api_key=settings.openrouter_api_key,
    )

    user_content = format_minicases_user_prompt(
        major_name=request.major_name,
        profile=request.profile,
    )

    response = await ai_client.chat.completions.create(
        model=settings.openrouter_model,
        messages=[
            {"role": "system", "content": MINICASES_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        max_tokens=3500,
        extra_body=OPENROUTER_EXTRA_BODY,
    )

    raw_content = response.choices[0].message.content
    if not raw_content:
        raise ValueError("OpenRouter mengembalikan respons kosong saat men-generate minicases.")

    cleaned_json = clean_json_response(raw_content)

    try:
        parsed = MinicasesGenerationLLMResponse.model_validate_json(cleaned_json)
    except Exception as exc:
        logger.error("Gagal melakukan parsing output LLM minicases: %s. Raw: %s", exc, raw_content)
        raise ValueError(f"Gagal mem-parsing minicases dari LLM: {exc}") from exc

    if not parsed.subjects:
        raise ValueError("LLM tidak menghasilkan subjek mata kuliah trial.")

    # Batasi minimal 1 dan maksimal 5 mata kuliah (total 2 s.d. 10 node)
    return parsed.subjects[:5]


async def evaluate_essay_answer(
    request: EssayEvaluationRequest,
    settings: Settings,
    client: AsyncOpenAI | None = None,
) -> EssayEvaluationResult:
    """Mengirim prompt evaluasi esai real-time ke OpenRouter dengan rubric injection."""
    ai_client = client or AsyncOpenAI(
        base_url=settings.openrouter_base_url,
        api_key=settings.openrouter_api_key,
    )

    user_content = format_essay_eval_user_prompt(
        question=request.question,
        evaluation_hint=request.evaluation_hint,
        user_answer=request.user_answer,
    )

    response = await ai_client.chat.completions.create(
        model=settings.openrouter_model,
        messages=[
            {"role": "system", "content": ESSAY_EVALUATION_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        max_tokens=1500,
        extra_body=OPENROUTER_EXTRA_BODY,
    )

    raw_content = response.choices[0].message.content
    if not raw_content:
        raise ValueError("OpenRouter mengembalikan respons kosong saat mengevaluasi esai.")

    cleaned_json = clean_json_response(raw_content)

    try:
        parsed = EssayEvaluationLLMResponse.model_validate_json(cleaned_json)
    except Exception as exc:
        logger.error("Gagal melakukan parsing output LLM evaluasi esai: %s. Raw: %s", exc, raw_content)
        raise ValueError(f"Gagal mem-parsing evaluasi esai dari LLM: {exc}") from exc

    # Penerapan guardrail deterministik: jika percobaan tidak serius, penalti nilai ke 1
    if not parsed.is_serious_attempt:
        return EssayEvaluationResult(
            analytical_fit=1,
            interest_signal=1,
            is_serious_attempt=False,
        )

    return EssayEvaluationResult(
        analytical_fit=parsed.analytical_fit,
        interest_signal=parsed.interest_signal,
        is_serious_attempt=True,
    )


async def fetch_preview_generation(
    request: GeneratePreviewRequest,
    matching_percentage: int,
    settings: Settings,
    client: AsyncOpenAI | None = None,
) -> PreviewLLMResponse:
    """Mengirim request ke OpenRouter untuk menghasilkan teks rangkuman evaluasi dan career paths dengan mekanisme retry."""
    ai_client = client or AsyncOpenAI(
        base_url=settings.openrouter_base_url,
        api_key=settings.openrouter_api_key,
    )

    user_content = format_preview_user_prompt(
        request=request,
        matching_percentage=matching_percentage,
    )

    last_error: Exception | None = None
    for attempt in range(2):
        try:
            response = await ai_client.chat.completions.create(
                model=settings.openrouter_model,
                messages=[
                    {"role": "system", "content": PREVIEW_SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
                response_format={"type": "json_object"},
                max_tokens=2500,
                extra_body=OPENROUTER_EXTRA_BODY,
            )

            raw_content = response.choices[0].message.content
            if not raw_content:
                raise ValueError(
                    f"OpenRouter mengembalikan respons kosong saat men-generate preview (percobaan {attempt + 1})."
                )

            cleaned_json = clean_json_response(raw_content)
            parsed = PreviewLLMResponse.model_validate_json(cleaned_json)
            return parsed
        except Exception as exc:
            last_error = exc
            logger.warning(
                "Gagal men-generate preview dari LLM (percobaan %d/2): %s",
                attempt + 1,
                exc,
            )

    raise ValueError(
        f"Gagal mem-parsing preview dari LLM setelah 2 percobaan: {last_error}"
    ) from last_error


async def fetch_subject_relevances(
    completed_majors: list[dict[str, str]],
    candidate_subjects: list[str],
    settings: Settings,
    client: AsyncOpenAI | None = None,
) -> dict[str, list[str]]:
    """Mengambil pemetaan mata pelajaran relevan untuk completed major nodes via LLM."""
    if not completed_majors or not candidate_subjects:
        return {}

    ai_client = client or AsyncOpenAI(
        base_url=settings.openrouter_base_url,
        api_key=settings.openrouter_api_key,
    )

    user_content = format_subject_relevances_user_prompt(
        completed_majors=completed_majors,
        candidate_subjects=candidate_subjects,
    )

    response = await ai_client.chat.completions.create(
        model=settings.openrouter_model,
        messages=[
            {"role": "system", "content": SUBJECT_RELEVANCE_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        max_tokens=1000,
        extra_body=OPENROUTER_EXTRA_BODY,
    )

    raw_content = response.choices[0].message.content
    if not raw_content:
        raise ValueError(
            "OpenRouter mengembalikan respons kosong saat evaluasi relevansi mapel."
        )

    cleaned_json = clean_json_response(raw_content)

    try:
        parsed = MajorSubjectRelevanceLLMResponse.model_validate_json(cleaned_json)
    except Exception as exc:
        logger.error(
            "Gagal melakukan parsing output LLM relevansi mapel: %s. Raw: %s",
            exc,
            raw_content,
        )
        raise ValueError(f"Gagal mem-parsing relevansi mapel dari LLM: {exc}") from exc

    return {
        item.major_node_id: item.relevant_subjects
        for item in parsed.relevances
    }


async def fetch_core_subjects(
    major_name: str,
    settings: Settings,
    profile: InputKeminatan | None = None,
    client: AsyncOpenAI | None = None,
) -> list[str]:
    """Mengambil 3–5 mata kuliah dasar esensial untuk jurusan tertentu (Tahap 1 paralel)."""
    ai_client = client or AsyncOpenAI(
        base_url=settings.openrouter_base_url,
        api_key=settings.openrouter_api_key,
    )

    user_content = format_core_subjects_user_prompt(
        major_name=major_name,
        profile=profile,
    )

    response = await ai_client.chat.completions.create(
        model=settings.openrouter_model,
        messages=[
            {"role": "system", "content": CORE_SUBJECTS_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        max_tokens=500,
        extra_body=OPENROUTER_EXTRA_BODY,
    )

    raw_content = response.choices[0].message.content
    if not raw_content:
        raise ValueError(
            "OpenRouter mengembalikan respons kosong saat mengambil daftar mata kuliah dasar."
        )

    cleaned_json = clean_json_response(raw_content)

    try:
        parsed = CoreSubjectsLLMResponse.model_validate_json(cleaned_json)
    except Exception as exc:
        logger.error(
            "Gagal melakukan parsing output LLM core subjects: %s. Raw: %s",
            exc,
            raw_content,
        )
        raise ValueError(f"Gagal mem-parsing mata kuliah dasar dari LLM: {exc}") from exc

    subjects = [s.strip() for s in parsed.subjects if s and s.strip()]
    if not subjects:
        raise ValueError("Daftar mata kuliah dasar kosong dari LLM.")

    return subjects[:5]


async def fetch_single_subject_trials(
    major_name: str,
    subject_name: str,
    settings: Settings,
    profile: InputKeminatan | None = None,
    client: AsyncOpenAI | None = None,
) -> SubjectTrialLLMItem:
    """Mengambil 1 MCQ + 1 Esai untuk 1 mata kuliah dasar dengan mekanisme retry (1x) jika gagal (Tahap 2 paralel)."""
    ai_client = client or AsyncOpenAI(
        base_url=settings.openrouter_base_url,
        api_key=settings.openrouter_api_key,
    )

    user_content = format_single_subject_user_prompt(
        major_name=major_name,
        subject_name=subject_name,
        profile=profile,
    )

    last_error: Exception | None = None
    for attempt in range(2):
        try:
            response = await ai_client.chat.completions.create(
                model=settings.openrouter_model,
                messages=[
                    {"role": "system", "content": SINGLE_SUBJECT_TRIAL_SYSTEM_PROMPT},
                    {"role": "user", "content": user_content},
                ],
                response_format={"type": "json_object"},
                max_tokens=1500,
                extra_body=OPENROUTER_EXTRA_BODY,
            )

            raw_content = response.choices[0].message.content
            if not raw_content:
                raise ValueError(
                    f"OpenRouter mengembalikan respons kosong untuk mata kuliah '{subject_name}' (percobaan {attempt + 1})."
                )

            cleaned_json = clean_json_response(raw_content)
            parsed = SingleSubjectTrialLLMResponse.model_validate_json(cleaned_json)

            return SubjectTrialLLMItem(
                subject_name=subject_name,
                mcq=parsed.mcq,
                essay=parsed.essay,
            )
        except Exception as exc:
            last_error = exc
            logger.warning(
                "Gagal men-generate trial untuk matkul '%s' (percobaan %d/2): %s",
                subject_name,
                attempt + 1,
                exc,
            )

    raise ValueError(
        f"Gagal mem-parsing studi kasus untuk matkul '{subject_name}' setelah 2 percobaan: {last_error}"
    ) from last_error


__all__ = [
    "OPENROUTER_EXTRA_BODY",
    "fetch_major_recommendations",
    "fetch_knowledge_clusters",
    "fetch_minicases_generation",
    "evaluate_essay_answer",
    "fetch_preview_generation",
    "fetch_subject_relevances",
    "fetch_core_subjects",
    "fetch_single_subject_trials",
]
