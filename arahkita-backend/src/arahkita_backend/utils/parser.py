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


__all__ = [
    "clean_json_response",
]
