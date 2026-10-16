from typing import Literal
from pydantic import BaseModel, Field

from arahkita_backend.schemas.major_node import MajorNode


class KnowledgeCluster(BaseModel):
    id: str = Field(
        ...,
        pattern=r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        description="UUID v4 node payung rumpun keilmuan",
    )
    cluster_name: str = Field(
        ...,
        min_length=1,
        description="Nama komunikatif rumpun keilmuan (misal: 'Teknologi & Rekayasa')",
    )
    circle_color: str = Field(
        ...,
        pattern=r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
        description="Kode warna hex lingkaran dari palet kurasi",
    )
    major_group: list[str] = Field(
        default_factory=list,
        description="Daftar UUID v4 major_node yang bernaung di bawah rumpun ini",
    )


class RecommendClustersResponse(BaseModel):
    clusters: list[KnowledgeCluster] = Field(
        default_factory=list,
        description="Daftar rumpun keilmuan (1 hingga 5 node)",
    )
    majors: list[MajorNode] = Field(
        default_factory=list,
        description="Daftar jurusan rekomendasi (5 node)",
    )


class SSEClusterMessage(BaseModel):
    type: Literal["status", "cluster", "major", "done", "error"]
    data: dict[str, object] | KnowledgeCluster | MajorNode


class KnowledgeClusterLLMItem(BaseModel):
    cluster_name: str = Field(
        ..., min_length=1, description="Nama rumpun keilmuan komunikatif"
    )
    majors: list[str] = Field(
        ..., min_length=1, description="Daftar nama jurusan yang masuk ke rumpun ini"
    )


class KnowledgeClusterLLMResponse(BaseModel):
    clusters: list[KnowledgeClusterLLMItem] = Field(
        default_factory=list,
        description="Daftar 1 hingga 5 kelompok rumpun keilmuan",
    )


__all__ = [
    "KnowledgeCluster",
    "KnowledgeClusterLLMItem",
    "KnowledgeClusterLLMResponse",
    "RecommendClustersResponse",
    "SSEClusterMessage",
]
