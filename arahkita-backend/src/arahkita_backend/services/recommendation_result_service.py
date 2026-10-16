import logging

from arahkita_backend.adapters.openrouter import OpenRouterAdapter
from arahkita_backend.schemas.input import normalize_subject_name
from arahkita_backend.schemas.preview import MajorNodePreview
from arahkita_backend.schemas.recommendation_result import (
    MajorNodeSubjectRelevance,
    MajorRecommendationResult,
    RecommendationResultsRequest,
)
from arahkita_backend.utils.ids import generate_uuid

logger = logging.getLogger(__name__)


async def calculate_recommendation_leaderboard(
    request: RecommendationResultsRequest,
    adapter: OpenRouterAdapter | None = None,
) -> list[MajorRecommendationResult]:
    """Menyusun dan mengurutkan leaderboard jurusan berdasarkan matching_percentage.

    Aturan & Alur:
    1. Jika request.major_nodes kosong, mengembalikan list kosong [].
    2. Memetakan previews berdasarkan major_node_id. Jika terdapat beberapa preview
       untuk major_node yang sama, pilih preview dengan matching_percentage tertinggi.
    3. Preview yang tidak merujuk ke major_node manapun diabaikan.
    4. Untuk setiap major_node:
       - Jika memiliki preview yang cocok: matching_percentage diambil dari preview,
         is_completed disetel True, dan objek preview disertakan.
       - Jika belum ada preview: matching_percentage = 0, is_completed = False,
         dan preview bernilai None.
    5. Melakukan stable sort descending berdasarkan matching_percentage.
       Jurusan dengan persentase sama akan mempertahankan urutan input semula.
    6. Untuk setiap major_node yang selesai (is_completed == True):
       - Jika request.profile dan adapter tersedia, lakukan evaluasi mata pelajaran
         SMA/SMK yang relevan (1-3 mapel) via LLM OpenRouterAdapter.
       - Jika LLM gagal/error, lakukan graceful degradation (subject_relevances = []).
       - Jika LLM menghasilkan mapel kosong/invalid, fallback ke 1 mapel bernilai tertinggi.
    """
    if not request.major_nodes:
        return []

    # Petakan preview terbaik (skor tertinggi) per major_node_id
    best_previews: dict[str, MajorNodePreview] = {}
    for preview in request.previews:
        existing = best_previews.get(preview.major_node_id)
        if (
            existing is None
            or preview.matching_percentage > existing.matching_percentage
        ):
            best_previews[preview.major_node_id] = preview

    # Bangun entitas MajorRecommendationResult
    results: list[MajorRecommendationResult] = []
    for node in request.major_nodes:
        matched_preview = best_previews.get(node.id)
        if matched_preview is not None:
            results.append(
                MajorRecommendationResult(
                    id=node.id,
                    major_name=node.major_name,
                    circle_color=node.circle_color,
                    child_id=node.child_id,
                    matching_percentage=matched_preview.matching_percentage,
                    is_completed=True,
                    preview=matched_preview,
                    subject_relevances=[],
                )
            )
        else:
            results.append(
                MajorRecommendationResult(
                    id=node.id,
                    major_name=node.major_name,
                    circle_color=node.circle_color,
                    child_id=node.child_id,
                    matching_percentage=0,
                    is_completed=False,
                    preview=None,
                    subject_relevances=[],
                )
            )

    # Stable sort descending berdasarkan matching_percentage
    results.sort(key=lambda item: item.matching_percentage, reverse=True)

    # Evaluasi subject relevance untuk node yang selesai
    completed_nodes = [item for item in results if item.is_completed]
    if completed_nodes and request.profile is not None and adapter is not None:
        candidate_map: dict[str, int] = {
            normalize_subject_name(key): score
            for key, score in request.profile.nilai.items()
        }
        candidate_subjects = list(candidate_map.keys())

        # Urutkan candidate berdasarkan nilai tertinggi sebagai fallback
        sorted_by_score = sorted(
            candidate_map.items(), key=lambda x: x[1], reverse=True
        )
        fallback_subject = (
            sorted_by_score[0][0] if sorted_by_score else "matematika"
        )

        completed_majors_payload: list[dict[str, str]] = [
            {"id": node.id, "major_name": node.major_name}
            for node in completed_nodes
        ]

        try:
            relevance_map = await adapter.fetch_subject_relevances(
                completed_majors=completed_majors_payload,
                candidate_subjects=candidate_subjects,
            )
            for node in completed_nodes:
                raw_relevances = relevance_map.get(node.id, [])
                valid_subjects: list[str] = []
                for s in raw_relevances:
                    normalized = normalize_subject_name(s)
                    matched = next(
                        (
                            c
                            for c in candidate_subjects
                            if c.lower() == normalized.lower()
                        ),
                        None,
                    )
                    if matched and matched not in valid_subjects:
                        valid_subjects.append(matched)

                if not valid_subjects:
                    valid_subjects = [fallback_subject]
                else:
                    valid_subjects = valid_subjects[:3]

                node.subject_relevances = [
                    MajorNodeSubjectRelevance(
                        id=generate_uuid(),
                        major_node_id=node.id,
                        subject_name=subj,
                    )
                    for subj in valid_subjects
                ]
        except Exception as exc:
            logger.warning(
                "Gagal mengevaluasi relevansi mata pelajaran dari LLM: %s. Graceful fallback digunakan.",
                exc,
            )

    return results

