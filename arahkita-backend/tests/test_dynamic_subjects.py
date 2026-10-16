import unittest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from pydantic import ValidationError

from arahkita_backend.adapters.openrouter import (
    OpenRouterAdapter,
    format_minicases_user_prompt,
    format_preview_user_prompt,
    format_user_prompt,
)
from arahkita_backend.deps import get_openrouter_adapter
from arahkita_backend.main import app
from arahkita_backend.schemas.input import InputKeminatan, normalize_subject_name
from arahkita_backend.schemas.preview import GeneratePreviewRequest


class TestDynamicSubjectsValidation(unittest.TestCase):
    def test_normalize_subject_name(self) -> None:
        self.assertEqual(normalize_subject_name("Fisika"), "fisika")
        self.assertEqual(normalize_subject_name("  KIMIA  "), "kimia")
        self.assertEqual(normalize_subject_name("Sosiologi"), "sosiologi")
        self.assertEqual(normalize_subject_name("Bahasa Indonesia"), "bahasa indonesia")

    def test_valid_dynamic_subjects_lowercase_conversion(self) -> None:
        payload = {
            "minat": "Suka teknologi dan riset obat",
            "nilai": {
                "Fisika": 85,
                "  KIMIA  ": 90,
                "Biologi": 88,
            },
        }
        profile = InputKeminatan.model_validate(payload)
        self.assertEqual(
            profile.nilai,
            {"fisika": 85, "kimia": 90, "biologi": 88},
        )

    def test_valid_boundary_3_and_10_subjects(self) -> None:
        # Tepat 3 mapel
        p3 = InputKeminatan(
            minat="Sains",
            nilai={"fisika": 80, "kimia": 85, "biologi": 90},
        )
        self.assertEqual(len(p3.nilai), 3)

        # Tepat 10 mapel
        ten_subjects = {f"mapel_{i}": 80 for i in range(1, 11)}
        p10 = InputKeminatan(minat="Serba Bisa", nilai=ten_subjects)
        self.assertEqual(len(p10.nilai), 10)

    def test_invalid_fewer_than_3_subjects(self) -> None:
        # Hanya 2 mapel
        with self.assertRaises(ValidationError) as ctx:
            InputKeminatan(
                minat="Sains",
                nilai={"fisika": 80, "kimia": 85},
            )
        self.assertIn("Minimal harus menyertakan 3 mata pelajaran", str(ctx.exception))

        # Hanya 1 mapel
        with self.assertRaises(ValidationError):
            InputKeminatan(
                minat="Sains",
                nilai={"matematika": 90},
            )

    def test_invalid_more_than_10_subjects(self) -> None:
        # 11 mapel
        eleven_subjects = {f"mapel_{i}": 80 for i in range(1, 12)}
        with self.assertRaises(ValidationError) as ctx:
            InputKeminatan(minat="Kelebihan", nilai=eleven_subjects)
        self.assertIn("Maksimal hanya boleh menyertakan 10 mata pelajaran", str(ctx.exception))

    def test_invalid_score_bounds(self) -> None:
        # Skor di atas 100
        with self.assertRaises(ValidationError) as ctx:
            InputKeminatan(
                minat="Sains",
                nilai={"fisika": 105, "kimia": 85, "biologi": 90},
            )
        self.assertIn("rentang 0 hingga 100", str(ctx.exception))

        # Skor di bawah 0
        with self.assertRaises(ValidationError):
            InputKeminatan(
                minat="Sains",
                nilai={"fisika": -5, "kimia": 85, "biologi": 90},
            )

    def test_invalid_duplicate_subject_case_insensitive(self) -> None:
        # "Fisika" dan "fisika" terduplikasi setelah normalisasi
        with self.assertRaises(ValidationError) as ctx:
            InputKeminatan(
                minat="Sains",
                nilai={"Fisika": 90, "fisika": 85, "kimia": 80},
            )
        self.assertIn("Duplikasi mata pelajaran terdeteksi", str(ctx.exception))

    def test_invalid_empty_or_whitespace_subject_name(self) -> None:
        with self.assertRaises(ValidationError) as ctx:
            InputKeminatan(
                minat="Sains",
                nilai={"   ": 80, "kimia": 85, "biologi": 90},
            )
        self.assertIn("Nama mata pelajaran harus berupa string tidak kosong", str(ctx.exception))

    def test_invalid_nilai_not_dict(self) -> None:
        with self.assertRaises(ValidationError) as ctx:
            InputKeminatan.model_validate(
                {"minat": "Sains", "nilai": ["fisika", "kimia", "biologi"]}
            )
        self.assertIn("harus berupa object / dictionary", str(ctx.exception))


class TestDynamicSubjectsPromptFormatting(unittest.TestCase):
    def setUp(self) -> None:
        self.profile = InputKeminatan(
            minat="Tertarik dengan sosiologi dan ekonomi pembangunan",
            nilai={
                "Sosiologi": 92,
                "Ekonomi": 88,
                "Geografi": 85,
                "Bahasa Indonesia": 90,
            },
        )

    def test_format_user_prompt(self) -> None:
        prompt = format_user_prompt(self.profile)
        self.assertIn("Data Siswa:", prompt)
        self.assertIn("- Nilai sosiologi: 92", prompt)
        self.assertIn("- Nilai ekonomi: 88", prompt)
        self.assertIn("- Nilai geografi: 85", prompt)
        self.assertIn("- Nilai bahasa indonesia: 90", prompt)

    def test_format_minicases_user_prompt(self) -> None:
        prompt = format_minicases_user_prompt("Ilmu Komunikasi", self.profile)
        self.assertIn("Jurusan yang dieksplorasi: Ilmu Komunikasi", prompt)
        self.assertIn("- Nilai sosiologi: 92", prompt)
        self.assertIn("- Nilai ekonomi: 88", prompt)

    def test_format_preview_user_prompt(self) -> None:
        request = GeneratePreviewRequest(
            major_name="Ilmu Komunikasi",
            mcq_accuracy=80.0,
            essay_analytical_score=4.0,
            essay_interest_score=4.5,
            total_trials_completed=6,
            profile=self.profile,
        )
        prompt = format_preview_user_prompt(request, 85)
        self.assertIn("Profil Keminatan Awal Siswa:", prompt)
        self.assertIn("- Nilai sosiologi: 92", prompt)
        self.assertIn("- Nilai bahasa indonesia: 90", prompt)


class TestDynamicSubjectsAPI(unittest.TestCase):
    def setUp(self) -> None:
        self.mock_adapter = MagicMock(spec=OpenRouterAdapter)
        self.client = TestClient(app)
        app.dependency_overrides[get_openrouter_adapter] = lambda: self.mock_adapter

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def test_recommend_majors_with_dynamic_subjects(self) -> None:
        self.mock_adapter.fetch_major_recommendations = AsyncMock(
            return_value=["Sosiologi", "Ilmu Politik", "Antropologi"]
        )

        payload = {
            "minat": "Suka kajian sosial, politik, dan pemberdayaan masyarakat",
            "nilai": {
                "Sosiologi": 95,
                "Sejarah": 88,
                "Geografi": 84,
            },
        }

        response = self.client.post("/api/v1/majors/recommend", json=payload)
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(len(data), 3)
        self.assertEqual(data[0]["major_name"], "Sosiologi")

    def test_recommend_majors_validation_error_too_few_subjects(self) -> None:
        payload = {
            "minat": "Suka komputer",
            "nilai": {
                "Informatika": 90,
                "Matematika": 85,
            },
        }
        response = self.client.post("/api/v1/majors/recommend", json=payload)
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
