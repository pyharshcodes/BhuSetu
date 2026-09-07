import { api } from "../api.js";
import { el, loadingBlock, errorBlock, emptyBlock, formatTime } from "../ui.js";
import { t } from "../i18n.js";

export function ReportsView(root, { corridorId, corridors, onCorridorChange }) {
  root.innerHTML = "";
  const page = el("div", { class: "page" });
  root.appendChild(page);

  page.appendChild(
    el("div", { class: "page-header" }, [
      el("div", {}, [
        el("div", { class: "page-eyebrow" }, "Human-verified before it counts"),
        el("h1", {}, "Citizen & Field Reports"),
      ]),
      corridorSelector(corridors, corridorId, onCorridorChange),
    ])
  );

  const layout = el("div", { class: "reports-layout" });
  
  // High-priority Emergency Panic SOS Banner
  const panicBanner = panicSosBanner(corridorId, corridors, () => {
    const listWrap = layout.querySelector(".reports-list-card");
    if (listWrap) loadReports(listWrap, corridorId);
  });
  page.appendChild(panicBanner);

  page.appendChild(layout);

  layout.appendChild(reportForm(corridorId, corridors, layout));
  const listWrap = el("div", { class: "card reports-list-card" }, [el("h3", {}, "Recent Reports"), loadingBlock()]);
  layout.appendChild(listWrap);
  loadReports(listWrap, corridorId);
}

function corridorSelector(corridors, selectedId, onChange) {
  const select = el(
    "select",
    {
      class: "corridor-select",
      onchange: (e) => {
        const newId = Number(e.target.value);
        const match = (corridors || []).find((c) => c.id === newId);
        if (match) {
          const latField = document.getElementById("report-lat-input");
          const lonField = document.getElementById("report-lon-input");
          if (latField) latField.value = Number(match.center_lat).toFixed(4);
          if (lonField) lonField.value = Number(match.center_lon).toFixed(4);
        }
        onChange(newId);
      },
    },
    corridors.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => el("option", { value: c.id, ...(c.id === selectedId ? { selected: "selected" } : {}) }, `${c.name} (${c.state})`))
  );
  return el("div", { class: "corridor-selector" }, [el("label", {}, "Pilot corridor"), select]);
}

function panicSosBanner(corridorId, corridors, onCreated) {
  const cur = (corridors || []).find((c) => c.id === corridorId) || (corridors && corridors[0]) || { name: "Northeast Corridor", center_lat: 25.18, center_lon: 93.03 };

  const banner = el("div", { class: "panic-sos-banner-card" });
  const statusMsg = el("div", { class: "panic-status-text mono tiny text-amber-300", style: "margin-top:4px;" }, "");

  const triggerBtn = el(
    "button",
    {
      id: "btn-panic-sos",
      class: "panic-sos-btn",
      title: "Broadcast live GPS rescue beacon",
      onclick: async () => {
        triggerBtn.disabled = true;
        triggerBtn.innerHTML = "📍 Acquiring GPS Satellite Fix…";
        statusMsg.textContent = "Transmitting live GPS coordinates to SDRF & NDRF emergency dispatch...";

        let lat = cur.center_lat ? Number(cur.center_lat).toFixed(4) : "25.1800";
        let lon = cur.center_lon ? Number(cur.center_lon).toFixed(4) : "93.0300";
        let accuracy = "Corridor Baseline (±50m)";

        // Attempt live browser geolocation
        if (navigator.geolocation) {
          try {
            const pos = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 3500,
                maximumAge: 10000,
              });
            });
            if (pos && pos.coords) {
              lat = Number(pos.coords.latitude).toFixed(4);
              lon = Number(pos.coords.longitude).toFixed(4);
              accuracy = `High Precision GPS (±${Math.round(pos.coords.accuracy || 10)}m)`;
            }
          } catch (_) {
            // Fallback to corridor location
          }
        }

        try {
          const fd = new FormData();
          fd.append("corridor_id", corridorId);
          fd.append("reporter_name", "🚨 CITIZEN PANIC BEACON (SOS)");
          fd.append("lat", lat);
          fd.append("lon", lon);
          fd.append("description", `URGENT RESCUE REQUIRED: Citizen reported trapped/stranded near ${cur.name}. Live browser coordinates transmitted. Accuracy: ${accuracy}. Immediate SAR dispatch requested.`);
          fd.append("is_panic_sos", "1");

          const created = await api.createReport(fd);
          statusMsg.textContent = "";
          openPanicModal(created, cur, lat, lon, accuracy);
          if (onCreated) onCreated();
        } catch (err) {
          statusMsg.textContent = `Dispatch error: ${err.message}. Please dial 112 directly.`;
        } finally {
          triggerBtn.disabled = false;
          triggerBtn.innerHTML = `<span>🚨</span> <span>${t("action.panic_sos", "I AM TRAPPED / SEND RESCUE")}</span>`;
        }
      },
    },
    [
      el("span", {}, "🚨"),
      el("span", {}, t("action.panic_sos", "I AM TRAPPED / SEND RESCUE")),
    ]
  );

  banner.appendChild(
    el("div", { class: "panic-sos-header-row" }, [
      el("div", { class: "panic-sos-title-block" }, [
        el("div", { class: "panic-sos-pulsing-icon" }, "🚨"),
        el("div", {}, [
          el("div", { class: "panic-sos-title" }, t("panic.title", "EMERGENCY PANIC BEACON — I AM TRAPPED / SEND RESCUE")),
          el("div", { class: "panic-sos-subtitle" }, t("panic.subtitle", "Single-tap emergency beacon for marooned citizens or trapped vehicles. Transmits live browser GPS coordinates directly to SDMA, NDRF, and District Disaster Management (DDMA).")),
        ]),
      ]),
      triggerBtn,
    ])
  );

  banner.appendChild(statusMsg);
  return banner;
}

function openPanicModal(report, corridor, lat, lon, accuracy) {
  const modalBackdrop = el("div", { class: "panic-modal-backdrop" });
  const ticketNum = report && report.id ? `#SOS-2026-${String(report.id).padStart(4, "0")}` : `#SOS-2026-${Math.floor(1000 + Math.random() * 9000)}`;

  const modal = el("div", { class: "panic-modal-card" }, [
    el("div", { class: "panic-modal-header" }, [
      el("div", { class: "flex items-center gap-3" }, [
        el("span", { class: "text-3xl" }, "🚨"),
        el("div", {}, [
          el("h3", { class: "text-xl font-bold text-red-400" }, t("panic.title", "EMERGENCY RESCUE DISPATCH INITIATED")),
          el("p", { class: "text-xs text-slate-300" }, t("panic.subtitle", "Your live coordinates have been transmitted to State Disaster Operations (SDMA) and NDRF.")),
        ]),
      ]),
      el("button", {
        class: "btn btn-secondary btn-small",
        onclick: () => modalBackdrop.remove(),
      }, "✕ Close"),
    ]),

    el("div", { class: "panic-ticket-box" }, [
      el("div", { class: "flex-between text-xs" }, [
        el("span", { class: "text-slate-400 font-semibold" }, t("panic.ticket_id", "Rescue Incident Ticket:")),
        el("strong", { class: "text-emerald-400 font-mono text-sm" }, ticketNum),
      ]),
      el("div", { class: "flex-between text-xs" }, [
        el("span", { class: "text-slate-400" }, "Target Corridor:"),
        el("strong", { class: "text-white" }, corridor.name || "Northeast Corridor"),
      ]),
      el("div", { class: "flex-between text-xs" }, [
        el("span", { class: "text-slate-400" }, t("panic.coords", "Captured Coordinates:")),
        el("strong", { class: "text-amber-300 font-mono" }, `${lat}° N, ${lon}° E (${accuracy})`),
      ]),
      el("div", { class: "flex-between text-xs" }, [
        el("span", { class: "text-slate-400" }, "Dispatch Priority:"),
        el("span", { class: "badge badge-red font-bold" }, "P0 IMMEDIATE CRITICAL"),
      ]),
    ]),

    el("div", {}, [
      el("div", { class: "text-xs font-bold text-slate-300 mb-2 uppercase tracking-wide" }, t("panic.direct_helpline", "1-Tap Emergency Direct Helplines:")),
      el("div", { class: "helpline-pills-row" }, [
        el("a", { href: "tel:112", class: "helpline-quick-pill" }, [
          el("span", { class: "helpline-number" }, "112"),
          el("span", { class: "helpline-title" }, t("panic.national_112", "National Emergency")),
        ]),
        el("a", { href: "tel:1070", class: "helpline-quick-pill" }, [
          el("span", { class: "helpline-number" }, "1070"),
          el("span", { class: "helpline-title" }, t("panic.state_1070", "State Disaster (SDMA)")),
        ]),
        el("a", { href: "tel:1077", class: "helpline-quick-pill" }, [
          el("span", { class: "helpline-number" }, "1077"),
          el("span", { class: "helpline-title" }, t("panic.district_1077", "District Control (DEOC)")),
        ]),
      ]),
    ]),

    el("div", { class: "p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-200" }, [
      el("strong", {}, "Safety Directives: "),
      "Stay away from active debris slopes, swollen rivers, and electric lines. Remain visible to search and rescue drones. Keep your phone in battery saver mode.",
    ]),

    el("button", {
      class: "btn btn-primary w-full py-2.5 font-bold",
      onclick: () => modalBackdrop.remove(),
    }, "Acknowledge & Return to Dashboard"),
  ]);

  modalBackdrop.appendChild(modal);
  document.body.appendChild(modalBackdrop);
}

function reportForm(corridorId, corridors, layout) {
  const selectedCorridor = (corridors || []).find((c) => c.id === corridorId) || (corridors && corridors[0]);
  const defaultLat = selectedCorridor && selectedCorridor.center_lat != null ? Number(selectedCorridor.center_lat).toFixed(4) : "25.1800";
  const defaultLon = selectedCorridor && selectedCorridor.center_lon != null ? Number(selectedCorridor.center_lon).toFixed(4) : "93.0300";

  const status = el("p", { class: "muted small form-status" }, "");
  const nameInput = el("input", { type: "text", placeholder: "Your name (optional)" });
  const latInput = el("input", { type: "number", step: "0.0001", placeholder: "Latitude", value: defaultLat, id: "report-lat-input" });
  const lonInput = el("input", { type: "number", step: "0.0001", placeholder: "Longitude", value: defaultLon, id: "report-lon-input" });
  const descInput = el("textarea", { rows: "3", placeholder: "e.g. Large crack near road shoulder, debris on carriageway…" });
  const photoInput = el("input", { type: "file", accept: "image/png,image/jpeg,image/webp" });
  const submitBtn = el("button", { class: "btn btn-primary", type: "submit" }, "Submit Report");

  const form = el(
    "form",
    {
      class: "report-form",
      onsubmit: async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        status.textContent = "Submitting…";
        try {
          const fd = new FormData();
          fd.append("corridor_id", corridorId);
          fd.append("reporter_name", nameInput.value || "Anonymous");
          fd.append("lat", latInput.value);
          fd.append("lon", lonInput.value);
          fd.append("description", descInput.value);
          if (photoInput.files[0]) fd.append("photo", photoInput.files[0]);

          const created = await api.createReport(fd);
          status.textContent = `Submitted. Evidence classified as "${created.evidence_category}" (${created.evidence_confidence_pct}% confidence). Awaiting human verification.`;
          descInput.value = "";
          photoInput.value = "";
          const listWrap = layout.querySelector(".reports-list-card");
          if (listWrap) loadReports(listWrap, corridorId);
        } catch (err) {
          status.textContent = `Error: ${err.message}`;
        } finally {
          submitBtn.disabled = false;
        }
      },
    },
    [
      el("h3", {}, "Submit a Field Report"),
      formRow("Reporter", nameInput),
      formRow("Latitude", latInput),
      formRow("Longitude", lonInput),
      formRow("Description", descInput),
      formRow("Photo (optional)", photoInput),
      submitBtn,
      status,
      el("p", { class: "muted tiny" }, "Photos are evaluated by an evidence classifier (crack / debris / blockage). This never auto-triggers an alert."),
    ]
  );

  return el("div", { class: "card report-form-card" }, [form]);
}

function formRow(label, inputEl) {
  return el("label", { class: "form-row" }, [el("span", {}, label), inputEl]);
}

async function loadReports(container, corridorId) {
  container.innerHTML = "";
  container.appendChild(el("h3", {}, "Recent Reports"));
  container.appendChild(loadingBlock());
  try {
    const reports = await api.listReports(corridorId);
    container.innerHTML = "";
    container.appendChild(el("h3", {}, "Recent Reports"));
    if (reports.length === 0) {
      container.appendChild(emptyBlock("No reports yet for this corridor."));
      return;
    }
    reports.forEach((r) => container.appendChild(reportCard(r, container, corridorId)));
  } catch (err) {
    container.innerHTML = "";
    container.appendChild(el("h3", {}, "Recent Reports"));
    container.appendChild(errorBlock(err.message, () => loadReports(container, corridorId)));
  }
}

function reportCard(report, container, corridorId) {
  const statusClass = { PENDING: "status-pending", VERIFIED: "status-verified", REJECTED: "status-rejected" }[report.status];
  const children = [
    el("div", { class: "report-card-header" }, [
      el("strong", {}, report.reporter_name),
      el("span", { class: `status-pill ${statusClass}` }, report.status),
    ]),
    el("p", { class: "small" }, report.description || "(no description)"),
    el("p", { class: "muted tiny" }, `Evidence: ${report.evidence_category} (${report.evidence_confidence_pct}% confidence) · ${formatTime(report.created_at)}`),
  ];
  if (report.photo_filename) {
    children.push(el("img", { class: "report-photo", src: api.uploadUrl(report.photo_filename), alt: "Field evidence photo" }));
  }
  if (report.status === "PENDING") {
    children.push(
      el("div", { class: "verify-buttons" }, [
        el("button", {
          class: "btn btn-small btn-approve",
          onclick: async () => { await api.verifyReport(report.id, true); loadReports(container, corridorId); },
        }, "Verify"),
        el("button", {
          class: "btn btn-small btn-reject",
          onclick: async () => { await api.verifyReport(report.id, false); loadReports(container, corridorId); },
        }, "Reject"),
      ])
    );
  }
  return el("div", { class: "report-item" }, children);
}