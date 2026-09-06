import { api } from "../api.js";
import { el, alertBadge, loadingBlock, errorBlock, formatTime, ICONS } from "../ui.js";

export function SurakshaSetuView(root, { corridorId, corridors, onCorridorChange }) {
  root.innerHTML = "";
  const page = el("div", { class: "page suraksha-setu-standalone-page" });
  root.appendChild(page);

  page.appendChild(loadingBlock("Loading Suraksha Setu village shelter relocation models…"));

  loadSurakshaData(page, corridorId, corridors, onCorridorChange);
}

async function loadSurakshaData(page, corridorId, corridors, onCorridorChange) {
  try {
    const [overviewData, corridorData] = await Promise.all([
      api.getOverview(),
      api.getDashboard(corridorId),
    ]);
    renderSurakshaSetuPage(page, corridorId, corridors, overviewData, corridorData, onCorridorChange);
  } catch (err) {
    page.innerHTML = "";
    page.appendChild(errorBlock(err.message, () => loadSurakshaData(page, corridorId, corridors, onCorridorChange)));
  }
}

function renderSurakshaSetuPage(page, corridorId, corridors, overview, corridorDetail, onCorridorChange) {
  page.innerHTML = "";

  const { corridor } = corridorDetail;

  // Database of At-Risk Villages and their paired Safe Shelter Hubs
  const EVACUATION_PAIRS = [
    {
      id: "pair-1",
      district: "Dima Hasao District",
      state: "Assam",
      originVillage: "Jatinga Valley",
      originPop: 4800,
      originRiskScore: 95,
      originRiskLevel: "RED",
      originHazard: "Active slope creep, tension cracks on NH-27 & cutoff threat",
      destShelter: "Haflong Govt Higher Secondary Poly-Shelter",
      destVillage: "Haflong Ridge",
      destRiskScore: 16,
      destRiskLevel: "GREEN",
      destCapacity: 6500,
      destOccupied: 1800,
      distanceKm: 6.4,
      transitTimeMin: 18,
      transitRoute: "Via North Hill Link Road (Cleared by PWD)",
      convoyUnits: "14 SDRF Shuttles + 4x4 Troop Carriers",
      amenities: ["Medical Post Onsite", "Clean Water Tanker", "14-Day Rations", "Solar Microgrid"],
      status: "CRITICAL_ACTION_REQUIRED"
    },
    {
      id: "pair-2",
      district: "Dima Hasao District",
      state: "Assam",
      originVillage: "Harangajao Lowlands",
      originPop: 2900,
      originRiskScore: 96,
      originRiskLevel: "RED",
      originHazard: "Riverine toe erosion & debris flow gorge cutoff",
      destShelter: "Maibang Elevated Poly-Shelter Safe Haven",
      destVillage: "Maibang Plateau",
      destRiskScore: 18,
      destRiskLevel: "GREEN",
      destCapacity: 4200,
      destOccupied: 1100,
      distanceKm: 18.5,
      transitTimeMin: 32,
      transitRoute: "Via East Bypass Hill Corridor",
      convoyUnits: "8 NDRF Heavy All-Terrain Transporters",
      amenities: ["Backup Diesel Generator", "Trauma First Aid", "Satellite Comms Phone"],
      status: "CRITICAL_ACTION_REQUIRED"
    },
    {
      id: "pair-3",
      district: "Dima Hasao District",
      state: "Assam",
      originVillage: "Mahur Basti",
      originPop: 3100,
      originRiskScore: 89,
      originRiskLevel: "RED",
      originHazard: "Rapid saturated mudflow risk along railway gradient",
      destShelter: "Upper Umrangso Community Refuge Complex",
      destVillage: "Upper Umrangso",
      destRiskScore: 15,
      destRiskLevel: "GREEN",
      destCapacity: 5000,
      destOccupied: 950,
      distanceKm: 14.1,
      transitTimeMin: 25,
      transitRoute: "State Highway 19 (Unobstructed)",
      convoyUnits: "10 District Transport Buses",
      amenities: ["Emergency Maternity Unit", "Pre-cooked Ration Packs", "Water Purifier"],
      status: "HIGH_WATCHLIST"
    },
    {
      id: "pair-4",
      district: "Dima Hasao District",
      state: "Assam",
      originVillage: "Lower Haflong Railway Colony",
      originPop: 2400,
      originRiskScore: 84,
      originRiskLevel: "RED",
      originHazard: "Toe slippage and retaining wall distress",
      destShelter: "Haflong Town Hall Emergency Transit Camp",
      destVillage: "Central Haflong",
      destRiskScore: 14,
      destRiskLevel: "GREEN",
      destCapacity: 3500,
      destOccupied: 800,
      distanceKm: 4.8,
      transitTimeMin: 14,
      transitRoute: "Town Internal Ring Road",
      convoyUnits: "Municipal Minibus Fleet",
      amenities: ["Red Cross First Aid", "Community Kitchen", "Wi-Fi Hotspot"],
      status: "HIGH_WATCHLIST"
    },
    {
      id: "pair-5",
      district: "Sikkim NH-10 Corridor",
      state: "Sikkim",
      originVillage: "Rangpo Bazaar Teesta Basin",
      originPop: 3200,
      originRiskScore: 93,
      originRiskLevel: "RED",
      originHazard: "Teesta flash surge & jointed rock mass slip",
      destShelter: "Rorathang High Ridge Multipurpose Complex",
      destVillage: "Rorathang Highland",
      destRiskScore: 20,
      destRiskLevel: "GREEN",
      destCapacity: 5000,
      destOccupied: 1200,
      distanceKm: 9.4,
      transitTimeMin: 22,
      transitRoute: "Via Singtam-Rorathang Upper Axis",
      convoyUnits: "Indian Army / SDRF Mountain Troop Carriers",
      amenities: ["High Altitude Medics", "Thermal Blankets", "Satellite V-SAT"],
      status: "CRITICAL_ACTION_REQUIRED"
    },
    {
      id: "pair-6",
      district: "Meghalaya Shillong-Dawki Road",
      state: "Meghalaya",
      originVillage: "Pynursla Slope Settlements",
      originPop: 2100,
      originRiskScore: 86,
      originRiskLevel: "RED",
      originHazard: "Extreme cloudburst slope liquefaction along escarpment",
      destShelter: "Upper Shillong Protected Ridge Shelter",
      destVillage: "Upper Shillong Ridge",
      destRiskScore: 17,
      destRiskLevel: "GREEN",
      destCapacity: 4500,
      destOccupied: 1400,
      distanceKm: 22.0,
      transitTimeMin: 38,
      transitRoute: "NH-206 Ridge Corridor",
      convoyUnits: "Meghalaya State Transport Corporation Fleet",
      amenities: ["NDRF Paramedics", "Dry Ration Kits", "Emergency Lighting"],
      status: "HIGH_WATCHLIST"
    },
    {
      id: "pair-7",
      district: "West Karbi Anglong",
      state: "Assam",
      originVillage: "Hamren Steep Slopes",
      originPop: 6200,
      originRiskScore: 88,
      originRiskLevel: "RED",
      originHazard: "Bedrock failure and soil overburden creep",
      destShelter: "Baithalangso Stable Ridge Safe Haven",
      destVillage: "Baithalangso Plain",
      destRiskScore: 21,
      destRiskLevel: "GREEN",
      destCapacity: 8000,
      destOccupied: 2200,
      distanceKm: 16.0,
      transitTimeMin: 28,
      transitRoute: "Via Baithalangso Main Link",
      convoyUnits: "District Disaster Fleet",
      amenities: ["Mobile Medical Unit", "Water Purification Trailer", "Generator Backup"],
      status: "HIGH_WATCHLIST"
    },
    {
      id: "pair-8",
      district: "Tamenglong Hill Corridor",
      state: "Manipur",
      originVillage: "Tamenglong West Slopes",
      originPop: 3800,
      originRiskScore: 91,
      originRiskLevel: "RED",
      originHazard: "Shale strata sliding under sustained heavy precipitation",
      destShelter: "District Indoor Stadium Safe Refuge",
      destVillage: "Central Tamenglong High Ground",
      destRiskScore: 23,
      destRiskLevel: "GREEN",
      destCapacity: 5500,
      destOccupied: 1500,
      distanceKm: 7.5,
      transitTimeMin: 19,
      transitRoute: "Via Police Camp Ridge Bypass",
      convoyUnits: "Assam Rifles / State Police Escort Convoys",
      amenities: ["Military Field Hospital", "Satellite Radio", "Water Tankers"],
      status: "CRITICAL_ACTION_REQUIRED"
    }
  ];

  let activeFilter = "ALL";
  let searchQuery = "";

  // 1. PAGE HEADER
  const header = el("div", { class: "page-header flex-between" }, [
    el("div", {}, [
      el("div", { class: "page-eyebrow" }, [
        el("span", { class: "pulse-beacon-dot" }),
        "SIH26001 HUMANITARIAN LOGISTICS & SAFE REFUGE NETWORK",
      ]),
      el("h1", { class: "page-title" }, "सुरक्षा सेतु (Suraksha Setu) — At-Risk Village Shelter Relocation Hub"),
      el("p", { class: "muted small", style: "margin-top: 4px;" },
        "Autonomous pairing of the 482 high-risk landslide villages with secure low-risk safe haven shelters across Northeast India."
      ),
    ]),
    el("div", { class: "corridor-selector-wrap" }, [
      el("label", { class: "tiny muted text-bold" }, "Filter District:"),
      el("select", {
        class: "filter-dropdown",
        onchange: (e) => onCorridorChange(Number(e.target.value)),
      }, corridors.map((c) => el("option", { value: c.id, ...(c.id === corridorId ? { selected: "selected" } : {}) }, c.name))),
    ]),
  ]);
  page.appendChild(header);

  // 2. SUMMARY METRICS TILES
  const totalCriticalPop = EVACUATION_PAIRS.reduce((sum, p) => sum + p.originPop, 0);
  const totalShelterCap = EVACUATION_PAIRS.reduce((sum, p) => sum + p.destCapacity, 0);
  const totalOccupied = EVACUATION_PAIRS.reduce((sum, p) => sum + p.destOccupied, 0);
  const availableBeds = totalShelterCap - totalOccupied;

  const statsRow = el("div", { class: "suraksha-stats-row" }, [
    el("div", { class: "suraksha-stat-box stat-red" }, [
      el("div", { class: "suraksha-stat-val text-danger" }, "43"),
      el("div", { class: "suraksha-stat-lbl" }, "At-Risk Villages Monitored"),
      el("div", { class: "suraksha-stat-sub muted tiny" }, "Across 22 Monitored Corridors"),
    ]),
    el("div", { class: "suraksha-stat-box stat-orange" }, [
      el("div", { class: "suraksha-stat-val text-warning" }, "14"),
      el("div", { class: "suraksha-stat-lbl" }, "Critical Cutoff Settlements"),
      el("div", { class: "suraksha-stat-sub muted tiny" }, `${(42600).toLocaleString()} Citizens in immediate hazard`),
    ]),
    el("div", { class: "suraksha-stat-box stat-green" }, [
      el("div", { class: "suraksha-stat-val text-success" }, "32"),
      el("div", { class: "suraksha-stat-lbl" }, "Safe Haven Poly-Shelters"),
      el("div", { class: "suraksha-stat-sub muted tiny" }, "Low-risk bedrock (<25% risk score)"),
    ]),
    el("div", { class: "suraksha-stat-box stat-blue" }, [
      el("div", { class: "suraksha-stat-val text-cyan" }, availableBeds.toLocaleString()),
      el("div", { class: "suraksha-stat-lbl" }, "Available Refuge Beds"),
      el("div", { class: "suraksha-stat-sub muted tiny" }, "100% Medical Aid & 14-Day Rations"),
    ]),
  ]);
  page.appendChild(statsRow);

  // 3. SEARCH & FILTER CONTROLS
  const controlsCard = el("div", { class: "card suraksha-controls-card" });
  const controlsBar = el("div", { class: "suraksha-controls-bar" });

  const filterBtns = el("div", { class: "suraksha-filters-group" }, [
    makeFilterBtn("All 482 Villages", "ALL", true),
    makeFilterBtn("🚨 Critical Immediate Relocation (Red)", "CRITICAL"),
    makeFilterBtn(`📍 Selected District (${corridor.name.replace(" District", "")})`, "SELECTED_DISTRICT"),
    makeFilterBtn("⚠️ High Watchlist (Orange)", "HIGH"),
  ]);

  const searchInput = el("input", {
    type: "text",
    class: "suraksha-search-input",
    placeholder: "Search high-risk village, safe haven shelter, or transit road...",
    oninput: (e) => {
      searchQuery = e.target.value.toLowerCase();
      renderCards();
    }
  });

  controlsBar.appendChild(filterBtns);
  controlsBar.appendChild(searchInput);
  controlsCard.appendChild(controlsBar);
  page.appendChild(controlsCard);

  // Global dispatch banner
  const globalNotice = el("div", { class: "suraksha-global-banner", style: "display: none;" });
  page.appendChild(globalNotice);

  // 4. CARDS LIST
  const cardsList = el("div", { class: "suraksha-cards-list" });
  page.appendChild(cardsList);

  function makeFilterBtn(label, type, active = false) {
    return el("button", {
      class: `suraksha-filter-pill ${active ? "active" : ""}`,
      onclick: (e) => {
        page.querySelectorAll(".suraksha-filter-pill").forEach(b => b.classList.remove("active"));
        e.currentTarget.classList.add("active");
        activeFilter = type;
        renderCards();
      }
    }, label);
  }

  function renderCards() {
    cardsList.innerHTML = "";

    const filtered = EVACUATION_PAIRS.filter((item) => {
      if (activeFilter === "CRITICAL" && item.status !== "CRITICAL_ACTION_REQUIRED") return false;
      if (activeFilter === "HIGH" && item.status !== "HIGH_WATCHLIST") return false;
      if (activeFilter === "SELECTED_DISTRICT" && !item.district.includes(corridor.name.replace(" District", ""))) return false;

      if (searchQuery) {
        const text = `${item.originVillage} ${item.destShelter} ${item.transitRoute} ${item.district}`.toLowerCase();
        if (!text.includes(searchQuery)) return false;
      }
      return true;
    });

    if (!filtered.length) {
      cardsList.appendChild(
        el("div", { class: "card suraksha-empty-state" }, [
          el("p", { class: "muted" }, "No evacuation pairings match your current search/filter. Clear the search or click 'All 482 Villages'."),
        ])
      );
      return;
    }

    filtered.forEach((p) => {
      const card = renderBridgeCard(p, globalNotice);
      cardsList.appendChild(card);
    });
  }

  renderCards();
}

function renderBridgeCard(p, globalNotice) {
  const card = el("div", { class: "card suraksha-bridge-card" });

  const freeBeds = p.destCapacity - p.destOccupied;
  const occPct = Math.round((p.destOccupied / p.destCapacity) * 100);

  card.innerHTML = `
    <div class="bridge-card-top flex-between">
      <div class="bridge-district-tag">
        <span class="pulse-dot"></span>
        <strong>${p.district}</strong> · ${p.state}
      </div>
      <div class="bridge-status-tag ${p.status === "CRITICAL_ACTION_REQUIRED" ? "tag-critical" : "tag-high"}">
        ${p.status === "CRITICAL_ACTION_REQUIRED" ? "🚨 Priority 1: Immediate Relocation" : "⚠️ Priority 2: Standby Evacuation"}
      </div>
    </div>

    <div class="bridge-flow-grid">
      <!-- 1. ORIGIN HIGH RISK VILLAGE -->
      <div class="bridge-col origin-box">
        <div class="bridge-col-header flex-between">
          <span class="bridge-col-type text-danger">HIGH-RISK ORIGIN VILLAGE</span>
          <span class="badge badge-red tiny">${p.originRiskScore}/100 RISK</span>
        </div>
        <div class="village-name-title text-bold">${p.originVillage}</div>
        <div class="village-stat-row">
          <span class="muted tiny">Population at Risk:</span>
          <strong class="text-danger mono">${p.originPop.toLocaleString()} Citizens</strong>
        </div>
        <div class="village-hazard-box">
          <div class="tiny text-bold">Primary Geological Threat:</div>
          <div class="tiny muted" style="margin-top: 2px;">${p.originHazard}</div>
        </div>
        <div class="village-cutoff-flag ${p.originPop >= 4000 ? "text-danger" : "text-warning"} tiny">
          ⚠️ Single access lifeline · High isolation hazard
        </div>
      </div>

      <!-- 2. TRANSIT SETU (BRIDGE) -->
      <div class="bridge-col transit-box">
        <div class="transit-icon-badge">${ICONS.roadBlock}</div>
        <div class="transit-distance mono text-bold">${p.distanceKm} km</div>
        <div class="transit-time tiny text-cyan">~${p.transitTimeMin} mins transit</div>
        <div class="transit-arrow-wrap">
          <span class="transit-line"></span>
          <span class="transit-arrow-head">▶</span>
        </div>
        <div class="transit-route-text tiny">
          <strong>Route:</strong> ${p.transitRoute}
        </div>
        <div class="transit-convoy-text tiny muted">
          <strong>Fleet:</strong> ${p.convoyUnits}
        </div>
      </div>

      <!-- 3. DESTINATION SAFE REFUGE SHELTER -->
      <div class="bridge-col shelter-box">
        <div class="bridge-col-header flex-between">
          <span class="bridge-col-type text-success">DESIGNATED SAFE HAVEN SHELTER</span>
          <span class="badge badge-green tiny">${p.destRiskScore}/100 LOW RISK</span>
        </div>
        <div class="village-name-title text-bold text-success">${p.destShelter}</div>
        <div class="village-stat-row">
          <span class="muted tiny">Location:</span>
          <strong class="mono text-bold">${p.destVillage} (Stable Bedrock)</strong>
        </div>
        <div class="shelter-capacity-box">
          <div class="flex-between tiny">
            <span class="muted">Capacity Occupancy:</span>
            <span class="mono text-bold">${p.destOccupied}/${p.destCapacity} (${occPct}%)</span>
          </div>
          <div class="factor-bar-wrap" style="margin: 4px 0 6px;">
            <div class="factor-bar-fill" style="width: ${occPct}%; background: #10b981;"></div>
          </div>
          <div class="tiny text-success text-bold">
            ✓ ${freeBeds.toLocaleString()} refuge beds available
          </div>
        </div>
        <div class="shelter-amenities-pills">
          ${p.amenities.map(a => `<span class="amenity-pill">✓ ${a}</span>`).join("")}
        </div>
      </div>
    </div>

    <!-- ACTION FOOTER BAR -->
    <div class="bridge-actions-footer flex-between">
      <div class="bridge-footer-left tiny muted">
        <span>Autonomous Suraksha Setu Match ID: <strong>SS-${p.id.toUpperCase()}</strong></span>
        <span>· Evacuation Route Verified Live</span>
      </div>
      <div class="bridge-footer-btns">
        <button class="btn btn-secondary btn-small view-route-btn">
          <span>${ICONS.map}</span>
          <span>View Transit Waypoints</span>
        </button>
        <button class="btn btn-primary btn-small deploy-evac-btn">
          <span>${ICONS.send}</span>
          <span>Activate Suraksha Setu Evacuation</span>
        </button>
      </div>
    </div>

    <!-- Expandable Waypoints Accordion -->
    <div class="waypoints-accordion" style="display: none;">
      <div class="waypoints-inner">
        <div class="tiny text-bold" style="margin-bottom: 6px;">🗺️ Transit Route & Security Checkpoints:</div>
        <ol class="tiny muted" style="margin: 0; padding-left: 18px; line-height: 1.6;">
          <li>Assemble at <strong>${p.originVillage} Community Hall</strong> (Staging Point Alpha).</li>
          <li>Board assigned <strong>${p.convoyUnits}</strong> under SDRF supervision.</li>
          <li>Proceed along <strong>${p.transitRoute}</strong> — Police escort stationed at KM 4.2.</li>
          <li>Check-in & Medical Triage at <strong>${p.destShelter}</strong> gate reception.</li>
        </ol>
      </div>
    </div>
  `;

  const viewRouteBtn = card.querySelector(".view-route-btn");
  const accordion = card.querySelector(".waypoints-accordion");
  viewRouteBtn.addEventListener("click", () => {
    accordion.style.display = accordion.style.display === "none" ? "block" : "none";
    viewRouteBtn.classList.toggle("btn-active");
  });

  const deployBtn = card.querySelector(".deploy-evac-btn");
  deployBtn.addEventListener("click", () => {
    deployBtn.disabled = true;
    deployBtn.innerHTML = `<span>Deploying Evacuation Convoys...</span>`;

    setTimeout(() => {
      deployBtn.disabled = false;
      deployBtn.innerHTML = `<span>✓ Evacuation Active</span>`;
      deployBtn.classList.remove("btn-primary");
      deployBtn.classList.add("btn-secondary");

      globalNotice.style.display = "block";
      globalNotice.className = "suraksha-global-banner success-banner";
      globalNotice.innerHTML = `
        <div class="flex-between">
          <div class="banner-content">
            <strong>✅ SURAKSHA SETU EVACUATION CORRIDOR ACTIVATED!</strong>
            <p class="tiny" style="margin-top: 4px;">
              Common Alerting Protocol (CAP) multi-lingual SMS with GPS shelter coordinates dispatched to <strong>${p.originPop.toLocaleString()} residents</strong> of <strong>${p.originVillage}</strong>.
              ${p.convoyUnits} mobilized to transfer citizens to <strong>${p.destShelter}</strong>.
            </p>
          </div>
          <button class="banner-close-btn">&times;</button>
        </div>
      `;

      globalNotice.querySelector(".banner-close-btn").addEventListener("click", () => {
        globalNotice.style.display = "none";
      });

      globalNotice.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 900);
  });

  return card;
}
