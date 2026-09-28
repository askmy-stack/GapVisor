"""Adapter: askmy-stack/py-outlier as GapVisor's anomaly scorer.

Py-Outlier owns the detection method (plan section 16); this adapter only
shapes GapVisor's data for it. Built against its real API at commit
9a15aba (`anomaly_detection.models.statistical.zscore.ZScoreDetector`,
`models/base.py`): sklearn-style `fit(X)`/`score(X)` on **2-D** input,
where `score` is `|x - mean| / std` (`zscore.py:36-38`).

Two things this adapter does on purpose, both from reading that code:

- It uses `score()`, never `predict()`. `predict()` compares against
  `threshold_`, the (1 - contamination) percentile of the *training*
  scores (`zscore.py:25`), so it flags roughly the top 5% of any varied
  series whether or not anything unusual happened. GapVisor applies its
  own fixed cutoff instead (services/anomalies.py).
- Callers pass values in **percentage points**, not 0..1 fractions.
  Py-Outlier replaces a zero standard deviation with 1.0 (`zscore.py:23`).
  On a 0..1 scale that floor is 100 percentage points, which makes a drop
  from a perfectly flat 67% baseline to 30% score 0.37 — undetectable. In
  percentage points the same drop scores 37.
- It rounds inputs to 6 decimal places first. Daily values are
  sample-weighted means, so a genuinely flat baseline comes out as, e.g.,
  66.66666666666667 and 66.66666666666666. Its stdev is then ~1e-14, not
  0, so py-outlier's zero floor never triggers and a real move scores
  around 1e15. Rounding collapses that float noise without touching any
  real variation.

py-outlier is imported lazily so the rest of GapVisor never depends on it:
if it isn't installed, `is_available()` is False and the anomaly endpoints
say so, instead of failing at import time.
"""

from __future__ import annotations

from collections.abc import Sequence

UPSTREAM_REF = "askmy-stack/py-outlier@9a15aba"
INPUT_DECIMALS = 6
METHOD = "py-outlier.zscore"


def is_available() -> bool:
    try:
        import anomaly_detection.models.statistical.zscore  # noqa: F401
    except ImportError:
        return False
    return True


class PyOutlierZScoreScorer:
    method = METHOD
    version = UPSTREAM_REF

    def score(self, baseline_points: Sequence[float], current_point: float) -> float:
        import numpy as np
        from anomaly_detection.models.statistical.zscore import ZScoreDetector

        detector = ZScoreDetector()
        baseline = np.round(np.asarray(baseline_points, dtype=float), INPUT_DECIMALS)
        current = round(float(current_point), INPUT_DECIMALS)
        detector.fit(baseline.reshape(-1, 1))
        return float(detector.score(np.asarray([[current]], dtype=float))[0])
