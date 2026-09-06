import { api } from '../api.js';
import { el, loadingBlock, errorBlock, ICONS } from '../ui.js';

export function SettingsView(root) {
  root.innerHTML = '';
  const page = el('div', { class: 'page' });
  root.appendChild(page);

  page.appendChild(
    el('div', { class: 'page-header' }, [
      el('div', {}, [
        el('div', { class: 'page-eyebrow' }, 'System Configuration & Diagnostics'),
        el('h1', {}, 'Platform Settings & Model Status'),
      ]),
    ])
  );

  const container = el('div', { class: 'settings-grid' }, [loadingBlock('Loading system settings...')]);
  page.appendChild(container);
  loadSettings(container);
}

async function loadSettings(container) {
  try {
    const health = await api.health();
    renderSettings(container, health);
  } catch (err) {
    container.innerHTML = '';
    container.appendChild(errorBlock(err.message, () => loadSettings(container)));
  }
}

function renderSettings(container, health) {
  container.innerHTML = '';

  const statusCard = el('div', { class: 'card setting-card' }, [
    el('h3', { class: 'card-title' }, 'Pipeline Diagnostics'),
    settingRow('Platform Version', 'SIH 2026 Edition (PS 26001 - MDoNER)'),
    settingRow('Simulation Mode', health.simulation_mode ? 'Active (Physical Simulator)' : 'Live IMD/Sentinel Feeds'),
    settingRow('Risk Engine Backend', health.model_mode === 'trained' ? 'Trained Model (.joblib)' : 'Multi-tier Fusion Formula'),
    settingRow('Explain Assistant', health.ai_explain_mode === 'llm' ? 'LLM Integrated' : 'Deterministic Rule Diagnosis'),
    settingRow('Database Engine', 'SQLite 3 (WAL mode)'),
  ]);

  const thresholdCard = el('div', { class: 'card setting-card' }, [
    el('h3', { class: 'card-title' }, 'Hazard Tier Classification Thresholds'),
    settingRow('Low Risk (Green)', '0 – 24.9% Score (Routine monitoring)'),
    settingRow('Moderate Risk (Yellow)', '25.0 – 49.9% Score (Advisory issued)'),
    settingRow('High Risk (Orange)', '50.0 – 74.9% Score (Field inspections dispatched)'),
    settingRow('Very High Risk (Red)', '75.0 – 100% Score (Immediate evacuation readiness)'),
  ]);

  container.appendChild(statusCard);
  container.appendChild(thresholdCard);
}

function settingRow(label, val) {
  return el('div', { class: 'setting-row' }, [
    el('span', { class: 'setting-label' }, label),
    el('span', { class: 'setting-val mono text-bold' }, val),
  ]);
}
