from pydantic import BaseModel, Field


class MajorNode(BaseModel):
    id: str = Field(
        ...,
        pattern=r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        description="UUID v4 node rekomendasi jurusan",
    )
    cluster_id: str | None = Field(
        default=None,
        pattern=r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        description="Foreign Key UUID merujuk ke KnowledgeCluster induk",
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


class MajorRecommendationLLMResponse(BaseModel):
    recommendations: list[str] = Field(
        default_factory=list,
        description="Daftar nama jurusan rekomendasi dari LLM",
    )
