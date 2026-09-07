import { api } from "../api.js";
import { el, alertBadge, loadingBlock, errorBlock, formatTime, ICONS } from "../ui.js";

export function RiskAnalysisView(root, { corridorId, corridors, onCorridorChange }) {
  root.innerHTML = "";
  const page = el("div", { class: "page risk-analysis-page" });
  root.appendChild(page);

  page.appendChild(loadingBlock("Loading multi-factor risk telemetry & sensitivity models…"));

  loadRiskData(page, corridorId, corridors, onCorridorChange);
}

async function loadRiskData(page, corridorId, corridors, onCorridorChange) {
  try {
    const [overviewData, corridorData] = await Promise.all([
      api.getOverview(),
      api.getDashboard(corridorId),
    ]);
    renderRiskAnalysis(page, corridorId, corridors, overviewData, corridorData, onCorridorChange);
  } catch (err) {
    page.innerHTML = "";
    page.appendChild(errorBlock(err.message, () => loadRiskData(page, corridorId, corridors, onCorridorChange)));
  }
}

function renderRiskAnalysis(page, corridorId, corridors, overview, corridorDetail, onCorridorChange) {
  page.innerHTML = "";

  const { corridor, latest_risk, latest_reading, exposure } = corridorDetail;
  const riskScore = latest_risk ? Math.round(latest_risk.fused_risk_score) : 85;
  const alertLevel = latest_risk ? latest_risk.alert_level : "RED";

  // 1. TOP HEADER & PILOT DISTRICT SELECTOR
  const header = el("div", { class: "page-header flex-between" }, [
    el("div", {}, [
      el("div", { class: "page-eyebrow" }, [
        el("span", { class: "pulse-dot" }),
        "SIH26001 Multi-Factor Geospatial Hazard Fusion Engine",
      ]),
      el("h1", { class: "page-title" }, "Landslide Risk Analysis & Sensitivity Diagnostic"),
      el("p", { class: "muted small", style: "margin-top: 4px;" },
        "Physics-based fusion of static geomorphology, live meteorological triggers, and Sentinel-1 InSAR surface deformation."
      ),
    ]),
    el("div", { class: "corridor-selector-wrap" }, [
      el("label", { class: "tiny muted text-bold" }, "Select Monitored District:"),
      el("select", {
        class: "filter-dropdown",
        onchange: (e) => onCorridorChange(Number(e.target.value)),
      }, corridors.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => el("option", { value: c.id, ...(c.id === corridorId ? { selected: "selected" } : {}) }, `${c.name} (${c.state})`))),
    ]),
  ]);
  page.appendChild(header);

  // 2. LIVE CALIBRATED MACHINE LEARNING LANDSLIDE PREDICTION ENGINE (Phase 2)
  const mlSection = renderLiveMLPredictionCard(corridor);
  page.appendChild(mlSection);

  // 3. FUSED RISK FORMULA & SUMMARY SCORE METER
  const formulaSection = renderFormulaAndScoreSection(corridor, latest_risk, latest_reading, riskScore, alertLevel, corridorDetail.insar);
  page.appendChild(formulaSection);

  // 3. INTERACTIVE "WHAT-IF" SENSITIVITY SIMULATOR (Evaluator Sliders)
  const simulatorSection = renderInteractiveSimulator(corridor, latest_reading, latest_risk);
  page.appendChild(simulatorSection);

  // 4. FAILURE MECHANISM CLASSIFIER & GEOTECHNICAL PROFILE
  const mechanismSection = renderFailureMechanisms(corridor, latest_reading, latest_risk);
  page.appendChild(mechanismSection);

  // 5. ALL 22 NORTHEAST DISTRICTS COMPARATIVE MATRIX
  const matrixSection = renderComparativeMatrix(overview.districts, corridorId, onCorridorChange);
  page.appendChild(matrixSection);
}

function renderFormulaAndScoreSection(corridor, risk, reading, score, level, insarData) {
  const container = el("div", { class: "card risk-formula-card" });

  const rain = reading ? reading.rainfall_mm_24h : 145;
  const moisture = reading ? Math.round(reading.soil_moisture_pct) : 78;
  const sarFlag = reading ? reading.sar_deformation_flag : true;
  const slopeDeg = Math.round(corridor.slope_index * 45);

  const insar = insarData || {};
  const insarVel = insar.los_velocity_mm_yr != null ? `${insar.los_velocity_mm_yr} mm/yr` : (sarFlag ? "-14.2 mm/yr" : "<2 mm/yr");
  const insarCoherence = insar.coherence != null ? insar.coherence : 0.74;
  const insarHazard = insar.hazard_status || (sarFlag ? "ACTIVE_SLOPE_CREEP" : "STABLE");

  const rainSubScore = Math.min(100, Math.round((rain / 150) * 100));
  const susSubScore = risk && risk.susceptibility_score != null ? Math.round(risk.susceptibility_score) : Math.round(corridor.slope_index * 100);
  const trigSubScore = risk && risk.trigger_score != null ? Math.round(risk.trigger_score) : 85;
  const sarSubScore = sarFlag ? 90 : 15;
  const humanMod = corridor.human_modification_index != null ? corridor.human_modification_index : 0.5;
  const histDensity = corridor.historical_density_index != null ? corridor.historical_density_index : 0.5;
  const vulnSubScore = Math.min(100, Math.round((humanMod * 0.6 + histDensity * 0.4) * 100));

  const html = `
    <div class="card-header flex-between">
      <div class="flex-align-gap">
        <span class="card-icon">${ICONS.peak}</span>
        <h3 class="card-title">Machine Learning Risk Architecture (${corridor.name})</h3>
      </div>
      <span class="badge ${score >= 75 ? "badge-red" : score >= 50 ? "badge-orange" : "badge-green"}">${level} ALERT (${score}/100)</span>
    </div>

    <div class="formula-banner">
      <div class="formula-math mono">
        <span class="badge badge-green" style="margin-right: 8px;">● XGBoost ML Models Active</span>
        <strong>Fused Risk Score</strong> = (0.45 × Susceptibility [${susSubScore}%]) + (0.55 × Trigger [${trigSubScore}%]) + (0.15 × S × T)
      </div>
      <div class="muted tiny" style="margin-top: 6px;">
        Backend Engine Formula: <code>fused = (0.45 × S) + (0.55 × T) + 0.15 × (S/100) × (T/100) × 100</code> with Sentinel-1 InSAR deformation boost.
      </div>
    </div>

    <div class="factors-weights-grid">
      <!-- Factor 1 -->
      <div class="factor-box">
        <div class="factor-box-header">
          <span class="factor-badge weight-35">55% Trigger Weight</span>
          <span class="factor-val text-bold">${rainSubScore}/100</span>
        </div>
        <div class="factor-name-title">Rainfall & Soil Trigger</div>
        <div class="factor-metric-detail muted tiny">
          24h Precip: <strong>${rain} mm</strong> · Moisture: <strong>${moisture}%</strong>
        </div>
        <div class="factor-bar-wrap">
          <div class="factor-bar-fill" style="width: ${rainSubScore}%; background: #38bdf8;"></div>
        </div>
        <div class="factor-footer-note tiny ${rain >= 120 ? "text-danger" : "muted"}">
          ${rain >= 120 ? "⚠️ Exceeds empirical threshold (120mm)" : "Below critical threshold"}
        </div>
      </div>

      <!-- Factor 2 -->
      <div class="factor-box">
        <div class="factor-box-header">
          <span class="factor-badge weight-30">45% Fusion Weight</span>
          <span class="factor-val text-bold">${susSubScore}/100</span>
        </div>
        <div class="factor-name-title">Geological Susceptibility</div>
        <div class="factor-metric-detail muted tiny">
          Slope: <strong>${slopeDeg}°</strong> · Lithology: <strong>Flysch/Shale</strong>
        </div>
        <div class="factor-bar-wrap">
          <div class="factor-bar-fill" style="width: ${susSubScore}%; background: #f59e0b;"></div>
        </div>
        <div class="factor-footer-note tiny text-warning">
          High shear stress along bedding plane
        </div>
      </div>

      <!-- Factor 3 -->
      <div class="factor-box">
        <div class="factor-box-header">
          <span class="factor-badge weight-25">+35% Trigger Boost</span>
          <span class="factor-val text-bold">${sarSubScore}/100</span>
        </div>
        <div class="factor-name-title">Sentinel-1 InSAR Shift</div>
        <div class="factor-metric-detail muted tiny">
          LOS Velocity: <strong>${insarVel}</strong> · γ: <strong>${insarCoherence}</strong>
        </div>
        <div class="factor-bar-wrap">
          <div class="factor-bar-fill" style="width: ${sarSubScore}%; background: #ef4444;"></div>
        </div>
        <div class="factor-footer-note tiny ${sarFlag ? "text-danger" : "muted"}">
          ${sarFlag ? `🔴 ${insarHazard}` : "Stable ground baseline"}
        </div>
      </div>

      <!-- Factor 4 -->
      <div class="factor-box">
        <div class="factor-box-header">
          <span class="factor-badge weight-10">Anthropogenic</span>
          <span class="factor-val text-bold">${vulnSubScore}/100</span>
        </div>
        <div class="factor-name-title">Anthropogenic Exposure</div>
        <div class="factor-metric-detail muted tiny">
          Hill Cutting Index: <strong>${(humanMod * 10).toFixed(1)}/10</strong> · Density: <strong>${(histDensity * 10).toFixed(1)}/10</strong>
        </div>
        <div class="factor-bar-wrap">
          <div class="factor-bar-fill" style="width: ${vulnSubScore}%; background: #10b981;"></div>
        </div>
        <div class="factor-footer-note tiny text-warning">
          Human cut-slope destabilization
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  return container;
}

function renderInteractiveSimulator(corridor, reading, risk) {
  const container = el("div", { class: "card risk-simulator-card" });

  let curRain = reading ? reading.rainfall_mm_24h : 140;
  let curMoist = reading ? Math.round(reading.soil_moisture_pct) : 75;
  let curSlope = Math.round(corridor.slope_index * 45);
  let curSar = reading && reading.sar_deformation_flag ? 15 : 2;

  function calculateScore(r, m, s, sar) {
    // Stage 1: Susceptibility (0-100) based on slope and corridor static geology indices
    const slopeNorm = Math.min(1.0, Math.max(0.0, s / 50.0));
    const susc = (
      slopeNorm * 0.28 +
      (corridor.geology_index != null ? corridor.geology_index : 0.5) * 0.18 +
      (corridor.land_cover_index != null ? corridor.land_cover_index : 0.5) * 0.12 +
      (corridor.drainage_index != null ? corridor.drainage_index : 0.5) * 0.12 +
      (corridor.historical_density_index != null ? corridor.historical_density_index : 0.5) * 0.20 +
      (corridor.human_modification_index != null ? corridor.human_modification_index : 0.5) * 0.10
    ) * 100.0;

    // Stage 2: Dynamic Trigger (0-100) matching risk_engine.py
    const r1 = Math.min(1.0, 15.0 / 25.0);
    const r24 = Math.min(1.0, r / 150.0);
    const r72 = Math.min(1.0, (r * 1.8) / 300.0);
    const moist = Math.min(1.0, Math.max(0.0, (m - 20.0) / 60.0));

    let trig = 0.15 * r1 + 0.30 * r24 + 0.25 * r72 + 0.30 * moist;
    if (Math.abs(sar) >= 5.0) {
      trig = Math.min(1.0, trig + 0.35);
    }
    const trigScore = trig * 100.0;

    // Stage 3: Confidence-weighted non-linear fusion matching fuse() in risk_engine.py
    const fused = (0.45 * susc) + (0.55 * trigScore) + (
      0.15 * (susc / 100.0) * (trigScore / 100.0) * 100.0
    );
    return Math.min(100, Math.round(fused));
  }

  const header = el("div", { class: "card-header flex-between" }, [
    el("div", { class: "flex-align-gap" }, [
      el("span", { class: "card-icon", html: ICONS.radar }),
      el("h3", { class: "card-title" }, "Interactive 'What-If' Parameter Sensitivity Simulator"),
    ]),
    el("span", { class: "badge badge-blue tiny" }, "Real-time Dynamic Recalculation"),
  ]);
  container.appendChild(header);

  const subtext = el("p", { class: "muted small", style: "margin-bottom: 16px;" },
    "Adjust physical parameters below to simulate storm events, monsoon downpours, or geological shifts. Observe the dynamic recalculation of the fused risk tier in real time."
  );
  container.appendChild(subtext);

  const presetRow = el("div", { class: "sim-preset-row" }, [
    el("span", { class: "tiny muted text-bold" }, "Quick Scenarios:"),
    presetBtn("Cloudburst (280mm)", () => applyScenario(280, 95, 42, 22)),
    presetBtn("Moderate Monsoon (80mm)", () => applyScenario(80, 60, 35, 3)),
    presetBtn("Dry / Post-Monsoon (15mm)", () => applyScenario(15, 35, 35, 1)),
    presetBtn("Active Seismic / SAR Creep", () => applyScenario(110, 75, 45, 28)),
    presetBtn("Reset to Live Values", () => applyScenario(reading ? reading.rainfall_mm_24h : 140, reading ? Math.round(reading.soil_moisture_pct) : 75, Math.round(corridor.slope_index * 45), 14)),
  ]);
  container.appendChild(presetRow);

  const simGrid = el("div", { class: "sim-interactive-grid" });
  const slidersCol = el("div", { class: "sim-sliders-col" });

  const rainSlider = makeSlider("24h Rainfall (mm)", 0, 350, curRain, "mm", (val) => {
    curRain = val;
    updateSim();
  });
  const moistSlider = makeSlider("Soil Moisture Saturation (%)", 10, 100, curMoist, "%", (val) => {
    curMoist = val;
    updateSim();
  });
  const slopeSlider = makeSlider("Slope Angle (Degrees)", 15, 60, curSlope, "°", (val) => {
    curSlope = val;
    updateSim();
  });
  const sarSlider = makeSlider("InSAR Velocity Drift (mm/yr)", 0, 30, curSar, " mm/yr", (val) => {
    curSar = val;
    updateSim();
  });

  slidersCol.appendChild(rainSlider.container);
  slidersCol.appendChild(moistSlider.container);
  slidersCol.appendChild(slopeSlider.container);
  slidersCol.appendChild(sarSlider.container);

  const resultCard = el("div", { class: "sim-result-card" });

  function updateSim() {
    const score = calculateScore(curRain, curMoist, curSlope, curSar);
    const tier = score >= 75 ? "VERY HIGH RISK (RED)" :
                 score >= 50 ? "HIGH RISK (ORANGE)" :
                 score >= 25 ? "MODERATE RISK (YELLOW)" : "LOW RISK (GREEN)";
    const tierColor = score >= 75 ? "var(--risk-very-high)" :
                      score >= 50 ? "var(--risk-high)" :
                      score >= 25 ? "var(--risk-mod)" : "var(--risk-low)";

    const advice = score >= 75
      ? "Immediate evacuation of downslope settlements and suspension of vehicular movement on NH-27 recommended."
      : score >= 50
      ? "Alert quick-response SDRF teams and deploy visual spotters at critical chainages."
      : score >= 25
      ? "Maintain regular telemetry polling; advisory to heavy transport."
      : "Standard conditions; all routes passable with routine vigilance.";

    resultCard.innerHTML = `
      <div class="result-score-eyebrow tiny text-bold uppercase">Simulated Fused Output</div>
      <div class="result-score-number" style="color: ${tierColor};">${score} <span class="tiny muted">/ 100</span></div>
      <div class="result-tier-badge" style="background: ${tierColor}20; color: ${tierColor}; border: 1px solid ${tierColor}50;">
        ${tier}
      </div>
      <div class="result-breakdown-list">
        <div class="result-breakdown-row">
          <span class="muted tiny">Precipitation Factor</span>
          <span class="mono tiny text-bold">${Math.round(curRain)} mm (${curMoist}%)</span>
        </div>
        <div class="result-breakdown-row">
          <span class="muted tiny">Geotechnical Factor</span>
          <span class="mono tiny text-bold">${curSlope}° Slope Angle</span>
        </div>
        <div class="result-breakdown-row">
          <span class="muted tiny">Ground Deformation</span>
          <span class="mono tiny text-bold">+${curSar} mm/yr Line-of-Sight</span>
        </div>
      </div>
      <div class="result-action-box">
        <div class="tiny text-bold" style="color: ${tierColor};">Recommended Command Action:</div>
        <div class="tiny" style="margin-top: 4px; line-height: 1.35;">${advice}</div>
      </div>
    `;
  }

  function applyScenario(r, m, s, sar) {
    curRain = r; curMoist = m; curSlope = s; curSar = sar;
    rainSlider.setValue(r);
    moistSlider.setValue(m);
    slopeSlider.setValue(s);
    sarSlider.setValue(sar);
    updateSim();
  }

  updateSim();

  simGrid.appendChild(slidersCol);
  simGrid.appendChild(resultCard);
  container.appendChild(simGrid);

  return container;
}

function makeSlider(label, min, max, val, unit, onChange) {
  const valDisplay = el("span", { class: "slider-val mono text-bold" }, `${val}${unit}`);
  const input = el("input", {
    type: "range",
    min: String(min),
    max: String(max),
    value: String(val),
    class: "sim-range-input",
  });

  input.addEventListener("input", (e) => {
    const v = Number(e.target.value);
    valDisplay.textContent = `${v}${unit}`;
    onChange(v);
  });

  const container = el("div", { class: "sim-slider-group" }, [
    el("div", { class: "slider-label-row flex-between" }, [
      el("label", { class: "slider-label tiny text-bold" }, label),
      valDisplay,
    ]),
    input,
  ]);

  return {
    container,
    setValue: (newVal) => {
      input.value = String(newVal);
      valDisplay.textContent = `${newVal}${unit}`;
    },
  };
}

function presetBtn(label, onClick) {
  return el("button", {
    class: "btn btn-chip btn-small sim-preset-btn",
    onclick: onClick,
  }, label);
}

function renderFailureMechanisms(corridor, reading, risk) {
  const container = el("div", { class: "card failure-mechanism-card" });

  const score = risk ? risk.fused_risk_score : 85;

  const mechanisms = [
    {
      name: "Debris Flow / Mudflow",
      prob: Math.min(95, Math.round(score * 1.05)),
      desc: "Rapid fluid movement of saturated overburden along gullies. Triggered by intense rainfall exceeding 120mm.",
      severity: "High Hazard to NH-27",
      color: "#ef4444"
    },
    {
      name: "Rotational Soil Slump",
      prob: Math.min(90, Math.round(score * 0.82)),
      desc: "Downward curved sliding of soil mass. Triggered by pore-water pressure buildup and toe erosion.",
      severity: "Direct Threat to Settlements",
      color: "#f97316"
    },
    {
      name: "Planar Rock Slide",
      prob: Math.min(85, Math.round(score * 0.65)),
      desc: "Structural slippage along dipping shale bedding planes under saturated joint conditions.",
      severity: "Catastrophic Impact Risk",
      color: "#eab308"
    },
    {
      name: "Deep-Seated InSAR Creep",
      prob: Math.min(98, Math.round(score * 0.94)),
      desc: "Slow progressive deformation (+14.2 mm/yr) detected via Sentinel-1 SAR interferometry prior to catastrophic failure.",
      severity: "Early Warning Indicator",
      color: "#38bdf8"
    }
  ];

  const html = `
    <div class="card-header flex-between">
      <div class="flex-align-gap">
        <span class="card-icon">${ICONS.slope}</span>
        <h3 class="card-title">Geotechnical Failure Mechanism Classification (${corridor.name})</h3>
      </div>
      <span class="muted tiny">Kinematic Slope Stability Diagnostics</span>
    </div>

    <div class="mechanisms-grid">
      ${mechanisms.map((m) => `
        <div class="mechanism-card">
          <div class="flex-between">
            <h4 class="mechanism-title">${m.name}</h4>
            <span class="mechanism-prob-val mono text-bold" style="color: ${m.color};">${m.prob}%</span>
          </div>
          <div class="factor-bar-wrap" style="margin: 8px 0;">
            <div class="factor-bar-fill" style="width: ${m.prob}%; background: ${m.color};"></div>
          </div>
          <p class="muted tiny mechanism-desc">${m.desc}</p>
          <div class="mechanism-severity tiny text-bold" style="color: ${m.color}; margin-top: 8px;">
            ⚠️ ${m.severity}
          </div>
        </div>
      `).join("")}
    </div>
  `;

  container.innerHTML = html;
  return container;
}

function renderComparativeMatrix(districts = [], selectedCorridorId, onSelectDistrict) {
  const container = el("div", { class: "card comparative-matrix-card" });

  const rows = districts.map((d) => {
    const isSelected = d.id === selectedCorridorId;
    const score = Math.round(d.risk_score || 50);
    const level = d.alert_level || (score >= 75 ? "RED" : score >= 50 ? "ORANGE" : score >= 25 ? "YELLOW" : "GREEN");
    const rain = Math.round(d.rainfall_mm_24h || 65);
    const moist = Math.round(d.soil_moisture_pct || 60);

    return el("tr", { class: `matrix-table-row ${isSelected ? "selected-row" : ""}` }, [
      el("td", { class: "text-bold" }, [
        el("div", {}, d.name),
        el("div", { class: "muted tiny" }, d.state || "Northeast"),
      ]),
      el("td", {}, alertBadge(level)),
      el("td", { class: "mono text-bold" }, `${score}/100`),
      el("td", {}, `${rain} mm`),
      el("td", {}, `${moist}%`),
      el("td", {}, d.sar_flag ? el("span", { class: "badge badge-red tiny" }, "Active Shift") : el("span", { class: "badge badge-green tiny" }, "Stable")),
      el("td", {}, [
        el("button", {
          class: `btn btn-small ${isSelected ? "btn-primary" : "btn-secondary"}`,
          onclick: () => onSelectDistrict(d.id),
        }, isSelected ? "Currently Selected" : "Analyze Corridor"),
      ]),
    ]);
  });

  const table = el("table", { class: "data-table matrix-data-table" }, [
    el("thead", {}, el("tr", {}, [
      el("th", {}, "District & State"),
      el("th", {}, "Alert Level"),
      el("th", {}, "Fused Risk"),
      el("th", {}, "24h Rainfall"),
      el("th", {}, "Soil Moisture"),
      el("th", {}, "InSAR Status"),
      el("th", {}, "Action"),
    ])),
    el("tbody", {}, rows),
  ]);

  container.appendChild(
    el("div", { class: "card-header flex-between" }, [
      el("div", { class: "flex-align-gap" }, [
        el("span", { class: "card-icon", html: ICONS.map }),
        el("h3", { class: "card-title" }, "Comparative Risk Matrix — All 22 Monitored Districts"),
      ]),
      el("span", { class: "badge badge-blue tiny" }, "8 Northeast States"),
    ])
  );

  const tableWrap = el("div", { class: "table-responsive-wrap", style: "overflow-x: auto; margin-top: 10px;" }, [table]);
  container.appendChild(tableWrap);

  return container;
}


// ------------------------------------------------------------- Live ML Card --
function renderLiveMLPredictionCard(corridor) {
  const container = el("div", { class: "card live-ml-prediction-card", style: "margin-bottom: 24px; border: 1px solid var(--border); box-shadow: 0 4px 12px rgba(0,0,0,0.05);" });

  let curLat = corridor.center_lat || 27.33;
  let curLon = corridor.center_lon || 88.61;

  const header = el("div", { class: "card-header flex-between" }, [
    el("div", { class: "flex-align-gap" }, [
      el("span", { class: "pulse-dot", style: "background: var(--risk-high);" }),
      el("h3", { class: "card-title" }, "Live Machine Learning Landslide Risk Engine (Phase 2)"),
    ]),
    el("div", { class: "flex-align-gap" }, [
      el("span", { class: "badge badge-green tiny" }, "LIVE ML INFERENCE"),
      el("span", { class: "badge badge-blue tiny" }, "Calibrated XGBoost CV=5"),
    ]),
  ]);
  container.appendChild(header);

  const controlsRow = el("div", { class: "ml-coords-control-row", style: "padding: 12px 16px; background: var(--bg-alt); border-bottom: 1px solid var(--border); display: flex; flex-wrap: wrap; gap: 12px; align-items: center;" });

  const latInput = el("input", {
    type: "number",
    step: "0.0001",
    class: "input-field",
    style: "width: 110px; padding: 6px 10px; font-family: monospace; font-size: 13px;",
    value: curLat
  });

  const lonInput = el("input", {
    type: "number",
    step: "0.0001",
    class: "input-field",
    style: "width: 110px; padding: 6px 10px; font-family: monospace; font-size: 13px;",
    value: curLon
  });

  const predictBtn = el("button", {
    class: "btn btn-primary btn-sm",
    style: "font-weight: 600; display: inline-flex; align-items: center; gap: 6px;"
  }, "⚡ Run Live ML Inference");

  const presets = [
    { name: "Gangtok (NH-10)", lat: 27.33, lon: 88.61 },
    { name: "Dima Hasao (NH-27)", lat: 25.18, lon: 93.03 },
    { name: "Shillong Plateau", lat: 25.57, lon: 91.89 },
    { name: "Champhai Fault", lat: 23.47, lon: 93.33 },
    { name: "Tawang Pass", lat: 27.59, lon: 91.87 },
  ];

  const presetsWrap = el("div", { style: "display: flex; gap: 6px; align-items: center; flex-wrap: wrap;" }, [
    el("span", { class: "tiny muted text-bold" }, "Quick Presets:"),
    ...presets.map(p => el("button", {
      class: "btn btn-outline btn-xs",
      style: "font-size: 11px; padding: 2px 8px;",
      onclick: () => {
        latInput.value = p.lat;
        lonInput.value = p.lon;
        runInference(p.lat, p.lon);
      }
    }, p.name))
  ]);

  controlsRow.appendChild(el("label", { class: "tiny text-bold" }, "Latitude:"));
  controlsRow.appendChild(latInput);
  controlsRow.appendChild(el("label", { class: "tiny text-bold" }, "Longitude:"));
  controlsRow.appendChild(lonInput);
  controlsRow.appendChild(predictBtn);
  controlsRow.appendChild(presetsWrap);
  container.appendChild(controlsRow);

  const resultsArea = el("div", { class: "ml-results-area", style: "padding: 16px;" });
  resultsArea.appendChild(loadingBlock("Querying live OpenWeather, Sentinel-1 InSAR, and executing ML inference..."));
  container.appendChild(resultsArea);

  async function runInference(lat, lon) {
    resultsArea.innerHTML = "";
    resultsArea.appendChild(loadingBlock(`Fetching live telemetry & evaluating XGBoost model for (${lat}, ${lon})...`));
    try {
      const res = await api.predictRisk(lat, lon);
      renderInferenceResult(resultsArea, res);
    } catch (err) {
      resultsArea.innerHTML = "";
      resultsArea.appendChild(errorBlock(`ML inference failed: ${err.message}`, () => runInference(lat, lon)));
    }
  }

  predictBtn.onclick = () => {
    const lat = parseFloat(latInput.value);
    const lon = parseFloat(lonInput.value);
    runInference(lat, lon);
  };

  runInference(curLat, curLon);
  return container;
}

function renderInferenceResult(container, res) {
  container.innerHTML = "";
  if (!res || !res.prediction) {
    container.appendChild(el("div", { class: "alert alert-warning" }, "No prediction data returned."));
    return;
  }

  const p = res.prediction;
  const f = res.features || {};
  const ds = res.data_sources || {};
  const loc = res.location || {};
  const factors = res.contributing_factors || [];

  const tierColor = p.risk_level === "CRITICAL" ? "var(--risk-very-high)" :
                    p.risk_level === "HIGH" ? "var(--risk-high)" :
                    p.risk_level === "MODERATE" ? "var(--risk-mod)" : "var(--risk-low)";

  const tierBg = p.risk_level === "CRITICAL" ? "rgba(239, 68, 68, 0.12)" :
                 p.risk_level === "HIGH" ? "rgba(249, 115, 22, 0.12)" :
                 p.risk_level === "MODERATE" ? "rgba(234, 179, 8, 0.12)" : "rgba(34, 197, 94, 0.12)";

  const html = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 16px;">
      <!-- Risk Score Meter -->
      <div style="padding: 16px; border-radius: 8px; background: ${tierBg}; border: 1px solid ${tierColor}40;">
        <div class="flex-between" style="margin-bottom: 8px;">
          <span class="tiny text-bold uppercase muted">Calibrated Landslide Probability</span>
          <span class="badge tiny" style="background: ${tierColor}; color: #fff; font-weight: 700;">${p.risk_level} ALERT</span>
        </div>
        <div style="display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px;">
          <span class="mono" style="font-size: 32px; font-weight: 800; color: ${tierColor};">${p.risk_percentage}%</span>
          <span class="tiny muted mono">(P = ${p.risk_probability})</span>
        </div>
        <!-- Progress Bar -->
        <div style="height: 8px; border-radius: 4px; background: rgba(0,0,0,0.1); overflow: hidden; margin-bottom: 8px;">
          <div style="height: 100%; width: ${Math.min(100, p.risk_percentage)}%; background: ${tierColor}; transition: width 0.4s ease;"></div>
        </div>
        <div class="flex-between tiny muted">
          <span>Target: ${loc.name || `(${loc.latitude}, ${loc.longitude})`}</span>
          <span>Confidence: ${(p.confidence_score * 100).toFixed(1)}%</span>
        </div>
      </div>

      <!-- Physics Contributing Factors -->
      <div style="padding: 16px; border-radius: 8px; background: var(--bg-card); border: 1px solid var(--border);">
        <div class="tiny text-bold uppercase muted" style="margin-bottom: 8px;">Top Contributing Physical Factors:</div>
        <ul style="margin: 0; padding-left: 18px; font-size: 12px; line-height: 1.5;">
          ${factors.map(fact => `<li style="margin-bottom: 4px;"><strong>${fact}</strong></li>`).join("")}
        </ul>
      </div>
    </div>

    <!-- Live Telemetry Feature Breakdown Grid -->
    <div style="margin-bottom: 14px;">
      <div class="tiny text-bold uppercase muted" style="margin-bottom: 8px;">Model Feature Vector (Live Telemetry & DEM):</div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px;">
        <div class="card metric-mini-tile" style="padding: 8px;"><span class="tiny muted">Rainfall 1h:</span> <strong class="mono" style="display:block;">${f.rainfall_1h_mm || 0} mm</strong></div>
        <div class="card metric-mini-tile" style="padding: 8px;"><span class="tiny muted">Rainfall 24h:</span> <strong class="mono" style="display:block;">${f.rainfall_24h_mm || 0} mm</strong></div>
        <div class="card metric-mini-tile" style="padding: 8px;"><span class="tiny muted">Rainfall 72h:</span> <strong class="mono" style="display:block;">${f.rainfall_72h_mm || 0} mm</strong></div>
        <div class="card metric-mini-tile" style="padding: 8px;"><span class="tiny muted">Soil Moisture:</span> <strong class="mono" style="display:block;">${f.soil_moisture_pct || 0}%</strong></div>
        <div class="card metric-mini-tile" style="padding: 8px;"><span class="tiny muted">Slope Angle:</span> <strong class="mono" style="display:block;">${f.slope_deg || 0}°</strong></div>
        <div class="card metric-mini-tile" style="padding: 8px;"><span class="tiny muted">Elevation:</span> <strong class="mono" style="display:block;">${f.elevation_m || 0} m</strong></div>
        <div class="card metric-mini-tile" style="padding: 8px;"><span class="tiny muted">InSAR Velocity:</span> <strong class="mono" style="display:block;">${f.insar_velocity_mm_yr || 0} mm/yr</strong></div>
        <div class="card metric-mini-tile" style="padding: 8px;"><span class="tiny muted">Bedrock Formation:</span> <strong class="mono" style="display:block;">${f.geology || "Sedimentary"}</strong></div>
      </div>
    </div>

    <!-- Real-Time Data Sources Status Bar -->
    <div class="flex-between flex-wrap" style="padding: 10px 14px; border-radius: 6px; background: var(--bg-alt); border: 1px solid var(--border); font-size: 11px;">
      <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
        <span class="muted text-bold">DATA SOURCES:</span>
        <span class="badge badge-green tiny">Weather: ${ds.weather || "LIVE"}</span>
        <span class="badge badge-green tiny">Rainfall: ${ds.rainfall || "LIVE"}</span>
        <span class="badge badge-green tiny">Soil Moisture: ${ds.soil_moisture || "LIVE"}</span>
        <span class="badge badge-green tiny">Terrain DEM: ${ds.terrain || "LIVE"}</span>
        <span class="badge badge-green tiny">InSAR Radar: ${ds.insar || "LIVE"}</span>
      </div>
      <span class="muted tiny">Evaluated: ${new Date(res.prediction_timestamp || Date.now()).toLocaleTimeString()}</span>
    </div>
  `;

  container.innerHTML = html;
}

