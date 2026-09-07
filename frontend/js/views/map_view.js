import { api } from '../api.js';
import { el, loadingBlock, errorBlock, districtGeospatialMap } from '../ui.js';

export function MapView(root, { corridorId, corridors, onCorridorChange }) {
  root.innerHTML = '';
  const page = el('div', { class: 'page full-map-page' });
  root.appendChild(page);

  page.appendChild(
    el('div', { class: 'page-header' }, [
      el('div', {}, [
        el('div', { class: 'page-eyebrow' }, 'Geospatial Hazard Intelligence'),
        el('h1', {}, 'Northeast India Regional Risk Map'),
      ]),
      corridorSelector(corridors, corridorId, onCorridorChange),
    ])
  );

  const mapContainer = el('div', { class: 'full-map-container' }, [loadingBlock('Loading geospatial layers...')]);
  page.appendChild(mapContainer);
  loadMap(mapContainer, corridorId, onCorridorChange);
}

function corridorSelector(corridors, selectedId, onChange) {
  const select = el(
    'select',
    { class: 'corridor-select', onchange: (e) => onChange(Number(e.target.value)) },
    corridors.slice().sort((a, b) => a.name.localeCompare(b.name)).map((c) => el('option', { value: c.id, ...(c.id === selectedId ? { selected: 'selected' } : {}) }, `${c.name} (${c.state})`))
  );
  return el('div', { class: 'corridor-selector' }, [el('label', {}, 'Focus Region'), select]);
}

async function loadMap(container, corridorId, onSelect) {
  try {
    const overview = await api.getOverview();
    container.innerHTML = '';
    const mapNode = districtGeospatialMap({
      districts: overview.districts,
      selectedDistrictId: corridorId,
      onSelectDistrict: (id) => onSelect(id),
      height: '680px',
      onDetailedReport: (id) => {
        location.hash = '#/dashboard';
      }
    });
    container.appendChild(mapNode);
  } catch (err) {
    container.innerHTML = '';
    container.appendChild(errorBlock(err.message, () => loadMap(container, corridorId, onSelect)));
  }
}
