"""Pre-demo health check: verifies every component the demo relies on.

Run with the backend up:
    python scripts/demo_healthcheck.py [--api http://localhost:8000]
"""

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
WEIGHTS = REPO_ROOT / "backend" / "models" / "weights"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--api", default="http://localhost:8000")
    args = parser.parse_args()

    ok = True

    print("== Local files ==")
    for name in ("effnet_b0_ham10000.pt", "xgb_history.json"):
        exists = (WEIGHTS / name).exists()
        print(f"  {name}: {'present' if exists else 'MISSING (agent degrades safely)'}")

    print("== Backend ==")
    try:
        import requests

        resp = requests.get(f"{args.api}/api/health", timeout=5)
        health = resp.json()
        print(json.dumps(health, indent=2))
        if not health.get("safety"):
            print("  SAFETY UNAVAILABLE — do not demo.")
            ok = False
        for component in ("ollama", "vision_model", "history_model"):
            if not health.get(component):
                print(
                    f"  note: {component} unavailable — the app degrades "
                    "safely, but the full demo path needs it."
                )
    except Exception as exc:
        print(f"  Backend unreachable at {args.api}: {exc}")
        ok = False

    print("PASS" if ok else "FAIL")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
