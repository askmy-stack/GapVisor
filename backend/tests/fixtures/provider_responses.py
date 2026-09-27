"""Failure fixtures for provider-response normalization tests (vNext plan
section 22 Phase G2). These represent malformed/failed responses a real
provider integration could produce; the demo seed path never uses this
module and always goes through the real, always-succeeding MockProvider.
"""

from __future__ import annotations

from adapters.providers.base import ProviderResponse

EMPTY_RESPONSE = ProviderResponse(status="completed", raw_text="")
WHITESPACE_ONLY_RESPONSE = ProviderResponse(status="completed", raw_text="   \n\t  ")
MESSY_WHITESPACE_RESPONSE = ProviderResponse(
    status="completed",
    raw_text="I   recommend\n\nNorthstar\tfor this   use case.",
)
TIMEOUT_RESPONSE = ProviderResponse(status="timeout", raw_text=None, error="request timed out after 30s")
PROVIDER_ERROR_RESPONSE = ProviderResponse(status="failed", raw_text=None, error="rate_limited: HTTP 429")
# A "failed" status with leftover text (e.g. a partial stream before the
# connection dropped) — normalize_response must not resurrect it.
FAILED_WITH_STRAY_TEXT_RESPONSE = ProviderResponse(
    status="failed",
    raw_text="I recommend",
    error="connection reset",
)


class FixtureProvider:
    """A ProviderAdapter test double that always returns one fixed,
    pre-built response, for exercising normalize_response/
    classify_observation/run_scan against a specific failure mode without a
    real network call."""

    def __init__(self, response: ProviderResponse) -> None:
        self._response = response

    def generate(self, *, workspace, prompt, model_id, competitors) -> ProviderResponse:
        return self._response
