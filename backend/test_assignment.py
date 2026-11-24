"""Unit tests for deterministic experiment assignment (experiments/assignment.py).

Pure — no DB. Mirrors test_bucketing.py: proves assignment is deterministic and that the
variant distribution follows each variant's traffic_split.
"""
from types import SimpleNamespace

from experiments.assignment import bucket, variant_for


def V(vid, split):
    return SimpleNamespace(id=vid, name=f"v{vid}", traffic_split=split)


def test_bucket_deterministic_and_in_range():
    for uid in ("u1", "user_42", "ユーザー_7", "x" * 100):
        assert bucket("5", uid) == bucket("5", uid)
        assert 0.0 <= bucket("5", uid) < 1.0


def test_bucket_salt_decorrelates_experiments():
    # The same user buckets differently across experiments (different salts).
    diff = sum(1 for i in range(100) if bucket(str(i), "user_1") != bucket(str(i + 1000), "user_1"))
    assert diff > 90


def test_variant_for_is_deterministic():
    variants = [V(1, 0.5), V(2, 0.5)]
    for uid in ("a", "b", "user_99", "ユーザー"):
        first = variant_for("7", uid, variants).id
        for _ in range(5):
            assert variant_for("7", uid, variants).id == first


def test_variant_for_even_split_is_uniform():
    variants = [V(1, 0.5), V(2, 0.5)]
    n = 20_000
    counts = {1: 0, 2: 0}
    for i in range(n):
        counts[variant_for("exp", f"user_{i}", variants).id] += 1
    expected = n / 2
    chi2 = sum((c - expected) ** 2 / expected for c in counts.values())
    assert chi2 < 10.83, f"non-uniform: chi2={chi2:.2f} counts={counts}"  # 1 dof, p=0.001


def test_variant_for_respects_weights():
    variants = [V(1, 0.8), V(2, 0.2)]
    n = 20_000
    counts = {1: 0, 2: 0}
    for i in range(n):
        counts[variant_for("exp", f"user_{i}", variants).id] += 1
    share = counts[1] / n
    assert 0.77 < share < 0.83, f"expected ~0.80, got {share:.3f}"


def test_variant_for_rounding_guard_when_splits_under_one():
    # Splits sum to < 1.0; a high bucket must still land on a variant (the last).
    variants = [V(1, 0.3), V(2, 0.3)]
    assert all(variant_for("x", f"u{i}", variants) is not None for i in range(300))


def test_variant_for_empty():
    assert variant_for("x", "u", []) is None
