/**
 * CountryPanel – Slide-in intelligence panel for country deep-dives
 * Uses SVG icons. Uses differentiated seed data per country.
 */

import { useEffect, useState, useCallback } from "react";
import type { Alert } from "./types";
import { COUNTRY_INTEL, getDefaultCountryIntel } from "./seedData";
import { BrainIcon, ChartIcon, RadioIcon, SirenIcon } from "./Icons";

interface CountryInfo {
  code: string;
  name: string;
}

interface CountryBrief {
  riskLevel: string;
  summary: string;
  indicators: { label: string; value: string; trend: "up" | "down" | "stable" }[];
  relatedAlerts: Alert[];
  dataSources: string[];
}

interface CountryPanelProps {
  country: CountryInfo | null;
  alerts: Alert[];
  onClose: () => void;
}

const FLAG_URL = (code: string) =>
  `https://flagcdn.com/w40/${code.toLowerCase()}.png`;

const RISK_COLORS: Record<string, string> = {
  critical: "#ff4444",
  high: "#ff8800",
  medium: "#ffaa00",
  low: "#44aa44",
  stable: "#3b82f6",
};

const TREND_ICON: Record<string, string> = {
  up: "↑",
  down: "↓",
  stable: "→",
};

const TREND_COLOR: Record<string, string> = {
  up: "#ff4444",
  down: "#44aa44",
  stable: "#888",
};

export function CountryPanel({ country, alerts, onClose }: CountryPanelProps) {
  const [brief, setBrief] = useState<CountryBrief | null>(null);
  const [loading, setLoading] = useState(false);

  const loadBrief = useCallback(() => {
    if (!country) return;
    setLoading(true);
    setTimeout(() => {
      // Use differentiated seed data per country
      const intel = COUNTRY_INTEL[country.code] || getDefaultCountryIntel(country.name);

      // Find related alerts
      const related = alerts.filter((a) => {
        const text = `${a.snapshot || ""} ${a.forecast || ""}`.toLowerCase();
        return text.includes(country.name.toLowerCase()) || text.includes(country.code.toLowerCase());
      });

      setBrief({
        riskLevel: intel.riskLevel,
        summary: intel.summary,
        indicators: intel.indicators,
        relatedAlerts: related.slice(0, 5),
        dataSources: intel.dataSources,
      });
      setLoading(false);
    }, 350);
  }, [country, alerts]);

  useEffect(() => {
    if (country) {
      loadBrief();
    } else {
      setBrief(null);
    }
  }, [country, loadBrief]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const isOpen = !!country;

  return (
    <>
      {isOpen && <div className="country-panel-backdrop" onClick={onClose} />}

      <aside className={`country-panel ${isOpen ? "open" : ""}`} aria-hidden={!isOpen}>
        <div className="country-panel-shell">
          <button className="country-panel-close" onClick={onClose}>×</button>

          <div className="country-panel-content">
            {country && (
              <>
                <div className="country-panel-header">
                  <img
                    className="country-flag"
                    src={FLAG_URL(country.code)}
                    alt={country.name}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div className="country-header-text">
                    <h2 className="country-name">{country.name}</h2>
                    <span className="country-code">{country.code}</span>
                  </div>
                  {brief && (
                    <span
                      className="country-risk-badge"
                      style={{ background: RISK_COLORS[brief.riskLevel] || RISK_COLORS.low }}
                    >
                      {brief.riskLevel.toUpperCase()}
                    </span>
                  )}
                </div>

                {loading && (
                  <div className="country-loading">
                    <div className="country-loading-bar" />
                    <p>Generating intelligence brief...</p>
                  </div>
                )}

                {brief && !loading && (
                  <>
                    <section className="country-section">
                      <h3 className="country-section-title">
                        <BrainIcon size={15} />
                        Intelligence Summary
                      </h3>
                      <p className="country-summary">{brief.summary}</p>
                    </section>

                    <section className="country-section">
                      <h3 className="country-section-title">
                        <ChartIcon size={15} />
                        Key Indicators
                      </h3>
                      <div className="country-indicators-grid">
                        {brief.indicators.map((ind) => (
                          <div key={ind.label} className="country-indicator">
                            <span className="indicator-label">{ind.label}</span>
                            <span className="indicator-value">
                              {ind.value}
                              <span className="indicator-trend" style={{ color: TREND_COLOR[ind.trend] }}>
                                {TREND_ICON[ind.trend]}
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </section>

                    {brief.relatedAlerts.length > 0 && (
                      <section className="country-section">
                        <h3 className="country-section-title">
                          <SirenIcon size={15} />
                          Related Alerts ({brief.relatedAlerts.length})
                        </h3>
                        <div className="country-alerts-list">
                          {brief.relatedAlerts.map((alert) => (
                            <div key={alert.alert_id} className={`country-alert-item sev-${alert.severity || "low"}`}>
                              <div className="country-alert-sev">{(alert.severity || "LOW").toUpperCase()}</div>
                              <div className="country-alert-text">{alert.snapshot || "No snapshot"}</div>
                              <div className="country-alert-confidence">Confidence: {Number(alert.confidence || 0).toFixed(2)}</div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    <section className="country-section">
                      <h3 className="country-section-title">
                        <RadioIcon size={15} />
                        Active Data Sources
                      </h3>
                      <div className="country-sources">
                        {brief.dataSources.map((src) => (
                          <span key={src} className="country-source-tag">{src}</span>
                        ))}
                      </div>
                    </section>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
