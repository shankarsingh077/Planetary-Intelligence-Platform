"""
Cascade Intelligence Engine — Supply Chain Knowledge Graph + Cascade Simulation

A causal intelligence system that:
- Models global supply chain dependencies as a directed weighted graph
- Simulates cascade effects when events disrupt nodes
- Produces structured risk predictions with time horizons

Graph Structure:
  Nodes: Countries, Chokepoints, Commodities, Infrastructure, Sectors
  Edges: Dependencies with weights (0-1) representing coupling strength
"""

import re
import networkx as nx
from collections import deque
from typing import Any

# ── Node categories ────────────────────────────────────────────────
NODE_TYPES = {
    "country": "🌍",
    "chokepoint": "⚓",
    "commodity": "📦",
    "infrastructure": "🏭",
    "sector": "📊",
    "port": "🚢",
    "company": "🏢",
    "index": "📈",
}

NODE_MATCH_STOPWORDS = {
    "global",
    "industry",
    "supply",
    "chain",
    "port",
    "prices",
    "price",
    "rates",
    "sector",
}

STRATEGIC_NODE_TYPES = {"commodity", "chokepoint", "sector", "port", "company", "index", "infrastructure"}
STRATEGIC_ALERT_CATEGORIES = {"conflict", "energy", "maritime", "economic", "finance", "trade", "weather", "cyber"}

ALERT_NODE_ALIASES = {
    "hormuz": "Strait of Hormuz",
    "red sea": "Bab el-Mandeb",
    "houthi": "Bab el-Mandeb",
    "suez": "Suez Canal",
    "panama canal": "Panama Canal",
    "panama": "Panama Canal",
    "malacca": "Malacca Strait",
    "taiwan strait": "Taiwan Strait",
    "turkish straits": "Turkish Straits",
    "gibraltar": "Strait of Gibraltar",
    "lng": "LNG",
    "lpg": "LPG",
    "oil": "Crude Oil",
    "crude": "Crude Oil",
    "natural gas": "Natural Gas",
    "gas prices": "Gas Prices",
    "oil prices": "Oil Prices",
    "freight": "Global Shipping",
    "tanker": "Global Shipping",
    "container": "Global Shipping",
    "semiconductor": "Semiconductors",
    "semiconductors": "Semiconductors",
    "chip": "Semiconductors",
    "chips": "Semiconductors",
    "rare earth": "Rare Earth Minerals",
    "food prices": "Food Price Index",
    "shipping rates": "Shipping Rates (BDI)",
    "bdi": "Shipping Rates (BDI)",
    "inflation": "Global Inflation",
    "dollar": "US Dollar Index",
    "diesel": "Diesel Prices",
    "jet fuel": "Jet Fuel Prices",
    "container rates": "Container Freight Rates",
    "container freight": "Container Freight Rates",
    "insurance": "War Risk Insurance",
    "insurance premiums": "War Risk Insurance",
    "aramco": "Saudi Aramco",
    "tsmc": "TSMC",
    "asml": "ASML",
}

SUPPLY_CHAIN_TERMS = {
    "shipping",
    "freight",
    "vessel",
    "tanker",
    "cargo",
    "container",
    "port",
    "terminal",
    "logistics",
    "trade",
    "export",
    "exports",
    "import",
    "imports",
    "supply chain",
    "supply-chain",
    "pipeline",
    "refinery",
    "factory",
    "manufacturing",
    "mine",
    "mining",
    "oil",
    "gas",
    "lng",
    "lpg",
    "canal",
    "strait",
    "chokepoint",
    "commodity",
    "commodities",
    "market",
    "markets",
    "price",
    "prices",
    "insurance",
    "premium",
    "premiums",
    "border crossing",
}

DISRUPTION_TERMS = {
    "attack",
    "attacks",
    "strike",
    "strikes",
    "missile",
    "drone",
    "blockade",
    "shutdown",
    "closure",
    "closed",
    "outage",
    "disruption",
    "rerouting",
    "sanctions",
    "embargo",
    "fire",
    "explosion",
    "blast",
    "earthquake",
    "storm",
    "typhoon",
    "hurricane",
    "flood",
    "drought",
    "collision",
    "grounding",
    "seizure",
}

BLOCKER_TERMS = {
    "drug",
    "trafficker",
    "cartel",
    "crime",
    "crackdown",
    "criminal",
    "police",
    "arrest",
    "detained",
    "kidnapping",
    "murder",
    "homicide",
    "fraud",
    "corruption",
    "court",
    "judge",
    "election",
}

def build_knowledge_graph() -> nx.DiGraph:
    """Build the global supply-chain knowledge graph with 150+ nodes and 300+ edges."""
    G = nx.DiGraph()

    # ── COUNTRIES ──────────────────────────────────────────────────
    countries = {
        "United States": {"region": "North America", "gdp_rank": 1},
        "China": {"region": "East Asia", "gdp_rank": 2},
        "India": {"region": "South Asia", "gdp_rank": 5},
        "Japan": {"region": "East Asia", "gdp_rank": 4},
        "Germany": {"region": "Europe", "gdp_rank": 3},
        "United Kingdom": {"region": "Europe", "gdp_rank": 6},
        "France": {"region": "Europe", "gdp_rank": 7},
        "Russia": {"region": "Eurasia", "gdp_rank": 11},
        "Saudi Arabia": {"region": "Middle East", "gdp_rank": 18},
        "Iran": {"region": "Middle East", "gdp_rank": 22},
        "Iraq": {"region": "Middle East", "gdp_rank": 50},
        "UAE": {"region": "Middle East", "gdp_rank": 32},
        "Qatar": {"region": "Middle East", "gdp_rank": 55},
        "Taiwan": {"region": "East Asia", "gdp_rank": 21},
        "South Korea": {"region": "East Asia", "gdp_rank": 13},
        "Ukraine": {"region": "Europe", "gdp_rank": 55},
        "Brazil": {"region": "South America", "gdp_rank": 9},
        "Australia": {"region": "Oceania", "gdp_rank": 14},
        "Indonesia": {"region": "Southeast Asia", "gdp_rank": 16},
        "Turkey": {"region": "Europe/Asia", "gdp_rank": 17},
        "Nigeria": {"region": "Africa", "gdp_rank": 27},
        "Egypt": {"region": "Africa/Middle East", "gdp_rank": 33},
        "South Africa": {"region": "Africa", "gdp_rank": 34},
        "Mexico": {"region": "North America", "gdp_rank": 12},
        "Canada": {"region": "North America", "gdp_rank": 10},
        "Argentina": {"region": "South America", "gdp_rank": 26},
        "Poland": {"region": "Europe", "gdp_rank": 20},
        "Netherlands": {"region": "Europe", "gdp_rank": 19},
        "Singapore": {"region": "Southeast Asia", "gdp_rank": 36},
        "Malaysia": {"region": "Southeast Asia", "gdp_rank": 35},
        "Thailand": {"region": "Southeast Asia", "gdp_rank": 24},
        "Vietnam": {"region": "Southeast Asia", "gdp_rank": 37},
        "Philippines": {"region": "Southeast Asia", "gdp_rank": 33},
        "Myanmar": {"region": "Southeast Asia", "gdp_rank": 72},
        "Pakistan": {"region": "South Asia", "gdp_rank": 46},
        "Bangladesh": {"region": "South Asia", "gdp_rank": 37},
        "Ethiopia": {"region": "Africa", "gdp_rank": 60},
        "Kenya": {"region": "Africa", "gdp_rank": 68},
        "Sudan": {"region": "Africa", "gdp_rank": 85},
        "Libya": {"region": "Africa", "gdp_rank": 90},
        "Yemen": {"region": "Middle East", "gdp_rank": 100},
        "Syria": {"region": "Middle East", "gdp_rank": 120},
        "Israel": {"region": "Middle East", "gdp_rank": 28},
        "Chile": {"region": "South America", "gdp_rank": 44},
        "Peru": {"region": "South America", "gdp_rank": 49},
        "Colombia": {"region": "South America", "gdp_rank": 42},
        "Venezuela": {"region": "South America", "gdp_rank": 70},
        "Norway": {"region": "Europe", "gdp_rank": 30},
        "Sweden": {"region": "Europe", "gdp_rank": 23},
        "Finland": {"region": "Europe", "gdp_rank": 43},
    }
    for name, attrs in countries.items():
        G.add_node(name, type="country", **attrs)

    # ── CHOKEPOINTS ────────────────────────────────────────────────
    chokepoints = {
        "Strait of Hormuz": {"capacity_pct": 21, "region": "Persian Gulf"},
        "Suez Canal": {"capacity_pct": 12, "region": "Egypt"},
        "Bab el-Mandeb": {"capacity_pct": 9, "region": "Yemen/Djibouti"},
        "Malacca Strait": {"capacity_pct": 25, "region": "Southeast Asia"},
        "Panama Canal": {"capacity_pct": 5, "region": "Central America"},
        "Turkish Straits": {"capacity_pct": 3, "region": "Turkey"},
        "Strait of Gibraltar": {"capacity_pct": 4, "region": "Spain/Morocco"},
        "Cape of Good Hope": {"capacity_pct": 8, "region": "South Africa"},
        "Lombok Strait": {"capacity_pct": 3, "region": "Indonesia"},
        "Taiwan Strait": {"capacity_pct": 6, "region": "East Asia"},
        "Danish Straits": {"capacity_pct": 2, "region": "Europe"},
        "Mozambique Channel": {"capacity_pct": 2, "region": "East Africa"},
    }
    for name, attrs in chokepoints.items():
        G.add_node(name, type="chokepoint", **attrs)

    # ── COMMODITIES ────────────────────────────────────────────────
    commodities = {
        "Crude Oil": {"unit": "bbl", "market_size_b": 3000},
        "LPG": {"unit": "ton", "market_size_b": 350},
        "Natural Gas": {"unit": "MMBtu", "market_size_b": 800},
        "LNG": {"unit": "ton", "market_size_b": 120},
        "Coal": {"unit": "ton", "market_size_b": 400},
        "Wheat": {"unit": "bushel", "market_size_b": 50},
        "Corn": {"unit": "bushel", "market_size_b": 65},
        "Rice": {"unit": "ton", "market_size_b": 30},
        "Soybeans": {"unit": "bushel", "market_size_b": 55},
        "Palm Oil": {"unit": "ton", "market_size_b": 45},
        "Sugar": {"unit": "ton", "market_size_b": 35},
        "Coffee": {"unit": "ton", "market_size_b": 20},
        "Semiconductors": {"unit": "chip", "market_size_b": 580},
        "Rare Earth Minerals": {"unit": "ton", "market_size_b": 12},
        "Lithium": {"unit": "ton", "market_size_b": 22},
        "Cobalt": {"unit": "ton", "market_size_b": 15},
        "Copper": {"unit": "lb", "market_size_b": 180},
        "Iron Ore": {"unit": "ton", "market_size_b": 200},
        "Aluminum": {"unit": "ton", "market_size_b": 150},
        "Nickel": {"unit": "ton", "market_size_b": 35},
        "Gold": {"unit": "oz", "market_size_b": 200},
        "Platinum": {"unit": "oz", "market_size_b": 8},
        "Fertilizers": {"unit": "ton", "market_size_b": 200},
        "Potash": {"unit": "ton", "market_size_b": 25},
        "Uranium": {"unit": "lb", "market_size_b": 5},
    }
    for name, attrs in commodities.items():
        G.add_node(name, type="commodity", **attrs)

    # ── PORTS ──────────────────────────────────────────────────────
    ports = [
        "Shanghai Port", "Singapore Port", "Rotterdam Port", "Mumbai Port",
        "Dubai Port", "Houston Port", "Busan Port", "Antwerp Port",
        "Hamburg Port", "Los Angeles Port", "Yokohama Port", "Shenzhen Port",
        "Guangzhou Port", "Ningbo Port", "Qingdao Port", "Dalian Port",
    ]
    for p in ports:
        G.add_node(p, type="port")

    # ── COMPANIES / INFRASTRUCTURE ─────────────────────────────────
    companies = {
        "TSMC": {"sector": "semiconductors", "country": "Taiwan", "market_share": 0.56},
        "Samsung Foundry": {"sector": "semiconductors", "country": "South Korea", "market_share": 0.16},
        "Intel Fabs": {"sector": "semiconductors", "country": "United States", "market_share": 0.08},
        "ASML": {"sector": "semiconductor equipment", "country": "Netherlands", "market_share": 0.85},
        "Saudi Aramco": {"sector": "oil", "country": "Saudi Arabia", "production_mbpd": 10.5},
        "Gazprom": {"sector": "gas", "country": "Russia", "production_bcm": 430},
        "ExxonMobil": {"sector": "oil", "country": "United States"},
        "ADNOC": {"sector": "oil", "country": "UAE"},
        "Rosneft": {"sector": "oil", "country": "Russia"},
        "Maersk": {"sector": "shipping", "country": "Denmark", "fleet_teu": 4300000},
        "MSC": {"sector": "shipping", "country": "Switzerland", "fleet_teu": 5200000},
        "CMA CGM": {"sector": "shipping", "country": "France", "fleet_teu": 3500000},
        "COSCO Shipping": {"sector": "shipping", "country": "China"},
        "Cargill": {"sector": "agriculture", "country": "United States"},
        "ADM": {"sector": "agriculture", "country": "United States"},
        "Bunge": {"sector": "agriculture", "country": "United States"},
        "Yara International": {"sector": "fertilizer", "country": "Norway"},
        "CATL": {"sector": "batteries", "country": "China"},
        "BYD": {"sector": "EV/batteries", "country": "China"},
        "Rio Tinto": {"sector": "mining", "country": "Australia"},
        "BHP": {"sector": "mining", "country": "Australia"},
        "Vale": {"sector": "mining", "country": "Brazil"},
        "Glencore": {"sector": "mining/trading", "country": "Switzerland"},
    }
    for name, attrs in companies.items():
        G.add_node(name, type="company", **attrs)

    # ── SECTORS ────────────────────────────────────────────────────
    sectors = [
        "Energy Supply Chain", "Food Supply Chain", "Semiconductor Supply Chain",
        "Global Shipping", "Automotive Industry", "Aerospace Industry",
        "Pharmaceutical Industry", "Mining Industry", "Agriculture Sector",
        "Defense Industry", "Consumer Electronics", "Industrial Manufacturing",
        "Financial Markets", "Global Trade", "Renewable Energy",
        "Refining Sector", "Power Utilities", "Petrochemical Industry", "Airlines",
    ]
    for s in sectors:
        G.add_node(s, type="sector")

    # ── INDICES ────────────────────────────────────────────────────
    indices = ["Oil Prices", "Gas Prices", "Food Price Index", "Semiconductor Index",
               "Shipping Rates (BDI)", "US Dollar Index", "Global Inflation",
               "Diesel Prices", "Jet Fuel Prices", "Container Freight Rates", "War Risk Insurance"]
    for idx in indices:
        G.add_node(idx, type="index")

    # ═══════════════════════════════════════════════════════════════
    # EDGES — Dependencies with weights (coupling strength 0-1)
    # ═══════════════════════════════════════════════════════════════

    edges = [
        # ── Energy chokepoints → commodities ──
        ("Strait of Hormuz", "Crude Oil", 0.85, "transit"),
        ("Strait of Hormuz", "LPG", 0.80, "transit"),
        ("Strait of Hormuz", "LNG", 0.70, "transit"),
        ("Strait of Hormuz", "Natural Gas", 0.60, "transit"),
        ("Suez Canal", "Crude Oil", 0.55, "transit"),
        ("Suez Canal", "LNG", 0.45, "transit"),
        ("Suez Canal", "Global Shipping", 0.80, "transit"),
        ("Bab el-Mandeb", "Crude Oil", 0.50, "transit"),
        ("Bab el-Mandeb", "Global Shipping", 0.65, "transit"),
        ("Bab el-Mandeb", "Suez Canal", 0.90, "gateway"),
        ("Malacca Strait", "Crude Oil", 0.70, "transit"),
        ("Malacca Strait", "Global Shipping", 0.85, "transit"),
        ("Malacca Strait", "LNG", 0.65, "transit"),
        ("Panama Canal", "Global Shipping", 0.55, "transit"),
        ("Taiwan Strait", "Semiconductors", 0.75, "transit"),
        ("Taiwan Strait", "Global Shipping", 0.40, "transit"),
        ("Turkish Straits", "Crude Oil", 0.30, "transit"),
        ("Turkish Straits", "Wheat", 0.55, "transit"),
        ("Cape of Good Hope", "Crude Oil", 0.40, "alternate"),
        ("Cape of Good Hope", "Global Shipping", 0.35, "alternate"),
        ("Danish Straits", "Natural Gas", 0.25, "transit"),
        ("Danish Straits", "Crude Oil", 0.20, "transit"),

        # ── Energy producers → commodities ──
        ("Saudi Arabia", "Crude Oil", 0.85, "production"),
        ("Russia", "Crude Oil", 0.65, "production"),
        ("Russia", "Natural Gas", 0.80, "production"),
        ("Russia", "LNG", 0.35, "production"),
        ("Russia", "Wheat", 0.55, "export"),
        ("Russia", "Fertilizers", 0.60, "export"),
        ("Iran", "Crude Oil", 0.50, "production"),
        ("Iran", "Natural Gas", 0.40, "production"),
        ("Iraq", "Crude Oil", 0.55, "production"),
        ("UAE", "Crude Oil", 0.45, "production"),
        ("UAE", "LNG", 0.30, "production"),
        ("Qatar", "LNG", 0.75, "production"),
        ("Qatar", "Natural Gas", 0.70, "production"),
        ("United States", "Crude Oil", 0.55, "production"),
        ("United States", "Natural Gas", 0.65, "production"),
        ("United States", "LNG", 0.40, "export"),
        ("Norway", "Crude Oil", 0.30, "production"),
        ("Norway", "Natural Gas", 0.35, "production"),
        ("Canada", "Crude Oil", 0.40, "production"),
        ("Mexico", "Automotive Industry", 0.58, "manufacturing"),
        ("Mexico", "Industrial Manufacturing", 0.52, "manufacturing"),
        ("Mexico", "Agriculture Sector", 0.28, "export"),
        ("Mexico", "Global Trade", 0.24, "nearshoring"),
        ("Venezuela", "Crude Oil", 0.25, "production"),
        ("Libya", "Crude Oil", 0.20, "production"),
        ("Nigeria", "Crude Oil", 0.30, "production"),
        ("Australia", "LNG", 0.35, "export"),
        ("Australia", "Coal", 0.60, "export"),

        # ── Energy importers ──
        ("Crude Oil", "India", 0.75, "import_dependency"),
        ("Crude Oil", "China", 0.70, "import_dependency"),
        ("Crude Oil", "Japan", 0.80, "import_dependency"),
        ("Crude Oil", "South Korea", 0.75, "import_dependency"),
        ("Crude Oil", "Germany", 0.55, "import_dependency"),
        ("LPG", "India", 0.80, "import_dependency"),
        ("LNG", "Japan", 0.70, "import_dependency"),
        ("LNG", "South Korea", 0.60, "import_dependency"),
        ("LNG", "China", 0.45, "import_dependency"),
        ("Natural Gas", "Germany", 0.65, "import_dependency"),
        ("Natural Gas", "Turkey", 0.55, "import_dependency"),
        ("Natural Gas", "India", 0.40, "import_dependency"),
        ("Coal", "China", 0.55, "import_dependency"),
        ("Coal", "India", 0.50, "import_dependency"),
        ("Coal", "Japan", 0.40, "import_dependency"),

        # ── Energy → sectors/indices ──
        ("Crude Oil", "Oil Prices", 0.95, "pricing"),
        ("Crude Oil", "Energy Supply Chain", 0.90, "supply"),
        ("Crude Oil", "Refining Sector", 0.82, "supply"),
        ("Crude Oil", "Petrochemical Industry", 0.62, "input"),
        ("Natural Gas", "Gas Prices", 0.90, "pricing"),
        ("Natural Gas", "Energy Supply Chain", 0.80, "supply"),
        ("Natural Gas", "Power Utilities", 0.72, "supply"),
        ("Natural Gas", "Petrochemical Industry", 0.48, "input"),
        ("LPG", "Energy Supply Chain", 0.60, "supply"),
        ("LNG", "Energy Supply Chain", 0.70, "supply"),
        ("LNG", "Power Utilities", 0.62, "supply"),
        ("Coal", "Power Utilities", 0.58, "supply"),
        ("Oil Prices", "Global Inflation", 0.65, "impact"),
        ("Gas Prices", "Global Inflation", 0.50, "impact"),
        ("Oil Prices", "Financial Markets", 0.55, "impact"),
        ("Refining Sector", "Diesel Prices", 0.88, "pricing"),
        ("Refining Sector", "Jet Fuel Prices", 0.82, "pricing"),
        ("Diesel Prices", "Agriculture Sector", 0.45, "cost"),
        ("Diesel Prices", "Industrial Manufacturing", 0.42, "cost"),
        ("Diesel Prices", "Global Inflation", 0.52, "impact"),
        ("Jet Fuel Prices", "Airlines", 0.72, "cost"),
        ("Jet Fuel Prices", "Global Inflation", 0.25, "impact"),
        ("Power Utilities", "Industrial Manufacturing", 0.52, "power"),
        ("Power Utilities", "Global Inflation", 0.38, "impact"),

        # ── Food supply chain ──
        ("Ukraine", "Wheat", 0.65, "export"),
        ("Ukraine", "Corn", 0.40, "export"),
        ("Ukraine", "Soybeans", 0.25, "export"),
        ("Brazil", "Soybeans", 0.65, "export"),
        ("Brazil", "Corn", 0.35, "export"),
        ("Brazil", "Coffee", 0.70, "export"),
        ("Brazil", "Sugar", 0.55, "export"),
        ("Argentina", "Soybeans", 0.35, "export"),
        ("Argentina", "Corn", 0.25, "export"),
        ("Indonesia", "Palm Oil", 0.75, "export"),
        ("Malaysia", "Palm Oil", 0.55, "export"),
        ("India", "Rice", 0.60, "export"),
        ("Thailand", "Rice", 0.45, "export"),
        ("Vietnam", "Rice", 0.35, "export"),
        ("Colombia", "Coffee", 0.30, "export"),
        ("Ethiopia", "Coffee", 0.15, "export"),
        ("Wheat", "Food Supply Chain", 0.85, "supply"),
        ("Corn", "Food Supply Chain", 0.70, "supply"),
        ("Rice", "Food Supply Chain", 0.75, "supply"),
        ("Soybeans", "Food Supply Chain", 0.55, "supply"),
        ("Palm Oil", "Food Supply Chain", 0.45, "supply"),
        ("Fertilizers", "Food Supply Chain", 0.70, "input"),
        ("Fertilizers", "Agriculture Sector", 0.65, "input"),
        ("Agriculture Sector", "Food Supply Chain", 0.45, "production"),
        ("Potash", "Fertilizers", 0.60, "input"),
        ("Food Supply Chain", "Food Price Index", 0.90, "pricing"),
        ("Food Price Index", "Global Inflation", 0.55, "impact"),
        ("Wheat", "Food Price Index", 0.70, "pricing"),
        ("Corn", "Food Price Index", 0.50, "pricing"),

        # ── Semiconductor supply chain ──
        ("Taiwan", "Semiconductors", 0.90, "production"),
        ("South Korea", "Semiconductors", 0.55, "production"),
        ("United States", "Semiconductors", 0.30, "production"),
        ("Japan", "Semiconductors", 0.25, "production"),
        ("China", "Semiconductors", 0.20, "production"),
        ("TSMC", "Semiconductors", 0.56, "manufacturing"),
        ("Samsung Foundry", "Semiconductors", 0.16, "manufacturing"),
        ("Intel Fabs", "Semiconductors", 0.08, "manufacturing"),
        ("ASML", "TSMC", 0.85, "equipment"),
        ("ASML", "Samsung Foundry", 0.80, "equipment"),
        ("ASML", "Intel Fabs", 0.75, "equipment"),
        ("Semiconductors", "Semiconductor Supply Chain", 0.95, "supply"),
        ("Semiconductors", "Semiconductor Index", 0.90, "pricing"),
        ("Rare Earth Minerals", "Semiconductors", 0.60, "input"),
        ("Semiconductors", "Consumer Electronics", 0.85, "supply"),
        ("Semiconductors", "Automotive Industry", 0.70, "supply"),
        ("Semiconductors", "Aerospace Industry", 0.55, "supply"),
        ("Semiconductors", "Defense Industry", 0.60, "supply"),
        ("China", "Rare Earth Minerals", 0.85, "production"),
        ("Australia", "Rare Earth Minerals", 0.15, "production"),

        # ── Mining & Metals ──
        ("Chile", "Copper", 0.55, "production"),
        ("Peru", "Copper", 0.25, "production"),
        ("Copper", "Consumer Electronics", 0.50, "input"),
        ("Copper", "Industrial Manufacturing", 0.60, "input"),
        ("Australia", "Iron Ore", 0.60, "export"),
        ("Brazil", "Iron Ore", 0.35, "export"),
        ("Iron Ore", "Industrial Manufacturing", 0.70, "input"),
        ("Iron Ore", "China", 0.80, "import"),
        ("Lithium", "CATL", 0.80, "input"),
        ("Lithium", "BYD", 0.70, "input"),
        ("Australia", "Lithium", 0.55, "production"),
        ("Chile", "Lithium", 0.35, "production"),
        ("Cobalt", "CATL", 0.65, "input"),
        ("Rio Tinto", "Iron Ore", 0.35, "production"),
        ("BHP", "Iron Ore", 0.30, "production"),
        ("Vale", "Iron Ore", 0.25, "production"),

        # ── Shipping ──
        ("Maersk", "Global Shipping", 0.20, "capacity"),
        ("MSC", "Global Shipping", 0.25, "capacity"),
        ("CMA CGM", "Global Shipping", 0.15, "capacity"),
        ("COSCO Shipping", "Global Shipping", 0.15, "capacity"),
        ("Global Shipping", "Shipping Rates (BDI)", 0.90, "pricing"),
        ("Global Shipping", "Container Freight Rates", 0.88, "pricing"),
        ("Global Shipping", "Global Trade", 0.85, "enabler"),
        ("Global Shipping", "War Risk Insurance", 0.72, "pricing"),
        ("Shanghai Port", "Global Shipping", 0.20, "hub"),
        ("Singapore Port", "Global Shipping", 0.18, "hub"),
        ("Rotterdam Port", "Global Shipping", 0.12, "hub"),
        ("Shipping Rates (BDI)", "Global Inflation", 0.40, "impact"),
        ("Container Freight Rates", "Global Inflation", 0.34, "impact"),
        ("Container Freight Rates", "Consumer Electronics", 0.30, "cost"),
        ("War Risk Insurance", "Global Shipping", 0.48, "cost"),
        ("War Risk Insurance", "Global Trade", 0.38, "cost"),
        ("War Risk Insurance", "Container Freight Rates", 0.55, "pricing"),

        # ── Energy companies ──
        ("Saudi Aramco", "Crude Oil", 0.55, "production"),
        ("Gazprom", "Natural Gas", 0.45, "production"),
        ("ExxonMobil", "Crude Oil", 0.15, "production"),
        ("ADNOC", "Crude Oil", 0.20, "production"),
        ("Rosneft", "Crude Oil", 0.20, "production"),

        # ── Conflicts / Geopolitics → chokepoints ──
        ("Iran", "Strait of Hormuz", 0.80, "territorial"),
        ("Yemen", "Bab el-Mandeb", 0.70, "threat"),
        ("Egypt", "Suez Canal", 0.85, "control"),
        ("Turkey", "Turkish Straits", 0.90, "control"),
        ("Russia", "Ukraine", 0.75, "conflict"),
        ("China", "Taiwan Strait", 0.70, "territorial"),
        ("Indonesia", "Malacca Strait", 0.60, "territorial"),
        ("Singapore", "Malacca Strait", 0.55, "territorial"),
        ("Malaysia", "Malacca Strait", 0.50, "territorial"),
        ("Strait of Hormuz", "War Risk Insurance", 0.72, "threat"),
        ("Bab el-Mandeb", "War Risk Insurance", 0.78, "threat"),
        ("Suez Canal", "Container Freight Rates", 0.55, "pricing"),
        ("Panama Canal", "Container Freight Rates", 0.50, "pricing"),

        # ── Cross-sector cascades ──
        ("Energy Supply Chain", "Industrial Manufacturing", 0.70, "input"),
        ("Energy Supply Chain", "Agriculture Sector", 0.55, "input"),
        ("Energy Supply Chain", "Global Shipping", 0.65, "fuel"),
        ("Energy Supply Chain", "Airlines", 0.42, "fuel"),
        ("Global Shipping", "Food Supply Chain", 0.60, "transport"),
        ("Global Shipping", "Semiconductor Supply Chain", 0.55, "transport"),
        ("Global Shipping", "Energy Supply Chain", 0.45, "transport"),
        ("Financial Markets", "Global Trade", 0.55, "financing"),
        ("US Dollar Index", "Financial Markets", 0.70, "pricing"),
        ("Global Inflation", "Financial Markets", 0.60, "impact"),
        ("Renewable Energy", "Lithium", 0.65, "demand"),
        ("Renewable Energy", "Cobalt", 0.55, "demand"),
        ("Renewable Energy", "Copper", 0.60, "demand"),
        ("Semiconductor Supply Chain", "Automotive Industry", 0.55, "supply"),
        ("Semiconductor Supply Chain", "Consumer Electronics", 0.68, "supply"),
        ("Semiconductor Supply Chain", "Defense Industry", 0.45, "supply"),

        # ── Fertilizer chain (Russia/Belarus control ~40%) ──
        ("Russia", "Potash", 0.35, "export"),
        ("Yara International", "Fertilizers", 0.25, "production"),
        ("Natural Gas", "Fertilizers", 0.65, "input"),
    ]

    for src, dst, weight, rel_type in edges:
        if G.has_node(src) and G.has_node(dst):
            G.add_edge(src, dst, weight=weight, type=rel_type)

    return G


# ── Global singleton ──────────────────────────────────────────────
_GRAPH: nx.DiGraph | None = None

def get_graph() -> nx.DiGraph:
    global _GRAPH
    if _GRAPH is None:
        _GRAPH = build_knowledge_graph()
    return _GRAPH


def simulate_cascade(
    trigger_node: str,
    initial_risk: float = 0.80,
    decay: float = 0.88,
    min_risk: float = 0.05,
    max_depth: int = 8,
    include_reverse: bool = False,
) -> list[dict[str, Any]]:
    """
    BFS cascade propagation from a trigger node.
    
    Risk_next = Risk_current × edge_weight × decay
    
    Returns a list of affected nodes sorted by risk (descending).
    """
    G = get_graph()
    if trigger_node not in G:
        return []

    visited: dict[str, dict] = {}
    queue: deque = deque()
    queue.append((trigger_node, initial_risk, 0, [trigger_node], []))

    while queue:
        node, risk, depth, path, path_edges = queue.popleft()

        if node in visited or risk < min_risk or depth > max_depth:
            continue

        node_data = G.nodes[node]
        visited[node] = {
            "node": node,
            "type": node_data.get("type", "unknown"),
            "icon": NODE_TYPES.get(node_data.get("type", ""), "❓"),
            "risk": round(risk, 4),
            "risk_pct": round(risk * 100, 1),
            "depth": depth,
            "time_horizon_days": max(1, depth * 5),
            "time_label": _time_label(depth),
            "path": path,
            "path_edges": path_edges,
        }

        # Propagate to all successors
        for neighbor in G.successors(node):
            if neighbor not in visited:
                edge_data = G.edges[node, neighbor]
                edge_weight = edge_data.get("weight", 0.5)
                next_risk = risk * edge_weight * decay
                if next_risk >= min_risk:
                    queue.append((
                        neighbor,
                        next_risk,
                        depth + 1,
                        path + [neighbor],
                        path_edges + [{
                            "source": node,
                            "target": neighbor,
                            "type": edge_data.get("type", "unknown"),
                            "weight": edge_weight,
                            "direction": "forward",
                        }],
                    ))

        # Also propagate to predecessors that depend on this node (reverse cascade)
        if include_reverse:
            for predecessor in G.predecessors(node):
                if predecessor not in visited:
                    edge_data = G.edges[predecessor, node]
                    edge_weight = edge_data.get("weight", 0.5)
                    # Reverse propagation is weaker
                    next_risk = risk * edge_weight * decay * 0.6
                    if next_risk >= min_risk:
                        queue.append((
                            predecessor,
                            next_risk,
                            depth + 1,
                            path + [predecessor],
                            path_edges + [{
                                "source": predecessor,
                                "target": node,
                                "type": edge_data.get("type", "unknown"),
                                "weight": edge_weight,
                                "direction": "reverse",
                            }],
                        ))

    # Remove trigger from results, sort by risk
    results = [v for k, v in visited.items() if k != trigger_node]
    results.sort(key=lambda x: x["risk"], reverse=True)
    return results


def get_graph_json() -> dict:
    """Export the graph as nodes + edges JSON for D3 visualization."""
    G = get_graph()
    nodes = []
    for n, data in G.nodes(data=True):
        nodes.append({
            "id": n,
            "type": data.get("type", "unknown"),
            "icon": NODE_TYPES.get(data.get("type", ""), "❓"),
            **{k: v for k, v in data.items() if k != "type"},
        })
    edges = []
    for u, v, data in G.edges(data=True):
        edges.append({
            "source": u,
            "target": v,
            "weight": data.get("weight", 0.5),
            "type": data.get("type", "unknown"),
        })
    return {"nodes": nodes, "edges": edges, "node_count": len(nodes), "edge_count": len(edges)}


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip().lower())


def _tokenize(text: str) -> set[str]:
    return set(re.findall(r"[a-z0-9]+", text.lower()))


def _text_contains(term: str, text: str, tokens: set[str]) -> bool:
    normalized = _normalize_text(term)
    if not normalized:
        return False
    if " " in normalized:
        return normalized in text
    return normalized in tokens


def _strategic_link_count(G: nx.DiGraph, node: str) -> int:
    count = 0
    for neighbor in G.successors(node):
        if G.nodes[neighbor].get("type", "") in STRATEGIC_NODE_TYPES:
            count += 1
    return count


def _mention_position_boost(title_text: str, fallback_text: str, term: str) -> float:
    normalized_term = _normalize_text(term)
    if not normalized_term:
        return 0.0

    for text, max_boost in ((title_text, 0.16), (fallback_text, 0.08)):
        position = text.find(normalized_term)
        if position >= 0:
            return max(0.0, max_boost - min(position, 80) * 0.002)
    return 0.0


def analyze_alert_mapping(
    alert_title: str,
    alert_description: str = "",
    alert_category: str = "",
) -> dict[str, Any]:
    """Map alert text to graph nodes using explicit evidence, not freeform inference."""
    G = get_graph()
    title_text = _normalize_text(alert_title)
    description_text = _normalize_text(alert_description)
    category_text = _normalize_text(alert_category)
    full_text = " ".join(part for part in (title_text, description_text, category_text) if part).strip()
    tokens = _tokenize(full_text)

    domain_terms = sorted(term for term in SUPPLY_CHAIN_TERMS if _text_contains(term, full_text, tokens))
    disruption_terms = sorted(term for term in DISRUPTION_TERMS if _text_contains(term, full_text, tokens))
    blocker_terms = sorted(term for term in BLOCKER_TERMS if _text_contains(term, full_text, tokens))
    category_support = category_text in STRATEGIC_ALERT_CATEGORIES
    has_operational_signal = bool(domain_terms or disruption_terms)
    has_domain_signal = bool(has_operational_signal or category_support)
    blocker_only = bool(blocker_terms) and not has_operational_signal

    candidates: dict[str, dict[str, Any]] = {}

    def register_candidate(node: str, matched_term: str, reason: str, score: float, direct: bool = False) -> None:
        if node not in G:
            return
        node_type = G.nodes[node].get("type", "unknown")
        normalized_term = _normalize_text(matched_term or node)
        title_position = title_text.find(normalized_term)
        full_position = full_text.find(normalized_term)
        position = title_position if title_position >= 0 else (full_position if full_position >= 0 else 10_000)
        entry = candidates.setdefault(node, {
            "node": node,
            "type": node_type,
            "score": 0.0,
            "direct": False,
            "matched_terms": set(),
            "reasons": [],
            "strategic_links": _strategic_link_count(G, node),
            "position": position,
        })
        entry["score"] += score
        if matched_term:
            entry["matched_terms"].add(matched_term)
        if reason and reason not in entry["reasons"]:
            entry["reasons"].append(reason)
        entry["direct"] = entry["direct"] or direct
        entry["position"] = min(entry["position"], position)

    for node, data in G.nodes(data=True):
        node_name = _normalize_text(node)
        node_type = data.get("type", "unknown")
        if not node_name:
            continue
        if " " in node_name:
            if node_name in full_text:
                base_score = 0.48 if node_type == "country" else (0.78 if node_type in STRATEGIC_NODE_TYPES else 0.56)
                register_candidate(
                    node,
                    node_name,
                    f"Alert explicitly names {node}.",
                    base_score + _mention_position_boost(title_text, full_text, node_name),
                    direct=True,
                )
        elif node_name in tokens:
            register_candidate(
                node,
                node_name,
                f"Alert explicitly names {node}.",
                (0.64 if node_type in STRATEGIC_NODE_TYPES else 0.48) + _mention_position_boost(title_text, full_text, node_name),
                direct=True,
            )

    for alias, node in ALERT_NODE_ALIASES.items():
        if _text_contains(alias, full_text, tokens):
            register_candidate(
                node,
                alias,
                f"Matched headline term '{alias}' to {node}.",
                0.62 + _mention_position_boost(title_text, full_text, alias),
                direct=True,
            )

    for entry in candidates.values():
        node_type = entry["type"]
        if node_type in STRATEGIC_NODE_TYPES:
            entry["score"] += 0.12
        if node_type == "country" and entry["strategic_links"] > 0:
            entry["score"] += min(0.20, entry["strategic_links"] * 0.05)
            entry["reasons"].append(
                f"{entry['node']} links to {entry['strategic_links']} strategic nodes in the graph."
            )
        if has_domain_signal and node_type in STRATEGIC_NODE_TYPES:
            entry["score"] += 0.08

    ranked_candidates = sorted(candidates.values(), key=lambda item: (-item["score"], item["position"], item["node"]))
    accepted: list[dict[str, Any]] = []

    for entry in ranked_candidates:
        accepted_entry = False
        node_type = entry["type"]
        if node_type in STRATEGIC_NODE_TYPES:
            accepted_entry = entry["direct"] or entry["score"] >= 0.62
        elif node_type == "country":
            accepted_entry = (
                entry["strategic_links"] > 0
                and has_operational_signal
                and not blocker_only
                and entry["score"] >= 0.45
            )

        if not accepted_entry and node_type == "country":
            if entry["strategic_links"] == 0:
                entry["reasons"].append("Country match has no downstream strategic links in the current graph.")
            else:
                entry["reasons"].append(
                    "Country match needs explicit disruption, trade, energy, or logistics evidence before a cascade is allowed."
                )
        elif not accepted_entry:
            entry["reasons"].append("Signal is too weak to promote into an evidence-backed cascade.")

        entry["accepted"] = accepted_entry
        if accepted_entry:
            accepted.append(entry)

    matched_evidence = [{
        "node": entry["node"],
        "type": entry["type"],
        "score": round(entry["score"], 2),
        "direct": entry["direct"],
        "strategic_links": entry["strategic_links"],
        "matched_terms": sorted(entry["matched_terms"])[:4],
        "reasons": entry["reasons"][:3],
    } for entry in accepted[:5]]

    candidate_evidence = [{
        "node": entry["node"],
        "type": entry["type"],
        "score": round(entry["score"], 2),
        "direct": entry["direct"],
        "strategic_links": entry["strategic_links"],
        "accepted": entry["accepted"],
        "matched_terms": sorted(entry["matched_terms"])[:4],
        "reasons": entry["reasons"][:3],
    } for entry in ranked_candidates[:5]]

    relevance_score = 0.0
    if matched_evidence:
        relevance_score += 0.18 + min(0.22, len(matched_evidence) * 0.08)
    if any(item["type"] in STRATEGIC_NODE_TYPES for item in matched_evidence):
        relevance_score += 0.16
    if any(item["type"] == "country" and item["strategic_links"] > 0 for item in matched_evidence):
        relevance_score += 0.12
    relevance_score += min(0.18, len(domain_terms) * 0.04)
    relevance_score += min(0.14, len(disruption_terms) * 0.05)
    if category_support:
        relevance_score += 0.10
    if blocker_terms:
        relevance_score -= min(0.22, len(blocker_terms) * 0.07)

    should_simulate = bool(matched_evidence) and not blocker_only

    if should_simulate and not any(item["type"] != "country" for item in matched_evidence):
        should_simulate = any(item["strategic_links"] > 0 for item in matched_evidence) and has_operational_signal

    if should_simulate and blocker_terms and not has_operational_signal:
        should_simulate = any(
            item["type"] in {"commodity", "chokepoint", "port", "company", "index", "infrastructure"}
            for item in matched_evidence
        )

    if should_simulate:
        reason = "Cascade is enabled because the alert names graph-backed strategic nodes and includes disruption or supply-chain evidence."
    elif blocker_only:
        reason = "This headline looks like crime or law-enforcement reporting without direct transport, energy, commodity, or market disruption evidence."
    elif candidate_evidence:
        reason = "The alert names real entities, but not enough graph-backed disruption evidence to justify a cascade yet."
    else:
        reason = "The alert could not be mapped to strategic nodes in the current supply-chain graph."

    return {
        "matched_nodes": [entry["node"] for entry in matched_evidence],
        "matched_evidence": matched_evidence,
        "candidate_evidence": candidate_evidence,
        "domain_terms": domain_terms[:8],
        "disruption_terms": disruption_terms[:8],
        "blocker_terms": blocker_terms[:8],
        "category_support": category_support,
        "should_simulate": should_simulate,
        "relevance_score": round(max(0.0, min(1.0, relevance_score)), 2),
        "reason": reason,
    }


def map_alert_to_nodes(alert_text: str) -> list[str]:
    """Backward-compatible wrapper for consumers that only need matched node names."""
    return analyze_alert_mapping(alert_text).get("matched_nodes", [])


def _time_label(depth: int) -> str:
    if depth <= 1:
        return "0-3 days (immediate)"
    elif depth <= 2:
        return "3-7 days (short-term)"
    elif depth <= 3:
        return "7-14 days"
    elif depth <= 4:
        return "14-30 days"
    elif depth <= 5:
        return "1-2 months"
    else:
        return "2-6 months"
