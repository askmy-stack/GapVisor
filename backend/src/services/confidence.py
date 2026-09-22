"""006 Confidence layer — statistics over sample_size / metric series.

Unclaimed whitespace: surface whether a move is noise. Used by experiments (M6/009)
and reconciliation (010).
"""

from __future__ import annotations

import math
from typing import Any


def mean_with_interval(values: list[float], z: float = 1.96) -> dict[str, Any]:
    """Return mean, n, stderr, and approx 95% CI for a list of metric values."""
    n = len(values)
    if n == 0:
        return {"n": 0, "mean": None, "stderr": None, "ci_low": None, "ci_high": None, "reliable": False}
    mean = sum(values) / n
    if n == 1:
        return {
            "n": 1,
            "mean": mean,
            "stderr": None,
            "ci_low": mean,
            "ci_high": mean,
            "reliable": False,
            "note": "n=1 — treat as noise",
        }
    var = sum((v - mean) ** 2 for v in values) / (n - 1)
    stderr = math.sqrt(var / n)
    return {
        "n": n,
        "mean": mean,
        "stderr": stderr,
        "ci_low": mean - z * stderr,
        "ci_high": mean + z * stderr,
        "reliable": n >= 30,
    }


def is_meaningful_change(
    before: float,
    after: float,
    sample_size: int,
    min_delta: float = 2.0,
    min_n: int = 10,
) -> dict[str, Any]:
    """Heuristic gate: is |after-before| large enough given sample size?"""
    delta = after - before
    ok = abs(delta) >= min_delta and sample_size >= min_n
    return {
        "delta": delta,
        "sample_size": sample_size,
        "meaningful": ok,
        "reason": (
            "ok"
            if ok
            else ("small_sample" if sample_size < min_n else "delta_within_noise_band")
        ),
    }
