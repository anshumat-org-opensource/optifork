"""Ensure the backend package dir is importable as top-level modules in tests.

The app imports its siblings as top-level modules (`import crud`, `from models import ...`),
matching how it runs under uvicorn with WORKDIR=/app. Put this dir on sys.path so tests
resolve those the same way.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
