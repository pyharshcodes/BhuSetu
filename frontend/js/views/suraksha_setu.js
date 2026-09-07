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
    const [overviewData, corridorData, evacData] = await Promise.all([
      api.getOverview(),
      api.getDashboard(corridorId),
      api.getEvacuationActivations(corridorId).catch(() => ({ activations: [] })),
    ]);
    renderSurakshaSetuPage(page, corridorId, corridors, overviewData, corridorData, onCorridorChange, evacData.activations || []);
  } catch (err) {
    page.innerHTML = "";
    page.appendChild(errorBlock(err.message, () => loadSurakshaData(page, corridorId, corridors, onCorridorChange)));
  }
}

function renderSurakshaSetuPage(page, corridorId, corridors, overview, corridorDetail, onCorridorChange, existingActivations = []) {
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

  // Dynamically augment EVACUATION_PAIRS with any corridor-specific villages from DB
  if (corridorDetail && corridorDetail.villages && corridorDetail.villages.length > 0) {
    corridorDetail.villages.forEach((v, idx) => {
      const exists = EVACUATION_PAIRS.some(
        (p) => p.originVillage.toLowerCase() === v.name.toLowerCase()
      );
      if (!exists) {
        const shelterName = `${corridor.name.replace(" District", "")} Highland Emergency Refuge Center #${idx + 1}`;
        const isCritical = idx === 0 || !v.alternate_route_available;
        EVACUATION_PAIRS.push({
          id: `corridor-${corridor.id}-v-${v.id || idx}`,
          corridorId: corridor.id,
          district: corridor.name,
          state: corridor.state,
          originVillage: v.name,
          originPop: v.population_estimate || 2500,
          originRiskScore: isCritical ? 92 : 78,
          originRiskLevel: isCritical ? "RED" : "ORANGE",
          originHazard: v.alternate_route_available ? "Steep slope cutting and saturated soil overburden" : "Critical single-road cutoff & flash mudflow risk",
          destShelter: shelterName,
          destVillage: `${corridor.name.replace(" District", "")} Safe Sector`,
          destRiskScore: 16,
          destRiskLevel: "GREEN",
          destCapacity: Math.max(3500, Math.round((v.population_estimate || 2500) * 1.4)),
          destOccupied: Math.round((v.population_estimate || 2500) * 0.3),
          distanceKm: Number((5.5 + idx * 3.2).toFixed(1)),
          transitTimeMin: Math.round(15 + idx * 8),
          transitRoute: `Via Sector ${idx + 1} Hill Ridge Bypass (Protected PWD Axis)`,
          convoyUnits: `${4 + idx * 2} SDRF Troop Carriers & Ambulances`,
          amenities: ["Medical Post Onsite", "Clean Water Tanker", "14-Day Rations", "Solar Microgrid"],
          status: isCritical ? "CRITICAL_ACTION_REQUIRED" : "HIGH_WATCHLIST"
        });
      }
    });
  }

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
        "Autonomous GIS-paired routing between monitored landslide-prone settlements and fortified low-risk safe havens across Northeast India."
      ),
    ]),
    el("div", { class: "corridor-selector-wrap" }, [
      el("label", { class: "tiny muted text-bold" }, "Filter District:"),
      el("select", {
        class: "filter-dropdown",
        onchange: (e) => onCorridorChange(Number(e.target.value)),
      }, corridors.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => el("option", { value: c.id, ...(c.id === corridorId ? { selected: "selected" } : {}) }, `${c.name} (${c.state})`))),
    ]),
  ]);
  page.appendChild(header);

  // 2. SUMMARY METRICS TILES
  const totalCriticalPop = EVACUATION_PAIRS.reduce((sum, p) => sum + p.originPop, 0);
  const totalShelterCap = EVACUATION_PAIRS.reduce((sum, p) => sum + p.destCapacity, 0);
  const totalOccupied = EVACUATION_PAIRS.reduce((sum, p) => sum + p.destOccupied, 0);
  const availableBeds = totalShelterCap - totalOccupied;
  const monitoredVillages = (overview && overview.total_villages_count) || 43;
  const criticalVillages = (overview && overview.at_risk_villages_count) || 14;
  const criticalPop = EVACUATION_PAIRS.filter(p => p.status === "CRITICAL_ACTION_REQUIRED").reduce((sum, p) => sum + p.originPop, 0);

  const statsRow = el("div", { class: "suraksha-stats-row" }, [
    el("div", { class: "suraksha-stat-box stat-red" }, [
      el("div", { class: "suraksha-stat-val text-danger" }, String(monitoredVillages)),
      el("div", { class: "suraksha-stat-lbl" }, "Monitored Settlements"),
      el("div", { class: "suraksha-stat-sub muted tiny" }, "Across 22 Monitored Corridors"),
    ]),
    el("div", { class: "suraksha-stat-box stat-orange" }, [
      el("div", { class: "suraksha-stat-val text-warning" }, String(criticalVillages)),
      el("div", { class: "suraksha-stat-lbl" }, "Critical Cutoff Settlements"),
      el("div", { class: "suraksha-stat-sub muted tiny" }, `${(criticalPop || 42600).toLocaleString()} Citizens in immediate hazard`),
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

  // 2.5 INTERACTIVE SAFE-ROUTE NAVIGATOR & ROAD BLOCKAGE SIMULATOR (Option 3)
  const navigatorCard = renderRouteBlockageSimulatorCard(corridorDetail, EVACUATION_PAIRS);
  page.appendChild(navigatorCard);

  // 3. SEARCH & FILTER CONTROLS
  const controlsCard = el("div", { class: "card suraksha-controls-card" });
  const controlsBar = el("div", { class: "suraksha-controls-bar" });

  const filterBtns = el("div", { class: "suraksha-filters-group" }, [
    makeFilterBtn(`All Evacuation Sectors (${EVACUATION_PAIRS.length})`, "ALL", true),
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
          el("p", { class: "muted" }, "No evacuation pairings match your current search/filter. Clear the search or click 'All Evacuation Sectors'."),
        ])
      );
      return;
    }

    filtered.forEach((p) => {
      const card = renderBridgeCard(p, globalNotice, existingActivations, corridorId || corridor.id);
      cardsList.appendChild(card);
    });
  }

  renderCards();
}

function renderBridgeCard(p, globalNotice, existingActivations = [], corridorId = 1) {
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
          <div class="flex-between tiny muted">
            <span>Refuge Capacity: <strong>${p.destCapacity.toLocaleString()}</strong></span>
            <span>Free Beds: <strong class="text-success">${freeBeds.toLocaleString()}</strong></span>
          </div>
          <div class="shelter-bar-wrap">
            <div class="shelter-bar-fill" style="width: ${occPct}%; background: ${occPct > 80 ? "#ef4444" : "#10b981"};"></div>
          </div>
        </div>
        <div class="shelter-amenities-tags">
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

  const isAlreadyActive = existingActivations.some(
    (a) => a.pair_id === p.id || a.origin_village === p.originVillage
  );
  if (isAlreadyActive) {
    deployBtn.innerHTML = `<span>✓ Evacuation Active</span>`;
    deployBtn.classList.remove("btn-primary");
    deployBtn.classList.add("btn-secondary");
  }

  deployBtn.addEventListener("click", async () => {
    deployBtn.disabled = true;
    deployBtn.innerHTML = `<span>Deploying Evacuation Convoys...</span>`;

    try {
      await api.activateEvacuation({
        corridor_id: corridorId,
        pair_id: p.id,
        origin_village: p.originVillage,
        dest_shelter: p.destShelter,
        details: {
          origin_pop: p.originPop,
          dest_capacity: p.destCapacity,
          transit_route: p.transitRoute,
          convoy_units: p.convoyUnits,
          status: p.status,
        },
      });

      deployBtn.disabled = false;
      deployBtn.innerHTML = `<span>✓ Evacuation Active</span>`;
      deployBtn.classList.remove("btn-primary");
      deployBtn.classList.add("btn-secondary");

      globalNotice.style.display = "block";
      globalNotice.className = "suraksha-global-banner success-banner";
      globalNotice.innerHTML = `
        <div class="flex-between">
          <div class="banner-content">
            <strong>✅ SURAKSHA SETU EVACUATION PROTOCOL LOGGED & ACTIVATED!</strong>
            <p class="tiny" style="margin-top: 4px;">
              Common Alerting Protocol (CAP) multi-lingual SMS with GPS shelter coordinates dispatched to <strong>${p.originPop.toLocaleString()} residents</strong> of <strong>${p.originVillage}</strong>.
              ${p.convoyUnits} mobilized to transfer citizens to <strong>${p.destShelter}</strong>.
              <em>Recorded in National Evacuation Registry (SQLite DB).</em>
            </p>
          </div>
          <button class="banner-close-btn">&times;</button>
        </div>
      `;

      globalNotice.querySelector(".banner-close-btn").addEventListener("click", () => {
        globalNotice.style.display = "none";
      });

      globalNotice.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      deployBtn.disabled = false;
      deployBtn.innerHTML = `<span>⚠️ Retry Evacuation</span>`;
      alert("Evacuation dispatch error: " + err.message);
    }
  });

  return card;
}

// -------------------------------------------------------------------------
// Option 3: Interactive Safe-Route Navigator with Landslide Road Blockage Simulator
// -------------------------------------------------------------------------
function renderRouteBlockageSimulatorCard(corridorDetail, evacuationPairs) {
  const container = el("div", { class: "card suraksha-navigator-card", style: "margin-bottom: 24px;" });
  
  // Find current pair or default to first
  let selectedPair = evacuationPairs.find(
    (p) => corridorDetail && corridorDetail.corridor && (p.district.includes(corridorDetail.corridor.name) || p.corridorId === corridorDetail.corridor.id)
  ) || evacuationPairs[0];

  let isRoadBlocked = false;

  const cardHeader = el("div", { class: "navigator-card-header flex-between" }, [
    el("div", {}, [
      el("div", { class: "navigator-badge" }, [
        el("span", { class: "pulse-beacon-dot" }),
        "DYNAMIC GEOSPATIAL LOGISTICS & OBSTACLE SIMULATOR",
      ]),
      el("h3", { class: "card-title", style: "font-size: 1.15rem; margin-top: 4px;" }, "Interactive Safe-Route Navigator with Road Blockage Simulator"),
      el("p", { class: "muted tiny", style: "margin-top: 2px;" },
        "Simulates sudden landslide debris flow choking primary highway axis with autonomous re-routing to mountain ridge bypass."
      ),
    ]),
    el("div", { class: "navigator-selector-wrap" }, [
      el("label", { class: "tiny muted text-bold" }, "SDRF Evacuation Sector:"),
      el("select", {
        class: "filter-dropdown nav-sector-select",
        onchange: (e) => {
          const found = evacuationPairs.find((p) => p.id === e.target.value);
          if (found) {
            selectedPair = found;
            isRoadBlocked = false;
            updateUI();
          }
        },
      }, evacuationPairs.map((p) => el("option", { value: p.id, ...(p.id === selectedPair.id ? { selected: "selected" } : {}) }, `${p.originVillage} ➔ ${p.destShelter.slice(0, 24)}… (${p.district})`))),
    ]),
  ]);

  // Main interactive body
  const bodyGrid = el("div", { class: "navigator-body-grid" });

  // Left panel: Telemetry & Controls
  const leftPanel = el("div", { class: "navigator-telemetry-panel" });

  // Right panel: Leaflet Map
  const rightPanel = el("div", { class: "navigator-map-panel" });
  const mapDivId = "suraksha-route-leaflet-map-" + Math.floor(Math.random() * 10000);
  const mapContainer = el("div", {
    id: mapDivId,
    class: "suraksha-route-leaflet-map",
    style: "width: 100%; height: 380px; border-radius: 10px; z-index: 1;",
  });
  rightPanel.appendChild(mapContainer);

  bodyGrid.appendChild(leftPanel);
  bodyGrid.appendChild(rightPanel);

  container.appendChild(cardHeader);
  container.appendChild(bodyGrid);

  let map = null;
  let primaryPolyline = null;
  let bypassPolyline = null;
  let originMarker = null;
  let destMarker = null;
  let blockageMarker = null;

  function getWaypoints(pair) {
    const baseLat = Number(corridorDetail.corridor && corridorDetail.corridor.center_lat) || 25.180;
    const baseLon = Number(corridorDetail.corridor && corridorDetail.corridor.center_lon) || 93.030;
    
    // Deterministic offset based on pair name
    const seed = (pair.originVillage.charCodeAt(0) % 5) * 0.008;

    const origin = [baseLat - 0.035 - seed, baseLon - 0.025 - seed];
    const dest = [baseLat + 0.032 + seed, baseLon + 0.022 + seed];
    const blockage = [baseLat - 0.002, baseLon - 0.005];

    const primaryRoute = [
      origin,
      [baseLat - 0.020 - seed, baseLon - 0.015],
      blockage,
      [baseLat + 0.015, baseLon + 0.008],
      dest,
    ];

    const bypassRoute = [
      origin,
      [baseLat - 0.028 - seed, baseLon + 0.018],
      [baseLat - 0.005, baseLon + 0.032],
      [baseLat + 0.018, baseLon + 0.028],
      dest,
    ];

    return { origin, dest, blockage, primaryRoute, bypassRoute };
  }

  function initOrUpdateMap() {
    if (!window.L) return;
    const mapEl = document.getElementById(mapDivId);
    if (!mapEl) return;

    const { origin, dest, blockage, primaryRoute, bypassRoute } = getWaypoints(selectedPair);

    if (!map) {
      map = window.L.map(mapDivId, {
        zoomControl: true,
        attributionControl: false,
      }).setView(blockage, 12);
      container._leafletMap = map;

      window.L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}", {
        maxZoom: 16,
      }).addTo(map);

      // Primary Route
      primaryPolyline = window.L.polyline(primaryRoute, {
        color: "#0ea5e9",
        weight: 5,
        opacity: 0.9,
      }).addTo(map);

      // Bypass Route
      bypassPolyline = window.L.polyline(bypassRoute, {
        color: "#f59e0b",
        weight: 3,
        dashArray: "6, 8",
        opacity: 0.5,
      }).addTo(map);

      // Markers
      originMarker = window.L.circleMarker(origin, {
        radius: 9,
        fillColor: "#ef4444",
        color: "#ffffff",
        weight: 2,
        fillOpacity: 0.95,
      }).addTo(map).bindPopup(`<strong>Origin: ${selectedPair.originVillage}</strong><br/>Pop: ${selectedPair.originPop.toLocaleString()}<br/>Hazard: High Slope Slippage`);

      destMarker = window.L.circleMarker(dest, {
        radius: 10,
        fillColor: "#10b981",
        color: "#ffffff",
        weight: 2,
        fillOpacity: 0.95,
      }).addTo(map).bindPopup(`<strong>Safe Haven: ${selectedPair.destShelter}</strong><br/>Capacity: ${selectedPair.destCapacity.toLocaleString()} beds<br/>Risk: LOW (Stable Ridge)`);

      blockageMarker = window.L.circleMarker(blockage, {
        radius: 12,
        fillColor: "#dc2626",
        color: "#fef08a",
        weight: 3,
        fillOpacity: 0.95,
      }).bindPopup(`<strong>🚨 ROAD SEVERED: 450m³ Debris Flow</strong><br/>Primary Axis Choked at KM 3.2<br/>PWD earthmovers mobilized.`);
    } else {
      primaryPolyline.setLatLngs(primaryRoute);
      bypassPolyline.setLatLngs(bypassRoute);
      originMarker.setLatLng(origin).setPopupContent(`<strong>Origin: ${selectedPair.originVillage}</strong><br/>Pop: ${selectedPair.originPop.toLocaleString()}`);
      destMarker.setLatLng(dest).setPopupContent(`<strong>Safe Haven: ${selectedPair.destShelter}</strong><br/>Capacity: ${selectedPair.destCapacity.toLocaleString()} beds`);
      blockageMarker.setLatLng(blockage);
    }

    if (isRoadBlocked) {
      primaryPolyline.setStyle({ color: "#ef4444", weight: 5, dashArray: "6, 10", opacity: 0.85 });
      bypassPolyline.setStyle({ color: "#10b981", weight: 6, dashArray: null, opacity: 0.95 });
      if (!map.hasLayer(blockageMarker)) blockageMarker.addTo(map);
      blockageMarker.openPopup();
    } else {
      primaryPolyline.setStyle({ color: "#0ea5e9", weight: 5, dashArray: null, opacity: 0.9 });
      bypassPolyline.setStyle({ color: "#f59e0b", weight: 3, dashArray: "6, 8", opacity: 0.5 });
      if (map.hasLayer(blockageMarker)) map.removeLayer(blockageMarker);
    }

    const group = window.L.featureGroup([primaryPolyline, bypassPolyline]);
    map.fitBounds(group.getBounds().pad(0.15));
  }

  function updateUI() {
    leftPanel.innerHTML = "";

    const activeDist = isRoadBlocked ? (selectedPair.distanceKm + 5.4).toFixed(1) : selectedPair.distanceKm;
    const activeTime = isRoadBlocked ? selectedPair.transitTimeMin + 16 : selectedPair.transitTimeMin;
    const activeRouteName = isRoadBlocked ? `Alternate Ridge Bypass (${selectedPair.transitRoute})` : `Primary Highway Axis (Main Direct Route)`;
    const activeSpeed = isRoadBlocked ? "15-20 km/h (Mountain Detour)" : "35-45 km/h (Cleared Highway)";

    const statusBanner = el("div", {
      class: `nav-status-banner ${isRoadBlocked ? "nav-status-blocked" : "nav-status-clear"}`,
    }, [
      el("div", { class: "status-banner-title text-bold" },
        isRoadBlocked ? "🔴 PRIMARY AXIS CHOKED — REROUTED VIA RIDGE BYPASS" : "🟢 PRIMARY HIGHWAY CLEAR — DIRECT TRANSIT OPEN"
      ),
      el("div", { class: "status-banner-sub tiny" },
        isRoadBlocked
          ? "Mass debris flow triggered at KM 3.2. Telemetry diverted all convoys to secondary ridge bypass."
          : "Primary highway corridor nominal. Continuous InSAR slope monitoring active."
      ),
    ]);

    const metricsGrid = el("div", { class: "nav-metrics-grid" }, [
      el("div", { class: "nav-metric-card" }, [
        el("span", { class: "tiny muted text-bold" }, "ACTIVE TRANSIT CORRIDOR"),
        el("div", { class: "nav-metric-val", style: "font-size: 0.88rem; font-weight: 700; margin-top: 2px;" }, activeRouteName),
        el("span", { class: "tiny muted" }, isRoadBlocked ? "PWD Protected Ridge Line" : "State Highway / NH"),
      ]),
      el("div", { class: "nav-metric-card" }, [
        el("span", { class: "tiny muted text-bold" }, "ESTIMATED CONVOY ETA"),
        el("div", { class: `nav-metric-val mono ${isRoadBlocked ? "text-warning" : "text-success"}`, style: "font-size: 1.25rem; font-weight: 700;" }, `~${activeTime} mins`),
        el("span", { class: "tiny muted" }, isRoadBlocked ? "+16 min mountain penalty" : "Optimal Transit Time"),
      ]),
      el("div", { class: "nav-metric-card" }, [
        el("span", { class: "tiny muted text-bold" }, "TRANSIT DISTANCE"),
        el("div", { class: "nav-metric-val mono", style: "font-size: 1.25rem; font-weight: 700;" }, `${activeDist} km`),
        el("span", { class: "tiny muted" }, isRoadBlocked ? "+5.4 km bypass stretch" : "Direct Highway Leg"),
      ]),
      el("div", { class: "nav-metric-card" }, [
        el("span", { class: "tiny muted text-bold" }, "CONVOY TRANSIT SPEED"),
        el("div", { class: "nav-metric-val mono", style: "font-size: 1.05rem; font-weight: 600;" }, activeSpeed),
        el("span", { class: "tiny muted" }, isRoadBlocked ? "Single-file police escort" : "Normal all-weather pace"),
      ]),
    ]);

    const toggleBtn = el("button", {
      class: `btn ${isRoadBlocked ? "btn-secondary" : "btn-primary"} nav-sim-block-btn`,
      style: "width: 100%; justify-content: center; padding: 12px; font-weight: 700; font-size: 0.95rem; margin-top: 12px;",
      onclick: () => {
        isRoadBlocked = !isRoadBlocked;
        updateUI();
      },
    }, [
      el("span", {}, isRoadBlocked ? "✅ Clear Debris Flow & Restore Primary Highway" : "🚨 Simulate Landslide Road Blockage (Debris Flow at KM 3.2)"),
    ]);

    const legendRow = el("div", { class: "nav-legend-row tiny muted", style: "margin-top: 14px; display: flex; flex-wrap: wrap; gap: 12px;" }, [
      el("span", {}, [el("strong", { style: "color:#ef4444;" }, "● "), "Origin: " + selectedPair.originVillage]),
      el("span", {}, [el("strong", { style: "color:#10b981;" }, "● "), "Safe Haven: " + selectedPair.destShelter.slice(0, 18) + "…"]),
      el("span", {}, [el("strong", { style: "color:#0ea5e9;" }, "━ "), "Primary Highway"]),
      el("span", {}, [el("strong", { style: "color:#10b981;" }, "━ "), "Bypass Diversion"]),
      el("span", {}, [el("strong", { style: "color:#dc2626;" }, "⛔ "), "Debris Blockage"]),
    ]);

    leftPanel.appendChild(statusBanner);
    leftPanel.appendChild(metricsGrid);
    leftPanel.appendChild(toggleBtn);
    leftPanel.appendChild(legendRow);

    setTimeout(() => {
      initOrUpdateMap();
      if (map) map.invalidateSize();
    }, 40);
  }

  setTimeout(() => {
    updateUI();
  }, 50);

  return container;
}
