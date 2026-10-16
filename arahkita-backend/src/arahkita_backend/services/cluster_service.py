import logging
from collections.abc import AsyncGenerator

from arahkita_backend.adapters.openrouter import OpenRouterAdapter
from arahkita_backend.schemas.input import InputKeminatan
from arahkita_backend.schemas.knowledge_cluster import (
    KnowledgeCluster,
    KnowledgeClusterLLMItem,
    RecommendClustersResponse,
    SSEClusterMessage,
)
from arahkita_backend.schemas.major_node import MajorNode
from arahkita_backend.utils.colors import pick_circle_color
from arahkita_backend.utils.ids import generate_uuid

logger = logging.getLogger(__name__)


def build_cluster_and_major_nodes(
    majors: list[str],
    cluster_items: list[KnowledgeClusterLLMItem],
) -> tuple[list[KnowledgeCluster], list[MajorNode]]:
    """Merakit entitas KnowledgeCluster dan MajorNode dengan UUID, warna kurasi, dan relasi graf lengkap.

    Aturan:
    1. Tiap KnowledgeCluster mendapat id UUID v4 baru dan warna hex dari palet kurasi.
    2. Tiap MajorNode mendapat id UUID v4 baru, warna hex unik tersendiri, serta cluster_id merujuk ke induknya.
    3. Tiap cluster.major_group berisi list UUID dari major_node di bawahnya.
    4. Seluruh jurusan input (5 jurusan) dijamin terpetakan (fallback assignment jika LLM melewatkan salah satu jurusan).
    """
    clean_majors: list[str] = [m.strip() for m in majors if m and m.strip()]
    if not clean_majors:
        clean_majors = ["Jurusan Umum"]

    # Normalisasi pemetaan jurusan dari cluster_items LLM
    normalized_clusters: list[tuple[str, list[str]]] = []
    assigned_majors: set[str] = set()

    for item in cluster_items:
        cluster_name = item.cluster_name.strip() or "Rumpun Keilmuan"
        matched_majors: list[str] = []
        for raw_major in item.majors:
            clean_m = raw_major.strip()
            # Cari major asli yang cocok (case-insensitive)
            for original_m in clean_majors:
                if (
                    clean_m.lower() == original_m.lower()
                    and original_m not in assigned_majors
                ):
                    matched_majors.append(original_m)
                    assigned_majors.add(original_m)
                    break

        if matched_majors:
            normalized_clusters.append((cluster_name, matched_majors))

    # Pastikan jurusan yang belum terpetakan masuk ke cluster yang ada atau cluster baru
    unassigned = [m for m in clean_majors if m not in assigned_majors]
    if unassigned:
        if normalized_clusters:
            # Masukkan ke cluster pertama
            first_name, first_majors = normalized_clusters[0]
            first_majors.extend(unassigned)
            normalized_clusters[0] = (first_name, first_majors)
        else:
            # Buat cluster default jika LLM tidak mengembalikan cluster valid
            normalized_clusters.append(("Rumpun Keilmuan Terpilih", unassigned))

    # Batasi maksimal 5 cluster sesuai aturan bisnis
    normalized_clusters = normalized_clusters[:5]

    clusters: list[KnowledgeCluster] = []
    all_major_nodes: list[MajorNode] = []
    major_counter = 0

    for cluster_idx, (cluster_name, cluster_major_names) in enumerate(
        normalized_clusters
    ):
        cluster_id = generate_uuid()
        cluster_color = pick_circle_color(index=cluster_idx)
        cluster_major_ids: list[str] = []

        for major_name in cluster_major_names:
            major_id = generate_uuid()
            # Berikan variasi warna unik tersendiri untuk major_node
            major_color = pick_circle_color(index=cluster_idx + major_counter + 5)
            major_counter += 1

            major_node = MajorNode(
                id=major_id,
                cluster_id=cluster_id,
                major_name=major_name,
                circle_color=major_color,
                child_id=None,
            )
            all_major_nodes.append(major_node)
            cluster_major_ids.append(major_id)

        cluster = KnowledgeCluster(
            id=cluster_id,
            cluster_name=cluster_name,
            circle_color=cluster_color,
            major_group=cluster_major_ids,
        )
        clusters.append(cluster)

    return clusters, all_major_nodes


class ClusterSSEService:
    """Service orkestrasi SSE untuk menghasilkan rumpun keilmuan dan jurusan."""

    async def stream_recommendations(
        self,
        profile: InputKeminatan,
        adapter: OpenRouterAdapter,
    ) -> AsyncGenerator[str, None]:
        """Men-generate rumpun keilmuan dan jurusan secara streaming Server-Sent Events (SSE).

        Alur Event:
        1. status (15%): Analisis profil keminatan siswa.
        2. status (45%): Generasi 5 jurusan rekomendasi.
        3. status (75%): Pengelompokan ke dalam rumpun keilmuan.
        4. status (90%): Perakitan graf node & warna.
        5. cluster: Memancarkan objek KnowledgeCluster satu demi satu.
        6. major: Memancarkan objek MajorNode satu demi satu.
        7. done: Sinyal penyelesaian generasi graf.
        """
        try:
            # 1. Status awal
            init_msg = SSEClusterMessage(
                type="status",
                data={
                    "stage": "analyzing",
                    "message": "Menganalisis keminatan dan nilai mata pelajaran siswa...",
                    "progress": 15,
                },
            )
            yield f"data: {init_msg.model_dump_json()}\n\n"

            # 2. Generasi 5 Jurusan
            majors = await adapter.fetch_major_recommendations(profile)
            if not majors:
                raise ValueError("Model tidak menghasilkan rekomendasi jurusan.")

            major_status_msg = SSEClusterMessage(
                type="status",
                data={
                    "stage": "generating_majors",
                    "message": f"Menghasilkan {len(majors)} jurusan rekomendasi...",
                    "progress": 45,
                },
            )
            yield f"data: {major_status_msg.model_dump_json()}\n\n"

            # 3. Pengelompokan ke Rumpun Keilmuan
            cluster_items = await adapter.fetch_knowledge_clusters(
                majors=majors, profile=profile
            )

            clustering_status_msg = SSEClusterMessage(
                type="status",
                data={
                    "stage": "clustering",
                    "message": "Mengelompokkan jurusan ke dalam rumpun keilmuan...",
                    "progress": 75,
                },
            )
            yield f"data: {clustering_status_msg.model_dump_json()}\n\n"

            # 4. Perakitan Node Graf
            clusters, major_nodes = build_cluster_and_major_nodes(
                majors=majors, cluster_items=cluster_items
            )

            assembling_status_msg = SSEClusterMessage(
                type="status",
                data={
                    "stage": "assembling",
                    "message": "Merakit visualisasi graf rumpun keilmuan...",
                    "progress": 90,
                },
            )
            yield f"data: {assembling_status_msg.model_dump_json()}\n\n"

            # 5. Pancarkan KnowledgeCluster
            for cluster in clusters:
                cluster_event = SSEClusterMessage(type="cluster", data=cluster)
                yield f"data: {cluster_event.model_dump_json()}\n\n"

            # 6. Pancarkan MajorNode
            for major in major_nodes:
                major_event = SSEClusterMessage(type="major", data=major)
                yield f"data: {major_event.model_dump_json()}\n\n"

            # 7. Sinyal Selesai
            done_msg = SSEClusterMessage(
                type="done",
                data={
                    "clusters_count": len(clusters),
                    "majors_count": len(major_nodes),
                    "message": "Rekomendasi rumpun keilmuan dan jurusan berhasil dibuat.",
                },
            )
            yield f"data: {done_msg.model_dump_json()}\n\n"

        except Exception as exc:
            logger.exception("Terjadi kesalahan saat streaming knowledge clusters: %s", exc)
            error_msg = SSEClusterMessage(
                type="error",
                data={
                    "message": f"Gagal menghasilkan rumpun keilmuan: {exc}",
                },
            )
            yield f"data: {error_msg.model_dump_json()}\n\n"


async def get_cluster_recommendations(
    profile: InputKeminatan,
    adapter: OpenRouterAdapter,
) -> RecommendClustersResponse:
    """Mengambil rekomendasi rumpun keilmuan dan jurusan secara sinkron (fallback)."""
    majors = await adapter.fetch_major_recommendations(profile)
    cluster_items = await adapter.fetch_knowledge_clusters(majors=majors, profile=profile)
    clusters, major_nodes = build_cluster_and_major_nodes(
        majors=majors, cluster_items=cluster_items
    )
    return RecommendClustersResponse(clusters=clusters, majors=major_nodes)


__all__ = [
    "build_cluster_and_major_nodes",
    "ClusterSSEService",
    "get_cluster_recommendations",
]
