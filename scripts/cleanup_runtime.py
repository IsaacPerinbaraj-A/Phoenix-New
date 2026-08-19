"""Development cleanup: delete uploaded case photos, Grad-CAM heatmaps and
the SQLite case database from backend/runtime/.

Run:
    python scripts/cleanup_runtime.py
"""

import shutil
import sys
from pathlib import Path

RUNTIME = Path(__file__).resolve().parents[1] / "backend" / "runtime"


def main() -> int:
    if not RUNTIME.exists():
        print("Nothing to clean (backend/runtime does not exist).")
        return 0
    shutil.rmtree(RUNTIME)
    print(f"Removed {RUNTIME}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
