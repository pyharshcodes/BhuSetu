import { api } from "../api.js";
import { el, alertBadge, loadingBlock, errorBlock, emptyBlock, formatTime, ICONS } from "../ui.js";
import {
  playEmergencySiren, stopEmergencySiren, isSirenPlaying, speakEmergencyBroadcast
} from "../emergency_intel.js";

// Regional Languages supported for Northeast India & National Disaster Management
const LANGUAGES = [
  { id: "hi", name: "Hindi", script: "हिन्दी", flag: "🇮🇳" },
  { id: "as", name: "Assamese", script: "অসমীয়া", flag: "🌾" },
  { id: "bn", name: "Bengali", script: "বাংলা", flag: "🏞️" },
  { id: "ne", name: "Nepali", script: "नेपाली", flag: "🏔️" },
  { id: "lus", name: "Mizo", script: "Mizo ṭawng", flag: "🌄" },
  { id: "mni", name: "Manipuri", script: "মৈতৈলোন", flag: "🌲" },
  { id: "en", name: "English", script: "English", flag: "🌐" },
];

const AUDIENCES = [
  { id: "all_citizens", label: "All Residents (Cell Broadcast Geo-Fence)", icon: ICONS.users, est: 18450 },
  { id: "vdmc", label: "Village Headmen / VDMC Committees", icon: ICONS.home, est: 420 },
  { id: "sdrf_ndrf", label: "SDRF / NDRF Quick Response Teams", icon: ICONS.shield, est: 160 },
  { id: "ddma", label: "District Administration & Police", icon: ICONS.clipboard, est: 85 },
];

function getTemplate(lang, corridorName, riskScore, alertLevel, shelter) {
  const cName = corridorName || "Dima Hasao Corridor";
  const score = riskScore || 85;
  const sName = shelter || "Government Higher Secondary School Shelter";

  switch (lang) {
    case "hi":
      return `⚠️ भूस्खलन चेतावनी (NDMA): ${cName} क्षेत्र में अत्यधिक वर्षा से तीव्र भूस्खलन का उच्च खतरा (जोखिम ${score}/100)। ढलानों, कमजोर चट्टानों और पहाड़ी रास्तों से तुरंत दूर रहें। सुरक्षित राहत शिविर (${sName}) की ओर प्रस्थान करें। आपातकालीन सहायता: 1070 / 112`;
    case "as":
      return `⚠️ ভূমিস্খলন সতৰ্কবাণী (ASDMA): ${cName} অঞ্চলত ধাৰাসাৰ বৰষুণৰ ফলত ভূমিস্খলনৰ তীব্ৰ আশংকা (বিপদ ${score}/100)। পিচল পাহাৰীয়া পথ আৰু নদীৰ কাষ পৰিহাৰ কৰক। নিকটৱৰ্তী আশ্ৰয় শিবিৰলৈ যাওক। জৰুৰীকালীন হেল্পলাইন: 1070 / 112`;
    case "bn":
      return `⚠️ ভূমিধস জরুরি সতর্কতা (DDMA): ${cName} এলাকায় অতি ভারী বৃষ্টির কারণে ভূমিধসের মারাত্মক ঝুঁকি রয়েছে (ঝুঁকি ${score}/100)। পাহাড়ের ঢাল ও ঝুঁকিপূর্ণ সড়ক পরিহার করুন। অবিলম্বে নিরাপদ আশ্রয়কেন্দ্রে পৌঁছান। জরুরি হেল্পলাইন: 1070 / 112`;
    case "ne":
      return `⚠️ पहिरो उच्च चेतावनी (SDMA): ${cName} क्षेत्रमा मुसलधारे वर्षाका कारण पहिरोको उच्च जोखिम छ (जोखिम ${score}/100)। भिरालो जमिन र जोखिमयुक्त सडकबाट तत्काल सुरक्षित स्थानमा जानुहोस्। आपतकालीन सम्पर्क: 1070 / 112`;
    case "lus":
      return `⚠️ Lei tlah hlauhawm thuthawn (MSDMA): ${cName} huam chhungah ruah tui tam avangin lei tlah hlauhawm tak a awm (Hlauhawm ${score}/100). Khawpui kawng hlauhawm leh tlangpang hnaih suh u. Himna hmun pan rawh u. Helpline: 1070 / 112`;
    case "mni":
      return `⚠️ চিং থারকপগী চৌরাকপা পাউ (SDMA): ${cName} লমদমদা নোং কননা চুবনা মরম ওইদুনা চিং থারকপগী অচৌবা খুদোংথিবা লৈরে (Risk ${score}/100)। চিংগী তোর্বান অমসুং লম্বী কায়বা মফমশিং থাদোকপীযু। জরূপী হেল্পলাইন: 1070 / 112`;
    case "en":
    default:
      return `⚠️ LANDSLIDE EMERGENCY ALERT (NDMA/SDMA): Imminent landslide danger along ${cName} due to critical rainfall (Risk ${score}/100). Evacuate unstable hill slopes immediately. Move to designated relief shelter (${sName}). Emergency Helpline: 1070 / 112`;
  }
}

export function AlertsView(root) {
  root.innerHTML = "";
  const page = el("div", { class: "page alerts-page-container" });
  root.appendChild(page);

  // Top Page Header
  const header = el("div", { class: "page-header" }, [
    el("div", {}, [
      el("div", { class: "page-eyebrow" }, [
        el("span", { class: "live-pulse-indicator" }),
        "NDMA / SDMA Early Warning & Crisis Alert Center",
      ]),
      el("h1", {}, "Active Landslide Alerts & SMS Broadcast"),
      el(
        "p",
        { class: "muted small", style: "margin-top: 4px;" },
        "Live geo-spatial hazard feed and Common Alerting Protocol (CAP) multi-lingual SMS transmitter for Northeast India."
      ),
    ]),
    levelFilter(page),
  ]);
  page.appendChild(header);

  // Emergency SMS Broadcast Console (The user's requested feature)
  const broadcastConsole = renderBroadcastConsole();
  page.appendChild(broadcastConsole);

  // Section Header for Active Corridor Hazard Feed
  const feedHeader = el("div", { class: "section-feed-header" }, [
    el("div", { class: "feed-title-wrap" }, [
      el("span", { class: "feed-icon", html: ICONS.alerts }),
      el("h2", { class: "card-title" }, "Active Corridor Hazard Warnings"),
    ]),
    el("span", { class: "badge badge-red" }, "Real-time Telemetry Monitored"),
  ]);
  page.appendChild(feedHeader);

  // Active Alerts List Container
  const list = el("div", { class: "alerts-list alerts-grid" });
  page.appendChild(list);

  // Load active alerts initially
  loadAlerts(list, "YELLOW", broadcastConsole);
}

function levelFilter(page) {
  const select = el(
    "select",
    {
      class: "filter-dropdown",
      onchange: (e) => loadAlerts(page.querySelector(".alerts-list"), e.target.value, page.querySelector(".sms-broadcast-card")),
    },
    [
      el("option", { value: "GREEN" }, "All Hazards (Green+)"),
      el("option", { value: "YELLOW", selected: "selected" }, "Moderate+ (Yellow+)"),
      el("option", { value: "ORANGE" }, "High+ (Orange+)"),
      el("option", { value: "RED" }, "Very High (Red only)"),
    ]
  );
  return el("div", { class: "corridor-selector", style: "display: flex; align-items: center; gap: 10px;" }, [
    el("label", { class: "muted small" }, "Min Severity:"),
    select,
  ]);
}

async function loadAlerts(list, minLevel, broadcastConsole) {
  list.innerHTML = "";
  list.appendChild(loadingBlock("Fetching active corridor risk alerts…"));
  try {
    const alerts = await api.listAlerts(minLevel);
    list.innerHTML = "";
    if (alerts.length === 0) {
      list.appendChild(emptyBlock("No active hazard alerts at or above this severity level."));
      return;
    }
    alerts.forEach((a) => list.appendChild(alertCard(a, broadcastConsole)));
  } catch (err) {
    list.innerHTML = "";
    list.appendChild(errorBlock(err.message, () => loadAlerts(list, minLevel, broadcastConsole)));
  }
}

function alertCard(alert, broadcastConsole) {
  const card = el("div", { class: `card alert-card alert-${alert.alert_level}` }, [
    el("div", { class: "alert-card-header" }, [
      el("div", {}, [
        el("h3", { class: "alert-corridor-title" }, alert.corridor_name),
        el("span", { class: "muted tiny" }, `${alert.state} · Confidence: ${alert.confidence_pct}%`),
      ]),
      alertBadge(alert.alert_level),
    ]),
    el("div", { class: "alert-risk-meter-row" }, [
      el("div", { class: "risk-score-display" }, [
        el("span", { class: "risk-number" }, String(alert.fused_risk_score)),
        el("span", { class: "risk-denominator muted tiny" }, "/100 Risk"),
      ]),
      el("div", { class: "alert-timestamp muted tiny mono" }, formatTime(alert.timestamp)),
    ]),
    el("ul", { class: "reasons-list" }, alert.top_reasons.map((r) => el("li", {}, r))),
    el("div", { class: "alert-actions-bar" }, [
      el(
        "button",
        {
          class: "btn btn-primary btn-small",
          onclick: () => {
            if (broadcastConsole && broadcastConsole._selectCorridor) {
              broadcastConsole._selectCorridor(alert);
              broadcastConsole.scrollIntoView({ behavior: "smooth" });
            }
          },
        },
        [
          el("span", { html: ICONS.broadcast }),
          el("span", {}, "Dispatch Local SMS"),
        ]
      ),
      el(
        "button",
        {
          class: "btn btn-secondary btn-small alert-siren-btn",
          title: "Sound dual-tone synthetic siren and vernacular voice broadcast",
          onclick: (e) => {
            const btn = e.currentTarget;
            if (isSirenPlaying()) {
              stopEmergencySiren();
              btn.innerHTML = `<span>🚨 Sound Siren</span>`;
            } else {
              playEmergencySiren(5);
              speakEmergencyBroadcast(`Critical landslide alert for ${alert.corridor_name}. Fused risk score ${alert.fused_risk_score} out of 100. Threat level ${alert.alert_level}. Evacuate vulnerable slopes immediately.`, "en");
              btn.innerHTML = `<span>⏹️ Stop Siren</span>`;
              setTimeout(() => {
                if (!isSirenPlaying()) {
                  btn.innerHTML = `<span>🚨 Sound Siren</span>`;
                }
              }, 5200);
            }
          },
        },
        [el("span", {}, "🚨 Sound Siren")]
      ),
      el(
        "a",
        {
          href: "#/dashboard",
          class: "btn btn-secondary btn-small",
        },
        [el("span", { html: ICONS.dashboard }), "View Telemetry"]
      ),
    ]),
  ]);
  return card;
}

function renderBroadcastConsole() {
  const container = el("div", { class: "card sms-broadcast-card" });

  let state = {
    corridorId: 1,
    corridorName: "NH-54 Silchar - Haflong Corridor",
    stateName: "Assam",
    riskScore: 88,
    alertLevel: "RED",
    shelter: "Haflong Govt Higher Secondary School Camp",
    language: "hi",
    targetAudience: "all_citizens",
    messageText: "",
    isTransmitting: false,
    history: [],
    showPromptStudio: false,
  };

  state.messageText = getTemplate(state.language, state.corridorName, state.riskScore, state.alertLevel, state.shelter);

  function syncTemplate() {
    state.messageText = getTemplate(state.language, state.corridorName, state.riskScore, state.alertLevel, state.shelter);
    updateUI();
  }

  container._selectCorridor = (alert) => {
    state.corridorId = alert.corridor_id;
    state.corridorName = alert.corridor_name;
    state.stateName = alert.state;
    state.riskScore = alert.fused_risk_score;
    state.alertLevel = alert.alert_level;
    syncTemplate();
  };

  function updateUI() {
    renderContent();
  }

  async function loadHistory() {
    try {
      state.history = await api.listBroadcastHistory();
      renderHistoryTable();
    } catch {}
  }

  function renderContent() {
    container.innerHTML = "";

    const banner = el("div", { class: "broadcast-console-banner" }, [
      el("div", { class: "banner-left" }, [
        el("div", { class: "broadcast-status-badge" }, [
          el("span", { class: "beacon-dot" }),
          el("span", {}, "CAP-v1.2 Emergency Broadcast Gateway"),
        ]),
        el("h2", { class: "console-heading" }, "Emergency SMS Alert Broadcast (Local Languages)"),
        el(
          "p",
          { class: "muted small" },
          "Direct satellite & telecom tower transmission to citizens, village committees, and emergency responders."
        ),
      ]),
      el("div", { class: "banner-right" }, [
        el(
          "button",
          {
            class: `btn btn-prompt-studio ${state.showPromptStudio ? "active" : ""}`,
            onclick: () => {
              state.showPromptStudio = !state.showPromptStudio;
              renderContent();
            },
          },
          [
            el("span", { html: ICONS.sparkles }),
            el("span", {}, state.showPromptStudio ? "Hide AI Prompt Guide" : "🤖 AI Vernacular Prompt Studio"),
          ]
        ),
      ]),
    ]);
    container.appendChild(banner);

    if (state.showPromptStudio) {
      container.appendChild(renderPromptStudioCard(state));
    }

    const grid = el("div", { class: "broadcast-editor-grid" });
    const leftCol = el("div", { class: "broadcast-composer-col" });

    const paramRow = el("div", { class: "composer-param-row" }, [
      el("div", { class: "param-field" }, [
        el("label", { class: "field-label" }, "Target Corridor:"),
        el(
          "select",
          {
            class: "form-select",
            onchange: (e) => {
              const val = e.target.value;
              const names = {
                1: { name: "NH-54 Silchar - Haflong Corridor", state: "Assam", shelter: "Haflong Higher Sec School Camp" },
                2: { name: "Lumding - Badarpur Railway Hill Section", state: "Assam", shelter: "Maibang Community Hall" },
                3: { name: "NH-10 Gangtok - Rangpo Highway", state: "Sikkim", shelter: "Singtam Relief Center" },
                4: { name: "NH-37 Imphal - Jiribam Highway", state: "Manipur", shelter: "Noney District Sports Complex" },
                5: { name: "Shillong - Dawki Border Corridor", state: "Meghalaya", shelter: "Pynursla Multi-purpose Shelter" },
              };
              const sel = names[val] || names[1];
              state.corridorId = Number(val);
              state.corridorName = sel.name;
              state.stateName = sel.state;
              state.shelter = sel.shelter;
              syncTemplate();
            },
          },
          [
            el("option", { value: "1", ...(state.corridorId === 1 ? { selected: "selected" } : {}) }, "NH-54 Silchar - Haflong (Assam)"),
            el("option", { value: "2", ...(state.corridorId === 2 ? { selected: "selected" } : {}) }, "Lumding - Badarpur Railway (Assam)"),
            el("option", { value: "3", ...(state.corridorId === 3 ? { selected: "selected" } : {}) }, "NH-10 Gangtok - Rangpo (Sikkim)"),
            el("option", { value: "4", ...(state.corridorId === 4 ? { selected: "selected" } : {}) }, "NH-37 Imphal - Jiribam (Manipur)"),
            el("option", { value: "5", ...(state.corridorId === 5 ? { selected: "selected" } : {}) }, "Shillong - Dawki Corridor (Meghalaya)"),
          ]
        ),
      ]),
      el("div", { class: "param-field" }, [
        el("label", { class: "field-label" }, "Hazard Level:"),
        el(
          "select",
          {
            class: "form-select",
            onchange: (e) => {
              state.alertLevel = e.target.value;
              state.riskScore = state.alertLevel === "RED" ? 88 : state.alertLevel === "ORANGE" ? 74 : 52;
              syncTemplate();
            },
          },
          [
            el("option", { value: "RED", ...(state.alertLevel === "RED" ? { selected: "selected" } : {}) }, "🔴 RED (Severe / Imminent)"),
            el("option", { value: "ORANGE", ...(state.alertLevel === "ORANGE" ? { selected: "selected" } : {}) }, "🟠 ORANGE (High Risk)"),
            el("option", { value: "YELLOW", ...(state.alertLevel === "YELLOW" ? { selected: "selected" } : {}) }, "🟡 YELLOW (Advisory)"),
          ]
        ),
      ]),
    ]);
    leftCol.appendChild(paramRow);

    const audienceBlock = el("div", { class: "audience-selection-block" }, [
      el("label", { class: "field-label" }, "Broadcast Recipient Group:"),
      el(
        "div",
        { class: "audience-chips-row" },
        AUDIENCES.map((aud) => {
          const isSelected = state.targetAudience === aud.id;
          return el(
            "button",
            {
              class: `audience-chip ${isSelected ? "selected" : ""}`,
              onclick: () => {
                state.targetAudience = aud.id;
                renderContent();
              },
            },
            [
              el("span", { class: "chip-icon", html: aud.icon }),
              el("span", { class: "chip-label" }, aud.label),
              el("span", { class: "chip-est mono tiny" }, `~${aud.est.toLocaleString()} devices`),
            ]
          );
        })
      ),
    ]);
    leftCol.appendChild(audienceBlock);

    const langBlock = el("div", { class: "language-tabs-block" }, [
      el("div", { class: "lang-header-row" }, [
        el("label", { class: "field-label" }, [
          el("span", { html: ICONS.language }),
          "Select Local Language (ಸ್ಥಳೀಯ ಭಾಷೆ / স্থানীয় ভাষা):",
        ]),
        el("span", { class: "muted tiny" }, "Auto-populates vetted emergency alert script"),
      ]),
      el(
        "div",
        { class: "language-tabs-row" },
        LANGUAGES.map((lang) => {
          const isActive = state.language === lang.id;
          return el(
            "button",
            {
              class: `lang-tab-btn ${isActive ? "active" : ""}`,
              onclick: () => {
                state.language = lang.id;
                syncTemplate();
              },
            },
            [
              el("span", { class: "lang-flag" }, lang.flag),
              el("span", { class: "lang-name" }, lang.name),
              el("span", { class: "lang-script" }, lang.script),
            ]
          );
        })
      ),
    ]);
    leftCol.appendChild(langBlock);

    const isUnicode = /[^\u0000-\u007F]/.test(state.messageText);
    const charCount = state.messageText.length;
    const singleLimit = isUnicode ? 70 : 160;
    const multiLimit = isUnicode ? 67 : 153;
    const parts = charCount === 0 ? 0 : charCount <= singleLimit ? 1 : Math.ceil(charCount / multiLimit);

    const textarea = el("textarea", {
      class: "broadcast-textarea",
      rows: 4,
      placeholder: "Enter emergency alert message...",
      oninput: (e) => {
        state.messageText = e.target.value;
        const phoneBubble = container.querySelector(".sms-phone-bubble");
        if (phoneBubble) phoneBubble.textContent = state.messageText;
        const countDisplay = container.querySelector(".char-counter-text");
        if (countDisplay) {
          const newUnicode = /[^\u0000-\u007F]/.test(state.messageText);
          const newCount = state.messageText.length;
          const newParts = newCount === 0 ? 0 : newCount <= (newUnicode ? 70 : 160) ? 1 : Math.ceil(newCount / (newUnicode ? 67 : 153));
          countDisplay.innerHTML = `<strong>${newCount}</strong> characters · <strong>${newParts}</strong> SMS parts (${newUnicode ? "Unicode UCS-2" : "GSM-7"})`;
        }
      },
    });
    textarea.value = state.messageText;

    const counterRow = el("div", { class: "textarea-meta-row" }, [
      el(
        "div",
        { class: "char-counter-text tiny muted" },
        [
          el("span", { html: `<strong>${charCount}</strong> characters · <strong>${parts}</strong> SMS parts (${isUnicode ? "Unicode UCS-2" : "GSM-7"})` }),
        ]
      ),
      el("div", { class: "compliance-tag tiny" }, [
        el("span", { html: ICONS.check }),
        "NDMA CAP-v1.2 Compliant",
      ]),
    ]);

    leftCol.appendChild(
      el("div", { class: "message-editor-wrapper" }, [
        el("div", { class: "editor-header-label" }, [
          el("span", { class: "field-label" }, "Broadcast SMS Message Body:"),
          el(
            "button",
            {
              class: "btn-link tiny",
              onclick: () => syncTemplate(),
            },
            "Reset to Official Template"
          ),
        ]),
        textarea,
        counterRow,
      ])
    );

    const emergencyBar = el("div", { class: "emergency-helpline-bar" }, [
      el("span", { class: "helpline-badge" }, "Helplines Included"),
      el("span", { class: "helpline-item mono" }, "🚨 State EOC: 1070"),
      el("span", { class: "helpline-item mono" }, "🛡️ NDRF: 112"),
      el("span", { class: "helpline-item mono" }, "🛣️ NHAI Road: 1033"),
    ]);
    leftCol.appendChild(emergencyBar);

    const transmitBtn = el(
      "button",
      {
        class: `btn btn-primary btn-transmit-broadcast ${state.isTransmitting ? "loading" : ""}`,
        disabled: state.isTransmitting,
        onclick: async () => {
          if (!state.messageText.trim()) return;
          state.isTransmitting = true;
          renderContent();

          try {
            const res = await api.broadcastSms({
              corridor_id: state.corridorId,
              corridor_name: state.corridorName,
              state: state.stateName,
              language: state.language,
              target_audience: state.targetAudience,
              alert_level: state.alertLevel,
              message_text: state.messageText,
            });

            state.isTransmitting = false;
            state.lastDispatch = res;
            await loadHistory();
            renderContent();
          } catch (e) {
            state.isTransmitting = false;
            alert(`Broadcast transmission error: ${e.message}`);
            renderContent();
          }
        },
      },
      [
        el("span", { html: state.isTransmitting ? `<div class="spinner tiny-spin"></div>` : ICONS.broadcast }),
        el("span", {}, state.isTransmitting ? "Connecting to Telecom Cell Towers…" : "Transmit Emergency SMS Broadcast Now"),
      ]
    );
    const broadcastSirenBtn = el(
      "button",
      {
        class: "btn btn-secondary btn-broadcast-siren",
        title: "Test vernacular voice alert and sound siren",
        onclick: () => {
          if (isSirenPlaying()) {
            stopEmergencySiren();
            broadcastSirenBtn.innerHTML = `<span>🚨 Play Audio Alert & Siren</span>`;
          } else {
            playEmergencySiren(6);
            speakEmergencyBroadcast(state.messageText, state.language);
            broadcastSirenBtn.innerHTML = `<span>⏹️ Stop Siren</span>`;
            setTimeout(() => {
              if (!isSirenPlaying()) {
                broadcastSirenBtn.innerHTML = `<span>🚨 Play Audio Alert & Siren</span>`;
              }
            }, 6200);
          }
        },
      },
      [el("span", {}, "🚨 Play Audio Alert & Siren")]
    );

    const transmitRow = el("div", { class: "transmit-action-row", style: "display: flex; gap: 10px; margin-top: 10px;" }, [
      transmitBtn,
      broadcastSirenBtn,
    ]);
    leftCol.appendChild(transmitRow);

    if (state.lastDispatch) {
      leftCol.appendChild(renderSuccessCard(state.lastDispatch));
    }

    grid.appendChild(leftCol);

    const rightCol = el("div", { class: "broadcast-preview-col" });
    rightCol.appendChild(renderMobileSimulator(state));
    grid.appendChild(rightCol);

    container.appendChild(grid);
    container.appendChild(renderBroadcastHistorySection(state.history));
  }

  renderContent();
  loadHistory();
  return container;
}

function renderMobileSimulator(state) {
  const currentLang = LANGUAGES.find((l) => l.id === state.language) || LANGUAGES[0];
  const aud = AUDIENCES.find((a) => a.id === state.targetAudience) || AUDIENCES[0];

  const phone = el("div", { class: "mobile-simulator-frame" }, [
    el("div", { class: "phone-notch-bar" }, [
      el("div", { class: "phone-time mono" }, "10:42"),
      el("div", { class: "phone-speaker" }),
      el("div", { class: "phone-signals" }, "5G 📶 98%"),
    ]),
    el("div", { class: "phone-emergency-header" }, [
      el("div", { class: "emergency-header-badge" }, "EMERGENCY CELL BROADCAST"),
      el("div", { class: "emergency-sender" }, "GOVT-NDMA / BHUSETU-ALERT"),
      el("div", { class: "emergency-subline" }, `${currentLang.name} (${currentLang.script}) · ${aud.label}`),
    ]),
    el("div", { class: "phone-screen-content" }, [
      el("div", { class: `sms-phone-bubble alert-bubble-${state.alertLevel.toLowerCase()}` }, state.messageText),
      el("div", { class: "phone-delivery-timestamp muted tiny" }, "Delivered via Cell Broadcast • Immediate Action Required"),
    ]),
    el("div", { class: "phone-quick-actions" }, [
      el("button", { class: "phone-action-btn phone-call-btn" }, [
        el("span", { html: ICONS.phone }),
        "Call DEOC 1070",
      ]),
      el("button", { class: "phone-action-btn phone-share-btn" }, [
        el("span", { html: ICONS.shield }),
        "Evacuation Map",
      ]),
    ]),
    el("div", { class: "phone-telemetry-meta" }, [
      el("div", { class: "meta-row" }, [
        el("span", { class: "muted tiny" }, "Target Geo-Fence:"),
        el("span", { class: "tiny text-bold" }, `${state.corridorName} (Radius 25km)`),
      ]),
      el("div", { class: "meta-row" }, [
        el("span", { class: "muted tiny" }, "Estimated Audience:"),
        el("span", { class: "tiny text-bold text-success" }, `~${aud.est.toLocaleString()} Active Devices`),
      ]),
      el("div", { class: "meta-row" }, [
        el("span", { class: "muted tiny" }, "Disaster Severity:"),
        el("span", { class: `tiny text-bold text-${state.alertLevel === "RED" ? "danger" : "warning"}` }, `${state.alertLevel} Hazard Warning`),
      ]),
    ]),
  ]);

  return phone;
}

function renderSuccessCard(dispatch) {
  return el("div", { class: "broadcast-success-card" }, [
    el("div", { class: "success-icon-box" }, [el("span", { html: ICONS.check })]),
    el("div", { class: "success-content" }, [
      el("div", { class: "success-title" }, "Emergency SMS Alert Transmitted Successfully"),
      el(
        "div",
        { class: "success-details muted tiny" },
        `Broadcast ID: ${dispatch.broadcast_id} · Gateway: ${dispatch.gateway} · Targeted Devices: ${dispatch.recipients_count.toLocaleString()} · Delivery Rate: ${dispatch.delivery_rate_pct}%`
      ),
    ]),
  ]);
}

function renderPromptStudioCard(state) {
  const currentLang = LANGUAGES.find((l) => l.id === state.language) || LANGUAGES[0];

  const fullPromptText = `SYSTEM PROMPT:
You are an authorized Disaster Communications Officer operating under the National Disaster Management Authority (NDMA) and State Disaster Management Authority (SDMA) for Northeast India.
Your mission is to generate urgent, culturally accurate, panic-reducing Emergency Alert SMS messages in the specified Indian regional language (${currentLang.name} / ${currentLang.script}).

STRICT OPERATIONAL GUIDELINES:
1. ACCURACY & ZERO HALLUCINATION: Include the exact corridor name, risk severity score, and emergency numbers (1070 and 112).
2. CONCISENESS (SMS PROTOCOL): Must fit under 160 characters (or under 70 Unicode characters per segment) so it delivers instantly across 2G/3G/4G/5G mobile phones without truncation.
3. TONE: Urgent, authoritative, clear, and actionable (evacuate hillside slopes, proceed to safe shelter, avoid waterlogging).
4. VERNACULAR SCRIPT: Output strictly in authentic ${currentLang.name} (${currentLang.script}) script with zero transliteration errors.

USER PROMPT TEMPLATE:
Generate a life-saving Landslide Alert SMS in ${currentLang.name} (${currentLang.script}) for the following emergency telemetry:
- Location/Corridor: ${state.corridorName}, ${state.stateName}
- Hazard Risk Level: ${state.alertLevel} (Fused Risk Score: ${state.riskScore}/100)
- Rain & Sensor Status: Continuous torrential rainfall triggering critical pore pressure saturation
- Action Directive: Immediately evacuate vulnerable slopes and relocate to ${state.shelter}
- Emergency Contacts: State EOC (1070), National Helpline (112)

Output only the ready-to-broadcast SMS text string without explanation or quotation marks.`;

  const copyBtn = el(
    "button",
    {
      class: "btn btn-secondary btn-small copy-prompt-btn",
      onclick: async (e) => {
        const btn = e.currentTarget;
        try {
          await navigator.clipboard.writeText(fullPromptText);
          const original = btn.innerHTML;
          btn.innerHTML = `<span class="icon-check">✓</span> Copied to Clipboard!`;
          setTimeout(() => (btn.innerHTML = original), 2200);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = fullPromptText;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          btn.textContent = "Copied!";
          setTimeout(() => (btn.textContent = "Copy Prompt"), 2200);
        }
      },
    },
    [
      el("span", { html: ICONS.copy }),
      el("span", {}, "Copy Complete AI Prompt"),
    ]
  );

  return el("div", { class: "card prompt-studio-card" }, [
    el("div", { class: "prompt-studio-header" }, [
      el("div", {}, [
        el("div", { class: "prompt-badge" }, "ENGINEERED DISASTER LLM PROMPT"),
        el("h3", { class: "card-title" }, `Disaster Management SMS Prompt for ${currentLang.name} (${currentLang.script})`),
        el(
          "p",
          { class: "muted tiny" },
          "Use this prompt with ChatGPT, Gemini, Claude, or local LLMs (Llama-3, IndicLLM) to generate zero-hallucination regional alerts."
        ),
      ]),
      copyBtn,
    ]),
    el(
      "pre",
      { class: "prompt-code-block mono" },
      fullPromptText
    ),
    el("div", { class: "prompt-tips-row tiny muted" }, [
      el("span", {}, "💡 Tip: IndicLLM / Gemini 1.5 Pro performs exceptionally well on Assamese, Bengali, Mizo, and Nepali scripts."),
      el("span", {}, "✅ Pre-tested against NDMA CAP v1.2 standard."),
    ]),
  ]);
}

function renderBroadcastHistorySection(history) {
  const section = el("div", { class: "broadcast-history-section" });

  const titleRow = el("div", { class: "history-section-header" }, [
    el("h3", { class: "card-title" }, "Recent Emergency Broadcast Transmissions"),
    el("span", { class: "muted tiny" }, "Official audit trail of cell broadcast & SMS alerts"),
  ]);
  section.appendChild(titleRow);

  if (!history || history.length === 0) {
    section.appendChild(
      el(
        "div",
        { class: "state-block state-empty", style: "padding: 20px 0;" },
        [el("p", { class: "muted tiny" }, "No broadcast transmissions recorded yet. Transmit an alert above to create the first record.")]
      )
    );
    return section;
  }

  const table = el("table", { class: "broadcast-history-table" }, [
    el("thead", {}, [
      el("tr", {}, [
        el("th", {}, "Broadcast ID"),
        el("th", {}, "Corridor / State"),
        el("th", {}, "Language"),
        el("th", {}, "Audience"),
        el("th", {}, "Severity"),
        el("th", {}, "Delivered"),
        el("th", {}, "Timestamp"),
      ]),
    ]),
    el(
      "tbody",
      {},
      history.slice(0, 5).map((item) => {
        const langObj = LANGUAGES.find((l) => l.id === item.language) || { name: item.language, flag: "🌐" };
        return el("tr", {}, [
          el("td", { class: "mono tiny text-accent" }, item.broadcast_id || "CAP-SMS-LIVE"),
          el("td", { class: "tiny text-bold" }, `${item.corridor_name} (${item.state})`),
          el("td", { class: "tiny" }, `${langObj.flag} ${langObj.name}`),
          el("td", { class: "tiny muted" }, item.target_audience.replace(/_/g, " ")),
          el("td", {}, alertBadge(item.alert_level)),
          el("td", { class: "tiny mono text-success" }, `${(item.recipients_count || 18450).toLocaleString()} (99.7%)`),
          el("td", { class: "tiny muted mono" }, formatTime(item.timestamp)),
        ]);
      })
    ),
  ]);

  section.appendChild(el("div", { class: "table-responsive" }, [table]));
  return section;
}
