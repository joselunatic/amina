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
  journalSeason: 2,
  journalSession: 0,
  activeDmBlade: 'journal',
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
  },
  entityEditorMode: 'new',
  lastAgentGraphic: { type: null, id: null }
};

// Expose state for debugging and tests that inspect map centers
window.state = state;

const mapCenter = [-76.229, 40.68];
const BESTIARY_FALLBACK_IMAGE = '/creature.png';
const HERO_FALLBACK_IMAGE = '/noimage.png';
const DECIMAL_STYLE = 'mapbox://styles/mapbox-map-design/ck4014y110wt61ctt07egsel6';
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
const logoutButton = document.getElementById('logout-button');
const mobileNav = document.getElementById('mobile-nav');
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
const messageList = document.getElementById('message-list');
const messageReader = document.getElementById('message-reader');
const messageListDm = document.getElementById('message-list-dm');
const messageReaderDm = document.getElementById('message-reader-dm');
const missionBriefText = document.getElementById('mission-brief-text');
const journalPublicInput = document.getElementById('journal-public');
const journalDmInput = document.getElementById('journal-dm');
const journalSeasonInput = document.getElementById('journal-season');
const journalSessionInput = document.getElementById('journal-session');
const journalSaveBtn = document.getElementById('journal-save');
const dmFormOpenBtn = document.getElementById('dm-form-open');
const msgPrevBtn = document.getElementById('msg-prev');
const msgNextBtn = document.getElementById('msg-next');
const msgBoxInboxBtn = document.getElementById('msg-box-inbox');
const msgBoxSentBtn = document.getElementById('msg-box-sent');
const unreadOnlyCheckbox = document.getElementById('filter-unread-only');
const msgBoxToggleBtn = document.getElementById('msg-box-toggle'); // legacy button (may not exist)
const msgReplyBtn = document.getElementById('msg-reply'); // legacy button (may not exist)
const replyPane = document.getElementById('mailbox-reply');
const replyBodyInput = document.getElementById('reply-body');
const replyCancelBtn = document.getElementById('reply-cancel');
const replySendBtn = document.getElementById('reply-send');
const replyLabel = document.getElementById('reply-label');
const msgBoxLabel = document.getElementById('msg-box-label');
const radarRow = document.getElementById('radar-row');
const replyPaneDm = document.getElementById('mailbox-reply-dm');
const replyBodyInputDm = document.getElementById('reply-body-dm');
const replyCancelBtnDm = document.getElementById('reply-cancel-dm');
const replySendBtnDm = document.getElementById('reply-send-dm');
const replyLabelDm = document.getElementById('reply-label-dm');
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
const entityPoisInput = document.getElementById('entity-pois');
const entityLinksInput = document.getElementById('entity-links');
const entityResetBtn = document.getElementById('entity-reset');
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
const entityNewBtn = document.getElementById('entity-new');
const entityCancelBtn = document.getElementById('entity-cancel');
const entitySubmitBtn = document.getElementById('entity-submit');
const entityDeleteBtns = document.querySelectorAll('#entity-delete'); // buttons in layout
const entityStateTitle = document.getElementById('entity-state-title');
const bestiaryCard = document.getElementById('dm-bestiary-card');
const bestiaryImage = document.getElementById('bestiary-image');
const bestiaryCode = document.getElementById('bestiary-code');
const bestiaryCallsign = document.getElementById('bestiary-callsign');
const bestiaryClassification = document.getElementById('bestiary-classification');
const bestiaryThreat = document.getElementById('bestiary-threat');
const bestiaryStatus = document.getElementById('bestiary-status');
const bestiaryAlignment = document.getElementById('bestiary-alignment');
const bestiarySummary = document.getElementById('bestiary-summary');
const bestiaryBehaviour = document.getElementById('bestiary-behaviour');
const bestiaryOrigin = document.getElementById('bestiary-origin');
const bestiaryProtocols = document.getElementById('bestiary-protocols');
const agentBestiaryCard = document.getElementById('agent-bestiary-card');
const entityDeleteOverlay = document.getElementById('entity-delete-overlay');
const entityDeleteMessage = document.getElementById('entity-delete-message');
const entityDeleteCloseBtn = document.getElementById('entity-delete-close');
const exampleCreature = {
  code_name: 'La Sierpe Brumosa',
  type: 'org',
  status: 'CONTENIDA',
  threat_level: 5,
  image_url: '/creature.png',
  alignment: 'ordo_veritatis',
  public_summary:
    'Entidades de vapor ígneo que se extienden por los canales subterráneos del condado. Irrita lentes infrarrojos.',
  dm_notes: 'Se mantiene en la red colapsada de minas. Contener con proyectiles sónicos y spray de humo ámbar.',
  protocols: ['Lanzar redes de alambre vibrante', 'Mantener luz UV constante', 'Evitar el contacto visual prolongado'],
  origin: 'Informe OV-ESK-017: Registro de sensores en túnel abandonado.',
  behaviour: 'Se desliza a ras de suelo y desata vibraciones que saturan sensores de proximidad.'
};
const dossierTypeButtons = document.querySelectorAll('#dossier-card .dossier-type');
const dossierTypeButtonsAdmin = document.querySelectorAll('.console-blade[data-blade-panel="dossiers"] .dossier-type');
const dmFilterTypeButtons = document.querySelectorAll('.dm-filter-type');
const dmEntityList = document.getElementById('dm-entity-list');
const dmEntitySearch = document.getElementById('dm-entity-search');
const dmEntitiesContext = document.getElementById('dm-entities-context');
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
const entityDeleteConfirmBtn = document.getElementById('entity-delete-confirm');
const entityDeleteCancelBtn = document.getElementById('entity-delete-cancel');

const formIds = {
  id: entityIdInput,
  name: entityCodeNameInput,
  latitude: document.getElementById('poi-latitude'),
  longitude: document.getElementById('poi-longitude'),
  imageUrl: entityImageInput,
  threat: entityThreatInput,
  veil: document.getElementById('poi-veil'),
  session: document.getElementById('poi-session'),
  publicNote: entityPublicNoteInput,
  dmNote: entityDmNoteInput
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
  try {
    console.log('DEBUG: init started');
    populateCategoryOptions();
    bindEvents();
    enterNewEntityMode();
    renderFocalPoiCard();
    renderActiveMessageCard();
    updateRoleLayoutClasses();
    setDmBlade('journal');
    setWorkspaceView('map');
    setMobileTab('map');
    loadMissionNotes();
    loadJournalDm();
    // collapse POI list by default
    const defaultPoiToggle = document.querySelector('.poi-list-section .collapsible-toggle');
    const defaultPoiBody = document.querySelector('.poi-list-section .collapsible-body');
    if (defaultPoiToggle && defaultPoiBody && !defaultPoiBody.classList.contains('collapsed')) {
      toggleCollapsible(defaultPoiToggle);
    }
    updateViewportMode();
    await setupMap();
    console.log('DEBUG: setupMap done');
    await loadPois();
    showMessage('AMINA en línea. Vigilancia de la membrana nominal.');
    await loadAgentList();
    console.log('DEBUG: loadAgentList done');
    hydrateFromCookies();
    if (bootScreen && !bootScreen.classList.contains('hidden') && !bootOutput.textContent) {
      startBootSequence();
    }
    applyAgentStatus();
    await loadEntities();
    updateMessageBoxLabel();
    initFooterTicker();
  initFooterMembrane();
  startFooterClock();
  window.addEventListener('beforeunload', saveTickerProgress);
  window.addEventListener('resize', () => {
    updateViewportMode();
      if (state.workspaceView === 'map' && state.map && isMobileView()) {
        scheduleMapResize();
      }
    });
  } catch (e) {
    console.error('DEBUG: init failed', e);
  }
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
  if (msgBoxToggleBtn) {
    msgBoxToggleBtn.addEventListener('click', toggleMessageBoxView);
  }
  msgReplyBtn?.addEventListener('click', () => {
    if (!state.activeMessage) return;
    startReply(state.activeMessage);
  });
  replyCancelBtn?.addEventListener('click', cancelReply);
  replyCancelBtnDm?.addEventListener('click', cancelReply);
  replySendBtn?.addEventListener('click', submitReply);
  replySendBtnDm?.addEventListener('click', submitReply);
  if (inboxCloseBtn) {
    inboxCloseBtn.addEventListener('click', hideInboxView);
  }
  panelToggleBtn?.addEventListener('click', () => toggleSidebar());
  if (journalSaveBtn) {
    journalSaveBtn.addEventListener('click', handleJournalSave);
  }
  journalSeasonInput?.addEventListener('change', loadJournalEntry);
  journalSessionInput?.addEventListener('change', loadJournalEntry);
  if (msgBoxInboxBtn) {
    msgBoxInboxBtn.addEventListener('click', () => {
      state.messageFilters.box = '';
      state.activeMessageIndex = 0;
      updateMessageBoxLabel();
      loadMessages();
    });
  }
  if (msgBoxSentBtn) {
    msgBoxSentBtn.addEventListener('click', () => {
      state.messageFilters.box = 'sent';
      state.activeMessageIndex = 0;
      updateMessageBoxLabel();
      loadMessages();
    });
  }
  if (unreadOnlyCheckbox) {
    unreadOnlyCheckbox.addEventListener('change', () => {
      state.messageFilters.unread_only = unreadOnlyCheckbox.checked;
      state.activeMessageIndex = 0;
      loadMessages();
    });
  }
  agentLoginButton.addEventListener('click', handleAgentLogin);
  agentPassInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAgentLogin();
    }
  });
  logoutButton?.addEventListener('click', () => {
    showBootScreen();
  });
  if (mobileNav) {
    mobileNav.addEventListener('click', (event) => {
      const target = event.target.closest('[data-mobile-tab]');
      if (!target) return;
      const tab = target.getAttribute('data-mobile-tab');
      if (tab) setMobileTab(tab);
    });
  }

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

  entityNewBtn?.addEventListener('click', enterNewEntityMode);
  if (entityForm) {
    entityForm.addEventListener('submit', handleEntitySubmit);
  }
  entityResetBtn?.addEventListener('click', enterNewEntityMode);
  entityCancelBtn?.addEventListener('click', enterNewEntityMode);
  // delegate delete buttons (there are duplicates in layout)
  document.addEventListener('click', (event) => {
    const deleteBtn = event.target.closest('#entity-delete');
    if (deleteBtn) {
      event.preventDefault();
      const idAttr = deleteBtn.dataset ? deleteBtn.dataset.entityId : null;
      let entity = state.activeEntityAdmin;
      if (idAttr) {
        const byId = state.entities.find((e) => Number(e.id) === Number(idAttr));
        if (byId) entity = byId;
      }
      console.log('DEBUG delete click', { idAttr, entityId: entity ? entity.id : null });
      openEntityDeleteOverlay(entity);
    }
  });
  entityDeleteConfirmBtn?.addEventListener('click', handleEntityDelete);
  entityDeleteCancelBtn?.addEventListener('click', closeEntityDeleteOverlay);
  entityDeleteCloseBtn?.addEventListener('click', closeEntityDeleteOverlay);
  entityDeleteOverlay?.addEventListener('click', (event) => {
    if (event.target === entityDeleteOverlay) {
      closeEntityDeleteOverlay();
    }
  });
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

  // Ensure boot animation runs on first load when boot screen is visible.
  if (bootScreen && !bootScreen.classList.contains('hidden')) {
    startBootSequence();
  }
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
  console.log('DEBUG: setupMap started');
  const config = await fetch('/api/config').then((res) => res.json());
  console.log('DEBUG: config loaded', config);
  state.mapboxConfig = config;
  mapboxgl.accessToken = config.mapboxToken;
  debugMode = config.debug;
  if (debugMode && debugPanel) {
    debugPanel.classList.remove('hidden');
    logDebug('Modo depuración activo');
  }
  const baseStyle = config.mapStyle || 'mapbox://styles/mapbox/dark-v11';
  const styleUrl = DECIMAL_STYLE;
  state.currentMapStyle = styleUrl;
  const mapPanelEl = document.getElementById('map-panel');
  state.map = new mapboxgl.Map({
    container: 'map',
    style: styleUrl,
    center: mapCenter,
    zoom: 9,
    pitch: 55,
    bearing: -17.6,
    antialias: true
  });

  bindStyleSwitcher(baseStyle);

  state.map.addControl(new mapboxgl.NavigationControl());
  state.map.addControl(new mapboxgl.FullscreenControl({ container: mapPanelEl || undefined }));
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
  bindPickHandler(state.map);
  state.map.on('style.load', () => {
    update3DBuildings();
  });
}

function update3DBuildings() {
  if (!state.map) return;
  const style = state.map.getStyle();
  if (!style || !style.layers) return;
  if (state.map.getLayer('3d-buildings')) {
    state.map.removeLayer('3d-buildings');
  }
  if (state.currentMapStyle !== DECIMAL_STYLE) return;
  const labelLayer = style.layers.find((layer) => layer.type === 'symbol' && layer.layout && layer.layout['text-field']);
  const labelLayerId = labelLayer ? labelLayer.id : undefined;
  state.map.addLayer(
    {
      id: '3d-buildings',
      source: 'composite',
      'source-layer': 'building',
      filter: ['==', ['get', 'extrude'], 'true'],
      type: 'fill-extrusion',
      minzoom: 15,
      paint: {
        'fill-extrusion-color': '#00ff88',
        'fill-extrusion-height': ['get', 'height'],
        'fill-extrusion-base': ['get', 'min_height'],
        'fill-extrusion-opacity': 0.9
      }
    },
    labelLayerId
  );
}

function bindStyleSwitcher(defaultStyle) {
  const switcher = document.querySelector('.map-style-switch');
  if (!switcher || !state.map) return;
  // replace placeholder with real default style
  switcher.querySelectorAll('button[data-style="config-default"]').forEach((btn) => {
    btn.dataset.style = defaultStyle;
  });
  const setActive = (style) => {
    switcher.querySelectorAll('button[data-style]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.style === style);
    });
  };
  setActive(state.currentMapStyle);
  switcher.addEventListener('click', (event) => {
    const btn = event.target.closest('button[data-style]');
    if (!btn) return;
    const style = btn.dataset.style;
    if (!style) return;
    const prevStyle = state.currentMapStyle || defaultStyle;
    let reverted = false;
    const timeout = setTimeout(() => {
      if (reverted) return;
      reverted = true;
      showMessage('No se pudo cargar el estilo seleccionado (timeout).', true);
      state.map.setStyle(prevStyle);
      setActive(prevStyle);
    }, 2000);
    const onError = () => {
      if (reverted) return;
      reverted = true;
      clearTimeout(timeout);
      state.map.off('style.load', onLoad);
      state.map.off('error', onError);
      showMessage('No se pudo cargar el estilo seleccionado.', true);
      state.map.setStyle(prevStyle);
      setActive(prevStyle);
    };
    const onLoad = () => {
      if (reverted) return;
      clearTimeout(timeout);
      state.map.off('error', onError);
      state.currentMapStyle = style;
      update3DBuildings();
      setActive(style);
      renderMarkers();
      if (state.poiFocal) focusMapOnPois();
    };
    state.map.once('error', onError);
    state.map.once('style.load', onLoad);
    state.map.setStyle(style);
    if (state.entitiesMap) {
      try {
        state.entitiesMap.setStyle(style);
      } catch (_) {
        /* ignore */
      }
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
  renderPoiListInto(poiList, { items: filtered });
  if (poiListDm) {
    renderPoiListInto(poiListDm, { items: filtered });
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
  if (entityStateTitle) {
    entityStateTitle.textContent = isPoi ? 'Amenaza y Velo' : 'Estado y afinidad';
  }
  if (state.entityEditorMode === 'new' && !state.activeEntityAdmin) {
    renderDmEntityDetailCard(null);
  }
  if (isPoi) {
    if (formIds.threat && !formIds.threat.value) formIds.threat.value = '1';
    if (formIds.veil && !formIds.veil.value) formIds.veil.value = 'intact';
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
  summary.addEventListener('click', () => {
    setFocalPoi(poi);
    if (isMobileView()) {
      setMobileTab('pois');
    }
  });
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
  if (!entitySubmitBtn) return;
  setSavingButton(entitySubmitBtn, true, 'Guardando…');
  const threatValue = (formIds.threat || entityThreatInput)?.value || '1';
  const veilValue = (formIds.veil && formIds.veil.value) || 'intact';
  const errors = [];
  const latNum = Number(formIds.latitude?.value);
  const lonNum = Number(formIds.longitude?.value);
  const threatNum = Number(threatValue);
  const allowedVeil = ['intact', 'frayed', 'torn'];

  if (!poiCategorySelect.value) errors.push('Elige una categoría para el PdI.');
  if (!Number.isFinite(latNum) || latNum < -90 || latNum > 90) errors.push('Latitud inválida.');
  if (!Number.isFinite(lonNum) || lonNum < -180 || lonNum > 180) errors.push('Longitud inválida.');
  if (!Number.isInteger(threatNum) || threatNum < 1 || threatNum > 5) errors.push('Amenaza debe ser 1-5.');
  if (!allowedVeil.includes(veilValue)) errors.push('Estado del velo inválido.');

  if (errors.length) {
    showMessage(errors.join(' '), true);
    setSavingButton(entitySubmitBtn, false);
    return;
  }

  const payload = {
    name: entityCodeNameInput.value.trim(),
    category: poiCategorySelect.value,
    latitude: latNum,
    longitude: lonNum,
    image_url: (formIds.imageUrl || entityImageInput)?.value?.trim() || '',
    threat_level: threatNum,
    veil_status: veilValue,
    session_tag: formIds.session ? formIds.session.value.trim() : '',
    public_note: (formIds.publicNote || entityPublicNoteInput)?.value?.trim() || '',
    dm_note: (formIds.dmNote || entityDmNoteInput)?.value?.trim() || ''
  };

  const isEdit = !!entityIdInput.value;
  const endpoint = isEdit ? `/api/pois/${entityIdInput.value}` : '/api/pois';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    console.debug('[DM] Guardando PdI', payload);
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
      console.error('[DM] Error API guardando PdI', error);
      showMessage(error.error || 'Fallo al guardar el PdI.', true);
      return;
    }

    const saved = await response.json();
    console.debug('[DM] PdI guardado OK', saved);
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
  } catch (err) {
    logDebug(`Error guardando PdI: ${err.message}`);
    console.error('[DM] Error guardando PdI', err);
    showMessage('No se pudo guardar el PdI.', true);
  } finally {
    setSavingButton(entitySubmitBtn, false);
  }
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
  if (!bootOutput || !bootMenu) {
    console.error('Boot elements not found');
    return;
  }
  bootSequenceId += 1;
  const runId = bootSequenceId;
  bootOutput.textContent = '';
  bootMenu.classList.add('boot-menu--animating');
  bootDmForm.classList.remove('visible');
  try {
    for (const line of bootLines) {
      await typeLine(line, runId);
      if (runId !== bootSequenceId) return;
      bootOutput.textContent += '\n';
    }
    bootOutput.textContent += '\n>> Esperando selección de autorización...\n';
  } catch (err) {
    console.error('Error in boot sequence:', err);
    logDebug('Error en secuencia de arranque: ' + err.message);
    bootOutput.textContent += '\n>> Error en secuencia. Esperando input...\n';
  } finally {
    console.log('Boot sequence finished');
    bootMenu.classList.remove('boot-menu--animating');
    bootMenu.classList.remove('hidden');
  }
}

async function loadMessages() {
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

function filterMessagesForViewer(messages, viewer, box) {
  if (!Array.isArray(messages)) return [];
  if (state.dmMode) return messages;
  const trimmedViewer = (viewer || '').trim();
  if (!trimmedViewer) return messages;
  const preferredPublic = new Set([
    'All agents',
    'all agents',
    'Todos los agentes',
    'todos los agentes'
  ]);
  return messages.filter((msg) => {
    const recipient = (msg.recipient || '').trim();
    if (box === 'sent') {
      return (msg.created_by || '').trim() === trimmedViewer;
    }
    if (recipient === trimmedViewer) return true;
    if (preferredPublic.has(recipient)) return true;
    return false;
  });
}

function renderMessages(messages) {
  const viewer = state.dmMode ? 'Sr. Verdad' : state.agent?.display || '';
  const filtered = filterMessagesForViewer(messages, viewer, state.messageFilters.box);
  state.messages = filtered;
  state.activeMessageIndex = Math.min(
    state.activeMessageIndex,
    Math.max(filtered.length - 1, 0)
  );
  updateMessageList(messageList, filtered, viewer);
  updateMessageList(messageListDm, filtered, viewer);
  state.activeMessage = filtered[state.activeMessageIndex] || null;
  renderActiveMessageCard();
  updateMessageBoxLabel();
}

function updateMessageList(container, messages, viewer) {
  if (!container) return;
  container.innerHTML = '';
  if (!messages.length) {
    const empty = document.createElement('div');
    empty.className = 'message-list-item';
    empty.textContent = 'No hay despachos disponibles.';
    container.appendChild(empty);
    return;
  }
  messages.forEach((msg, idx) => {
    const isRead = viewer ? Array.isArray(msg.read_by) && msg.read_by.includes(viewer) : true;
    const item = document.createElement('div');
    item.className = `message-list-item ${state.activeMessageIndex === idx ? 'active' : ''}`;
    item.innerHTML = `
      <div class="subject">${sanitize(msg.subject || '(Sin asunto)')}</div>
      <div class="meta">
        <span>${sanitize(msg.sender)}</span>
        <span>${new Date(msg.created_at).toLocaleString()}</span>
        <span>${sanitize(msg.recipient)}</span>
        ${!isRead ? '<span class="badge-unread">No leído</span>' : ''}
      </div>
    `;
    item.addEventListener('click', () => {
      state.activeMessageIndex = idx;
      state.activeMessage = msg;
      renderMessages(messages);
    });
    container.appendChild(item);
  });
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

async function deleteMessageForViewer(id, viewer, box) {
  try {
    await fetch(`/api/messages/${id}/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ viewer, box })
    });
    await loadMessages();
  } catch (err) {
    logDebug(`Delete message failed: ${err.message}`);
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
  updateMessageBoxLabel();
  loadMessages();
}

function updateMessageBoxLabel() {
  if (!msgBoxLabel) return;
  msgBoxLabel.textContent = state.messageFilters.box === 'sent' ? 'Enviados' : 'Entrada';
  if (msgBoxInboxBtn && msgBoxSentBtn) {
    msgBoxInboxBtn.classList.toggle('active', state.messageFilters.box !== 'sent');
    msgBoxSentBtn.classList.toggle('active', state.messageFilters.box === 'sent');
  }
}

function startReply(message) {
  const { pane, body, label } = getReplyElements();
  if (!pane || !body) return;
  state.replyTarget = message;
  pane.classList.remove('hidden');
  if (label) {
    label.textContent = `Respondiendo a ${message.sender}`;
  }
  body.value = `\n\n---\n${message.body}`;
  body.focus();
}

function cancelReply() {
  [replyPane, replyPaneDm].forEach((pane) => pane?.classList.add('hidden'));
  [replyBodyInput, replyBodyInputDm].forEach((input) => {
    if (input) input.value = '';
  });
  state.replyTarget = null;
}

async function submitReply() {
  const { body } = getReplyElements();
  if (!state.replyTarget || !body) return;
  const text = body.value.trim();
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

function getReplyElements() {
  if (state.dmMode && replyPaneDm && replyBodyInputDm) {
    return { pane: replyPaneDm, body: replyBodyInputDm, label: replyLabelDm };
  }
  return { pane: replyPane, body: replyBodyInput, label: replyLabel };
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
    if (state.entityEditorMode === 'edit' && state.activeEntityAdmin) {
      const found = state.entities.find((e) => e.id === state.activeEntityAdmin.id);
      if (found) {
        state.activeEntityAdmin = { ...found, kind: 'entity' };
        populateEntityForm(state.activeEntityAdmin);
      } else {
        enterNewEntityMode();
      }
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
      { name: 'code_name', weight: 0.3 },
      { name: 'name', weight: 0.2 },
      { name: 'real_name', weight: 0.1 },
      { name: 'role', weight: 0.15 },
      { name: 'status', weight: 0.1 },
      { name: 'alignment', weight: 0.05 },
      { name: 'public_summary', weight: 0.05 },
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
    veil_status: poi.veil_status,
    threat_level: poi.threat_level,
    image_url: poi.image_url,
    sessions: poi.session_tag || '',
    public_summary: poi.public_note || '',
    dm_notes: poi.dm_notes || poi.dm_note || '',
    dm_note: poi.dm_notes || poi.dm_note || '',
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
    setCookie('agent_active_entity', state.activeEntityAgent.id);
  }

  const compactList = isMobileView() && state.mobileTab === 'database';
  entities.forEach((entity) => {
    const card = buildDossierCard(
      entity,
      false,
      state.activeEntityAgent && state.activeEntityAgent.id === entity.id,
      compactList
    );
    card.addEventListener('click', () => {
      state.activeEntityAgent = entity;
      setCookie('agent_active_entity', entity.id);
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
    renderDmEntityDetailCard(null);
    return;
  }

  items.forEach((entity) => {
    const active =
      state.entityEditorMode === 'edit' &&
      state.activeEntityAdmin &&
      state.activeEntityAdmin.id === entity.id;
    const card = buildDossierCard(entity, true, active);
    card.addEventListener('click', () => {
      selectAdminEntity(entity);
    });
    dmEntityList.appendChild(card);
  });

  if (state.entityEditorMode === 'edit' && state.activeEntityAdmin) {
    renderDossierDetailView(dmEntitiesContext, state.activeEntityAdmin, { dm: true });
    renderDmEntityDetailCard(state.activeEntityAdmin, state.activeEntityContext);
  } else {
    renderDmEntityDetailCard(null);
  }
}

function buildDossierCard(entity, dmView = false, active = false, compact = false) {
  const card = document.createElement('div');
  const locked = entity.visibility === 'locked' && !dmView;
  card.className = `dossier-card-row ${active ? 'active' : ''} ${locked ? 'locked' : ''}`;
  const badge = `<span class="badge">${getEntityTypeLabel(entity.type)}</span>`;
  const role = entity.type === 'poi' ? categoryLabels[entity.category] || entity.role : entity.role;
  if (locked) {
    card.innerHTML = `
      <div class="dossier-row-header">${badge} <strong>${sanitize(entity.code_name || entity.name)}</strong></div>
      <div class="dossier-row-note">LOCKED — requiere clave</div>
    `;
  } else {
    const roleLine = sanitize(role || 'Sin rol');
    card.innerHTML = `
      <div class="dossier-row-header">${badge} <strong>${sanitize(entity.code_name || entity.name)}</strong></div>
      <div class="dossier-row-meta">${roleLine}</div>
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
  if (type === 'criatura') return 'Criatura';
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

function ensureBuildingsLayer(map) {
  if (!map || !map.getStyle()) return;
  const addLayer = () => {
    if (map.getLayer('3d-buildings') || !map.getSource('composite')) return;
    const labelLayerId = map.getStyle().layers.find((l) => l.type === 'symbol' && l.layout && l.layout['text-field'])?.id;
    map.addLayer(
      {
        id: '3d-buildings',
        source: 'composite',
        'source-layer': 'building',
        filter: ['==', 'extrude', 'true'],
        type: 'fill-extrusion',
        minzoom: 13,
        paint: {
          'fill-extrusion-color': '#8fd7ff',
          'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'height']],
          'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 15, 0, 15.05, ['get', 'min_height']],
          'fill-extrusion-opacity': 0.6
        }
      },
      labelLayerId || undefined
    );
  };
  if (map.isStyleLoaded()) {
    addLayer();
  } else {
    map.once('styledata', addLayer);
  }
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
    const showMap = view === 'map';
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
  if (isMobileView()) {
    document.body?.classList.toggle('map-view', view === 'map');
  } else {
    document.body?.classList.remove('map-view');
  }
  if (view === 'map' && isMobileView()) {
    scheduleMapResize();
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
  const poiLinks = (ctx.pois || [])
    .map(
      (p) => `<div class="dossier-related"><span class="badge">PdI</span>${sanitize(p.name)}${p.session_tag ? ` <span class="badge-soft">${sanitize(p.session_tag)}</span>` : ''
        }${p.role_at_poi ? ` <span class="badge-soft">${sanitize(p.role_at_poi)}</span>` : ''}</div>`
    )
    .join('');
  const relations = (ctx.relations || [])
    .map(
      (r) => `<div class="dossier-related"><span class="badge">${sanitize(
        r.relation_type || 'Vínculo'
      )}</span>${sanitize(r.to_code_name || r.to_real_name || r.to_entity_id)}</div>`
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

function renderEntitiesMap(ctx, options = {}) {
  const containerId = options.containerId || 'dm-entity-detail-map';
  const mapKey = options.mapKey || 'entitiesMap';
  const markersKey = options.markersKey || 'entityMarkers';
  const target = document.getElementById(containerId);
  const reuse = !!options.reuse;
  const flyTo = !!options.flyTo;
  if (!target) return;

  const hadMap = !!state[mapKey];
  const existingContainer = state[mapKey]?.getContainer?.();
  if (reuse && existingContainer && existingContainer.id !== containerId) {
    state[mapKey].remove();
    state[mapKey] = null;
  }
  if (state[mapKey] && !reuse) {
    state[mapKey].remove();
    state[mapKey] = null;
    state[markersKey] = [];
  }

  if (!state[mapKey]) {
    state[mapKey] = new mapboxgl.Map({
      container: target,
      style: DECIMAL_STYLE,
      center: mapCenter,
      zoom: 14,
      pitch: 60,
      bearing: -17.6,
      antialias: true
    });
    state[mapKey].addControl(new mapboxgl.NavigationControl());
    state[mapKey].on('style.load', () => ensureBuildingsLayer(state[mapKey]));
  }
  const map = state[mapKey];
  bindPickHandler(map);

  const apply = () => {
    if (!ctx || !ctx.pois || !ctx.pois.length) {
      map.setCenter(mapCenter);
      map.setZoom(9);
      return;
    }
    ensureBuildingsLayer(map);
    if (!state[markersKey]) state[markersKey] = [];
    state[markersKey].forEach((m) => m.remove());
    state[markersKey] = [];
    const bounds = new mapboxgl.LngLatBounds();
    const coords = [];
    ctx.pois.forEach((p) => {
      const lon = Number(p.poi_longitude ?? p.longitude);
      const lat = Number(p.poi_latitude ?? p.latitude);
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) return;
      const el = document.createElement('div');
      const isAgentPoi = options.variant === 'agent';
      if (isAgentPoi) {
        el.className = 'agent-poi-marker';
      } else {
        el.className = 'marker-dot';
        el.textContent = categoryIcons[p.category] || '⬤';
      }
      const marker = new mapboxgl.Marker({
        element: el,
        anchor: 'center',
        pitchAlignment: 'map',
        rotationAlignment: 'map'
      })
        .setLngLat([lon, lat])
        .addTo(map);
      state[markersKey].push(marker);
      bounds.extend([lon, lat]);
      coords.push([lon, lat]);
    });
    if (coords.length) {
      const singleZoom = options.singleZoom || 12.5;
      const cameraOptions = { padding: 40, maxZoom: singleZoom };
      const single = coords.length === 1 ? coords[0] : null;
      if (single) {
        const camera = { center: single, zoom: singleZoom };
        if (reuse && flyTo && hadMap) {
          map.easeTo({ ...camera, duration: 900 });
          setTimeout(() => map.jumpTo(camera), 950);
        } else {
          map.jumpTo(camera);
        }
      } else {
        map.fitBounds(bounds, { ...cameraOptions, duration: reuse && flyTo && hadMap ? 1200 : 0 });
      }
    }
    map.resize();
  };

  if (map.loaded()) {
    apply();
  } else {
    map.once('load', apply);
  }
}

function renderDmEntityDetailCard(entity, ctx = {}) {
  const detail = document.getElementById('dm-entity-detail-card');
  const hero = document.getElementById('dm-entity-hero-card');
  const bestiaryRoot = document.getElementById('dm-bestiary-card');
  const stateSectionTitle = document.getElementById('entity-state-title'); // estado/afinidad label
  if (!detail || !hero) return;
  const isPoi = entity && (entity.kind === 'poi' || entity.type === 'poi');
  const isCreature = entity && entity.type === 'criatura';
  const hasEntity = !!entity;
  const wantsNewPoiPreview =
    !hasEntity &&
    state.entityEditorMode === 'new' &&
    (entityTypeInput?.value === 'poi' || entityKindInput?.value === 'poi');
  hero.classList.remove('hidden');
  hero.classList.remove('map-only');

  // reset map when switching away from PdI
  if (!isPoi && state.entitiesMap) {
    state.entitiesMap.remove();
    state.entitiesMap = null;
    state.entityMarkers = [];
  }

  if (!hasEntity) {
    if (wantsNewPoiPreview) {
      detail.innerHTML =
        '<div class="card-title">Nuevo PdI</div><div class="muted">Usa el mapa de la izquierda para centrar Schuylkill y el botón “Elegir del mapa”.</div>';
      hero.classList.add('map-only');
      hero.innerHTML = `
        <div class="dm-entity-map-standalone">
          <div id="dm-entity-detail-map" class="dm-entities-map" aria-label="Mapa de nuevo PdI"></div>
        </div>
      `;
      const seedCtx = { pois: [{ poi_longitude: mapCenter[0], poi_latitude: mapCenter[1] }] };
      renderEntitiesMap(seedCtx);
    } else {
      detail.innerHTML =
        '<div class="card-title">Detalle de entidad</div><div class="muted">Selecciona un dossier en la lista de la izquierda. Podrás editarlo en el panel inferior y, si es un PdI, verlo en el mapa.</div>';
      hero.classList.remove('map-only');
      hero.innerHTML = '<div class="dm-entity-hero-body muted">Sin imagen disponible. Al elegir un dossier se mostrará aquí su foto o el plano.</div>';
    }
    if (bestiaryRoot) {
      bestiaryRoot.classList.add('hidden');
      bestiaryRoot.classList.remove('bestiary-promoted');
    }
    renderBestiary(null);
    return;
  }

  if (stateSectionTitle) {
    stateSectionTitle.textContent = isPoi ? 'Amenaza y Velo' : 'Estado y afinidad';
  }

  const summary = sanitize(entity.public_summary || entity.public_note || 'Sin notas públicas');
  const dmNotes = isDmViewer() ? sanitize(entity.dm_note || entity.private_note || '—') : '';
  const callsign = sanitize(entity.code_name || entity.name || '');
  const role = sanitize(entity.role || 'Sin rol');
  const realName = sanitize(entity.real_name || '');
  const threat = sanitize(entity.threat_level || entity.threat || '—');
  const status = sanitize(entity.status || 'estado?');
  const alignment = sanitize(entity.alignment || 'afinidad?');
  const categoryLabel = sanitize(categoryLabels[entity.category] || entity.category || 'PdI');
  const sessionTag = sanitize(entity.session_tag || entity.sessions || '');
  const badgeRow = `
    <span class="badge">${status}</span>
    <span class="badge">${alignment}</span>
    ${entity.visibility === 'locked' ? '<span class="badge-soft">Bloqueada</span>' : ''}
  `;

  if (isPoi) {
    detail.innerHTML = `
      <div class="card-title">PdI</div>
      <div class="dm-detail-grid">
        <div class="dm-detail-box wide">
          <div class="dm-detail-label">Callsign</div>
          <div class="dm-detail-value">${callsign || 'Sin callsign'}</div>
          <div class="dm-detail-label">Categoría</div>
          <div class="dm-detail-value">${categoryLabel}</div>
        </div>
        <div class="dm-detail-box medium">
          <div class="dm-detail-label">Amenaza</div>
          <div class="dm-detail-value">${threat}</div>
          <div class="dm-detail-label">Velo</div>
          <div class="dm-detail-value">${sanitize(entity.veil_status || entity.alignment || '—')}</div>
          ${sessionTag ? `<div class="dm-detail-label">Sesión</div><div class="dm-detail-value">${sessionTag}</div>` : ''}
        </div>
        <div class="dm-detail-box scroll full">
          <div class="dm-detail-label">Resumen público</div>
          <div class="dm-detail-value multiline">${summary}</div>
          ${isDmViewer()
            ? `<div class="dm-detail-label">Notas DM</div><div class="dm-detail-value multiline">${dmNotes}</div>`
            : ''
          }
        </div>
      </div>
    `;
  } else {
    // 2/3 pane: solo texto para entidades
    detail.innerHTML = `
      <div class="card-title">Dossier</div>
      <div class="dm-detail-grid">
        <div class="dm-detail-box wide">
          <div class="dm-detail-label">Callsign</div>
          <div class="dm-detail-value">${callsign || 'Sin callsign'}</div>
          ${isDmViewer() ? `<div class="dm-detail-label">Nombre real</div><div class="dm-detail-value">${realName || '—'}</div>` : ''}
          <div class="dm-detail-label">Rol / función</div>
          <div class="dm-detail-value">${role}</div>
        </div>
        <div class="dm-detail-box medium">
          <div class="dm-detail-label">Estado</div>
          <div class="dm-detail-value">${status}</div>
          <div class="dm-detail-label">Alineación</div>
          <div class="dm-detail-value">${alignment}</div>
          <div class="dm-detail-label">Amenaza</div>
          <div class="dm-detail-value">${threat}</div>
          <div class="dm-detail-badges">${badgeRow}</div>
        </div>
        <div class="dm-detail-box scroll full">
          <div class="dm-detail-label">Resumen público</div>
          <div class="dm-detail-value multiline">${summary}</div>
          ${isDmViewer()
            ? `<div class="dm-detail-label">Notas DM</div><div class="dm-detail-value multiline">${dmNotes}</div>`
            : ''
          }
        </div>
      </div>
    `;
  }

  const img = entity.image_url || entity.photo || '';
  const locked = entity.visibility === 'locked' && !isDmViewer();

  if (isPoi) {
    hero.classList.add('map-only');
    hero.innerHTML = `
      <div class="dm-entity-map-standalone">
        <div id="dm-entity-detail-map" class="dm-entities-map" aria-label="Mapa de ${callsign || 'entidad'}"></div>
      </div>
    `;
    if (bestiaryRoot) {
      bestiaryRoot.classList.add('hidden');
      bestiaryRoot.classList.remove('bestiary-promoted');
    }
    const poiMapPayload = {
      pois: [
        {
          ...entity,
          poi_latitude: entity.poi_latitude || entity.latitude,
          poi_longitude: entity.poi_longitude || entity.longitude
        }
      ]
    };
    renderEntitiesMap(poiMapPayload);
    renderBestiary(null);
  } else if (isCreature) {
    hero.classList.add('hidden');
    hero.classList.remove('map-only');
    hero.innerHTML = '';
    if (bestiaryRoot) {
      bestiaryRoot.classList.remove('hidden');
      bestiaryRoot.classList.add('bestiary-promoted');
    }
    renderBestiary(entity);
  } else {
    hero.classList.remove('map-only');
    hero.innerHTML = `
      <div class="dm-entity-hero-body">
        <div class="dm-entity-hero-media">
          ${locked
            ? `<div class="hero-wrapper hero-locked"><div class="locked-placeholder">LOCKED</div></div>`
            : img
              ? `<div class="hero-wrapper"><img src="${sanitize(img)}" alt="${callsign}" /></div>`
              : '<div class="muted">Sin imagen disponible.</div>'
          }
        </div>
        <div class="dm-entity-hero-info">
          <div class="dm-entity-hero-title">${callsign || 'Sin callsign'}</div>
          <div class="dm-entity-hero-role">${role}</div>
        </div>
      </div>
    `;
    if (bestiaryRoot) {
      bestiaryRoot.classList.add('hidden');
      bestiaryRoot.classList.remove('bestiary-promoted');
    }
    renderBestiary(null);
  }
}

function parseBestiaryExtras(notes = '') {
  const extras = { origin: '', behaviour: '', protocols: [] };
  if (!notes) return extras;
  const normalizedNotes = String(notes).replace(/\r/g, '').replace(/\t/g, ' ');
  const lines = normalizedNotes
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  let collectingProtocols = false;
  lines.forEach((line) => {
    const normalized = line.toLowerCase();
    if (normalized.startsWith('origen:') || normalized.startsWith('origin:')) {
      extras.origin = line.split(':').slice(1).join(':').trim();
      collectingProtocols = false;
    } else if (normalized.startsWith('comportamiento:') || normalized.startsWith('behaviour:')) {
      extras.behaviour = line.split(':').slice(1).join(':').trim();
      collectingProtocols = false;
    } else if (
      normalized.startsWith('protocolos:') ||
      normalized.startsWith('protocols:') ||
      normalized.startsWith('protocolo:')
    ) {
      const remainder = line.split(':').slice(1).join(':');
      extras.protocols.push(
        ...remainder
          .split(/[;,]/)
          .map((part) => part.replace(/^-+/, '').trim())
          .filter(Boolean)
      );
      collectingProtocols = true;
    } else if (collectingProtocols) {
      extras.protocols.push(line.replace(/^-+/, '').trim());
    }
  });
  return extras;
}

function getBestiaryElements(root = null) {
  const scope = root || document;
  return {
    card: root || bestiaryCard,
    image: scope.querySelector('[data-bestiary-image]') || bestiaryImage,
    code: scope.querySelector('[data-bestiary-code]') || bestiaryCode,
    callsign: scope.querySelector('[data-bestiary-callsign]') || bestiaryCallsign,
    classification: scope.querySelector('[data-bestiary-classification]') || bestiaryClassification,
    threat: scope.querySelector('[data-bestiary-threat]') || bestiaryThreat,
    status: scope.querySelector('[data-bestiary-status]') || bestiaryStatus,
    alignment: scope.querySelector('[data-bestiary-alignment]') || bestiaryAlignment,
    summary: scope.querySelector('[data-bestiary-summary]') || bestiarySummary,
    behaviour: scope.querySelector('[data-bestiary-behaviour]') || bestiaryBehaviour,
    origin: scope.querySelector('[data-bestiary-origin]') || bestiaryOrigin,
    protocols: scope.querySelector('[data-bestiary-protocols]') || bestiaryProtocols,
    dmOnly: Array.from(scope.querySelectorAll('.bestiary-dm-only'))
  };
}

function resolveBestiaryRoot(variant, explicitRoot) {
  if (explicitRoot) return explicitRoot;
  if (variant === 'agent') {
    return agentBestiaryCard || document.getElementById('agent-bestiary-card');
  }
  return bestiaryCard;
}

function renderBestiary(entity = null, variantOrOptions = {}) {
  const options = typeof variantOrOptions === 'string' ? { variant: variantOrOptions } : variantOrOptions || {};
  const variant = options.variant || (state.dmMode ? 'dm' : 'agent');
  const root = resolveBestiaryRoot(variant, options.root);
  const elements = getBestiaryElements(root);
  if (!elements.card) return;
  const isCreature = !!entity && entity.type === 'criatura';
  elements.card.classList.toggle('hidden', !isCreature);
  elements.card.dataset.variant = variant;
  if (elements.dmOnly.length) {
    elements.dmOnly.forEach((el) => el.classList.toggle('hidden', variant !== 'dm'));
  }
  const hasSelection = !!entity && isCreature;
  elements.card.dataset.empty = hasSelection ? 'false' : 'true';
  if (!hasSelection) {
    elements.callsign && (elements.callsign.textContent = 'Sin entidad seleccionada');
    elements.classification && (elements.classification.textContent = 'Clasificación: —');
    elements.threat && (elements.threat.textContent = 'Nivel de amenaza: —');
    elements.status && (elements.status.textContent = 'Estado: —');
    elements.alignment && (elements.alignment.textContent = 'Alineación: —');
    if (elements.summary) {
      elements.summary.textContent = 'Selecciona un dossier para cargar el bestiario.';
    }
    if (elements.behaviour) elements.behaviour.textContent = '—';
    if (elements.origin) elements.origin.textContent = '—';
    if (elements.protocols) {
      elements.protocols.innerHTML = '<li>Sin protocolos registrados.</li>';
    }
    if (elements.image) {
      elements.image.src = BESTIARY_FALLBACK_IMAGE;
    }
    return;
  }
  const record = entity;
  const safeImage = sanitizeUrlValue(record.image_url || BESTIARY_FALLBACK_IMAGE) || BESTIARY_FALLBACK_IMAGE;
  const codeName = sanitize(record.code_name || record.name || 'Entidad OV');
  const classificationLabel = sanitize(
    record.type === 'poi'
      ? categoryLabels[record.category] || 'PdI'
      : (getEntityTypeLabel(record.type || record.kind || 'entity') || 'Entidad').toUpperCase()
  );

  if (elements.code) {
    elements.code.textContent = record.code_name ? `OV-${record.code_name.substring(0, 5).toUpperCase()}` : 'OV-ESK-000';
  }
  if (elements.callsign) {
    elements.callsign.textContent = codeName;
  }
  if (elements.classification) {
    elements.classification.textContent = `CLASIFICACIÓN: ${classificationLabel}`;
  }
  if (elements.threat) {
    elements.threat.textContent = `Nivel de amenaza: ${record.threat_level || '??'}`;
  }
  if (elements.status) {
    elements.status.textContent = `Estado: ${sanitize(record.status || '—')}`;
  }
  if (elements.alignment) {
    elements.alignment.textContent = `Alineación: ${sanitize(record.alignment || record.allegiance || '—')}`;
  }
  if (elements.summary) {
    elements.summary.textContent = sanitize(record.public_summary || record.public_note || 'Sin notas públicas disponibles.');
  }

  const extras = parseBestiaryExtras(record.dm_notes || record.dm_note || '');
  if (elements.behaviour) {
    elements.behaviour.textContent = extras.behaviour || record.behaviour || '—';
  }
  if (elements.origin) {
    elements.origin.textContent = extras.origin || record.origin || 'Expediente abierto en OV';
  }

  const protocols = Array.from(
    new Set([...(Array.isArray(record.protocols) ? record.protocols : []), ...extras.protocols])
  ).filter(Boolean);
  if (elements.protocols) {
    elements.protocols.innerHTML = protocols.length
      ? protocols.map((protocol) => `<li>${sanitize(protocol)}</li>`).join('')
      : '<li>Sin protocolos registrados.</li>';
  }

  if (elements.image) {
    elements.image.src = safeImage;
  }
}

function openEntityDeleteOverlay(entityOrId) {
  if (!entityDeleteOverlay || !entityDeleteMessage) return;
  // ensure overlay is attached to body (boot screen may be hidden)
  if (entityDeleteOverlay.parentElement !== document.body) {
    document.body.appendChild(entityDeleteOverlay);
  }

  let entity = null;
  if (entityOrId && typeof entityOrId === 'object') {
    entity = entityOrId;
  } else if (entityOrId && !Number.isNaN(Number(entityOrId))) {
    entity = state.entities.find((e) => Number(e.id) === Number(entityOrId)) || null;
  }
  if (!entity) entity = state.activeEntityAdmin;
  console.log('DEBUG open delete overlay', { input: entityOrId, resolvedId: entity ? entity.id : null });
  if (!entity) return;

  const label = sanitize(entity.code_name || entity.name || `Entidad ${entity.id}`);
  entityDeleteMessage.textContent = `¿Estás seguro de eliminar la entidad ${label}?`;
  entityDeleteOverlay.dataset.entityId = String(entity.id);
  entityDeleteOverlay.classList.remove('hidden');
  entityDeleteOverlay.style.display = 'flex';
}

function closeEntityDeleteOverlay() {
  if (!entityDeleteOverlay) return;
  entityDeleteOverlay.style.display = '';
  entityDeleteOverlay.classList.add('hidden');
  entityDeleteOverlay.dataset.entityId = '';
}

function showMessage(text, isError = false) {
  if (!messageBar) return console.log(text);
  messageBar.textContent = text;
  messageBar.style.borderColor = isError ? 'rgba(255,95,95,0.8)' : 'rgba(0,255,136,0.4)';
  messageBar.style.color = isError ? '#ffb3b3' : '#e5f5ee';
}

async function handleEntityDelete() {
  const targetId =
    Number(entityDeleteOverlay?.dataset.entityId) || (state.activeEntityAdmin ? Number(state.activeEntityAdmin.id) : null);
  if (!targetId) return;
  entityDeleteConfirmBtn?.setAttribute('disabled', 'true');
  try {
    const response = await fetch(`/api/dm/entities/${targetId}`, {
      method: 'DELETE',
      headers: {
        'x-dm-secret': state.dmSecret || ''
      }
    });
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Fallo al eliminar la entidad. (${response.status})`);
    }
    showMessage('Entidad eliminada.');
    closeEntityDeleteOverlay();
    await loadEntities();
    enterNewEntityMode();
  } catch (err) {
    showMessage(err.message || 'No se pudo eliminar la entidad.', true);
  } finally {
    entityDeleteConfirmBtn?.removeAttribute('disabled');
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
  renderBestiary(state.activeEntityAdmin);
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
  const msg = state.activeMessage;
  const viewer = state.dmMode ? 'Sr. Verdad' : state.agent?.display || '';
  renderMessageReader(messageReader, msg, viewer);
  renderMessageReader(messageReaderDm, msg, viewer);
}

function renderMessageReader(reader, msg, viewer) {
  if (!reader) return;
  if (!msg) {
    reader.textContent = 'No hay despachos.';
    return;
  }
  const isRead = viewer ? Array.isArray(msg.read_by) && msg.read_by.includes(viewer) : true;
  const html = `
    <div class="message-reader-header">
      <div class="title">${sanitize(msg.subject || '(Sin asunto)')}</div>
      <div class="meta">De: ${sanitize(msg.sender)} → ${sanitize(msg.recipient)} · ${new Date(
    msg.created_at
  ).toLocaleString()}</div>
    </div>
    <div class="message-body">${sanitize(msg.body || '')}</div>
    <div class="message-actions">
      ${!isRead && viewer ? `<button type="button" class="ghost small" data-mark-read="${msg.id}">Marcar como leído</button>` : ''}
      ${state.messageFilters.box === 'sent' ? '' : `<button type="button" class="ghost small" data-reply="${msg.id}">Responder</button>`}
      <button type="button" class="ghost small danger" data-delete="${msg.id}">Eliminar</button>
    </div>
  `;
  reader.innerHTML = html;
  const markBtn = reader.querySelector('[data-mark-read]');
  const replyBtn = reader.querySelector('[data-reply]');
  const deleteBtn = reader.querySelector('[data-delete]');
  if (markBtn && viewer) {
    markBtn.addEventListener('click', () => markMessageAsRead(Number(markBtn.dataset.markRead), viewer));
  }
  if (replyBtn) {
    replyBtn.addEventListener('click', () => startReply(state.activeMessage));
  }
  if (deleteBtn && viewer) {
    deleteBtn.addEventListener('click', () => deleteMessageForViewer(msg.id, viewer, state.messageFilters.box || 'inbox'));
  }
}

function setFocalPoi(poi) {
  const normalized = state.workspaceView || 'map';
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

function setDmBlade(blade) {
  state.activeDmBlade = blade;
}

function loadMissionNotes() {
  loadJournalEntry();
}

async function loadJournalEntry() {
  const season = Number(journalSeasonInput?.value) || state.journalSeason || 2;
  const session = Number(journalSessionInput?.value) || state.journalSession || 0;
  state.journalSeason = season;
  state.journalSession = session;
  const path = state.dmMode ? `/api/dm/journal?season=${season}&session=${session}` : `/api/agent/journal?season=${season}&session=${session}`;
  try {
    const res = await fetch(path, {
      headers: state.dmMode ? { 'x-dm-secret': state.dmSecret || '' } : undefined
    });
    if (!res.ok) throw new Error('No se pudo cargar journal');
    const data = await res.json();
    state.missionNotes = data.public_note || data.public_summary || '';
    state.journalDm = state.dmMode ? data.dm_note || '' : state.journalDm;
  } catch (err) {
    logDebug(`Journal load failed: ${err.message}`);
    state.missionNotes = '';
    if (state.dmMode) state.journalDm = '';
  }
  renderMissionCards();
  if (journalDmInput && state.dmMode && document.activeElement !== journalDmInput) {
    journalDmInput.value = state.journalDm || '';
  }
  if (journalPublicInput && document.activeElement !== journalPublicInput) {
    journalPublicInput.value = state.missionNotes || '';
  }
}

async function saveMissionNotes(text) {
  state.missionNotes = text.trim();
  const payload = {
    season: state.journalSeason,
    session: state.journalSession,
    public_note: state.missionNotes
  };
  const url = state.dmMode ? '/api/dm/journal' : '/api/agent/journal';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(state.dmMode ? { 'x-dm-secret': state.dmSecret || '' } : {})
      },
      body: JSON.stringify({ ...payload, dm_note: state.dmMode ? state.journalDm : undefined })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'No se pudo guardar el journal.');
    }
    renderMissionCards();
    return true;
  } catch (err) {
    logDebug(`No se pudo guardar journal: ${err.message}`);
    showMessage('No se pudo guardar el journal.', true);
    return false;
  }
}

function loadJournalDm() {
  // legacy no-op, kept for compatibility
  if (journalDmInput && state.dmMode) {
    journalDmInput.value = state.journalDm || '';
  }
}

function saveJournalDm(text) {
  state.journalDm = text.trim();
}

async function handleJournalSave() {
  if (!journalSaveBtn) return;
  setSavingButton(journalSaveBtn, true, 'Guardando…');
  try {
    const ok = await saveMissionNotes(journalPublicInput?.value || '');
    if (!ok) return;
    if (state.dmMode) {
      saveJournalDm(journalDmInput?.value || '');
    }
    showMessage('Journal actualizado.');
  } catch (err) {
    logDebug(`Error guardando journal: ${err.message}`);
    showMessage('No se pudo guardar el journal.', true);
  } finally {
    setSavingButton(journalSaveBtn, false);
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
  } else if (tab === 'database') {
    setWorkspaceView('database');
  } else if (tab === 'pois') {
    // Reuse el focal PdI sin mapa en móvil
    setWorkspaceView('map');
    state.showOlderMobilePois = false;
    if (isMobileView()) {
      const poiToggle = document.querySelector('.poi-list-section .collapsible-toggle');
      const poiBody = document.querySelector('.poi-list-section .collapsible-body');
      if (poiBody && poiToggle && !poiBody.classList.contains('collapsed')) {
        toggleCollapsible(poiToggle);
      }
    }
  }
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

function parsePoiLinksInput(value) {
  if (!value) return [];
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
    .map((token) => {
      const [idPart, extras, visibility] = token.split('|');
      const [rolePart, sessionPart] = (extras || '').split(':');
      const poiId = Number(idPart);
      if (!poiId || Number.isNaN(poiId)) return null;
      return {
        poi_id: poiId,
        role_at_poi: rolePart ? rolePart.trim() : null,
        session_tag: sessionPart ? sessionPart.trim() : null,
        is_public: visibility !== 'dm'
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
      const [idPart, relationPart, visibility] = token.split('|');
      const targetId = Number(idPart);
      if (!targetId || Number.isNaN(targetId) || !relationPart) return null;
      return { to_entity_id: targetId, relation_type: relationPart.trim(), is_public: visibility !== 'dm' };
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
      const parts = item.split('|');
      const id = parts[0];
      const extra = parts[1] || '';
      const visibility = parts[2] || 'public';
      if (kind === 'poi') {
        const [role_at_poi, session_tag] = extra.split(':');
        const poiId = Number(id);
        if (!poiId || Number.isNaN(poiId)) return null;
        return {
          poi_id: poiId,
          role_at_poi: role_at_poi || '',
          session_tag: session_tag || '',
          is_public: visibility !== 'dm'
        };
      }
      const targetId = Number(id);
      if (!targetId || Number.isNaN(targetId)) return null;
      return {
        to_entity_id: targetId,
        relation_type: extra || 'relacion',
        is_public: visibility !== 'dm'
      };
    })
    .filter(Boolean);
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
        const vis = item.is_public === false ? 'dm' : 'public';
        return `${id}|${role}:${session}|${vis}`;
      }
      const id = item.to_entity_id || item.target_id || item.id;
      if (!id) return null;
      const rel = item.relation_type || item.relation || '';
      const vis = item.is_public === false ? 'dm' : 'public';
      return `${id}|${rel}|${vis}`;
    })
    .filter(Boolean);
}

function getTokenLabel(item, kind = 'entity') {
  if (kind === 'poi') {
    const name = item.code_name || item.name || item.title || `PdI #${item.id || item.poi_id}`;
    const vis = item.is_public === false ? 'solo DM' : 'agentes';
    return vis ? `${name} · ${vis}` : name;
  }
  const name = item.code_name || item.name || item.title || `Entidad #${item.id || item.to_entity_id}`;
  const vis = item.is_public === false ? 'solo DM' : 'agentes';
  return vis ? `${name} · ${vis}` : name;
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
    const role = item.role_at_poi || '';
    const session = item.session_tag || item.session || '';
    const visToken = item.is_public === false ? 'dm' : 'public';
    const token = mode === 'poi'
      ? `${item.id || item.poi_id}|${role}:${session}|${visToken}`
      : `${item.id || item.to_entity_id || item.target_id}|${item.relation_type || item.relation || ''}|${visToken}`;
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
      const [id, extra, visibility = 'public'] = token.split('|');
      const match = dataList.find((item) => String(item.id || item.poi_id || item.to_entity_id || item.target_id) === id);
      const roleParts = (extra || '').split(':');
      const label = match
        ? getTokenLabel(
          {
            ...match,
            relation_type: extra,
            role_at_poi: roleParts[0] || '',
            session_tag: roleParts[1] || match.session_tag,
            is_public: visibility !== 'dm'
          },
          mode
        )
        : token;
      const chip = document.createElement('span');
      chip.className = 'chip';
      const labelSpan = document.createElement('span');
      labelSpan.className = 'chip-label';
      labelSpan.textContent = label;
      chip.appendChild(labelSpan);
      const actions = document.createElement('div');
      actions.className = 'chip-actions';
      if (mode === 'entity' || mode === 'poi') {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.textContent = visibility === 'dm' ? 'DM' : 'AG';
        toggle.title = visibility === 'dm' ? 'Solo DM' : 'Visible agentes';
        toggle.addEventListener('click', () => {
          const tokensCurrent = tokensFromHidden(hidden);
          const nextVis = visibility === 'dm' ? 'public' : 'dm';
          const idx = tokensCurrent.indexOf(token);
          if (idx >= 0) {
            tokensCurrent.splice(idx, 1, `${id}|${extra}|${nextVis}`);
            writeTokens(hidden, tokensCurrent);
            renderChips(tokensCurrent);
          }
        });
        actions.appendChild(toggle);
      }
      const close = document.createElement('button');
      close.type = 'button';
      close.textContent = '×';
      close.addEventListener('click', () => removeToken(token));
      actions.appendChild(close);
      chip.appendChild(actions);
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
  if (unlockFields) {
    const locked = entityVisibilityInput?.value === 'locked';
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
  entityPublicNoteInput.value = entity.public_summary || entity.public_note || '';
  entityDmNoteInput.value = entity.dm_notes || entity.dm_note || '';
  entityVisibilityInput.value = entity.visibility || 'agent_public';
  entityUnlockInput.value = entity.unlock_code || '';
  entityLockedHintInput.value = entity.locked_hint || '';
  entityArchivedInput.checked = !!entity.archived;
  entityPoisInput.value = (entity.pois || entity.poi_links || [])
    .map((p) => `${p.poi_id}:${p.role_at_poi || ''}:${p.session_tag || ''}`)
    .join(',');
  entityLinksInput.value = (entity.relations || entity.links || [])
    .map((l) => `${l.to_entity_id || l.target_id}:${l.relation_type || l.relation}`)
    .join(',');

  // PdI-specific fields
  if (kind === 'poi') {
    poiCategorySelect.value = entity.category || '';
    if (formIds.latitude) formIds.latitude.value = entity.latitude || '';
    if (formIds.longitude) formIds.longitude.value = entity.longitude || '';
    if (formIds.imageUrl) formIds.imageUrl.value = entity.image_url || '';
    if (formIds.threat) formIds.threat.value = entity.threat_level || '';
    if (formIds.veil) formIds.veil.value = entity.veil_status || entity.alignment || '';
    if (formIds.session) formIds.session.value = entity.session_tag || entity.sessions || '';
    if (formIds.publicNote) formIds.publicNote.value = entity.public_note || entity.public_summary || '';
    if (formIds.dmNote) formIds.dmNote.value = entity.dm_note || entity.dm_notes || '';
    if (entityThreatInput) entityThreatInput.value = entity.threat_level || '';
    state.editingPoiId = entity.id;
  }
  updateEntityFormMode(kind === 'poi' ? 'poi' : 'entity');
  updateEntityDeleteButtonState(entity);
}

function resetEntityForm() {
  if (!entityForm) return;
  entityForm.reset();
  entityIdInput.value = '';
  entityKindInput.value = 'entity';
  entityForm.classList.remove('is-poi');
  entityVisibilityInput.value = 'agent_public';
  entityArchivedInput.checked = false;
  entityUnlockInput.value = '';
  entityLockedHintInput.value = '';
  entityPoisInput.value = '';
  entityLinksInput.value = '';
  state.editingPoiId = null;
  updateEntityFormMode('entity');
  updateEntityDeleteButtonState();
}

async function selectAdminEntity(entity) {
  if (!entity) return;
  enterEditEntityMode(entity);
  if (state.workspaceView !== 'entities') {
    setWorkspaceView('entities');
  } else {
    renderAdminDossiers();
  }
  if (entity.kind === 'entity') {
    await loadDmContext(entity.id);
  } else {
    renderDossierDetailView(dmEntitiesContext, entity, { dm: true });
    renderDmEntityDetailCard(entity, state.activeEntityContext);
  }
  renderBestiary(entity, 'dm');
}

function enterNewEntityMode() {
  state.entityEditorMode = 'new';
  state.activeEntityAdmin = null;
  resetEntityForm();
  renderDmEntityDetailCard(null);
  updateEntityEditorButtons();
  renderBestiary(null, state.dmMode ? 'dm' : 'agent');
}

function enterEditEntityMode(entity) {
  if (!entity) return;
  state.entityEditorMode = 'edit';
  state.activeEntityAdmin = { ...entity, kind: entity.kind || 'entity' };
  populateEntityForm(state.activeEntityAdmin);
  updateEntityFormMode(state.activeEntityAdmin.type === 'poi' ? 'poi' : 'entity');
  updateEntityEditorButtons();
  updateEntityDeleteButtonState(state.activeEntityAdmin);
  renderBestiary(state.activeEntityAdmin, 'dm');
}

function updateEntityEditorButtons() {
  const editMode = state.entityEditorMode === 'edit' && !!state.activeEntityAdmin;
  entityDeleteBtns?.forEach((btn) => btn.classList.toggle('hidden', !editMode));
  entityCancelBtn?.classList.toggle('hidden', !editMode);
  if (entitySubmitBtn) {
    entitySubmitBtn.textContent = editMode ? 'Guardar cambios' : 'Guardar entidad';
  }
}

function updateEntityDeleteButtonState(entity = state.activeEntityAdmin) {
  if (!entityDeleteBtns || !entityDeleteBtns.length) return;
  const show = state.dmMode && entity && entity.id;
  entityDeleteBtns.forEach((btn) => {
    btn.classList.toggle('hidden', !show);
    if (show) {
      btn.dataset.entityId = String(entity.id);
    } else {
      btn.removeAttribute('data-entity-id');
    }
  });
}

function showEntityDeleteModal(entity) {
  if (!entityDeleteModal || !entityDeleteModalCallsign || !entity) return;
  const safeName = sanitize(entity.code_name || entity.name || 'esta entidad');
  entityDeleteModalCallsign.textContent = safeName;
  entityDeleteModal.dataset.entityId = String(entity.id);
  entityDeleteModal.classList.add('visible');
}

function hideEntityDeleteModal() {
  if (!entityDeleteModal) return;
  entityDeleteModal.classList.remove('visible');
  entityDeleteModal.dataset.entityId = '';
}

async function confirmEntityDeletion() {
  if (!state.dmMode || !state.activeEntityAdmin) {
    hideEntityDeleteModal();
    return;
  }
  const entity = state.activeEntityAdmin;
  hideEntityDeleteModal();
  try {
    if (!state.dmSecret) {
      showMessage('Se requiere canal de Sr. Verdad para borrar entidades.', true);
      return;
    }
    const response = await fetch(`/api/dm/entities/${entity.id}`, {
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
      const error = await response.json().catch(() => ({}));
      showMessage(error.error || 'Fallo al borrar la entidad.', true);
      return;
    }
    const displayName = sanitize(entity.code_name || entity.name || 'Entidad');
    showMessage(`Entidad ${displayName} eliminada.`);
    state.activeEntityAdmin = null;
    resetEntityForm();
    await loadEntities();
  } catch (err) {
    logDebug(`Error borrando entidad: ${err.message}`);
    showMessage('No se pudo eliminar la entidad.', true);
  } finally {
    updateEntityDeleteButtonState();
  }
}

function toggleUnlockFields() {
  if (!unlockFields || !entityVisibilityInput) return;
  const show = entityVisibilityInput.value === 'locked';
  unlockFields.style.display = show ? 'block' : 'none';
}

async function handleEntitySubmit(event) {
  event.preventDefault();
  if (!isDmViewer()) {
    dmWarning.textContent = 'Se requiere canal de Sr. Verdad para guardar entidades.';
    return;
  }
  const kind = (entityKindInput?.value || '').trim() || (entityTypeInput.value === 'poi' ? 'poi' : 'entity');
  if (kind === 'poi' || entityTypeInput.value === 'poi') {
    await submitPoiFromEntityForm();
    return;
  }
  await saveEntity({ kind });
}

function buildEntityPayload(kind = 'entity') {
  const payload = {
    type: entityTypeInput?.value || (kind === 'poi' ? 'poi' : 'entity'),
    code_name: entityCodeNameInput?.value.trim(),
    real_name: entityRealNameInput?.value.trim(),
    role: entityRoleInput?.value.trim(),
    status: entityStatusInput?.value.trim(),
    alignment: entityAlignmentInput?.value.trim(),
    threat_level: entityThreatInput?.value ? Number(entityThreatInput.value) : null,
    image_url: entityImageInput?.value.trim(),
    public_summary: entityPublicNoteInput?.value.trim(),
    dm_notes: entityDmNoteInput?.value.trim(),
    visibility: entityVisibilityInput?.value || 'agent_public',
    unlock_code: entityUnlockInput?.value.trim(),
    locked_hint: entityLockedHintInput?.value.trim(),
    archived: !!entityArchivedInput?.checked,
    poi_links: parseMultiSelect(entityPoisInput?.value, 'poi'),
    relations: parseMultiSelect(entityLinksInput?.value, 'entity')
  };
  return payload;
}

function validateEntityPayload(payload) {
  const errors = [];
  if (!payload.code_name) {
    errors.push('El nombre o código de la entidad es obligatorio.');
  }
  if (!payload.type) {
    errors.push('Selecciona un tipo de entidad.');
  }
  return errors;
}

async function saveEntity({ kind = 'entity' } = {}) {
  if (!state.dmSecret) {
    showMessage('Se requiere canal de Sr. Verdad para guardar entidades.', true);
    return;
  }
  const payload = buildEntityPayload(kind);
  const validationErrors = validateEntityPayload(payload);
  if (validationErrors.length) {
    showMessage(validationErrors.join(' '), true);
    return;
  }
  const isEdit = !!entityIdInput.value;
  const endpoint = isEdit ? `/api/dm/entities/${entityIdInput.value}` : '/api/dm/entities';
  const method = isEdit ? 'PUT' : 'POST';
  setSavingButton(entitySubmitBtn, true, 'Guardando…');
  try {
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
    const saved = await response.json();
    await loadEntities();
    const label = sanitize(saved.code_name || saved.name || 'Entidad');
    showMessage(isEdit ? `Entidad ${label} actualizada.` : `Entidad ${label} creada.`);
    pulseSavedButton();
    resetEntityForm();
  } catch (err) {
    logDebug(`Error guardando entidad: ${err.message}`);
    showMessage('No se pudo guardar la entidad.', true);
  } finally {
    setSavingButton(entitySubmitBtn, false);
    updateEntityDeleteButtonState();
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
  setCookie('agent_active_entity', entity.id);
  setAgentBlade('dossiers');
  renderAgentDossiers();
  loadAgentContext(entity.id);
  renderAgentEntityDetailCard(entity);
}

async function loadAgentContext(id) {
  try {
    const response = await fetch(`/api/agent/entities/${id}/context`);
    if (!response.ok) return;
    const ctx = await response.json();
    if (ctx.entity && ctx.entity.visibility === 'locked') return;
    const merged = { ...ctx.entity, poi_links: ctx.pois, sessions: ctx.sessions, links: ctx.relations };
    updateAgentCreatureLayout(merged);
    renderAgentEntityDetailCard(merged, ctx);
    const detailTarget = agentDossierDetail || dossierDetail;
    renderDossierDetailView(detailTarget, merged, { dm: false });
    renderEntityGraph(agentGraphContainer, ctx, { focusId: id });
    setCookie('agent_active_entity', id);
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
  const storedAgentEntity = getCookie('agent_active_entity');
  if (storedRole === 'mrtruth' && storedSecret) {
    activateDmMode(storedSecret);
    hideBootScreen();
    showMessage('Acceso de Sr. Verdad restaurado de la sesión anterior.');
    setWorkspaceView('map');
  } else if (storedRole === 'operative') {
    // Forzamos re-selección de agente para evitar bloqueos de login
    deleteCookie('amina_role');
    deleteCookie('amina_agent');
    if (storedAgentEntity) {
      state.pendingAgentEntityId = Number(storedAgentEntity);
    }
  } else {
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

function updateAgentCreatureLayout(entity) {
  const isCreature = entity && entity.type === 'criatura';
  document.body.classList.toggle('agent-creature-view', !!isCreature);
}

function renderAgentEntityDetailCard(entity, ctx = {}) {
  const panels = Array.from(document.querySelectorAll('.agent-entities-top'));
  if (!panels.length) return;
  const isPoi = entity && (entity.kind === 'poi' || entity.type === 'poi');
  const isCreature = entity && entity.type === 'criatura';
  const hasEntity = !!entity;
  const prevGraphic = state.lastAgentGraphic || { type: null, id: null };
  updateAgentCreatureLayout(entity);

  // reset map when switching away from PdI
  if (!isPoi && state.agentEntitiesMap) {
    state.agentEntitiesMap.remove();
    state.agentEntitiesMap = null;
    state.agentEntityMarkers = [];
    const mapContainer = document.getElementById('agent-entity-detail-map');
    if (mapContainer) {
      mapContainer.innerHTML = '<div class="muted">Mapa disponible al seleccionar un PdI.</div>';
    }
  }

  const summary = sanitize(entity?.public_summary || entity?.public_note || 'Sin notas públicas');
  const callsign = sanitize(entity?.code_name || entity?.name || '');
  const role = sanitize(entity?.role || 'Sin rol');
  const threat = sanitize(entity?.threat_level || entity?.threat || '—');
  const status = sanitize(entity?.status || 'estado?');
  const alignment = sanitize(entity?.alignment || 'afinidad?');
  const categoryLabel = sanitize(categoryLabels[entity?.category] || entity?.role || entity?.category || 'PdI');
  const sessionTag = sanitize(entity?.session_tag || entity?.sessions || '');
  const badgeRow = `
    <span class="badge">${status}</span>
    <span class="badge">${alignment}</span>
    ${entity?.visibility === 'locked' ? '<span class="badge-soft">Bloqueada</span>' : ''}
  `;

  const poiMapPayload = isPoi
    ? {
        pois: [
          {
            ...entity,
            poi_latitude: entity.poi_latitude || entity.latitude,
            poi_longitude: entity.poi_longitude || entity.longitude
          }
        ]
      }
    : null;

  panels.forEach((panel, idx) => {
    const detail = panel.querySelector('#agent-entity-detail-card');
    const hero = panel.querySelector('#agent-entity-hero-card');
    const bestiaryRoot = panel.querySelector('#agent-bestiary-card');
    if (!detail || !hero) return;

    if (!hasEntity) {
      detail.innerHTML =
        '<div class="card-title">Detalle de entidad</div><div class="muted">Selecciona un dossier en la lista para ver sus notas.</div>';
      hero.classList.remove('map-only', 'hidden');
      hero.innerHTML = '<div class="dm-entity-hero-body muted">Sin imagen disponible.</div>';
      if (bestiaryRoot) bestiaryRoot.classList.add('hidden');
      renderBestiary(null, { variant: 'agent', root: bestiaryRoot });
      return;
    }

    if (isPoi) {
      detail.innerHTML = `
        <div class="card-title">PdI</div>
        <div class="dm-detail-grid">
          <div class="dm-detail-box wide">
            <div class="dm-detail-label">Callsign</div>
            <div class="dm-detail-value">${callsign || 'Sin callsign'}</div>
            <div class="dm-detail-label">Categoría</div>
            <div class="dm-detail-value">${categoryLabel}</div>
          </div>
          <div class="dm-detail-box medium">
            <div class="dm-detail-label">Amenaza</div>
            <div class="dm-detail-value">${threat}</div>
            <div class="dm-detail-label">Velo</div>
            <div class="dm-detail-value">${sanitize(entity.veil_status || entity.alignment || '—')}</div>
            ${sessionTag ? `<div class="dm-detail-label">Sesión</div><div class="dm-detail-value">${sessionTag}</div>` : ''}
          </div>
        <div class="dm-detail-box scroll full">
          <div class="dm-detail-label">Resumen público</div>
          <div class="dm-detail-value multiline">${summary}</div>
        </div>
      </div>
      `;
    } else {
      detail.innerHTML = `
        <div class="card-title">Dossier</div>
        <div class="dm-detail-grid">
          <div class="dm-detail-box wide">
            <div class="dm-detail-label">Callsign</div>
            <div class="dm-detail-value">${callsign || 'Sin callsign'}</div>
            <div class="dm-detail-label">Rol / función</div>
            <div class="dm-detail-value">${role}</div>
          </div>
          <div class="dm-detail-box medium">
            <div class="dm-detail-label">Estado</div>
            <div class="dm-detail-value">${status}</div>
            <div class="dm-detail-label">Alineación</div>
            <div class="dm-detail-value">${alignment}</div>
            <div class="dm-detail-label">Amenaza</div>
            <div class="dm-detail-value">${threat}</div>
            <div class="dm-detail-badges">${badgeRow}</div>
          </div>
        <div class="dm-detail-box scroll full">
          <div class="dm-detail-label">Resumen público</div>
          <div class="dm-detail-value multiline">${summary}</div>
        </div>
      </div>
      `;
    }

    const img = entity.image_url || entity.photo || '';
    const locked = entity.visibility === 'locked';

    if (isPoi) {
      const mapContainerId = idx === 0 ? 'agent-entity-detail-map' : `agent-entity-detail-map-${idx}`;
      const reuseMap = prevGraphic.type === 'poi' && !!state.agentEntitiesMap;
      const existingContainer = document.getElementById(mapContainerId);
      hero.classList.remove('hidden');
      hero.classList.add('map-only');
      if (!reuseMap || !existingContainer) {
        hero.innerHTML = `
          <div class="dm-entity-map-standalone">
            <div id="${mapContainerId}" class="dm-entities-map" aria-label="Mapa de ${callsign || 'entidad'}"></div>
          </div>
        `;
      }
      if (idx === 0 && poiMapPayload) {
        renderEntitiesMap(poiMapPayload, {
          containerId: mapContainerId,
          mapKey: 'agentEntitiesMap',
          markersKey: 'agentEntityMarkers',
          reuse: false,
          flyTo: true,
          variant: 'agent'
        });
        // ensure map paints after reusing container
        setTimeout(() => state.agentEntitiesMap?.resize(), 50);
    }
      if (bestiaryRoot) bestiaryRoot.classList.add('hidden');
      renderBestiary(null, { variant: 'agent', root: bestiaryRoot });
      return;
    }

    if (isCreature) {
      hero.classList.add('hidden');
      hero.classList.remove('map-only');
      hero.innerHTML = '';
      if (bestiaryRoot) bestiaryRoot.classList.remove('hidden');
      renderBestiary(entity, { variant: 'agent', root: bestiaryRoot });
      return;
    }

    const heroImage = sanitizeUrlValue(img || HERO_FALLBACK_IMAGE) || HERO_FALLBACK_IMAGE;
    hero.classList.remove('map-only', 'hidden');
    hero.innerHTML = `
      <div class="dm-entity-hero-body">
        <div class="dm-entity-hero-media">
          ${locked
            ? `<div class="hero-wrapper hero-locked"><div class="locked-placeholder">LOCKED</div></div>`
            : `<div class="hero-wrapper"><img src="${heroImage}" alt="${callsign || 'Entidad'}" /></div>`
          }
        </div>
        <div class="dm-entity-hero-info">
          <div class="dm-entity-hero-title">${callsign || 'Sin callsign'}</div>
          <div class="dm-entity-hero-role">${role}</div>
        </div>
      </div>
    `;
    if (bestiaryRoot) bestiaryRoot.classList.add('hidden');
    renderBestiary(null, { variant: 'agent', root: bestiaryRoot });
  });

  state.lastAgentGraphic = {
    type: isPoi ? 'poi' : isCreature ? 'creature' : hasEntity ? 'hero' : null,
    id: hasEntity ? entity.id || null : null
  };
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

function bindPickHandler(map) {
  if (!map || map._pickHandlerBound) return;
  map._pickHandlerBound = true;
  map.on('click', (event) => {
    if (!state.pickMode) return;
    setPickedLocation(event.lngLat.lat, event.lngLat.lng);
    disablePickMode();
  });
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

function togglePickMode() {
  state.pickMode = !state.pickMode;
  if (state.pickMode) {
    if (state.map) state.map.getCanvas().style.cursor = 'crosshair';
    if (pickButton) {
      pickButton.textContent = 'Cancelar selección';
      pickButton.classList.add('active');
    }
    showMessage('Haz clic en el mapa para seleccionar coordenadas.');
  } else {
    disablePickMode();
  }
}

function disablePickMode() {
  state.pickMode = false;
  if (state.map) {
    state.map.getCanvas().style.cursor = '';
  }
  if (pickButton) {
    pickButton.textContent = 'Elegir del mapa';
    pickButton.classList.remove('active');
  }
}

function setPickedLocation(lat, lng) {
  if (formIds.latitude) formIds.latitude.value = lat.toFixed(6);
  if (formIds.longitude) formIds.longitude.value = lng.toFixed(6);
  showMessage(`Coordenadas actualizadas: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
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
