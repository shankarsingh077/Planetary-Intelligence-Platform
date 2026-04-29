from __future__ import annotations

import html
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime
from typing import Any

LEANING_ORDER = ("left", "center", "right", "unknown")

SOURCE_LEANINGS: dict[str, dict[str, str]] = {
    "reuters": {"bucket": "center", "label": "Center"},
    "reuters world": {"bucket": "center", "label": "Center"},
    "reuters business": {"bucket": "center", "label": "Center"},
    "associated press": {"bucket": "center", "label": "Center"},
    "ap": {"bucket": "center", "label": "Center"},
    "ap top news": {"bucket": "center", "label": "Center"},
    "bbc": {"bucket": "center", "label": "Center"},
    "bbc world": {"bucket": "center", "label": "Center"},
    "france24": {"bucket": "center", "label": "Center"},
    "france 24": {"bucket": "center", "label": "Center"},
    "dw": {"bucket": "center", "label": "Center"},
    "dw news": {"bucket": "center", "label": "Center"},
    "bloomberg": {"bucket": "center", "label": "Center"},
    "bloomberg energy": {"bucket": "center", "label": "Center"},
    "cnbc": {"bucket": "center", "label": "Center"},
    "cnbc markets": {"bucket": "center", "label": "Center"},
    "janes": {"bucket": "center", "label": "Center"},
    "gcaptain": {"bucket": "center", "label": "Center"},
    "maritime executive": {"bucket": "center", "label": "Center"},
    "oilprice com": {"bucket": "center", "label": "Center"},
    "oilprice": {"bucket": "center", "label": "Center"},
    "the record": {"bucket": "center", "label": "Center"},
    "ars technica security": {"bucket": "center", "label": "Center"},
    "al jazeera": {"bucket": "left", "label": "Lean Left"},
    "npr": {"bucket": "left", "label": "Lean Left"},
    "npr world": {"bucket": "left", "label": "Lean Left"},
    "climate home news": {"bucket": "left", "label": "Lean Left"},
    "carbon brief": {"bucket": "left", "label": "Lean Left"},
    "defense one": {"bucket": "left", "label": "Lean Left"},
    "military times": {"bucket": "right", "label": "Lean Right"},
    "the war zone": {"bucket": "right", "label": "Lean Right"},
    "threat post": {"bucket": "right", "label": "Lean Right"},
}

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "been", "by", "for", "from", "has", "have", "in", "into",
    "is", "it", "its", "of", "on", "or", "that", "the", "their", "this", "to", "was", "were", "will", "with",
    "after", "amid", "amidst", "about", "across", "again", "all", "also", "among", "around", "because", "before",
    "being", "between", "both", "but", "could", "during", "each", "even", "few", "into", "last", "made", "make",
    "more", "most", "new", "next", "now", "over", "said", "says", "say", "still", "than", "then", "there",
    "they", "through", "under", "until", "very", "what", "when", "where", "which", "while", "would", "year",
    "years", "day", "days", "week", "weeks", "month", "months", "breaking", "live", "reports", "report", "update",
    "updated", "headline", "story", "stories", "article", "articles", "news", "world", "international",
}

PHRASE_STOPWORDS = {
    "read full article", "subscribe", "image", "published", "updated", "click here", "show more", "show less",
}


def _parse_timestamp(value: str | None) -> float:
    if not value:
        return 0.0

    text = str(value).strip()
    if not text:
        return 0.0

    try:
        return datetime.fromisoformat(text.replace("Z", "+00:00")).timestamp()
    except Exception:
        pass

    try:
        return parsedate_to_datetime(text).timestamp()
    except Exception:
        pass

    return 0.0


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _clean_text(value: str | None) -> str:
    text = html.unescape(str(value or ""))
    text = re.sub(r"<[^>]+>", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _normalize_phrase(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def _tokenize(value: str) -> set[str]:
    tokens: set[str] = set()
    for raw in re.findall(r"[a-z0-9][a-z0-9'-]+", value.lower()):
        token = raw.strip("-'")
        if len(token) < 3 or token in STOPWORDS:
            continue
        if token.endswith("'s"):
            token = token[:-2]
        if token.endswith("ing") and len(token) > 6:
            token = token[:-3]
        elif token.endswith("ed") and len(token) > 5:
            token = token[:-2]
        elif token.endswith("es") and len(token) > 5:
            token = token[:-2]
        elif token.endswith("s") and len(token) > 4:
            token = token[:-1]
        if token and token not in STOPWORDS:
            tokens.add(token)
    return tokens


def _normalize_source(source: str | None) -> str:
    return _normalize_phrase(str(source or ""))


def _source_leaning(source: str | None) -> dict[str, str]:
    normalized = _normalize_source(source)
    if not normalized:
        return {"bucket": "unknown", "label": "Unrated"}

    if normalized in SOURCE_LEANINGS:
        return SOURCE_LEANINGS[normalized]

    for key, value in SOURCE_LEANINGS.items():
        if key in normalized or normalized in key:
            return value

    return {"bucket": "unknown", "label": "Unrated"}


def annotate_articles(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    annotated: list[dict[str, Any]] = []
    for item in articles:
        title = _clean_text(item.get("title"))
        description = _clean_text(item.get("description"))
        source = _clean_text(item.get("source"))
        text = f"{title}. {description}".strip()
        leaning = _source_leaning(source)
        annotated.append({
            "title": title,
            "description": description,
            "link": item.get("link", ""),
            "pubDate": item.get("pubDate", ""),
            "category": item.get("category", ""),
            "source": source or "Unknown",
            "source_leaning": leaning["bucket"],
            "source_leaning_label": leaning["label"],
            "_story_tokens": _tokenize(text),
            "_title_tokens": _tokenize(title),
            "_timestamp": _parse_timestamp(item.get("pubDate")),
        })
    return annotated


def _article_similarity(left: dict[str, Any], right: dict[str, Any]) -> float:
    left_tokens = left.get("_story_tokens", set())
    right_tokens = right.get("_story_tokens", set())
    if not left_tokens or not right_tokens:
        return 0.0

    common = len(left_tokens & right_tokens)
    if common == 0:
        return 0.0

    title_common = len(left.get("_title_tokens", set()) & right.get("_title_tokens", set()))
    shortest = max(1, min(len(left_tokens), len(right_tokens)))
    union = max(1, len(left_tokens | right_tokens))
    return max(common / shortest, common / union, (common + title_common) / max(1, shortest + 2))


def cluster_articles(articles: list[dict[str, Any]]) -> list[list[dict[str, Any]]]:
    ordered = sorted(articles, key=lambda item: item.get("_timestamp", 0.0), reverse=True)
    clusters: list[list[dict[str, Any]]] = []

    for article in ordered:
        best_index = -1
        best_score = 0.0
        for index, cluster in enumerate(clusters):
            score = max(_article_similarity(article, existing) for existing in cluster)
            if score > best_score:
                best_score = score
                best_index = index

        overlap_threshold = 0.42 if len(article.get("_title_tokens", set())) <= 6 else 0.38
        if best_index >= 0 and best_score >= overlap_threshold:
            clusters[best_index].append(article)
        else:
            clusters.append([article])

    clusters.sort(
        key=lambda cluster: (
            len(cluster),
            max(item.get("_timestamp", 0.0) for item in cluster),
        ),
        reverse=True,
    )
    return clusters


def _extract_clauses(article: dict[str, Any]) -> list[str]:
    combined = ". ".join(part for part in [article.get("title"), article.get("description")] if part)
    clauses: list[str] = []
    for raw in re.split(r"[.!?;]|\s[-:]\s|\s[–—]\s", combined):
        clause = _clean_text(raw).strip(" -,:;")
        normalized = _normalize_phrase(clause)
        word_count = len(clause.split())
        if word_count < 4 or word_count > 20:
            continue
        if not normalized or any(stop in normalized for stop in PHRASE_STOPWORDS):
            continue
        clauses.append(clause)
    return clauses


def _build_common_facts(cluster: list[dict[str, Any]]) -> list[str]:
    groups: list[dict[str, Any]] = []

    for article_index, article in enumerate(cluster):
        for clause in _extract_clauses(article):
            tokens = _tokenize(clause)
            if len(tokens) < 3:
                continue

            best_index = -1
            best_score = 0.0
            for index, group in enumerate(groups):
                common = len(tokens & group["tokens"])
                shortest = max(1, min(len(tokens), len(group["tokens"])))
                score = max(common / shortest, common / max(1, len(tokens | group["tokens"])))
                if score > best_score:
                    best_score = score
                    best_index = index

            if best_index >= 0 and best_score >= 0.58:
                group = groups[best_index]
                group["coverage"].add(article_index)
                group["examples"].append(clause)
                if len(clause) < len(group["best"]):
                    group["best"] = clause
            else:
                groups.append({
                    "tokens": tokens,
                    "coverage": {article_index},
                    "examples": [clause],
                    "best": clause,
                })

    facts = [
        group["best"]
        for group in sorted(
            groups,
            key=lambda item: (len(item["coverage"]), len(item["tokens"])),
            reverse=True,
        )
        if len(group["coverage"]) >= 2
    ]

    deduped: list[str] = []
    seen: set[str] = set()
    for fact in facts:
        normalized = _normalize_phrase(fact)
        if not normalized or normalized in seen:
            continue
        seen.add(normalized)
        deduped.append(fact.rstrip(".") + ".")
        if len(deduped) == 3:
            break

    if deduped:
        return deduped

    token_coverage: dict[str, set[int]] = defaultdict(set)
    for article_index, article in enumerate(cluster):
        for token in article.get("_story_tokens", set()):
            token_coverage[token].add(article_index)

    repeated = [token for token, coverage in token_coverage.items() if len(coverage) >= 2]
    repeated.sort(key=lambda token: (len(token_coverage[token]), len(token)), reverse=True)
    if repeated:
        joined = ", ".join(token.replace("-", " ") for token in repeated[:4])
        return [f"Repeated coverage centers on {joined}."]

    return ["Coverage is converging on the same core event, but shared detail is still limited."]


def _build_distribution(cluster: list[dict[str, Any]]) -> dict[str, int]:
    counts = Counter(article.get("source_leaning", "unknown") for article in cluster)
    return {bucket: int(counts.get(bucket, 0)) for bucket in LEANING_ORDER}


def _choose_representative(cluster: list[dict[str, Any]], preferred_bucket: str) -> dict[str, Any]:
    preferred = [article for article in cluster if article.get("source_leaning") == preferred_bucket]
    if preferred:
        return max(preferred, key=lambda item: item.get("_timestamp", 0.0))
    return max(cluster, key=lambda item: item.get("_timestamp", 0.0))


def _build_center_summary(cluster: list[dict[str, Any]], common_facts: list[str]) -> str:
    representative = _choose_representative(cluster, "center")
    title = representative.get("title") or "Coverage is still converging on this story"
    if common_facts:
        return f"{title.rstrip('.')}. Across {len(cluster)} sources, the strongest overlap is: {common_facts[0].rstrip('.') }."
    return f"{title.rstrip('.')}. This cluster is still forming, but multiple outlets are tracking the same core development."


def _build_blindspots(distribution: dict[str, int], source_count: int) -> list[str]:
    blindspots: list[str] = []

    if distribution["left"] == 0:
        blindspots.append("Left-leaning coverage is thin, so humanitarian, accountability, or civil-liberty framing may be underrepresented.")
    if distribution["center"] == 0:
        blindspots.append("Center coverage is thin, so verify details against straight-news wire reporting before treating the summary as settled.")
    if distribution["right"] == 0:
        blindspots.append("Right-leaning coverage is thin, so sovereignty, enforcement, or market-risk framing may be underrepresented.")
    if source_count < 4:
        blindspots.append("This is still a low-volume cluster, so the coverage balance may shift quickly as more outlets join.")
    if distribution["unknown"] >= max(distribution["left"], distribution["center"], distribution["right"], 1):
        blindspots.append("A large share of sources in this cluster are unrated, so the balance bar is directional rather than definitive.")

    if not blindspots:
        blindspots.append("No obvious blindspot yet, but continue checking for regional, sector, or local-source perspectives as coverage expands.")

    return blindspots[:3]


def _build_related_sources(cluster: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, str, str], int] = Counter(
        (
            article.get("source", "Unknown"),
            article.get("source_leaning", "unknown"),
            article.get("source_leaning_label", "Unrated"),
        )
        for article in cluster
    )

    sources = [
        {"source": source, "leaning": bucket, "leaning_label": label, "article_count": count}
        for (source, bucket, label), count in grouped.items()
    ]
    sources.sort(key=lambda item: (item["article_count"], item["source"]), reverse=True)
    return sources[:6]


def _build_related_articles(cluster: list[dict[str, Any]]) -> list[dict[str, Any]]:
    related = [
        {
            "title": article.get("title", ""),
            "source": article.get("source", "Unknown"),
            "link": article.get("link", ""),
            "pubDate": article.get("pubDate", ""),
            "leaning": article.get("source_leaning", "unknown"),
            "leaning_label": article.get("source_leaning_label", "Unrated"),
        }
        for article in sorted(cluster, key=lambda item: item.get("_timestamp", 0.0), reverse=True)
    ]
    return related[:6]


def _cluster_id(cluster: list[dict[str, Any]], index: int) -> str:
    representative = _choose_representative(cluster, "center")
    base = _normalize_phrase(representative.get("title", "")) or f"cluster-{index}"
    slug = "-".join(base.split()[:8]) or f"cluster-{index}"
    return f"{slug}-{index}"


def build_balanced_news_payload(articles: list[dict[str, Any]], region: str | None = None) -> dict[str, Any]:
    annotated = annotate_articles(articles)
    clusters = cluster_articles(annotated)
    cards: list[dict[str, Any]] = []

    for index, cluster in enumerate(clusters):
        if len(cluster) < 2:
            continue

        distribution = _build_distribution(cluster)
        common_facts = _build_common_facts(cluster)
        representative = _choose_representative(cluster, "center")
        cards.append({
            "id": _cluster_id(cluster, index),
            "headline": representative.get("title", "Balanced coverage cluster"),
            "center_summary": _build_center_summary(cluster, common_facts),
            "source_count": len(cluster),
            "distribution": distribution,
            "common_facts": common_facts,
            "blindspots": _build_blindspots(distribution, len(cluster)),
            "related_sources": _build_related_sources(cluster),
            "related_articles": _build_related_articles(cluster),
            "updated_at": datetime.fromtimestamp(
                max(article.get("_timestamp", 0.0) for article in cluster) or 0.0,
                tz=timezone.utc,
            ).isoformat() if cluster else _now_iso(),
        })

    serializable_articles = [
        {
            "title": article.get("title", ""),
            "description": article.get("description", ""),
            "link": article.get("link", ""),
            "pubDate": article.get("pubDate", ""),
            "source": article.get("source", "Unknown"),
            "category": article.get("category", ""),
            "source_leaning": article.get("source_leaning", "unknown"),
            "source_leaning_label": article.get("source_leaning_label", "Unrated"),
        }
        for article in annotated
    ]

    return {
        "region": region or "world",
        "articles": serializable_articles[:18],
        "comparison_cards": cards[:3],
    }
