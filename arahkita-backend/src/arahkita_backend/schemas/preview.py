from pydantic import BaseModel, Field

from arahkita_backend.schemas.input import InputKeminatan


class GeneratePreviewRequest(BaseModel):
    major_name: str = Field(..., min_length=1, description="Nama jurusan kuliah")
    mcq_accuracy: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="Persentase akurasi pilihan ganda (0–100)",
    )
    essay_analytical_score: float = Field(
        ...,
        ge=1.0,
        le=5.0,
        description="Skor rata-rata kemampuan analitis (skala 1–5)",
    )
    essay_interest_score: float = Field(
        ...,
        ge=1.0,
        le=5.0,
        description="Skor rata-rata sinyal minat (skala 1–5)",
    )
    total_trials_completed: int = Field(
        ...,
        ge=0,
        description="Jumlah trial yang telah diselesaikan",
    )
    user_satisfaction_rating: float | None = Field(
        default=None,
        ge=1.0,
        le=5.0,
        description="Rating kepuasan subjektif siswa terhadap trial (opsional, skala 1–5)",
    )
    profile: InputKeminatan | None = Field(
        default=None,
        description="Profil minat dan nilai siswa (opsional untuk memperkaya konteks)",
    )


class MajorNodeCareerPath(BaseModel):
    id: str = Field(
        ...,
        pattern=r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        description="UUID v4 career path",
    )
    major_node_preview_id: str = Field(
        ...,
        pattern=r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        description="Foreign Key UUID merujuk ke major_node_preview",
    )
    title: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Judul profesi karir (maksimal 2 kata)",
    )
    detail: str = Field(
        ...,
        min_length=1,
        description="Penjelasan komprehensif profesi karir (maksimal 100 kata)",
    )


class MajorNodePreview(BaseModel):
    id: str = Field(
        ...,
        pattern=r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        description="UUID v4 node preview jurusan",
    )
    major_node_id: str = Field(
        ...,
        pattern=r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        description="Foreign Key UUID merujuk ke major_node",
    )
    preview: str = Field(
        ...,
        min_length=1,
        description="Teks rangkuman naratif hasil trial & potensi (maksimal 200 kata)",
    )
    matching_percentage: int = Field(
        ...,
        ge=1,
        le=100,
        description="Persentase kecocokan keminatan (1–100%)",
    )
    career_paths: list[MajorNodeCareerPath] = Field(
        ...,
        min_length=1,
        max_length=4,
        description="Daftar 1 hingga 4 jalur karir terkait",
    )


class CareerPathLLMItem(BaseModel):
    title: str = Field(
        ...,
        min_length=1,
        max_length=50,
        description="Nama profesi karir (maksimal 2 kata)",
    )
    detail: str = Field(
        ...,
        min_length=1,
        description="Deskripsi tugas utama, skill, dan prospek karir (maksimal 100 kata)",
    )


class PreviewLLMResponse(BaseModel):
    preview: str = Field(
        ...,
        min_length=1,
        description="Teks rangkuman naratif dari LLM",
    )
    career_paths: list[CareerPathLLMItem] = Field(
        default_factory=list,
        description="Daftar rekomendasi karir terkait dari LLM beserta detailnya",
    )


