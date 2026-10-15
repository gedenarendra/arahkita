import uuid


def generate_uuid() -> str:
    """Menghasilkan UUID v4 unik dalam bentuk string."""
    return str(uuid.uuid4())
