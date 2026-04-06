"""Generate weekly summaries from classified mentions."""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path
from typing import Any


def build_weekly_summary(classified_mentions: list[dict[str, str]]) -> dict[str, Any]:
    """Build an MVP summary payload from classified mentions."""
    issue_counts = Counter(row.get("issue_category", "other") or "other" for row in classified_mentions)
    attribute_counts = Counter(row.get("attribute_affected", "other") or "other" for row in classified_mentions)

    negative_mentions = [
        row
        for row in classified_mentions
        if (row.get("sentiment", "") == "negative" or row.get("severity", "") == "high")
    ]

    top_critical_mentions: list[dict[str, str]] = []
    for row in negative_mentions[:5]:
        text = " ".join([row.get("title", ""), row.get("body_text", "")]).strip()
        top_critical_mentions.append(
            {
                "text": text[:220],
                "issue_category": row.get("issue_category", "other"),
                "severity": row.get("severity", "low"),
                "url": row.get("url", ""),
            }
        )

    recommended_actions = [
        "Review all high-severity mentions and respond within 24 hours.",
        "Clarify onboarding steps and troubleshooting in a short quick-start guide.",
        "Create a recurring FAQ update from top issue categories each week.",
    ]

    return {
        "total_mentions": len(classified_mentions),
        "negative_mentions": sum(1 for row in classified_mentions if row.get("sentiment") == "negative"),
        "issue_category_counts": dict(issue_counts),
        "attribute_counts": dict(attribute_counts),
        "top_critical_mentions": top_critical_mentions,
        "recommended_actions": recommended_actions,
    }


def save_weekly_summary(output_path: str, summary: dict[str, Any]) -> None:
    """Persist summary JSON to disk."""
    path = Path(output_path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as json_file:
        json.dump(summary, json_file, indent=2)
        json_file.write("\n")
