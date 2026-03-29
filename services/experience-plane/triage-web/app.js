/* ============================================================
   Planetary Intelligence Platform - Triage Web Application
   WorldMonitor-inspired UI with live data integration
   ============================================================ */

// DOM Elements
const alertList = document.getElementById("alertList");
const details = document.getElementById("details");
const briefOut = document.getElementById("briefOut");
const refreshBtn = document.getElementById("refreshBtn");

const alertsCountChip = document.getElementById("alertsCountChip");
const eventsCountChip = document.getElementById("eventsCountChip");
const auditCountChip = document.getElementById("auditCountChip");
const liveChip = document.getElementById("liveChip");
const statusDot = document.getElementById("statusDot");
const headerClock = document.getElementById("headerClock");
const alertsBadge = document.getElementById("alertsBadge");
const briefTime = document.getElementById("briefTime");

// Country panel elements
const countryPanel = document.getElementById("countryPanel");
const countryPanelClose = document.getElementById("countryPanelClose");
const countryPanelContent = document.getElementById("countryPanelContent");

// Map elements
const mapDimensionBtns = document.querySelectorAll(".map-dim-btn");
const mapFullscreenBtn = document.getElementById("mapFullscreenBtn");
const mapSection = document.getElementById("mapSection");

// State
let currentAlerts = [];
let selectedAlert = null;
let autoRefreshHandle = null;
let map = null;
let markersLayer = null;

// Default auth config
const AUTH_CONFIG = {
  mode: "header",
  tenantId: "tenant-demo",
  userId: "user-demo",
  roles: "analyst",
};

/* ============================================================
   Utility Functions
   ============================================================ */

function buildRequestHeaders(extra = {}) {
  const headers = { ...extra };
  headers["X-Tenant-ID"] = AUTH_CONFIG.tenantId;
  headers["X-User-ID"] = AUTH_CONFIG.userId;
  headers["X-Roles"] = AUTH_CONFIG.roles;
  return headers;
}

function severityClass(sev) {
  return `sev-${String(sev || "low")}`;
}

function seededCoordinates(seed) {
  let hash = 0;
  const text = String(seed || "unknown");
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const lat = ((Math.abs(hash) % 16000) / 100) - 80;
  const lon = ((Math.abs(hash * 97) % 36000) / 100) - 180;
  return { lat, lon };
}

function extractCoordinates(alert) {
  const loc = alert.location || {};
  const geo = loc.geo || {};
  const lat = Number(geo.lat);
  const lon = Number(geo.lon);
  if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
    return { lat, lon };
  }
  return seededCoordinates(alert.event_id || alert.alert_id || "unknown");
}

function markerColorForSeverity(severity) {
  if (severity === "critical") return "#ff4444";
  if (severity === "high") return "#ff8800";
  if (severity === "medium") return "#ffaa00";
  return "#44aa44";
}

function formatTime(date) {
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatDateTime(date) {
  return date.toLocaleString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/* ============================================================
   Clock Update
   ============================================================ */

function updateClock() {
  if (headerClock) {
    const now = new Date();
    headerClock.textContent = `${formatDateTime(now)} UTC`;
  }
}

setInterval(updateClock, 1000);
updateClock();

/* ============================================================
   Map Functions
   ============================================================ */

function ensureMap() {
  if (map || typeof L === "undefined") {
    return;
  }

  // Dark-themed map tiles
  const darkTiles = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

  map = L.map("mapCanvas", {
    center: [20, 0],
    zoom: 2,
    worldCopyJump: true,
    zoomControl: true,
    attributionControl: true,
  });

  L.tileLayer(darkTiles, {
    maxZoom: 18,
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> | OpenStreetMap',
    subdomains: "abcd",
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);

  // Handle map click for country panel (placeholder)
  map.on("click", (e) => {
    // Could be extended to show country panel on click
    console.log("Map clicked:", e.latlng);
  });
}

function renderMap(alerts) {
  ensureMap();
  if (!map || !markersLayer) {
    return;
  }

  markersLayer.clearLayers();
  const latLngs = [];

  alerts.forEach((alert) => {
    const coords = extractCoordinates(alert);
    latLngs.push([coords.lat, coords.lon]);

    const marker = L.circleMarker([coords.lat, coords.lon], {
      radius: 8,
      color: markerColorForSeverity(alert.severity),
      weight: 2,
      fillOpacity: 0.7,
      fillColor: markerColorForSeverity(alert.severity),
    });

    marker.bindPopup(`
      <div style="min-width: 200px">
        <div style="font-weight: 600; margin-bottom: 4px; color: ${markerColorForSeverity(alert.severity)}">
          ${(alert.severity || "low").toUpperCase()}
        </div>
        <div style="margin-bottom: 6px">${alert.snapshot || "No summary"}</div>
        <div style="font-size: 10px; color: #888">
          Confidence: ${Number(alert.confidence || 0).toFixed(2)}
        </div>
      </div>
    `);

    marker.on("click", () => {
      selectAlert(alert);
    });

    marker.addTo(markersLayer);
  });

  if (latLngs.length > 0) {
    const bounds = L.latLngBounds(latLngs);
    map.fitBounds(bounds.pad(0.25), { maxZoom: 5 });
  }
}

/* ============================================================
   Alert Functions
   ============================================================ */

function selectAlert(alert) {
  selectedAlert = alert;

  // Update selection state in list
  document.querySelectorAll(".alert-item").forEach((item) => {
    item.classList.remove("selected");
    if (item.dataset.alertId === alert.alert_id) {
      item.classList.add("selected");
    }
  });

  renderDetails(alert);
}

function renderAlerts(alerts) {
  alertList.innerHTML = "";

  const count = alerts.length;
  alertsCountChip.innerHTML = `<span class="chip-icon">🚨</span> ALERTS ${count}`;
  if (alertsBadge) {
    alertsBadge.textContent = count;
    alertsBadge.style.background = count > 0 ? "var(--sev-critical)" : "var(--text-muted)";
  }

  alerts.forEach((alert, idx) => {
    const li = document.createElement("li");
    li.className = `alert-item ${severityClass(alert.severity)}`;
    li.dataset.alertId = alert.alert_id;
    li.style.animationDelay = `${idx * 50}ms`;

    if (selectedAlert && selectedAlert.alert_id === alert.alert_id) {
      li.classList.add("selected");
    }

    li.innerHTML = `
      <strong>${alert.snapshot || "No snapshot available"}</strong>
      <div class="meta">
        <span class="meta-badge">${(alert.severity || "low").toUpperCase()}</span>
        <span>confidence: ${Number(alert.confidence || 0).toFixed(2)}</span>
      </div>
    `;
    li.addEventListener("click", () => selectAlert(alert));
    alertList.appendChild(li);
  });

  renderMap(alerts);
}

function renderDetails(alert) {
  if (!alert) {
    details.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📊</span>
        <p>Select an alert to inspect explainability fields</p>
      </div>
    `;
    return;
  }

  const drivers = (alert.drivers || []).join(" • ") || "None identified";
  const contradictions = (alert.contradictions || []).join(" • ") || "None found";
  const actions = (alert.recommended_actions || []).map(a => `• ${a}`).join("\n") || "• No specific actions recommended";
  const uncertainty = JSON.stringify(alert.uncertainty || {}, null, 2);

  details.innerHTML = `
    <p><strong>Alert ID</strong>${alert.alert_id}</p>
    <p><strong>Drivers</strong>${drivers}</p>
    <p><strong>Contradictions</strong>${contradictions}</p>
    <p><strong>Forecast</strong>${alert.forecast || "No forecast available"}</p>
    <p><strong>Recommended Actions</strong><pre style="margin-top:4px;white-space:pre-wrap;font-size:10px">${actions}</pre></p>
    <p><strong>Uncertainty</strong><pre style="margin-top:4px;white-space:pre-wrap;font-size:10px">${uncertainty}</pre></p>
  `;
}

/* ============================================================
   API Functions
   ============================================================ */

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }
  if (!response.ok) {
    throw new Error(payload.detail || `${url}_failed:${response.status}`);
  }
  return payload;
}

async function loadServerMeta() {
  const payload = await fetchJson("/v1/meta");
  if (payload.authMode) {
    liveChip.textContent = `AUTH ${payload.authMode}`;
  }
}

async function loadAlerts() {
  const payload = await fetchJson("/v1/alerts", {
    headers: buildRequestHeaders(),
  });
  currentAlerts = payload.alerts || [];
  renderAlerts(currentAlerts);

  // Auto-select first alert if none selected
  if (currentAlerts.length > 0 && !selectedAlert) {
    selectAlert(currentAlerts[0]);
  }
}

async function loadBrief() {
  const payload = await fetchJson("/v1/briefs/now", {
    method: "POST",
    headers: buildRequestHeaders({
      "Content-Type": "application/json",
    }),
    body: JSON.stringify({
      tenantId: AUTH_CONFIG.tenantId,
      userId: AUTH_CONFIG.userId,
      scope: {
        regions: [],
        entities: [],
        domains: [],
      },
    }),
  });
  briefOut.textContent = JSON.stringify(payload, null, 2);
  if (briefTime) {
    briefTime.textContent = `Updated ${formatTime(new Date())}`;
  }
}

async function loadCounters() {
  const payload = await fetchJson("/v1/ops/counters", {
    headers: buildRequestHeaders(),
  });
  auditCountChip.innerHTML = `<span class="chip-icon">📋</span> AUDIT ${Number(payload.auditAssignments || 0)}`;
  eventsCountChip.innerHTML = `<span class="chip-icon">📡</span> EVENTS ${Number(payload.eventRecords || 0)}`;
}

/* ============================================================
   Live Status Management
   ============================================================ */

function setLiveStatus(status) {
  liveChip.textContent = status;

  if (statusDot) {
    statusDot.classList.remove("error", "paused");
    if (status.includes("ERR")) {
      statusDot.classList.add("error");
    } else if (status.includes("PAUSED")) {
      statusDot.classList.add("paused");
    }
  }
}

async function refreshAll() {
  setLiveStatus("LIVE");
  try {
    await Promise.all([loadServerMeta(), loadAlerts(), loadBrief(), loadCounters()]);
  } catch (err) {
    setLiveStatus("LIVE ERR");
    briefOut.textContent = `Refresh error: ${String(err)}`;
  }
}

function startAutoRefresh() {
  if (autoRefreshHandle) {
    clearInterval(autoRefreshHandle);
  }
  autoRefreshHandle = setInterval(() => {
    if (document.hidden) {
      setLiveStatus("LIVE PAUSED");
      return;
    }
    refreshAll().catch((err) => {
      setLiveStatus("LIVE ERR");
      briefOut.textContent = `Refresh error: ${String(err)}`;
    });
  }, 15000);
}

/* ============================================================
   Event Handlers
   ============================================================ */

// Refresh button
refreshBtn.addEventListener("click", refreshAll);

// Visibility change - resume refresh when tab becomes visible
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    refreshAll().catch(() => {
      setLiveStatus("LIVE ERR");
    });
  }
});

// Map dimension toggle (placeholder for future 3D implementation)
mapDimensionBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    mapDimensionBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    const mode = btn.dataset.mode;
    if (mode === "3d") {
      // Placeholder: Could integrate globe.gl here
      console.log("3D mode selected - future implementation");
    } else {
      console.log("2D mode selected");
    }
  });
});

// Map fullscreen toggle
if (mapFullscreenBtn) {
  mapFullscreenBtn.addEventListener("click", () => {
    if (mapSection) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        mapSection.requestFullscreen();
      }
    }
  });
}

// Country panel close
if (countryPanelClose) {
  countryPanelClose.addEventListener("click", () => {
    countryPanel.classList.remove("open");
  });
}

// Map resize handle
const mapResizeHandle = document.querySelector(".map-resize-handle");
if (mapResizeHandle && mapSection) {
  let isResizing = false;
  let startY = 0;
  let startHeight = 0;

  mapResizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startY = e.clientY;
    startHeight = mapSection.offsetHeight;
    mapSection.classList.add("resizing");
    document.body.style.cursor = "ns-resize";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;
    const deltaY = e.clientY - startY;
    const newHeight = Math.max(200, Math.min(window.innerHeight * 0.8, startHeight + deltaY));
    mapSection.style.height = `${newHeight}px`;
    if (map) map.invalidateSize();
  });

  document.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
      mapSection.classList.remove("resizing");
      document.body.style.cursor = "";
    }
  });
}

/* ============================================================
   Initialize
   ============================================================ */

startAutoRefresh();

refreshAll().catch((err) => {
  setLiveStatus("LIVE ERR");
  briefOut.textContent = `Failed to load triage data: ${String(err)}`;
});
