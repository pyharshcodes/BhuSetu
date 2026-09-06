import { el, ICONS } from '../ui.js';

export function ResourcesView(root) {
  root.innerHTML = '';
  const page = el('div', { class: 'page' });
  root.appendChild(page);

  page.appendChild(
    el('div', { class: 'page-header' }, [
      el('div', {}, [
        el('div', { class: 'page-eyebrow' }, 'Disaster Management & Emergency SOPs'),
        el('h1', {}, 'Operational Response Protocols & Resources'),
      ]),
    ])
  );

  const grid = el('div', { class: 'resources-grid' });

  // SOPs Card
  const sopCard = el('div', { class: 'card resource-card' }, [
    el('h3', { class: 'card-title' }, 'Action Protocols by Alert Level'),
    el('div', { class: 'sop-tier sop-red' }, [
      el('div', { class: 'sop-badge badge badge-red' }, 'CRITICAL / RED (Score 75-100)'),
      el('ul', {}, [
        el('li', {}, 'Immediate road closure and vehicle diversion on vulnerable highway sectors.'),
        el('li', {}, 'Deploy SDRF/NDRF search and evacuation units to cutoff roadside villages.'),
        el('li', {}, 'Activate satellite emergency comms and trigger automated siren warnings.'),
        el('li', {}, 'Open emergency relief shelters with medical and food stockpiles.'),
      ])
    ]),
    el('div', { class: 'sop-tier sop-orange' }, [
      el('div', { class: 'sop-badge badge badge-orange' }, 'WARNING / ORANGE (Score 50-75)'),
      el('ul', {}, [
        el('li', {}, 'Dispatch PWD engineers and quick-response teams to inspect slope cuttings and retaining walls.'),
        el('li', {}, 'Issue commercial transit advisories and restrict heavy night freight traffic.'),
        el('li', {}, 'Verify alternate route clearings for potentially isolated settlements.'),
      ])
    ]),
    el('div', { class: 'sop-tier sop-yellow' }, [
      el('div', { class: 'sop-badge badge badge-yellow' }, 'WATCH / YELLOW (Score 25-50)'),
      el('ul', {}, [
        el('li', {}, 'Increase IoT sensor polling frequency from hourly to 15-minute cycles.'),
        el('li', {}, 'Notify district disaster officers (DDMA) and road maintenance depots.'),
      ])
    ]),
  ]);

  // Helplines Card
  const contactsCard = el('div', { class: 'card resource-card' }, [
    el('h3', { class: 'card-title' }, 'NER Emergency Command Contacts'),
    el('div', { class: 'contacts-list' }, [
      contactItem('Assam State Disaster Management Authority (ASDMA)', '1070 / 0361-2237221', 'Disaster Control Room, Dispur'),
      contactItem('Dima Hasao District Emergency Operation Centre', '1077 / 03673-236324', 'DC Office, Haflong'),
      contactItem('1st Bn NDRF (Northeast Command)', '0361-2849005', 'Patgaon, Guwahati'),
      contactItem('Sikkim State Disaster Management Authority (SSDMA)', '1070 / 03592-202461', 'Tashiling Secretariat, Gangtok'),
      contactItem('Border Roads Organisation (Project Pushpak / Swastik)', 'Control: 1800-118-005', 'Hill Highway Clearance HQ'),
      contactItem('National Highway Authority of India (RO Guwahati)', '0361-2234055', 'NER Highway Coordination'),
    ])
  ]);

  grid.appendChild(sopCard);
  grid.appendChild(contactsCard);
  page.appendChild(grid);
}

function contactItem(name, phone, desc) {
  return el('div', { class: 'contact-row' }, [
    el('div', {}, [
      el('strong', { class: 'contact-name' }, name),
      el('div', { class: 'contact-desc muted tiny' }, desc),
    ]),
    el('div', { class: 'contact-phone mono text-bold' }, phone),
  ]);
}
