import unittest
from unittest.mock import AsyncMock, MagicMock

from arahkita_backend.adapters.openrouter_adapter import (
    OpenRouterAdapter,
    evaluate_essay_answer,
)
from arahkita_backend.config.settings import Settings
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
from arahkita_backend.services.minicase_service import (
    evaluate_student_essay,
    generate_minicases_tree,
    sanitize_title,
)


class TestMinicaseService(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.mock_settings = Settings(
            app_host="127.0.0.1",
            app_port=8000,
            openrouter_api_key="test-key",
            openrouter_base_url="https://openrouter.ai/api/v1",
            openrouter_model="test-model",
        )
        self.mock_adapter = MagicMock(spec=OpenRouterAdapter)

    def test_sanitize_title(self) -> None:
        self.assertEqual(sanitize_title("Coding Logika"), "Coding Logika")
        self.assertEqual(sanitize_title("Satu Dua Tiga Empat"), "Satu Dua")
        self.assertEqual(sanitize_title("   "), "Studi Kasus")

    async def test_generate_minicases_tree_assembly(self) -> None:
        # Mock LLM menghasilkan 3 subjek mata kuliah dasar (total 6 node)
        mock_subjects = [
            SubjectTrialLLMItem(
                subject_name="Dasar Pemrograman",
                mcq=MultipleChoiceLLMItem(
                    minicase_title="Logika Algoritma",
                    question="Apa itu rekursi?",
                    options=["Fungsi memanggil dirinya", "Loop tak hingga", "Array", "Variabel"],
                    correct_answer="Fungsi memanggil dirinya",
                ),
                essay=EssayLLMItem(
                    minicase_title="Debugging Kritis",
                    question="Bagaimana mengatasi bug di malam sebelum rilis?",
                    evaluation_hint="Cek ketenangan dan langkah isolasi bug.",
                ),
            ),
            SubjectTrialLLMItem(
                subject_name="Basis Data",
                mcq=MultipleChoiceLLMItem(
                    minicase_title="Query SQL",
                    question="Perintah untuk memilih data?",
                    options=["SELECT", "UPDATE", "DELETE", "INSERT"],
                    correct_answer="SELECT",
                ),
                essay=EssayLLMItem(
                    minicase_title="Normalisasi Data",
                    question="Mengapa redundansi data berbahaya?",
                    evaluation_hint="Cek pemahaman anomali data.",
                ),
            ),
            SubjectTrialLLMItem(
                subject_name="Jaringan Komputer",
                mcq=MultipleChoiceLLMItem(
                    minicase_title="Protokol IP",
                    question="Apa fungsi DNS?",
                    options=["Menerjemahkan domain ke IP", "Mengenkripsi web", "Routing paket", "Firewall"],
                    correct_answer="Menerjemahkan domain ke IP",
                ),
                essay=EssayLLMItem(
                    minicase_title="Keamanan Jaringan",
                    question="Bagaimana menyikapi serangan phishing?",
                    evaluation_hint="Cek kepedulian mitigasi dan edukasi pengguna.",
                ),
            ),
        ]

        self.mock_adapter.fetch_minicases_generation = AsyncMock(return_value=mock_subjects)

        major_id = "11111111-2222-3333-4444-555555555555"
        circle_color = "#059669"

        req = GenerateMinicasesRequest(
            major_id=major_id,
            major_name="Teknik Informatika",
            circle_color=circle_color,
        )

        nodes = await generate_minicases_tree(req, self.mock_adapter)

        # Harus menghasilkan 6 node (3 matkul * 2)
        self.assertEqual(len(nodes), 6)

        # Verifikasi rantai pointer dan atribut
        for idx, node in enumerate(nodes):
            self.assertEqual(node.minicase_number, idx + 2)
            self.assertEqual(node.parent_id, major_id)
            self.assertEqual(node.circle_color, circle_color)
            self.assertFalse(node.is_done)

            # Node genap (0, 2, 4) adalah multiple_choice, node ganjil (1, 3, 5) adalah essay
            if idx % 2 == 0:
                self.assertEqual(node.node_type, "multiple_choice")
                self.assertIsNotNone(node.options)
                self.assertIsNotNone(node.correct_answer)
                self.assertIsNone(node.evaluation_hint)
            else:
                self.assertEqual(node.node_type, "essay")
                self.assertIsNone(node.options)
                self.assertIsNone(node.correct_answer)
                self.assertIsNotNone(node.evaluation_hint)

            if idx < len(nodes) - 1:
                # Bukan node terakhir: is_parent True dan child_id menunjuk node berikutnya
                self.assertTrue(node.is_parent)
                self.assertEqual(node.child_id, nodes[idx + 1].id)
            else:
                # Node terakhir: is_parent False dan child_id None
                self.assertFalse(node.is_parent)
                self.assertIsNone(node.child_id)

    async def test_evaluate_student_essay_serious(self) -> None:
        expected = EssayEvaluationResult(
            analytical_fit=4,
            interest_signal=5,
            is_serious_attempt=True,
        )
        self.mock_adapter.evaluate_essay_answer = AsyncMock(return_value=expected)

        req = EssayEvaluationRequest(
            question="Bagaimana mengatasi bug di malam sebelum rilis?",
            evaluation_hint="Cek ketenangan dan langkah isolasi bug.",
            user_answer="Saya akan mengecek git log perubahan terakhir dan merevert commit yang bermasalah.",
            minicase_id="12345678-1234-1234-1234-123456789abc",
        )

        result = await evaluate_student_essay(req, self.mock_adapter)
        self.assertTrue(result.is_serious_attempt)
        self.assertEqual(result.analytical_fit, 4)
        self.assertEqual(result.interest_signal, 5)

    async def test_evaluate_essay_not_serious_guardrail(self) -> None:
        # Uji fungsi evaluate_essay_answer di adapter jika LLM mengembalikan is_serious_attempt = False
        mock_client = MagicMock()
        mock_response = MagicMock()
        mock_choice = MagicMock()
        mock_choice.message.content = '{"analytical_fit": 3, "interest_signal": 3, "is_serious_attempt": false}'
        mock_response.choices = [mock_choice]

        mock_client.chat.completions.create = AsyncMock(return_value=mock_response)

        req = EssayEvaluationRequest(
            question="Pertanyaan esai",
            evaluation_hint="Kriteria",
            user_answer="asdfgh gak tau lanjut aja",
        )

        result = await evaluate_essay_answer(req, self.mock_settings, client=mock_client)

        # Guardrail wajib memaksa nilai 1 untuk kedua skor
        self.assertFalse(result.is_serious_attempt)
        self.assertEqual(result.analytical_fit, 1)
        self.assertEqual(result.interest_signal, 1)


if __name__ == "__main__":
    unittest.main()
