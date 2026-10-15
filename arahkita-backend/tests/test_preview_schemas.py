import unittest
from pydantic import ValidationError

from arahkita_backend.schemas.input import InputKeminatan, SubjectsScore
from arahkita_backend.schemas.preview import (
    GeneratePreviewRequest,
    MajorNodeCareerPath,
    MajorNodePreview,
    PreviewLLMResponse,
)


class TestPreviewSchemas(unittest.TestCase):
    def test_valid_generate_preview_request_minimal(self) -> None:
        payload = GeneratePreviewRequest(
            major_name="Matematika",
            mcq_accuracy=85.0,
            essay_analytical_score=4.0,
            essay_interest_score=4.5,
            total_trials_completed=6,
        )
        self.assertEqual(payload.major_name, "Matematika")
        self.assertEqual(payload.mcq_accuracy, 85.0)
        self.assertIsNone(payload.user_satisfaction_rating)
        self.assertIsNone(payload.profile)

    def test_valid_generate_preview_request_full(self) -> None:
        payload = GeneratePreviewRequest(
            major_name="Teknik Informatika",
            mcq_accuracy=90.0,
            essay_analytical_score=4.5,
            essay_interest_score=5.0,
            total_trials_completed=8,
            user_satisfaction_rating=4.5,
            profile=InputKeminatan(
                minat="Suka coding dan algoritma",
                nilai=SubjectsScore(Matematika=90, IPA=85, Bahasa_Inggris=88),
            ),
        )
        self.assertEqual(payload.user_satisfaction_rating, 4.5)
        self.assertIsNotNone(payload.profile)

    def test_invalid_generate_preview_request_bounds(self) -> None:
        # mcq_accuracy > 100
        with self.assertRaises(ValidationError):
            GeneratePreviewRequest(
                major_name="Fisika",
                mcq_accuracy=105.0,
                essay_analytical_score=3.0,
                essay_interest_score=3.0,
                total_trials_completed=4,
            )

        # essay_analytical_score < 1.0
        with self.assertRaises(ValidationError):
            GeneratePreviewRequest(
                major_name="Fisika",
                mcq_accuracy=80.0,
                essay_analytical_score=0.5,
                essay_interest_score=3.0,
                total_trials_completed=4,
            )

        # essay_interest_score > 5.0
        with self.assertRaises(ValidationError):
            GeneratePreviewRequest(
                major_name="Fisika",
                mcq_accuracy=80.0,
                essay_analytical_score=3.0,
                essay_interest_score=5.5,
                total_trials_completed=4,
            )

    def test_valid_major_node_career_path(self) -> None:
        path = MajorNodeCareerPath(
            id="12345678-1234-4234-8234-123456789abc",
            major_node_preview_id="87654321-4321-4321-8321-cba987654321",
            title="Software Engineer",
            detail="Merancang dan membangun aplikasi software berkualitas.",
        )
        self.assertEqual(path.title, "Software Engineer")
        self.assertEqual(
            path.detail, "Merancang dan membangun aplikasi software berkualitas."
        )

    def test_invalid_major_node_career_path_uuid(self) -> None:
        with self.assertRaises(ValidationError):
            MajorNodeCareerPath(
                id="invalid-uuid",
                major_node_preview_id="87654321-4321-4321-8321-cba987654321",
                title="Software Engineer",
                detail="Detail karir",
            )

    def test_valid_major_node_preview(self) -> None:
        preview = MajorNodePreview(
            id="11111111-1111-4111-8111-111111111111",
            major_node_id="22222222-2222-4222-8222-222222222222",
            preview="Kamu memiliki potensi besar di bidang rekayasa perangkat lunak.",
            matching_percentage=87,
            career_paths=[
                MajorNodeCareerPath(
                    id="33333333-3333-4333-8333-333333333333",
                    major_node_preview_id="11111111-1111-4111-8111-111111111111",
                    title="Software Engineer",
                    detail="Membangun sistem dan aplikasi komputasi.",
                )
            ],
        )
        self.assertEqual(preview.matching_percentage, 87)
        self.assertEqual(len(preview.career_paths), 1)
        self.assertEqual(
            preview.career_paths[0].detail, "Membangun sistem dan aplikasi komputasi."
        )

    def test_invalid_major_node_preview_matching_percentage(self) -> None:
        with self.assertRaises(ValidationError):
            MajorNodePreview(
                id="11111111-1111-4111-8111-111111111111",
                major_node_id="22222222-2222-4222-8222-222222222222",
                preview="Evaluasi",
                matching_percentage=101,  # melebihi 100
                career_paths=[
                    MajorNodeCareerPath(
                        id="33333333-3333-4333-8333-333333333333",
                        major_node_preview_id="11111111-1111-4111-8111-111111111111",
                        title="Software Engineer",
                        detail="Detail karir",
                    )
                ],
            )

    def test_valid_preview_llm_response(self) -> None:
        from arahkita_backend.schemas.preview import CareerPathLLMItem

        raw = PreviewLLMResponse(
            preview="Rangkuman naratif",
            career_paths=[
                CareerPathLLMItem(
                    title="Data Analyst",
                    detail="Menganalisis data tren industri.",
                ),
                CareerPathLLMItem(
                    title="Data Engineer",
                    detail="Membangun pipeline data skala besar.",
                ),
            ],
        )
        self.assertEqual(len(raw.career_paths), 2)
        self.assertEqual(raw.career_paths[0].detail, "Menganalisis data tren industri.")


if __name__ == "__main__":
    unittest.main()

