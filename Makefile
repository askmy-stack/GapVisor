.PHONY: up down logs api-shell migrate seed test fe-dev be-dev

up:
	docker compose up --build

down:
	docker compose down

logs:
	docker compose logs -f api worker beat

migrate:
	cd backend && alembic upgrade head

seed:
	cd backend && PYTHONPATH=src python scripts/seed.py

test:
	cd backend && PYTHONPATH=src pytest -q

fe-dev:
	cd frontend && npm install && npm run dev

be-dev:
	cd backend && PYTHONPATH=src uvicorn main:app --reload --app-dir src --port 8000
