"""Celery tasks — stubs until M3 scan pipeline.

enqueue_due_scans must call services.scan_commitment.plan_models_for_day
so FR-012 mode is honored before any provider spend.
"""

from workers.celery_app import celery_app


@celery_app.task(name="workers.tasks.execute_scan")
def execute_scan(prompt_id: str, model_id: str, workspace_id: str) -> dict:
    return {"status": "not_implemented", "prompt_id": prompt_id, "model_id": model_id}
