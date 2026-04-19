export type Alert = {
  alert_id: string;
  event_id?: string;
  snapshot?: string;
  severity?: "low" | "medium" | "high" | "critical" | string;
  confidence?: number;
  drivers?: string[];
  contradictions?: string[];
  forecast?: string;
  recommended_actions?: string[];
  source?: string;
  category?: string;
  link?: string;
  timestamp?: string;
  source_details?: {
    officialLabel?: string;
    officialUrl?: string;
    articleLabel?: string;
    articleUrl?: string;
  };
  credibility?: {
    label: string;
    score: number;
    note: string;
    color: string;
  };
  confidence_details?: {
    summary: string;
    factors: string[];
  };
  uncertainty?: Record<string, unknown>;
  location?: {
    geo?: {
      lat?: number;
      lon?: number;
    };
  };
};

export type OpsCounters = {
  authMode: string;
  eventRecords: number;
  auditAssignments: number;
};

export type AuthConfig = {
  mode: "header" | "token";
  tenantId: string;
  userId: string;
  roles: string;
  token: string;
};
