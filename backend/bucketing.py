"""Deterministic flag bucketing.

Extracted (unchanged) from the inline logic in main.py so it can be reused and
unit-tested. A user's bucket is a sha256-derived value in [0, 1); a user is enabled
for a given fraction when their bucket falls below it. Deterministic per user_id and
uniform across the id space (see test_bucketing.py's chi-square check).
"""
import hashlib

_BUCKETS = 10000


def bucket_value(user_id: str) -> float:
    """Return a deterministic value in [0, 1) for ``user_id``."""
    h = int(hashlib.sha256(user_id.encode()).hexdigest(), 16)
    return (h % _BUCKETS) / float(_BUCKETS)


def is_enabled(user_id: str, fraction: float) -> bool:
    """True when the user's bucket falls within ``fraction`` (0..1)."""
    return bucket_value(user_id) < fraction
