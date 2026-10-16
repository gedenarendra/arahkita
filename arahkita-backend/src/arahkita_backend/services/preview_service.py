import logging

from arahkita_backend.adapters.openrouter import OpenRouterAdapter
from arahkita_backend.schemas.preview import (
    CareerPathLLMItem,
    GeneratePreviewRequest,
    MajorNodeCareerPath,
    MajorNodePreview,
    PreviewLLMResponse,
)
from arahkita_backend.utils.ids import generate_uuid

logger = logging.getLogger(__name__)


def calculate_matching_percentage(
    mcq_accuracy: float,
    essay_analytical_score: float,
    essay_interest_score: float,
) -> int:
    """Menghitung persentase kecocokan keminatan (1–100%) menggunakan formula terbobot:

    MCQ = mcq_accuracy (0–100)
    Analytical = (essay_analytical_score / 5.0) * 100
    Interest = (essay_interest_score / 5.0) * 100
    Matching Percentage = round(0.30 * MCQ + 0.35 * Analytical + 0.35 * Interest)
    Batas nilai clamped: max(1, min(100, score))
    """
    mcq = mcq_accuracy
    analytical = (essay_analytical_score / 5.0) * 100.0
    interest = (essay_interest_score / 5.0) * 100.0

    raw_percentage = round(0.30 * mcq + 0.35 * analytical + 0.35 * interest)
    return max(1, min(100, int(raw_percentage)))


def sanitize_career_title(raw_title: str) -> str:
    """Memastikan judul profesi karir maksimal terdiri dari 2 kata."""
    words = raw_title.strip().split()
    if not words:
        return "Praktisi Terkait"
    if len(words) > 2:
        return " ".join(words[:2])
    return raw_title.strip()


def sanitize_career_detail(raw_detail: str, max_words: int = 100) -> str:
    """Memastikan teks detail profesi karir maksimal terdiri dari max_words kata."""
    words = raw_detail.strip().split()
    if not words:
        return "Deskripsi karir belum tersedia."
    if len(words) > max_words:
        truncated = " ".join(words[:max_words])
        if not truncated.endswith((".", "!", "?")):
            truncated += "..."
        return truncated
    return raw_detail.strip()


def sanitize_preview_text(raw_preview: str, max_words: int = 200) -> str:
    """Memastikan teks rangkuman evaluasi maksimal terdiri dari max_words kata."""
    words = raw_preview.strip().split()
    if not words:
        return "Belum ada evaluasi."
    if len(words) > max_words:
        truncated = " ".join(words[:max_words])
        if not truncated.endswith((".", "!", "?")):
            truncated += "..."
        return truncated
    return raw_preview.strip()


def build_fallback_preview(
    request: GeneratePreviewRequest,
    matching_percentage: int,
) -> PreviewLLMResponse:
    """Menyusun rangkuman evaluasi dan karir fallback sintetis jika OpenRouter mengalami kendala."""
    major_name = request.major_name.strip()

    if matching_percentage >= 75:
        preview_text = (
            f"Luar biasa! Hasil trial menunjukkan potensi dan keselarasan yang sangat tinggi "
            f"dengan jurusan {major_name} (tingkat kecocokan {matching_percentage}%). "
            f"Kamu memperlihatkan pemahaman konsep yang solid pada studi kasus pilihan ganda "
            f"dengan akurasi {request.mcq_accuracy:.0f}%, serta daya analisis dan antusiasme yang kuat pada esai reflektif. "
            f"Eksplorasi lebih dalam di bidang ini sangat direkomendasikan untuk masa depanmu."
        )
    elif matching_percentage >= 50:
        preview_text = (
            f"Hasil evaluasimu menunjukkan kecocokan yang baik dengan jurusan {major_name} "
            f"(tingkat kecocokan {matching_percentage}%). Kamu memiliki pondasi pemikiran yang menjanjikan "
            f"dan minat yang cukup baik dalam memecahkan studi kasus dasar. "
            f"Dengan terus mengasah penalaran konseptual dan memperbanyak latihan praktis, "
            f"peluangmu untuk berkembang di bidang {major_name} akan semakin terbuka lebar."
        )
    else:
        preview_text = (
            f"Eksplorasi trial jurusan {major_name} memberikan gambaran nyata tantangan studi di bidang ini "
            f"(tingkat kecocokan {matching_percentage}%). Meskipun beberapa studi kasus menuntut adaptasi "
            f"dan pemahaman lebih mendalam, pengalaman ini sangat berharga untuk mengenali preferensi belajarmu "
            f"serta membandingkannya dengan rumpun keilmuan lain yang lebih selaras dengan minatmu."
        )

    fallback_careers = [
        CareerPathLLMItem(
            title=sanitize_career_title(major_name),
            detail=(
                f"Praktisi profesional di bidang {major_name} yang menerapkan "
                "keilmuan untuk memecahkan tantangan riil di industri dan masyarakat."
            ),
        ),
        CareerPathLLMItem(
            title="Peneliti Spesialis",
            detail=(
                f"Mengembangkan riset, inovasi terapan, dan studi lanjutan di ranah {major_name} "
                "untuk kemajuan sains, teknologi, dan industri."
            ),
        ),
    ]

    return PreviewLLMResponse(
        preview=preview_text,
        career_paths=fallback_careers,
    )


async def generate_major_preview(
    major_node_id: str,
    request: GeneratePreviewRequest,
    adapter: OpenRouterAdapter,
) -> MajorNodePreview:
    """Men-generate rangkuman evaluasi (preview) dan 1–4 jalur karir untuk suatu major_node.

    Tahapan:
    1. Menghitung matching_percentage secara deterministik menggunakan formula terbobot.
    2. Memanggil LLM untuk menyusun narasi evaluasi (maks. 200 kata) dan rekomendasi karir beserta detailnya.
       Jika pemanggilan LLM gagal, graceful fallback sintetis digunakan secara otomatis.
    3. Membuat UUID v4 untuk entity preview (relasi 1:1 ke major_node_id).
    4. Merakit 1–4 entity career path (relasi 1:N ke major_node_preview_id) dengan judul maks 2 kata dan detail maks 100 kata.
    5. Mengembalikan MajorNodePreview nested siap simpan di IndexedDB (Dexie.js).
    """
    matching_percentage = calculate_matching_percentage(
        mcq_accuracy=request.mcq_accuracy,
        essay_analytical_score=request.essay_analytical_score,
        essay_interest_score=request.essay_interest_score,
    )

    try:
        llm_response = await adapter.fetch_preview_generation(
            request=request,
            matching_percentage=matching_percentage,
        )
    except Exception as exc:
        logger.warning(
            "Gagal men-generate preview dari LLM untuk jurusan '%s': %s. Menggunakan graceful fallback.",
            request.major_name,
            exc,
        )
        llm_response = build_fallback_preview(
            request=request,
            matching_percentage=matching_percentage,
        )

    preview_id = generate_uuid()
    sanitized_preview = sanitize_preview_text(llm_response.preview, max_words=200)

    # Filter dan batasi 1–4 pilihan karir
    candidate_items = [
        item for item in llm_response.career_paths if item.title.strip()
    ]
    chosen_items = candidate_items[:4]

    if not chosen_items:
        fallback_title = sanitize_career_title(request.major_name)
        fallback_detail = (
            f"Profesi dan praktisi di bidang {request.major_name} yang menerapkan "
            "keilmuan untuk memecahkan masalah industri dan masyarakat."
        )
        career_paths = [
            MajorNodeCareerPath(
                id=generate_uuid(),
                major_node_preview_id=preview_id,
                title=fallback_title,
                detail=fallback_detail,
            )
        ]
    else:
        career_paths = [
            MajorNodeCareerPath(
                id=generate_uuid(),
                major_node_preview_id=preview_id,
                title=sanitize_career_title(item.title),
                detail=sanitize_career_detail(item.detail, max_words=100),
            )
            for item in chosen_items
        ]

    return MajorNodePreview(
        id=preview_id,
        major_node_id=major_node_id,
        preview=sanitized_preview,
        matching_percentage=matching_percentage,
        career_paths=career_paths,
    )


__all__ = [
    "calculate_matching_percentage",
    "sanitize_career_title",
    "sanitize_career_detail",
    "sanitize_preview_text",
    "build_fallback_preview",
    "generate_major_preview",
]

