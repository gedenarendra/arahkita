import unittest
from pydantic import ValidationError

from arahkita_backend.schemas.knowledge_cluster import (
    KnowledgeCluster,
    KnowledgeClusterLLMItem,
    KnowledgeClusterLLMResponse,
    RecommendClustersResponse,
    SSEClusterMessage,
)
from arahkita_backend.schemas.major_node import MajorNode
from arahkita_backend.utils.ids import generate_uuid


class TestKnowledgeClusterSchemas(unittest.TestCase):
    def test_valid_knowledge_cluster(self) -> None:
        cluster_id = generate_uuid()
        major_1 = generate_uuid()
        major_2 = generate_uuid()

        cluster = KnowledgeCluster(
            id=cluster_id,
            cluster_name="Teknologi & Rekayasa",
            circle_color="#4F46E5",
            major_group=[major_1, major_2],
        )

        self.assertEqual(cluster.id, cluster_id)
        self.assertEqual(cluster.cluster_name, "Teknologi & Rekayasa")
        self.assertEqual(cluster.circle_color, "#4F46E5")
        self.assertEqual(len(cluster.major_group), 2)

    def test_invalid_uuid_knowledge_cluster(self) -> None:
        with self.assertRaises(ValidationError):
            KnowledgeCluster(
                id="invalid-uuid",
                cluster_name="Sains",
                circle_color="#4F46E5",
                major_group=[],
            )

    def test_invalid_hex_color_knowledge_cluster(self) -> None:
        with self.assertRaises(ValidationError):
            KnowledgeCluster(
                id=generate_uuid(),
                cluster_name="Sains",
                circle_color="blue",
                major_group=[],
            )

    def test_major_node_with_cluster_id(self) -> None:
        cluster_id = generate_uuid()
        major_id = generate_uuid()

        node = MajorNode(
            id=major_id,
            cluster_id=cluster_id,
            major_name="Teknik Informatika",
            circle_color="#06B6D4",
        )

        self.assertEqual(node.cluster_id, cluster_id)
        self.assertEqual(node.major_name, "Teknik Informatika")

    def test_major_node_without_cluster_id_backwards_compatible(self) -> None:
        node = MajorNode(
            id=generate_uuid(),
            major_name="Teknik Informatika",
            circle_color="#06B6D4",
        )
        self.assertIsNone(node.cluster_id)

    def test_recommend_clusters_response(self) -> None:
        cluster_id = generate_uuid()
        major_id = generate_uuid()

        cluster = KnowledgeCluster(
            id=cluster_id,
            cluster_name="Teknologi & Rekayasa",
            circle_color="#4F46E5",
            major_group=[major_id],
        )
        major = MajorNode(
            id=major_id,
            cluster_id=cluster_id,
            major_name="Teknik Informatika",
            circle_color="#06B6D4",
        )

        resp = RecommendClustersResponse(
            clusters=[cluster],
            majors=[major],
        )
        self.assertEqual(len(resp.clusters), 1)
        self.assertEqual(len(resp.majors), 1)
        self.assertEqual(resp.majors[0].cluster_id, cluster.id)

    def test_sse_cluster_message(self) -> None:
        status_msg = SSEClusterMessage(
            type="status",
            data={"stage": "analyzing", "progress": 15},
        )
        self.assertEqual(status_msg.type, "status")

        cluster = KnowledgeCluster(
            id=generate_uuid(),
            cluster_name="Bisnis & Manajemen",
            circle_color="#10B981",
            major_group=[],
        )
        cluster_msg = SSEClusterMessage(type="cluster", data=cluster)
        self.assertEqual(cluster_msg.type, "cluster")

        error_msg = SSEClusterMessage(type="error", data={"message": "Timeout"})
        self.assertEqual(error_msg.type, "error")

    def test_llm_response_parsing(self) -> None:
        raw_json = """
        {
            "clusters": [
                {
                    "cluster_name": "Teknologi",
                    "majors": ["Teknik Informatika", "Sistem Informasi"]
                }
            ]
        }
        """
        parsed = KnowledgeClusterLLMResponse.model_validate_json(raw_json)
        self.assertEqual(len(parsed.clusters), 1)
        self.assertEqual(parsed.clusters[0].cluster_name, "Teknologi")
        self.assertEqual(len(parsed.clusters[0].majors), 2)


if __name__ == "__main__":
    unittest.main()
