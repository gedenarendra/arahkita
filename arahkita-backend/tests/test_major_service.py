import unittest
from unittest.mock import AsyncMock, MagicMock

from arahkita_backend.adapters.openrouter_adapter import OpenRouterAdapter
from arahkita_backend.schemas.input import InputKeminatan, SubjectsScore
from arahkita_backend.services.major_service import get_major_recommendations


class TestMajorService(unittest.IsolatedAsyncioTestCase):
    async def test_get_major_recommendations(self) -> None:
        mock_adapter = MagicMock(spec=OpenRouterAdapter)
        mock_adapter.fetch_major_recommendations = AsyncMock(
            return_value=["Teknik Informatika", "Sistem Informasi", "Teknik Elektro"]
        )

        profile = InputKeminatan(
            minat="Suka pemrograman dan robotika",
            nilai=SubjectsScore(Matematika=90, IPA=85, Bahasa_Inggris=88),
        )

        nodes = await get_major_recommendations(profile, mock_adapter)

        self.assertEqual(len(nodes), 3)
        self.assertEqual(nodes[0].major_name, "Teknik Informatika")
        self.assertIsNone(nodes[0].child_id)
        self.assertTrue(nodes[0].circle_color.startswith("#"))


if __name__ == "__main__":
    unittest.main()
