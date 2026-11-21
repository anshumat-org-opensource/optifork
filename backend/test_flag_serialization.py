"""Regression test for the Phase 2 segfault fix.

Root cause: `GET /flags` returned raw SQLAlchemy ORM objects to FastAPI's encoder;
under concurrency that segfaulted the worker (SIGSEGV / exit 139). Fix: serialize to
plain dicts via `crud.serialize_flag`. This test locks that contract in — it fails if
anyone reverts the endpoint to emitting ORM instances.

Runs with no DB/server: FeatureFlag/Rule are instantiated in memory.
    cd backend && ../venv/bin/pytest test_flag_serialization.py
"""
import json

import crud
from models import FeatureFlag, Rule


def _make_flag():
    flag = FeatureFlag(id=1, name="checkout_v2", description="desc", rollout=0.25)
    flag.rules = [
        Rule(field="country", op="eq", value="US"),
        Rule(field="plan", op="ne", value="free"),
    ]
    return flag


def test_serialize_flag_returns_plain_dict_not_orm():
    out = crud.serialize_flag(_make_flag())
    assert type(out) is dict                       # a plain dict...
    assert not isinstance(out, FeatureFlag)        # ...never the ORM instance
    assert set(out) == {"id", "name", "description", "rollout", "rules"}
    assert out["id"] == 1 and out["rollout"] == 0.25


def test_serialize_flag_rules_are_plain_dicts():
    out = crud.serialize_flag(_make_flag())
    assert isinstance(out["rules"], list)
    assert all(type(r) is dict for r in out["rules"])
    assert not any(isinstance(r, Rule) for r in out["rules"])
    assert out["rules"][0] == {"field": "country", "op": "eq", "value": "US"}


def test_serialized_flag_is_json_safe():
    # Must round-trip through json without hitting any SQLAlchemy/ORM object.
    flag = FeatureFlag(id=2, name="y", description=None, rollout=1.0)
    flag.rules = []
    json.dumps(crud.serialize_flag(flag))  # raises if anything non-serializable leaks
