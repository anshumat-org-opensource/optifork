"""Deterministic experiment variant assignment.

Mirrors flag rollout bucketing (backend/bucketing.py): a variant is chosen from a sha256
hash of the user id, salted per experiment, mapped onto the variants' cumulative
`traffic_split`. Pure and reproducible — the same (salt, user_id) always yields the same
variant, with no RNG and no database round-trip needed for stickiness.
"""
import hashlib

_BUCKETS = 10_000


def bucket(salt: str, user_id: str) -> float:
    """Deterministic value in [0, 1) for (salt, user_id)."""
    h = int(hashlib.sha256(f"{salt}:{user_id}".encode()).hexdigest(), 16)
    return (h % _BUCKETS) / float(_BUCKETS)


def variant_for(salt: str, user_id: str, variants):
    """Pick a variant by cumulative traffic_split using a deterministic bucket.

    `variants` should be in a stable order (e.g. by id) so the cumulative split is stable.
    Returns the last variant as a rounding guard if the splits don't reach the bucket value
    (e.g. they sum to slightly under 1.0). Returns None for an empty variant list.
    """
    if not variants:
        return None
    b = bucket(salt, user_id)
    acc = 0.0
    for v in variants:
        acc += v.traffic_split
        if b < acc:
            return v
    return variants[-1]
