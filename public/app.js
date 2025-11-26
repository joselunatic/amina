const categoryIcons = {
  OV_BASE: '🛰️',
  CRIME_SCENE: '☠️',
  ESOTERROR_CELL: '🔺',
  MUNDANE_TOWN: '🏙️',
  INDUSTRIAL_SITE: '🏭',
  NATURAL_SITE: '🌲',
  NPC: '👤',
  RUMOR: '❓'
};

const categoryLabels = {
  OV_BASE: 'Base OV',
  CRIME_SCENE: 'Escena del Crimen',
  ESOTERROR_CELL: 'Célula Esoterrorista',
  MUNDANE_TOWN: 'Pueblo Mundano',
  INDUSTRIAL_SITE: 'Sitio Industrial',
  NATURAL_SITE: 'Sitio Natural',
  NPC: 'PNJ Clave',
  RUMOR: 'Rumor'
};

const state = {
  map: null,
  pois: [],
  poiMarkers: new Map(),
  dmMode: false,
  dmSecret: null,
  agent: null,
  agents: [],
  messages: [],
  editingPoiId: null,
  pickMode: false,
  pickMarker: null,
  filters: {
    category: '',
    session_tag: '',
    search: ''
  }
  ,
  messageFilters: {
    recipient: '',
    session_tag: '',
    since: '',
    box: '',
    unread_only: false
  },
  showOlderMobilePois: false,
  missionNotes: '',
  journalDm: '',
  activeDmBlade: 'journal',
  mobileTab: 'map',
  poiFocal: null,
  activeMessage: null,
  activeMessageIndex: 0
  ,
  replyTarget: null,
  entities: [],
  entityFiltersAgent: { type: '', q: '' },
  entityFiltersAdmin: { type: '', q: '', include_archived: true },
  activeEntityAgent: null,
  activeEntityAdmin: null,
  agentBlade: 'focal'
  , entitiesMap: null,
  entityDetailMap: null,
  entityDetailMarker: null,
  unlockedEntities: new Set(),
  activeEntityContext: null,
  entityMarkers: [],
  workspaceView: 'map',
  graphs: {
    agent: null,
    dm: null
  }
};

const mapCenter = [-76.229, 40.68];
const MISSION_NOTES_KEY = 'amina_mission_notes';
const JOURNAL_DM_KEY = 'amina_journal_dm';
const TICKER_REFRESH_INTERVAL = 1000 * 60 * 2;
const FOOTER_CLOCK_INTERVAL = 1000;
const MEMBRANE_STATUS_TEXT = 'ESTABILIDAD DE MEMBRANA: 92%';
const TICKER_STATE_KEY = 'amina_ticker_state';

const dmSecretInput = document.getElementById('dm-secret');
const dmWarning = document.getElementById('dm-warning');
const clearanceStatus = document.getElementById('clearance-status');
const agentStatus = document.getElementById('agent-status');
const categoryFilter = document.getElementById('category-filter');
const sessionFilter = document.getElementById('session-filter');
const poiList = document.getElementById('poi-list');
const poiListDm = document.getElementById('poi-list-dm');
const poiSearchInput = document.getElementById('poi-search');
const poiFormSection = document.getElementById('poi-form-section');
const poiForm = document.getElementById('poi-form');
const poiFormTitle = document.getElementById('poi-form-title');
const poiSubmitButton = document.getElementById('poi-submit');
const poiCancelButton = document.getElementById('poi-cancel');
const pickButton = document.getElementById('pick-location');
const messageBar = document.getElementById('message-bar');
const poiCategorySelect = document.getElementById('poi-category');
const dmOnlySections = document.querySelectorAll('.dm-only');
const clearanceResetBtn = document.getElementById('clearance-reset');
const bootScreen = document.getElementById('boot-screen');
const bootPlayerBtn = document.getElementById('boot-player');
const bootDmBtn = document.getElementById('boot-dm');
const bootDmForm = document.getElementById('boot-dm-form');
const bootDmSecretInput = document.getElementById('boot-dm-secret');
const bootCancelBtn = document.getElementById('boot-cancel');
const bootStatus = document.getElementById('boot-status');
const bootOutput = document.getElementById('boot-output');
const bootMenu = document.getElementById('boot-menu');
const agentLoginDiv = document.getElementById('agent-login');
const agentSelect = document.getElementById('agent-select');
const agentPassInput = document.getElementById('agent-pass');
const agentLoginButton = document.getElementById('agent-login-button');
const agentLoginStatus = document.getElementById('agent-login-status');
const collapsibleToggles = document.querySelectorAll('.collapsible-toggle');
let bootSequenceId = 0;
const messageFeed = document.getElementById('message-feed');
const messageForm = document.getElementById('message-form');
const messageFromInput = document.getElementById('message-from');
const messageToSelect = document.getElementById('message-to');
const messageSubjectInput = document.getElementById('message-subject');
const messageBodyInput = document.getElementById('message-body');
const messageClearBtn = document.getElementById('message-clear');
const messageSessionInput = document.getElementById('message-session');
const filterRecipientSelect = document.getElementById('filter-recipient');
const filterSessionInput = document.getElementById('filter-session');
const filterSinceInput = document.getElementById('filter-since');
const filterBoxSelect = document.getElementById('filter-box');
const filterUnreadCheckbox = document.getElementById('filter-unread');
const filterApplyBtn = document.getElementById('filter-apply');
const debugPanel = document.getElementById('debug-panel');
let debugMode = false;
const commandMenu = document.getElementById('command-menu');
const commandInput = document.getElementById('command-input');
const commandLog = document.getElementById('command-log');
const commandMapBtn = document.getElementById('command-map');
const commandInboxBtn = document.getElementById('command-inbox');
const tickerTrack = document.getElementById('ticker-track');
const footerMembraneStatus = document.getElementById('footer-membrane-status');
const footerTime = document.getElementById('footer-time');
const sidebarPanel = document.querySelector('.control-panel');
const appLayout = document.querySelector('.app-layout');
const panelToggleBtn = document.getElementById('panel-toggle');
const poiFormDefaultParent = poiFormSection ? poiFormSection.parentNode : null;
const inboxOverlay = document.getElementById('inbox-overlay');
const inboxMessages = document.getElementById('inbox-messages');
const inboxCloseBtn = document.getElementById('inbox-close');
const focalPoiContent = document.getElementById('focal-poi-content');
const focalPoiContentDm = document.getElementById('dm-focal-poi-content');
const consoleMessageContent = document.getElementById('console-message-content');
const missionBriefText = document.getElementById('mission-brief-text');
const journalPublicInput = document.getElementById('journal-public');
const journalDmInput = document.getElementById('journal-dm');
const journalSaveBtn = document.getElementById('journal-save');
const mobileNav = document.getElementById('mobile-nav');
const dmFormOpenBtn = document.getElementById('dm-form-open');
const msgPrevBtn = document.getElementById('msg-prev');
const msgNextBtn = document.getElementById('msg-next');
const msgBoxToggleBtn = document.getElementById('msg-box-toggle');
const msgReplyBtn = document.getElementById('msg-reply');
const replyPane = document.getElementById('mailbox-reply');
const replyBodyInput = document.getElementById('reply-body');
const replyCancelBtn = document.getElementById('reply-cancel');
const replySendBtn = document.getElementById('reply-send');
const replyLabel = document.getElementById('reply-label');
const msgBoxLabel = document.getElementById('msg-box-label');
const radarRow = document.getElementById('radar-row');
let tickerSavedOffset = 0;
let tickerAnimationStart = 0;
let tickerAnimationDuration = 0;
let tickerDatasetSignature = '';
let mapResizeTimeout = null;
const agentTabs = document.getElementById('agent-tabs');
const dossierList = document.getElementById('dossier-list');
const dossierDetail = document.getElementById('dossier-detail');
const dossierSearch = document.getElementById('dossier-search');
const dossierListAdmin = document.getElementById('dossier-list-admin');
const dossierDetailAdmin = document.getElementById('dossier-detail-admin');
const dossierSearchAdmin = document.getElementById('dossier-search-admin');
const agentGraphContainer = document.getElementById('agent-graph');
const dmGraphContainer = document.getElementById('dm-graph');
const entityForm = document.getElementById('entity-form');
const entityIdInput = document.getElementById('entity-id');
const entityKindInput = document.getElementById('entity-kind');
const entityTypeInput = document.getElementById('entity-type');
const entityCodeNameInput = document.getElementById('entity-code-name');
const entityRealNameInput = document.getElementById('entity-real-name');
const entityRoleInput = document.getElementById('entity-role');
const entityStatusInput = document.getElementById('entity-status');
const entityAlignmentInput = document.getElementById('entity-alignment');
const entityThreatInput = document.getElementById('entity-threat');
const entityImageInput = document.getElementById('entity-image');
const entitySessionFirstInput = document.getElementById('entity-session-first');
const entitySessionLastInput = document.getElementById('entity-session-last');
const entitySessionsInput = document.getElementById('entity-sessions');
const entityPoisInput = document.getElementById('entity-pois');
const entityLinksInput = document.getElementById('entity-links');
const entityLinksSearch = document.getElementById('entity-links-search');
const entityLinksSuggestions = document.getElementById('entity-links-suggestions');
const entityLinksChips = document.getElementById('entity-links-chips');
const entityPublicNoteInput = document.getElementById('entity-public-note');
const entityDmNoteInput = document.getElementById('entity-dm-note');
const entityVisibilityInput = document.getElementById('entity-visibility');
const entityUnlockInput = document.getElementById('entity-unlock');
const entityLockedHintInput = document.getElementById('entity-locked-hint');
const unlockFields = document.querySelector('.unlock-fields');
const entityArchivedInput = document.getElementById('entity-archived');
const entityResetBtn = document.getElementById('entity-reset');
const entitySubmitBtn = document.getElementById('entity-submit');
const dossierTypeButtons = document.querySelectorAll('#dossier-card .dossier-type');
const dossierTypeButtonsAdmin = document.querySelectorAll('.console-blade[data-blade-panel="dossiers"] .dossier-type');
const dmFilterTypeButtons = document.querySelectorAll('.dm-filter-type');
const dmEntityList = document.getElementById('dm-entity-list');
const dmEntitySearch = document.getElementById('dm-entity-search');
const dmEntitiesContext = document.getElementById('dm-entities-context');
const dmEntitiesMapContainer = document.getElementById('dm-entities-map');
const dmEntitiesDetail = document.getElementById('dm-entities-detail');
const agentDossierList = document.getElementById('dossier-list');
const agentDossierDetail = document.getElementById('dossier-detail');
const workspaceTabs = document.querySelectorAll('.workspace-tab');
const workspaceViews = document.querySelectorAll('.workspace-view');
const workspaceTopViews = document.querySelectorAll('.workspace-top');
const mapPanelEl = document.getElementById('map-panel');
const mapShell = document.querySelector('.map-shell');
const mapFilters = document.getElementById('map-filters');
const mapFiltersDm = document.getElementById('map-filters-dm');

const formIds = {
  id: entityIdInput,
  name: entityCodeNameInput,
  latitude: document.getElementById('poi-latitude'),
  longitude: document.getElementById('poi-longitude'),
  imageUrl: document.getElementById('poi-image-url'),
  threat: document.getElementById('poi-threat'),
  veil: document.getElementById('poi-veil'),
  session: document.getElementById('poi-session'),
  publicNote: document.getElementById('poi-public-note'),
  dmNote: document.getElementById('poi-dm-note')
};

const entityPoisSelect = {
  input: document.getElementById('entity-pois-search'),
  suggestions: document.getElementById('entity-pois-suggestions'),
  chips: document.getElementById('entity-pois-chips'),
  hidden: document.getElementById('entity-pois')
};

const unlockOverlay = document.getElementById('unlock-overlay');
const unlockHint = document.getElementById('unlock-hint');
const unlockInput = document.getElementById('unlock-code-input');
const unlockClose = document.getElementById('unlock-close');
const unlockConfirm = document.getElementById('unlock-confirm');

async function init() {
  populateCategoryOptions();
  bindEvents();
  renderFocalPoiCard();
  renderActiveMessageCard();
  updateRoleLayoutClasses();
  setDmBlade('journal');
  setWorkspaceView('map');
  loadMissionNotes();
  loadJournalDm();
  setMobileTab('map');
  // collapse POI list by default
  const defaultPoiToggle = document.querySelector('.poi-list-section .collapsible-toggle');
  const defaultPoiBody = document.querySelector('.poi-list-section .collapsible-body');
  if (defaultPoiToggle && defaultPoiBody && !defaultPoiBody.classList.contains('collapsed')) {
    toggleCollapsible(defaultPoiToggle);
  }
  updateViewportMode();
  await setupMap();
  await loadPois();
  showMessage('AMINA en línea. Vigilancia de la membrana nominal.');
  await loadAgentList();
  hydrateFromCookies();
  applyAgentStatus();
  await loadEntities();
  updateMessageBoxLabel();
  initFooterTicker();
  initFooterMembrane();
  startFooterClock();
  window.addEventListener('beforeunload', saveTickerProgress);
  window.addEventListener('resize', () => {
    updateViewportMode();
    if (state.mobileTab === 'map' && state.map && isMobileView()) {
      scheduleMapResize();
    }
  });
}

function populateCategoryOptions() {
  Object.entries(categoryLabels).forEach(([value, label]) => {
    const formOption = document.createElement('option');
    formOption.value = value;
    formOption.textContent = label;
    poiCategorySelect.appendChild(formOption);
  });
  if (mapFilters) {
    renderMapFilters();
  }
}

function bindEvents() {
  if (categoryFilter) {
    categoryFilter.addEventListener('change', () => handleFilterSubmit());
  }
  if (sessionFilter) {
    sessionFilter.addEventListener('change', () => handleFilterSubmit());
  }
  if (poiForm) {
    poiForm.addEventListener('submit', handlePoiSubmit);
  }
  poiCancelButton?.addEventListener('click', resetPoiForm);
  pickButton?.addEventListener('click', togglePickMode);
  entityTypeInput?.addEventListener('change', () => updateEntityFormMode(entityTypeInput.value));
  if (clearanceResetBtn) {
    clearanceResetBtn.addEventListener('click', showBootScreen);
  }
  bootPlayerBtn.addEventListener('click', () => showAgentLogin());
  bootDmBtn.addEventListener('click', () => {
    bootMenu.classList.add('hidden');
    bootDmForm.classList.add('visible');
    bootDmSecretInput.focus();
  });
  bootCancelBtn.addEventListener('click', () => {
    bootDmForm.classList.remove('visible');
    bootDmSecretInput.value = '';
    bootStatus.textContent = '';
    bootMenu.classList.remove('hidden');
  });
  bootDmForm.addEventListener('submit', handleBootDmSubmit);
  collapsibleToggles.forEach((toggle) => {
    toggle.addEventListener('click', () => toggleCollapsible(toggle));
  });
  commandMapBtn?.addEventListener('click', () => runCommand('SHOW AMINA MAP'));
  commandInboxBtn?.addEventListener('click', () => runCommand('SHOW AGENT INBOX'));
  commandInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runCommand(commandInput.value);
    }
  });
  if (messageForm) {
    messageForm.addEventListener('submit', handleMessageSubmit);
  }
  if (messageClearBtn) {
    messageClearBtn.addEventListener('click', () => {
      messageForm.reset();
      messageFromInput.value = 'Sr. Verdad';
    });
  }
  if (filterApplyBtn) {
    filterApplyBtn.addEventListener('click', applyMessageFilters);
  }
  if (filterBoxSelect) {
    filterBoxSelect.addEventListener('change', applyMessageFilters);
  }
  msgPrevBtn?.addEventListener('click', showPrevMessage);
  msgNextBtn?.addEventListener('click', showNextMessage);
  msgBoxToggleBtn?.addEventListener('click', toggleMessageBoxView);
  msgReplyBtn?.addEventListener('click', () => {
    if (!state.activeMessage) return;
    startReply(state.activeMessage);
  });
  replyCancelBtn?.addEventListener('click', cancelReply);
  replySendBtn?.addEventListener('click', submitReply);
  if (inboxCloseBtn) {
    inboxCloseBtn.addEventListener('click', hideInboxView);
  }
  panelToggleBtn?.addEventListener('click', () => toggleSidebar());
  if (journalSaveBtn) {
    journalSaveBtn.addEventListener('click', () => {
      saveMissionNotes(journalPublicInput?.value || '');
      saveJournalDm(journalDmInput?.value || '');
      showMessage('Journal actualizado.');
    });
  }
  if (mobileNav) {
    mobileNav.addEventListener('click', (event) => {
      const target = event.target.closest('[data-mobile-tab]');
      if (!target) return;
      setMobileTab(target.getAttribute('data-mobile-tab'));
    });
  }
  agentLoginButton.addEventListener('click', handleAgentLogin);
  agentPassInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAgentLogin();
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-entity-jump]');
    if (!target) return;
    const id = target.getAttribute('data-entity-jump');
    setActiveEntityAgentById(id);
  });

  document.addEventListener('click', (event) => {
    const unlockBtn = event.target.closest('[data-unlock-target]');
    if (!unlockBtn) return;
    const id = unlockBtn.getAttribute('data-unlock-target');
    const hint = unlockBtn.getAttribute('data-unlock-hint') || '';
    openUnlockOverlay(id, hint);
  });

  workspaceTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      setWorkspaceView(tab.dataset.view);
    });
  });

  dossierTypeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.entityFiltersAgent.type = btn.dataset.dossierType || '';
      highlightDossierType('agent', state.entityFiltersAgent.type);
      renderAgentDossiers();
    });
  });

  dossierTypeButtonsAdmin.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.entityFiltersAdmin.type = btn.dataset.dossierType || '';
      highlightDossierType('admin', state.entityFiltersAdmin.type);
      renderAdminDossiers();
    });
  });

  dmFilterTypeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      state.entityFiltersAdmin.type = btn.dataset.type || '';
      dmFilterTypeButtons.forEach((b) => b.classList.toggle('active', b.dataset.type === state.entityFiltersAdmin.type));
      loadEntities();
    });
  });

  poiSearchInput?.addEventListener('input', () => {
    state.filters.search = poiSearchInput.value.trim();
    renderPoiList();
  });

  dmEntitySearch?.addEventListener('input', () => {
    state.entityFiltersAdmin.q = dmEntitySearch.value.trim();
    renderAdminDossiers();
  });

  dossierSearch?.addEventListener('input', () => {
    state.entityFiltersAgent.q = dossierSearch.value;
    renderAgentDossiers();
  });

  dossierSearchAdmin?.addEventListener('input', () => {
    state.entityFiltersAdmin.q = dossierSearchAdmin.value;
    renderAdminDossiers();
  });

  if (entityForm) {
    entityForm.addEventListener('submit', handleEntitySubmit);
  }
  entityResetBtn?.addEventListener('click', resetEntityForm);
  setupMultiSelect(entityPoisSelect, () => state.pois || [], 'poi');
  setupMultiSelect(
    {
      input: entityLinksSearch,
      suggestions: entityLinksSuggestions,
      chips: entityLinksChips,
      hidden: entityLinksInput
    },
    () => (state.entities || []).filter((e) => e.type !== 'poi'),
    'entity'
  );
  if (entityVisibilityInput) {
    entityVisibilityInput.addEventListener('change', toggleUnlockFields);
    toggleUnlockFields();
  }
  unlockClose?.addEventListener('click', hideUnlockOverlay);
  unlockOverlay?.addEventListener('click', (event) => {
    if (event.target === unlockOverlay) hideUnlockOverlay();
  });
  unlockConfirm?.addEventListener('click', () => {
    const id = unlockOverlay?.dataset.targetId;
    const code = unlockInput?.value || '';
    if (id) attemptUnlock(id, code.trim());
  });
  unlockInput?.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      const id = unlockOverlay?.dataset.targetId;
      const code = unlockInput?.value || '';
      if (id) attemptUnlock(id, code.trim());
    }
  });

}

const bootLines = [
  'AMINA BIOS // NÚCLEO DE MEMBRANA v5.2',
  'Iniciando sensores de red de campo...',
  'Verificando nodos de Schuylkill...',
  'Integridad de la señal: ESTABLE',
  'Índice de desgarro de membrana: MODERADO',
  'Canales de autorización disponibles:'
];

async function setupMap() {
  const config = await fetch('/api/config').then((res) => res.json());
  state.mapboxConfig = config;
  mapboxgl.accessToken = config.mapboxToken;
  debugMode = config.debug;
  if (debugMode && debugPanel) {
    debugPanel.classList.remove('hidden');
    logDebug('Modo depuración activo');
  }
  const styleUrl = config.mapStyle || 'mapbox://styles/mapbox/dark-v11';
  state.map = new mapboxgl.Map({
    container: 'map',
    style: styleUrl,
    center: mapCenter,
    zoom: 9
  });

  state.map.addControl(new mapboxgl.NavigationControl());
  state.map.addControl(new mapboxgl.FullscreenControl());
  // Remove hillshade layer if the style references a missing source layer to avoid console spam
  state.map.on('styledata', () => {
    try {
      if (state.map.getLayer('hillshade')) {
        state.map.removeLayer('hillshade');
      }
      if (state.map.getSource('hillshade')) {
        state.map.removeSource('hillshade');
      }
    } catch (err) {
      // ignore cleanup errors
    }
  });
  state.map.on('click', (event) => {
    if (state.pickMode) {
      setPickedLocation(event.lngLat.lat, event.lngLat.lng);
      disablePickMode();
    }
  });
}

async function loadPois() {
  const params = new URLSearchParams();
  if (state.filters.category) params.append('category', state.filters.category);
  if (state.filters.session_tag) params.append('session_tag', state.filters.session_tag);
  const url = params.toString() ? `/api/pois?${params.toString()}` : '/api/pois';

  const response = await fetch(url);
  if (!response.ok) {
    showMessage('Fallo al cargar PdIs.', true);
    return;
  }
  state.pois = await response.json();
  renderPoiList();
  renderMarkers();
  focusMapOnPois();
  loadMessages();
  if (state.poiFocal) {
    const updated = state.pois.find((poi) => poi.id === state.poiFocal.id);
    setFocalPoi(updated || state.pois[0] || null);
  } else if (state.pois.length) {
    setFocalPoi(state.pois[0]);
  } else {
    setFocalPoi(null);
  }
}

function renderMarkers() {
  state.poiMarkers.forEach(({ marker, popup }) => {
    marker.remove();
    popup.remove();
  });
  state.poiMarkers.clear();

  state.pois.forEach((poi) => {
    const el = document.createElement('div');
    el.className = 'marker-dot';
    el.textContent = categoryIcons[poi.category] || '⬤';

    const popup = new mapboxgl.Popup({ offset: 24 }).setHTML(buildPopupHtml(poi));
    const marker = new mapboxgl.Marker(el).setLngLat([poi.longitude, poi.latitude]).setPopup(popup).addTo(state.map);
    marker.getElement().addEventListener('click', () => setFocalPoi(poi));

    state.poiMarkers.set(poi.id, { marker, popup, poi });
  });
}

function focusMapOnPois() {
  if (!state.map || !state.pois.length) return;
  if (state.pois.length === 1) {
    const poi = state.pois[0];
    state.map.flyTo({ center: [poi.longitude, poi.latitude], zoom: 13 });
    return;
  }

  const bounds = state.pois.reduce((acc, poi) => {
    return acc.extend([poi.longitude, poi.latitude]);
  }, new mapboxgl.LngLatBounds([state.pois[0].longitude, state.pois[0].latitude], [state.pois[0].longitude, state.pois[0].latitude]));

  state.map.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 1200 });
}
function buildPopupHtml(poi) {
  const dmNoteHtml = state.dmMode && state.dmSecret
    ? `<div class="dm-note"><strong>Solo DJ:</strong> ${sanitize(poi.dm_note || 'Sin nota')}</div>`
    : '';

  return `
    <div>
      <h3>${sanitize(poi.name)}</h3>
      <div>${categoryLabels[poi.category] || poi.category} ${categoryIcons[poi.category] || ''}</div>
      <div>Amenaza: ${poi.threat_level}/5</div>
      <div>Membrana: ${poi.veil_status}</div>
      <div>Sesión: ${sanitize(poi.session_tag || '–')}</div>
      ${buildPopupImage(poi)}
      <p>${sanitize(poi.public_note || 'Sin nota pública')}</p>
      ${dmNoteHtml}
    </div>
  `;
}

function sanitize(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function sanitizeUrlValue(url) {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
  } catch (e) {
    return '';
  }
  return '';
}

function buildPopupImage(poi) {
  const safeUrl = sanitizeUrlValue(poi.image_url);
  if (!safeUrl) return '';
  return `<div class="map-popup-image"><img src="${safeUrl}" alt="${sanitize(poi.name)} image" /></div>`;
}

function renderPoiList() {
  const filtered = getFilteredPois();
  renderPoiListInto(poiList, { mobileGrouping: isMobileView() && state.mobileTab === 'pois', items: filtered });
  if (poiListDm) {
    renderPoiListInto(poiListDm, { mobileGrouping: false, items: filtered });
  }
}

function renderPoiListInto(target, options = {}) {
  if (!target) return;
  target.innerHTML = '';
  const items = options.items || [];
  if (!items.length) {
    const empty = document.createElement('li');
    empty.textContent = 'Ningún PdI coincide con los filtros.';
    target.appendChild(empty);
    return;
  }
  if (options.mobileGrouping) {
    renderPoiListMobileBySession(target, items);
    return;
  }
  items.forEach((poi) => renderPoiItem(poi, target));
}

function renderPoiListMobileBySession(target, items) {
  const pois = items || [];
  if (!pois.length || !target) {
    const empty = document.createElement('li');
    empty.textContent = 'Ningún PdI coincide con los filtros.';
    target?.appendChild(empty);
    return;
  }

  const bySession = new Map();
  for (const poi of pois) {
    const tag = poi.session_tag && poi.session_tag.trim() ? poi.session_tag.trim() : 'Sin sesión';
    if (!bySession.has(tag)) bySession.set(tag, []);
    bySession.get(tag).push(poi);
  }

  const sessionTags = Array.from(bySession.keys()).sort().reverse();
  const currentTag = state.filters.session_tag?.trim() || null;

  const primarySessions = new Set();
  if (currentTag && bySession.has(currentTag)) {
    primarySessions.add(currentTag);
  }
  if (sessionTags[0]) primarySessions.add(sessionTags[0]);
  if (sessionTags[1]) primarySessions.add(sessionTags[1]);

  let hasHiddenSessions = false;

  sessionTags.forEach((tag) => {
    const poisForSession = bySession.get(tag) || [];
    const isPrimary = primarySessions.has(tag);
    if (!isPrimary && !state.showOlderMobilePois) {
      hasHiddenSessions = true;
      return;
    }
    renderSessionHeader(target, tag === 'Sin sesión' ? 'Otras ubicaciones' : `Sesión ${tag}`);
    poisForSession.forEach((poi) => renderPoiItem(poi, target));
  });

  if (hasHiddenSessions && !state.showOlderMobilePois) {
    const totalOlderPois = sessionTags
      .filter((tag) => !primarySessions.has(tag))
      .reduce((sum, tag) => sum + (bySession.get(tag)?.length || 0), 0);
    const moreItem = document.createElement('li');
    moreItem.className = 'poi-more-toggle';
    moreItem.textContent = `Mostrar ${totalOlderPois} PdIs de sesiones anteriores`;
    moreItem.addEventListener('click', () => {
      state.showOlderMobilePois = true;
      renderPoiList();
    });
    target.appendChild(moreItem);
  }
}

function renderSessionHeader(target, label) {
  const headerItem = document.createElement('li');
  headerItem.className = 'poi-session-header';
  headerItem.textContent = label;
  target.appendChild(headerItem);
}

function getFilteredPois() {
  const { category, session_tag: sessionTag, search } = state.filters;
  const base = state.pois.filter((poi) => {
    if (category && poi.category !== category) return false;
    if (sessionTag && (!poi.session_tag || !poi.session_tag.includes(sessionTag))) return false;
    return true;
  });
  const query = (search || '').trim();
  if (!query) return base;

  if (typeof Fuse === 'undefined') {
    return base.filter((poi) => {
      const target = `${poi.name || ''} ${poi.session_tag || ''} ${poi.public_note || ''}`.toLowerCase();
      return target.includes(query.toLowerCase());
    });
  }

  const fuse = new Fuse(base, {
    keys: [
      { name: 'name', weight: 0.5 },
      { name: 'session_tag', weight: 0.2 },
      { name: 'category', weight: 0.15 },
      { name: 'public_note', weight: 0.15 }
    ],
    threshold: 0.3,
    ignoreLocation: true
  });
  return fuse.search(query).map((res) => res.item);
}

function updateEntityFormMode(kind) {
  if (!entityForm) return;
  const isPoi = kind === 'poi';
  entityForm.classList.toggle('is-poi', isPoi);
  if (entityKindInput) {
    entityKindInput.value = isPoi ? 'poi' : 'entity';
  }
}

function renderPoiItem(poi, target) {
  if (!target) return;
  const mobile = isMobileView();
  const item = document.createElement('li');
  item.className = 'poi-item';
  item.dataset.poiId = poi.id;
  if (state.poiFocal && state.poiFocal.id === poi.id) {
    item.classList.add('active');
  }

  if (!mobile) {
    item.classList.add('compact');
    const row = document.createElement('div');
    row.className = 'poi-row';

    const main = document.createElement('div');
    main.className = 'poi-main';
    const icon = categoryIcons[poi.category] || '';
    main.innerHTML = `${icon} ${sanitize(poi.name)}`;
    row.appendChild(main);

    const actions = document.createElement('div');
    actions.className = 'poi-actions inline';
    const focusBtn = document.createElement('button');
    focusBtn.textContent = 'Enfocar';
    focusBtn.addEventListener('click', () => {
      setFocalPoi(poi);
      focusOnPoi(poi.id);
    });
    actions.appendChild(focusBtn);
    if (state.dmMode) {
      const editBtn = document.createElement('button');
      editBtn.textContent = 'Editar';
      editBtn.addEventListener('click', () => {
        setFocalPoi(poi);
        populateFormForEdit(poi);
        setDmBlade('entities');
      });
      actions.appendChild(editBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Borrar';
      deleteBtn.addEventListener('click', () => handleDeletePoi(poi));
      actions.appendChild(deleteBtn);
    }
    row.appendChild(actions);

    const meta = document.createElement('div');
    meta.className = 'poi-meta';
    meta.innerHTML = `
      <span class="badge">#${poi.id}</span>
      <span class="badge">Amenaza ${poi.threat_level}</span>
      <span class="badge veil-${poi.veil_status}">Velo ${poi.veil_status}</span>
      <span class="badge-soft">${sanitize(poi.session_tag || 'Sin sesión')}</span>
      <span class="poi-summary-sub">${categoryLabels[poi.category] || poi.category}</span>
    `;
    row.appendChild(meta);

    row.addEventListener('click', (ev) => {
      if (ev.target.tagName.toLowerCase() === 'button') return;
      setFocalPoi(poi);
      focusOnPoi(poi.id);
    });

    item.appendChild(row);
    target.appendChild(item);
    return;
  }

  const accordion = document.createElement('details');
  accordion.className = 'poi-accordion';

  const summary = document.createElement('summary');
  summary.className = 'poi-summary';
  const veilClass = `veil-${poi.veil_status}`;
  summary.innerHTML = `
    <div class="poi-summary-title">${categoryIcons[poi.category] || ''} ${sanitize(poi.name)}</div>
    <div class="poi-summary-meta">
      <span class="badge">#${poi.id}</span>
      <span class="badge">Amenaza ${poi.threat_level}</span>
      <span class="badge ${veilClass}">Velo ${poi.veil_status}</span>
      <span class="badge">${sanitize(poi.session_tag || 'Sin sesión')}</span>
    </div>
  `;
  accordion.appendChild(summary);
  summary.addEventListener('click', () => setFocalPoi(poi));

  const body = document.createElement('div');
  body.className = 'poi-body';
  body.innerHTML = `
    <div class="poi-body-row"><span>Categoría</span>${categoryLabels[poi.category] || poi.category}</div>
    <div class="poi-body-row"><span>Sesión</span>${sanitize(poi.session_tag || '—')}</div>
    <div class="poi-body-row"><span>Informe público</span>${sanitize(poi.public_note || 'Sin nota pública')}</div>
  `;

  const safeImageUrl = sanitizeUrlValue(poi.image_url);
  if (safeImageUrl) {
    const imageWrap = document.createElement('div');
    imageWrap.className = 'poi-image';
    const img = document.createElement('img');
    img.src = safeImageUrl;
    img.alt = `imagen de ${poi.name}`;
    imageWrap.appendChild(img);
    body.appendChild(imageWrap);
  }

  if (state.dmMode && poi.dm_note) {
    const dmRow = document.createElement('div');
    dmRow.className = 'poi-body-row dm-note-tag';
    dmRow.innerHTML = `<span>Intel del DJ</span>${sanitize(poi.dm_note)}`;
    body.appendChild(dmRow);
  }

  accordion.appendChild(body);

  const actions = document.createElement('div');
  actions.className = 'poi-actions';

  const focusBtn = document.createElement('button');
  focusBtn.textContent = 'Enfocar';
  focusBtn.addEventListener('click', () => {
    setFocalPoi(poi);
    focusOnPoi(poi.id);
    if (isMobileView()) {
      setMobileTab('map');
    }
  });
  actions.appendChild(focusBtn);

  if (state.dmMode) {
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Editar';
    editBtn.addEventListener('click', () => {
      setFocalPoi(poi);
      populateFormForEdit(poi);
      setDmBlade('entities');
      if (isMobileView()) {
        setMobileTab('console');
        document.getElementById('poi-form-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
    actions.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Borrar';
    deleteBtn.addEventListener('click', () => handleDeletePoi(poi));
    actions.appendChild(deleteBtn);
  }

  accordion.appendChild(actions);
  item.appendChild(accordion);
  target.appendChild(item);
}

function renderMapFilters(container) {
  const target = container || mapFilters;
  if (!target) return;
  target.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.textContent = 'Todos';
  allBtn.className = 'filter-chip active';
  allBtn.dataset.category = '';
  target.appendChild(allBtn);
  Object.entries(categoryLabels).forEach(([value, label]) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'filter-chip';
    btn.dataset.category = value;
    target.appendChild(btn);
  });
  target.addEventListener('click', (event) => {
    const btn = event.target.closest('[data-category]');
    if (!btn) return;
    const category = btn.dataset.category || '';
    state.filters.category = category;
    target.querySelectorAll('.filter-chip').forEach((chip) => {
      chip.classList.toggle('active', chip.dataset.category === category);
    });
    loadPois();
  });
}
function focusOnPoi(id) {
  const markerData = state.poiMarkers.get(id);
  if (!markerData) return;
  state.map.flyTo({ center: [markerData.poi.longitude, markerData.poi.latitude], zoom: 12 });
  markerData.popup.addTo(state.map);
}

function exitDmMode(silent = false, options = {}) {
  state.dmMode = false;
  state.dmSecret = null;
  if (dmSecretInput) dmSecretInput.value = '';
  if (dmWarning) dmWarning.textContent = '';
  disablePickMode();
  resetPoiForm();
  updateDmVisibility();
  renderPoiList();
  renderMarkers();
  if (!silent) {
    showMessage('Canal de Sr. Verdad desconectado.');
  }
  deleteCookie('amina_secret');
  if (options.skipRoleCookie) {
    deleteCookie('amina_role');
  } else {
    setCookie('amina_role', 'operative');
  }
  loadEntities();
  setWorkspaceView('map');
}

function activateDmMode(secret) {
  state.dmMode = true;
  state.dmSecret = secret;
  if (dmSecretInput) dmSecretInput.value = secret;
  if (dmWarning) dmWarning.textContent = '';
  updateDmVisibility();
  renderPoiList();
  renderMarkers();
  showMessage('Canal de Sr. Verdad conectado. Autorización guardada en memoria.');
  setCookie('amina_role', 'mrtruth');
  setCookie('amina_secret', secret);
  updateRoleLayoutClasses();
  loadEntities();
  setWorkspaceView('map');
}

function updateDmVisibility() {
  dmOnlySections.forEach((section) => {
    section.classList.toggle('visible', state.dmMode);
    const toggle = section.querySelector('.collapsible-toggle');
    const body = section.querySelector('.collapsible-body');
    if (!toggle || !body) return;
    if (state.dmMode) {
      toggle.removeAttribute('aria-hidden');
      body.classList.remove('collapsed');
      toggle.setAttribute('aria-expanded', 'true');
      const icon = toggle.querySelector('.collapsible-icon');
      if (icon) icon.textContent = '−';
    } else {
      toggle.setAttribute('aria-hidden', 'true');
      body.classList.add('collapsed');
      const icon = toggle.querySelector('.collapsible-icon');
      if (icon) icon.textContent = '+';
    }
  });
  if (poiSubmitButton) poiSubmitButton.disabled = !state.dmMode || !state.dmSecret;
  if (pickButton) pickButton.disabled = !state.dmMode || !state.dmSecret;
  applyAgentStatus();
  updateRoleLayoutClasses();
  setDmBlade(state.activeDmBlade || 'dispatch');
}

function handleFilterSubmit(event) {
  if (event) event.preventDefault();
  state.showOlderMobilePois = false;
  if (categoryFilter) state.filters.category = categoryFilter.value;
  if (sessionFilter) state.filters.session_tag = sessionFilter.value.trim();
  loadPois();
}

async function handlePoiSubmit(event) {
  event.preventDefault();
  if (!state.dmSecret) {
    if (dmWarning) dmWarning.textContent = 'Introduce un código de autorización válido para crear o editar PdIs.';
    return;
  }

  const payload = {
    name: formIds.name.value.trim(),
    category: poiCategorySelect.value,
    latitude: formIds.latitude.value,
    longitude: formIds.longitude.value,
    image_url: formIds.imageUrl.value.trim(),
    threat_level: formIds.threat.value,
    veil_status: formIds.veil.value,
    session_tag: formIds.session.value.trim(),
    public_note: formIds.publicNote.value.trim(),
    dm_note: formIds.dmNote.value.trim()
  };

  const method = state.editingPoiId ? 'PUT' : 'POST';
  const endpoint = state.editingPoiId ? `/api/pois/${state.editingPoiId}` : '/api/pois';

  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-dm-secret': state.dmSecret
    },
    body: JSON.stringify(payload)
  });

  if (response.status === 401) {
    handleUnauthorized();
    return;
  }

  if (!response.ok) {
    const error = await response.json();
    showMessage(error.error || 'Fallo al guardar el PdI.', true);
    return;
  }

  await loadPois();
  resetPoiForm();
  showMessage(state.editingPoiId ? 'PdI actualizado.' : 'PdI creado.');
}

async function submitPoiFromEntityForm() {
  if (!state.dmSecret) {
    if (dmWarning) dmWarning.textContent = 'Introduce un código de autorización válido para crear o editar PdIs.';
    return;
  }
  setSavingButton(entitySubmitBtn, true, 'Guardando…');
  const payload = {
    name: entityCodeNameInput.value.trim(),
    category: poiCategorySelect.value,
    latitude: formIds.latitude.value,
    longitude: formIds.longitude.value,
    image_url: formIds.imageUrl.value.trim(),
    threat_level: formIds.threat.value,
    veil_status: formIds.veil.value,
    session_tag: formIds.session.value.trim(),
    public_note: formIds.publicNote.value.trim(),
    dm_note: formIds.dmNote.value.trim()
  };

  const isEdit = !!entityIdInput.value;
  const endpoint = isEdit ? `/api/pois/${entityIdInput.value}` : '/api/pois';
  const method = isEdit ? 'PUT' : 'POST';

  const response = await fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-dm-secret': state.dmSecret
    },
    body: JSON.stringify(payload)
  });

  if (response.status === 401) {
    handleUnauthorized();
    return;
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    showMessage(error.error || 'Fallo al guardar el PdI.', true);
    return;
  }

  const saved = await response.json();
  await loadPois();
  const mapped = mapPoiToAdminItem(saved);
  state.activeEntityAdmin = mapped;
  entityIdInput.value = saved.id;
  entityKindInput.value = 'poi';
  updateEntityFormMode('poi');
  populateEntityForm(mapped);
  showMessage(isEdit ? 'PdI actualizado.' : 'PdI creado.');
  pulseSavedButton();
  resetEntityForm();
  setSavingButton(entitySubmitBtn, false);
}

async function handleDeletePoi(poi) {
  if (!state.dmSecret) {
    if (dmWarning) dmWarning.textContent = 'Introduce un código de autorización válido para borrar PdIs.';
    return;
  }
  const confirmed = window.confirm(`¿Borrar ${poi.name}?`);
  if (!confirmed) return;

  const response = await fetch(`/api/pois/${poi.id}`, {
    method: 'DELETE',
    headers: {
      'x-dm-secret': state.dmSecret
    }
  });

  if (response.status === 401) {
    handleUnauthorized();
    return;
  }

  if (response.status !== 204) {
    const error = await response.json();
    showMessage(error.error || 'Fallo al borrar el PdI.', true);
    return;
  }

  await loadPois();
  showMessage('PdI borrado.');
}

function populateFormForEdit(poi) {
  const mapped = mapPoiToAdminItem(poi);
  state.activeEntityAdmin = mapped;
  state.editingPoiId = poi.id;
  populateEntityForm(mapped);
  setDmBlade('entities');
}

function resetPoiForm() {
  poiForm?.reset();
  formIds.id.value = '';
  state.editingPoiId = null;
  if (poiFormTitle) poiFormTitle.textContent = 'Crear PdI';
  if (poiSubmitButton) poiSubmitButton.textContent = 'Crear PdI';
}

function handleUnauthorized() {
  if (dmWarning) dmWarning.textContent = 'Código de autorización rechazado. Inténtalo de nuevo.';
  state.dmSecret = null;
  updateDmVisibility();
  showMessage('Código de autorización inválido.', true);
}

function showBootScreen() {
  bootScreen.classList.remove('hidden');
  bootDmForm.classList.remove('visible');
  bootDmSecretInput.value = '';
  bootStatus.textContent = '';
  bootMenu?.classList.remove('hidden');
  exitDmMode(true, { skipRoleCookie: true });
  logDebug('Showing boot screen (change clearance)');
  deleteCookie('amina_role');
  deleteCookie('amina_secret');
  deleteCookie('amina_agent');
  startBootSequence();
  document.body.classList.add('booting');
  clearAgentSession();
  hideAgentLogin();
}

function hideBootScreen() {
  bootScreen.classList.add('hidden');
  document.body.classList.remove('booting');
  hideCommandMenu();
  if (state.map) {
    setTimeout(() => state.map.resize(), 50);
  }
}

function enterAsPlayer() {
  exitDmMode(true);
  hideBootScreen();
  showMessage('Vista de agente de campo cargada.');
  setCookie('amina_role', 'operative');
}

async function handleBootDmSubmit(event) {
  event.preventDefault();
  const secret = bootDmSecretInput.value.trim();
  if (!secret) {
    bootStatus.textContent = 'Proporciona un código de autorización.';
    return;
  }
  bootStatus.textContent = 'Autenticando...';
  try {
    const response = await fetch('/api/auth/dm', {
      method: 'POST',
      headers: {
        'x-dm-secret': secret
      }
    });
    if (!response.ok) {
      if (response.status === 500) {
        const data = await response.json().catch(() => ({ error: 'Servidor mal configurado' }));
        bootStatus.textContent = data.error || 'Error del servidor.';
        logDebug('Error de autenticación de DJ: ' + (data.error || 'Error del servidor'));
      } else {
        bootStatus.textContent = 'Acceso denegado.';
        logDebug('Autenticación de DJ denegada');
      }
      return;
    }
    activateDmMode(secret);
    hideBootScreen();
    bootDmForm.classList.remove('visible');
    bootDmSecretInput.value = '';
    bootStatus.textContent = '';
  } catch (err) {
    logDebug('Fallo en fetch de autenticación de DJ: ' + err.message);
    bootStatus.textContent = 'No se puede comunicar con el servidor.';
  }
}

async function startBootSequence() {
  if (!bootOutput || !bootMenu) return;
  bootSequenceId += 1;
  const runId = bootSequenceId;
  bootOutput.textContent = '';
  bootMenu.classList.add('hidden');
  bootDmForm.classList.remove('visible');
  try {
    for (const line of bootLines) {
      await typeLine(line, runId);
      if (runId !== bootSequenceId) return;
      bootOutput.textContent += '\n';
    }
    bootOutput.textContent += '\n>> Esperando selección de autorización...\n';
  } catch (err) {
    logDebug('Error en secuencia de arranque: ' + err.message);
    bootOutput.textContent = '>> Esperando selección de autorización...\n';
  } finally {
    bootMenu.classList.remove('hidden');
  }
}

async function loadMessages() {
  if (!messageFeed) return;
  try {
    const params = new URLSearchParams();
    const { recipient, session_tag, since, box, unread_only } = state.messageFilters;
    const viewer = state.dmMode ? 'Sr. Verdad' : state.agent?.display || '';
    if (recipient) params.append('recipient', recipient);
    if (session_tag) params.append('session_tag', session_tag);
    if (since) params.append('since', since);
    if (box) params.append('box', box);
    if (unread_only) params.append('unread_only', 'true');
    if (viewer) params.append('viewer', viewer);
    const response = await fetch(`/api/messages${params.toString() ? `?${params.toString()}` : ''}`);
    if (!response.ok) throw new Error('Fallo al cargar mensajes.');
    const messages = await response.json();
    state.messages = messages;
    renderMessages(messages);
  } catch (err) {
    console.warn('Fallo al cargar mensajes', err);
    logDebug(`Error de carga de mensajes: ${err.message}`);
  }
}

function renderMessages(messages) {
  state.messages = messages;
  state.activeMessageIndex = Math.min(state.activeMessageIndex, Math.max(messages.length - 1, 0));
  if (!messageFeed) return;
  messageFeed.innerHTML = '';
  if (!messages.length) {
    const empty = document.createElement('div');
    empty.className = 'message-card';
    empty.textContent = 'No hay despachos disponibles.';
    messageFeed.appendChild(empty);
    state.activeMessage = null;
    renderActiveMessageCard();
    return;
  }
  const viewer = state.dmMode ? 'Sr. Verdad' : state.agent?.display || '';
  messages.forEach((msg) => {
    const card = document.createElement('div');
    const isRead = viewer ? Array.isArray(msg.read_by) && msg.read_by.includes(viewer) : true;
    card.className = `message-card ${isRead ? 'message-card--read' : 'message-card--unread'}`;
    const header = document.createElement('div');
    header.className = 'header';
    header.innerHTML = `<span>De: ${sanitize(msg.sender)}</span><span>${new Date(
      msg.created_at
    ).toLocaleString()}</span>`;
    const body = document.createElement('div');
    body.className = 'body';
    body.innerHTML = `<strong>Para: ${sanitize(msg.recipient)}</strong><br/><em>${sanitize(
      msg.subject
    )}</em><br/>${sanitize(msg.body)}`;
    if (!isRead && viewer) {
      const markBtn = document.createElement('button');
      markBtn.type = 'button';
      markBtn.className = 'small';
      markBtn.textContent = 'Marcar como leído';
      markBtn.addEventListener('click', () => markMessageAsRead(msg.id, viewer));
      body.appendChild(markBtn);
    }
    card.appendChild(header);
    card.appendChild(body);
    messageFeed.appendChild(card);
  });
  state.activeMessage = messages[state.activeMessageIndex] || messages[0] || null;
  renderActiveMessageCard();
  updateMessageBoxLabel();
}

async function markMessageAsRead(id, viewer) {
  try {
    await fetch(`/api/messages/${id}/read`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewer })
    });
    await loadMessages();
  } catch (err) {
    logDebug(`Mark read failed: ${err.message}`);
  }
}

function showNextMessage() {
  if (!state.messages.length) return;
  state.activeMessageIndex = (state.activeMessageIndex + 1) % state.messages.length;
  state.activeMessage = state.messages[state.activeMessageIndex];
  renderActiveMessageCard();
}

function showPrevMessage() {
  if (!state.messages.length) return;
  state.activeMessageIndex =
    (state.activeMessageIndex - 1 + state.messages.length) % state.messages.length;
  state.activeMessage = state.messages[state.activeMessageIndex];
  renderActiveMessageCard();
}

function toggleMessageBoxView() {
  const nextBox = state.messageFilters.box === 'sent' ? '' : 'sent';
  state.messageFilters.box = nextBox;
  state.activeMessageIndex = 0;
  if (msgBoxToggleBtn) {
    msgBoxToggleBtn.textContent = nextBox === 'sent' ? 'Entrada' : 'Enviados';
  }
  updateMessageBoxLabel();
  loadMessages();
}

function updateMessageBoxLabel() {
  if (!msgBoxLabel) return;
  msgBoxLabel.textContent = state.messageFilters.box === 'sent' ? 'Enviados' : 'Entrada';
}

function startReply(message) {
  if (!replyPane || !replyBodyInput) return;
  state.replyTarget = message;
  replyPane.classList.remove('hidden');
  if (replyLabel) {
    replyLabel.textContent = `Respondiendo a ${message.sender}`;
  }
  replyBodyInput.value = `\n\n---\n${message.body}`;
  replyBodyInput.focus();
}

function cancelReply() {
  if (!replyPane) return;
  replyPane.classList.add('hidden');
  state.replyTarget = null;
  if (replyBodyInput) {
    replyBodyInput.value = '';
  }
}

async function submitReply() {
  if (!state.replyTarget || !replyBodyInput) return;
  const text = replyBodyInput.value.trim();
  if (!text) return;
  const recipient = state.replyTarget.sender;
  const viewer = state.dmMode ? (messageFromInput?.value || 'Sr. Verdad') : state.agent?.display;
  const payload = {
    sender: viewer || 'Agente de Campo',
    recipient,
    subject: state.replyTarget.subject?.startsWith('Re:') ? state.replyTarget.subject : `Re: ${state.replyTarget.subject}`,
    body: text,
    session_tag: state.replyTarget.session_tag || ''
  };
  try {
    if (state.dmMode && state.dmSecret) {
      await sendDmMessage(payload);
    } else {
      await sendAgentMessage(payload);
    }
    showMessage('Respuesta enviada.');
    cancelReply();
    loadMessages();
  } catch (err) {
    showMessage(err.message || 'Fallo al responder.', true);
  }
}

async function sendDmMessage(payload) {
  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-dm-secret': state.dmSecret || ''
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Fallo en la respuesta del DJ');
  }
}

async function sendAgentMessage(payload) {
  const response = await fetch('/api/messages/agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ ...payload, created_by: payload.sender })
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Fallo en la respuesta del agente');
  }
}

async function handleMessageSubmit(event) {
  event.preventDefault();
  if (!state.dmMode || !state.dmSecret) {
    if (dmWarning) dmWarning.textContent = 'Se requiere el canal de Sr. Verdad para emitir.';
    return;
  }
  const payload = {
    sender: messageFromInput.value.trim(),
    recipient: messageToSelect.value.trim(),
    subject: messageSubjectInput.value.trim(),
    body: messageBodyInput.value.trim(),
    session_tag: messageSessionInput?.value.trim() || ''
  };
  const response = await fetch('/api/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-dm-secret': state.dmSecret
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    showMessage(errorData.error || 'Fallo en la emisión.', true);
    return;
  }
  messageForm.reset();
  updateMessageFromField();
  loadMessages();
  showMessage('Mensaje emitido.');
}

async function loadAgentList() {
  try {
    const response = await fetch('/api/auth/agents');
    if (!response.ok) {
      throw new Error('Fallo al cargar la lista de agentes');
    }
    state.agents = await response.json();
    populateAgentSelect();
    logDebug(`Cargados ${state.agents.length} agentes.`);
  } catch (err) {
    console.warn(err);
    logDebug(`Error en lista de agentes: ${err.message}`);
  }
}

function populateAgentSelect() {
  if (!agentSelect) return;
  agentSelect.innerHTML = '';
  state.agents.forEach(({ username, display }) => {
    const option = document.createElement('option');
    option.value = username;
    option.textContent = display;
    agentSelect.appendChild(option);
  });
  if (filterRecipientSelect) {
    filterRecipientSelect.innerHTML = '<option value="">Todos los agentes</option>';
    state.agents.forEach(({ username, display }) => {
      const opt = document.createElement('option');
      opt.value = display;
      opt.textContent = display;
      filterRecipientSelect.appendChild(opt);
    });
  }
  if (messageToSelect) {
    messageToSelect.innerHTML = '';
    const defaults = [
      { value: '', label: 'Seleccionar agente' },
      { value: 'All agents', label: 'Todos los agentes' }
    ];
    defaults.forEach(({ value, label }) => {
      const opt = document.createElement('option');
      opt.value = value;
      opt.textContent = label;
      messageToSelect.appendChild(opt);
    });
    state.agents.forEach(({ display }) => {
      const opt = document.createElement('option');
      opt.value = display;
      opt.textContent = display;
      messageToSelect.appendChild(opt);
    });
  }
}

function showAgentLogin() {
  bootMenu.classList.add('hidden');
  agentLoginDiv.classList.add('visible');
  agentLoginStatus.textContent = '';
  agentPassInput.value = '';
  agentSelect?.focus();
}

function hideAgentLogin() {
  agentLoginDiv.classList.remove('visible');
  bootMenu.classList.remove('hidden');
}

function showCommandMenu() {
  if (!commandMenu || !commandInput || !commandLog) return;
  commandMenu.classList.add('visible');
  commandInput.value = 'MOSTRAR MAPA AMINA';
  commandLog.textContent = 'COMANDO LISTO // escriba MOSTRAR MAPA AMINA o MOSTRAR BANDEJA DE ENTRADA';
  commandInput.focus();
}

function hideCommandMenu() {
  commandMenu?.classList.remove('visible');
}

function runCommand(value) {
  const command = (value || '').toUpperCase().trim();
  if (command.includes('INBOX')) {
    executeCommand('INBOX');
  } else {
    executeCommand('MAP');
  }
}

function executeCommand(mode) {
  hideCommandMenu();
  hideBootScreen();
  if (mode === 'INBOX') {
    showInboxView();
    return;
  }
  showMessage('Mapa AMINA en línea.');
}

async function handleAgentLogin() {
  const username = agentSelect?.value;
  const password = agentPassInput.value.trim();
  if (!username || !password) {
    agentLoginStatus.textContent = 'Introduce la contraseña del agente.';
    return;
  }
  agentLoginStatus.textContent = 'Verificando autorización...';
  const response = await fetch('/api/auth/agent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  });

  if (!response.ok) {
    agentLoginStatus.textContent = 'Credenciales inválidas.';
    logDebug('Fallo en el login del agente ' + username);
    return;
  }

  const agent = await response.json();
  setAgent(agent);
  bootMenu.classList.add('hidden');
  hideAgentLogin();
  hideBootScreen();
  showMessage('Vista de agente de campo cargada.');
}

function typeLine(text, token, speed = 30) {
  return new Promise((resolve) => {
    let idx = 0;
    function tick() {
      if (token !== bootSequenceId) {
        return resolve();
      }
      if (idx < text.length) {
        bootOutput.textContent += text[idx];
        idx += 1;
        setTimeout(tick, speed);
      } else {
        resolve();
      }
    }
    tick();
  });
}

function togglePickMode() {
  if (!state.pickMode) {
    if (!state.dmSecret) {
      if (dmWarning) dmWarning.textContent = 'Introduce el código de autorización antes de elegir ubicaciones.';
      return;
    }
    state.pickMode = true;
    pickButton.textContent = 'Haz clic en el mapa para fijar la ubicación';
    showMessage('Modo selección: haz clic en el mapa para fijar coordenadas.');
  } else {
    disablePickMode();
  }
}

function disablePickMode() {
  state.pickMode = false;
  pickButton.textContent = 'Elegir del mapa';
  if (state.pickMarker) {
    state.pickMarker.remove();
    state.pickMarker = null;
  }
}

function setPickedLocation(lat, lng) {
  formIds.latitude.value = lat.toFixed(6);
  formIds.longitude.value = lng.toFixed(6);

  if (state.pickMarker) {
    state.pickMarker.remove();
  }

  const marker = new mapboxgl.Marker({ color: '#00ff88' })
    .setLngLat([lng, lat])
    .addTo(state.map);
  state.pickMarker = marker;
  showMessage('Coordenadas capturadas del mapa.');
}

function setAgent(agent) {
  state.agent = agent;
  setCookie('amina_agent', agent.username);
  setCookie('amina_role', 'operative');
  applyAgentStatus();
  updateRoleLayoutClasses();
}

function clearAgentSession() {
  state.agent = null;
  deleteCookie('amina_agent');
  applyAgentStatus();
  updateRoleLayoutClasses();
}

function applyAgentStatus() {
  if (!clearanceStatus || !agentStatus) return;
  clearanceStatus.textContent = state.dmMode ? 'Sr. Verdad' : 'Agente de Campo';
  agentStatus.textContent = state.agent ? state.agent.display : 'Ningún agente seleccionado';
  updateMessageFromField();
  loadMessages();
}

function applyMessageFilters() {
  state.messageFilters = {
    recipient: filterRecipientSelect?.value || '',
    session_tag: filterSessionInput?.value.trim() || '',
    since: filterSinceInput?.value || '',
    box: filterBoxSelect?.value || '',
    unread_only: !!(filterUnreadCheckbox && filterUnreadCheckbox.checked)
  };
  loadMessages();
}

function isDmViewer() {
  return !!(state.dmMode && state.dmSecret);
}

async function loadEntities() {
  try {
    const params = new URLSearchParams();
    if (isDmViewer()) {
      params.append('includeArchived', '1');
      if (state.entityFiltersAdmin.type) params.append('type', state.entityFiltersAdmin.type);
    } else {
      if (state.entityFiltersAgent.type) params.append('type', state.entityFiltersAgent.type);
    }
    const base = isDmViewer() ? '/api/dm/entities' : '/api/agent/entities';
    const url = params.toString() ? `${base}?${params.toString()}` : base;
    const response = await fetch(url, {
      headers: isDmViewer() ? { 'x-dm-secret': state.dmSecret } : undefined
    });
    if (!response.ok) throw new Error('Fallo al cargar entidades.');
    const list = await response.json();
    state.entities = list.map((e) => {
      if (!isDmViewer() && state.unlockedEntities.has(Number(e.id))) {
        return { ...e, visibility: 'agent_public' };
      }
      return e;
    });

    if (state.activeEntityAgent) {
      const found = state.entities.find((e) => e.id === state.activeEntityAgent.id && !e.archived);
      state.activeEntityAgent = found || null;
    }
    if (state.activeEntityAdmin && state.activeEntityAdmin.kind !== 'poi') {
      const found = state.entities.find((e) => e.id === state.activeEntityAdmin.id);
      state.activeEntityAdmin = found ? { ...found, kind: 'entity' } : null;
    }

    renderAgentDossiers();
    renderAdminDossiers();
    renderFocalPoiCard();
  } catch (err) {
    logDebug(`Error cargando entidades: ${err.message}`);
  }
}

function filterEntities(filters = {}, options = {}) {
  const includeArchived = options.includeArchived || false;
  const query = (filters.q || '').toLowerCase().trim();
  const base = state.entities.filter((entity) => {
    if (!includeArchived && entity.archived) return false;
    if (filters.type && entity.type !== filters.type) return false;
    if (filters.status && entity.status !== filters.status) return false;
    return true;
  });

  if (!query) return base;
  if (typeof Fuse === 'undefined') {
    // fallback simple match
    return base.filter((entity) => {
      const target = `${entity.code_name || ''} ${entity.name || ''} ${entity.real_name || ''} ${entity.role || ''} ${entity.public_summary || ''}`.toLowerCase();
      return target.includes(query);
    });
  }

  const fuse = new Fuse(base, {
    keys: [
      { name: 'code_name', weight: 0.35 },
      { name: 'name', weight: 0.2 },
      { name: 'real_name', weight: 0.15 },
      { name: 'role', weight: 0.15 },
      { name: 'public_summary', weight: 0.1 },
      { name: 'sessions', weight: 0.05 }
    ],
    threshold: 0.34,
    ignoreLocation: true
  });
  return fuse.search(query).map((res) => res.item);
}

function mapPoiToAdminItem(poi) {
  return {
    kind: 'poi',
    id: poi.id,
    type: 'poi',
    code_name: poi.name,
    name: poi.name,
    role: categoryLabels[poi.category] || poi.category,
    status: poi.session_tag || '',
    alignment: poi.veil_status,
    threat_level: poi.threat_level,
    image_url: poi.image_url,
    sessions: poi.session_tag || '',
    public_summary: poi.public_note || '',
    dm_notes: poi.dm_note || '',
    category: poi.category,
    latitude: poi.latitude,
    longitude: poi.longitude,
    poi_id: poi.id,
    veil_status: poi.veil_status
  };
}

function filterPoisForAdmin(filters = {}) {
  const query = (filters.q || '').trim();
  const allowPoi = !filters.type || filters.type === 'poi';
  if (!allowPoi) return [];
  const base = state.pois.slice();
  if (!query) return base.map(mapPoiToAdminItem);
  if (typeof Fuse === 'undefined') {
    return base
      .filter((poi) => {
        const target = `${poi.name || ''} ${poi.session_tag || ''} ${poi.public_note || ''}`.toLowerCase();
        return target.includes(query.toLowerCase());
      })
      .map(mapPoiToAdminItem);
  }
  const fuse = new Fuse(base, {
    keys: [
      { name: 'name', weight: 0.6 },
      { name: 'session_tag', weight: 0.2 },
      { name: 'public_note', weight: 0.2 }
    ],
    threshold: 0.32,
    ignoreLocation: true
  });
  return fuse.search(query).map((res) => mapPoiToAdminItem(res.item));
}

function filterDmItems(filters = {}) {
  const entities = filterEntities(filters, { includeArchived: true }).map((e) => ({ ...e, kind: 'entity' }));
  const pois = filterPoisForAdmin(filters);
  return [...entities, ...pois];
}

function renderAgentDossiers() {
  const listTarget = agentDossierList || dossierList;
  const detailTarget = agentDossierDetail || dossierDetail;
  if (!listTarget || !detailTarget) return;
  highlightDossierType('agent', state.entityFiltersAgent.type);
  const entities = filterEntities(state.entityFiltersAgent, { includeArchived: false });
  listTarget.innerHTML = '';
  if (!entities.length) {
    const empty = document.createElement('div');
    empty.className = 'dossier-empty';
    empty.textContent = 'Sin entidades con estos filtros.';
    listTarget.appendChild(empty);
    detailTarget.textContent = 'Selecciona una entidad para ver su dossier.';
    return;
  }

  if (!state.activeEntityAgent || !entities.find((e) => e.id === state.activeEntityAgent.id)) {
    state.activeEntityAgent = entities[0];
  }

  entities.forEach((entity) => {
    const card = buildDossierCard(entity, false, state.activeEntityAgent && state.activeEntityAgent.id === entity.id);
    card.addEventListener('click', () => {
      state.activeEntityAgent = entity;
      renderAgentDossiers();
      if (entity.visibility !== 'locked') {
        loadAgentContext(entity.id);
      }
    });
    listTarget.appendChild(card);
  });

  renderDossierDetailView(detailTarget, state.activeEntityAgent, { dm: false });
  if (state.activeEntityAgent && state.activeEntityAgent.visibility !== 'locked') {
    loadAgentContext(state.activeEntityAgent.id);
  }
}

function renderAdminDossiers() {
  if (!dmEntityList) return;
  const items = filterDmItems(state.entityFiltersAdmin);
  dmEntityList.innerHTML = '';
  if (!items.length) {
    const empty = document.createElement('div');
    empty.className = 'dossier-empty';
    empty.textContent = 'Sin entidades con estos filtros.';
    dmEntityList.appendChild(empty);
    if (dmEntitiesContext) {
      dmEntitiesContext.innerHTML = '<div class="dossier-detail">Selecciona una entidad para ver contexto.</div>';
    }
    return;
  }

  if (!state.activeEntityAdmin || !items.find((e) => e.id === state.activeEntityAdmin.id && e.kind === state.activeEntityAdmin.kind)) {
    state.activeEntityAdmin = items[0];
  }

  items.forEach((entity) => {
    const active =
      state.activeEntityAdmin &&
      state.activeEntityAdmin.id === entity.id &&
      state.activeEntityAdmin.kind === entity.kind;
    const card = buildDossierCard(entity, true, active);
    card.addEventListener('click', () => {
      state.activeEntityAdmin = entity;
      renderDmEntityDetailCard(entity, state.activeEntityContext);
      populateEntityForm(entity);
      renderAdminDossiers();
      if (entity.kind === 'entity') {
        loadDmContext(entity.id);
      } else {
        renderDossierDetailView(dmEntitiesContext, entity, { dm: true });
      }
    });
    dmEntityList.appendChild(card);
  });

  if (dmEntitiesContext) {
    renderDossierDetailView(dmEntitiesContext, state.activeEntityAdmin, { dm: true });
  }
  populateEntityForm(state.activeEntityAdmin);
  renderDmEntityDetailCard(state.activeEntityAdmin, state.activeEntityContext);
  if (dmEntitiesContext && state.activeEntityAdmin && state.activeEntityAdmin.kind === 'entity') {
    loadDmContext(state.activeEntityAdmin.id);
  }
}

function buildDossierCard(entity, dmView = false, active = false) {
  const card = document.createElement('div');
  const locked = entity.visibility === 'locked' && !dmView;
  card.className = `dossier-card-row ${active ? 'active' : ''} ${locked ? 'locked' : ''}`;
  const badge = `<span class="badge">${getEntityTypeLabel(entity.type)}</span>`;
  const sessionTags = renderSessionChips(entity.sessions || entity.session_tag || '');
  const role = entity.type === 'poi' ? categoryLabels[entity.category] || entity.role : entity.role;
  const status = entity.type === 'poi' ? `Amenaza ${entity.threat_level || '¿?'}` : entity.status || 'estado desconocido';
  const align = entity.type === 'poi' ? `Velo ${entity.alignment || entity.veil_status || '?'}` : entity.alignment || 'afinidad desconocida';
  if (locked) {
    card.innerHTML = `
      <div class="dossier-row-header">${badge} <strong>${sanitize(entity.code_name || entity.name)}</strong></div>
      <div class="dossier-row-note">LOCKED — requiere clave</div>
    `;
  } else {
    card.innerHTML = `
      <div class="dossier-row-header">${badge} <strong>${sanitize(entity.code_name || entity.name)}</strong></div>
      <div class="dossier-row-meta">${sanitize(role || 'Sin rol')} · ${sanitize(status)}</div>
      <div class="dossier-row-meta">${sanitize(align)}</div>
      <div class="dossier-row-note">${sanitize(shortenText(entity.public_summary || 'Sin notas públicas', 140))}</div>
      <div class="dossier-row-sessions">${sessionTags}</div>
    `;
  }
  if (dmView && entity.archived) {
    const pill = document.createElement('span');
    pill.className = 'badge-soft';
    pill.textContent = 'Archivado';
    card.appendChild(pill);
  }
  return card;
}

function renderDossierDetailView(target, entity, options = {}) {
  if (!target) return;
  if (!entity) {
    target.textContent = 'Selecciona una entidad para ver su dossier.';
    return;
  }
  const dmView = options.dm;
  if (entity.type === 'poi') {
    target.innerHTML = `
      <div class="dossier-detail">
        <div class="dossier-title">${sanitize(entity.code_name || entity.name)}</div>
        <div class="dossier-subtitle">${sanitize(categoryLabels[entity.category] || entity.role || 'PdI')}</div>
        <div class="dossier-badges">
          <span class="badge">Amenaza ${sanitize(String(entity.threat_level || '?'))}</span>
          <span class="badge">Velo ${sanitize(entity.veil_status || entity.alignment || '?')}</span>
          ${entity.sessions ? `<span class="badge-soft">${sanitize(entity.sessions)}</span>` : ''}
        </div>
        <div class="dossier-section">
          <div class="section-title">Ubicación</div>
          <p class="muted">Lat: ${sanitize(String(entity.latitude || '—'))} / Lng: ${sanitize(String(entity.longitude || '—'))}</p>
        </div>
        <div class="dossier-section">
          <div class="section-title">Notas</div>
          <p>${sanitize(entity.public_summary || entity.public_note || 'Sin notas públicas')}</p>
          ${dmView ? `<div class="dm-note"><strong>Intel DM:</strong> ${sanitize(entity.dm_notes || entity.dm_note || 'Sin notas DM')}</div>` : ''}
        </div>
      </div>
    `;
    return;
  }
  const isLocked = entity.visibility === 'locked' && !dmView;
  const sessionChips = renderSessionChips(entity.sessions || []);
  const poiLinks = Array.isArray(entity.pois || entity.poi_links) ? entity.pois || entity.poi_links : [];
  const entityLinks = Array.isArray(entity.relations || entity.links)
    ? entity.relations || entity.links
    : [];

  if (isLocked) {
    target.innerHTML = `
      <div class="dossier-detail">
        <div class="locked-placeholder">LOCKED</div>
        <div class="dossier-title">${sanitize(entity.code_name || entity.name)}</div>
        <button type="button" class="ghost" data-unlock-target="${entity.id}" data-unlock-hint="${sanitize(
          entity.locked_hint || ''
        )}">Desbloquear</button>
      </div>
    `;
    return;
  }

  const relatedPois = poiLinks
    .map((link) => `<div class="dossier-related">
        <span class="badge">PdI</span>
        <span>${sanitize(link.name || link.poi_name || 'PdI')}</span>
        ${link.session_tag ? `<span class="badge-soft">${sanitize(link.session_tag)}</span>` : ''}
        ${link.role_at_poi ? `<span class="badge-soft">${sanitize(link.role_at_poi)}</span>` : ''}
      </div>`)
    .join('');

  const relatedEntities = entityLinks
    .map((link) => `<div class="dossier-related">
        <span class="badge">${sanitize(getEntityTypeLabel(link.to_type || link.target_type))}</span>
        <span>${sanitize(link.to_code_name || link.target_name || 'Entidad')}</span>
        <span class="badge-soft">${sanitize(link.relation_type || link.relation || 'Vínculo')}</span>
      </div>`)
    .join('');

  const imageBlock = entity.image_url
    ? `<div class="dossier-image"><img src="${sanitizeUrlValue(entity.image_url)}" alt="Retrato de ${sanitize(
        entity.code_name || entity.name
      )}"/></div>`
    : '';

  target.innerHTML = `
    <div class="dossier-detail-header">
      <div>
        <div class="dossier-title">${sanitize(entity.code_name || entity.name)}</div>
        <div class="dossier-subtitle">${getEntityTypeLabel(entity.type)} · ${sanitize(entity.role || 'Sin rol')}</div>
        <div class="dossier-badges">
          <span class="badge">${sanitize(entity.status || 'estado desconocido')}</span>
          <span class="badge">${sanitize(entity.alignment || 'afinidad desconocida')}</span>
          ${entity.archived ? '<span class="badge-soft">Archivado</span>' : ''}
        </div>
        <div class="dossier-sessions">${sessionChips || '<span class="muted">Sin sesiones</span>'}</div>
      </div>
      ${imageBlock}
    </div>
    <div class="dossier-section">
      <div class="section-title">Contexto</div>
      <div class="dossier-subsection">
        <strong>PdIs vinculados</strong>
        <div class="dossier-related-list">${relatedPois || '<span class="muted">Ninguno</span>'}</div>
      </div>
      <div class="dossier-subsection">
        <strong>Sesiones</strong>
        <div class="dossier-related-list">${sessionChips || '<span class="muted">Sin sesiones</span>'}</div>
      </div>
      <div class="dossier-subsection">
        <strong>Conexiones</strong>
        <div class="dossier-related-list">${relatedEntities || '<span class="muted">Sin conexiones</span>'}</div>
      </div>
    </div>
    <div class="dossier-section">
      <div class="section-title">Notas</div>
      <p>${sanitize(entity.public_summary || entity.public_note || 'Sin notas públicas')}</p>
      ${dmView ? `<div class="dm-note"><strong>Intel DM:</strong> ${sanitize(entity.dm_notes || entity.dm_note || 'Sin notas DM')}</div>` : ''}
    </div>
  `;
}

function renderSessionChips(sessions) {
  if (!sessions) return '';
  const list = Array.isArray(sessions)
    ? sessions.map((s) => (typeof s === 'string' ? s : s.session_tag))
    : String(sessions)
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean);
  if (!list.length) return '';
  return list.map((tag) => `<span class="badge-soft">${sanitize(tag)}</span>`).join(' ');
}

function buildGraphElements(ctx = {}) {
  const elements = { nodes: [], edges: [] };
  if (!ctx.entity) return { ...elements, focusId: null };
  const focusId = `e-${ctx.entity.id}`;
  const seen = new Set();
  const pushNode = (data) => {
    if (seen.has(data.id)) return;
    seen.add(data.id);
    elements.nodes.push({ data });
  };
  pushNode({
    id: focusId,
    label: ctx.entity.code_name || ctx.entity.name || `Entidad ${ctx.entity.id}`,
    type: ctx.entity.type || 'npc',
    session: ctx.entity.first_session || ctx.entity.sessions || null
  });

  (ctx.relations || []).forEach((rel, idx) => {
    const toId = `e-${rel.to_entity_id}`;
    pushNode({
      id: toId,
      label: rel.to_code_name || rel.target_name || `Entidad ${rel.to_entity_id}`,
      type: rel.to_type || rel.target_type || 'npc',
      session: rel.session_tag || null
    });
    elements.edges.push({
      data: {
        id: `rel-${ctx.entity.id}-${rel.to_entity_id}-${idx}`,
        source: focusId,
        target: toId,
        relation: rel.relation_type || rel.relation || 'vínculo',
        strength: rel.strength || 1
      }
    });
  });

  (ctx.pois || []).forEach((link, idx) => {
    const poiId = `p-${link.poi_id}`;
    pushNode({
      id: poiId,
      label: link.name || `PdI ${link.poi_id}`,
      type: 'poi',
      session: link.session_tag || link.poi_session || null
    });
    elements.edges.push({
      data: {
        id: `poi-${ctx.entity.id}-${link.poi_id}-${idx}`,
        source: focusId,
        target: poiId,
        relation: link.role_at_poi || 'PdI',
        strength: 1
      }
    });
  });

  return { ...elements, focusId };
}

function renderEntityGraph(container, ctx, options = {}) {
  if (!container || !ctx || !ctx.entity || typeof cytoscape === 'undefined') return;
  const { nodes, edges, focusId } = buildGraphElements(ctx);
  if (!nodes.length) {
    container.textContent = 'Sin relaciones registradas.';
    return;
  }
  container.innerHTML = '';

  const elements = [...nodes, ...edges];
  let cy = container._cy;
  const style = [
    {
      selector: 'node',
      style: {
        'background-color': '#00c676',
        'label': 'data(label)',
        'color': '#d9f7eb',
        'font-size': 10,
        'text-valign': 'center',
        'text-halign': 'center',
        'text-wrap': 'wrap',
        'text-max-width': 120,
        'border-width': 1,
        'border-color': 'rgba(0,255,136,0.4)',
        'width': 42,
        'height': 42
      }
    },
    { selector: 'node[type = \"pc\"]', style: { 'shape': 'round-rectangle' } },
    { selector: 'node[type = \"npc\"]', style: { 'shape': 'ellipse' } },
    { selector: 'node[type = \"org\"]', style: { 'shape': 'hexagon' } },
    { selector: 'node[type = \"poi\"]', style: { 'shape': 'diamond' } },
    {
      selector: 'node.focus',
      style: { 'border-width': 3, 'border-color': '#ffffff', 'background-color': '#00ff88' }
    },
    {
      selector: 'edge',
      style: {
        'line-color': '#00aa66',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#00aa66',
        'curve-style': 'bezier',
        'width': 'mapData(strength, 1, 5, 1, 4)',
        'opacity': 0.85,
        'label': 'data(relation)',
        'font-size': 9,
        'text-background-opacity': 0.6,
        'text-background-color': '#041014',
        'text-background-padding': 2,
        'text-rotation': 'autorotate',
        'color': '#9ef0c4'
      }
    }
  ];

  if (!cy) {
    cy = cytoscape({
      container,
      elements,
      style,
      layout: { name: 'concentric', padding: 24 }
    });
    container._cy = cy;
  } else {
    cy.elements().remove();
    cy.add(elements);
  }

  cy.nodes().removeClass('focus');
  if (focusId) {
    cy.nodes(`[id = \"${focusId}\"]`).addClass('focus');
  }

  const layout = cy.elements().layout({
    name: 'concentric',
    padding: 24,
    sweep: 2 * Math.PI,
    startAngle: 1.5 * Math.PI,
    concentric: (node) => (node.id() === focusId ? 2 : 1),
    levelWidth: () => 1
  });
  layout.run();
  cy.fit(undefined, 20);
}

function getEntityTypeLabel(type) {
  if (type === 'pc') return 'PJ';
  if (type === 'npc') return 'PNJ';
  if (type === 'org') return 'Org';
  if (type === 'poi') return 'PdI';
  return 'Entidad';
}

function shortenText(text, max = 160) {
  if (!text) return '';
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

function highlightDossierType(context, value) {
  const buttons = context === 'admin' ? dossierTypeButtonsAdmin : dossierTypeButtons;
  buttons.forEach((btn) => {
    btn.classList.toggle('active', (btn.dataset.dossierType || '') === value);
  });
}

function setWorkspaceView(view) {
  state.workspaceView = view;
  if (document?.body) {
    document.body.dataset.workspaceView = view;
    const isDm = isDmViewer();
    document.body.classList.toggle('dm-hide-top-nav', isDm && view === 'entities');
  }
  workspaceTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.view === view);
  });
  workspaceViews.forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.view === view);
  });
  workspaceTopViews.forEach((panel) => {
    panel.classList.toggle('active', panel.dataset.view === view);
  });
  const desktop = !isMobileView();
  if (mapShell) {
    const showMap = view === 'map' || (!state.dmMode && desktop);
    mapShell.classList.toggle('active', showMap);
    mapShell.style.display = showMap ? 'block' : 'none';
    if (showMap && state.activeEntityAdmin && state.activeEntityAdmin.kind === 'poi') {
      const poiId = state.activeEntityAdmin.id;
      const poi = state.pois.find((p) => Number(p.id) === Number(poiId));
      if (poi) {
        setFocalPoi(poi);
        focusOnPoi(poi.id);
      }
    }
  }
  if (view === 'entities') {
    renderAgentDossiers();
    renderAdminDossiers();
    if (isDmViewer()) {
      loadEntities();
    }
  }
  if (view === 'inbox') {
    loadMessages();
  }
}

async function loadDmContext(id) {
  if (!id) return;
  try {
    const response = await fetch(`/api/dm/entities/${id}/context`, {
      headers: { 'x-dm-secret': state.dmSecret || '' }
    });
    if (!response.ok) throw new Error('No se pudo cargar contexto.');
    const ctx = await response.json();
    state.activeEntityContext = ctx;
    renderDmContext(ctx);
    renderEntitiesMap(ctx);
    renderEntityGraph(dmGraphContainer, ctx, { focusId: id, mode: 'dm' });
  } catch (err) {
    logDebug(`Contexto DM error: ${err.message}`);
  }
}

function renderDmContext(ctx) {
  if (!dmEntitiesContext || !ctx || !ctx.entity) return;
  const entity = ctx.entity;
  const sessions = renderSessionChips(ctx.sessions || entity.sessions || []);
  const poiLinks = (ctx.pois || [])
    .map(
      (p) => `<div class="dossier-related"><span class="badge">PdI</span>${sanitize(p.name)}${
        p.session_tag ? ` <span class="badge-soft">${sanitize(p.session_tag)}</span>` : ''
      }${p.role_at_poi ? ` <span class="badge-soft">${sanitize(p.role_at_poi)}</span>` : ''}</div>`
    )
    .join('');
  const relations = (ctx.relations || [])
    .map(
      (r) => `<div class="dossier-related"><span class="badge">${sanitize(
        r.relation_type || 'Vínculo'
      )}</span>${sanitize(r.to_code_name || r.to_entity_id)}</div>`
    )
    .join('');

  dmEntitiesContext.innerHTML = `
    <div class="dossier-detail">
      <div class="dossier-title">${sanitize(entity.code_name || entity.name)}</div>
      <div class="dossier-subtitle">${sanitize(entity.role || 'Sin rol')}</div>
      <div class="dossier-badges">
        <span class="badge">${sanitize(entity.status || 'estado?')}</span>
        <span class="badge">${sanitize(entity.alignment || 'afinidad?')}</span>
        ${entity.visibility === 'locked' ? '<span class="badge-soft">Bloqueada</span>' : ''}
      </div>
      <div class="dossier-sessions">${sessions || '<span class="muted">Sin sesiones</span>'}</div>
      <div class="dossier-section">
        <div class="section-title">PdIs vinculados</div>
        <div class="dossier-related-list">${poiLinks || '<span class="muted">Ninguno</span>'}</div>
      </div>
      <div class="dossier-section">
        <div class="section-title">Conexiones</div>
        <div class="dossier-related-list">${relations || '<span class="muted">Sin conexiones</span>'}</div>
      </div>
    </div>
  `;
  renderDmEntityDetailCard(entity, ctx);
}

function renderEntitiesMap(ctx) {
  if (!dmEntitiesMapContainer || !state.mapboxConfig) return;
  if (!state.entitiesMap) {
    state.entitiesMap = new mapboxgl.Map({
      container: 'dm-entities-map',
      style: state.mapboxConfig.mapStyle,
      center: mapCenter,
      zoom: 9
    });
  }
  if (!ctx || !ctx.pois || !ctx.pois.length) return;
  const map = state.entitiesMap;
  // limpiar markers previos
  if (!state.entityMarkers) state.entityMarkers = [];
  state.entityMarkers.forEach((m) => m.remove());
  state.entityMarkers = [];
  const bounds = new mapboxgl.LngLatBounds();
  ctx.pois.forEach((p) => {
    const el = document.createElement('div');
    el.className = 'marker-dot';
    const marker = new mapboxgl.Marker(el).setLngLat([p.poi_longitude || p.longitude || 0, p.poi_latitude || p.latitude || 0]).addTo(map);
    state.entityMarkers.push(marker);
    if (p.longitude && p.latitude) bounds.extend([p.longitude, p.latitude]);
  });
  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 40, maxZoom: 12 });
  }
}

function renderDmEntityDetailCard(entity, ctx = {}) {
  const detail = document.getElementById('dm-entity-detail-card');
  const hero = document.getElementById('dm-entity-hero-card');
  if (!detail || !hero) return;
  if (!entity) {
    detail.innerHTML =
      '<div class="card-title">Detalle de entidad</div><div class="muted">Selecciona un dossier en la lista de la izquierda. Podrás editarlo en el panel inferior y, si es un PdI, verlo en el mapa.</div>';
    hero.innerHTML = '<div class="dm-entity-hero-body muted">Sin imagen disponible. Al elegir un dossier se mostrará aquí su foto o el plano.</div>';
    return;
  }

  const sessions = renderSessionChips((ctx && ctx.sessions) || entity.sessions || entity.session_tag || '');
  const img = entity.image_url || entity.photo || '';
  const renderHero = (title, subtitle) => {
    const locked = entity.visibility === 'locked' && !isDmViewer();
    hero.innerHTML = `
      <div class="dm-entity-hero-body">
        ${
          locked
            ? `<div class="hero-wrapper hero-locked"><div class="locked-placeholder">LOCKED</div></div>`
            : img
            ? `<div class="hero-wrapper">
                 <img src="${sanitize(img)}" alt="${sanitize(title)}" />
               </div>`
            : '<div class="muted">Sin imagen disponible.</div>'
        }
      </div>
    `;
  };

  if (entity.type === 'poi') {
    const lat = Number(entity.latitude || entity.poi_latitude);
    const lng = Number(entity.longitude || entity.poi_longitude);
    const hasCoords = !Number.isNaN(lat) && !Number.isNaN(lng);
    const staticStyle =
      state.mapboxConfig && state.mapboxConfig.mapStyle
        ? state.mapboxConfig.mapStyle
        : 'mapbox://styles/mapbox/dark-v11';

    const staticBaseFromStyle = (styleUrl) => {
      if (!styleUrl) return null;
      if (styleUrl.startsWith('mapbox://styles/')) {
        const [, user, style] = styleUrl.replace('mapbox://styles/', '').split('/');
        return user && style ? `https://api.mapbox.com/styles/v1/${user}/${style}` : null;
      }
      const match = styleUrl.match(/api\.mapbox\.com\/styles\/v1\/([^/]+\/[^/?]+)/);
      if (match && match[1]) return `https://api.mapbox.com/styles/v1/${match[1]}`;
      return null;
    };

    const staticBase = staticBaseFromStyle(staticStyle) || 'https://api.mapbox.com/styles/v1/mapbox/dark-v11';
    const token = state.mapboxConfig?.mapboxToken || '';
    const staticUrl =
      hasCoords && token
        ? `${staticBase}/static/pin-s+00ff88(${lng},${lat})/${lng},${lat},12/800x520?access_token=${token}`
        : '';
    detail.innerHTML = `
      <div class="card-title">PdI seleccionado</div>
      <div class="dm-entity-detail-body">
        ${
          hasCoords
            ? `<div class="dm-entity-map"><img src="${staticUrl}" alt="Mapa de ${sanitize(entity.name || entity.code_name || 'PdI')}" /></div>`
            : '<div class="muted">Sin coordenadas registradas.</div>'
        }
        <div class="dm-entity-meta">
          <span class="badge">${categoryLabels[entity.category] || 'PdI'}</span>
          <span class="badge">Amenaza ${sanitize(entity.threat_level || '?')}</span>
          <span class="badge">Velo ${sanitize(entity.veil_status || entity.alignment || '?')}</span>
          ${sessions || ''}
        </div>
        <div>${sanitize(entity.public_note || entity.public_summary || 'Sin nota pública')}</div>
      </div>
    `;
    renderHero(entity.name || entity.code_name || 'PdI', entity.session_tag || '');
    return;
  }

  detail.innerHTML = `
    <div class="card-title">Dossier</div>
    <div class="dm-entity-detail-body">
      <div class="dm-entity-meta">
        <span class="badge">${getEntityTypeLabel(entity.type)}</span>
        ${entity.status ? `<span class="badge">${sanitize(entity.status)}</span>` : ''}
        ${entity.alignment ? `<span class="badge">${sanitize(entity.alignment)}</span>` : ''}
        ${sessions || ''}
      </div>
      <div>
        <div><strong>${sanitize(entity.code_name || entity.name || '')}</strong></div>
        <div class="muted">${sanitize(entity.role || 'Sin rol')}</div>
      </div>
      <div>${sanitize(entity.public_summary || 'Sin resumen público')}</div>
    </div>
  `;
  renderHero(entity.code_name || entity.name || 'Entidad', entity.role || '');
}

function showMessage(text, isError = false) {
  messageBar.textContent = text;
  messageBar.style.borderColor = isError ? 'rgba(255,95,95,0.8)' : 'rgba(0,255,136,0.4)';
  messageBar.style.color = isError ? '#ffb3b3' : '#e5f5ee';
}

function toggleCollapsible(toggle) {
  const currentlyExpanded = toggle.getAttribute('aria-expanded') === 'true';
  const nextExpanded = !currentlyExpanded;
  toggle.setAttribute('aria-expanded', String(nextExpanded));
  const icon = toggle.querySelector('.collapsible-icon');
  if (icon) {
    icon.textContent = nextExpanded ? '−' : '+';
  }
  const body = toggle.nextElementSibling;
  if (!body) return;
  body.classList.toggle('collapsed', !nextExpanded);
  const section = toggle.closest('.collapsible');
  updateCollapsibleSectionState(section, nextExpanded);
}

function resetCollapsibles() {
  document.querySelectorAll('.collapsible').forEach((section) => {
    const toggle = section.querySelector('.collapsible-toggle');
    const body = section.querySelector('.collapsible-body');
    if (!toggle || !body) return;
    const defaultExpanded = false;
    body.classList.toggle('collapsed', !defaultExpanded);
    toggle.setAttribute('aria-expanded', String(defaultExpanded));
    const icon = toggle.querySelector('.collapsible-icon');
    if (icon) icon.textContent = defaultExpanded ? '−' : '+';
    updateCollapsibleSectionState(section, defaultExpanded);
  });
}

function ensureSectionExpanded(sectionElement) {
  if (!sectionElement) return;
  const body = sectionElement.querySelector('.collapsible-body');
  const toggle = sectionElement.querySelector('.collapsible-toggle');
  if (body && body.classList.contains('collapsed') && toggle) {
    toggleCollapsible(toggle);
  }
}

function updateCollapsibleSectionState(section, isExpanded) {
  if (!section) return;
  if (section.classList.contains('poi-list-section')) {
    section.classList.toggle('collapsed-section', !isExpanded);
  }
  scheduleMapResize();
}

function scheduleMapResize() {
  if (!state.map) return;
  state.map.resize();
  if (mapResizeTimeout) {
    clearTimeout(mapResizeTimeout);
  }
  mapResizeTimeout = setTimeout(() => {
    state.map?.resize();
    mapResizeTimeout = null;
  }, 400);
}

function updateRoleLayoutClasses() {
  if (!document.body) return;
  updateViewportMode();
  document.body.classList.toggle('mode-dm', !!state.dmMode);
  document.body.classList.toggle('mode-agent', !state.dmMode);
  scheduleMapResize();
  updateMessageBoxLabel();
}

function renderFocalPoiCard() {
  if (!focalPoiContent) return;
  const poi = state.poiFocal;
  if (!poi) {
    focalPoiContent.textContent = 'Ningún PdI seleccionado. Elige uno del mapa o de la lista.';
    if (focalPoiContentDm) {
      focalPoiContentDm.textContent = 'Ningún PdI seleccionado. Elige uno del mapa o de la lista.';
    }
    return;
  }
  const safeImage = sanitizeUrlValue(poi.image_url);
  const icon = categoryIcons[poi.category] || '◉';
  const relatedEntities = getEntitiesForPoi(poi.id);
  const relatedBlock = relatedEntities.length
    ? `<div class="poi-related">
        <div class="poi-meta-label">Entidades en este PdI</div>
        <div class="poi-related-chips">${relatedEntities
          .map(
            (ent) =>
              `<button class="chip" data-entity-jump="${ent.id}">${sanitize(ent.name)}</button>`
          )
          .join('')}</div>
      </div>`
    : '';
  focalPoiContent.innerHTML = `
    <div class="poi-focal-header">
      <div class="poi-name">${icon} ${sanitize(poi.name)}</div>
      <div class="poi-meta">Amenaza ${poi.threat_level} · Velo ${sanitize(poi.veil_status)}</div>
    </div>
    <div class="poi-session">Sesión ${sanitize(poi.session_tag || '—')}</div>
    <div class="poi-note">${sanitize(poi.public_note || 'Sin notas públicas')}</div>
    ${safeImage ? `<div class="poi-image-thumb"><img src="${safeImage}" alt="${sanitize(poi.name)}"/></div>` : ''}
    ${relatedBlock}
  `;
  if (focalPoiContentDm) {
    focalPoiContentDm.innerHTML = focalPoiContent.innerHTML;
  }
}

function renderActiveMessageCard() {
  if (!consoleMessageContent) return;
  const msg = state.activeMessage;
  if (!msg) {
    consoleMessageContent.textContent = 'No hay despachos.';
    return;
  }
  consoleMessageContent.innerHTML = `
    <div class="message-header"><strong>${sanitize(msg.sender)}</strong> → ${sanitize(msg.recipient)}</div>
    <div class="message-subject">${sanitize(msg.subject)}</div>
    <div class="message-body">${sanitize(msg.body)}</div>
  `;
}

function setFocalPoi(poi) {
  if (!poi) {
    state.poiFocal = null;
    renderFocalPoiCard();
    highlightPoiInList(null);
    return;
  }
  state.poiFocal = poi;
  renderFocalPoiCard();
  highlightPoiInList(poi?.id);
  if (state.dmMode && state.activeDmBlade === 'entities') {
    populateFormForEdit(poi);
  }
}

function setDmBlade(blade) {
  const normalized =
    blade === 'dispatch' ? 'journal' : blade === 'poi' || blade === 'dossiers' || blade === 'mission' ? 'entities' : blade;
  state.activeDmBlade = normalized;
  document.querySelectorAll('.blade-tab').forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.blade === normalized);
  });
  document.querySelectorAll('[data-blade-panel]').forEach((panel) => {
    panel.classList.toggle('active', panel.getAttribute('data-blade-panel') === normalized);
  });
  if (normalized === 'entities' && state.dmMode && state.poiFocal) {
    populateFormForEdit(state.poiFocal);
  }
  if (normalized === 'journal') {
    renderMissionCards();
  }
  if (normalized === 'entities') {
    renderAdminDossiers();
  }
  setWorkspaceView(normalized);
}

function setAgentBlade(blade) {
  state.agentBlade = blade;
  setWorkspaceView(blade);
}

function loadMissionNotes() {
  try {
    state.missionNotes = localStorage.getItem(MISSION_NOTES_KEY) || '';
  } catch (err) {
    state.missionNotes = '';
  }
  if (journalPublicInput) {
    journalPublicInput.value = state.missionNotes;
  }
  renderMissionCards();
}

function saveMissionNotes(text) {
  state.missionNotes = text.trim();
  try {
    localStorage.setItem(MISSION_NOTES_KEY, state.missionNotes);
  } catch (err) {
    // ignore storage errors
  }
  renderMissionCards();
}

function loadJournalDm() {
  try {
    state.journalDm = localStorage.getItem(JOURNAL_DM_KEY) || '';
  } catch (err) {
    state.journalDm = '';
  }
  if (journalDmInput) {
    journalDmInput.value = state.journalDm;
  }
}

function saveJournalDm(text) {
  state.journalDm = text.trim();
  try {
    localStorage.setItem(JOURNAL_DM_KEY, state.journalDm);
  } catch (err) {
    // ignore storage errors
  }
}

function renderMissionCards() {
  if (missionBriefText) {
    missionBriefText.textContent = state.missionNotes || 'Esperando directivas.';
  }
  if (journalPublicInput && journalPublicInput !== document.activeElement) {
    journalPublicInput.value = state.missionNotes;
  }
}

function setMobileTab(tab) {
  updateViewportMode();
  state.mobileTab = tab;
  if (tab !== 'pois') {
    state.showOlderMobilePois = false;
  }
  if (document.body) {
    document.body.setAttribute('data-mobile-tab', tab);
    document.body.classList.toggle('is-mobile', isMobileView());
  }
  document.querySelectorAll('.mobile-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.mobileTab === tab);
  });
  if (tab === 'map') {
    setWorkspaceView('map');
    scheduleMapResize();
  } else if (tab === 'console') {
    setWorkspaceView('console');
  } else if (tab === 'pois') {
    // Reuse el focal PdI sin mapa en móvil
    setWorkspaceView('map');
    state.showOlderMobilePois = false;
    if (isMobileView()) {
      // collapse poi list by default for compact view on mobile
      const poiToggle = document.querySelector('.poi-list-section .collapsible-toggle');
      const poiBody = document.querySelector('.poi-list-section .collapsible-body');
      if (poiBody && poiToggle && !poiBody.classList.contains('collapsed')) {
        toggleCollapsible(poiToggle);
      }
    }
    if (sidebarPanel?.classList.contains('closed')) {
      sidebarPanel.classList.remove('closed');
      panelToggleBtn?.setAttribute('aria-expanded', 'true');
      floatingPanelToggleBtn?.setAttribute('aria-expanded', 'true');
      floatingPanelToggleBtn?.classList.remove('collapsed');
    }
    renderPoiList();
  }
  if (mapShell && isMobileView()) {
    const showMap = tab === 'map';
    mapShell.classList.toggle('active', showMap);
    mapShell.style.display = showMap ? 'block' : 'none';
  }
}

function highlightPoiInList(id) {
  document.querySelectorAll('#poi-list .poi-item').forEach((item) => {
    if (!id) {
      item.classList.remove('active');
      return;
    }
    item.classList.toggle('active', Number(item.dataset.poiId) === Number(id));
  });
}

function isMobileView() {
  return window.innerWidth <= 900;
}

function updateViewportMode() {
  const mobile = isMobileView();
  if (!document.body) return;
  document.body.classList.toggle('mobile-mode', mobile);
  document.body.classList.toggle('is-mobile', mobile);
}

async function attemptUnlock(id, code) {
  try {
    const response = await fetch(`/api/agent/entities/${id}/unlock`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    if (!response.ok) {
      showMessage('No se pudo desbloquear.', true);
      return;
    }
    const result = await response.json();
    if (result.status === 'ok') {
      state.unlockedEntities.add(Number(id));
      showMessage('Dossier desbloqueado.');
      hideUnlockOverlay();
      await loadEntities();
      const entity = findEntityById(id);
      renderAgentDossiers();
      if (entity) renderDossierDetailView(agentDossierDetail, entity, { dm: false });
    } else if (result.status === 'invalid_code') {
      showMessage('Código incorrecto.', true);
    } else {
      showMessage('Estado de bloqueo sin cambios.');
    }
  } catch (err) {
    showMessage('Error en desbloqueo.', true);
  }
}

function updateMessageFromField() {
  if (!messageFromInput) return;
  if (state.dmMode) {
    messageFromInput.readOnly = false;
    if (!messageFromInput.value || messageFromInput.value === 'Agente de Campo') {
      messageFromInput.value = 'Sr. Verdad';
    }
    return;
  }
  const agentAlias = state.agent ? `${state.agent.username}@ov.pa` : 'Agente de Campo';
  messageFromInput.value = agentAlias;
  messageFromInput.readOnly = true;
}

function parseSessionInput(value) {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((tag) => ({ session_tag: tag }));
}

function parsePoiLinksInput(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((token) => {
      const [idPart, extras] = token.split('|');
      const [rolePart, sessionPart] = (extras || '').split(':');
      const poiId = Number(idPart);
      if (!poiId || Number.isNaN(poiId)) return null;
      return {
        poi_id: poiId,
        role_at_poi: rolePart ? rolePart.trim() : null,
        session_tag: sessionPart ? sessionPart.trim() : null,
        is_public: true
      };
    })
    .filter(Boolean);
}

function parseEntityLinksInput(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((token) => {
      const [idPart, relationPart] = token.split('|');
      const targetId = Number(idPart);
      if (!targetId || Number.isNaN(targetId) || !relationPart) return null;
      return { to_entity_id: targetId, relation_type: relationPart.trim(), is_public: true };
    })
    .filter(Boolean);
}

function parseMultiSelect(raw, kind = 'entity') {
  if (!raw) return [];
  return raw
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((item) => {
      const [id, extra] = item.split('|');
      if (kind === 'poi') {
        const [role_at_poi, session_tag] = (extra || '').split(':');
        return { poi_id: Number(id), role_at_poi: role_at_poi || '', session_tag: session_tag || '' };
      }
      return { to_entity_id: Number(id), relation_type: extra || 'relacion' };
    });
}

function buildMultiTokens(items, kind = 'entity') {
  if (!items || !items.length) return [];
  return items
    .map((item) => {
      if (kind === 'poi') {
        const id = item.poi_id || item.id;
        if (!id) return null;
        const role = item.role_at_poi || '';
        const session = item.session_tag || item.session || '';
        return `${id}|${role}:${session}`;
      }
      const id = item.to_entity_id || item.target_id || item.id;
      if (!id) return null;
      const rel = item.relation_type || item.relation || '';
      return `${id}|${rel}`;
    })
    .filter(Boolean);
}

function getTokenLabel(item, kind = 'entity') {
  if (kind === 'poi') {
    const name = item.name || item.code_name || item.title || `PdI #${item.id || item.poi_id}`;
    const session = item.session_tag || item.session || '';
    return `${name}${session ? ` · ${session}` : ''}`;
  }
  const name = item.code_name || item.name || item.title || `Entidad #${item.id || item.to_entity_id}`;
  const rel = item.relation_type || item.relation || '';
  return rel ? `${name} · ${rel}` : name;
}

function tokensFromHidden(hidden) {
  if (!hidden) return [];
  return hidden.value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
}

function writeTokens(hidden, tokens) {
  if (hidden) hidden.value = tokens.join(',');
}

function setupMultiSelect(config, dataFn, mode = 'entity') {
  if (!config || !config.input || !config.suggestions || !config.chips || !config.hidden) return;
  const { input, suggestions, chips, hidden } = config;

  function renderSuggestions(list) {
    suggestions.innerHTML = '';
    if (!list.length || !input.value.trim()) {
      suggestions.classList.remove('visible');
      return;
    }
    list.slice(0, 8).forEach((item) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = getTokenLabel(item, mode);
      btn.addEventListener('click', () => {
        addToken(item);
        input.value = '';
        suggestions.classList.remove('visible');
      });
      suggestions.appendChild(btn);
    });
    suggestions.classList.add('visible');
  }

  function addToken(item) {
    const tokens = tokensFromHidden(hidden);
    const token = mode === 'poi'
      ? `${item.id || item.poi_id}|${(item.role_at_poi || '')}:${item.session_tag || item.session || ''}`
      : `${item.id || item.to_entity_id || item.target_id}|${item.relation_type || item.relation || ''}`;
    if (tokens.includes(token)) return;
    tokens.push(token);
    writeTokens(hidden, tokens);
    renderChips(tokens);
  }

  function removeToken(token) {
    const tokens = tokensFromHidden(hidden).filter((t) => t !== token);
    writeTokens(hidden, tokens);
    renderChips(tokens);
  }

  function renderChips(tokens) {
    chips.innerHTML = '';
    const dataList = dataFn() || [];
    tokens.forEach((token) => {
      const [id, extra] = token.split('|');
      const match = dataList.find((item) => String(item.id || item.poi_id || item.to_entity_id || item.target_id) === id);
      const label = match ? getTokenLabel({ ...match, relation_type: extra, role_at_poi: extra?.split(':')?.[0] }, mode) : token;
      const chip = document.createElement('span');
      chip.className = 'chip';
      chip.textContent = label;
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = '×';
      close.addEventListener('click', () => removeToken(token));
      chip.appendChild(close);
      chips.appendChild(chip);
    });
  }

  const fuseOptions =
    mode === 'poi'
      ? { keys: ['name', 'code_name', 'category', 'session_tag'], threshold: 0.3 }
      : { keys: ['name', 'code_name', 'role', 'alignment'], threshold: 0.3 };

  input.addEventListener('input', () => {
    const data = dataFn() || [];
    const fuse = new Fuse(data, fuseOptions);
    const query = input.value.trim();
    if (!query) {
      suggestions.classList.remove('visible');
      return;
    }
    const results = fuse.search(query).map((r) => r.item);
    renderSuggestions(results);
  });

  document.addEventListener('click', (event) => {
    if (!suggestions.contains(event.target) && event.target !== input) {
      suggestions.classList.remove('visible');
    }
  });

  config.renderChips = renderChips;
}

function hydrateMultiSelect(config, items, mode = 'entity') {
  if (!config || !config.hidden || !config.chips) return;
  const tokens = buildMultiTokens(items, mode);
  writeTokens(config.hidden, tokens);
  if (config.renderChips) {
    config.renderChips(tokens);
  } else if (config.chips) {
    config.chips.innerHTML = '';
  }
}

function toggleUnlockFields() {
  const locked = entityVisibilityInput && entityVisibilityInput.value === 'locked';
  if (unlockFields) {
    unlockFields.style.display = locked ? 'block' : 'none';
  }
}

function openUnlockOverlay(id, hint = '') {
  if (!unlockOverlay || !unlockInput || !unlockConfirm || !unlockHint) return;
  unlockOverlay.classList.remove('hidden');
  unlockOverlay.dataset.targetId = id;
  unlockHint.textContent = hint || 'Introduce la clave para desbloquear.';
  unlockInput.value = '';
  unlockInput.focus();
}

function hideUnlockOverlay() {
  if (unlockOverlay) {
    unlockOverlay.classList.add('hidden');
    unlockOverlay.dataset.targetId = '';
  }
}

function pulseSavedButton() {
  const saveBtn = document.getElementById('entity-submit');
  if (!saveBtn) return;
  saveBtn.classList.add('btn-saved');
  setTimeout(() => saveBtn.classList.remove('btn-saved'), 800);
}

function setSavingButton(button, saving, savingText = 'Guardando…') {
  if (!button) return;
  if (saving) {
    button.dataset.originalText = button.textContent;
    button.textContent = savingText;
    button.classList.add('btn-saving');
    button.disabled = true;
  } else {
    const original = button.dataset.originalText;
    button.textContent = original || button.textContent;
    button.classList.remove('btn-saving');
    button.disabled = false;
  }
}

function populateEntityForm(entity) {
  if (!entityForm || !entity) return;
  const kind = entity.kind || (entity.type === 'poi' ? 'poi' : 'entity');
  entityKindInput.value = kind;
  entityForm.classList.toggle('is-poi', kind === 'poi');
  entityIdInput.value = entity.id;
  entityTypeInput.value = entity.type;
  entityCodeNameInput.value = entity.code_name || entity.name || '';
  entityRealNameInput.value = entity.real_name || '';
  entityRoleInput.value = entity.role || '';
  entityStatusInput.value = entity.status || '';
  entityAlignmentInput.value = entity.alignment || '';
  entityThreatInput.value = entity.threat_level || '';
  entityImageInput.value = entity.image_url || '';
  entitySessionFirstInput.value = entity.first_session || '';
  entitySessionLastInput.value = entity.last_session || '';
  entityPublicNoteInput.value = entity.public_summary || entity.public_note || '';
  entityDmNoteInput.value = entity.dm_notes || entity.dm_note || '';
  entityVisibilityInput.value = entity.visibility || 'agent_public';
  entityUnlockInput.value = entity.unlock_code || '';
  entityLockedHintInput.value = entity.locked_hint || '';
  entityArchivedInput.checked = !!entity.archived;
  const sessions = Array.isArray(entity.sessions)
    ? entity.sessions.map((s) => s.session_tag).join(',')
    : entity.sessions || entity.session_tag || '';
  entitySessionsInput.value = sessions;
  entityPoisInput.value = (entity.pois || entity.poi_links || [])
    .map((p) => `${p.poi_id}:${p.role_at_poi || ''}:${p.session_tag || ''}`)
    .join(',');
  entityLinksInput.value = (entity.relations || entity.links || [])
    .map((l) => `${l.to_entity_id || l.target_id}:${l.relation_type || l.relation}`)
    .join(',');

  // PdI-specific fields
  if (kind === 'poi') {
    poiCategorySelect.value = entity.category || '';
    formIds.latitude.value = entity.latitude || '';
    formIds.longitude.value = entity.longitude || '';
    formIds.imageUrl.value = entity.image_url || '';
    formIds.threat.value = entity.threat_level || '';
    formIds.veil.value = entity.veil_status || entity.alignment || '';
    formIds.session.value = entity.session_tag || entity.sessions || '';
    formIds.publicNote.value = entity.public_note || entity.public_summary || '';
    formIds.dmNote.value = entity.dm_note || entity.dm_notes || '';
    entityThreatInput.value = entity.threat_level || '';
    state.editingPoiId = entity.id;
  } else {
    state.editingPoiId = null;
  }
  updateEntityFormMode(kind === 'poi' ? 'poi' : entity.type);
  hydrateMultiSelect(entityPoisSelect, entity.pois || entity.poi_links || [], 'poi');
  hydrateMultiSelect(
    {
      input: entityLinksSearch,
      suggestions: entityLinksSuggestions,
      chips: entityLinksChips,
      hidden: entityLinksInput
    },
    entity.relations || entity.links || [],
    'entity'
  );
  toggleUnlockFields();
}

function resetEntityForm() {
  if (!entityForm) return;
  entityForm.reset();
  entityIdInput.value = '';
  entityArchivedInput.checked = false;
  entityKindInput.value = 'entity';
  updateEntityFormMode('entity');
  state.activeEntityAdmin = null;
  renderDmEntityDetailCard(null);
  hydrateMultiSelect(entityPoisSelect, [], 'poi');
  hydrateMultiSelect(
    {
      input: entityLinksSearch,
      suggestions: entityLinksSuggestions,
      chips: entityLinksChips,
      hidden: entityLinksInput
    },
    [],
    'entity'
  );
  toggleUnlockFields();
}

async function handleEntitySubmit(event) {
  event.preventDefault();
  if (!isDmViewer()) {
    dmWarning.textContent = 'Se requiere canal de Sr. Verdad para guardar entidades.';
    return;
  }
  setSavingButton(entitySubmitBtn, true, 'Guardando…');

  const kind = (entityKindInput?.value || '').trim() || (entityTypeInput.value === 'poi' ? 'poi' : 'entity');
  try {
    if (kind === 'poi' || entityTypeInput.value === 'poi') {
      await submitPoiFromEntityForm();
      return;
    }

    const payload = {
      type: entityTypeInput.value,
      code_name: entityCodeNameInput.value.trim(),
      real_name: entityRealNameInput.value.trim(),
      role: entityRoleInput.value.trim(),
      status: entityStatusInput.value.trim(),
      alignment: entityAlignmentInput.value.trim(),
      threat_level: entityThreatInput.value ? Number(entityThreatInput.value) : null,
      image_url: entityImageInput.value.trim(),
      first_session: entitySessionFirstInput.value.trim(),
      last_session: entitySessionLastInput.value.trim(),
      sessions: entitySessionsInput.value.trim(),
      public_summary: entityPublicNoteInput.value.trim(),
      dm_notes: entityDmNoteInput.value.trim(),
      visibility: entityVisibilityInput.value,
      unlock_code: entityUnlockInput.value.trim(),
      locked_hint: entityLockedHintInput.value.trim(),
      archived: !!entityArchivedInput.checked,
      session_links: parseSessionInput(entitySessionsInput.value),
      poi_links: parseMultiSelect(entityPoisInput.value, 'poi'),
      relations: parseMultiSelect(entityLinksInput.value, 'entity')
    };

    const isEdit = !!entityIdInput.value;
    const endpoint = isEdit ? `/api/dm/entities/${entityIdInput.value}` : '/api/dm/entities';
    const method = isEdit ? 'PUT' : 'POST';

    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-dm-secret': state.dmSecret || ''
      },
      body: JSON.stringify(payload)
    });

    if (response.status === 401) {
      handleUnauthorized();
      return;
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      showMessage(error.error || 'Fallo al guardar la entidad.', true);
      return;
    }

    const entity = await response.json();
    state.activeEntityAdmin = entity;
    populateEntityForm(entity);
    await loadEntities();
    showMessage('Dossier guardado.');
    pulseSavedButton();
    resetEntityForm();
  } finally {
    setSavingButton(entitySubmitBtn, false);
  }
}

function findEntityById(id) {
  return state.entities.find((e) => Number(e.id) === Number(id));
}

function findEntityByName(name) {
  if (!name) return null;
  const target = name.trim().toLowerCase();
  return state.entities.find((e) => (e.name || '').toLowerCase() === target) || null;
}

function setActiveEntityAgentById(id) {
  const entity = findEntityById(id);
  if (!entity) return;
  state.activeEntityAgent = entity;
  setAgentBlade('dossiers');
  renderAgentDossiers();
  loadAgentContext(entity.id);
}

async function loadAgentContext(id) {
  try {
    const response = await fetch(`/api/agent/entities/${id}/context`);
    if (!response.ok) return;
    const ctx = await response.json();
    if (ctx.entity && ctx.entity.visibility === 'locked') return;
    const merged = { ...ctx.entity, poi_links: ctx.pois, sessions: ctx.sessions, links: ctx.relations };
    const detailTarget = agentDossierDetail || dossierDetail;
    renderDossierDetailView(detailTarget, merged, { dm: false });
    renderEntityGraph(agentGraphContainer, ctx, { focusId: id });
  } catch (err) {
    logDebug(`Contexto agente error: ${err.message}`);
  }
}

function getEntitiesForPoi(poiId) {
  return state.entities.filter((entity) => {
    if (entity.archived) return false;
    return (entity.poi_links || []).some((link) => Number(link.poi_id) === Number(poiId));
  });
}

function hydrateFromCookies() {
  const storedRole = getCookie('amina_role');
  const storedSecret = storedRole === 'mrtruth' ? getCookie('amina_secret') : null;
  if (storedRole === 'mrtruth' && storedSecret) {
    activateDmMode(storedSecret);
    hideBootScreen();
    showMessage('Acceso de Sr. Verdad restaurado de la sesión anterior.');
    setWorkspaceView('map');
  } else if (storedRole === 'operative') {
    // Forzamos re-selección de agente para evitar bloqueos de login
    showBootScreen();
    deleteCookie('amina_role');
    deleteCookie('amina_agent');
  } else {
    showBootScreen();
  }
  updateRoleLayoutClasses();
}

function setCookie(name, value) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${60 * 60 * 24 * 7}`;
}

function getCookie(name) {
  const cookies = document.cookie.split(';').map((c) => c.trim());
  for (const cookie of cookies) {
    if (cookie.startsWith(`${name}=`)) {
      return decodeURIComponent(cookie.split('=').pop());
    }
  }
  return null;
}

function deleteCookie(name) {
  document.cookie = `${name}=;path=/;max-age=0`;
  document.cookie = `${name}=;path=/;domain=${location.hostname};max-age=0`;
  logDebug(`Deleted cookie ${name}`);
}

function logDebug(message) {
  if (!debugMode) return;
  console.debug('[AMINA DEBUG]', message);
  if (!debugPanel) return;
  const line = document.createElement('div');
  line.textContent = message;
  debugPanel.appendChild(line);
  debugPanel.scrollTop = debugPanel.scrollHeight;
}

async function showInboxView() {
  if (!inboxOverlay || !inboxMessages) return;
  await loadMessages();
  renderInboxCards(state.messages);
  inboxOverlay.classList.remove('hidden');
}

function hideInboxView() {
  inboxOverlay?.classList.add('hidden');
}

function renderInboxCards(messages) {
  if (!inboxMessages) return;
  inboxMessages.innerHTML = '';
  const data = messages.length
    ? messages
    : [
        {
          sender: 'Sr. Verdad',
          recipient: 'Agente de Campo',
          subject: 'No hay despachos',
          body: 'Esperar nuevas instrucciones.',
          created_at: new Date().toISOString()
        }
      ];
  data.forEach((msg) => {
    const card = document.createElement('div');
    card.className = 'inbox-card';
    const line1 = document.createElement('div');
    line1.className = 'line';
    line1.innerHTML = `<span>${sanitize(msg.sender)}</span><span>${new Date(
      msg.created_at || Date.now()
    ).toLocaleTimeString()}</span>`;
    const line2 = document.createElement('div');
    line2.className = 'line';
    line2.innerHTML = `<span>Para: ${sanitize(msg.recipient)}</span><span>${sanitize(msg.subject)}</span>`;
    const body = document.createElement('div');
    body.className = 'body';
    body.textContent = msg.body;
    card.appendChild(line1);
    card.appendChild(line2);
    card.appendChild(body);
    inboxMessages.appendChild(card);
  });
}

function buildTickerText(item) {
  return `${item.id} • ${item.region} • Severidad ${item.severity} • ${item.summary}`;
}

async function initFooterTicker() {
  if (!tickerTrack) return;
  try {
    const response = await fetch('/api/event-ticker');
    if (!response.ok) {
      throw new Error('Fallo en la carga del ticker');
    }
    const payload = await response.json();
    const tickerData = Array.isArray(payload) ? payload : [];
    renderTickerItems(tickerData);
  } catch (err) {
    logDebug('Error de ticker: ' + err.message);
    renderTickerItems([]);
  } finally {
    setTimeout(initFooterTicker, TICKER_REFRESH_INTERVAL);
  }
}

function renderTickerItems(items) {
  if (!tickerTrack) return;
  if (!items.length) {
    tickerTrack.innerHTML = '<span class="ticker-placeholder">Esperando despachos de membrana…</span>';
    tickerDatasetSignature = '';
    tickerSavedOffset = 0;
    return;
  }
  tickerTrack.innerHTML = '';
  const normalized = items;
  const signature = normalized.map((item) => item.id).join('|');
  const savedState = loadTickerState();
  let startFraction = 0;
  if (savedState && savedState.signature === signature && typeof savedState.fraction === 'number') {
    startFraction = savedState.fraction;
  } else {
    startFraction = Math.random();
  }
  const clones = [...normalized, ...normalized];
  const duration = Math.max(100, clones.length * 6);
  tickerSavedOffset = startFraction;
  tickerDatasetSignature = signature;
  tickerAnimationDuration = duration * 1000;
  tickerAnimationStart = Date.now();

  clones.forEach((item) => {
    const span = document.createElement('span');
    span.textContent = buildTickerText(item);
    tickerTrack.appendChild(span);
  });
  tickerTrack.style.animation = 'none';
  tickerTrack.style.setProperty('--ticker-duration', `${duration}s`);
  requestAnimationFrame(() => {
    tickerTrack.style.animation = `ticker-scroll var(--ticker-duration, 40s) linear infinite`;
    tickerTrack.style.animationDelay = `-${startFraction * duration}s`;
  });
  persistTickerState(startFraction, signature);
}

function initFooterMembrane() {
  if (!footerMembraneStatus) return;
  footerMembraneStatus.textContent = MEMBRANE_STATUS_TEXT;
}

function updateFooterTime() {
  if (!footerTime) return;
  const options = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'America/New_York'
  };
  footerTime.textContent = `HORA PA ${new Intl.DateTimeFormat('en-US', options).format(new Date())}`;
}

function startFooterClock() {
  updateFooterTime();
  setInterval(updateFooterTime, FOOTER_CLOCK_INTERVAL);
}

function toggleSidebar() {
  if (!sidebarPanel) return;
  const isClosed = sidebarPanel.classList.toggle('closed');
  const expanded = !isClosed;
  panelToggleBtn?.setAttribute('aria-expanded', String(expanded));
  panelToggleBtn?.classList.toggle('sidebar-closed', isClosed);
  appLayout?.classList.toggle('sidebar-collapsed', isClosed);
  radarRow?.classList.toggle('sidebar-collapsed', isClosed);
  scheduleMapResize();
}

function loadTickerState() {
  try {
    const raw = localStorage.getItem(TICKER_STATE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

function persistTickerState(fraction, signature) {
  try {
    localStorage.setItem(TICKER_STATE_KEY, JSON.stringify({ fraction, signature }));
  } catch (err) {
    // ignore storage errors
  }
}

function saveTickerProgress() {
  if (!tickerAnimationDuration || !tickerDatasetSignature) return;
  const now = Date.now();
  const elapsed = now - tickerAnimationStart;
  if (elapsed < 0) return;
  const loopFraction = tickerAnimationDuration ? (elapsed % tickerAnimationDuration) / tickerAnimationDuration : 0;
  const currentFraction = (tickerSavedOffset + loopFraction) % 1;
  persistTickerState(currentFraction, tickerDatasetSignature);
}

init();
