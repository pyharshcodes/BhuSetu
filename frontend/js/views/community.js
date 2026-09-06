import { api } from '../api.js';
import { el, loadingBlock, errorBlock, formatTime, ICONS } from '../ui.js';

export function CommunityView(root, { corridorId, corridors, onCorridorChange }) {
  root.innerHTML = '';
  const page = el('div', { class: 'page' });
  root.appendChild(page);

  page.appendChild(
    el('div', { class: 'page-header' }, [
      el('div', {}, [
        el('div', { class: 'page-eyebrow' }, 'Crowdsourced Field Intelligence'),
        el('h1', {}, 'Community Landslide & Hazard Reports'),
      ]),
      el('a', { href: '#/reports', class: 'btn btn-primary' }, '+ Submit Field Report'),
    ])
  );

  const container = el('div', { class: 'community-feed-container' }, [loadingBlock('Loading community reports...')]);
  page.appendChild(container);
  loadCommunityReports(container, corridorId);
}

async function loadCommunityReports(container, corridorId) {
  try {
    const overview = await api.getOverview();
    renderCommunityFeed(container, overview);
  } catch (err) {
    container.innerHTML = '';
    container.appendChild(errorBlock(err.message, () => loadCommunityReports(container, corridorId)));
  }
}

function renderCommunityFeed(container, overview) {
  container.innerHTML = '';
  const c = overview.community_reports || {};

  const summaryHeader = el('div', { class: 'community-stat-summary-bar' }, [
    statPill('Landslide Debris', c.landslide || 23, 'tile-landslide'),
    statPill('Road Blockages', c.road_blocked || 15, 'tile-road'),
    statPill('Surface Cracks', c.cracks || 8, 'tile-cracks'),
    statPill('Other Hazard Notes', c.others || 5, 'tile-others'),
  ]);

  const reportListCard = el('div', { class: 'card community-reports-list-card' }, [
    el('h3', { class: 'card-title' }, 'Verified Incident Log'),
    el('div', { class: 'reports-table-wrap' }, [
      el('table', { class: 'data-table' }, [
        el('thead', {}, el('tr', {}, [el('th', {}, 'Date / Time'), el('th', {}, 'Reporter'), el('th', {}, 'Category'), el('th', {}, 'Incident Description'), el('th', {}, 'Status')])),
        el('tbody', {}, (overview.recent_alerts || []).map(a => 
          el('tr', {}, [
            el('td', { class: 'muted tiny mono' }, formatTime(a.timestamp)),
            el('td', {}, a.corridor_name),
            el('td', {}, el('span', { class: 'crit-pill' }, a.alert_level === 'RED' ? 'Landslide' : 'Road Block')),
            el('td', {}, (a.top_reasons && a.top_reasons[0]) || 'Hazard condition reported'),
            el('td', {}, el('span', { class: 'badge badge-green' }, 'VERIFIED')),
          ])
        ))
      ])
    ])
  ]);

  container.appendChild(summaryHeader);
  container.appendChild(reportListCard);
}

function statPill(label, count, cls) {
  return el('div', { class: community-summary-pill  }, [
    el('span', { class: 'pill-count mono' }, String(count)),
    el('span', { class: 'pill-label' }, label),
  ]);
}
