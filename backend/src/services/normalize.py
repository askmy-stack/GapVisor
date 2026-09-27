"""Normalization stage between raw provider collection and brand/claim
extraction (vNext plan section 2's "Normalization + Validation" box, and
section 22 Phase G2's "normalized provider adapter interface").

This is deliberately small: collapse whitespace/control characters a real
provider response could contain, and turn a non-"completed" or
empty-after-cleaning response into an explicit failure rather than passing
empty text into the brand/claim parser. It does not attempt anything
provider-specific (e.g. stripping markdown, JSON envelopes) — there is
exactly one provider adapter today (MockProvider) and it never produces
that, so handling it now would be speculative.
"""

from __future__ import annotations

from dataclasses import dataclass

from adapters.providers.base import ProviderResponse, ProviderStatus
from core.config import settings


@dataclass(frozen=True)
class NormalizedResponse:
    status: ProviderStatus
    text: str | None
    error: str | None
    normalizer_version: int


def normalize_response(response: ProviderResponse) -> NormalizedResponse:
    if response.status != "completed":
        return NormalizedResponse(
            status=response.status,
            text=None,
            error=response.error or f"provider status was {response.status!r}",
            normalizer_version=settings.NORMALIZER_VERSION,
        )

    # Collapse internal whitespace/control characters (newlines, tabs,
    # repeated spaces) a real provider response could contain, without
    # altering meaningful punctuation or wording.
    text = " ".join((response.raw_text or "").split())

    if not text:
        return NormalizedResponse(
            status="failed",
            text=None,
            error="empty_after_normalization",
            normalizer_version=settings.NORMALIZER_VERSION,
        )

    return NormalizedResponse(
        status="completed",
        text=text,
        error=None,
        normalizer_version=settings.NORMALIZER_VERSION,
    )
