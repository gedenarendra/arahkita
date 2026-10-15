import unittest
from unittest.mock import AsyncMock, MagicMock

from arahkita_backend.adapters.openrouter_adapter import OpenRouterAdapter
from arahkita_backend.api.v1.minicases import evaluate_essay, generate_minicases
from arahkita_backend.schemas.essay_eval import (
    EssayEvaluationRequest,
    EssayEvaluationResult,
)
from arahkita_backend.schemas.minicase_node import (
    EssayLLMItem,
    GenerateMinicasesRequest,
    MultipleChoiceLLMItem,
    SubjectTrialLLMItem,
)


class TestMinicaseAPI(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.mock_adapter = MagicMock(spec=OpenRouterAdapter)

    async def test_api_generate_minicases(self) -> None:
        mock_subjects = [
            SubjectTrialLLMItem(
                subject_name="Pengantar Bisnis",
                mcq=MultipleChoiceLLMItem(
                    minicase_title="Model Bisnis",
                    question="Apa itu model B2B?",
                    options=["Business to Business", "Business to Buyer", "Brand to Brand", "Bank to Bank"],
                    correct_answer="Business to Business",
                ),
                essay=EssayLLMItem(
                    minicase_title="Peluang Pasar",
                    question="Bagaimana mengidentifikasi celah pasar di UMKM?",
                    evaluation_hint="Cek riset lapangan dan observasi kebutuhan.",
                ),
            ),
        ]
        self.mock_adapter.fetch_minicases_generation = AsyncMock(return_value=mock_subjects)

        payload = GenerateMinicasesRequest(
            major_id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            major_name="Manajemen Bisnis",
            circle_color="#D97706",
        )

        response = await generate_minicases(payload=payload, adapter=self.mock_adapter)

        self.assertEqual(len(response), 2)
        self.assertEqual(response[0].minicase_number, 2)
        self.assertEqual(response[1].minicase_number, 3)
        self.assertEqual(response[0].parent_id, "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")
        self.assertEqual(response[0].child_id, response[1].id)
        self.assertIsNone(response[1].child_id)
        self.assertFalse(response[1].is_parent)

    async def test_api_evaluate_essay(self) -> None:
        expected = EssayEvaluationResult(
            analytical_fit=5,
            interest_signal=4,
            is_serious_attempt=True,
        )
        self.mock_adapter.evaluate_essay_answer = AsyncMock(return_value=expected)

        payload = EssayEvaluationRequest(
            question="Pertanyaan studi kasus bisnis",
            evaluation_hint="Kriteria analitis",
            user_answer="Melakukan survei pelanggan langsung.",
        )

        response = await evaluate_essay(payload=payload, adapter=self.mock_adapter)

        self.assertEqual(response.analytical_fit, 5)
        self.assertEqual(response.interest_signal, 4)
        self.assertTrue(response.is_serious_attempt)


if __name__ == "__main__":
    unittest.main()
