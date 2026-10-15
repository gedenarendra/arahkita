from arahkita_backend.adapters.openrouter_adapter import OpenRouterAdapter
from arahkita_backend.schemas.input import InputKeminatan
from arahkita_backend.schemas.major_node import MajorNode
from arahkita_backend.utils.colors import pick_circle_color
from arahkita_backend.utils.ids import generate_uuid


async def get_major_recommendations(
    profile: InputKeminatan,
    adapter: OpenRouterAdapter,
) -> list[MajorNode]:
    """Mengambil rekomendasi jurusan dari adapter AI dan merakit objek MajorNode.

    Alur:
    1. Memanggil adapter untuk mengambil 2–6 nama jurusan dari LLM.
    2. Melakukan perakitan node (node assembly): memetakan setiap nama jurusan ke
       objek MajorNode lengkap dengan UUID v4 baru dan kode warna lingkaran dari palet kurasi.
    3. Mengembalikan list[MajorNode].
    """
    major_names = await adapter.fetch_major_recommendations(profile)

    nodes: list[MajorNode] = [
        MajorNode(
            id=generate_uuid(),
            major_name=name,
            circle_color=pick_circle_color(index=idx),
            child_id=None,
        )
        for idx, name in enumerate(major_names)
    ]

    return nodes
