import logging
from openai import AsyncOpenAI

from arahkita_backend.config.settings import Settings
from arahkita_backend.schemas.essay_eval import (
    EssayEvaluationLLMResponse,
    EssayEvaluationRequest,
    EssayEvaluationResult,
)
from arahkita_backend.schemas.input import InputKeminatan
from arahkita_backend.schemas.major_node import MajorRecommendationLLMResponse
from arahkita_backend.schemas.minicase_node import (
    GenerateMinicasesRequest,
    MinicasesGenerationLLMResponse,
    SubjectTrialLLMItem,
)
from arahkita_backend.schemas.preview import (
    GeneratePreviewRequest,
    PreviewLLMResponse,
)
from arahkita_backend.schemas.recommendation_result import (
    MajorSubjectRelevanceLLMResponse,
)

logger = logging.getLogger(__name__)

MAJOR_RECOMMENDATION_SYSTEM_PROMPT = """Kamu adalah konsultan peminatan jurusan kuliah untuk siswa SMA/SMK di Indonesia.
Tugasmu adalah menganalisis minat dan nilai mata pelajaran siswa, lalu merekomendasikan antara 2 hingga 6 nama jurusan kuliah yang paling relevan dan realistis.

Aturan Wajib:
1. Kembalikan HANYA format JSON valid berikut:
{"recommendations": ["Nama Jurusan 1", "Nama Jurusan 2", ...]}
2. Berikan minimal 2 dan maksimal 6 rekomendasi nama jurusan.
3. Gunakan nama jurusan resmi dalam bahasa Indonesia yang lazim di perguruan tinggi (misal: "Teknik Informatika", "Sistem Informasi", "Teknik Elektro").
4. Jangan sertakan teks penjelasan, markdown formatting tambahan, ataupun basa-basi di luar format JSON tersebut.
"""

MINICASES_SYSTEM_PROMPT = """Kamu adalah perancang kurikulum dan studi kasus interaktif untuk siswa SMA/SMK yang ingin mengeksplorasi jurusan kuliah di Indonesia.
Tugasmu adalah menganalisis suatu jurusan kuliah dan memilih antara 3 hingga 5 mata kuliah dasar (basic/pengantar) yang paling esensial dan representatif di jurusan tersebut.

Untuk setiap mata kuliah dasar yang dipilih, buat TEPAT 2 studi kasus/trial interaktif:
1. Pilihan Ganda (MCQ):
   - minicase_title: Judul interaktif yang relevan dengan topik (maksimal 2 kata, misal "Logika Coding", "Audit Akun", "Diagnosa Awal").
   - question: Studi kasus atau pertanyaan aplikatif pengantar konsep dasar mata kuliah tersebut.
   - options: Tepat 4 pilihan jawaban yang masuk akal dan jelas perbedaannya.
   - correct_answer: Kunci jawaban yang benar (harus persis sama dengan salah satu opsi di dalam options).
2. Esai Reflektif:
   - minicase_title: Judul interaktif yang relevan dengan topik (maksimal 2 kata).
   - question: Skenario tantangan, dilema, atau situasi dunia nyata yang menuntut penalaran problem-solving atau resiliensi siswa.
   - evaluation_hint: Kriteria atau indikator singkat yang membedakan jawaban berkualitas tinggi (berpikir analitis, kompromi, inisiatif) dengan jawaban rendah (pasrah, asal-asalan).

Aturan Wajib:
1. Kembalikan HANYA format JSON valid dengan struktur:
{
  "subjects": [
    {
      "subject_name": "Nama Mata Kuliah",
      "mcq": {
        "minicase_title": "Judul Maks2Kata",
        "question": "...",
        "options": ["Opsi A", "Opsi B", "Opsi C", "Opsi D"],
        "correct_answer": "Opsi A"
      },
      "essay": {
        "minicase_title": "Judul Maks2Kata",
        "question": "...",
        "evaluation_hint": "..."
      }
    }
  ]
}
2. Jumlah subjects harus minimal 3 dan maksimal 5 (menghasilkan total 6 hingga 10 studi kasus).
3. Gunakan bahasa Indonesia yang komunikatif, menarik, dan mudah dipahami siswa SMA/SMK.
4. Jangan sertakan teks markdown atau penjelasan di luar format JSON.
"""

ESSAY_EVALUATION_SYSTEM_PROMPT = """Kamu adalah evaluator psikometrik dan peminatan jurusan yang menilai respon esai reflektif siswa SMA/SMK.
Kamu akan menerima:
- Pertanyaan (studi kasus)
- Pedoman Penilaian (evaluation_hint)
- Jawaban Siswa (user_answer)

Tugasmu adalah menilai jawaban siswa secara objektif ke dalam 3 dimensi spesifik:
1. analytical_fit (Skor integer 1–5):
   Apakah cara siswa merespons masalah masuk akal, logis, dan sejalan dengan kriteria di evaluation_hint?
2. interest_signal (Skor integer 1–5):
   Apakah nada emosional siswa menunjukkan antusiasme, rasa ingin tahu, atau ketertarikan terhadap tantangan tersebut?
3. is_serious_attempt (boolean True / False):
   Guardrail validasi input. True jika siswa benar-benar berusaha merespons studi kasus. False jika siswa hanya mengetik karakter acak (seperti "asdfgh"), mengetik penolakan/ketidakniatan (seperti "gak tau", "malas", "lanjut aja", "apa ya"), atau jawaban yang sama sekali tidak berhubungan dengan konteks studi kasus.

Aturan Wajib & Penalti:
- JIKA is_serious_attempt == False, MAKA skor analytical_fit WAJIB bernilai 1 dan interest_signal WAJIB bernilai 1.
- Kembalikan HANYA format JSON valid berikut tanpa teks lain:
{"analytical_fit": 4, "interest_signal": 5, "is_serious_attempt": true}
"""

PREVIEW_SYSTEM_PROMPT = """Kamu adalah konsultan peminatan karir dan akademik untuk siswa SMA/SMK di Indonesia.
Tugasmu adalah menganalisis performa interaktif trial/minicase dan profil siswa terhadap suatu jurusan kuliah, lalu menyusun:
1. preview: Teks rangkuman naratif suportif, komunikatif, dan memotivasi (maksimal 200 kata) yang menguraikan keselarasan minat, daya analitis, dan potensi siswa di jurusan tersebut.
2. career_paths: Daftar rekomendasi 1 hingga 4 jalur profesi/karir yang relevan dengan jurusan tersebut, masing-masing dengan title dan detail.

Aturan Wajib:
1. Kembalikan HANYA format JSON valid berikut tanpa markdown formatting tambahan di luar JSON:
{
  "preview": "...",
  "career_paths": [
    {
      "title": "Nama Karir (maksimal 2 kata)",
      "detail": "Penjelasan komprehensif peran, tugas utama, skill penting yang dipelajari, dan prospek karir di industri (maksimal 100 kata)"
    }
  ]
}
2. Panjang preview TIDAK BOLEH lebih dari 200 kata. Gunakan bahasa Indonesia yang ramah, jelas, dan menginspirasi siswa SMA/SMK.
3. Jumlah career_paths minimal 1 dan maksimal 4.
4. Setiap title karir WAJIB maksimal 2 kata (contoh: "Software Engineer", "Data Scientist", "Guru Matematika", "Peneliti Sains").
5. Setiap detail karir WAJIB maksimal 100 kata, menjelaskan tugas utama profesi, skill kunci, dan prospek masa depan karir tersebut di industri.
"""

SUBJECT_RELEVANCE_SYSTEM_PROMPT = """Kamu adalah konsultan peminatan akademik perguruan tinggi di Indonesia.
Tugasmu adalah menganalisis nama-nama jurusan kuliah yang telah diselesaikan siswa dan menentukan 1 hingga 3 mata pelajaran SMA/SMK yang paling relevan dan menjadi fondasi utama bagi masing-masing jurusan tersebut.

Mata pelajaran yang boleh dipilih HANYA berasal dari daftar mata pelajaran kandidat yang diberikan. JANGAN memilih mata pelajaran di luar daftar tersebut.

Aturan Wajib:
1. Kembalikan HANYA format JSON valid berikut tanpa teks tambahan:
{
  "relevances": [
    {
      "major_node_id": "...",
      "relevant_subjects": ["Nama Mapel 1", "Nama Mapel 2"]
    }
  ]
}
2. Untuk setiap jurusan yang diberikan, tentukan minimal 1 dan maksimal 3 mata pelajaran yang paling relevan.
3. relevant_subjects HARUS diambil dari daftar mata pelajaran kandidat yang disediakan.
4. Jangan sertakan markdown formatting di luar JSON atau penjelasan tambahan apapun.
"""



def format_user_prompt(profile: InputKeminatan) -> str:
    """Memformat profil keminatan dan nilai siswa menjadi prompt teks untuk LLM."""
    scores_text = "\n".join(
        f"- Nilai {subject}: {score}" for subject, score in profile.nilai.items()
    )
    return (
        f"Data Siswa:\n"
        f"- Minat: {profile.minat}\n"
        f"{scores_text}\n\n"
        f"Berikan 2 hingga 6 rekomendasi nama jurusan kuliah dalam format JSON."
    )


def format_minicases_user_prompt(
    major_name: str, profile: InputKeminatan | None = None
) -> str:
    """Memformat prompt untuk generasi minicases mata kuliah dasar."""
    prompt = f"Jurusan yang dieksplorasi: {major_name}\n"
    if profile is not None:
        scores_text = "\n".join(
            f"- Nilai {subject}: {score}"
            for subject, score in profile.nilai.items()
        )
        prompt += (
            f"Konteks Profil Siswa:\n"
            f"- Minat: {profile.minat}\n"
            f"{scores_text}\n"
        )
    prompt += "Rancang 3 hingga 5 mata kuliah dasar beserta studi kasus pilihan ganda dan esai reflektif dalam format JSON."
    return prompt


def format_essay_eval_user_prompt(
    question: str, evaluation_hint: str, user_answer: str
) -> str:
    """Memformat prompt evaluasi esai dengan rubric injection (tanpa menyertakan ID)."""
    return (
        f"Pertanyaan Studi Kasus:\n{question}\n\n"
        f"Pedoman Penilaian:\n{evaluation_hint}\n\n"
        f"Jawaban Siswa:\n{user_answer}"
    )


def format_preview_user_prompt(
    request: GeneratePreviewRequest, matching_percentage: int
) -> str:
    """Memformat data evaluasi trial dan profil siswa menjadi prompt teks untuk preview."""
    prompt = (
        f"Jurusan yang dievaluasi: {request.major_name}\n"
        f"Kalkulasi Matching Percentage: {matching_percentage}%\n\n"
        f"Metrik Performa Trial Siswa:\n"
        f"- Akurasi Pilihan Ganda (MCQ): {request.mcq_accuracy}%\n"
        f"- Skor Kemampuan Analitis Esai: {request.essay_analytical_score}/5.0\n"
        f"- Skor Minat/Antusiasme Esai: {request.essay_interest_score}/5.0\n"
        f"- Total Trial yang Diselesaikan: {request.total_trials_completed}\n"
    )
    if request.user_satisfaction_rating is not None:
        prompt += f"- Rating Kepuasan Siswa: {request.user_satisfaction_rating}/5.0\n"
    if request.profile is not None:
        scores_text = "\n".join(
            f"- Nilai {subject}: {score}"
            for subject, score in request.profile.nilai.items()
        )
        prompt += (
            f"\nProfil Keminatan Awal Siswa:\n"
            f"- Minat: {request.profile.minat}\n"
            f"{scores_text}\n"
        )
    prompt += "\nSusun teks rangkuman evaluasi (maksimal 200 kata) dan 1 hingga 4 profesi karir beserta title (maksimal 2 kata) dan detail (maksimal 100 kata) dalam format JSON."
    return prompt


def format_subject_relevances_user_prompt(
    completed_majors: list[dict[str, str]], candidate_subjects: list[str]
) -> str:
    """Memformat prompt untuk evaluasi relevansi mata pelajaran terhadap jurusan kuliah."""
    majors_str = "\n".join(
        f"- ID: {item['id']} | Jurusan: {item['major_name']}"
        for item in completed_majors
    )
    subjects_str = ", ".join(candidate_subjects)
    return (
        f"Daftar Jurusan yang Diselesaikan:\n{majors_str}\n\n"
        f"Daftar Mata Pelajaran Kandidat SMA/SMK:\n{subjects_str}\n\n"
        f"Tentukan 1 hingga 3 mata pelajaran yang paling relevan untuk setiap jurusan dari daftar kandidat di atas dalam format JSON."
    )



def clean_json_response(raw_text: str) -> str:
    """Membersihkan markdown fences jika LLM mengembalikan kode blok markdown."""
    text = raw_text.strip()
    if text.startswith("```json"):
        text = text[7:]
    elif text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()


async def fetch_major_recommendations(
    profile: InputKeminatan,
    settings: Settings,
    client: AsyncOpenAI | None = None,
) -> list[str]:
    """Mengirim request ke OpenRouter untuk mendapatkan daftar 2–6 nama rekomendasi jurusan."""
    ai_client = client or AsyncOpenAI(
        base_url=settings.openrouter_base_url,
        api_key=settings.openrouter_api_key,
    )

    user_content = format_user_prompt(profile)

    response = await ai_client.chat.completions.create(
        model=settings.openrouter_model,
        messages=[
            {"role": "system", "content": MAJOR_RECOMMENDATION_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        max_tokens=1000,
        extra_body={"reasoning": {"exclude": True}},
    )

    raw_content = response.choices[0].message.content
    if not raw_content:
        raise ValueError("OpenRouter mengembalikan respons kosong.")

    cleaned_json = clean_json_response(raw_content)

    try:
        parsed = MajorRecommendationLLMResponse.model_validate_json(cleaned_json)
    except Exception as exc:
        logger.error("Gagal melakukan parsing output LLM: %s. Raw: %s", exc, raw_content)
        raise ValueError(f"Gagal mem-parsing rekomendasi jurusan dari LLM: {exc}") from exc

    recommendations = [r.strip() for r in parsed.recommendations if r and r.strip()]
    return recommendations[:6]


async def fetch_minicases_generation(
    request: GenerateMinicasesRequest,
    settings: Settings,
    client: AsyncOpenAI | None = None,
) -> list[SubjectTrialLLMItem]:
    """Mengirim request ke OpenRouter untuk men-generate 3–5 mata kuliah dasar beserta studi kasus."""
    ai_client = client or AsyncOpenAI(
        base_url=settings.openrouter_base_url,
        api_key=settings.openrouter_api_key,
    )

    user_content = format_minicases_user_prompt(
        major_name=request.major_name,
        profile=request.profile,
    )

    response = await ai_client.chat.completions.create(
        model=settings.openrouter_model,
        messages=[
            {"role": "system", "content": MINICASES_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        max_tokens=3500,
        extra_body={"reasoning": {"exclude": True}},
    )

    raw_content = response.choices[0].message.content
    if not raw_content:
        raise ValueError("OpenRouter mengembalikan respons kosong saat men-generate minicases.")

    cleaned_json = clean_json_response(raw_content)

    try:
        parsed = MinicasesGenerationLLMResponse.model_validate_json(cleaned_json)
    except Exception as exc:
        logger.error("Gagal melakukan parsing output LLM minicases: %s. Raw: %s", exc, raw_content)
        raise ValueError(f"Gagal mem-parsing minicases dari LLM: {exc}") from exc

    if not parsed.subjects:
        raise ValueError("LLM tidak menghasilkan subjek mata kuliah trial.")

    # Batasi minimal 1 dan maksimal 5 mata kuliah (total 2 s.d. 10 node)
    return parsed.subjects[:5]


async def evaluate_essay_answer(
    request: EssayEvaluationRequest,
    settings: Settings,
    client: AsyncOpenAI | None = None,
) -> EssayEvaluationResult:
    """Mengirim prompt evaluasi esai real-time ke OpenRouter dengan rubric injection."""
    ai_client = client or AsyncOpenAI(
        base_url=settings.openrouter_base_url,
        api_key=settings.openrouter_api_key,
    )

    user_content = format_essay_eval_user_prompt(
        question=request.question,
        evaluation_hint=request.evaluation_hint,
        user_answer=request.user_answer,
    )

    response = await ai_client.chat.completions.create(
        model=settings.openrouter_model,
        messages=[
            {"role": "system", "content": ESSAY_EVALUATION_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        max_tokens=1500,
        extra_body={"reasoning": {"exclude": True}},
    )

    raw_content = response.choices[0].message.content
    if not raw_content:
        raise ValueError("OpenRouter mengembalikan respons kosong saat mengevaluasi esai.")

    cleaned_json = clean_json_response(raw_content)

    try:
        parsed = EssayEvaluationLLMResponse.model_validate_json(cleaned_json)
    except Exception as exc:
        logger.error("Gagal melakukan parsing output LLM evaluasi esai: %s. Raw: %s", exc, raw_content)
        raise ValueError(f"Gagal mem-parsing evaluasi esai dari LLM: {exc}") from exc

    # Penerapan guardrail deterministik: jika percobaan tidak serius, penalti nilai ke 1
    if not parsed.is_serious_attempt:
        return EssayEvaluationResult(
            analytical_fit=1,
            interest_signal=1,
            is_serious_attempt=False,
        )

    return EssayEvaluationResult(
        analytical_fit=parsed.analytical_fit,
        interest_signal=parsed.interest_signal,
        is_serious_attempt=True,
    )


async def fetch_preview_generation(
    request: GeneratePreviewRequest,
    matching_percentage: int,
    settings: Settings,
    client: AsyncOpenAI | None = None,
) -> PreviewLLMResponse:
    """Mengirim request ke OpenRouter untuk menghasilkan teks rangkuman evaluasi dan career paths."""
    ai_client = client or AsyncOpenAI(
        base_url=settings.openrouter_base_url,
        api_key=settings.openrouter_api_key,
    )

    user_content = format_preview_user_prompt(
        request=request,
        matching_percentage=matching_percentage,
    )

    response = await ai_client.chat.completions.create(
        model=settings.openrouter_model,
        messages=[
            {"role": "system", "content": PREVIEW_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        max_tokens=1500,
        extra_body={"reasoning": {"exclude": True}},
    )

    raw_content = response.choices[0].message.content
    if not raw_content:
        raise ValueError("OpenRouter mengembalikan respons kosong saat men-generate preview.")

    cleaned_json = clean_json_response(raw_content)

    try:
        parsed = PreviewLLMResponse.model_validate_json(cleaned_json)
    except Exception as exc:
        logger.error("Gagal melakukan parsing output LLM preview: %s. Raw: %s", exc, raw_content)
        raise ValueError(f"Gagal mem-parsing preview dari LLM: {exc}") from exc

    return parsed


async def fetch_subject_relevances(
    completed_majors: list[dict[str, str]],
    candidate_subjects: list[str],
    settings: Settings,
    client: AsyncOpenAI | None = None,
) -> dict[str, list[str]]:
    """Mengambil pemetaan mata pelajaran relevan untuk completed major nodes via LLM."""
    if not completed_majors or not candidate_subjects:
        return {}

    ai_client = client or AsyncOpenAI(
        base_url=settings.openrouter_base_url,
        api_key=settings.openrouter_api_key,
    )

    user_content = format_subject_relevances_user_prompt(
        completed_majors=completed_majors,
        candidate_subjects=candidate_subjects,
    )

    response = await ai_client.chat.completions.create(
        model=settings.openrouter_model,
        messages=[
            {"role": "system", "content": SUBJECT_RELEVANCE_SYSTEM_PROMPT},
            {"role": "user", "content": user_content},
        ],
        response_format={"type": "json_object"},
        max_tokens=1000,
        extra_body={"reasoning": {"exclude": True}},
    )

    raw_content = response.choices[0].message.content
    if not raw_content:
        raise ValueError(
            "OpenRouter mengembalikan respons kosong saat evaluasi relevansi mapel."
        )

    cleaned_json = clean_json_response(raw_content)

    try:
        parsed = MajorSubjectRelevanceLLMResponse.model_validate_json(cleaned_json)
    except Exception as exc:
        logger.error(
            "Gagal melakukan parsing output LLM relevansi mapel: %s. Raw: %s",
            exc,
            raw_content,
        )
        raise ValueError(f"Gagal mem-parsing relevansi mapel dari LLM: {exc}") from exc

    return {
        item.major_node_id: item.relevant_subjects
        for item in parsed.relevances
    }


class OpenRouterAdapter:
    """Adapter untuk berkomunikasi dengan model AI di OpenRouter."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.client = AsyncOpenAI(
            base_url=settings.openrouter_base_url,
            api_key=settings.openrouter_api_key,
        )

    async def fetch_major_recommendations(self, profile: InputKeminatan) -> list[str]:
        """Mengambil rekomendasi jurusan menggunakan konfigurasi client adapter."""
        return await fetch_major_recommendations(
            profile=profile,
            settings=self.settings,
            client=self.client,
        )

    async def fetch_minicases_generation(
        self, request: GenerateMinicasesRequest
    ) -> list[SubjectTrialLLMItem]:
        """Mengambil hasil generasi mata kuliah dan minicases trial."""
        return await fetch_minicases_generation(
            request=request,
            settings=self.settings,
            client=self.client,
        )

    async def evaluate_essay_answer(
        self, request: EssayEvaluationRequest
    ) -> EssayEvaluationResult:
        """Mengevaluasi jawaban esai reflektif siswa secara real-time."""
        return await evaluate_essay_answer(
            request=request,
            settings=self.settings,
            client=self.client,
        )

    async def fetch_preview_generation(
        self, request: GeneratePreviewRequest, matching_percentage: int
    ) -> PreviewLLMResponse:
        """Mengambil hasil generasi preview rangkuman jurusan dan career path dari LLM."""
        return await fetch_preview_generation(
            request=request,
            matching_percentage=matching_percentage,
            settings=self.settings,
            client=self.client,
        )

    async def fetch_subject_relevances(
        self,
        completed_majors: list[dict[str, str]],
        candidate_subjects: list[str],
    ) -> dict[str, list[str]]:
        """Mengambil pemetaan mata pelajaran relevan untuk completed major nodes."""
        return await fetch_subject_relevances(
            completed_majors=completed_majors,
            candidate_subjects=candidate_subjects,
            settings=self.settings,
            client=self.client,
        )


