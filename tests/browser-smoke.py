"""Canonical smoke-test entry point; use the current interaction suite."""
from pathlib import Path
import runpy
runpy.run_path(str(Path(__file__).with_name('worldcup-smoke.py')),run_name='__main__')
