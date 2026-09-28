"""Ingest a social-signal-pipeline JSONL export into one workspace.

social-signal-pipeline has no HTTP API — it writes enriched records to a
JSONL file (OUTPUT_JSONL_PATH). This script is the file-based path; the
same mapping is also exposed as POST /api/v1/signals/ingest/social-signal-pipeline.

Usage:
    PYTHONPATH=src python scripts/ingest_social_signals.py <enriched.jsonl> --workspace-id <uuid>
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))

from adapters.external_signals import social_signal_pipeline
from core.config import settings
from core.db import SessionLocal
from services.signals import ingest_signals, tracked_entities_for_workspace


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("path", type=Path)
    parser.add_argument("--workspace-id", required=True)
    args = parser.parse_args()

    if not settings.SOCIAL_SIGNALS_ENABLED:
        print("The social-signal-pipeline integration is disabled (SOCIAL_SIGNALS_ENABLED=false).")
        return 1

    records = [json.loads(line) for line in args.path.read_text().splitlines() if line.strip()]
    db = SessionLocal()
    try:
        mapping = social_signal_pipeline.map_enriched_records(
            records,
            workspace_id=args.workspace_id,
            tracked=tracked_entities_for_workspace(db, workspace_id=args.workspace_id),
        )
        report = ingest_signals(db, workspace_id=args.workspace_id, envelopes=mapping.envelopes)
        db.commit()
    finally:
        db.close()

    print(
        f"records={len(records)} accepted={report.accepted} duplicates={report.duplicates} "
        f"rejected={len(report.rejected)} skipped={len(mapping.skipped)}"
    )
    for item in mapping.skipped + report.rejected:
        print(f"  {item}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
