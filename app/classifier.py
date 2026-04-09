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


ISSUE_TO_ATTRIBUTE: dict[str, str] = {
    "support_silence": "support",
    "poor_support_quality": "support",
    "no_results": "product",
    "weak_results": "product",
    "onboarding_confusion": "onboarding",
    "app_connectivity": "technical",
    "comfort_fit": "comfort",
    "price_value_mismatch": "price",
    "trust_skepticism": "trust",
    "scientific_credibility": "trust",
    "delivery_logistics": "delivery",
    "pre_purchase_question": "discovery",
    "usage_question": "onboarding",
    "general_awareness": "discovery",
    "experience_sharing": "engagement",
    "recommendation_seeking": "discovery",
    "positive_advocacy": "advocacy",
    "competitor_comparison": "competition",
    "other": "other",
}

CATEGORY_DEFAULT_SEVERITY: dict[str, str] = {
    "support_silence": "high",
    "poor_support_quality": "high",
    "no_results": "high",
    "weak_results": "medium",
    "onboarding_confusion": "medium",
    "app_connectivity": "medium",
    "comfort_fit": "medium",
    "price_value_mismatch": "medium",
    "trust_skepticism": "high",
    "scientific_credibility": "medium",
    "delivery_logistics": "medium",
    "pre_purchase_question": "low",
    "usage_question": "low",
    "general_awareness": "low",
    "experience_sharing": "low",
    "recommendation_seeking": "low",
    "positive_advocacy": "low",
    "competitor_comparison": "medium",
    "other": "low",
}

CATEGORY_RULES: list[dict[str, object]] = [
    {
        "category": "support_silence",
        "all_of": (("support", "customer support", "team", "ticket", "email", "help desk"), ("no reply", "no response", "ignored", "ghosted", "never heard", "still waiting", "unanswered", "radio silence")),
        "any_of": (),
    },
    {
        "category": "poor_support_quality",
        "all_of": (("support", "agent", "customer service", "help desk", "ticket"), ("useless", "rude", "scripted", "generic", "not helpful", "didn't help", "did not help", "unhelpful", "slow", "frustrating")),
        "any_of": (),
    },
    {
        "category": "no_results",
        "all_of": (("result", "results", "effect", "benefit", "improvement", "change", "sleep", "stress", "anxiety"), ("no", "none", "zero", "nothing", "didn't", "did not", "never", "without")),
        "any_of": ("doesn't work", "doesnt work", "didn't work", "did not work", "not working", "no effect", "no results", "zero results", "nothing changed", "placebo"),
    },
    {
        "category": "weak_results",
        "all_of": (("result", "results", "effect", "benefit", "improvement"), ("slight", "small", "minimal", "weak", "barely", "inconsistent", "temporary")),
        "any_of": ("works sometimes", "mixed results", "not strong", "underwhelming", "expected more"),
    },
    {
        "category": "onboarding_confusion",
        "all_of": (("setup", "onboarding", "instruction", "instructions", "manual", "pair"), ("confusing", "unclear", "can't", "cannot", "how do i", "stuck", "difficult")),
        "any_of": ("getting started", "first time setup", "pairing issue", "how to use", "which mode"),
    },
    {
        "category": "app_connectivity",
        "all_of": (("app", "bluetooth", "pair", "connection", "connect", "firmware", "sync"), ("fail", "failed", "disconnect", "not connect", "won't connect", "keeps dropping", "bug", "crash")),
        "any_of": ("app not working", "cannot connect", "can't connect", "connection issue", "bluetooth issue", "sync issue"),
    },
    {
        "category": "comfort_fit",
        "all_of": (("wear", "neck", "fit", "strap", "device"), ("uncomfortable", "tight", "pain", "hurts", "itch", "pressure", "too loose", "too tight")),
        "any_of": ("hard to wear", "not comfortable", "comfort issue"),
    },
    {
        "category": "price_value_mismatch",
        "all_of": (("price", "cost", "expensive", "pricing", "refund", "money"), ("worth", "value", "overpriced", "too much", "not worth", "waste")),
        "any_of": ("not worth it", "too expensive", "overpriced", "value for money"),
    },
    {
        "category": "trust_skepticism",
        "all_of": (("trust", "legit", "legitimate", "company", "brand"), ("scam", "fake", "suspicious", "misleading", "dishonest", "sketchy")),
        "any_of": ("is this a scam", "too good to be true", "fake reviews", "don't trust"),
    },
    {
        "category": "scientific_credibility",
        "all_of": (("science", "scientific", "study", "evidence", "research", "clinical"), ("proof", "proven", "credible", "skeptical", "unsupported", "pseudoscience")),
        "any_of": ("where is the evidence", "any studies", "clinical proof", "peer reviewed"),
    },
    {
        "category": "delivery_logistics",
        "all_of": (("shipping", "delivery", "shipment", "order", "tracking", "customs"), ("late", "delay", "lost", "damaged", "stuck", "never arrived")),
        "any_of": ("shipping delay", "delivery issue", "order not arrived", "tracking not updated"),
    },
    {
        "category": "competitor_comparison",
        "all_of": (("vs", "versus", "compared", "alternative", "better than", "instead of"), ("pulsetto", "sensate", "apollo", "calm", "nurosym")),
        "any_of": ("any alternatives", "competitor", "competing product", "is x better"),
    },
    {
        "category": "pre_purchase_question",
        "all_of": (
            ("buy", "buying", "purchase", "thinking of buying", "considering", "before i buy", "worth it"),
            ("?", "anyone", "does it work", "is it worth it", "worth buying", "should i"),
        ),
        "any_of": ("does it work", "is it worth it", "thinking of buying", "before i buy", "worth buying"),
    },
    {
        "category": "recommendation_seeking",
        "all_of": (
            ("anyone", "anyone tried", "recommend", "recommendation", "feedback", "opinions", "review"),
        ),
        "any_of": ("anyone tried", "would you recommend", "looking for feedback", "any reviews", "worth it?"),
    },
    {
        "category": "usage_question",
        "all_of": (
            ("how", "how do i", "how long", "how often", "what mode", "when should", "can i use"),
            ("use", "using", "session", "mode", "daily", "routine", "frequency"),
        ),
        "any_of": ("how do i use", "how long should", "how often should", "what mode", "can i use it"),
    },
    {
        "category": "general_awareness",
        "all_of": (("heard about", "saw this", "what is this", "what is pulsetto", "came across", "anyone know"),),
        "any_of": ("heard about", "saw this", "what is this"),
    },
    {
        "category": "experience_sharing",
        "all_of": (
            ("my experience", "i've been using", "i have been using", "after two weeks", "for me personally", "in my case"),
        ),
        "any_of": ("my experience", "after two weeks", "for me personally"),
    },
    {
        "category": "positive_advocacy",
        "all_of": (("love", "great", "helped", "works", "worked", "recommend", "impressed", "happy"),),
        "any_of": ("highly recommend", "worth it", "game changer", "really helped", "good experience"),
    },
]

POSITIVE_KEYWORDS = (
    "great",
    "good",
    "love",
    "helpful",
    "works",
    "worked",
    "better",
    "recommend",
    "improved",
    "happy",
    "satisfied",
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
    "frustrating",
    "scam",
    "useless",
    "not working",
)

HIGH_INTENSITY_KEYWORDS = (
    "scam",
    "fraud",
    "never",
    "useless",
    "angry",
    "furious",
    "waste of money",
    "chargeback",
    "legal",
)


def _combine_text(mention: dict[str, str]) -> str:
    """Build a lowercase text blob from available mention fields."""
    title = str(mention.get("title", "") or "")
    body = str(mention.get("body_text", "") or "")
    if not title and not body:
        body = str(mention.get("text", "") or "")
    return f"{title} {body}".strip().lower()


def _rule_matches(combined_text: str, rule: dict[str, object]) -> bool:
    all_of_groups = rule.get("all_of", ())
    any_of_patterns = rule.get("any_of", ())

    for group in all_of_groups:
        if not any(token in combined_text for token in group):
            return False

    if any_of_patterns and any(pattern in combined_text for pattern in any_of_patterns):
        return True

    return bool(all_of_groups)


def _secondary_pass_category(combined_text: str, sentiment: str) -> str | None:
    """Use broad phrase combinations before falling back to `other`."""
    if any(token in combined_text for token in ("compared to", " vs ", "versus", "better than", "instead of", "alternative to")):
        return "competitor_comparison"

    if any(token in combined_text for token in ("does it work", "is it worth it", "thinking of buying", "before i buy", "worth buying")):
        return "pre_purchase_question"

    if any(token in combined_text for token in ("anyone tried", "would you recommend", "recommendation", "looking for feedback", "any review")):
        return "recommendation_seeking"

    if any(token in combined_text for token in ("how do i use", "how long", "how often", "what mode", "setup", "getting started")):
        if any(token in combined_text for token in ("confusing", "unclear", "stuck", "can't figure", "cannot figure")):
            return "onboarding_confusion"
        return "usage_question"

    if any(token in combined_text for token in ("heard about", "saw this", "what is this", "what is pulsetto", "came across")):
        return "general_awareness"

    if any(token in combined_text for token in ("my experience", "i've been using", "i have been using", "after two weeks", "for me personally", "in my case")):
        return "experience_sharing"

    if any(token in combined_text for token in ("support", "ticket", "customer service", "reply")):
        if any(token in combined_text for token in ("no", "never", "waiting", "ignored", "ghosted", "unanswered")):
            return "support_silence"
        if sentiment == "negative":
            return "poor_support_quality"

    if any(token in combined_text for token in ("result", "effect", "benefit", "improvement", "work")):
        if any(token in combined_text for token in ("no", "none", "nothing", "didn't", "did not", "never", "zero")):
            return "no_results"
        if sentiment in ("mixed", "negative"):
            return "weak_results"

    if any(token in combined_text for token in ("connect", "connection", "bluetooth", "app", "sync", "pair")):
        if any(token in combined_text for token in ("can't", "cannot", "failed", "drop", "bug", "crash", "not")):
            return "app_connectivity"

    if any(token in combined_text for token in ("setup", "onboard", "instruction", "how do i", "first time")):
        return "onboarding_confusion"

    if any(token in combined_text for token in ("delivery", "shipping", "shipment", "tracking", "order")):
        return "delivery_logistics"

    if any(token in combined_text for token in ("scam", "fake", "misleading", "suspicious")):
        return "trust_skepticism"

    if any(token in combined_text for token in ("science", "study", "evidence", "research", "clinical")):
        return "scientific_credibility"

    if any(token in combined_text for token in ("vs", "versus", "alternative", "better than", "instead of")):
        return "competitor_comparison"

    if sentiment == "positive":
        return "positive_advocacy"

    return None


def _derive_sentiment(combined_text: str) -> str:
    positive_hits = sum(1 for keyword in POSITIVE_KEYWORDS if keyword in combined_text)
    negative_hits = sum(1 for keyword in NEGATIVE_KEYWORDS if keyword in combined_text)

    if "not worth" in combined_text or "not working" in combined_text or "no response" in combined_text:
        negative_hits += 1

    if positive_hits > 0 and negative_hits > 0:
        return "mixed"
    if negative_hits > 0:
        return "negative"
    if positive_hits > 0:
        return "positive"
    return "neutral"


def _derive_severity(combined_text: str, category: str, sentiment: str) -> str:
    severity_rank = {"low": 0, "medium": 1, "high": 2, "critical": 3}
    severity = CATEGORY_DEFAULT_SEVERITY.get(category, "low")

    if sentiment == "negative" and severity_rank[severity] < severity_rank["medium"]:
        severity = "medium"

    if any(token in combined_text for token in HIGH_INTENSITY_KEYWORDS):
        if severity_rank[severity] < severity_rank["high"]:
            severity = "high"

    if category in {"support_silence", "no_results", "trust_skepticism"} and any(
        token in combined_text for token in ("months", "chargeback", "never again", "fraud", "report")
    ):
        severity = "critical"

    if category in {"positive_advocacy", "pre_purchase_question", "recommendation_seeking", "general_awareness", "experience_sharing", "usage_question"}:
        return "low"

    return severity


def classify_mention(mention: dict[str, str]) -> ClassifiedMention:
    """Classify one mention with deterministic keyword matching."""
    combined_text = _combine_text(mention)
    sentiment = _derive_sentiment(combined_text)

    category = None
    for rule in CATEGORY_RULES:
        if _rule_matches(combined_text, rule):
            category = str(rule["category"])
            break

    if category is None:
        category = _secondary_pass_category(combined_text, sentiment)

    if category is None:
        category = "other"

    severity = _derive_severity(combined_text, category, sentiment)

    return {
        "title": str(mention.get("title", "") or ""),
        "body_text": str(mention.get("body_text", mention.get("text", "")) or ""),
        "subreddit": str(mention.get("subreddit", "") or ""),
        "author": str(mention.get("author", "") or ""),
        "created_date": str(mention.get("created_date", mention.get("timestamp", "")) or ""),
        "url": str(mention.get("url", "") or ""),
        "source": str(mention.get("source", "") or ""),
        "sentiment": sentiment,
        "issue_category": category,
        "severity": severity,
        "attribute_affected": ISSUE_TO_ATTRIBUTE.get(category, "other"),
    }


def classify_mentions(mentions: list[dict[str, str]]) -> list[ClassifiedMention]:
    """Classify multiple mentions."""
    return [classify_mention(mention) for mention in mentions]
