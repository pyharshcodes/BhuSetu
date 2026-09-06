import { api } from "../api.js";
import { el, loadingBlock, errorBlock, emptyBlock, formatTime } from "../ui.js";

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
  page.appendChild(layout);

  layout.appendChild(reportForm(corridorId, layout));
  const listWrap = el("div", { class: "card reports-list-card" }, [el("h3", {}, "Recent Reports"), loadingBlock()]);
  layout.appendChild(listWrap);
  loadReports(listWrap, corridorId);
}

function corridorSelector(corridors, selectedId, onChange) {
  const select = el(
    "select",
    { class: "corridor-select", onchange: (e) => onChange(Number(e.target.value)) },
    corridors.map((c) => el("option", { value: c.id, ...(c.id === selectedId ? { selected: "selected" } : {}) }, c.name))
  );
  return el("div", { class: "corridor-selector" }, [el("label", {}, "Pilot corridor"), select]);
}

function reportForm(corridorId, layout) {
  const status = el("p", { class: "muted small form-status" }, "");
  const nameInput = el("input", { type: "text", placeholder: "Your name (optional)" });
  const latInput = el("input", { type: "number", step: "0.0001", placeholder: "Latitude", value: "27.15" });
  const lonInput = el("input", { type: "number", step: "0.0001", placeholder: "Longitude", value: "88.42" });
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
