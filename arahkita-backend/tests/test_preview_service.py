import unittest
from unittest.mock import AsyncMock, MagicMock

from arahkita_backend.adapters.openrouter_adapter import OpenRouterAdapter
from arahkita_backend.schemas.preview import (
    CareerPathLLMItem,
    GeneratePreviewRequest,
    PreviewLLMResponse,
)
from arahkita_backend.services.preview_service import (
    calculate_matching_percentage,
    generate_major_preview,
    sanitize_career_detail,
    sanitize_career_title,
    sanitize_preview_text,
)


class TestPreviewService(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.mock_adapter = MagicMock(spec=OpenRouterAdapter)

    def test_calculate_matching_percentage_formula(self) -> None:
        # Sesuai formula user:
        # MCQ = 80
        # Analytical = (4.0 / 5) * 100 = 80
        # Interest = (5.0 / 5) * 100 = 100
        # Percentage = round(0.30*80 + 0.35*80 + 0.35*100) = round(24 + 28 + 35) = 87
        score = calculate_matching_percentage(
            mcq_accuracy=80.0,
            essay_analytical_score=4.0,
            essay_interest_score=5.0,
        )
        self.assertEqual(score, 87)

    def test_calculate_matching_percentage_boundaries(self) -> None:
        # Nilai maksimum sempurna
        max_score = calculate_matching_percentage(
            mcq_accuracy=100.0,
            essay_analytical_score=5.0,
            essay_interest_score=5.0,
        )
        self.assertEqual(max_score, 100)

        # Nilai minimum
        min_score = calculate_matching_percentage(
            mcq_accuracy=0.0,
            essay_analytical_score=1.0,
            essay_interest_score=1.0,
        )
        # 0.30*0 + 0.35*20 + 0.35*20 = 14
        self.assertEqual(min_score, 14)

        # Clamping check batas bawah
        zero_score = calculate_matching_percentage(
            mcq_accuracy=0.0,
            essay_analytical_score=0.0,
            essay_interest_score=0.0,
        )
        self.assertEqual(zero_score, 1)

    def test_sanitize_career_title(self) -> None:
        self.assertEqual(sanitize_career_title("Software Engineer"), "Software Engineer")
        self.assertEqual(sanitize_career_title("Guru"), "Guru")
        self.assertEqual(
            sanitize_career_title("Senior Lead Cloud Infrastructure Architect"),
            "Senior Lead",
        )
        self.assertEqual(sanitize_career_title("   "), "Praktisi Terkait")

    def test_sanitize_career_detail(self) -> None:
        short_detail = "Merancang arsitektur data dan sistem analisis informasi."
        self.assertEqual(sanitize_career_detail(short_detail), short_detail)

        # Detail lebih dari 100 kata
        long_words = [f"detail{i}" for i in range(120)]
        long_detail = " ".join(long_words)
        sanitized = sanitize_career_detail(long_detail, max_words=100)
        self.assertEqual(len(sanitized.rstrip(".").split()), 100)

        # Detail kosong
        self.assertEqual(sanitize_career_detail("   "), "Deskripsi karir belum tersedia.")

    def test_sanitize_preview_text(self) -> None:
        short_text = "Ini adalah rangkuman singkat."
        self.assertEqual(sanitize_preview_text(short_text), short_text)

        # Generate teks lebih dari 200 kata
        long_words = [f"kata{i}" for i in range(250)]
        long_text = " ".join(long_words)
        sanitized = sanitize_preview_text(long_text, max_words=200)
        self.assertEqual(len(sanitized.rstrip(".").split()), 200)

    async def test_generate_major_preview_success(self) -> None:
        major_node_id = "11111111-2222-4333-8444-555555555555"
        mock_llm_response = PreviewLLMResponse(
            preview="Kamu memiliki potensi besar dalam problem solving dan pemrograman.",
            career_paths=[
                CareerPathLLMItem(
                    title="Software Engineer",
                    detail="Merancang aplikasi sistem berbasis web dan mobile.",
                ),
                CareerPathLLMItem(
                    title="Data Scientist",
                    detail="Menganalisis pola data untuk pengambilan keputusan bisnis.",
                ),
                CareerPathLLMItem(
                    title="Cloud Architect Specialist",  # > 2 kata
                    detail="Merancang infrastruktur komputasi awan yang skalabel.",
                ),
                CareerPathLLMItem(
                    title="Cyber Security",
                    detail="Mengamankan jaringan dan integritas data perusahaan.",
                ),
                CareerPathLLMItem(
                    title="Product Manager",  # item ke-5, harus dibatasi maks 4
                    detail="Memimpin siklus hidup produk teknologi.",
                ),
            ],
        )
        self.mock_adapter.fetch_preview_generation = AsyncMock(
            return_value=mock_llm_response
        )

        request = GeneratePreviewRequest(
            major_name="Teknik Informatika",
            mcq_accuracy=90.0,
            essay_analytical_score=4.5,
            essay_interest_score=4.5,
            total_trials_completed=6,
        )

        result = await generate_major_preview(
            major_node_id=major_node_id,
            request=request,
            adapter=self.mock_adapter,
        )

        # Verifikasi relasi 1:1 preview ke major_node
        self.assertEqual(result.major_node_id, major_node_id)
        self.assertRegex(
            result.id,
            r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
        )

        # Verifikasi formula matching_percentage
        # 0.30*90 + 0.35*90 + 0.35*90 = 27 + 31.5 + 31.5 = 90
        self.assertEqual(result.matching_percentage, 90)

        # Verifikasi career paths: maksimal 4 item
        self.assertEqual(len(result.career_paths), 4)

        # Verifikasi relasi 1:N career_path ke preview.id beserta atribut detail
        for path in result.career_paths:
            self.assertEqual(path.major_node_preview_id, result.id)
            self.assertRegex(
                path.id,
                r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
            )
            # Maksimal 2 kata pada title
            self.assertLessEqual(len(path.title.split()), 2)
            # Detail tidak boleh kosong dan maksimal 100 kata
            self.assertTrue(len(path.detail) > 0)
            self.assertLessEqual(len(path.detail.split()), 100)

        # Verifikasi judul yang tadinya 3 kata terpotong jadi 2 kata
        self.assertEqual(result.career_paths[2].title, "Cloud Architect")
        self.assertEqual(
            result.career_paths[0].detail,
            "Merancang aplikasi sistem berbasis web dan mobile.",
        )

    async def test_generate_major_preview_empty_career_fallback(self) -> None:
        major_node_id = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee"
        mock_llm_response = PreviewLLMResponse(
            preview="Rangkuman evaluasi sederhana.",
            career_paths=[],
        )
        self.mock_adapter.fetch_preview_generation = AsyncMock(
            return_value=mock_llm_response
        )

        request = GeneratePreviewRequest(
            major_name="Matematika Murni",
            mcq_accuracy=70.0,
            essay_analytical_score=3.5,
            essay_interest_score=3.5,
            total_trials_completed=4,
        )

        result = await generate_major_preview(
            major_node_id=major_node_id,
            request=request,
            adapter=self.mock_adapter,
        )

        # Harus memiliki minimal 1 fallback career path dengan title dan detail
        self.assertGreaterEqual(len(result.career_paths), 1)
        self.assertEqual(result.career_paths[0].title, "Matematika Murni")
        self.assertIn("Matematika Murni", result.career_paths[0].detail)


if __name__ == "__main__":
    unittest.main()

