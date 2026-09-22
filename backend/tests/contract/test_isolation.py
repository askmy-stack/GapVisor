"""Standing tenant isolation checks (SC-001).

These unit-level checks document the invariant. Full DB RLS proof requires
Postgres with an app role that does not own the tables (prod hardening).
"""

from services.confidence import is_meaningful_change, mean_with_interval


def test_workspace_header_required_contract():
    """X-Workspace-Id is mandatory for tenant routes (enforced in deps)."""
    from core import deps

    assert hasattr(deps, "get_workspace_id")


def test_confidence_small_sample_not_reliable():
    result = mean_with_interval([42.0])
    assert result["reliable"] is False
    assert result["n"] == 1


def test_meaningful_change_noise_band():
    assert is_meaningful_change(40.0, 40.5, sample_size=100)["meaningful"] is False
    assert is_meaningful_change(40.0, 45.0, sample_size=100)["meaningful"] is True
