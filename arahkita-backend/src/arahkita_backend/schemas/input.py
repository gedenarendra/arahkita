from pydantic import BaseModel, Field, field_validator


def normalize_subject_name(raw_name: str) -> str:
    """Menormalisasi nama mata pelajaran menjadi lowercase murni dan di-strip."""
    return raw_name.strip().lower()


class SubjectsScore(dict[str, int]):
    """Dictionary nilai mata pelajaran (skor 0-100) dengan key yang otomatis dinormalisasi ke lowercase."""

    def __init__(self, *args: object, **kwargs: int) -> None:
        super().__init__()
        if args:
            if len(args) == 1 and isinstance(args[0], dict):
                for k, v in args[0].items():  # type: ignore[reportUnknownMemberType]
                    self[str(k)] = int(v)  # type: ignore[reportUnknownArgumentType]
            else:
                super().__init__(*args)  # type: ignore[reportUnknownMemberType]
        for k, v in kwargs.items():
            self[k] = int(v)

    def __setitem__(self, key: str, value: int) -> None:
        clean_key = normalize_subject_name(key)
        super().__setitem__(clean_key, int(value))


class InputKeminatan(BaseModel):
    minat: str = Field(
        ..., min_length=1, description="Deskripsi minat atau bakat siswa"
    )
    nilai: dict[str, int] = Field(
        ...,
        description="Skor nilai mata pelajaran siswa (minimal 3, maksimal 10 mata pelajaran, skor 0–100, key lowercase)",
    )

    @field_validator("nilai", mode="before")
    @classmethod
    def validate_and_normalize_nilai(cls, v: object) -> dict[str, int]:
        if not isinstance(v, dict):
            raise ValueError(
                "Field 'nilai' harus berupa object / dictionary mata pelajaran."
            )

        normalized: dict[str, int] = {}
        for raw_key, raw_score in v.items():
            if not isinstance(raw_key, str) or not raw_key.strip():
                raise ValueError(
                    "Nama mata pelajaran harus berupa string tidak kosong."
                )

            clean_key = normalize_subject_name(raw_key)
            if clean_key in normalized:
                raise ValueError(
                    f"Duplikasi mata pelajaran terdeteksi setelah normalisasi: '{clean_key}'."
                )

            try:
                score = int(raw_score)  # type: ignore[reportUnknownArgumentType]
            except (ValueError, TypeError):
                raise ValueError(
                    f"Nilai untuk mata pelajaran '{clean_key}' harus berupa integer valid."
                )

            if score < 0 or score > 100:
                raise ValueError(
                    f"Nilai untuk mata pelajaran '{clean_key}' harus berada di rentang 0 hingga 100 (diterima: {score})."
                )

            normalized[clean_key] = score

        if len(normalized) < 3:
            raise ValueError(
                f"Minimal harus menyertakan 3 mata pelajaran yang dipercaya diri (diberikan: {len(normalized)})."
            )
        if len(normalized) > 10:
            raise ValueError(
                f"Maksimal hanya boleh menyertakan 10 mata pelajaran (diberikan: {len(normalized)})."
            )

        return normalized


SUBJECT_NAME_NORMALIZATION_MAP: dict[str, str] = {}
