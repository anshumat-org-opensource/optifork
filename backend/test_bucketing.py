"""Phase 2 bucketing targets: deterministic + uniform.

- Deterministic: same user_id always buckets the same.
- Uniform: bucket values spread evenly across [0, 1) — checked with a chi-square
  goodness-of-fit test over N simulated users (default 1,000,000; set BUCKET_N to run
  the full 10,000,000 from goal.md). 10 equal bins, 9 dof; the 0.1%% critical value is
  27.88, so we fail only on a clearly non-uniform distribution.
"""
import os

import bucketing


def test_deterministic():
    for uid in ("user_1", "ユーザー_42", "loaduser_999999", "x" * 200):
        assert bucketing.bucket_value(uid) == bucketing.bucket_value(uid)


def test_in_unit_range():
    for uid in ("a", "b", "c", "user_12345"):
        v = bucketing.bucket_value(uid)
        assert 0.0 <= v < 1.0


def test_is_enabled_bounds():
    # fraction 0 -> nobody; fraction 1 -> everybody
    assert bucketing.is_enabled("anyone", 0.0) is False
    assert bucketing.is_enabled("anyone", 1.0) is True


def test_uniform_chi_square():
    n = int(os.getenv("BUCKET_N", "1000000"))
    bins = 10
    counts = [0] * bins
    for i in range(n):
        v = bucketing.bucket_value(f"user_{i}")
        idx = min(int(v * bins), bins - 1)
        counts[idx] += 1
    expected = n / bins
    chi2 = sum((c - expected) ** 2 / expected for c in counts)
    # 9 dof, p=0.001 critical ~ 27.88. A fair hash lands well under this.
    assert chi2 < 27.88, f"non-uniform bucketing: chi2={chi2:.2f}, counts={counts}"
