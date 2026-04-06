"""Read and write feedback monitor mention data."""

from __future__ import annotations

import csv
from pathlib import Path

MENTIONS_COLUMNS = [
    "title",
    "body_text",
    "subreddit",
    "author",
    "created_date",
    "url",
    "source",
]


def _normalize_row(row: dict[str, str]) -> dict[str, str]:
    """Return a row containing expected columns with safe string values."""
    normalized: dict[str, str] = {}
    for column in MENTIONS_COLUMNS:
        value = row.get(column, "")
        normalized[column] = "" if value is None else str(value).strip()
    return normalized


def load_mentions(csv_path: str) -> list[dict[str, str]]:
    """Load mention rows from CSV if it exists."""
    path = Path(csv_path)
    if not path.exists():
        return []

    with path.open("r", newline="", encoding="utf-8") as csv_file:
        reader = csv.DictReader(csv_file)
        return [_normalize_row(row) for row in reader]


def save_mentions(csv_path: str, incoming_rows: list[dict[str, str]]) -> int:
    """Append new unique rows into the CSV and return inserted count.

    Rows are deduplicated by URL against existing records and within incoming_rows.
    """
    path = Path(csv_path)
    path.parent.mkdir(parents=True, exist_ok=True)

    existing_rows = load_mentions(str(path))
    seen_urls = {row.get("url", "") for row in existing_rows if row.get("url")}
    final_rows = list(existing_rows)

    inserted = 0
    for row in incoming_rows:
        normalized = _normalize_row(row)
        url = normalized["url"]

        if not url or url in seen_urls:
            continue

        seen_urls.add(url)
        final_rows.append(normalized)
        inserted += 1

    with path.open("w", newline="", encoding="utf-8") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=MENTIONS_COLUMNS)
        writer.writeheader()
        writer.writerows(final_rows)

    return inserted
