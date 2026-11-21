"""Unit tests for the Phase 2 flag-search helper (LIKE wildcard escaping)."""
import crud


def test_escapes_like_wildcards():
    # % and _ are LIKE wildcards; user input must be matched literally.
    assert crud._like_escape("50%_off") == "50\\%\\_off"


def test_escapes_backslash_first():
    assert crud._like_escape("a\\b") == "a\\\\b"


def test_plain_text_unchanged():
    assert crud._like_escape("checkout_v2".replace("_", "")) == "checkoutv2"
    assert crud._like_escape("checkout") == "checkout"
