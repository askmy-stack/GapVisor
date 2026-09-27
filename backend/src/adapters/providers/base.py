"""Provider adapter contract (vNext plan section 8: "treat provider APIs as
unreliable external systems").

`ProviderAdapter.generate` returns a `ProviderResponse` rather than a bare
string so a real provider integration can represent failure explicitly
(timeout, error, empty response) instead of the caller having to assume
every call succeeds. `services/scan.py` handles all three `status` values;
see `services/normalize.py` for what happens to each one next.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, Protocol

from models import Competitor, Prompt, Workspace

ProviderStatus = Literal["completed", "failed", "timeout"]


@dataclass(frozen=True)
class ProviderResponse:
    status: ProviderStatus
    raw_text: str | None = None
    error: str | None = None


class ProviderAdapter(Protocol):
    def generate(
        self,
        *,
        workspace: Workspace,
        prompt: Prompt,
        model_id: str,
        competitors: list[Competitor],
    ) -> ProviderResponse:
        """Return one provider response for one prompt/model sample."""
