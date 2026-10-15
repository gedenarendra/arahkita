import unittest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient

from arahkita_backend.adapters.openrouter_adapter import OpenRouterAdapter
from arahkita_backend.api.v1.preview import get_major_node_preview
from arahkita_backend.deps import get_openrouter_adapter
from arahkita_backend.main import app
from arahkita_backend.schemas.preview import (
    CareerPathLLMItem,
    GeneratePreviewRequest,
    PreviewLLMResponse,
)


class TestPreviewAPI(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.mock_adapter = MagicMock(spec=OpenRouterAdapter)
        self.valid_major_node_id = "11111111-2222-4333-8444-555555555555"

    async def test_direct_get_major_node_preview(self) -> None:
        mock_llm_response = PreviewLLMResponse(
            preview="Hasil analisis menunjukkan minat kuat pada bidang matematika komputasi.",
            career_paths=[
                CareerPathLLMItem(
                    title="Data Scientist",
                    detail="Mengolah big data untuk prediksi analitis.",
                ),
                CareerPathLLMItem(
                    title="Kriptografer",
                    detail="Mengembangkan algoritma keamanan enkripsi data.",
                ),
            ],
        )
        self.mock_adapter.fetch_preview_generation = AsyncMock(
            return_value=mock_llm_response
        )

        payload = GeneratePreviewRequest(
            major_name="Matematika Terapan",
            mcq_accuracy=85.0,
            essay_analytical_score=4.5,
            essay_interest_score=4.0,
            total_trials_completed=6,
        )

        result = await get_major_node_preview(
            major_node_id=self.valid_major_node_id,
            payload=payload,
            adapter=self.mock_adapter,
        )

        self.assertEqual(result.major_node_id, self.valid_major_node_id)
        # 0.30*85 + 0.35*90 + 0.35*80 = 25.5 + 31.5 + 28.0 = 85
        self.assertEqual(result.matching_percentage, 85)
        self.assertEqual(len(result.career_paths), 2)
        self.assertEqual(result.career_paths[0].title, "Data Scientist")
        self.assertEqual(
            result.career_paths[0].detail, "Mengolah big data untuk prediksi analitis."
        )


class TestPreviewAPIIntegration(unittest.TestCase):
    def setUp(self) -> None:
        self.mock_adapter = MagicMock(spec=OpenRouterAdapter)
        self.client = TestClient(app)
        app.dependency_overrides[get_openrouter_adapter] = lambda: self.mock_adapter

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def test_http_post_preview_success(self) -> None:
        mock_llm_response = PreviewLLMResponse(
            preview="Siswa menunjukkan bakat analitis yang luar biasa.",
            career_paths=[
                CareerPathLLMItem(
                    title="Software Engineer",
                    detail="Membangun sistem dan arsitektur aplikasi perangkat lunak.",
                ),
                CareerPathLLMItem(
                    title="Systems Analyst",
                    detail="Menganalisis kebutuhan bisnis dan menerjemahkannya ke arsitektur IT.",
                ),
            ],
        )
        self.mock_adapter.fetch_preview_generation = AsyncMock(
            return_value=mock_llm_response
        )

        valid_major_id = "11111111-2222-4333-8444-555555555555"
        payload = {
            "major_name": "Teknik Informatika",
            "mcq_accuracy": 90.0,
            "essay_analytical_score": 4.5,
            "essay_interest_score": 4.5,
            "total_trials_completed": 8,
            "user_satisfaction_rating": 4.5,
        }

        response = self.client.post(f"/api/v1/preview/{valid_major_id}", json=payload)
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(data["major_node_id"], valid_major_id)
        self.assertIn("id", data)
        self.assertIn("preview", data)
        self.assertIn("matching_percentage", data)
        self.assertIn("career_paths", data)
        self.assertEqual(len(data["career_paths"]), 2)
        self.assertEqual(data["career_paths"][0]["major_node_preview_id"], data["id"])
        self.assertEqual(data["career_paths"][0]["title"], "Software Engineer")
        self.assertIn("detail", data["career_paths"][0])
        self.assertEqual(
            data["career_paths"][0]["detail"],
            "Membangun sistem dan arsitektur aplikasi perangkat lunak.",
        )


    def test_http_post_preview_invalid_uuid(self) -> None:
        response = self.client.post(
            "/api/v1/preview/not-a-valid-uuid",
            json={
                "major_name": "Teknik Informatika",
                "mcq_accuracy": 90.0,
                "essay_analytical_score": 4.5,
                "essay_interest_score": 4.5,
                "total_trials_completed": 8,
            },
        )
        self.assertEqual(response.status_code, 422)

    def test_http_post_preview_invalid_body_bounds(self) -> None:
        valid_major_id = "11111111-2222-4333-8444-555555555555"
        # mcq_accuracy melebihi 100
        response = self.client.post(
            f"/api/v1/preview/{valid_major_id}",
            json={
                "major_name": "Teknik Informatika",
                "mcq_accuracy": 150.0,
                "essay_analytical_score": 4.5,
                "essay_interest_score": 4.5,
                "total_trials_completed": 8,
            },
        )
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
