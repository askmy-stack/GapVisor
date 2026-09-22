from celery import Celery

from core.config import settings

celery_app = Celery(
    "visibilityos",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_default_queue="scan",
    task_routes={
        "workers.tasks.execute_scan": {"queue": "scan"},
        "workers.tasks.analyze_answer": {"queue": "parse"},
        "workers.tasks.rollup_incremental": {"queue": "rollup"},
        "workers.tasks.generate_report": {"queue": "export"},
    },
    beat_schedule={},  # populated in M3
    worker_prefetch_multiplier=1,
    task_acks_late=True,
)

# Import task modules when they exist (M3+)
celery_app.autodiscover_tasks(["workers"])
