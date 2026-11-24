"""Regression tests for Phase 2 server-side pagination.

Guards `crud.clamp_pagination` so no list query can request an unbounded set
(limit capped) and offsets stay non-negative.
    cd backend && ../venv/bin/pytest test_pagination.py
"""
import crud


def test_defaults():
    assert crud.clamp_pagination() == (crud.DEFAULT_PAGE_LIMIT, 0)


def test_limit_capped_at_max():
    limit, offset = crud.clamp_pagination(limit=10_000_000, offset=0)
    assert limit == crud.MAX_PAGE_LIMIT
    assert limit <= crud.MAX_PAGE_LIMIT


def test_limit_floor_is_one():
    assert crud.clamp_pagination(limit=0)[0] == 1
    assert crud.clamp_pagination(limit=-5)[0] == 1


def test_none_limit_uses_default():
    assert crud.clamp_pagination(limit=None)[0] == crud.DEFAULT_PAGE_LIMIT


def test_negative_offset_clamped():
    assert crud.clamp_pagination(limit=50, offset=-10)[1] == 0


def test_passthrough_within_bounds():
    assert crud.clamp_pagination(limit=25, offset=75) == (25, 75)
