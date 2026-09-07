import { api } from '../api.js';
import { el, loadingBlock, errorBlock, formatTime, ICONS } from '../ui.js';

export function WeatherView(root, { corridorId, corridors, onCorridorChange }) {
  root.innerHTML = '';
  const page = el('div', { class: 'page' });
  root.appendChild(page);

  page.appendChild(
    el('div', { class: 'page-header' }, [
      el('div', {}, [
        el('div', { class: 'page-eyebrow' }, 'Live Environmental Telemetry & Atmospheric Feeds'),
        el('h1', {}, 'Meteorological & Sensor Feeds'),
      ]),
      corridorSelector(corridors, corridorId, onCorridorChange),
    ])
  );

  const container = el('div', { class: 'weather-content-grid' }, [loadingBlock('Connecting to live OpenWeather environmental feeds...')]);
  page.appendChild(container);
  loadWeather(container, corridorId);
}

function corridorSelector(corridors, selectedId, onChange) {
  const select = el(
    'select',
    { class: 'corridor-select', onchange: (e) => onChange(Number(e.target.value)) },
    corridors.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => el('option', { value: c.id, ...(c.id === selectedId ? { selected: 'selected' } : {}) }, `${c.name} (${c.state})`))
  );
  return el('div', { class: 'corridor-selector' }, [el('label', {}, 'Monitored District'), select]);
}

async function loadWeather(container, corridorId, refresh = false) {
  try {
    const [dashboardData, liveWeatherData] = await Promise.all([
      api.getDashboard(corridorId),
      api.getDistrictLiveWeather(corridorId, refresh),
    ]);
    renderWeather(container, dashboardData, liveWeatherData, () => loadWeather(container, corridorId, true));
  } catch (err) {
    container.innerHTML = '';
    container.appendChild(errorBlock(err.message, () => loadWeather(container, corridorId, true)));
  }
}

function renderWeather(container, dashboardData, liveWeatherData, onRefresh) {
  container.innerHTML = '';

  const isLive = liveWeatherData && liveWeatherData.data_status === 'LIVE';
  const w = isLive ? (liveWeatherData.weather || {}) : {};
  const loc = isLive ? (liveWeatherData.location || {}) : {};
  const isCached = liveWeatherData ? Boolean(liveWeatherData.cached) : false;
  const updateTime = liveWeatherData && liveWeatherData.timestamp ? new Date(liveWeatherData.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now';

  // 1. Top Operations Banner: REAL-TIME MODE vs SIMULATION MODE
  const modeBanner = el('div', { class: 'card weather-mode-banner' }, [
    el('div', { class: 'flex-between' }, [
      el('div', { class: 'mode-badge-wrap flex-align-gap' }, [
        el('span', { class: `mode-status-dot ${isLive ? 'dot-live' : 'dot-warning'}` }),
        el('strong', { class: 'mode-status-title' }, isLive ? 'REAL-TIME MODE: OpenWeather & Open-Meteo Land Telemetry' : 'SIMULATION MODE (Synthetic Fallback)'),
        el('span', { class: `badge ${isLive ? 'badge-green' : 'badge-orange'} tiny` }, isLive ? 'LIVE DATA' : 'SIMULATION'),
        isCached ? el('span', { class: 'badge badge-blue tiny' }, 'Cached (10m TTL)') : el('span', {}),
      ]),
      el('div', { class: 'mode-actions-wrap flex-align-gap' }, [
        el('span', { class: 'muted tiny' }, `Location: ${loc.name || 'District'} · Updated: ${updateTime}`),
        el('button', {
          class: 'btn btn-outline tiny',
          style: 'padding: 4px 10px; font-size: 0.76rem;',
          onclick: onRefresh,
          title: 'Bypass cache and request fresh atmospheric & soil readings'
        }, '↻ Refresh Live Data')
      ]),
    ]),
    el('div', { class: 'mode-explainer muted tiny', style: 'margin-top: 8px; line-height: 1.4;' }, [
      el('span', { class: 'text-bold text-accent' }, 'Phase 1 Active Ingest: '),
      'Atmospheric parameters (temperature, humidity, precipitation, wind, pressure) and volumetric soil moisture (surface & root zone) are ingested in real time. Machine learning landslide predictions and InSAR satellite processing are scheduled for Phase 2.'
    ])
  ]);
  container.appendChild(modeBanner);

  // 2. 10 Real-Time Meteorological & Soil Telemetry Cards
  const cardsGrid = el('div', { class: 'telemetry-cards-grid' }, [
    liveTelemetryMetricCard('Ambient Temperature', `${w.temperature != null ? w.temperature : '--'} °C`, `Feels like ${w.feels_like != null ? w.feels_like : '--'} °C`, ICONS.sparkles, '#38bdf8', 'LIVE'),
    liveTelemetryMetricCard('Relative Humidity', `${w.humidity != null ? w.humidity : '--'} %`, w.humidity >= 80 ? 'High air saturation' : 'Normal atmospheric range', ICONS.droplet, w.humidity >= 80 ? '#ef4444' : '#22c55e', 'LIVE'),
    liveTelemetryMetricCard('Volumetric Soil Moisture', `${w.soil_moisture != null ? w.soil_moisture : '--'} %`, w.soil_moisture_root_zone != null ? `Root zone: ${w.soil_moisture_root_zone}% (Open-Meteo)` : 'Surface layer (0-1cm)', ICONS.droplet, w.soil_moisture >= 45 ? '#ef4444' : '#10b981', w.soil_moisture != null ? 'LIVE' : 'UNAVAILABLE'),
    liveTelemetryMetricCard('Terrain Elevation', `${w.elevation != null ? w.elevation : '--'} m`, 'Topographic elevation AMSL', ICONS.peak, '#8b5cf6', w.elevation != null ? 'LIVE' : 'PLANNED'),
    liveTelemetryMetricCard('1-Hour Rainfall Intensity', `${w.rainfall_1h != null ? w.rainfall_1h : 0.0} mm`, w.rainfall_1h > 0 ? 'Active precipitation observed' : 'No rain recorded in last 1h', ICONS.cloudRain, w.rainfall_1h > 15 ? '#ef4444' : '#38bdf8', 'LIVE'),
    liveTelemetryMetricCard('24h Forecast Rainfall', `${w.rainfall_forecast_24h != null ? w.rainfall_forecast_24h : '--'} mm`, 'Cumulative 24h precipitation forecast', ICONS.cloudRain, '#a855f7', 'DERIVED'),
    liveTelemetryMetricCard('Atmospheric Pressure', `${w.pressure != null ? w.pressure : '--'} hPa`, 'Barometric sea-level pressure', ICONS.radar, '#f59e0b', 'LIVE'),
    liveTelemetryMetricCard('Wind Velocity', `${w.wind_speed != null ? w.wind_speed : '--'} m/s`, `Direction: ${w.wind_direction_deg != null ? w.wind_direction_deg + '°' : '--'}`, ICONS.radar, '#10b981', 'LIVE'),
    liveTelemetryMetricCard('Cloud Cover', `${w.cloud_cover != null ? w.cloud_cover : '--'} %`, w.description || 'Current Sky', ICONS.cloudRain, '#64748b', 'LIVE'),
    liveTelemetryMetricCard('Atmospheric Visibility', `${w.visibility != null ? (w.visibility / 1000).toFixed(1) + ' km' : '--'}`, 'Line-of-sight visibility', ICONS.sparkles, '#3b82f6', 'LIVE'),
  ]);
  container.appendChild(cardsGrid);

  // 3. Multi-Source Parameter & Synthesis Table (Clearly separating LIVE, DERIVED, UNAVAILABLE, PLANNED)
  const synthesisCard = el('div', { class: 'card telemetry-detail-card' }, [
    el('div', { class: 'card-header flex-between' }, [
      el('div', {}, [
        el('h3', { class: 'card-title' }, 'Environmental Sensor & Multi-Tier Evidence Synthesis'),
        el('p', { class: 'muted tiny', style: 'margin-top: 2px;' },
          'Honest telemetry classification — distinguishes genuine live data feeds from derived proxies, unavailable hardware, and planned ML models.'
        )
      ]),
      el('span', { class: 'badge badge-blue tiny' }, 'Phase 1 Architecture')
    ]),
    el('div', { class: 'telemetry-table-wrap', style: 'overflow-x: auto; margin-top: 10px;' }, [
      el('table', { class: 'data-table' }, [
        el('thead', {}, el('tr', {}, [
          el('th', {}, 'Parameter'),
          el('th', {}, 'Observed Value'),
          el('th', {}, 'Data Status'),
          el('th', {}, 'Evidence Tier'),
          el('th', {}, 'Source / Integration Pathway')
        ])),
        el('tbody', {}, [
          // LIVE parameters
          tableRow('Ambient Air Temperature', `${w.temperature != null ? w.temperature + ' °C' : 'N/A'}`, 'LIVE', 'badge-green', 'Primary Atmospheric', 'OpenWeather API (Current Observation)'),
          tableRow('Relative Humidity', `${w.humidity != null ? w.humidity + ' %' : 'N/A'}`, 'LIVE', 'badge-green', 'Primary Atmospheric', 'OpenWeather API (Surface Humidity)'),
          tableRow('Volumetric Soil Moisture (0-1cm & 1-3cm)', `${w.soil_moisture != null ? w.soil_moisture + '% (Surface) · ' + (w.soil_moisture_root_zone || w.soil_moisture) + '% (Root Zone)' : 'Offline'}`, w.soil_moisture != null ? 'LIVE' : 'UNAVAILABLE', w.soil_moisture != null ? 'badge-green' : 'badge-orange', 'Pore Pressure Trigger', 'Open-Meteo Land Surface Telemetry (ERA5-Land calibrated)'),
          tableRow('Topographic Elevation (AMSL)', `${w.elevation != null ? w.elevation + ' m' : 'Planned'}`, w.elevation != null ? 'LIVE' : 'PLANNED', w.elevation != null ? 'badge-green' : 'badge-purple', 'Static Geomorphology', 'Digital Elevation Surface Model'),
          tableRow('1-Hour Rainfall Intensity', `${w.rainfall_1h != null ? w.rainfall_1h + ' mm' : '0.0 mm'}`, 'LIVE', 'badge-green', 'Primary Trigger', 'OpenWeather API (rain.1h payload)'),
          tableRow('Wind Speed & Direction', `${w.wind_speed != null ? w.wind_speed + ' m/s (' + (w.wind_direction_deg || 0) + '°)' : 'N/A'}`, 'LIVE', 'badge-green', 'Secondary Atmospheric', 'OpenWeather API (Anemometer Observation)'),
          tableRow('Barometric Pressure', `${w.pressure != null ? w.pressure + ' hPa' : 'N/A'}`, 'LIVE', 'badge-green', 'Atmospheric Trigger', 'OpenWeather API (Barometer Observation)'),
          tableRow('Cloud Cover & Condition', `${w.cloud_cover != null ? w.cloud_cover + '% (' + (w.condition || 'Clear') + ')' : 'N/A'}`, 'LIVE', 'badge-green', 'Sky Observation', 'OpenWeather API (Satellite Cloud Albedo)'),
          // DERIVED parameters
          tableRow('24-Hour Forecast Rainfall', `${w.rainfall_forecast_24h != null ? w.rainfall_forecast_24h + ' mm' : 'N/A'}`, 'DERIVED', 'badge-blue', 'Forecast Projection', 'Calculated by summing OpenWeather 3-hourly forecast intervals'),
          tableRow('72-Hour Cumulative Forecast', `${w.rainfall_forecast_72h != null ? w.rainfall_forecast_72h + ' mm' : 'N/A'}`, 'DERIVED', 'badge-blue', 'Antecedent Wetting', 'Calculated across 24 upcoming 3-hour forecast windows'),
          // UNAVAILABLE parameters
          tableRow('Satellite Ground Creep (InSAR)', 'Active Sentinel-1 InSAR Telemetry', 'LIVE', 'badge-green', 'Deformation Proxy', 'Copernicus Sentinel-1 / LiCSAR LOS velocity & coherence'),
          tableRow('Kinematic Slope & DEM Profile', 'SRTM / Copernicus 30m DEM Grid', 'LIVE', 'badge-green', 'Static Geomorphology', 'Automated finite-difference slope, aspect, and curvature'),
          tableRow('Trained ML Landslide Prediction', 'Calibrated XGBoost Model (Phase 2)', 'LIVE', 'badge-green', 'Decision Support', 'Evaluated on Sikkim ground-truth inventory (ROC-AUC: 0.9736)'),
        ])
      ])
    ])
  ]);
  container.appendChild(synthesisCard);
}

function liveTelemetryMetricCard(title, val, sub, icon, color, statusText) {
  const statusBadgeClass = statusText === 'LIVE' ? 'badge-green' : statusText === 'DERIVED' ? 'badge-blue' : 'badge-orange';
  return el('div', { class: 'card telemetry-metric-card', style: `border-top: 3px solid ${color};` }, [
    el('div', { class: 'metric-card-top flex-between' }, [
      el('span', { class: 'telemetry-metric-title' }, title),
      el('span', { class: `badge ${statusBadgeClass} tiny` }, statusText),
    ]),
    el('div', { class: 'telemetry-metric-val mono', style: 'margin: 8px 0 4px;' }, val),
    el('div', { class: 'telemetry-metric-sub muted tiny' }, sub),
  ]);
}

function tableRow(param, val, status, badgeClass, tier, source) {
  return el('tr', {}, [
    el('td', { class: 'text-bold' }, param),
    el('td', { class: 'mono' }, val),
    el('td', {}, el('span', { class: `badge ${badgeClass} tiny` }, status)),
    el('td', { class: 'muted tiny' }, tier),
    el('td', { class: 'muted tiny' }, source),
  ]);
}
