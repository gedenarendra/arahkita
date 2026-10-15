from pydantic import BaseModel, Field


class EssayEvaluationRequest(BaseModel):
    question: str = Field(..., min_length=5, description="Pertanyaan esai reflektif")
    evaluation_hint: str = Field(
        ..., min_length=3, description="Pedoman kriteria penilaian skor tinggi vs rendah"
    )
    user_answer: str = Field(..., min_length=1, description="Jawaban esai dari siswa")
    minicase_id: str | None = Field(
        default=None,
        pattern=r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        description="UUID node minicase untuk keperluan logging/tracing",
    )


class EssayEvaluationResult(BaseModel):
    analytical_fit: int = Field(
        ..., ge=1, le=5, description="Skor pola pikir & problem solving (skala 1–5)"
    )
    interest_signal: int = Field(
        ..., ge=1, le=5, description="Skor sinyal antusiasme & resiliensi (skala 1–5)"
    )
    is_serious_attempt: bool = Field(
        ..., description="Guardrail apakah jawaban diisi dengan sungguh-sungguh"
    )


class EssayEvaluationLLMResponse(BaseModel):
    analytical_fit: int = Field(..., ge=1, le=5)
    interest_signal: int = Field(..., ge=1, le=5)
    is_serious_attempt: bool
