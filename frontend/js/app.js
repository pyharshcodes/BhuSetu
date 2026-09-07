import { api } from "./api.js";
import { el, errorBlock, loadingBlock, ICONS } from "./ui.js";
import { LandingView } from "./views/landing.js";
import { DashboardView } from "./views/dashboard.js";
import { MapView } from "./views/map_view.js";
import { ReportsView } from "./views/reports.js";
import { AlertsView } from "./views/alerts.js";
import { WeatherView } from "./views/weather.js";
import { CommunityView } from "./views/community.js";
import { ResourcesView } from "./views/resources.js";
import { SettingsView } from "./views/settings.js";
import { ExplainView } from "./views/explain.js";
import { RiskAnalysisView } from "./views/risk_analysis.js";
import { SurakshaSetuView } from "./views/suraksha_setu.js";
import { openSosModal } from "./emergency_intel.js";

const appRoot = document.getElementById("app");
const navRoot = document.getElementById("nav");
const sidebarRoot = document.getElementById("sidebar");

let state = {
  corridors: [],
  selectedCorridorId: null,
  backendStatus: "checking", // checking | ok | down
  lastUpdated: new Date(),
  activeAlertCount: 3,
  isOfflineMode: false,
};

const ROUTES = {
  "#/": renderLanding,
  "#/dashboard": renderDashboard,
  "#/risk-analysis": renderRiskAnalysis,
  "#/suraksha-setu": renderSurakshaSetu,
  "#/map": renderMap,
  "#/alerts": renderAlerts,
  "#/reports": renderReports,
  "#/weather": renderWeather,
  "#/community": renderCommunity,
  "#/resources": renderResources,
  "#/settings": renderSettings,
  "#/explain": renderExplain,
};

async function boot() {
  renderHeader();
  renderSidebar();
  await checkHealthAndLoadCorridors();
  window.addEventListener("hashchange", route);
  window.addEventListener("offline", () => {
    state.isOfflineMode = true;
    renderHeader();
    updateOfflineBanner();
  });
  window.addEventListener("online", () => {
    state.isOfflineMode = false;
    renderHeader();
    updateOfflineBanner();
  });
  if (!location.hash) location.hash = "#/";
  route();
}

async function checkHealthAndLoadCorridors() {
  try {
    const [health, corridors, alerts] = await Promise.all([
      api.health(),
      api.listCorridors(),
      api.listAlerts("YELLOW").catch(() => []),
    ]);
    state.backendStatus = "ok";
    state.simulationMode = health.simulation_mode;
    state.modelMode = health.model_mode;
    state.corridors = corridors;
    const activeList = Array.isArray(alerts) ? alerts.filter((a) => a.alert_level === "RED" || a.alert_level === "ORANGE" || a.alert_level === "YELLOW") : [];
    state.activeAlertCount = activeList.length;
    if (state.corridors.length && !state.selectedCorridorId) {
      // Find Dima Hasao as default if present, else first corridor
      const dima = state.corridors.find((c) => c.name.includes("Dima Hasao"));
      state.selectedCorridorId = dima ? dima.id : state.corridors[0].id;
    }
  } catch (err) {
    state.backendStatus = "down";
    state.backendError = err.message;
  }
  renderHeader();
  renderSidebar();
}

function renderHeader() {
  navRoot.innerHTML = "";

  // Left: Logo & System Brand matching reference image
  const brand = el("a", { href: "#/", class: "header-brand" }, [
    el("div", { class: "brand-icon-box" }, [
      el("img", { src: "assets/bhusetu-logo.jpg", alt: "BhuSetu Logo", class: "brand-logo-img" }),
    ]),
    el("div", { class: "brand-text-block" }, [
      el("div", { class: "brand-title" }, "BhuSetu"),
      el("div", { class: "brand-subtitle" }, "Safer Hills, Stronger Communities"),
    ]),
  ]);

  // Center: Search input matching reference image
  const searchBox = el("div", { class: "header-search-box" }, [
    el("span", { class: "search-icon", html: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>` }),
    el("input", {
      type: "text",
      class: "header-search-input",
      placeholder: "Search district, village or corridor...",
      onkeydown: (e) => {
        if (e.key === "Enter" && e.target.value) {
          location.hash = "#/map";
        }
      },
    }),
    el("kbd", { class: "search-kbd tiny mono" }, "Ctrl + K"),
  ]);

  // Dark/Light Mode Dual Pill Switcher matching reference image
  const currentTheme = document.documentElement.getAttribute("data-theme") || "dark";
  const themeSwitcher = el("div", { class: "header-theme-toggle-group" }, [
    el(
      "button",
      {
        class: `theme-toggle-pill-btn ${currentTheme === "light" ? "active" : ""}`,
        title: "Switch to Light Mode",
        onclick: () => {
          document.documentElement.setAttribute("data-theme", "light");
          localStorage.setItem("ews-theme", "light");
          renderHeader();
        },
      },
      [
        el("span", { class: "pill-icon", html: ICONS.sun }),
        el("span", {}, "Light"),
      ]
    ),
    el(
      "button",
      {
        class: `theme-toggle-pill-btn ${currentTheme === "dark" ? "active" : ""}`,
        title: "Switch to Dark Mode",
        onclick: () => {
          document.documentElement.setAttribute("data-theme", "dark");
          localStorage.setItem("ews-theme", "dark");
          renderHeader();
        },
      },
      [
        el("span", { class: "pill-icon", html: ICONS.moon }),
        el("span", {}, "Dark"),
      ]
    ),
  ]);

  // Notification Bell with dynamic badge counter
  const alertCount = state.activeAlertCount != null ? state.activeAlertCount : 0;
  const bellBtn = el("a", { href: "#/alerts", class: "header-bell-btn", title: `${alertCount} Active Alerts` }, [
    el("span", { class: "bell-icon", html: ICONS.bell }),
    el("span", { class: "bell-badge-count" }, String(alertCount)),
  ]);

  // User profile avatar badge "HC" + "Hello, Harsh" + "Team SIH26001"
  const userProfile = el("div", { class: "header-user-profile" }, [
    el("div", { class: "user-avatar-circle" }, "HC"),
    el("div", { class: "user-meta-text" }, [
      el("span", { class: "user-name" }, "Hello, Harsh"),
      el("span", { class: "user-team muted tiny mono" }, "Team SIH26001"),
    ]),
  ]);

  // Backend status indicator (preserves test suite compatibility)
  const statusDot = el("span", {
    class: `status-dot status-${state.backendStatus}`,
    title: state.backendStatus === "ok" ? "Backend connected" : "Backend unreachable",
  });
  const statusText = el(
    "span",
    { class: "muted tiny mono" },
    state.backendStatus === "ok"
      ? (state.simulationMode ? "Simulated" : "Live")
      : "Offline"
  );
  const statusPill = el("div", { class: "header-status-pill" }, [statusDot, statusText]);

  // Offline / Low-Bandwidth Mode Toggle Button
  const offlineBtn = el(
    "button",
    {
      class: `header-offline-pill offline-toggle-btn ${state.isOfflineMode ? "active" : ""}`,
      title: state.isOfflineMode ? "Disable Offline Mode" : "Activate Offline / Low-Bandwidth Mode",
      onclick: () => {
        state.isOfflineMode = !state.isOfflineMode;
        renderHeader();
        updateOfflineBanner();
      },
    },
    [
      el("span", { class: "offline-icon" }, "📶"),
      el("span", { class: "offline-text mono tiny" }, state.isOfflineMode ? "Offline" : "Low-BW"),
    ]
  );

  // Mobile menu button with backdrop overlay
  const menuBtn = el("button", {
    id: "menu-btn",
    class: "header-menu-btn",
    "aria-label": "Toggle navigation menu",
    onclick: () => {
      if (sidebarRoot) {
        const isOpen = sidebarRoot.classList.toggle("sidebar-open");
        let backdrop = document.getElementById("sidebar-mobile-backdrop");
        if (!backdrop) {
          backdrop = document.createElement("div");
          backdrop.id = "sidebar-mobile-backdrop";
          backdrop.className = "sidebar-mobile-backdrop";
          backdrop.onclick = () => closeMobileSidebar();
          document.body.appendChild(backdrop);
        }
        if (isOpen) {
          backdrop.classList.add("active");
        } else {
          backdrop.classList.remove("active");
        }
      }
    },
  }, [el("span", { html: ICONS.menu })]);

  navRoot.appendChild(brand);
  navRoot.appendChild(searchBox);
  navRoot.appendChild(
    el("div", { class: "header-right-actions" }, [
      offlineBtn,
      themeSwitcher,
      bellBtn,
      userProfile,
      statusPill,
      menuBtn,
    ])
  );
}

function updateOfflineBanner() {
  let banner = document.getElementById("offline-emergency-banner");
  if (state.isOfflineMode) {
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "offline-emergency-banner";
      banner.className = "offline-emergency-banner";
      banner.innerHTML = `
        <div class="banner-inner flex-between">
          <div class="banner-left">
            <span class="pulse-beacon-dot" style="background:#eab308;"></span>
            <strong>📶 OFFLINE EMERGENCY PROTOCOL:</strong> Operating in disconnected low-bandwidth mode on local cached telemetry.
          </div>
          <button id="banner-sos-btn" class="btn btn-primary btn-small btn-sos-trigger" style="background:#dc2626; border-color:#ef4444; padding:4px 12px; font-weight:bold;">
            🚨 112 Cellular SOS Beacon
          </button>
        </div>
      `;
      const navEl = document.getElementById("nav");
      if (navEl && navEl.parentNode) {
        navEl.parentNode.insertBefore(banner, navEl.nextSibling);
      }
      const sosBtn = document.getElementById("banner-sos-btn");
      if (sosBtn) {
        sosBtn.onclick = () => {
          const corridor = state.corridors.find(c => c.id === state.selectedCorridorId) || state.corridors[0];
          openSosModal({ corridor, villages: [], latest_risk: { fused_risk_score: 85, alert_level: "RED" } });
        };
      }
    }
  } else {
    if (banner) banner.remove();
  }
}

function renderSidebar() {
  if (!sidebarRoot) return;
  sidebarRoot.innerHTML = "";

  const hash = location.hash || "#/";

  const navItems = [
    { href: "#/dashboard", label: "Dashboard", icon: ICONS.dashboard },
    { href: "#/risk-analysis", label: "Risk Analysis", icon: ICONS.peak },
    { href: "#/suraksha-setu", label: "Suraksha Setu", icon: ICONS.shield },
    { href: "#/weather", label: "Live Monitoring", icon: ICONS.radar },
    { href: "#/map", label: "Map View", icon: ICONS.map },
    { href: "#/reports", label: "Field Reports", icon: ICONS.reports },
    { href: "#/community", label: "Citizen Reports", icon: ICONS.community },
    { href: "#/alerts", label: "Alerts & SMS Broadcast", icon: ICONS.broadcast },
    { href: "#/explain", label: "Explain / Ask", icon: ICONS.explain },
    { href: "#/settings", label: "Settings", icon: ICONS.settings },
  ];

  const itemsList = el("div", { class: "sidebar-nav-list" },
    navItems.map((item) => {
      const isDashboardActive = item.label === "Dashboard" && (hash === "#/" || hash === "#/dashboard");
      const isOtherActive = hash === item.href && item.label !== "Dashboard";
      const isActive = isDashboardActive || isOtherActive;

      return el(
        "a",
        {
          href: item.href,
          class: `sidebar-nav-item ${isActive ? "active" : ""}`,
          onclick: () => {
            if (sidebarRoot) sidebarRoot.classList.remove("sidebar-open");
          },
        },
        [
          el("span", { class: "sidebar-icon", html: item.icon }),
          el("span", { class: "sidebar-label" }, item.label),
        ]
      );
    })
  );

  sidebarRoot.appendChild(itemsList);

  // Bottom Slogan & Emergency Call 112 Card matching reference image
  const bottomBadge = el("div", { class: "sidebar-bottom-badge" }, [
    el("div", { class: "sidebar-slogan-text" }, [
      el("div", { class: "slogan-top" }, "Prepared Communities"),
      el("div", { class: "slogan-bottom" }, "Resilient Northeast"),
    ]),
    el("a", { href: "tel:112", class: "sidebar-emergency-card" }, [
      el("div", { class: "emergency-icon-wrap" }, [el("span", { html: ICONS.phone })]),
      el("div", { class: "emergency-text-wrap" }, [
        el("span", { class: "em-sub tiny" }, "In Emergency"),
        el("span", { class: "em-number" }, "Call 112"),
        el("span", { class: "em-label tiny" }, "Disaster Helpline"),
      ]),
    ]),
  ]);
  sidebarRoot.appendChild(bottomBadge);
}

function closeMobileSidebar() {
  if (sidebarRoot) sidebarRoot.classList.remove("sidebar-open");
  const backdrop = document.getElementById("sidebar-mobile-backdrop");
  if (backdrop) backdrop.classList.remove("active");
}

function route() {
  closeMobileSidebar();
  renderHeader();
  renderSidebar();
  const hash = location.hash || "#/";
  const handler = ROUTES[hash] || renderLanding;
  handler();
}

function requireBackend() {
  if (state.backendStatus === "down") {
    appRoot.innerHTML = "";
    appRoot.appendChild(
      el("div", { class: "page" }, [
        errorBlock(
          `Cannot reach the backend (${state.backendError || "unknown error"}). Make sure it is running: ` +
            `cd backend && python app.py — then reopen this page from the URL it prints.`,
          async () => {
            appRoot.innerHTML = "";
            appRoot.appendChild(el("div", { class: "page" }, [loadingBlock("Reconnecting…")]));
            await checkHealthAndLoadCorridors();
            route();
          }
        ),
      ])
    );
    return false;
  }
  if (state.backendStatus === "checking") {
    appRoot.innerHTML = "";
    appRoot.appendChild(el("div", { class: "page" }, [loadingBlock("Connecting to backend…")]));
    return false;
  }
  return true;
}

function renderLanding() {
  LandingView(appRoot, { onEnter: () => (location.hash = "#/dashboard") });
}

function renderDashboard() {
  if (!requireBackend()) return;
  DashboardView(appRoot, {
    corridorId: state.selectedCorridorId,
    corridors: state.corridors,
    onCorridorChange: (id) => {
      state.selectedCorridorId = id;
      renderDashboard();
    },
  });
}

function renderMap() {
  if (!requireBackend()) return;
  MapView(appRoot, {
    corridorId: state.selectedCorridorId,
    corridors: state.corridors,
    onCorridorChange: (id) => {
      state.selectedCorridorId = id;
      renderMap();
    },
  });
}

function renderReports() {
  if (!requireBackend()) return;
  ReportsView(appRoot, {
    corridorId: state.selectedCorridorId,
    corridors: state.corridors,
    onCorridorChange: (id) => {
      state.selectedCorridorId = id;
      renderReports();
    },
  });
}

function renderAlerts() {
  if (!requireBackend()) return;
  AlertsView(appRoot);
}

function renderWeather() {
  if (!requireBackend()) return;
  WeatherView(appRoot, {
    corridorId: state.selectedCorridorId,
    corridors: state.corridors,
    onCorridorChange: (id) => {
      state.selectedCorridorId = id;
      renderWeather();
    },
  });
}

function renderCommunity() {
  if (!requireBackend()) return;
  CommunityView(appRoot, {
    corridorId: state.selectedCorridorId,
    corridors: state.corridors,
    onCorridorChange: (id) => {
      state.selectedCorridorId = id;
      renderCommunity();
    },
  });
}

function renderResources() {
  ResourcesView(appRoot);
}

function renderSettings() {
  SettingsView(appRoot);
}

function renderExplain() {
  if (!requireBackend()) return;
  ExplainView(appRoot, {
    corridorId: state.selectedCorridorId,
    corridors: state.corridors,
    onCorridorChange: (id) => {
      state.selectedCorridorId = id;
      renderExplain();
    },
  });
}


function renderRiskAnalysis() {
  if (!requireBackend()) return;
  RiskAnalysisView(appRoot, {
    corridorId: state.selectedCorridorId,
    corridors: state.corridors,
    onCorridorChange: (id) => {
      state.selectedCorridorId = id;
      renderRiskAnalysis();
    },
  });
}


function renderSurakshaSetu() {
  if (!requireBackend()) return;
  SurakshaSetuView(appRoot, {
    corridorId: state.selectedCorridorId,
    corridors: state.corridors,
    onCorridorChange: (id) => {
      state.selectedCorridorId = id;
      renderSurakshaSetu();
    },
  });
}

boot();

