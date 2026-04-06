"""Collect public Reddit mentions for a keyword."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

REDDIT_SEARCH_URL = "https://www.reddit.com/search.json"


def _safe_text(value: Any) -> str:
    """Normalize nullable text-like values to a clean string."""
    if value is None:
        return ""
    return str(value).strip()


def fetch_reddit_mentions(keyword: str = "Pulsetto", limit: int = 100) -> list[dict[str, str]]:
    """Fetch Reddit posts that mention the given keyword."""
    user_agent = os.getenv("REDDIT_USER_AGENT", "PulsettoFeedbackMonitor/0.1")
    query = urlencode({"q": keyword, "sort": "new", "limit": str(limit), "type": "link"})
    request = Request(f"{REDDIT_SEARCH_URL}?{query}", headers={"User-Agent": user_agent})

    try:
        with urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        print(f"[collector] Failed to fetch Reddit mentions: {exc}")
        return []

    mentions: list[dict[str, str]] = []
    posts = payload.get("data", {}).get("children", [])

    for post in posts:
        data = post.get("data", {})
        permalink = _safe_text(data.get("permalink"))
        external_url = _safe_text(data.get("url"))
        url = f"https://www.reddit.com{permalink}" if permalink else external_url

        created_date = ""
        created_utc = data.get("created_utc")
        if created_utc is not None:
            try:
                created_date = datetime.fromtimestamp(float(created_utc), tz=timezone.utc).isoformat()
            except (TypeError, ValueError, OSError):
                created_date = ""

        mentions.append(
            {
                "title": _safe_text(data.get("title")),
                "body_text": _safe_text(data.get("selftext")),
                "subreddit": _safe_text(data.get("subreddit")),
                "author": _safe_text(data.get("author")),
                "created_date": created_date,
                "url": _safe_text(url),
                "source": "reddit",
            }
        )

    return mentions
