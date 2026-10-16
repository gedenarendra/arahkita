import unittest
from pydantic import ValidationError

from arahkita_backend.schemas.essay_eval import (
    EssayEvaluationLLMResponse,
    EssayEvaluationRequest,
    EssayEvaluationResult,
)
from arahkita_backend.schemas.input import InputKeminatan, SubjectsScore
from arahkita_backend.schemas.minicase_node import (
    GenerateMinicasesRequest,
    MinicaseNode,
)


class TestMinicaseSchemas(unittest.TestCase):
    def test_valid_multiple_choice_node(self) -> None:
        node = MinicaseNode(
            id="12345678-1234-1234-1234-123456789abc",
            parent_id="87654321-4321-4321-4321-cba987654321",
            minicase_number=2,
            minicase_title="Logika Algoritma",
            subject_name="Dasar Pemrograman",
            node_type="multiple_choice",
            question="Apa kompleksitas waktu dari pencarian biner?",
            options=["O(1)", "O(n)", "O(log n)", "O(n^2)"],
            correct_answer="O(log n)",
            evaluation_hint=None,
            is_parent=True,
            circle_color="#4F46E5",
            is_done=False,
            child_id="abcdef01-2345-6789-abcd-ef0123456789",
        )
        self.assertEqual(node.minicase_number, 2)
        self.assertEqual(node.node_type, "multiple_choice")
        self.assertIsNotNone(node.options)
        self.assertEqual(len(node.options or []), 4)

    def test_valid_essay_node(self) -> None:
        node = MinicaseNode(
            id="abcdef01-2345-6789-abcd-ef0123456789",
            parent_id="87654321-4321-4321-4321-cba987654321",
            minicase_number=3,
            minicase_title="Debugging Kritis",
            subject_name="Dasar Pemrograman",
            node_type="essay",
            question="Bagaimana sikapmu jika sistem klien error 1 jam sebelum presentasi?",
            options=None,
            correct_answer=None,
            evaluation_hint="Cek apakah siswa mencari root cause secara terstruktur.",
            is_parent=False,
            circle_color="#4F46E5",
            is_done=False,
            child_id=None,
        )
        self.assertEqual(node.minicase_number, 3)
        self.assertEqual(node.node_type, "essay")
        self.assertFalse(node.is_parent)
        self.assertIsNone(node.child_id)

    def test_minicase_number_boundaries(self) -> None:
        # Nomor 1 ditolak (khusus rules pengerjaan di frontend)
        with self.assertRaises(ValidationError):
            MinicaseNode(
                id="12345678-1234-1234-1234-123456789abc",
                parent_id="87654321-4321-4321-4321-cba987654321",
                minicase_number=1,
                minicase_title="Rules",
                subject_name="Pengantar",
                node_type="multiple_choice",
                question="Pertanyaan valid",
                is_parent=False,
                circle_color="#4F46E5",
            )

        # Nomor 12 ditolak (> 11)
        with self.assertRaises(ValidationError):
            MinicaseNode(
                id="12345678-1234-1234-1234-123456789abc",
                parent_id="87654321-4321-4321-4321-cba987654321",
                minicase_number=12,
                minicase_title="Melebihi Maks",
                subject_name="Pengantar",
                node_type="multiple_choice",
                question="Pertanyaan valid",
                is_parent=False,
                circle_color="#4F46E5",
            )

        # Batas sah: 2 dan 11
        node_min = MinicaseNode(
            id="12345678-1234-1234-1234-123456789abc",
            parent_id="87654321-4321-4321-4321-cba987654321",
            minicase_number=2,
            minicase_title="Batas Bawah",
            subject_name="Pengantar",
            node_type="multiple_choice",
            question="Pertanyaan valid",
            is_parent=False,
            circle_color="#4F46E5",
        )
        self.assertEqual(node_min.minicase_number, 2)

        node_max = MinicaseNode(
            id="12345678-1234-1234-1234-123456789abc",
            parent_id="87654321-4321-4321-4321-cba987654321",
            minicase_number=11,
            minicase_title="Batas Atas",
            subject_name="Pengantar",
            node_type="multiple_choice",
            question="Pertanyaan valid",
            is_parent=False,
            circle_color="#4F46E5",
        )
        self.assertEqual(node_max.minicase_number, 11)

    def test_invalid_uuid_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            MinicaseNode(
                id="invalid-uuid",
                parent_id="87654321-4321-4321-4321-cba987654321",
                minicase_number=2,
                minicase_title="Logika Algoritma",
                subject_name="Dasar Pemrograman",
                node_type="multiple_choice",
                question="Pertanyaan valid",
                is_parent=False,
                circle_color="#4F46E5",
            )

    def test_invalid_color_rejected(self) -> None:
        with self.assertRaises(ValidationError):
            MinicaseNode(
                id="12345678-1234-1234-1234-123456789abc",
                parent_id="87654321-4321-4321-4321-cba987654321",
                minicase_number=2,
                minicase_title="Logika Algoritma",
                subject_name="Dasar Pemrograman",
                node_type="multiple_choice",
                question="Pertanyaan valid",
                is_parent=False,
                circle_color="red",  # bukan format hex
            )

    def test_generate_minicases_request(self) -> None:
        req = GenerateMinicasesRequest(
            major_id="12345678-1234-1234-1234-123456789abc",
            major_name="Teknik Informatika",
            circle_color="#4F46E5",
            profile=InputKeminatan(
                minat="Suka problem solving dan coding",
                nilai=SubjectsScore(Matematika=85, IPA=80, Bahasa_Inggris=90),
            ),
        )
        self.assertEqual(req.major_name, "Teknik Informatika")
        self.assertIsNotNone(req.profile)

    def test_core_subjects_llm_response(self) -> None:
        from arahkita_backend.schemas.minicase_node import CoreSubjectsLLMResponse

        resp = CoreSubjectsLLMResponse(
            subjects=["Pemrograman Dasar", "Struktur Data", "Basis Data"]
        )
        self.assertEqual(len(resp.subjects), 3)

        with self.assertRaises(ValidationError):
            CoreSubjectsLLMResponse(subjects=[])

    def test_single_subject_trial_llm_response(self) -> None:
        from arahkita_backend.schemas.minicase_node import (
            EssayLLMItem,
            MultipleChoiceLLMItem,
            SingleSubjectTrialLLMResponse,
        )

        resp = SingleSubjectTrialLLMResponse(
            mcq=MultipleChoiceLLMItem(
                minicase_title="Algoritma Dasar",
                question="Pertanyaan mcq valid?",
                options=["A", "B", "C", "D"],
                correct_answer="A",
            ),
            essay=EssayLLMItem(
                minicase_title="Tantangan Logika",
                question="Pertanyaan esai reflektif valid?",
                evaluation_hint="Indikator analitis",
            ),
        )
        self.assertEqual(resp.mcq.minicase_title, "Algoritma Dasar")
        self.assertEqual(resp.essay.minicase_title, "Tantangan Logika")

    def test_sse_minicase_message_envelope(self) -> None:
        from arahkita_backend.schemas.minicase_node import SSEMinicaseMessage

        status_msg = SSEMinicaseMessage(
            type="status",
            data={"message": "Sedang menganalisis...", "progress": 20},
        )
        dumped = status_msg.model_dump_json()
        self.assertIn('"type":"status"', dumped)
        self.assertIn('"message":"Sedang menganalisis..."', dumped)

        node = MinicaseNode(
            id="12345678-1234-1234-1234-123456789abc",
            parent_id="87654321-4321-4321-4321-cba987654321",
            minicase_number=2,
            minicase_title="Logika Algoritma",
            subject_name="Dasar Pemrograman",
            node_type="multiple_choice",
            question="Pertanyaan valid?",
            options=["A", "B", "C", "D"],
            correct_answer="A",
            is_parent=False,
            circle_color="#4F46E5",
        )
        node_msg = SSEMinicaseMessage(type="node", data=node)
        self.assertEqual(node_msg.type, "node")


if __name__ == "__main__":
    unittest.main()

