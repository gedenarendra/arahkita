from typing import Literal
from pydantic import BaseModel, Field

from arahkita_backend.schemas.input import InputKeminatan


class MinicaseNode(BaseModel):
    id: str = Field(
        ...,
        pattern=r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        description="UUID v4 node minicase",
    )
    parent_id: str = Field(
        ...,
        pattern=r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        description="Foreign Key UUID merujuk ke major_node induk",
    )
    minicase_number: int = Field(
        ...,
        ge=2,
        le=11,
        description="Nomor urut node trial (2 s.d. 11, nomor 1 untuk rules pengerjaan di frontend)",
    )
    minicase_title: str = Field(
        ..., min_length=1, max_length=50, description="Judul interaktif kontekstual (maks. 2 kata)"
    )
    subject_name: str = Field(
        ..., min_length=1, description="Nama mata kuliah dasar pengelompok"
    )
    node_type: Literal["multiple_choice", "essay"] = Field(
        ..., description="Tipe studi kasus: pilihan ganda atau esai reflektif"
    )
    question: str = Field(
        ..., min_length=5, description="Studi kasus atau pertanyaan trial"
    )
    options: list[str] | None = Field(
        default=None, description="Pilihan jawaban [A, B, C, D] (khusus multiple_choice)"
    )
    correct_answer: str | None = Field(
        default=None, description="Kunci jawaban benar (khusus multiple_choice)"
    )
    evaluation_hint: str | None = Field(
        default=None, description="Pedoman kriteria penilaian LLM (khusus essay)"
    )
    is_parent: bool = Field(
        ..., description="True jika masih memiliki node lanjutan, False jika node terakhir"
    )
    circle_color: str = Field(
        ...,
        pattern=r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
        description="Kode warna hex lingkaran (mengikuti major_node)",
    )
    is_done: bool = Field(
        default=False, description="Status penyelesaian node oleh siswa"
    )
    child_id: str | None = Field(
        default=None, description="UUID node anak berikutnya (None jika node terakhir)"
    )


class GenerateMinicasesRequest(BaseModel):
    major_id: str = Field(
        ...,
        pattern=r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        description="UUID major_node yang dipilih siswa",
    )
    major_name: str = Field(..., min_length=1, description="Nama jurusan kuliah")
    circle_color: str = Field(
        ...,
        pattern=r"^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
        description="Kode warna hex lingkaran major_node induk",
    )
    profile: InputKeminatan | None = Field(
        default=None, description="Profil minat dan nilai siswa (opsional untuk personalisasi)"
    )


class MultipleChoiceLLMItem(BaseModel):
    minicase_title: str = Field(..., min_length=1, max_length=50)
    question: str = Field(..., min_length=5)
    options: list[str] = Field(..., min_length=2, max_length=6)
    correct_answer: str = Field(..., min_length=1)


class EssayLLMItem(BaseModel):
    minicase_title: str = Field(..., min_length=1, max_length=50)
    question: str = Field(..., min_length=5)
    evaluation_hint: str = Field(..., min_length=3)


class SubjectTrialLLMItem(BaseModel):
    subject_name: str = Field(..., min_length=1)
    mcq: MultipleChoiceLLMItem
    essay: EssayLLMItem


class MinicasesGenerationLLMResponse(BaseModel):
    subjects: list[SubjectTrialLLMItem] = Field(
        default_factory=list,
        description="Daftar 3 hingga 5 mata kuliah dasar beserta 2 studi kasus per matkul",
    )
