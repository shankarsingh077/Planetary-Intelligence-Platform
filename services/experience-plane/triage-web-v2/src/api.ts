import type { Alert, AuthConfig, OpsCounters } from "./types";

type JsonValue = Record<string, unknown>;

function buildHeaders(cfg: AuthConfig, extra: Record<string, string> = {}): Record<string, string> {
  if (cfg.mode === "token") {
    return cfg.token
      ? {
          ...extra,
          Authorization: `Bearer ${cfg.token}`,
        }
      : { ...extra };
  }

  return {
    ...extra,
    "X-Tenant-ID": cfg.tenantId,
    "X-User-ID": cfg.userId,
    "X-Roles": cfg.roles || "viewer",
  };
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  let payload: JsonValue = {};
  try {
    payload = (await response.json()) as JsonValue;
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const detail = String(payload.detail || `${url}_failed:${response.status}`);
    throw new Error(detail);
  }

  return payload as unknown as T;
}

export async function getMeta(): Promise<{ authMode: string }> {
  return fetchJson<{ authMode: string }>("/v1/meta");
}

export async function getAlerts(cfg: AuthConfig): Promise<Alert[]> {
  const payload = await fetchJson<{ alerts: Alert[] }>("/v1/alerts", {
    headers: buildHeaders(cfg),
  });
  return payload.alerts || [];
}

export async function getBrief(cfg: AuthConfig): Promise<JsonValue> {
  return fetchJson<JsonValue>("/v1/briefs/now", {
    method: "POST",
    headers: buildHeaders(cfg, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      tenantId: cfg.tenantId,
      userId: cfg.userId,
      scope: { regions: [], entities: [], domains: [] },
    }),
  });
}

export async function getCounters(cfg: AuthConfig): Promise<OpsCounters> {
  return fetchJson<OpsCounters>("/v1/ops/counters", {
    headers: buildHeaders(cfg),
  });
}
