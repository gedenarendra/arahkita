from arahkita_backend.adapters.openrouter import OpenRouterAdapter
from arahkita_backend.schemas.input import InputKeminatan
from arahkita_backend.schemas.major_node import MajorNode
from arahkita_backend.services.cluster_service import get_cluster_recommendations
from arahkita_backend.utils.colors import pick_circle_color
from arahkita_backend.utils.ids import generate_uuid


async def get_major_recommendations(
    profile: InputKeminatan,
    adapter: OpenRouterAdapter,
) -> list[MajorNode]:
    """Mengambil rekomendasi jurusan dari adapter AI dan merakit objek MajorNode.

    Mendukung backwards-compatibility untuk endpoint /api/v1/majors/recommend
    dengan mengembalikan daftar MajorNode yang memiliki cluster_id.
    """
    try:
        resp = await get_cluster_recommendations(profile, adapter)
        if resp.majors:
            return resp.majors
    except Exception:
        pass

    major_names = await adapter.fetch_major_recommendations(profile)

    nodes: list[MajorNode] = [
        MajorNode(
            id=generate_uuid(),
            cluster_id=None,
            major_name=name,
            circle_color=pick_circle_color(index=idx),
            child_id=None,
        )
        for idx, name in enumerate(major_names)
    ]

    return nodes
