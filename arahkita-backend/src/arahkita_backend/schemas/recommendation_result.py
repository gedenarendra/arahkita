from pydantic import BaseModel, Field

from arahkita_backend.schemas.input import InputKeminatan
from arahkita_backend.schemas.major_node import MajorNode
from arahkita_backend.schemas.preview import MajorNodePreview


class MajorNodeSubjectRelevance(BaseModel):
    id: str = Field(
        ...,
        pattern=r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        description="UUID v4 entitas relevansi mapel",
    )
    major_node_id: str = Field(
        ...,
        pattern=r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        description="UUID v4 node jurusan terkait",
    )
    subject_name: str = Field(
        ..., min_length=1, description="Nama mata pelajaran SMA/SMK yang relevan"
    )


class MajorRecommendationResult(BaseModel):
    id: str = Field(
        ...,
        pattern=r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        description="UUID v4 node rekomendasi jurusan",
    )
    major_name: str = Field(
        ..., min_length=1, description="Nama jurusan rekomendasi"
    )
    circle_color: str = Field(
        ...,
        pattern=r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
        description="Kode warna hex lingkaran (misal: #4F46E5)",
    )
    child_id: str | None = Field(
        default=None, description="UUID node anak (opsional)"
    )
    matching_percentage: int = Field(
        default=0,
        ge=0,
        le=100,
        description="Persentase kecocokan keminatan (0–100%, bernilai 0 jika belum selesai)",
    )
    is_completed: bool = Field(
        default=False,
        description="Status apakah jurusan ini sudah selesai dievaluasi",
    )
    preview: MajorNodePreview | None = Field(
        default=None,
        description="Objek preview lengkap beserta jalur karir jika sudah selesai",
    )
    subject_relevances: list[MajorNodeSubjectRelevance] = Field(
        default_factory=list,
        description="Daftar badge mata pelajaran SMA/SMK yang relevan (1-3 untuk jurusan yang selesai)",
    )


class RecommendationResultsRequest(BaseModel):
    major_nodes: list[MajorNode] = Field(
        default_factory=list,
        description="Daftar node rekomendasi jurusan yang tersimpan di lokal pengguna",
    )
    previews: list[MajorNodePreview] = Field(
        default_factory=list,
        description="Daftar hasil preview/evaluasi jurusan yang sudah diselesaikan",
    )
    profile: InputKeminatan | None = Field(
        default=None,
        description="Profil keminatan siswa dari onboarding (opsional)",
    )


class MajorSubjectRelevanceLLMItem(BaseModel):
    major_node_id: str = Field(..., description="ID major_node")
    relevant_subjects: list[str] = Field(
        default_factory=list,
        description="Daftar nama mata pelajaran relevan (1-3 mapel)",
    )


class MajorSubjectRelevanceLLMResponse(BaseModel):
    relevances: list[MajorSubjectRelevanceLLMItem] = Field(
        default_factory=list,
        description="Daftar relevansi mapel untuk tiap major_node yang selesai",
    )

