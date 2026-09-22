from services.scan_commitment import plan_models_for_day


def test_health_import():
    from main import app

    assert app.title == "GapVisor API"


def test_rotating_weekly_subset():
    plan = plan_models_for_day(
        enabled_model_ids=["chatgpt", "claude", "gemini", "perplexity", "ai-api-key"],
    )
    assert plan.mode == "rotating_weekly"
    assert "ai-api-key" in plan.model_ids
    assert len([m for m in plan.model_ids if m != "ai-api-key"]) <= 2
