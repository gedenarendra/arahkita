import unittest
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from pydantic import ValidationError

from arahkita_backend.adapters.openrouter import OpenRouterAdapter
from arahkita_backend.deps import get_openrouter_adapter
from arahkita_backend.main import app
from arahkita_backend.schemas.input import (
    SUBJECT_NAME_NORMALIZATION_MAP,
    InputKeminatan,
    SubjectsScore,
    normalize_subject_name,
)
from arahkita_backend.schemas.major_node import MajorNode
from arahkita_backend.schemas.preview import (
    MajorNodeCareerPath,
    MajorNodePreview,
)
from arahkita_backend.schemas.recommendation_result import (
    MajorNodeSubjectRelevance,
    MajorRecommendationResult,
    RecommendationResultsRequest,
)
from arahkita_backend.services.recommendation_result_service import (
    calculate_recommendation_leaderboard,
)


class TestRecommendationResultSchemas(unittest.TestCase):
    def test_major_node_subject_relevance_valid(self) -> None:
        relevance = MajorNodeSubjectRelevance(
            id="11111111-1111-4111-8111-111111111111",
            major_node_id="22222222-2222-4222-8222-222222222222",
            subject_name="Matematika",
        )
        self.assertEqual(relevance.subject_name, "Matematika")
        self.assertEqual(relevance.major_node_id, "22222222-2222-4222-8222-222222222222")

    def test_major_node_subject_relevance_invalid_uuid(self) -> None:
        with self.assertRaises(ValidationError):
            MajorNodeSubjectRelevance(
                id="invalid-uuid",
                major_node_id="22222222-2222-4222-8222-222222222222",
                subject_name="Matematika",
            )

    def test_subject_name_normalization(self) -> None:
        self.assertEqual(normalize_subject_name("  Bahasa Inggris  "), "bahasa inggris")
        self.assertEqual(normalize_subject_name("Matematika"), "matematika")
        self.assertEqual(normalize_subject_name("IPA"), "ipa")
        self.assertEqual(normalize_subject_name("Fisika"), "fisika")
        self.assertEqual(normalize_subject_name("KIMIA"), "kimia")


class TestRecommendationResultsService(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.node_ti = MajorNode(
            id="11111111-1111-4111-8111-111111111111",
            major_name="Teknik Informatika",
            circle_color="#4F46E5",
        )
        self.node_si = MajorNode(
            id="22222222-2222-4222-8222-222222222222",
            major_name="Sistem Informasi",
            circle_color="#06B6D4",
        )
        self.node_dkv = MajorNode(
            id="33333333-3333-4333-8333-333333333333",
            major_name="Desain Komunikasi Visual",
            circle_color="#EC4899",
        )

        self.preview_ti = MajorNodePreview(
            id="aaaa1111-1111-4111-8111-111111111111",
            major_node_id=self.node_ti.id,
            preview="Evaluasi Teknik Informatika sangat memuaskan.",
            matching_percentage=95,
            career_paths=[
                MajorNodeCareerPath(
                    id="cccc1111-1111-4111-8111-111111111111",
                    major_node_preview_id="aaaa1111-1111-4111-8111-111111111111",
                    title="Software Engineer",
                    detail="Mengembangkan arsitektur perangkat lunak scalable.",
                )
            ],
        )
        self.preview_si = MajorNodePreview(
            id="aaaa2222-2222-4222-8222-222222222222",
            major_node_id=self.node_si.id,
            preview="Evaluasi Sistem Informasi cukup baik.",
            matching_percentage=78,
            career_paths=[
                MajorNodeCareerPath(
                    id="cccc2222-2222-4222-8222-222222222222",
                    major_node_preview_id="aaaa2222-2222-4222-8222-222222222222",
                    title="Product Manager",
                    detail="Menjembatani bisnis dan teknologi dalam produk digital.",
                )
            ],
        )

        self.profile = InputKeminatan(
            minat="Suka pemrograman dan logika",
            nilai={"matematika": 95, "ipa": 85, "bahasa inggris": 90},
        )

    async def test_empty_major_nodes(self) -> None:
        request = RecommendationResultsRequest(
            major_nodes=[],
            previews=[self.preview_ti],
        )
        results = await calculate_recommendation_leaderboard(request)
        self.assertEqual(results, [])

    async def test_all_uncompleted_nodes(self) -> None:
        request = RecommendationResultsRequest(
            major_nodes=[self.node_ti, self.node_si, self.node_dkv],
            previews=[],
        )
        results = await calculate_recommendation_leaderboard(request)
        self.assertEqual(len(results), 3)

        for item in results:
            self.assertEqual(item.matching_percentage, 0)
            self.assertFalse(item.is_completed)
            self.assertIsNone(item.preview)
            self.assertEqual(item.subject_relevances, [])

        # Mempertahankan urutan input semula
        self.assertEqual(results[0].major_name, "Teknik Informatika")
        self.assertEqual(results[1].major_name, "Sistem Informasi")
        self.assertEqual(results[2].major_name, "Desain Komunikasi Visual")

    async def test_partially_completed_nodes_sorted_descending(self) -> None:
        request = RecommendationResultsRequest(
            major_nodes=[self.node_dkv, self.node_si, self.node_ti],
            previews=[self.preview_si, self.preview_ti],
        )
        results = await calculate_recommendation_leaderboard(request)
        self.assertEqual(len(results), 3)

        # Rank 1: TI (95%)
        self.assertEqual(results[0].id, self.node_ti.id)
        self.assertEqual(results[0].matching_percentage, 95)
        self.assertTrue(results[0].is_completed)
        self.assertIsNotNone(results[0].preview)

        # Rank 2: SI (78%)
        self.assertEqual(results[1].id, self.node_si.id)
        self.assertEqual(results[1].matching_percentage, 78)
        self.assertTrue(results[1].is_completed)
        self.assertIsNotNone(results[1].preview)

        # Rank 3: DKV (0% - belum dikerjakan)
        self.assertEqual(results[2].id, self.node_dkv.id)
        self.assertEqual(results[2].matching_percentage, 0)
        self.assertFalse(results[2].is_completed)
        self.assertIsNone(results[2].preview)

    async def test_duplicate_previews_picks_highest_score(self) -> None:
        preview_ti_lower = MajorNodePreview(
            id="aaaa3333-3333-4333-8333-333333333333",
            major_node_id=self.node_ti.id,
            preview="Skor percobaan awal.",
            matching_percentage=60,
            career_paths=[
                MajorNodeCareerPath(
                    id="cccc3333-3333-4333-8333-333333333333",
                    major_node_preview_id="aaaa3333-3333-4333-8333-333333333333",
                    title="Junior Dev",
                    detail="Pemrograman dasar.",
                )
            ],
        )
        request = RecommendationResultsRequest(
            major_nodes=[self.node_ti],
            previews=[preview_ti_lower, self.preview_ti],
        )
        results = await calculate_recommendation_leaderboard(request)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].matching_percentage, 95)

    async def test_orphan_preview_ignored(self) -> None:
        orphan_preview = MajorNodePreview(
            id="aaaa9999-9999-4999-8999-999999999999",
            major_node_id="99999999-9999-4999-8999-999999999999",
            preview="Preview jurusan tidak dikenal.",
            matching_percentage=99,
            career_paths=[
                MajorNodeCareerPath(
                    id="cccc9999-9999-4999-8999-999999999999",
                    major_node_preview_id="aaaa9999-9999-4999-8999-999999999999",
                    title="Unknown Career",
                    detail="Unknown detail.",
                )
            ],
        )
        request = RecommendationResultsRequest(
            major_nodes=[self.node_ti],
            previews=[orphan_preview],
        )
        results = await calculate_recommendation_leaderboard(request)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].matching_percentage, 0)
        self.assertFalse(results[0].is_completed)

    async def test_stable_sort_on_equal_percentage(self) -> None:
        preview_si_equal = MajorNodePreview(
            id="aaaa4444-4444-4444-8444-444444444444",
            major_node_id=self.node_si.id,
            preview="Skor TI dan SI seimbang.",
            matching_percentage=95,
            career_paths=[
                MajorNodeCareerPath(
                    id="cccc4444-4444-4444-8444-444444444444",
                    major_node_preview_id="aaaa4444-4444-4444-8444-444444444444",
                    title="Solution Architect",
                    detail="Merancang arsitektur terintegrasi.",
                )
            ],
        )
        request = RecommendationResultsRequest(
            major_nodes=[self.node_si, self.node_ti],
            previews=[preview_si_equal, self.preview_ti],
        )
        results = await calculate_recommendation_leaderboard(request)
        self.assertEqual(len(results), 2)
        self.assertEqual(results[0].id, self.node_si.id)
        self.assertEqual(results[1].id, self.node_ti.id)

    async def test_completed_nodes_with_profile_and_mock_adapter(self) -> None:
        mock_adapter = MagicMock(spec=OpenRouterAdapter)
        mock_adapter.fetch_subject_relevances = AsyncMock(
            return_value={
                self.node_ti.id: ["Matematika", "Bahasa Inggris"],
                self.node_si.id: ["Matematika", "IPA"],
            }
        )

        request = RecommendationResultsRequest(
            major_nodes=[self.node_ti, self.node_si, self.node_dkv],
            previews=[self.preview_ti, self.preview_si],
            profile=self.profile,
        )

        results = await calculate_recommendation_leaderboard(request, mock_adapter)
        self.assertEqual(len(results), 3)

        # TI (completed)
        self.assertEqual(results[0].id, self.node_ti.id)
        self.assertEqual(len(results[0].subject_relevances), 2)
        ti_subjects = [sr.subject_name for sr in results[0].subject_relevances]
        self.assertEqual(ti_subjects, ["matematika", "bahasa inggris"])
        for sr in results[0].subject_relevances:
            self.assertEqual(sr.major_node_id, self.node_ti.id)
            self.assertRegex(
                sr.id,
                r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
            )

        # SI (completed)
        self.assertEqual(results[1].id, self.node_si.id)
        self.assertEqual(len(results[1].subject_relevances), 2)
        si_subjects = [sr.subject_name for sr in results[1].subject_relevances]
        self.assertEqual(si_subjects, ["matematika", "ipa"])

        # DKV (uncompleted)
        self.assertEqual(results[2].id, self.node_dkv.id)
        self.assertEqual(results[2].subject_relevances, [])

    async def test_subject_normalization_and_filtering(self) -> None:
        mock_adapter = MagicMock(spec=OpenRouterAdapter)
        # LLM mengembalikan mapel dengan huruf kapital dan mapel di luar kandidat
        mock_adapter.fetch_subject_relevances = AsyncMock(
            return_value={
                self.node_ti.id: ["Bahasa Inggris", "Fisika Modern", "Matematika"],
            }
        )

        request = RecommendationResultsRequest(
            major_nodes=[self.node_ti],
            previews=[self.preview_ti],
            profile=self.profile,
        )

        results = await calculate_recommendation_leaderboard(request, mock_adapter)
        self.assertEqual(len(results), 1)

        subjects = [sr.subject_name for sr in results[0].subject_relevances]
        # Fisika Modern diabaikan, Bahasa Inggris & Matematika dinormalisasi menjadi lowercase
        self.assertEqual(subjects, ["bahasa inggris", "matematika"])

    async def test_llm_empty_fallback_to_highest_score(self) -> None:
        # Siswa memiliki nilai IPA tertinggi (98)
        profile_ipa = InputKeminatan(
            minat="Sains Alam",
            nilai={"matematika": 70, "ipa": 98, "bahasa inggris": 80},
        )
        mock_adapter = MagicMock(spec=OpenRouterAdapter)
        # LLM mengembalikan list kosong atau mapel tidak dikenal
        mock_adapter.fetch_subject_relevances = AsyncMock(
            return_value={self.node_ti.id: ["Sosiologi"]}
        )

        request = RecommendationResultsRequest(
            major_nodes=[self.node_ti],
            previews=[self.preview_ti],
            profile=profile_ipa,
        )

        results = await calculate_recommendation_leaderboard(request, mock_adapter)
        self.assertEqual(len(results), 1)
        self.assertEqual(len(results[0].subject_relevances), 1)
        # Fallback ke mapel nilai tertinggi yaitu ipa
        self.assertEqual(results[0].subject_relevances[0].subject_name, "ipa")

    async def test_llm_adapter_exception_graceful_degradation(self) -> None:
        mock_adapter = MagicMock(spec=OpenRouterAdapter)
        mock_adapter.fetch_subject_relevances = AsyncMock(
            side_effect=RuntimeError("OpenRouter gateway error")
        )

        request = RecommendationResultsRequest(
            major_nodes=[self.node_ti],
            previews=[self.preview_ti],
            profile=self.profile,
        )

        # Tidak boleh melempar exception
        results = await calculate_recommendation_leaderboard(request, mock_adapter)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].subject_relevances, [])


class TestRecommendationResultsAPI(unittest.TestCase):
    def setUp(self) -> None:
        self.mock_adapter = MagicMock(spec=OpenRouterAdapter)
        self.client = TestClient(app)
        app.dependency_overrides[get_openrouter_adapter] = lambda: self.mock_adapter

    def tearDown(self) -> None:
        app.dependency_overrides.clear()

    def test_post_recommendation_results_without_profile(self) -> None:
        payload = {
            "major_nodes": [
                {
                    "id": "11111111-1111-4111-8111-111111111111",
                    "major_name": "Teknik Informatika",
                    "circle_color": "#4F46E5",
                    "child_id": None,
                },
                {
                    "id": "22222222-2222-4222-8222-222222222222",
                    "major_name": "Sistem Informasi",
                    "circle_color": "#06B6D4",
                    "child_id": None,
                },
            ],
            "previews": [
                {
                    "id": "aaaa1111-1111-4111-8111-111111111111",
                    "major_node_id": "11111111-1111-4111-8111-111111111111",
                    "preview": "Sangat cocok dengan bakat komputasi.",
                    "matching_percentage": 90,
                    "career_paths": [
                        {
                            "id": "cccc1111-1111-4111-8111-111111111111",
                            "major_node_preview_id": "aaaa1111-1111-4111-8111-111111111111",
                            "title": "Data Scientist",
                            "detail": "Analisis data dan model prediktif.",
                        }
                    ],
                }
            ],
        }

        response = self.client.post("/api/v1/recommendation-results", json=payload)
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertIsInstance(data, list)
        self.assertEqual(len(data), 2)

        # Leaderboard rank 1: TI (90%)
        self.assertEqual(data[0]["major_name"], "Teknik Informatika")
        self.assertEqual(data[0]["matching_percentage"], 90)
        self.assertTrue(data[0]["is_completed"])
        self.assertIsNotNone(data[0]["preview"])
        self.assertEqual(data[0]["subject_relevances"], [])

        # Leaderboard rank 2: SI (0%)
        self.assertEqual(data[1]["major_name"], "Sistem Informasi")
        self.assertEqual(data[1]["matching_percentage"], 0)
        self.assertFalse(data[1]["is_completed"])
        self.assertIsNone(data[1]["preview"])
        self.assertEqual(data[1]["subject_relevances"], [])

    def test_post_recommendation_results_with_profile_and_subjects(self) -> None:
        self.mock_adapter.fetch_subject_relevances = AsyncMock(
            return_value={
                "11111111-1111-4111-8111-111111111111": ["Matematika", "Bahasa Inggris"]
            }
        )

        payload = {
            "major_nodes": [
                {
                    "id": "11111111-1111-4111-8111-111111111111",
                    "major_name": "Teknik Informatika",
                    "circle_color": "#4F46E5",
                }
            ],
            "previews": [
                {
                    "id": "aaaa1111-1111-4111-8111-111111111111",
                    "major_node_id": "11111111-1111-4111-8111-111111111111",
                    "preview": "Sangat cocok.",
                    "matching_percentage": 92,
                    "career_paths": [
                        {
                            "id": "cccc1111-1111-4111-8111-111111111111",
                            "major_node_preview_id": "aaaa1111-1111-4111-8111-111111111111",
                            "title": "Software Engineer",
                            "detail": "Pengembangan software.",
                        }
                    ],
                }
            ],
            "profile": {
                "minat": "Coding dan algoritma",
                "nilai": {
                    "Matematika": 95,
                    "IPA": 80,
                    "Bahasa Inggris": 88,
                },
            },
        }

        response = self.client.post("/api/v1/recommendation-results", json=payload)
        self.assertEqual(response.status_code, 200)

        data = response.json()
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]["matching_percentage"], 92)
        self.assertEqual(len(data[0]["subject_relevances"]), 2)
        self.assertEqual(data[0]["subject_relevances"][0]["subject_name"], "matematika")
        self.assertEqual(data[0]["subject_relevances"][1]["subject_name"], "bahasa inggris")

    def test_post_recommendation_results_empty(self) -> None:
        payload = {"major_nodes": [], "previews": []}
        response = self.client.post("/api/v1/recommendation-results", json=payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [])

    def test_post_recommendation_results_invalid_uuid(self) -> None:
        payload = {
            "major_nodes": [
                {
                    "id": "bukan-uuid",
                    "major_name": "Teknik Informatika",
                    "circle_color": "#4F46E5",
                }
            ],
            "previews": [],
        }
        response = self.client.post("/api/v1/recommendation-results", json=payload)
        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()
