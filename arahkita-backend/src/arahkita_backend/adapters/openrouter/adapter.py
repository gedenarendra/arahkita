from openai import AsyncOpenAI

from arahkita_backend.adapters.openrouter.entry import (
    evaluate_essay_answer,
    fetch_core_subjects,
    fetch_knowledge_clusters,
    fetch_major_recommendations,
    fetch_minicases_generation,
    fetch_preview_generation,
    fetch_single_subject_trials,
    fetch_subject_relevances,
)
from arahkita_backend.config.settings import Settings
from arahkita_backend.schemas.essay_eval import (
    EssayEvaluationRequest,
    EssayEvaluationResult,
)
from arahkita_backend.schemas.input import InputKeminatan
from arahkita_backend.schemas.knowledge_cluster import KnowledgeClusterLLMItem
from arahkita_backend.schemas.minicase_node import (
    GenerateMinicasesRequest,
    SubjectTrialLLMItem,
)
from arahkita_backend.schemas.preview import (
    GeneratePreviewRequest,
    PreviewLLMResponse,
)


class OpenRouterAdapter:
    """Adapter untuk berkomunikasi dengan model AI di OpenRouter."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = AsyncOpenAI(
            base_url=settings.openrouter_base_url,
            api_key=settings.openrouter_api_key,
        )

    async def fetch_major_recommendations(self, profile: InputKeminatan) -> list[str]:
        """Mengambil rekomendasi jurusan menggunakan konfigurasi client adapter."""
        return await fetch_major_recommendations(
            profile=profile,
            settings=self.settings,
            client=self.client,
        )

    async def fetch_knowledge_clusters(
        self, majors: list[str], profile: InputKeminatan | None = None
    ) -> list[KnowledgeClusterLLMItem]:
        """Mengelompokkan 5 nama jurusan ke dalam 1–5 rumpun keilmuan."""
        return await fetch_knowledge_clusters(
            majors=majors,
            settings=self.settings,
            profile=profile,
            client=self.client,
        )

    async def fetch_minicases_generation(
        self, request: GenerateMinicasesRequest
    ) -> list[SubjectTrialLLMItem]:
        """Mengambil hasil generasi mata kuliah dan minicases trial."""
        return await fetch_minicases_generation(
            request=request,
            settings=self.settings,
            client=self.client,
        )

    async def fetch_core_subjects(
        self, major_name: str, profile: InputKeminatan | None = None
    ) -> list[str]:
        """Mengambil 3–5 mata kuliah dasar esensial untuk jurusan tertentu (Tahap 1 paralel)."""
        return await fetch_core_subjects(
            major_name=major_name,
            settings=self.settings,
            profile=profile,
            client=self.client,
        )

    async def fetch_single_subject_trials(
        self,
        major_name: str,
        subject_name: str,
        profile: InputKeminatan | None = None,
    ) -> SubjectTrialLLMItem:
        """Mengambil studi kasus (MCQ + Esai) untuk satu mata kuliah dengan retry (Tahap 2 paralel)."""
        return await fetch_single_subject_trials(
            major_name=major_name,
            subject_name=subject_name,
            settings=self.settings,
            profile=profile,
            client=self.client,
        )

    async def evaluate_essay_answer(
        self, request: EssayEvaluationRequest
    ) -> EssayEvaluationResult:
        """Mengevaluasi jawaban esai reflektif siswa secara real-time."""
        return await evaluate_essay_answer(
            request=request,
            settings=self.settings,
            client=self.client,
        )

    async def fetch_preview_generation(
        self, request: GeneratePreviewRequest, matching_percentage: int
    ) -> PreviewLLMResponse:
        """Mengambil hasil generasi preview rangkuman jurusan dan career path dari LLM."""
        return await fetch_preview_generation(
            request=request,
            matching_percentage=matching_percentage,
            settings=self.settings,
            client=self.client,
        )

    async def fetch_subject_relevances(
        self,
        completed_majors: list[dict[str, str]],
        candidate_subjects: list[str],
    ) -> dict[str, list[str]]:
        """Mengambil pemetaan mata pelajaran relevan untuk completed major nodes."""
        return await fetch_subject_relevances(
            completed_majors=completed_majors,
            candidate_subjects=candidate_subjects,
            settings=self.settings,
            client=self.client,
        )


__all__ = [
    "OpenRouterAdapter",
]
