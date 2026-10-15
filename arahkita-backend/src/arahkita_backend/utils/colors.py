import random

# Palet kurasi warna hex ramah mata (Tailwind 500/600 shades) yang memiliki kontras baik dengan teks
CURATED_CIRCLE_COLORS: tuple[str, ...] = (
    "#4F46E5",  # Indigo
    "#059669",  # Emerald
    "#D97706",  # Amber
    "#E11D48",  # Rose
    "#0284C7",  # Sky
    "#7C3AED",  # Violet
    "#0D9488",  # Teal
    "#2563EB",  # Blue
    "#EA580C",  # Orange
    "#9333EA",  # Purple
)


def pick_circle_color(index: int | None = None) -> str:
    """Memilih warna lingkaran dari palet kurasi.

    Jika `index` diberikan, warna dipilih secara berurutan / rotasi deterministik (modulo).
    Jika `index` adalah None, warna dipilih secara acak terdistribusi.
    """
    if index is not None:
        return CURATED_CIRCLE_COLORS[index % len(CURATED_CIRCLE_COLORS)]
    return random.choice(CURATED_CIRCLE_COLORS)
