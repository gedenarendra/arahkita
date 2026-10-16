from .clusters import router as clusters_router
from .majors import router as majors_router
from .minicases import router as minicases_router
from .preview import router as preview_router
from .recommendation_results import router as recommendation_results_router

__all__ = [
    "clusters_router",
    "majors_router",
    "minicases_router",
    "preview_router",
    "recommendation_results_router",
]

