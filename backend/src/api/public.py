from fastapi import APIRouter

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/showcase-metrics")
def showcase_metrics() -> dict:
    """Unauthenticated sign-in panel metrics (replaces sign-in/showcase-metrics.json)."""
    return {
        "data": [
            {"label": "Recommendation Rate", "value": "48%"},
            {"label": "Share of Voice", "value": "12.4%"},
            {"label": "Sentiment Index", "value": "8.2/10"},
        ]
    }
