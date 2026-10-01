"""Compatibility entry point for the current material optimizer."""
import runpy
from pathlib import Path
runpy.run_path(str(Path(__file__).with_name('optimize-materials.py')),run_name='__main__')
