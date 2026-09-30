#!/usr/bin/env bash
# Runs once when a Codespace (or any devcontainer build) is created.
# Installs the CLIs and project dependencies so `claude` and `codex` work
# immediately in the built-in terminal, with no local setup on your machine.
set -euo pipefail

echo "==> Installing AI coding CLIs"
npm install -g @anthropic-ai/claude-code @openai/codex

echo "==> Installing backend dependencies"
if [ -f backend/requirements.txt ]; then
  python3 -m venv backend/.venv
  backend/.venv/bin/pip install --upgrade pip
  backend/.venv/bin/pip install -r backend/requirements.txt
fi

echo "==> Installing frontend dependencies"
if [ -f frontend/package.json ]; then
  (cd frontend && npm ci)
fi

echo "==> Done. Open a terminal and run: claude   (or: codex)"
echo "    If ANTHROPIC_API_KEY / OPENAI_API_KEY are missing, add them as"
echo "    Codespaces secrets in GitHub settings and rebuild the container."
