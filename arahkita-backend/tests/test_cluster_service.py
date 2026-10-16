import json
import unittest
from unittest.mock import AsyncMock, MagicMock

from arahkita_backend.adapters.openrouter import OpenRouterAdapter
from arahkita_backend.schemas.input import InputKeminatan, SubjectsScore
from arahkita_backend.schemas.knowledge_cluster import KnowledgeClusterLLMItem
from arahkita_backend.services.cluster_service import (
    ClusterSSEService,
    build_cluster_and_major_nodes,
    get_cluster_recommendations,
)


class TestClusterService(unittest.IsolatedAsyncioTestCase):
    def setUp(self) -> None:
        self.profile = InputKeminatan(
            minat="Suka pemrograman web dan data analysis",
            nilai=SubjectsScore(matematika=90, ipa=85, informatika=95),
        )

    def test_build_cluster_and_major_nodes_full_mapping(self) -> None:
        majors = [
            "Teknik Informatika",
            "Sistem Informasi",
            "Sains Data",
            "Manajemen Bisnis",
            "Akuntansi",
        ]
        cluster_items = [
            KnowledgeClusterLLMItem(
                cluster_name="Teknologi & Data",
                majors=["Teknik Informatika", "Sistem Informasi", "Sains Data"],
            ),
            KnowledgeClusterLLMItem(
                cluster_name="Bisnis & Keuangan",
                majors=["Manajemen Bisnis", "Akuntansi"],
            ),
        ]

        clusters, major_nodes = build_cluster_and_major_nodes(majors, cluster_items)

        self.assertEqual(len(clusters), 2)
        self.assertEqual(len(major_nodes), 5)

        # Cek cluster 1
        c1 = clusters[0]
        self.assertEqual(c1.cluster_name, "Teknologi & Data")
        self.assertEqual(len(c1.major_group), 3)

        # Cek cluster 2
        c2 = clusters[1]
        self.assertEqual(c2.cluster_name, "Bisnis & Keuangan")
        self.assertEqual(len(c2.major_group), 2)

        # Cek Foreign Key cluster_id pada major_node
        for major in major_nodes[:3]:
            self.assertEqual(major.cluster_id, c1.id)
            self.assertIn(major.id, c1.major_group)

        for major in major_nodes[3:]:
            self.assertEqual(major.cluster_id, c2.id)
            self.assertIn(major.id, c2.major_group)

    def test_build_cluster_and_major_nodes_unassigned_fallback(self) -> None:
        majors = [
            "Teknik Informatika",
            "Sistem Informasi",
            "Desain Komunikasi Visual",
        ]
        # LLM hanya mengelompokkan 2 jurusan, 1 terlewat
        cluster_items = [
            KnowledgeClusterLLMItem(
                cluster_name="Teknologi",
                majors=["Teknik Informatika", "Sistem Informasi"],
            )
        ]

        clusters, major_nodes = build_cluster_and_major_nodes(majors, cluster_items)

        self.assertEqual(len(clusters), 1)
        self.assertEqual(len(major_nodes), 3)
        # Jurusan ketiga harus otomatis masuk ke cluster pertama
        self.assertEqual(len(clusters[0].major_group), 3)
        self.assertEqual(major_nodes[2].major_name, "Desain Komunikasi Visual")
        self.assertEqual(major_nodes[2].cluster_id, clusters[0].id)

    def test_build_cluster_and_major_nodes_empty_llm_fallback(self) -> None:
        majors = ["Kedokteran", "Farmasi"]
        clusters, major_nodes = build_cluster_and_major_nodes(majors, [])

        self.assertEqual(len(clusters), 1)
        self.assertEqual(len(major_nodes), 2)
        self.assertEqual(clusters[0].cluster_name, "Rumpun Keilmuan Terpilih")
        self.assertEqual(len(clusters[0].major_group), 2)

    async def test_get_cluster_recommendations(self) -> None:
        mock_adapter = MagicMock(spec=OpenRouterAdapter)
        mock_adapter.fetch_major_recommendations = AsyncMock(
            return_value=[
                "Teknik Informatika",
                "Sistem Informasi",
                "Sains Data",
                "Manajemen Bisnis",
                "Akuntansi",
            ]
        )
        mock_adapter.fetch_knowledge_clusters = AsyncMock(
            return_value=[
                KnowledgeClusterLLMItem(
                    cluster_name="Teknologi & Data",
                    majors=["Teknik Informatika", "Sistem Informasi", "Sains Data"],
                ),
                KnowledgeClusterLLMItem(
                    cluster_name="Bisnis & Keuangan",
                    majors=["Manajemen Bisnis", "Akuntansi"],
                ),
            ]
        )

        resp = await get_cluster_recommendations(self.profile, mock_adapter)

        self.assertEqual(len(resp.clusters), 2)
        self.assertEqual(len(resp.majors), 5)
        self.assertEqual(resp.clusters[0].cluster_name, "Teknologi & Data")

    async def test_stream_recommendations_flow(self) -> None:
        mock_adapter = MagicMock(spec=OpenRouterAdapter)
        mock_adapter.fetch_major_recommendations = AsyncMock(
            return_value=[
                "Teknik Informatika",
                "Sistem Informasi",
                "Sains Data",
                "Manajemen Bisnis",
                "Akuntansi",
            ]
        )
        mock_adapter.fetch_knowledge_clusters = AsyncMock(
            return_value=[
                KnowledgeClusterLLMItem(
                    cluster_name="Teknologi & Data",
                    majors=["Teknik Informatika", "Sistem Informasi", "Sains Data"],
                ),
                KnowledgeClusterLLMItem(
                    cluster_name="Bisnis & Keuangan",
                    majors=["Manajemen Bisnis", "Akuntansi"],
                ),
            ]
        )

        sse_service = ClusterSSEService()
        events: list[dict[str, object]] = []

        async for chunk in sse_service.stream_recommendations(
            self.profile, mock_adapter
        ):
            self.assertTrue(chunk.startswith("data: "))
            raw_json = chunk[len("data: ") :].strip()
            parsed = json.loads(raw_json)  # type: ignore[reportUnknownMemberType]
            events.append(parsed)  # type: ignore[reportUnknownArgumentType]

        event_types = [e["type"] for e in events]
        # Pastikan alur lengkap: status -> cluster -> major -> done
        self.assertIn("status", event_types)
        self.assertIn("cluster", event_types)
        self.assertIn("major", event_types)
        self.assertEqual(event_types[-1], "done")

        cluster_events = [e for e in events if e["type"] == "cluster"]
        major_events = [e for e in events if e["type"] == "major"]
        self.assertEqual(len(cluster_events), 2)
        self.assertEqual(len(major_events), 5)

    async def test_stream_recommendations_error_handling(self) -> None:
        mock_adapter = MagicMock(spec=OpenRouterAdapter)
        mock_adapter.fetch_major_recommendations = AsyncMock(
            side_effect=RuntimeError("OpenRouter gateway error")
        )

        sse_service = ClusterSSEService()
        events: list[dict[str, object]] = []

        async for chunk in sse_service.stream_recommendations(
            self.profile, mock_adapter
        ):
            raw_json = chunk[len("data: ") :].strip()
            events.append(json.loads(raw_json))  # type: ignore[reportUnknownArgumentType,reportUnknownMemberType]

        self.assertEqual(events[-1]["type"], "error")


if __name__ == "__main__":
    unittest.main()
