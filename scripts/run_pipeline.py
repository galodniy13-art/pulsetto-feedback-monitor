"""Run the MVP mention collection pipeline."""

from __future__ import annotations

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.collector import fetch_reddit_mentions
from app.data_store import save_mentions


def run() -> None:
    mentions = fetch_reddit_mentions(keyword="Pulsetto")
    if not mentions:
        print("[pipeline] No mentions fetched. Nothing to save.")
        return

    inserted_count = save_mentions("data/mentions.csv", mentions)
    print(f"[pipeline] Fetched {len(mentions)} mention(s), saved {inserted_count} new row(s).")


if __name__ == "__main__":
    run()
