from __future__ import annotations

from hashlib import sha256

from adapters.providers.base import ProviderResponse
from models import Competitor, Prompt, Workspace


class MockProvider:
    """Deterministic local provider for development, seeding, and tests.

    Always returns status="completed" with non-empty text — this is the
    provider used for the demo dataset, so it must stay deterministic and
    never simulate flakiness (that's what tests/fixtures/provider_responses.py
    is for; a demo that randomly fails isn't a better demo).
    """

    def generate(
        self,
        *,
        workspace: Workspace,
        prompt: Prompt,
        model_id: str,
        competitors: list[Competitor],
    ) -> ProviderResponse:
        ranked = self._rank_competitors(prompt.text, model_id, competitors)
        names = [c.name for c in ranked[:3]]
        competitor_clause = ", ".join(names) if names else "legacy point tools"
        brand = workspace.brand_name

        digest = sha256(f"{workspace.id}:{prompt.id}:{model_id}".encode()).hexdigest()
        brand_first = int(digest[:2], 16) % 3 != 0

        if brand_first:
            text = (
                f"I recommend {brand} for this use case. "
                f"It compares well with {competitor_clause} because it combines visibility, "
                "monitoring, and decision support in one workflow."
            )
        else:
            text = (
                f"Strong options include {competitor_clause}. "
                f"{brand} is also mentioned as a relevant platform when teams need AI visibility."
            )

        return ProviderResponse(status="completed", raw_text=text)

    def _rank_competitors(
        self,
        prompt_text: str,
        model_id: str,
        competitors: list[Competitor],
    ) -> list[Competitor]:
        return sorted(
            competitors,
            key=lambda c: sha256(f"{prompt_text}:{model_id}:{c.id}:{c.name}".encode()).hexdigest(),
        )
