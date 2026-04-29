from __future__ import annotations

import unittest

from triage_api.news_balance import build_balanced_news_payload


class TestNewsBalance(unittest.TestCase):
    def test_builds_balanced_comparison_card_from_clustered_articles(self) -> None:
        articles = [
            {
                "title": "Strait of Hormuz shipping risk rises as insurers reassess exposure",
                "description": "Multiple tankers slow transit after Iran-linked closure warning drives new insurance checks.",
                "source": "Reuters World",
                "link": "https://example.com/reuters-hormuz",
                "pubDate": "2026-04-19T10:00:00+00:00",
                "category": "world",
            },
            {
                "title": "Hormuz transit fears build after closure warning and tanker slowdown",
                "description": "Shipping firms review tanker routes and insurers reprice risk after the warning.",
                "source": "BBC World",
                "link": "https://example.com/bbc-hormuz",
                "pubDate": "2026-04-19T10:05:00+00:00",
                "category": "world",
            },
            {
                "title": "Insurers and shippers brace for Strait of Hormuz disruption",
                "description": "Regional warning pushes insurers and tanker operators to revisit exposure and routing.",
                "source": "Al Jazeera",
                "link": "https://example.com/aj-hormuz",
                "pubDate": "2026-04-19T10:08:00+00:00",
                "category": "world",
            },
            {
                "title": "Military planners watch Hormuz as shipping firms revisit tanker routes",
                "description": "The closure warning puts maritime traffic and insurer assumptions under pressure.",
                "source": "Military Times",
                "link": "https://example.com/mt-hormuz",
                "pubDate": "2026-04-19T10:12:00+00:00",
                "category": "world",
            },
            {
                "title": "European gas benchmark drifts lower on warm-weather demand outlook",
                "description": "A separate market story unrelated to the Hormuz cluster.",
                "source": "Bloomberg Energy",
                "link": "https://example.com/bbg-gas",
                "pubDate": "2026-04-19T09:00:00+00:00",
                "category": "energy",
            },
        ]

        payload = build_balanced_news_payload(articles, region="world")

        self.assertEqual(payload["region"], "world")
        self.assertGreaterEqual(len(payload["articles"]), 5)
        self.assertGreaterEqual(len(payload["comparison_cards"]), 1)

        card = payload["comparison_cards"][0]
        self.assertIn("center_summary", card)
        self.assertGreaterEqual(int(card["source_count"]), 4)
        self.assertEqual(card["distribution"]["left"], 1)
        self.assertEqual(card["distribution"]["center"], 2)
        self.assertEqual(card["distribution"]["right"], 1)
        self.assertGreaterEqual(len(card["common_facts"]), 1)
        self.assertGreaterEqual(len(card["blindspots"]), 1)


if __name__ == "__main__":
    unittest.main()
