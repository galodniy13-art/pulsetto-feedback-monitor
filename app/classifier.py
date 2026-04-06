"""Classify collected mentions by sentiment and issue theme."""

from __future__ import annotations

from typing import TypedDict


class ClassifiedMention(TypedDict):
    """Mention row enriched with deterministic issue classification."""

    title: str
    body_text: str
    subreddit: str
    author: str
    created_date: str
    url: str
    source: str
    sentiment: str
    issue_category: str
    severity: str
    attribute_affected: str


ISSUE_RULES: list[tuple[str, str, str, tuple[str, ...]]] = [
    (
        "support_silence",
        "support",
        "high",
        ("support", "no response", "ignored", "ghosted", "ticket", "customer service"),
    ),
    (
        "effectiveness_doubt",
        "product",
        "high",
        ("doesn't work", "doesnt work", "not working", "ineffective", "no effect", "placebo"),
    ),
    (
        "onboarding_confusion",
        "onboarding",
        "medium",
        ("setup", "onboarding", "instructions", "how do i", "confusing", "pairing"),
    ),
    (
        "comfort_wearability",
        "comfort",
        "medium",
        ("uncomfortable", "comfort", "pain", "hurts", "tight", "wear"),
    ),
    (
        "price_value",
        "price",
        "medium",
        ("expensive", "price", "cost", "overpriced", "value", "refund"),
    ),
    (
        "trust_credibility",
        "trust",
        "high",
        ("scam", "fake", "misleading", "trust", "credible", "suspicious"),
    ),
]

POSITIVE_KEYWORDS = (
    "great",
    "good",
    "love",
    "helpful",
    "works",
    "better",
    "recommend",
)

NEGATIVE_KEYWORDS = (
    "bad",
    "terrible",
    "awful",
    "broken",
    "issue",
    "problem",
    "disappointed",
    "hate",
)


def _combine_text(mention: dict[str, str]) -> str:
    """Build a lowercase text blob from available mention fields."""
    title = str(mention.get("title", "") or "")
    body = str(mention.get("body_text", "") or "")
    if not title and not body:
        body = str(mention.get("text", "") or "")
    return f"{title} {body}".strip().lower()


def classify_mention(mention: dict[str, str]) -> ClassifiedMention:
    """Classify one mention with deterministic keyword matching."""
    combined_text = _combine_text(mention)

    positive_hit = any(keyword in combined_text for keyword in POSITIVE_KEYWORDS)
    negative_hit = any(keyword in combined_text for keyword in NEGATIVE_KEYWORDS)

    if positive_hit and negative_hit:
        sentiment = "mixed"
    elif negative_hit:
        sentiment = "negative"
    elif positive_hit:
        sentiment = "positive"
    else:
        sentiment = "mixed"

    issue_category = "other"
    attribute_affected = "other"
    severity = "low"

    for category, attribute, default_severity, keywords in ISSUE_RULES:
        if any(keyword in combined_text for keyword in keywords):
            issue_category = category
            attribute_affected = attribute
            severity = default_severity
            break

    if sentiment == "negative" and severity == "low":
        severity = "medium"

    return {
        "title": str(mention.get("title", "") or ""),
        "body_text": str(mention.get("body_text", mention.get("text", "")) or ""),
        "subreddit": str(mention.get("subreddit", "") or ""),
        "author": str(mention.get("author", "") or ""),
        "created_date": str(mention.get("created_date", mention.get("timestamp", "")) or ""),
        "url": str(mention.get("url", "") or ""),
        "source": str(mention.get("source", "") or ""),
        "sentiment": sentiment,
        "issue_category": issue_category,
        "severity": severity,
        "attribute_affected": attribute_affected,
    }


def classify_mentions(mentions: list[dict[str, str]]) -> list[ClassifiedMention]:
    """Classify multiple mentions."""
    return [classify_mention(mention) for mention in mentions]
