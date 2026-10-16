from arahkita_backend.schemas.input import InputKeminatan
from arahkita_backend.schemas.preview import GeneratePreviewRequest


def format_user_prompt(profile: InputKeminatan) -> str:
    """Memformat profil keminatan dan nilai siswa menjadi prompt teks untuk LLM."""
    scores_text = "\n".join(
        f"- Nilai {subject}: {score}" for subject, score in profile.nilai.items()
    )
    return (
        f"Data Siswa:\n"
        f"- Minat: {profile.minat}\n"
        f"{scores_text}\n\n"
        f"Berikan tepat 5 rekomendasi nama jurusan kuliah dalam format JSON."
    )


def format_knowledge_cluster_user_prompt(
    majors: list[str], profile: InputKeminatan | None = None
) -> str:
    """Memformat prompt untuk mengelompokkan 5 jurusan ke dalam rumpun keilmuan."""
    majors_text = "\n".join(f"- {name}" for name in majors)
    prompt = f"Daftar 5 Jurusan Kuliah:\n{majors_text}\n"
    if profile is not None:
        prompt += f"\nKonteks Minat Siswa: {profile.minat}\n"
    prompt += (
        "\nKelompokkan kelima jurusan di atas ke dalam 1 hingga 5 payung rumpun keilmuan "
        "(knowledge cluster) dengan nama yang komunikatif dan ramah siswa dalam format JSON."
    )
    return prompt


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


def format_core_subjects_user_prompt(
    major_name: str, profile: InputKeminatan | None = None
) -> str:
    """Memformat prompt untuk mendapatkan daftar mata kuliah dasar inti (Tahap 1)."""
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
    prompt += "Tentukan 3 hingga 5 mata kuliah dasar esensial dalam format JSON."
    return prompt


def format_single_subject_user_prompt(
    major_name: str, subject_name: str, profile: InputKeminatan | None = None
) -> str:
    """Memformat prompt untuk generasi studi kasus (MCQ + Esai) pada satu mata kuliah (Tahap 2)."""
    prompt = (
        f"Jurusan: {major_name}\n"
        f"Mata Kuliah Dasar: {subject_name}\n"
    )
    if profile is not None:
        prompt += f"Minat Siswa: {profile.minat}\n"
    prompt += "Rancang 1 studi kasus pilihan ganda dan 1 esai reflektif untuk mata kuliah ini dalam format JSON."
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


__all__ = [
    "format_user_prompt",
    "format_knowledge_cluster_user_prompt",
    "format_minicases_user_prompt",
    "format_core_subjects_user_prompt",
    "format_single_subject_user_prompt",
    "format_essay_eval_user_prompt",
    "format_preview_user_prompt",
    "format_subject_relevances_user_prompt",
]
