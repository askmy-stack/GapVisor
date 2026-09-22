# GapVisor backend

Python 3.12 FastAPI API + Celery worker/beat. See `../002-backend-platform/` for
the approved spec, plan, data model, and tasks.

```bash
pip install -r requirements.txt
alembic upgrade head
PYTHONPATH=src python scripts/seed.py
PYTHONPATH=src uvicorn main:app --reload --app-dir src --port 8000
```
