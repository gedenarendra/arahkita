import json
import unittest
from unittest.mock import AsyncMock, MagicMock

from arahkita_backend.adapters.openrouter import OpenRouterAdapter
from arahkita_backend.api.v1.clusters import (
    recommend_clusters,
    recommend_clusters_stream,
)
from arahkita_backend.schemas.input import InputKeminatan, SubjectsScore
from arahkita_backend.schemas.knowledge_cluster import KnowledgeClusterLLMItem


class TestClusterAPI(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.mock_adapter = MagicMock(spec=OpenRouterAdapter)
        self.payload = InputKeminatan(
            minat="Tertarik dengan sistem komputer, jaringan, dan kecerdasan buatan",
            nilai=SubjectsScore(matematika=95, ipa=88, informatika=92),
        )

    async def test_api_recommend_clusters(self) -> None:
        self.mock_adapter.fetch_major_recommendations = AsyncMock(
            return_value=[
                "Teknik Informatika",
                "Sistem Informasi",
                "Sains Data",
                "Teknik Komputer",
                "Teknik Elektro",
            ]
        )
        self.mock_adapter.fetch_knowledge_clusters = AsyncMock(
            return_value=[
                KnowledgeClusterLLMItem(
                    cluster_name="Teknologi Informasi & Komputer",
                    majors=[
                        "Teknik Informatika",
                        "Sistem Informasi",
                        "Sains Data",
                        "Teknik Komputer",
                        "Teknik Elektro",
                    ],
                )
            ]
        )

        resp = await recommend_clusters(
            payload=self.payload, adapter=self.mock_adapter
        )

        self.assertEqual(len(resp.clusters), 1)
        self.assertEqual(len(resp.majors), 5)
        self.assertEqual(
            resp.clusters[0].cluster_name, "Teknologi Informasi & Komputer"
        )
        self.assertEqual(len(resp.clusters[0].major_group), 5)
        for major in resp.majors:
            self.assertEqual(major.cluster_id, resp.clusters[0].id)

    async def test_api_recommend_clusters_stream(self) -> None:
        self.mock_adapter.fetch_major_recommendations = AsyncMock(
            return_value=[
                "Teknik Informatika",
                "Sistem Informasi",
                "Sains Data",
                "Manajemen Bisnis",
                "Akuntansi",
            ]
        )
        self.mock_adapter.fetch_knowledge_clusters = AsyncMock(
            return_value=[
                KnowledgeClusterLLMItem(
                    cluster_name="Teknologi & Data",
                    majors=["Teknik Informatika", "Sistem Informasi", "Sains Data"],
                ),
                KnowledgeClusterLLMItem(
                    cluster_name="Bisnis & Manajemen",
                    majors=["Manajemen Bisnis", "Akuntansi"],
                ),
            ]
        )

        response = await recommend_clusters_stream(
            payload=self.payload, adapter=self.mock_adapter
        )

        self.assertEqual(response.media_type, "text/event-stream")
        self.assertEqual(response.headers["Cache-Control"], "no-cache")

        chunks: list[str] = []
        async for chunk in response.body_iterator:
            if isinstance(chunk, bytes):
                chunks.append(chunk.decode("utf-8"))
            else:
                chunks.append(str(chunk))

        events: list[dict[str, object]] = []
        for line in "".join(chunks).split("\n\n"):
            line = line.strip()
            if line.startswith("data: "):
                raw_json = line[len("data: ") :]
                parsed = json.loads(raw_json)  # type: ignore[reportUnknownMemberType]
                events.append(parsed)  # type: ignore[reportUnknownArgumentType]

        types = [e["type"] for e in events]
        self.assertIn("status", types)
        self.assertIn("cluster", types)
        self.assertIn("major", types)
        self.assertEqual(types[-1], "done")

        cluster_events = [e for e in events if e["type"] == "cluster"]
        major_events = [e for e in events if e["type"] == "major"]
        self.assertEqual(len(cluster_events), 2)
        self.assertEqual(len(major_events), 5)


if __name__ == "__main__":
    unittest.main()
