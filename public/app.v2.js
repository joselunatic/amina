import { GraphAPI } from './graph-api.js';
import { createBase3d } from './modules/base3d.js';

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

const categoryIconNames = {
  OV_BASE: 'pdi-base',
  CRIME_SCENE: 'pdi-crime',
  ESOTERROR_CELL: 'pdi-cell',
  MUNDANE_TOWN: 'pdi-town',
  INDUSTRIAL_SITE: 'pdi-industrial',
  NATURAL_SITE: 'pdi-natural',
  NPC: 'pdi-npc',
  RUMOR: 'pdi-rumor'
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

const veilLabels = {
  intact: 'Intacto',
  frayed: 'Deshilachado',
  torn: 'Roto'
};
const AGENT_GRAPH_SCOPE = {
  ENTITY: 'entity',
  CAMPAIGN: 'campaign'
};
const AGENT_GRAPH_CAMPAIGN_VALUE = AGENT_GRAPH_SCOPE.CAMPAIGN;
const AGENT_GRAPH_CAMPAIGN_LABEL = 'Campaña agentes · grafo público';
const DM_GRAPH_SCOPE = {
  ENTITY: 'entity',
  CAMPAIGN: 'campaign'
};
const DM_GRAPH_CAMPAIGN_VALUE = DM_GRAPH_SCOPE.CAMPAIGN;
const DM_GRAPH_CAMPAIGN_LABEL = 'Campaña · grafo global';
const DM_ACTOR = 'MrTruth';
const DM_DEFAULT_SENDER = 'Sr. Verdad';

// Character sheet model: general pools are rapid 1d6 modifiers; investigation pools are deliberate consumables;
// refresh restores current to max across both types.
const CHARACTER_SHEET_DEFAULTS = {
  healthMax: 10,
  stabilityMax: 8,
  generalMax: 4,
  investigationMax: 1
};
const CHARACTER_SHEET_GENERAL_SKILLS = [
  'Atletismo',
  'Conducir',
  'Escaramuza',
  'Infiltración',
  'Preparación',
  'Vigilancia',
  'Desarmado',
  'Mecánica',
  'Primeros auxilios',
  'Psiquiatría'
];
const CHARACTER_SHEET_INVESTIGATION_GROUPS = {
  academicas: {
    label: 'Académicas',
    skills: [
      'Antropología',
      'Arquitectura',
      'Conocimiento local',
      'Contabilidad',
      'Cultura general',
      'Derecho',
      'Historia',
      'Historia del arte',
      'Historia natural',
      'Idiomas',
      'Investigar',
      'Lingüística',
      'Ocultismo',
      'Patología',
      'Psicología forense'
    ]
  },
  interpersonales: {
    label: 'Interpersonales',
    skills: [
      'Adular',
      'Bajos fondos',
      'Burocracia',
      'Consolar',
      'Detección de mentiras',
      'Interrogar',
      'Intimidar',
      'Jerga policial',
      'Ligar',
      'Negociar',
      'Suplantar'
    ]
  },
  tecnicas: {
    label: 'Técnicas',
    skills: [
      'Análisis de documentos',
      'Astronomía',
      'Balística',
      'Criptografía',
      'Entomología forense',
      'Explosivos',
      'Fotografía',
      'Huellas dactilares',
      'Medicina forense',
      'Química',
      'Recoger pruebas',
      'Recuperar datos',
      'Vigilancia electrónica'
    ]
  }
};
const CHARACTER_SHEET_INVESTIGATION_MAX_OVERRIDES = {
  'historia natural': 2
};

const state = {
  map: null,
  pois: [],
  poiMarkers: new Map(),
  poiPopup: null,
  poiHoverPopup: null,
  poiHoverId: null,
  poiSelectedId: null,
  poiLayerBound: false,
  dmMode: false,
  agent: null,
  characterSheet: null,
  characterSheetSaveState: 'idle',
  characterSheetSelections: {},
  characterSheetOpenPanels: new Set(),
  authBootstrap: {
    dmConfigured: false,
    agents: {}
  },
  agents: [],
  messages: [],
  messageIdentities: [],
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
    dm: {
      recipient: '',
      session_tag: '',
      since: '',
      box: '',
      unread_only: false,
      page: 0,
      page_size: 40,
      q: ''
    },
    agent: {
      recipient: '',
      session_tag: '',
      since: '',
      box: '',
      unread_only: false,
      page: 0,
      page_size: 40,
      q: ''
    },
    overlay: {
      recipient: '',
      session_tag: '',
      since: '',
      box: '',
      unread_only: false,
      page: 0,
      page_size: 40,
      q: ''
    }
  },
  messagePoll: {
    timer: null,
    inFlight: false,
    intervalMs: 20000,
    lastNewestId: { dm: null, agent: null },
    lastUnread: { dm: 0, agent: 0 }
  },
  messageSocket: null,
  messageSocketRole: null,
  messageSocketRetry: null,
  chat: {
    identities: [],
    threads: [],
    messages: [],
    activeThreadId: null,
    activeIdentityId: null,
    activeAgentUsername: null,
    activeDmIdentityId: null,
    socket: null,
    socketRole: null,
    socketRetry: null,
    dmIdentityEditingId: null
  },
  activityPoll: {
    timer: null,
    inFlight: false,
    intervalMs: 10000,
    labelTimer: null,
    lastSuccessAt: null
  },
  activityPagination: {
    limit: 10,
    page: 0,
    hasMore: false,
    loading: false,
    loadedIds: null
  },
  showOlderMobilePois: false,
  missionNotes: '',
  journalDm: '',
  journalSeason: 2,
  journalSession: 0,
  agentJournalSeason: 2,
  agentJournalSession: 0,
  activeDmBlade: 'journal',
  poiFocal: null,
  activeMessage: null,
  activeMessageIndex: 0,
  activeMessageContext: 'agent',
  replyTarget: null,
  entities: [],
  entityFiltersAgent: { type: '', q: '' },
  entityFiltersAdmin: { type: '', q: '', include_archived: true },
  activeEntityAgent: null,
  activeEntityAdmin: null,
  agentBlade: 'focal',
  mobileDmEditMode: false,
  mobileDmConsoleTab: 'messages',
  journalStatus: 'clean'
  , entitiesMap: null,
  entityDetailMap: null,
  entityDetailMarker: null,
  unlockedEntities: new Set(),
  activeEntityContext: null,
  entityMarkers: [],
  workspaceView: 'map',
  agentDossierPanel: 'dossier',
  graphs: {
    agent: null,
    dm: null
  },
  entityEditorMode: 'new',
  lastAgentGraphic: { type: null, id: null },
  melTokens: []
  ,
  dmGraphLayout: 'spread',
  dmGraphFocusId: null,
  dmGraphScope: DM_GRAPH_SCOPE.CAMPAIGN,
  agentGraphLayout: 'spread',
  agentGraphFocusId: null,
  agentGraphScope: AGENT_GRAPH_SCOPE.CAMPAIGN,
  dmGraphSelections: [],
  agentGraphSelections: []
};

console.log('AMINA app.v2 loaded (mel toggles debug)');

// Expose state for debugging and tests that inspect map centers
window.state = state;

const mapCenter = [-76.229, 40.68];
const BESTIARY_FALLBACK_IMAGE = '/creature.png';
const HERO_FALLBACK_IMAGE = '/noimage.png';
const LOCKED_IMAGE = '/locked.png';
const DECIMAL_STYLE = 'mapbox://styles/mapbox-map-design/ck4014y110wt61ctt07egsel6';
const MISSION_NOTES_KEY = 'amina_mission_notes';
const JOURNAL_DM_KEY = 'amina_journal_dm';
const TICKER_REFRESH_INTERVAL = 1000 * 60 * 2;
const FOOTER_CLOCK_INTERVAL = 1000;
const MEMBRANE_STATUS_TEXT = 'ESTABILIDAD DE MEMBRANA: 92%';
const TICKER_STATE_KEY = 'amina_ticker_state';
const POI_SOURCE_ID = 'pois';
const POI_LAYER_IDS = {
  clusters: 'poi-clusters',
  clusterCount: 'poi-cluster-count',
  clusterPips: 'poi-cluster-pips',
  ring: 'poi-ring',
  fallback: 'poi-fallback',
  icons: 'poi-icons',
  pips: 'poi-pips',
  pipsFocus: 'poi-pips-focus',
  hit: 'poi-hit'
};
let dmGraphFuse = null;
let agentGraphFuse = null;

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
const bootDmChangeBtn = document.getElementById('boot-dm-change');
const bootDmPasswordPanel = document.getElementById('boot-dm-password-panel');
const bootDmCurrentWrap = document.getElementById('boot-dm-current-wrap');
const bootDmCurrentInput = document.getElementById('boot-dm-current');
const bootDmNewInput = document.getElementById('boot-dm-new');
const bootDmConfirmInput = document.getElementById('boot-dm-confirm');
const bootDmSaveBtn = document.getElementById('boot-dm-save');
const bootDmCancelBtn = document.getElementById('boot-dm-cancel');
const bootDmPassStatus = document.getElementById('boot-dm-pass-status');
const bootCancelBtn = document.getElementById('boot-cancel');
const bootStatus = document.getElementById('boot-status');
const bootOutput = document.getElementById('boot-output');
const activityPanel = document.getElementById('activity-panel');
const activityList = document.getElementById('activity-list');
const activityStatus = document.getElementById('activity-status');
const activityConnection = document.getElementById('activity-connection');
const activityMoreBtn = document.getElementById('activity-more');
const bootMenu = document.getElementById('boot-menu');
const agentLoginDiv = document.getElementById('agent-login');
const agentLoginForm = document.getElementById('agent-login-form');
const agentSelect = document.getElementById('agent-select');
const agentPassInput = document.getElementById('agent-pass');
const agentLoginButton = document.getElementById('agent-login-button');
const agentLoginStatus = document.getElementById('agent-login-status');
const agentPasswordToggle = document.getElementById('agent-password-toggle');
const agentPasswordPanel = document.getElementById('agent-password-panel');
const agentPassCurrentWrap = document.getElementById('agent-pass-current-wrap');
const agentPassCurrent = document.getElementById('agent-pass-current');
const agentPassNew = document.getElementById('agent-pass-new');
const agentPassConfirm = document.getElementById('agent-pass-confirm');
const agentPassSave = document.getElementById('agent-pass-save');
const agentPassCancel = document.getElementById('agent-pass-cancel');
const agentPassStatus = document.getElementById('agent-pass-status');
const collapsibleToggles = document.querySelectorAll('.collapsible-toggle');
let bootSequenceId = 0;
const messageForm = document.getElementById('message-form');
const messageFromSelect = document.getElementById('message-from-select');
const messageFromSelectLabel = document.getElementById('message-from-select-label');
const messageFromInput = document.getElementById('message-from');
const messageToSelect = document.getElementById('message-to');
const messageToLabel = document.getElementById('message-to-label');
const messageSubjectInput = document.getElementById('message-subject');
const messageBodyInput = document.getElementById('message-body');
const messageClearBtn = document.getElementById('message-clear');
const messageSessionInput = document.getElementById('message-session');
const filterRecipientSelect = document.getElementById('filter-recipient');
const filterQueryInput = document.getElementById('filter-query');
const filterSessionInput = document.getElementById('filter-session');
const filterSinceInput = document.getElementById('filter-since');
const filterBoxSelect = document.getElementById('filter-box');
const filterUnreadCheckbox = document.getElementById('filter-unread');
const filterApplyBtn = document.getElementById('filter-apply');
const debugPanel = document.getElementById('debug-panel');
let debugMode = false;
let mobileStateBadge = document.getElementById('mobile-state-badge');
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
const chatIdentityList = document.getElementById('chat-identity-list');
const chatTranscript = document.getElementById('chat-transcript');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatSyncBtn = document.getElementById('chat-sync');
const chatAgentLabel = document.getElementById('chat-agent-label');
const chatIdentityLabel = document.getElementById('chat-identity-label');
const chatUnreadBadgeAgent = document.getElementById('chat-unread-badge-agent');
const chatUnreadBadgeDm = document.getElementById('chat-unread-badge-dm');
const dmChatThreadList = document.getElementById('dm-chat-thread-list');
const dmChatAgentSelect = document.getElementById('dm-chat-agent');
const dmChatIdentitySelect = document.getElementById('dm-chat-identity');
const dmChatOpenBtn = document.getElementById('dm-chat-open');
const dmChatTranscript = document.getElementById('dm-chat-transcript');
const dmChatForm = document.getElementById('dm-chat-form');
const dmChatInput = document.getElementById('dm-chat-input');
const dmChatActiveLabel = document.getElementById('dm-chat-active-label');
const dmChatSessionStatus = document.getElementById('dm-chat-session-status');
const dmChatRefreshBtn = document.getElementById('dm-chat-refresh');
const dmIdentityList = document.getElementById('dm-identity-list');
const dmIdentityForm = document.getElementById('dm-identity-form');
const dmIdentityNameInput = document.getElementById('dm-identity-name');
const dmIdentityCancelBtn = document.getElementById('dm-identity-cancel');
const dmJournalStatus = document.getElementById('dm-journal-status');
const dmMobileConsoleTabs = document.querySelectorAll('.dm-mobile-console-tab');
const unreadBadgeAgent = document.getElementById('msg-unread-badge-agent');
const unreadBadgeDm = document.getElementById('msg-unread-badge-dm');
const missionBriefText = document.getElementById('mission-brief-text');
const journalPublicInput = document.getElementById('journal-public');
const journalDmInput = document.getElementById('journal-dm');
const journalSeasonInput = document.getElementById('journal-season');
const journalSessionInput = document.getElementById('journal-session');
const journalSaveBtn = document.getElementById('journal-save');
const dmFormOpenBtn = document.getElementById('dm-form-open');
const msgNavButtons = document.querySelectorAll('[data-msg-nav]');
const msgPageButtons = document.querySelectorAll('[data-msg-page]');
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
const filterQueryAgentInput = document.getElementById('filter-query-agent');
const agentJournalSeasonInput = document.getElementById('agent-journal-season');
const agentJournalSessionInput = document.getElementById('agent-journal-session');
const agentJournalLoadBtn = document.getElementById('agent-journal-load');
const agentJournalSaveBtn = document.getElementById('agent-journal-save');
const agentJournalPublicInput = document.getElementById('agent-journal-public');
const characterSheetCard = document.getElementById('character-sheet-card');
const characterNameLabel = document.getElementById('sheet-character-name');
const characterRoleLabel = document.getElementById('sheet-character-role');
const sheetHealthCurrent = document.getElementById('sheet-health-current');
const sheetHealthMax = document.getElementById('sheet-health-max');
const sheetStabilityCurrent = document.getElementById('sheet-stability-current');
const sheetStabilityMax = document.getElementById('sheet-stability-max');
const sheetGeneralTotal = document.getElementById('sheet-general-total');
const sheetInvestigationTotal = document.getElementById('sheet-investigation-total');
const sheetSaveState = document.getElementById('sheet-save-state');
const sheetRefreshBtn = document.getElementById('sheet-refresh');
const sheetGeneralList = document.getElementById('sheet-general-list');
const sheetGeneralExtra = document.getElementById('sheet-general-extra');
const sheetGeneralCollapse = document.getElementById('sheet-general-collapse');
const sheetInvestigationList = document.getElementById('sheet-investigation-list');
let tickerSavedOffset = 0;
let tickerAnimationStart = 0;
let tickerAnimationDuration = 0;
let tickerDatasetSignature = '';
let mapResizeTimeout = null;
const agentTabs = document.getElementById('agent-tabs');
const DEFAULT_MISSION_BRIEF = 'Esperando directivas.';

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function getMessageContext(context) {
  if (context) return context;
  return state.dmMode ? 'dm' : 'agent';
}

function getMessageFilters(context) {
  const key = getMessageContext(context);
  return state.messageFilters[key];
}

function setMessageFilters(context, updates) {
  const key = getMessageContext(context);
  state.messageFilters[key] = { ...state.messageFilters[key], ...updates };
  return state.messageFilters[key];
}

function adjustMessagePage(context, delta) {
  const key = getMessageContext(context);
  const current = state.messageFilters[key].page || 0;
  const next = Math.max(current + delta, 0);
  state.messageFilters[key].page = next;
  return next;
}

function buildPoiGeocoderResults(query) {
  const needle = (query || '').trim().toLowerCase();
  if (!needle) return [];
  return (state.pois || [])
    .filter((poi) => {
      const target = `${poi.name || ''} ${poi.session_tag || ''} ${poi.public_note || ''}`.toLowerCase();
      return target.includes(needle);
    })
    .filter((poi) => Number.isFinite(Number(poi.longitude)) && Number.isFinite(Number(poi.latitude)))
    .slice(0, 8)
    .map((poi) => ({
      type: 'Feature',
      id: String(poi.id ?? poi.name ?? Math.random()),
      geometry: {
        type: 'Point',
        coordinates: [Number(poi.longitude), Number(poi.latitude)]
      },
      center: [Number(poi.longitude), Number(poi.latitude)],
      place_name: `${poi.name || 'PdI'}${poi.session_tag ? ` · ${poi.session_tag}` : ''}`,
      text: poi.name || 'PdI',
      place_type: ['poi'],
      relevance: 1,
      properties: {
        id: poi.id,
        category: poi.category || '',
        session_tag: poi.session_tag || ''
      }
    }));
}

function getAgentJournalText() {
  if (!agentJournalPublicInput) return '';
  return (agentJournalPublicInput.innerText || '').trim();
}

function setAgentJournalText(text) {
  if (!agentJournalPublicInput) return;
  if (agentJournalPublicInput.isContentEditable) return;
  agentJournalPublicInput.textContent = text || DEFAULT_MISSION_BRIEF;
}

function setAgentJournalEditing(isEditing) {
  if (!agentJournalPublicInput || !agentJournalSaveBtn) return;
  agentJournalPublicInput.contentEditable = isEditing ? 'true' : 'false';
  agentJournalPublicInput.classList.toggle('is-editing', isEditing);
  agentJournalSaveBtn.textContent = isEditing ? 'Guardar' : 'Editar';
  if (isEditing) {
    if (!state.missionNotes && agentJournalPublicInput.textContent.trim() === DEFAULT_MISSION_BRIEF) {
      agentJournalPublicInput.textContent = '';
    }
    agentJournalPublicInput.focus();
  } else if (!state.missionNotes) {
    agentJournalPublicInput.textContent = DEFAULT_MISSION_BRIEF;
  }
}

function slugifySkillName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function buildDefaultSkillEntry(name, max, group) {
  const maxValue = Math.max(0, Number(max) || 0);
  return {
    id: slugifySkillName(name),
    name: String(name),
    max: maxValue,
    current: maxValue,
    group: group || ''
  };
}

function buildDefaultGeneralSkills() {
  return CHARACTER_SHEET_GENERAL_SKILLS.map((name) =>
    buildDefaultSkillEntry(name, CHARACTER_SHEET_DEFAULTS.generalMax, '')
  );
}

function buildDefaultInvestigationSkills() {
  return Object.entries(CHARACTER_SHEET_INVESTIGATION_GROUPS).flatMap(([group, entry]) =>
    entry.skills.map((name) => {
      const overrideKey = String(name || '').toLowerCase();
      const max = CHARACTER_SHEET_INVESTIGATION_MAX_OVERRIDES[overrideKey] || CHARACTER_SHEET_DEFAULTS.investigationMax;
      return buildDefaultSkillEntry(name, max, group);
    })
  );
}

function buildDefaultCharacterSheet(agent) {
  const display = agent?.display || agent?.username || 'Agente';
  return {
    agent_username: agent?.username || '',
    character_name: display,
    character_role: 'Agente de campo OV',
    health_current: CHARACTER_SHEET_DEFAULTS.healthMax,
    health_max: CHARACTER_SHEET_DEFAULTS.healthMax,
    stability_current: CHARACTER_SHEET_DEFAULTS.stabilityMax,
    stability_max: CHARACTER_SHEET_DEFAULTS.stabilityMax,
    general_skills: buildDefaultGeneralSkills(),
    investigation_skills: buildDefaultInvestigationSkills()
  };
}

function normalizeSkillEntry(entry) {
  if (!entry) return null;
  const name = String(entry.name || '').trim() || 'Habilidad';
  const id = entry.id ? String(entry.id) : slugifySkillName(name);
  const max = Math.max(0, Number(entry.max) || 0);
  const current = Math.max(0, Math.min(Number(entry.current) || 0, max));
  return {
    id,
    name,
    max,
    current,
    group: entry.group ? String(entry.group) : ''
  };
}

function normalizeSkillList(list) {
  return (Array.isArray(list) ? list : [])
    .map((entry) => normalizeSkillEntry(entry))
    .filter((entry) => entry);
}

function normalizeCharacterSheetPayload(payload, agent) {
  const fallback = buildDefaultCharacterSheet(agent);
  if (!payload) return fallback;
  const healthMaxRaw = payload.health_max ?? payload.healthMax;
  const stabilityMaxRaw = payload.stability_max ?? payload.stabilityMax;
  const healthMax = Math.max(
    0,
    Number.isFinite(Number(healthMaxRaw)) ? Number(healthMaxRaw) : fallback.health_max
  );
  const stabilityMax = Math.max(
    0,
    Number.isFinite(Number(stabilityMaxRaw)) ? Number(stabilityMaxRaw) : fallback.stability_max
  );
  return {
    agent_username: payload.agent_username || agent?.username || '',
    character_name: payload.character_name || payload.characterName || fallback.character_name,
    character_role: payload.character_role || payload.characterRole || fallback.character_role,
    health_current: Math.max(
      0,
      Math.min(Number(payload.health_current ?? payload.healthCurrent) || fallback.health_current, healthMax)
    ),
    health_max: healthMax,
    stability_current: Math.max(
      0,
      Math.min(Number(payload.stability_current ?? payload.stabilityCurrent) || fallback.stability_current, stabilityMax)
    ),
    stability_max: stabilityMax,
    general_skills: normalizeSkillList(payload.general_skills || payload.generalSkills || fallback.general_skills),
    investigation_skills: normalizeSkillList(
      payload.investigation_skills || payload.investigationSkills || fallback.investigation_skills
    )
  };
}

function setCharacterSheetSaveState(next) {
  state.characterSheetSaveState = next;
  if (!sheetSaveState) return;
  const labelMap = {
    idle: 'sin cambios',
    saving: 'guardando...',
    saved: 'guardado',
    error: 'cambios no guardados'
  };
  sheetSaveState.textContent = labelMap[next] || labelMap.idle;
  sheetSaveState.dataset.state = next;
}

function getSkillStatusClass(current) {
  if (current <= 0) return 'is-empty';
  if (current <= 2) return 'is-low';
  return 'is-ok';
}

function getInvestigationStatusClass(current) {
  if (current <= 0) return 'is-empty';
  if (current === 1) return 'is-fragile';
  return 'is-ok';
}

function splitFeaturedSkills(list, count, ensureNames = []) {
  const featured = list.slice(0, count);
  ensureNames.forEach((name) => {
    if (featured.some((item) => item.name === name)) return;
    const matchIndex = list.findIndex((item) => item.name === name);
    if (matchIndex === -1) return;
    if (featured.length < count) {
      featured.push(list[matchIndex]);
      return;
    }
    featured[featured.length - 1] = list[matchIndex];
  });
  const featuredIds = new Set(featured.map((item) => item.id));
  const extra = list.filter((item) => !featuredIds.has(item.id));
  return { featured, extra };
}

function renderGeneralSkills(skills) {
  if (!sheetGeneralList || !sheetGeneralExtra) return;
  sheetGeneralList.innerHTML = '';
  sheetGeneralExtra.innerHTML = '';
  const { featured, extra } = splitFeaturedSkills(skills, 6, []);
  const buildRow = (skill) => {
    const row = document.createElement('div');
    row.className = `sheet-skill sheet-skill--general ${getSkillStatusClass(skill.current)}`;
    const header = document.createElement('div');
    header.className = 'skill-main';
    const name = document.createElement('div');
    name.className = 'skill-name';
    name.textContent = skill.name;
    const values = document.createElement('div');
    values.className = 'skill-values';
    const current = document.createElement('span');
    current.className = 'skill-current';
    current.textContent = skill.current;
    const max = document.createElement('span');
    max.className = 'skill-max';
    max.textContent = `/${skill.max}`;
    values.appendChild(current);
    values.appendChild(max);
    header.appendChild(name);
    header.appendChild(values);
    const segments = document.createElement('div');
    segments.className = 'skill-segments';
    const isEmpty = skill.current <= 0;
    for (let i = 0; i < skill.max; i += 1) {
      const segment = document.createElement('button');
      segment.type = 'button';
      segment.className = `skill-segment${i < skill.current ? ' filled' : ''}`;
      segment.dataset.generalSkill = skill.id;
      segment.disabled = isEmpty;
      segment.setAttribute('aria-label', `Gastar 1 punto de ${skill.name}`);
      segments.appendChild(segment);
    }
    row.appendChild(header);
    row.appendChild(segments);
    return row;
  };
  featured.forEach((skill) => sheetGeneralList.appendChild(buildRow(skill)));
  extra.forEach((skill) => sheetGeneralExtra.appendChild(buildRow(skill)));
  if (sheetGeneralCollapse) {
    sheetGeneralCollapse.hidden = extra.length === 0;
  }
}

function renderInvestigationSkills(skills) {
  if (!sheetInvestigationList) return;
  sheetInvestigationList.innerHTML = '';
  const groups = {};
  skills.forEach((skill) => {
    const group = skill.group || 'academicas';
    if (!groups[group]) groups[group] = [];
    groups[group].push(skill);
  });
  Object.entries(CHARACTER_SHEET_INVESTIGATION_GROUPS).forEach(([groupKey, config]) => {
    const groupSkills = groups[groupKey] || [];
    const { featured, extra } = splitFeaturedSkills(
      groupSkills,
      4,
      groupKey === 'academicas' ? ['Historia natural'] : []
    );
    const group = document.createElement('div');
    group.className = 'sheet-group';
    const title = document.createElement('div');
    title.className = 'sheet-group-title';
    title.textContent = config.label;
    group.appendChild(title);
    const list = document.createElement('div');
    list.className = 'sheet-skill-list';
    const buildRow = (skill) => {
      const row = document.createElement('div');
      row.className = `sheet-skill sheet-skill--investigation ${getInvestigationStatusClass(skill.current)}`;
      if (state.characterSheetSelections[skill.id] > skill.current) {
        delete state.characterSheetSelections[skill.id];
      }
      const header = document.createElement('div');
      header.className = 'skill-main';
      const name = document.createElement('div');
      name.className = 'skill-name';
      name.textContent = skill.name;
      const values = document.createElement('div');
      values.className = 'skill-values';
      const current = document.createElement('span');
      current.className = 'skill-current';
      current.textContent = skill.current;
      const max = document.createElement('span');
      max.className = 'skill-max';
      max.textContent = `/${skill.max}`;
      values.appendChild(current);
      values.appendChild(max);
      header.appendChild(name);
      header.appendChild(values);
      const pipRow = document.createElement('div');
      pipRow.className = 'skill-pips';
      for (let i = 0; i < skill.max; i += 1) {
        const pip = document.createElement('span');
        pip.className = `skill-pip${i < skill.current ? ' filled' : ''}`;
        pipRow.appendChild(pip);
      }
      const controls = document.createElement('div');
      controls.className = 'skill-controls';
      const spendBtn = document.createElement('button');
      spendBtn.type = 'button';
      spendBtn.className = 'ghost small';
      spendBtn.textContent = 'Gastar';
      spendBtn.dataset.investigationToggle = skill.id;
      spendBtn.disabled = skill.current <= 0;
      controls.appendChild(spendBtn);
      const panel = document.createElement('div');
      panel.className = 'investigation-spend';
      panel.dataset.investigationPanel = skill.id;
      panel.classList.toggle('is-open', state.characterSheetOpenPanels.has(skill.id));
      const options = document.createElement('div');
      options.className = 'spend-options';
      for (let i = 1; i <= skill.current; i += 1) {
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'spend-option';
        option.textContent = String(i);
        option.dataset.investigationOption = skill.id;
        option.dataset.spendValue = String(i);
        if (state.characterSheetSelections[skill.id] === i) {
          option.classList.add('active');
        }
        options.appendChild(option);
      }
      const actions = document.createElement('div');
      actions.className = 'spend-actions';
      const apply = document.createElement('button');
      apply.type = 'button';
      apply.className = 'ghost small';
      apply.textContent = 'Aplicar';
      apply.dataset.investigationApply = skill.id;
      apply.disabled = !state.characterSheetSelections[skill.id];
      const cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'ghost small';
      cancel.textContent = 'Cancelar';
      cancel.dataset.investigationCancel = skill.id;
      actions.appendChild(apply);
      actions.appendChild(cancel);
      panel.appendChild(options);
      panel.appendChild(actions);
      row.appendChild(header);
      row.appendChild(pipRow);
      row.appendChild(controls);
      row.appendChild(panel);
      return row;
    };
    featured.forEach((skill) => list.appendChild(buildRow(skill)));
    group.appendChild(list);
    if (extra.length) {
      const details = document.createElement('details');
      details.className = 'sheet-collapse';
      const summary = document.createElement('summary');
      summary.textContent = 'Más habilidades';
      details.appendChild(summary);
      const extraList = document.createElement('div');
      extraList.className = 'sheet-skill-list';
      extra.forEach((skill) => extraList.appendChild(buildRow(skill)));
      details.appendChild(extraList);
      group.appendChild(details);
    }
    sheetInvestigationList.appendChild(group);
  });
}

function renderCharacterSheet() {
  if (!state.characterSheet) return;
  const sheet = state.characterSheet;
  if (characterNameLabel) characterNameLabel.textContent = sheet.character_name || '—';
  if (characterRoleLabel) characterRoleLabel.textContent = sheet.character_role || '';
  if (sheetHealthCurrent) sheetHealthCurrent.textContent = sheet.health_current;
  if (sheetHealthMax) sheetHealthMax.textContent = sheet.health_max;
  if (sheetStabilityCurrent) sheetStabilityCurrent.textContent = sheet.stability_current;
  if (sheetStabilityMax) sheetStabilityMax.textContent = sheet.stability_max;
  const generalTotal = sheet.general_skills.reduce((acc, skill) => acc + (skill.current || 0), 0);
  const investigationTotal = sheet.investigation_skills.reduce((acc, skill) => acc + (skill.current || 0), 0);
  if (sheetGeneralTotal) sheetGeneralTotal.textContent = generalTotal;
  if (sheetInvestigationTotal) sheetInvestigationTotal.textContent = investigationTotal;
  renderGeneralSkills(sheet.general_skills);
  renderInvestigationSkills(sheet.investigation_skills);
}

async function loadCharacterSheet() {
  if (!state.agent) return;
  try {
    const response = await fetch('/api/agent/character-sheet', { credentials: 'same-origin' });
    if (!response.ok) {
      throw new Error('No se pudo cargar la ficha.');
    }
    const payload = await response.json();
    state.characterSheet = normalizeCharacterSheetPayload(payload.sheet, state.agent);
    state.characterSheetSelections = {};
    state.characterSheetOpenPanels = new Set();
    setCharacterSheetSaveState('idle');
    renderCharacterSheet();
  } catch (err) {
    state.characterSheet = buildDefaultCharacterSheet(state.agent);
    state.characterSheetSelections = {};
    state.characterSheetOpenPanels = new Set();
    setCharacterSheetSaveState('error');
    renderCharacterSheet();
  }
}

async function saveCharacterSheet() {
  if (!state.characterSheet || !state.agent) return;
  setCharacterSheetSaveState('saving');
  try {
    const response = await fetch('/api/agent/character-sheet', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheet: state.characterSheet })
    });
    if (!response.ok) throw new Error('No se pudo guardar la ficha.');
    const payload = await response.json();
    state.characterSheet = normalizeCharacterSheetPayload(payload.sheet, state.agent);
    setCharacterSheetSaveState('saved');
    renderCharacterSheet();
  } catch (err) {
    setCharacterSheetSaveState('error');
  }
}

function adjustSheetMetric(metric, delta) {
  if (!state.characterSheet) return;
  if (metric === 'health') {
    const next = Math.max(0, Math.min(state.characterSheet.health_current + delta, state.characterSheet.health_max));
    if (next === state.characterSheet.health_current) return;
    state.characterSheet.health_current = next;
  } else if (metric === 'stability') {
    const next = Math.max(
      0,
      Math.min(state.characterSheet.stability_current + delta, state.characterSheet.stability_max)
    );
    if (next === state.characterSheet.stability_current) return;
    state.characterSheet.stability_current = next;
  } else {
    return;
  }
  renderCharacterSheet();
  saveCharacterSheet();
}

function spendGeneralSkill(skillId) {
  if (!state.characterSheet) return;
  const skill = state.characterSheet.general_skills.find((entry) => entry.id === skillId);
  if (!skill || skill.current <= 0) return;
  skill.current = Math.max(0, skill.current - 1);
  renderCharacterSheet();
  saveCharacterSheet();
}

function toggleInvestigationPanel(skillId) {
  if (!state.characterSheetOpenPanels) return;
  if (state.characterSheetOpenPanels.has(skillId)) {
    state.characterSheetOpenPanels.delete(skillId);
  } else {
    state.characterSheetOpenPanels.add(skillId);
  }
  renderCharacterSheet();
}

function selectInvestigationSpend(skillId, amount) {
  state.characterSheetSelections[skillId] = amount;
  renderCharacterSheet();
}

function clearInvestigationSpend(skillId) {
  delete state.characterSheetSelections[skillId];
  state.characterSheetOpenPanels.delete(skillId);
  renderCharacterSheet();
}

function applyInvestigationSpend(skillId) {
  if (!state.characterSheet) return;
  const skill = state.characterSheet.investigation_skills.find((entry) => entry.id === skillId);
  const amount = Number(state.characterSheetSelections[skillId] || 0);
  if (!skill || amount <= 0) return;
  skill.current = Math.max(0, skill.current - amount);
  delete state.characterSheetSelections[skillId];
  state.characterSheetOpenPanels.delete(skillId);
  renderCharacterSheet();
  saveCharacterSheet();
}

function refreshCharacterSheetPools() {
  if (!state.characterSheet) return;
  state.characterSheet.general_skills.forEach((skill) => {
    skill.current = skill.max;
  });
  state.characterSheet.investigation_skills.forEach((skill) => {
    skill.current = skill.max;
  });
  state.characterSheetSelections = {};
  state.characterSheetOpenPanels = new Set();
  renderCharacterSheet();
  saveCharacterSheet();
}
const dossierList = document.getElementById('dossier-list');
const dossierDetail = document.getElementById('dossier-detail');
const dossierSearch = document.getElementById('dossier-search');
const dossierListAdmin = document.getElementById('dossier-list-admin');
const dossierDetailAdmin = document.getElementById('dossier-detail-admin');
const dossierSearchAdmin = document.getElementById('dossier-search-admin');
const agentGraphContainer = document.getElementById('agent-graph');
const agentGraphSearchInput = document.getElementById('agent-graph-search');
const agentGraphSuggestions = document.getElementById('agent-graph-suggestions');
const agentGraphSelect = document.getElementById('agent-graph-entity');
const agentGraphSummary = document.getElementById('agent-graph-summary');
const agentGraphFullscreenBtn = document.getElementById('agent-graph-fullscreen');
const agentGraphAddBtn = document.getElementById('agent-graph-add');
const agentGraphClearBtn = document.getElementById('agent-graph-clear');
const agentGraphChips = document.getElementById('agent-graph-chips');
const dmGraphContainer = document.getElementById('dm-graph');
const dmGraphSelect = document.getElementById('dm-graph-entity');
const dmGraphSearchInput = document.getElementById('dm-graph-search');
const dmGraphSuggestions = document.getElementById('dm-graph-suggestions');
const dmGraphSummary = document.getElementById('dm-graph-summary');
const dmGraphFullscreenBtn = document.getElementById('dm-graph-fullscreen');
const dmGraphAddBtn = document.getElementById('dm-graph-add');
const dmGraphClearBtn = document.getElementById('dm-graph-clear');
const dmGraphChips = document.getElementById('dm-graph-chips');
let dmGraphApi = null;
let agentGraphApi = null;
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
const poiEntityLinksInput = document.getElementById('poi-entity-links');
const entityResetBtn = document.getElementById('entity-reset');
const entityMelInput = document.getElementById('entity-mel');
const entityMelEntry = document.getElementById('entity-mel-entry');
const entityMelAddBtn = document.getElementById('entity-mel-add');
const entityMelChips = document.getElementById('entity-mel-chips');
const entityLinksSearch = document.getElementById('entity-links-search');
const entityLinksSuggestions = document.getElementById('entity-links-suggestions');
const entityLinksChips = document.getElementById('entity-links-chips');
const poiEntityLinksSearch = document.getElementById('poi-entity-links-search');
const poiEntityLinksSuggestions = document.getElementById('poi-entity-links-suggestions');
const poiEntityLinksChips = document.getElementById('poi-entity-links-chips');
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
const entityDeleteBtns = document.querySelectorAll('[data-entity-delete]'); // buttons in layout
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
const dmMobileEditExit = document.getElementById('dm-mobile-edit-exit');
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
const mobileMapTopbar = document.getElementById('mobile-map-topbar');

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

const entityLinksSelect = {
  input: entityLinksSearch,
  suggestions: entityLinksSuggestions,
  chips: entityLinksChips,
  hidden: entityLinksInput
};

const poiEntityLinksSelect = {
  input: document.getElementById('poi-entity-links-search'),
  suggestions: document.getElementById('poi-entity-links-suggestions'),
  chips: document.getElementById('poi-entity-links-chips'),
  hidden: document.getElementById('poi-entity-links')
};

const unlockOverlay = document.getElementById('unlock-overlay');
const unlockHint = document.getElementById('unlock-hint');
const unlockForm = document.getElementById('unlock-form');
const unlockInput = document.getElementById('unlock-code-input');
const unlockClose = document.getElementById('unlock-close');
const unlockConfirm = document.getElementById('unlock-confirm');
const lightbox = document.getElementById('image-lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const base3dRoot = document.getElementById('base3d-root');
const base3dCanvas = document.getElementById('base3d-canvas');
const baseZoneName = document.getElementById('base-zone-name');
const baseZoneStatus = document.getElementById('base-zone-status');
const baseZoneNote = document.getElementById('base-zone-note');
const baseZoneModule = document.getElementById('base-zone-module');
const baseDetailTitle = document.getElementById('base-detail-title');
const baseDetailStatus = document.getElementById('base-detail-status');
const baseDetailEvent = document.getElementById('base-detail-event');
const baseDetailAccess = document.getElementById('base-detail-access');
const baseDetailNotes = document.getElementById('base-detail-notes');
const baseActivityList = document.getElementById('base-activity-list');
const baseEditorToggle = document.getElementById('base-editor-toggle');
const baseEditorBody = document.getElementById('base-editor-body');
const baseEditorText = document.getElementById('base-editor-text');
const baseEditorSave = document.getElementById('base-editor-save');
const baseEditorCancel = document.getElementById('base-editor-cancel');
const baseVisualModeSelect = document.getElementById('base-visual-mode');
const baseVisualPaletteSelect = document.getElementById('base-visual-palette');
const baseFocusCard = document.getElementById('base-focus-card');
const baseFocusLink = document.getElementById('base-focus-link');
const baseFocusLinkLine = baseFocusLink?.querySelector('polyline');
const baseFullscreenToggle = document.getElementById('base-fullscreen-toggle');
const baseResetCamera = document.getElementById('base-reset-camera');

const baseZoneFallback = {
  zone_cmd: {
    id: 'zone_cmd',
    code: 'CMD-01',
    name: 'COMANDO',
    status: 'normal',
    accessLevel: 'L4',
    lastEvent: 'SINCRONIA_OK // 00:13:22Z',
    notes: ['Consola principal en linea.', 'Rutas de control redundantes activas.'],
    activityLog: [
      { ts: '00:13:22Z', level: 'INFO', msg: 'Sincronia de mainframe normal' },
      { ts: '00:09:41Z', level: 'INFO', msg: 'Chequeo de rele completado' },
      { ts: '00:04:07Z', level: 'TRACE', msg: 'Barrido de telemetria registrado' }
    ]
  },
  zone_lab: {
    id: 'zone_lab',
    code: 'LAB-03',
    name: 'LABORATORIO',
    status: 'alert',
    accessLevel: 'L3',
    lastEvent: 'CALIBRACION // 00:06:18Z',
    notes: ['Sensores recalibrados.', 'Mantener acceso restringido.'],
    activityLog: [
      { ts: '00:06:18Z', level: 'WARN', msg: 'Calibracion de red de sensores' },
      { ts: '00:02:55Z', level: 'INFO', msg: 'Bahia de muestras sellada' },
      { ts: '00:01:12Z', level: 'TRACE', msg: 'Filtros de aire estables' }
    ]
  },
  zone_arm: {
    id: 'zone_arm',
    code: 'ARM-02',
    name: 'ARMERIA',
    status: 'normal',
    accessLevel: 'L3',
    lastEvent: 'ESCANEO_TAQUILLAS // 00:11:03Z',
    notes: ['Inventario nominal.', 'Acceso bajo autorizacion.'],
    activityLog: [
      { ts: '00:11:03Z', level: 'INFO', msg: 'Escaneo de taquillas correcto' },
      { ts: '00:07:22Z', level: 'INFO', msg: 'Conteo de municion sincronizado' },
      { ts: '00:03:45Z', level: 'TRACE', msg: 'Cierre de puerta verificado' }
    ]
  },
  zone_gar: {
    id: 'zone_gar',
    code: 'GAR-04',
    name: 'GARAJE',
    status: 'normal',
    accessLevel: 'L2',
    lastEvent: 'BAHIA_VEHICULOS // 00:08:32Z',
    notes: ['Bahia operativa.', 'Sin obstrucciones registradas.'],
    activityLog: [
      { ts: '00:08:32Z', level: 'INFO', msg: 'Bahia de vehiculos operativa' },
      { ts: '00:05:09Z', level: 'INFO', msg: 'Ruta despejada' },
      { ts: '00:01:39Z', level: 'TRACE', msg: 'Niveles de combustible verificados' }
    ]
  },
  zone_med: {
    id: 'zone_med',
    code: 'MED-05',
    name: 'MEDICO',
    status: 'normal',
    accessLevel: 'L2',
    lastEvent: 'CIERRE_SUMINISTROS // 00:10:10Z',
    notes: ['Suministros dentro de umbral.', 'Revision de inventario pendiente.'],
    activityLog: [
      { ts: '00:10:10Z', level: 'INFO', msg: 'Cierre de suministros correcto' },
      { ts: '00:06:24Z', level: 'INFO', msg: 'Chequeo de triaje' },
      { ts: '00:02:08Z', level: 'TRACE', msg: 'Camara frigorifica estable' }
    ]
  },
  zone_sec: {
    id: 'zone_sec',
    code: 'SEC-06',
    name: 'SEGURIDAD',
    status: 'lockdown',
    accessLevel: 'L4',
    lastEvent: 'PERIMETRO // 00:12:05Z',
    notes: ['Perimetro en cierre controlado.', 'Solo acceso con clave de mando.'],
    activityLog: [
      { ts: '00:12:05Z', level: 'ALERT', msg: 'Bloqueo de perimetro' },
      { ts: '00:07:58Z', level: 'INFO', msg: 'Barrido de camaras' },
      { ts: '00:03:26Z', level: 'TRACE', msg: 'Prueba de intrusion correcta' }
    ]
  }
};

const baseState = {
  selectedZoneId: 'zone_cmd',
  activeMode: 'ALL',
  zonesData: {},
  detailTimer: null,
  editorOpen: false,
  editorDirty: false,
  editorZoneId: null,
  focusLinkRaf: null,
  focusLinkPos: null,
  focusCardPos: null,
  focusCardSize: null,
  isOverview: false,
  openModuleByZone: {},
  activeModuleByZone: {},
  visualDefaultsApplied: false,
  baseViewActivated: false
};

const base3d = createBase3d();

async function initBaseModule() {
  if (!baseZoneName || !baseZoneStatus || !baseDetailTitle) return;
  ensureBaseVisualDefaults();
  initBaseFullscreenToggle();
  initBaseResetCamera();
  if (baseVisualModeSelect) {
    baseVisualModeSelect.addEventListener('change', applyBaseVisualSettings);
  }
  if (baseVisualPaletteSelect) {
    baseVisualPaletteSelect.addEventListener('change', applyBaseVisualSettings);
  }
  if (baseEditorToggle) {
    baseEditorToggle.addEventListener('click', () => {
      if (baseState.editorOpen) {
        closeBaseEditor({ preserveText: false });
      } else {
        openBaseEditor(baseState.selectedZoneId);
      }
    });
  }
  if (baseEditorCancel) {
    baseEditorCancel.addEventListener('click', () => closeBaseEditor({ preserveText: false }));
  }
  if (baseEditorText) {
    baseEditorText.addEventListener('input', () => {
      baseState.editorDirty = true;
    });
  }
  if (baseEditorSave) {
    baseEditorSave.addEventListener('click', async () => {
      await saveBaseEditor();
    });
  }
  baseState.zonesData = await loadBaseZoneData();
  baseState.activeModuleByZone = syncActiveModules(baseState.zonesData, {});
  if (base3dCanvas) {
  base3d.init({
    canvas: base3dCanvas,
    root: base3dRoot,
    zonesData: baseState.zonesData,
    activeModules: baseState.activeModuleByZone,
    onSelect: (zoneId) => selectBaseZone(zoneId, { source: 'three', force: true }),
    onSelectModule: (zoneId, moduleId) => setBaseActiveModule(zoneId, moduleId),
    onToggleFullscreen: () => toggleBaseFullscreen(),
    onFlyOff: () => {
      baseState.isOverview = true;
      baseState.focusLinkPos = null;
      baseState.focusCardPos = null;
      baseFocusCard?.classList.add('is-hidden');
      baseFocusLink?.classList.add('hidden');
      baseFocusLinkLine?.setAttribute('points', '0,0 0,0 0,0');
    }
  });
  }
  applyBaseVisualSettings();
  startBaseFocusLinkLoop();
  selectBaseZone(baseState.selectedZoneId, { immediateFocus: true });
}

async function loadBaseZoneData() {
  const apiZones = await fetchEntropiaZones();
  if (apiZones) return mergeBaseZoneData(apiZones);
  showMessage('Entropia: requiere sesion para cargar zonas.', true);
  return mergeBaseZoneData(null);
}

async function refreshBaseZoneData(options = {}) {
  const { silent = false } = options;
  const zones = await fetchEntropiaZones();
  if (!zones) {
    if (!silent) showMessage('Entropia: requiere sesion para cargar zonas.', true);
    return;
  }
  baseState.zonesData = mergeBaseZoneData(zones);
  baseState.activeModuleByZone = syncActiveModules(baseState.zonesData, baseState.activeModuleByZone);
  base3d.setZonesData(baseState.zonesData);
  base3d.setActiveModules?.(baseState.activeModuleByZone);
  const zoneIds = Object.keys(baseState.zonesData);
  if (!zoneIds.length) return;
  if (!baseState.selectedZoneId || !baseState.zonesData[baseState.selectedZoneId]) {
    baseState.selectedZoneId = zoneIds[0];
  }
  selectBaseZone(baseState.selectedZoneId, { immediateFocus: true, force: true });
}

function applyBaseVisualSettings() {
  const mode = baseVisualModeSelect?.value || 'subtle';
  const palette = baseVisualPaletteSelect?.value || 'standard';
  base3d.setVisualMode?.(mode);
  base3d.setPalette?.(palette);
  if (base3dRoot) {
    base3dRoot.dataset.visual = mode;
    base3dRoot.dataset.palette = palette;
  }
}

function ensureBaseVisualDefaults() {
  if (baseState.visualDefaultsApplied) return;
  if (baseVisualModeSelect) {
    baseVisualModeSelect.value = 'dramatic';
  }
  if (baseVisualPaletteSelect) {
    baseVisualPaletteSelect.value = 'amber';
  }
  baseState.visualDefaultsApplied = true;
}

function updateBaseFocusLink() {
  if (!baseFocusLink || !baseFocusLinkLine || !baseFocusCard || !base3dRoot) return;
  if (!baseState.selectedZoneId) {
    baseFocusLink.classList.add('hidden');
    baseFocusCard.classList.add('is-hidden');
    base3dRoot.classList.remove('has-focus');
    return;
  }
  baseFocusCard.classList.toggle('is-hidden', baseState.isOverview);
  baseFocusLink.classList.toggle('hidden', baseState.isOverview);
  base3dRoot.classList.toggle('has-focus', !baseState.isOverview);
  const zonePos = base3d.getZoneScreenPosition?.(baseState.selectedZoneId);
  const rootRect = base3dRoot.getBoundingClientRect();
  if (
    !zonePos ||
    !rootRect.width ||
    !rootRect.height ||
    !Number.isFinite(zonePos.x) ||
    !Number.isFinite(zonePos.y)
  ) {
    baseFocusLink.classList.add('hidden');
    return;
  }
  if (!baseState.focusCardSize) {
    baseState.focusCardSize = {
      width: baseFocusCard.offsetWidth,
      height: baseFocusCard.offsetHeight
    };
  }
  const cardSize = baseState.focusCardSize;
  if (!cardSize.width || !cardSize.height) {
    baseFocusLink.classList.add('hidden');
    return;
  }
  const posCache = baseState.focusLinkPos;
  if (!posCache || posCache.zoneId !== baseState.selectedZoneId) {
    baseState.focusLinkPos = {
      zoneId: baseState.selectedZoneId,
      x: zonePos.x,
      y: zonePos.y
    };
  } else {
    const t = 0.3;
    posCache.x = lerp(posCache.x, zonePos.x, t);
    posCache.y = lerp(posCache.y, zonePos.y, t);
  }
  const padding = 14;
  const offset = 26;
  const zoneX = baseState.focusLinkPos.x - rootRect.left;
  const zoneY = baseState.focusLinkPos.y - rootRect.top;
  const isMobileBase =
    isMobileView() && document.body?.dataset.mobileTab === 'base';
  let targetX;
  let targetY;
  if (isMobileBase) {
    targetX = (rootRect.width - cardSize.width) * 0.5;
    targetY = (rootRect.height - cardSize.height) * 0.5;
  } else {
    const isRightSide = zoneX > rootRect.width * 0.6;
    const isBottomSide = zoneY > rootRect.height * 0.55;
    targetX = zoneX + (isRightSide ? -offset - cardSize.width : offset);
    targetY = zoneY + (isBottomSide ? -offset - cardSize.height : offset);
  }
  targetX = Math.min(Math.max(padding, targetX), rootRect.width - cardSize.width - padding);
  targetY = Math.min(Math.max(padding, targetY), rootRect.height - cardSize.height - padding);
  if (!baseState.focusCardPos || baseState.focusCardPos.zoneId !== baseState.selectedZoneId) {
    baseState.focusCardPos = { zoneId: baseState.selectedZoneId, x: targetX, y: targetY };
  } else {
    const t = 0.22;
    baseState.focusCardPos.x = lerp(baseState.focusCardPos.x, targetX, t);
    baseState.focusCardPos.y = lerp(baseState.focusCardPos.y, targetY, t);
  }
  const cardX = baseState.focusCardPos.x;
  const cardY = baseState.focusCardPos.y;
  baseFocusCard.style.left = `${cardX.toFixed(2)}px`;
  baseFocusCard.style.top = `${cardY.toFixed(2)}px`;

  const anchorX = cardX + cardSize.width * 0.5;
  const anchorY = cardY + cardSize.height * 0.5;
  const x1 = anchorX;
  const y1 = anchorY;
  const x2 = zoneX;
  const y2 = zoneY;
  baseFocusLink.setAttribute('viewBox', `0 0 ${rootRect.width} ${rootRect.height}`);
  const bendX = x1 + (x2 - x1) * 0.6;
  const bendY = y1;
  baseFocusLinkLine.setAttribute(
    'points',
    `${x1.toFixed(2)},${y1.toFixed(2)} ${bendX.toFixed(2)},${bendY.toFixed(2)} ${x2.toFixed(2)},${y2.toFixed(2)}`
  );
  baseFocusLink.classList.remove('hidden');
}

function lerp(from, to, t) {
  return from + (to - from) * t;
}

function initBaseFullscreenToggle() {
  if (!baseFullscreenToggle || !base3dRoot) return;
  if (!document?.fullscreenEnabled) {
    baseFullscreenToggle.classList.add('hidden');
    return;
  }
  const updateLabel = () => {
    const isFullscreen = document.fullscreenElement === base3dRoot;
    baseFullscreenToggle.textContent = isFullscreen ? '[x]' : '[ ]';
    baseFullscreenToggle.setAttribute('aria-pressed', String(isFullscreen));
    baseFullscreenToggle.classList.toggle('is-active', isFullscreen);
  };
  baseFullscreenToggle.addEventListener('click', async () => {
    await toggleBaseFullscreen();
  });
  document.addEventListener('fullscreenchange', () => {
    updateLabel();
    base3d.resize?.();
  });
  updateLabel();
}

function initBaseResetCamera() {
  if (!baseResetCamera) return;
  baseResetCamera.addEventListener('click', () => {
    base3d.resetCamera?.({ immediate: true, duration: 600 });
  });
}

async function toggleBaseFullscreen() {
  if (!document?.fullscreenEnabled || !base3dRoot) return;
  if (document.fullscreenElement === base3dRoot) {
    await document.exitFullscreen();
    return;
  }
  try {
    await base3dRoot.requestFullscreen();
  } catch (error) {
    showMessage('No se pudo activar pantalla completa.', true);
  }
}

function startBaseFocusLinkLoop() {
  if (!baseFocusLink) return;
  if (baseState.focusLinkRaf) {
    cancelAnimationFrame(baseState.focusLinkRaf);
  }
  const tick = () => {
    updateBaseFocusLink();
    baseState.focusLinkRaf = requestAnimationFrame(tick);
  };
  baseState.focusLinkRaf = requestAnimationFrame(tick);
}

function setBaseActiveModule(zoneId, moduleId) {
  if (!zoneId || !moduleId) return;
  const zone = baseState.zonesData[zoneId];
  if (!zone) return;
  const modules = Array.isArray(zone.modules) ? zone.modules : [];
  const exists = modules.some((module) => module && module.module_id === moduleId);
  if (!exists) return;
  baseState.activeModuleByZone[zoneId] = moduleId;
  base3d.setActiveModule?.(zoneId, moduleId);
  if (zoneId === baseState.selectedZoneId) {
    updateBaseFocusPanel(zone);
  }
}

function selectBaseZone(zoneId, options = {}) {
  const zoneData = baseState.zonesData[zoneId];
  if (!zoneData) return;
  const isSame = baseState.selectedZoneId === zoneId;
  const allowSameToggle = options.source === 'three' && isSame;
  baseState.selectedZoneId = zoneId;
  const activeModuleId = ensureActiveModuleForZone(zoneData);
  if (activeModuleId) {
    base3d.setActiveModule?.(zoneId, activeModuleId);
  }
  if (!allowSameToggle) {
    baseState.isOverview = false;
    baseFocusCard?.classList.remove('is-hidden');
    baseFocusLink?.classList.remove('hidden');
  }
  if (baseState.editorOpen && baseState.editorDirty && baseState.editorZoneId !== zoneId) {
    showMessage('Edicion sin guardar descartada.', true);
    baseState.editorDirty = false;
  }
  updateBaseFocusPanel(zoneData);
  if (baseState.detailTimer) {
    window.clearTimeout(baseState.detailTimer);
  }
  baseState.detailTimer = window.setTimeout(() => {
    updateBaseDetailPanel(zoneData);
  }, 150);
  if (baseState.editorOpen) {
    openBaseEditor(zoneId);
  }
  base3d.setSelection(zoneId);
  baseState.focusLinkPos = null;
  baseState.focusCardPos = null;
  if (allowSameToggle) {
    baseState.isOverview = !baseState.isOverview;
    if (baseState.isOverview) {
      baseFocusCard?.classList.add('is-hidden');
      baseFocusLink?.classList.add('hidden');
      baseFocusLinkLine?.setAttribute('points', '0,0 0,0 0,0');
      base3d.flyOff({ delay: options.immediateFocus ? 0 : 150 });
    } else {
      baseFocusCard?.classList.remove('is-hidden');
      baseFocusLink?.classList.remove('hidden');
      base3d.focusZone(zoneId, {
        delay: options.immediateFocus ? 0 : 150,
        immediate: Boolean(options.immediateFocus)
      });
    }
    updateBaseFocusLink();
    return;
  }
  if (!isSame || options.force) {
    base3d.focusZone(zoneId, {
      delay: options.immediateFocus ? 0 : 150,
      immediate: Boolean(options.immediateFocus)
    });
  }
  updateBaseFocusLink();
}

function updateBaseFocusPanel(zoneData) {
  if (baseZoneName) baseZoneName.textContent = zoneData.name;
  if (baseZoneNote) {
    baseZoneNote.textContent = zoneData.summary || 'SISTEMA: SIN RESUMEN';
  }
  if (baseZoneModule) {
    const label = getActiveModuleLabel(zoneData);
    baseZoneModule.textContent = label ? `MODULO ACTIVO: ${label}` : '';
    baseZoneModule.classList.toggle('is-hidden', !label);
  }
  baseState.focusCardSize = null;
  renderBaseStatusPills(zoneData.tags || [], zoneData.modules || []);
}

function updateBaseDetailPanel(zoneData) {
  if (baseDetailTitle) {
    const code = zoneData.code ? String(zoneData.code) : String(zoneData.id || '');
    baseDetailTitle.textContent = `${code} ${zoneData.name}`.trim();
  }
  const metrics = getZoneMetrics(zoneData.modules || []);
  if (baseDetailStatus) baseDetailStatus.textContent = String(metrics.total);
  if (baseDetailEvent) baseDetailEvent.textContent = String(metrics.available);
  if (baseDetailAccess) baseDetailAccess.textContent = String(metrics.locked);
  if (baseDetailNotes) baseDetailNotes.textContent = zoneData.summary || 'SIN RESUMEN';
  renderBaseModulesList(zoneData.modules || []);
}

function renderBaseStatusPills(tags = [], modules = []) {
  if (!baseZoneStatus) return;
  baseZoneStatus.innerHTML = '';
  const safeTags = Array.isArray(tags) ? tags.filter(Boolean) : [];
  if (safeTags.length) {
    safeTags.forEach((tag) => {
      const pill = document.createElement('span');
      pill.className = 'badge-soft base-status-pill';
      pill.dataset.status = 'tag';
      pill.textContent = String(tag).toUpperCase();
      baseZoneStatus.appendChild(pill);
    });
    return;
  }

  const metrics = getZoneMetrics(modules);
  const pill = document.createElement('span');
  pill.className = 'badge-soft base-status-pill';
  pill.dataset.status = 'tag';
  pill.textContent = `MODULOS ${metrics.total} / DISP. ${metrics.available}`;
  baseZoneStatus.appendChild(pill);
}

function renderBaseModulesList(modules) {
  if (!baseActivityList) return;
  baseActivityList.innerHTML = '';
  if (!modules.length) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'base-activity-item';
    emptyItem.textContent = 'Sin modulos asignados.';
    baseActivityList.appendChild(emptyItem);
    return;
  }
  const zoneKey = baseState.selectedZoneId || 'default';
  const openModuleId = baseState.openModuleByZone[zoneKey] || null;
  modules.forEach((module) => {
    if (!module || !module.module_id) return;
    const item = document.createElement('li');
    item.className = 'base-module-item';

    const head = document.createElement('div');
    head.className = 'base-module-head';
    head.addEventListener('click', (event) => {
      if (event.target && event.target.closest('button')) return;
      setBaseActiveModule(zoneKey, module.module_id);
    });

    const label = document.createElement('div');
    label.className = 'base-module-label';
    label.textContent = module.label || module.module_id;

    const state = document.createElement('span');
    state.className = 'base-module-state';
    const isAvailable = module.available === true;
    state.dataset.state = isAvailable ? 'available' : 'locked';
    state.textContent = isAvailable ? 'ACTIVO' : 'BLOQUEADO';

    const meta = document.createElement('div');
    meta.className = 'base-module-meta';
    meta.appendChild(state);

    const body = document.createElement('div');
    body.className = 'base-module-body';

    if (module.summary) {
      const summary = document.createElement('div');
      summary.className = 'base-module-summary';
      summary.textContent = module.summary;
      body.appendChild(summary);
    }

    const items = Array.isArray(module.items) ? module.items : [];
    if (items.length) {
      const list = document.createElement('ul');
      list.className = 'base-module-items';
      items.forEach((entry) => {
        if (!entry || !entry.label) return;
        const line = document.createElement('li');
        line.className = 'base-module-itemline';
        const left = document.createElement('span');
        left.textContent = entry.label;
        const right = document.createElement('span');
        right.textContent = formatModuleItemMeta(entry);
        line.appendChild(left);
        line.appendChild(right);
        list.appendChild(line);
      });
      body.appendChild(list);
    }

    if (body.childElementCount) {
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'base-module-accordion';
      const isOpen = openModuleId === module.module_id;
      toggle.textContent = isOpen ? '−' : '+';
      toggle.setAttribute('aria-expanded', String(isOpen));
      item.classList.toggle('collapsed', !isOpen);
      toggle.addEventListener('click', () => {
        const currentlyOpen = baseState.openModuleByZone[zoneKey] || null;
        const nextOpen = currentlyOpen === module.module_id ? null : module.module_id;
        baseState.openModuleByZone[zoneKey] = nextOpen;
        renderBaseModulesList(modules);
      });
      meta.appendChild(toggle);
      item.appendChild(head);
      item.appendChild(body);
    } else {
      item.appendChild(head);
    }

    if (isDmViewer()) {
      const toggleMode = document.createElement('button');
      toggleMode.type = 'button';
      toggleMode.className = 'base-module-mode-toggle';
      toggleMode.textContent = 'Cambiar modo';
      toggleMode.addEventListener('click', () => {
        module.available = !module.available;
        const zone = baseState.zonesData[zoneKey];
        if (zone && Array.isArray(zone.modules)) {
          const target = zone.modules.find((entry) => entry.module_id === module.module_id);
          if (target) target.available = module.available;
        }
        baseState.openModuleByZone[zoneKey] = module.module_id;
        if (zone) {
          updateBaseFocusPanel(zone);
          updateBaseDetailPanel(zone);
          renderBaseModulesList(zone.modules || modules);
        } else {
          renderBaseModulesList(modules);
        }
      });
      meta.appendChild(toggleMode);
    }

    head.appendChild(label);
    head.appendChild(meta);
    baseActivityList.appendChild(item);
  });
}

function formatModuleItemMeta(item) {
  const parts = [];
  if (item.status) parts.push(String(item.status).toUpperCase());
  if (item.qty != null) parts.push(`x${item.qty}`);
  if (item.notes) parts.push(String(item.notes));
  return parts.length ? parts.join(' · ') : '—';
}

function getZoneMetrics(modules = []) {
  const total = modules.length;
  const available = modules.filter((module) => module && module.available === true).length;
  return { total, available, locked: Math.max(total - available, 0) };
}

function getDefaultActiveModuleId(modules = []) {
  if (!Array.isArray(modules) || !modules.length) return null;
  const available = modules.find((module) => module && module.available === true && module.module_id);
  if (available) return available.module_id;
  const fallback = modules.find((module) => module && module.module_id);
  return fallback ? fallback.module_id : null;
}

function ensureActiveModuleForZone(zoneData) {
  if (!zoneData || !zoneData.id) return null;
  const zoneId = zoneData.id;
  const modules = Array.isArray(zoneData.modules) ? zoneData.modules : [];
  const current = baseState.activeModuleByZone[zoneId];
  const hasCurrent = current && modules.some((module) => module && module.module_id === current);
  const next = hasCurrent ? current : getDefaultActiveModuleId(modules);
  if (next) {
    baseState.activeModuleByZone[zoneId] = next;
  } else {
    delete baseState.activeModuleByZone[zoneId];
  }
  return next || null;
}

function syncActiveModules(zonesData = {}, currentMap = {}) {
  const nextMap = { ...currentMap };
  Object.entries(zonesData).forEach(([zoneId, zoneData]) => {
    if (!zoneData) return;
    const modules = Array.isArray(zoneData.modules) ? zoneData.modules : [];
    const current = nextMap[zoneId];
    const hasCurrent = current && modules.some((module) => module && module.module_id === current);
    if (!hasCurrent) {
      const fallback = getDefaultActiveModuleId(modules);
      if (fallback) {
        nextMap[zoneId] = fallback;
      } else {
        delete nextMap[zoneId];
      }
    }
  });
  return nextMap;
}

function mergeBaseZoneData(apiZones) {
  const merged = { ...baseZoneFallback };
  if (!apiZones || typeof apiZones !== 'object') return merged;
  Object.entries(apiZones).forEach(([zoneId, zoneData]) => {
    if (!zoneId || !zoneData) return;
    const previous = merged[zoneId] || {};
    merged[zoneId] = {
      ...previous,
      ...zoneData,
      modules: Array.isArray(zoneData.modules) ? zoneData.modules : previous.modules || [],
      tags: Array.isArray(zoneData.tags) ? zoneData.tags : previous.tags || []
    };
  });
  return merged;
}

function getActiveModuleLabel(zoneData) {
  if (!zoneData) return '';
  const zoneId = zoneData.id;
  if (!zoneId) return '';
  const modules = Array.isArray(zoneData.modules) ? zoneData.modules : [];
  const activeId = baseState.activeModuleByZone[zoneId];
  if (!activeId) return '';
  const active = modules.find((module) => module && module.module_id === activeId);
  return active ? String(active.label || active.module_id || '').trim() : '';
}

async function fetchEntropiaZones() {
  try {
    const response = await fetch('/api/entropia/zones', { credentials: 'same-origin' });
    if (!response.ok) return null;
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.zones)) return null;
    const normalized = normalizeBaseZones(payload.zones);
    return Object.keys(normalized).length ? normalized : null;
  } catch (error) {
    console.warn('Entropia zones API not available.', error);
    return null;
  }
}

function normalizeBaseZones(raw) {
  const list = Array.isArray(raw) ? raw : Object.values(raw || {});
  const map = {};
  list.forEach((zone) => {
    const normalized = normalizeZoneRecord(zone);
    if (normalized) {
      map[normalized.id] = normalized;
    }
  });
  return map;
}

function normalizeZoneRecord(zone) {
  if (!zone || !zone.id) return null;
  const modules = Array.isArray(zone.modules) ? zone.modules : [];
  const summary =
    zone.summary ||
    (Array.isArray(zone.notes) ? zone.notes.join(' ') : zone.notes) ||
    zone.lastEvent ||
    '';
  return {
    id: String(zone.id),
    code: zone.code ? String(zone.code) : '',
    name: zone.name ? String(zone.name) : String(zone.id),
    summary: summary ? String(summary) : '',
    tags: Array.isArray(zone.tags) ? zone.tags : [],
    modules: modules
      .map((module) => normalizeModuleRecord(module))
      .filter((module) => module),
    status: zone.status || 'normal'
  };
}

function normalizeModuleRecord(module) {
  if (!module) return null;
  const moduleId = module.module_id || module.id;
  if (!moduleId) return null;
  const items = Array.isArray(module.items) ? module.items : [];
  return {
    module_id: String(moduleId),
    label: module.label ? String(module.label) : String(moduleId),
    type: module.type ? String(module.type) : 'capabilities',
    available: module.available === true,
    summary: module.summary ? String(module.summary) : '',
    items: items
      .map((item) => normalizeModuleItem(item))
      .filter((item) => item)
  };
}

function normalizeModuleItem(item) {
  if (!item || !item.label) return null;
  const itemId = item.item_id || item.id;
  return {
    item_id: itemId ? String(itemId) : null,
    label: String(item.label),
    status: item.status ? String(item.status) : '',
    qty: item.qty == null ? null : Number(item.qty),
    notes: item.notes ? String(item.notes) : ''
  };
}

function openBaseEditor(zoneId) {
  if (!baseEditorBody || !baseEditorText) return;
  const zone = baseState.zonesData[zoneId];
  if (!zone) return;
  const payload = buildZoneEditorPayload(zone);
  if (!baseState.editorOpen || baseState.editorZoneId !== zoneId || !baseState.editorDirty) {
    baseEditorText.value = JSON.stringify(payload, null, 2);
    baseState.editorDirty = false;
  }
  baseState.editorOpen = true;
  baseState.editorZoneId = zoneId;
  baseEditorBody.classList.remove('hidden');
  if (baseEditorToggle) baseEditorToggle.textContent = 'Cerrar editor';
}

function closeBaseEditor({ preserveText } = {}) {
  if (!baseEditorBody) return;
  baseState.editorOpen = false;
  baseState.editorDirty = false;
  baseState.editorZoneId = null;
  baseEditorBody.classList.add('hidden');
  if (!preserveText && baseEditorText) baseEditorText.value = '';
  if (baseEditorToggle) baseEditorToggle.textContent = 'Editar zona';
}

function buildZoneEditorPayload(zone) {
  return {
    id: zone.id,
    code: zone.code || '',
    name: zone.name || '',
    summary: zone.summary || '',
    tags: Array.isArray(zone.tags) ? zone.tags : [],
    status: zone.status || 'normal',
    modules: Array.isArray(zone.modules) ? zone.modules : []
  };
}

async function saveBaseEditor() {
  if (!baseEditorText) return;
  let parsed = null;
  try {
    parsed = JSON.parse(baseEditorText.value || '');
  } catch (error) {
    showMessage('JSON invalido en editor de zona.', true);
    return;
  }
  const normalized = normalizeZoneRecord(parsed);
  if (!normalized) {
    showMessage('Zona invalida: falta id o nombre.', true);
    return;
  }
  const zonesMap = { ...baseState.zonesData, [normalized.id]: normalized };
  const payload = Object.values(zonesMap);
  try {
    const response = await fetch('/api/entropia/zones', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ zones: payload })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      showMessage(errorData.error || 'No se pudo guardar Entropia.', true);
      return;
    }
    const saved = await response.json();
    const normalizedMap = normalizeBaseZones(saved.zones || []);
    baseState.zonesData = normalizedMap;
    baseState.activeModuleByZone = syncActiveModules(baseState.zonesData, baseState.activeModuleByZone);
    base3d.setZonesData(baseState.zonesData);
    base3d.setActiveModules?.(baseState.activeModuleByZone);
    const zone = baseState.zonesData[normalized.id];
    if (zone) {
      updateBaseFocusPanel(zone);
      updateBaseDetailPanel(zone);
      if (baseState.editorOpen) openBaseEditor(zone.id);
    }
    showMessage('Zona de Entropia actualizada.');
  } catch (error) {
    showMessage('No se pudo guardar Entropia.', true);
  }
}

async function init() {
  try {
    console.log('DEBUG: init started');
    populateCategoryOptions();
    bindEvents();
    await initBaseModule();
    enterNewEntityMode();
    renderFocalPoiCard();
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
    updateMobileStateBadge();
    await setupMap();
    console.log('DEBUG: setupMap done');
    await hydrateFromSession();
    await loadPois();
    showMessage('AMINA en línea. Vigilancia de la membrana nominal.');
    await loadAgentList();
    console.log('DEBUG: loadAgentList done');
    if (bootScreen && !bootScreen.classList.contains('hidden') && !bootOutput.textContent) {
      startBootSequence();
    }
    applyAgentStatus();
    await loadEntities();
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
  agentPasswordToggle?.addEventListener('click', () => {
    if (!agentSelect?.value) {
      if (agentPassStatus) agentPassStatus.textContent = 'Selecciona un agente.';
      return;
    }
    if (agentPasswordPanel?.classList.contains('hidden')) {
      showAgentPasswordPanel();
    } else {
      hideAgentPasswordPanel();
    }
  });
  agentPassSave?.addEventListener('click', handleAgentPasswordSave);
  agentPassCancel?.addEventListener('click', hideAgentPasswordPanel);
  agentPasswordPanel?.addEventListener('submit', (event) => {
    event.preventDefault();
    handleAgentPasswordSave();
  });
  activityMoreBtn?.addEventListener('click', () => {
    if (!state.activityPagination || state.activityPagination.loading) return;
    loadActivity({ page: state.activityPagination.page + 1, append: true });
  });
  agentSelect?.addEventListener('change', () => {
    agentLoginStatus.textContent = '';
    if (agentPassStatus) agentPassStatus.textContent = '';
    updateAgentPasswordPanel();
  });
  bootDmChangeBtn?.addEventListener('click', () => {
    if (bootDmPasswordPanel?.classList.contains('hidden')) {
      showDmPasswordPanel();
    } else {
      hideDmPasswordPanel();
    }
  });
  bootDmPasswordPanel?.addEventListener('submit', (event) => {
    event.preventDefault();
    handleDmPasswordSave();
  });
  bootDmSaveBtn?.addEventListener('click', handleDmPasswordSave);
  bootDmCancelBtn?.addEventListener('click', hideDmPasswordPanel);
  if (clearanceResetBtn) {
    clearanceResetBtn.addEventListener('click', () => performLogout());
  }
  bootPlayerBtn.addEventListener('click', () => showAgentLogin());
  bootDmBtn.addEventListener('click', () => {
    bootMenu.classList.add('hidden');
    bootDmForm.classList.add('visible');
    hideDmPasswordPanel();
    bootDmSecretInput.focus();
  });
  bootCancelBtn.addEventListener('click', () => {
    bootDmForm.classList.remove('visible');
    bootDmSecretInput.value = '';
    bootStatus.textContent = '';
    hideDmPasswordPanel();
    bootMenu.classList.remove('hidden');
  });
  bootDmForm.addEventListener('submit', handleBootDmSubmit);
  collapsibleToggles.forEach((toggle) => {
    toggle.addEventListener('click', () => toggleCollapsible(toggle));
  });
  commandMapBtn?.addEventListener('click', () => runCommand('SHOW AMINA MAP'));
  commandInboxBtn?.addEventListener('click', () => runCommand('SHOW AGENT CHAT'));
  commandInput?.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      runCommand(commandInput.value);
    }
  });
  chatForm?.addEventListener('submit', handleChatSubmit);
  chatSyncBtn?.addEventListener('click', () => reloadChatData());
  chatIdentityList?.addEventListener('click', (event) => {
    const target = event.target.closest('[data-chat-identity]');
    if (!target) return;
    const identityId = Number(target.dataset.chatIdentity);
    if (!identityId || Number.isNaN(identityId)) return;
    setActiveIdentity(identityId);
  });
  dmChatOpenBtn?.addEventListener('click', handleDmChatOpen);
  dmChatForm?.addEventListener('submit', handleDmChatSubmit);
  dmChatRefreshBtn?.addEventListener('click', () => reloadChatData());
  dmChatThreadList?.addEventListener('click', (event) => {
    const target = event.target.closest('[data-chat-thread]');
    if (!target) return;
    const threadId = Number(target.dataset.chatThread);
    if (!threadId || Number.isNaN(threadId)) return;
    setActiveThread(threadId);
  });
  dmIdentityForm?.addEventListener('submit', handleDmIdentitySubmit);
  dmIdentityCancelBtn?.addEventListener('click', () => setDmIdentityEditing(null));
  dmIdentityList?.addEventListener('click', (event) => {
    const editBtn = event.target.closest('[data-identity-edit]');
    const deleteBtn = event.target.closest('[data-identity-delete]');
    const item = event.target.closest('[data-identity-id]');
    if (!item) return;
    const identityId = Number(item.dataset.identityId);
    if (deleteBtn) {
      handleDmIdentityDelete(identityId);
      return;
    }
    if (editBtn) {
      const identity = state.chat.identities.find((entry) => entry.id === identityId);
      setDmIdentityEditing(identity || null);
    }
  });
  dmMobileConsoleTabs.forEach((btn) => {
    const tab = btn.dataset.dmConsoleTab;
    if (!tab) return;
    btn.addEventListener('click', () => setMobileDmConsoleTab(tab));
  });
  panelToggleBtn?.addEventListener('click', () => toggleSidebar());
  if (journalSaveBtn) {
    journalSaveBtn.addEventListener('click', handleJournalSave);
  }
  journalSeasonInput?.addEventListener('change', loadJournalEntry);
  journalSessionInput?.addEventListener('change', loadJournalEntry);
  journalPublicInput?.addEventListener('input', () => {
    if (state.dmMode) setJournalStatus('dirty');
  });
  journalDmInput?.addEventListener('input', () => {
    if (state.dmMode) setJournalStatus('dirty');
  });
  agentJournalSaveBtn?.addEventListener('click', async () => {
    if (!agentJournalPublicInput || !agentJournalSaveBtn) return;
    if (!agentJournalPublicInput.isContentEditable) {
      setAgentJournalEditing(true);
      return;
    }
    const ok = await handleAgentJournalSave();
    if (ok) {
      setAgentJournalEditing(false);
    }
  });
  const autoLoadAgentJournal = debounce(loadAgentJournal, 250);
  agentJournalSeasonInput?.addEventListener('change', loadAgentJournal);
  agentJournalSessionInput?.addEventListener('change', loadAgentJournal);
  agentJournalSeasonInput?.addEventListener('input', autoLoadAgentJournal);
  agentJournalSessionInput?.addEventListener('input', autoLoadAgentJournal);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && (state.dmMode || state.agent)) {
      connectChatSocket();
    }
  });
  agentLoginButton.addEventListener('click', handleAgentLogin);
  agentLoginForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    handleAgentLogin();
  });
  agentPassInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAgentLogin();
    }
  });
  logoutButton?.addEventListener('click', () => {
    performLogout();
  });
  if (mobileNav) {
    mobileNav.addEventListener('click', (event) => {
      const target = event.target.closest('[data-mobile-tab]');
      if (!target) return;
      const tab = target.getAttribute('data-mobile-tab');
      if (tab) setMobileTab(tab);
    });
  }
  dmMobileEditExit?.addEventListener('click', () => {
    setMobileDmEditMode(false);
  });
  document.querySelectorAll('.mobile-tab').forEach((btn) => {
    const tab = btn.getAttribute('data-mobile-tab');
    if (!tab) return;
    btn.addEventListener('touchend', (event) => {
      event.preventDefault();
      setMobileTab(tab);
    });
    btn.addEventListener('pointerup', (event) => {
      if (event.pointerType !== 'mouse') {
        event.preventDefault();
        setMobileTab(tab);
      }
    });
  });
  sheetRefreshBtn?.addEventListener('click', () => refreshCharacterSheetPools());
  characterSheetCard?.addEventListener('click', (event) => {
    const adjustBtn = event.target.closest('[data-sheet-adjust]');
    if (adjustBtn) {
      const metric = adjustBtn.dataset.sheetAdjust;
      const delta = Number(adjustBtn.dataset.delta || 0);
      if (!Number.isNaN(delta)) adjustSheetMetric(metric, delta);
      return;
    }
    const generalSpend = event.target.closest('[data-general-skill]');
    if (generalSpend) {
      spendGeneralSkill(generalSpend.dataset.generalSkill);
      return;
    }
    const toggleBtn = event.target.closest('[data-investigation-toggle]');
    if (toggleBtn) {
      toggleInvestigationPanel(toggleBtn.dataset.investigationToggle);
      return;
    }
    const optionBtn = event.target.closest('[data-investigation-option]');
    if (optionBtn) {
      const amount = Number(optionBtn.dataset.spendValue || 0);
      if (amount > 0) {
        selectInvestigationSpend(optionBtn.dataset.investigationOption, amount);
      }
      return;
    }
    const applyBtn = event.target.closest('[data-investigation-apply]');
    if (applyBtn) {
      applyInvestigationSpend(applyBtn.dataset.investigationApply);
      return;
    }
    const cancelBtn = event.target.closest('[data-investigation-cancel]');
    if (cancelBtn) {
      clearInvestigationSpend(cancelBtn.dataset.investigationCancel);
    }
  });

  if (mobileMapTopbar) {
    mobileMapTopbar.remove();
  }
  dmGraphSelect?.addEventListener('change', () => {
    setDmGraphFocus(dmGraphSelect.value);
  });
  dmGraphFullscreenBtn?.addEventListener('click', () => toggleGraphFullscreen(dmGraphContainer));
  dmGraphAddBtn?.addEventListener('click', () => {
    if (state.dmGraphScope === DM_GRAPH_SCOPE.CAMPAIGN) return;
    const selected = dmGraphSearchInput?.dataset?.entityId || state.dmGraphFocusId;
    if (!selected || selected === DM_GRAPH_CAMPAIGN_VALUE) return;
    addGraphSelection('dm', selected);
  });
  dmGraphClearBtn?.addEventListener('click', () => {
    clearGraphSelections('dm');
  });
  if (dmGraphSearchInput) {
    dmGraphSearchInput.addEventListener('input', (e) => {
      clearGraphSearchSelection(dmGraphSearchInput);
      renderDmGraphSearchResults(e.target.value);
    });
    dmGraphSearchInput.addEventListener('focus', (e) => {
      if (e.target.value) renderDmGraphSearchResults(e.target.value);
    });
  }
  document.addEventListener('click', (event) => {
    if (
      dmGraphSuggestions &&
      !dmGraphSuggestions.contains(event.target) &&
      dmGraphSearchInput &&
      !dmGraphSearchInput.contains(event.target)
    ) {
      clearDmGraphSuggestions();
    }
  });

  agentGraphSelect?.addEventListener('change', () => {
    if (agentGraphSelect) setAgentGraphFocus(agentGraphSelect.value);
  });
  agentGraphFullscreenBtn?.addEventListener('click', () => toggleGraphFullscreen(agentGraphContainer));
  agentGraphAddBtn?.addEventListener('click', () => {
    if (state.agentGraphScope === AGENT_GRAPH_SCOPE.CAMPAIGN) return;
    const selected = agentGraphSearchInput?.dataset?.entityId || state.agentGraphFocusId;
    if (!selected || selected === AGENT_GRAPH_CAMPAIGN_VALUE) return;
    addGraphSelection('agent', selected);
  });
  agentGraphClearBtn?.addEventListener('click', () => {
    clearGraphSelections('agent');
  });
  if (agentGraphSearchInput) {
    agentGraphSearchInput.addEventListener('input', (e) => {
      clearGraphSearchSelection(agentGraphSearchInput);
      renderAgentGraphSearchResults(e.target.value);
    });
    agentGraphSearchInput.addEventListener('focus', (e) => {
      if (e.target.value) renderAgentGraphSearchResults(e.target.value);
    });
  }
  document.addEventListener('click', (event) => {
    if (
      agentGraphSuggestions &&
      !agentGraphSuggestions.contains(event.target) &&
      agentGraphSearchInput &&
      !agentGraphSearchInput.contains(event.target)
    ) {
      clearAgentGraphSuggestions();
    }
  });

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-entity-jump]');
    if (!target) return;
    const id = target.getAttribute('data-entity-jump');
    setActiveEntityAgentById(id);
  });

  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-focal-poi-jump]');
    if (!target) return;
    const id = target.getAttribute('data-focal-poi-jump');
    if (!id) return;
    const poiEntity = findPoiEntityById(id);
    if (state.dmMode) {
      const entity = poiEntity || findEntityById(id);
      if (entity) {
        selectAdminEntity(entity);
      }
    } else {
      const targetId = poiEntity ? poiEntity.id : id;
      setActiveEntityAgentById(targetId);
    }
    if (isMobileView()) {
      setMobileTab('database');
    } else {
      setWorkspaceView(state.dmMode ? 'entities' : 'database');
    }
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
    const deleteBtn = event.target.closest('[data-entity-delete]');
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
    { ...entityLinksSelect, showRelationType: true, allowRelationEdit: true },
    () => (state.entities || []).filter((e) => e.type !== 'poi'),
    'entity'
  );
  setupMultiSelect(
    { ...poiEntityLinksSelect, showRelationType: true, allowRelationEdit: true },
    () => (state.entities || []).filter((e) => e.type !== 'poi'),
    'entity'
  );
  if (entityVisibilityInput) {
    entityVisibilityInput.addEventListener('change', toggleUnlockFields);
    toggleUnlockFields();
  }
  entityMelAddBtn?.addEventListener('click', addMelFromInput);
  entityMelEntry?.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      addMelFromInput();
    }
  });
  if (entityMelChips) {
    console.log('MEL chips binding ready', { hasEntry: !!entityMelEntry, hasAdd: !!entityMelAddBtn });
    entityMelChips.addEventListener('click', handleMelChipClick);
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
  unlockForm?.addEventListener('submit', (event) => {
    event.preventDefault();
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
  document.addEventListener('click', (event) => {
    const target = event.target.closest('[data-lightbox-img]');
    if (!target) return;
    const src = target.getAttribute('data-lightbox-img');
    const alt = target.getAttribute('alt') || 'Imagen ampliada';
    openLightbox(src, alt);
  });
  lightbox?.addEventListener('click', (event) => {
    if (event.target.dataset.lightboxClose !== undefined || event.target === lightbox.querySelector('.lightbox-backdrop')) {
      closeLightbox();
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

function clampThreatLevel(raw) {
  const value = Number(raw);
  if (Number.isNaN(value)) return 1;
  return Math.max(1, Math.min(5, value));
}

function resolvePoiIconName(category) {
  return categoryIconNames[category] || 'pdi-unknown';
}

function buildPoiGeoJSON(pois) {
  const features = (pois || []).flatMap((poi, idx) => {
    const id = Number(poi.id);
    const lng = Number(poi.longitude);
    const lat = Number(poi.latitude);
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return [];
    const iconName = resolvePoiIconName(poi.category);
    return [
      {
        type: 'Feature',
        id: Number.isFinite(id) ? id : idx,
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties: {
          id: Number.isFinite(id) ? id : idx,
          name: poi.name || '',
          category: poi.category || '',
          icon: categoryIcons[poi.category] || '⬤',
          icon_name: iconName,
          icon_fallback: !categoryIconNames[poi.category],
          threat_level: clampThreatLevel(poi.threat_level),
          session_tag: poi.session_tag || '',
          veil_status: poi.veil_status || ''
        }
      }
    ];
  });
  return { type: 'FeatureCollection', features };
}

function getPipAngles(count) {
  if (count <= 1) return [-90];
  const start = -140;
  const end = -40;
  const step = (end - start) / (count - 1);
  return Array.from({ length: count }, (_, idx) => start + step * idx);
}

const POI_ICON_SIZE = 64;

function createPoiIconImageData(name) {
  const size = POI_ICON_SIZE;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255, 186, 108, 0.95)';
  ctx.fillStyle = 'rgba(255, 186, 108, 0.95)';
  ctx.lineWidth = Math.max(2, size * 0.06);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  const center = size / 2;
  const pad = size * 0.18;

  const drawPolygon = (points, fill = false) => {
    ctx.beginPath();
    points.forEach(([x, y], idx) => {
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();
    if (fill) ctx.fill();
    ctx.stroke();
  };

  switch (name) {
    case 'pdi-base': {
      drawPolygon(
        [
          [center, pad],
          [size - pad, center],
          [center, size - pad],
          [pad, center]
        ],
        false
      );
      break;
    }
    case 'pdi-crime': {
      ctx.beginPath();
      ctx.moveTo(pad, pad);
      ctx.lineTo(size - pad, size - pad);
      ctx.moveTo(size - pad, pad);
      ctx.lineTo(pad, size - pad);
      ctx.stroke();
      break;
    }
    case 'pdi-cell': {
      drawPolygon(
        [
          [center, pad],
          [size - pad, size - pad],
          [pad, size - pad]
        ],
        false
      );
      break;
    }
    case 'pdi-town': {
      drawPolygon(
        [
          [pad, pad],
          [size - pad, pad],
          [size - pad, size - pad],
          [pad, size - pad]
        ],
        false
      );
      break;
    }
    case 'pdi-industrial': {
      const step = (size - pad * 2) / 4;
      drawPolygon(
        [
          [pad, center - step],
          [pad + step, pad],
          [pad + step * 2, center - step],
          [pad + step * 3, pad],
          [size - pad, center - step],
          [size - pad, size - pad],
          [pad, size - pad]
        ],
        false
      );
      break;
    }
    case 'pdi-natural': {
      ctx.beginPath();
      ctx.arc(center, center, size * 0.22, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(center, center + size * 0.22);
      ctx.lineTo(center, size - pad);
      ctx.stroke();
      break;
    }
    case 'pdi-npc': {
      ctx.beginPath();
      ctx.arc(center, center, size * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'pdi-rumor':
    case 'pdi-unknown':
    default: {
      ctx.font = `600 ${Math.round(size * 0.5)}px "Fira Code", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', center, center + size * 0.04);
      break;
    }
  }

  const imageData = ctx.getImageData(0, 0, size, size);
  return { width: size, height: size, data: imageData.data };
}

function createPipImageData(count) {
  const size = 96;
  const center = size / 2;
  const radius = size * 0.34;
  const pipRadius = size * 0.085;
  const outlineRadius = pipRadius + 1.4;
  const data = new Uint8ClampedArray(size * size * 4);
  const angles = getPipAngles(count);

  const drawDot = (cx, cy, r, color) => {
    const r2 = r * r;
    const minX = Math.max(0, Math.floor(cx - r));
    const maxX = Math.min(size - 1, Math.ceil(cx + r));
    const minY = Math.max(0, Math.floor(cy - r));
    const maxY = Math.min(size - 1, Math.ceil(cy + r));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy > r2) continue;
        const idx = (y * size + x) * 4;
        data[idx] = color[0];
        data[idx + 1] = color[1];
        data[idx + 2] = color[2];
        data[idx + 3] = color[3];
      }
    }
  };

  angles.forEach((deg) => {
    const rad = (deg * Math.PI) / 180;
    const x = center + Math.cos(rad) * radius;
    const y = center + Math.sin(rad) * radius;
    drawDot(x, y, outlineRadius, [46, 28, 12, 220]);
    drawDot(x, y, pipRadius, [255, 186, 108, 235]);
  });

  return { width: size, height: size, data };
}

function ensurePoiImages(map) {
  for (let i = 1; i <= 5; i += 1) {
    const name = `poi-pips-${i}`;
    if (map.hasImage(name)) continue;
    const image = createPipImageData(i);
    map.addImage(name, image, { pixelRatio: 2 });
  }

  const iconNames = [
    'pdi-base',
    'pdi-crime',
    'pdi-cell',
    'pdi-town',
    'pdi-industrial',
    'pdi-natural',
    'pdi-npc',
    'pdi-rumor',
    'pdi-unknown'
  ];
  iconNames.forEach((name) => {
    if (map.hasImage(name)) return;
    const image = createPoiIconImageData(name);
    if (!image) return;
    map.addImage(name, image, { pixelRatio: 2 });
  });
}

function ensurePoiSource(map) {
  const data = buildPoiGeoJSON(state.pois);
  if (map.getSource(POI_SOURCE_ID)) {
    map.getSource(POI_SOURCE_ID).setData(data);
    return;
  }
  map.addSource(POI_SOURCE_ID, {
    type: 'geojson',
    data,
    cluster: true,
    clusterRadius: 52,
    clusterMaxZoom: 13,
    clusterProperties: {
      threat_max: ['max', ['get', 'threat_level']]
    }
  });
}

function ensurePoiLayers(map) {
  if (!map.getLayer(POI_LAYER_IDS.clusters)) {
    map.addLayer({
      id: POI_LAYER_IDS.clusters,
      type: 'circle',
      source: POI_SOURCE_ID,
      filter: ['==', 'cluster', true],
      paint: {
        'circle-color': 'rgba(22, 14, 8, 0.85)',
        'circle-radius': ['step', ['get', 'point_count'], 16, 12, 20, 30, 26],
        'circle-stroke-color': 'rgba(255, 186, 108, 0.7)',
        'circle-stroke-width': 1
      }
    });
  }

  if (!map.getLayer(POI_LAYER_IDS.clusterCount)) {
    map.addLayer({
      id: POI_LAYER_IDS.clusterCount,
      type: 'symbol',
      source: POI_SOURCE_ID,
      filter: ['==', 'cluster', true],
      minzoom: 5,
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-size': ['interpolate', ['linear'], ['zoom'], 6, 10, 10, 12, 13, 13],
        'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
        'text-allow-overlap': true,
        'text-ignore-placement': true
      },
      paint: {
        'text-color': '#ffe1c0',
        'text-halo-color': 'rgba(10, 6, 4, 0.7)',
        'text-halo-width': 1
      }
    });
  }

  if (!map.getLayer(POI_LAYER_IDS.clusterPips)) {
    map.addLayer({
      id: POI_LAYER_IDS.clusterPips,
      type: 'symbol',
      source: POI_SOURCE_ID,
      filter: ['==', 'cluster', true],
      minzoom: 5,
      layout: {
        'icon-image': [
          'match',
          ['to-number', ['get', 'threat_max']],
          1,
          'poi-pips-1',
          2,
          'poi-pips-2',
          3,
          'poi-pips-3',
          4,
          'poi-pips-4',
          5,
          'poi-pips-5',
          'poi-pips-1'
        ],
        'icon-size': ['interpolate', ['linear'], ['zoom'], 6, 0.8, 9, 1.05, 12, 1.25],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      },
      paint: {
        'icon-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.35, 9, 0.6, 12, 0.85, 14, 0.95]
      }
    });
  }

  if (!map.getLayer(POI_LAYER_IDS.ring)) {
    map.addLayer({
      id: POI_LAYER_IDS.ring,
      type: 'circle',
      source: POI_SOURCE_ID,
      filter: ['!=', 'cluster', true],
      minzoom: 9,
      paint: {
        'circle-color': 'rgba(16, 10, 6, 0.65)',
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 13, 10, 15, 12, 18, 14, 21],
        'circle-stroke-color': 'rgba(255, 186, 108, 0.7)',
        'circle-stroke-width': ['interpolate', ['linear'], ['zoom'], 9, 1.2, 12, 1.6, 14, 2]
      }
    });
  }

  if (!map.getLayer(POI_LAYER_IDS.fallback)) {
    map.addLayer({
      id: POI_LAYER_IDS.fallback,
      type: 'circle',
      source: POI_SOURCE_ID,
      filter: ['all', ['!=', 'cluster', true], ['==', 'icon_fallback', true]],
      minzoom: 9,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 2.6, 12, 3.2, 14, 3.6],
        'circle-color': 'rgba(255, 186, 108, 0.85)',
        'circle-translate': [8, -8],
        'circle-translate-anchor': 'viewport'
      }
    });
  }

  if (!map.getLayer(POI_LAYER_IDS.icons)) {
    map.addLayer({
      id: POI_LAYER_IDS.icons,
      type: 'symbol',
      source: POI_SOURCE_ID,
      filter: ['!=', 'cluster', true],
      minzoom: 9,
      layout: {
        'icon-image': ['get', 'icon_name'],
        'icon-size': ['interpolate', ['linear'], ['zoom'], 9, 0.8, 10, 0.95, 12, 1.15, 14, 1.35],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-anchor': 'center',
        'icon-padding': 3
      },
      paint: {}
    });
  }

  if (!map.getLayer(POI_LAYER_IDS.pips)) {
    map.addLayer({
      id: POI_LAYER_IDS.pips,
      type: 'symbol',
      source: POI_SOURCE_ID,
      filter: ['!=', 'cluster', true],
      minzoom: 9,
      layout: {
        'icon-image': [
          'match',
          ['to-number', ['get', 'threat_level']],
          1,
          'poi-pips-1',
          2,
          'poi-pips-2',
          3,
          'poi-pips-3',
          4,
          'poi-pips-4',
          5,
          'poi-pips-5',
          'poi-pips-1'
        ],
        'icon-size': ['interpolate', ['linear'], ['zoom'], 9, 1.15, 10, 1.35, 12, 1.6, 14, 1.9],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-padding': 3
      },
      paint: {
        'icon-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.5, 10, 0.75, 12, 0.95, 14, 1]
      }
    });
  }

  if (!map.getLayer(POI_LAYER_IDS.pipsFocus)) {
    map.addLayer({
      id: POI_LAYER_IDS.pipsFocus,
      type: 'symbol',
      source: POI_SOURCE_ID,
      filter: ['!=', 'cluster', true],
      minzoom: 9,
      layout: {
        'icon-image': [
          'match',
          ['to-number', ['get', 'threat_level']],
          1,
          'poi-pips-1',
          2,
          'poi-pips-2',
          3,
          'poi-pips-3',
          4,
          'poi-pips-4',
          5,
          'poi-pips-5',
          'poi-pips-1'
        ],
        'icon-size': ['interpolate', ['linear'], ['zoom'], 9, 1.25, 10, 1.45, 12, 1.75, 14, 2.05],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'icon-padding': 3
      },
      paint: {
        'icon-opacity': [
          'case',
          ['boolean', ['feature-state', 'hover'], false],
          1,
          ['boolean', ['feature-state', 'selected'], false],
          1,
          0
        ]
      }
    });
  }

  if (!map.getLayer(POI_LAYER_IDS.hit)) {
    map.addLayer({
      id: POI_LAYER_IDS.hit,
      type: 'circle',
      source: POI_SOURCE_ID,
      filter: ['!=', 'cluster', true],
      minzoom: 9,
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 9, 20, 10, 24, 12, 28, 14, 34],
        'circle-color': 'rgba(0,0,0,0)'
      }
    });
  }
}

function bindPoiLayerInteractions(map) {
  if (state.poiLayerBound) return;
  state.poiLayerBound = true;

  map.on('mouseenter', POI_LAYER_IDS.hit, () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', POI_LAYER_IDS.hit, () => {
    if (state.poiHoverId !== null && state.poiHoverId !== undefined) {
      map.setFeatureState({ source: POI_SOURCE_ID, id: state.poiHoverId }, { hover: false });
      state.poiHoverId = null;
    }
    hidePoiThreatTooltip();
    map.getCanvas().style.cursor = '';
  });

  map.on('mousemove', POI_LAYER_IDS.hit, (event) => {
    const feature = event.features?.[0];
    if (!feature) return;
    const id = feature.id;
    if (id === undefined || id === null) return;
    if (state.poiHoverId !== null && state.poiHoverId !== id) {
      map.setFeatureState({ source: POI_SOURCE_ID, id: state.poiHoverId }, { hover: false });
    }
    state.poiHoverId = id;
    map.setFeatureState({ source: POI_SOURCE_ID, id }, { hover: true });
    const poi = state.pois.find((item) => Number(item.id) === Number(feature.properties?.id));
    showPoiThreatTooltip(poi, event.lngLat);
  });

  map.on('click', POI_LAYER_IDS.hit, (event) => {
    const feature = event.features?.[0];
    if (!feature) return;
    const id = feature.properties?.id;
    const poi = state.pois.find((item) => Number(item.id) === Number(id));
    if (poi) {
      setFocalPoi(poi);
      openPoiPopup(poi, event.lngLat);
    }
  });

  map.on('mouseenter', POI_LAYER_IDS.clusters, () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', POI_LAYER_IDS.clusters, () => {
    map.getCanvas().style.cursor = '';
  });

  map.on('click', POI_LAYER_IDS.clusters, (event) => {
    const feature = event.features?.[0];
    const clusterId = feature?.properties?.cluster_id;
    if (!feature || clusterId === undefined || clusterId === null) return;
    const source = map.getSource(POI_SOURCE_ID);
    source.getClusterExpansionZoom(clusterId, (err, zoom) => {
      if (err) return;
      map.easeTo({ center: feature.geometry.coordinates, zoom });
    });
  });
}

function ensurePoiPopup() {
  if (!state.map || state.poiPopup) return;
  state.poiPopup = new mapboxgl.Popup({ offset: 24 });
}

function ensurePoiHoverPopup() {
  if (!state.map || state.poiHoverPopup) return;
  state.poiHoverPopup = new mapboxgl.Popup({
    offset: 16,
    closeButton: false,
    closeOnClick: false,
    className: 'poi-threat-tooltip'
  });
}

function openPoiPopup(poi, lngLatOverride) {
  if (!state.map || !poi) return;
  ensurePoiPopup();
  const lngLat = lngLatOverride || [poi.longitude, poi.latitude];
  state.poiPopup.setLngLat(lngLat).setHTML(buildPopupHtml(poi)).addTo(state.map);
}

function showPoiThreatTooltip(poi, lngLat) {
  if (!state.map || !poi) return;
  ensurePoiHoverPopup();
  state.poiHoverPopup
    .setLngLat(lngLat)
    .setHTML(`<span>Amenaza ${clampThreatLevel(poi.threat_level)}</span>`)
    .addTo(state.map);
}

function hidePoiThreatTooltip() {
  state.poiHoverPopup?.remove();
}

function setPoiSelected(id) {
  if (!state.map || !state.map.getSource(POI_SOURCE_ID)) return;
  if (state.poiSelectedId !== null && state.poiSelectedId !== undefined) {
    state.map.setFeatureState({ source: POI_SOURCE_ID, id: state.poiSelectedId }, { selected: false });
  }
  state.poiSelectedId = id ?? null;
  if (state.poiSelectedId !== null && state.poiSelectedId !== undefined) {
    state.map.setFeatureState({ source: POI_SOURCE_ID, id: state.poiSelectedId }, { selected: true });
  }
}

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
  if (typeof MapboxGeocoder !== 'undefined') {
    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl,
      marker: false,
      placeholder: 'Buscar PdI...',
      localGeocoder: buildPoiGeocoderResults,
      limit: 8,
      filter: (feature) => Boolean(feature?.properties?.id)
    });
    state.mapGeocoder = geocoder;
    geocoder.on('result', (event) => {
      const id = event?.result?.properties?.id;
      if (!id) return;
      const poi = state.pois.find((item) => Number(item.id) === Number(id));
      if (poi) setFocalPoi(poi);
    });
    if (mapFilters) {
      state.map.addControl(geocoder, 'top-left');
      const geocoderEl = geocoder.container || geocoder.onAdd(state.map);
      geocoderEl.classList.add('map-geocoder');
      mapFilters.appendChild(geocoderEl);
    } else {
      state.map.addControl(geocoder, 'top-left');
    }
  }
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
    renderMarkers();
  });
  updateMapInteractionMode();
}

function openLightbox(src, alt = 'Imagen') {
  if (!lightbox || !lightboxImg || !src) return;
  lightboxImg.src = src;
  lightboxImg.alt = alt;
  lightbox.classList.remove('hidden');
}

function closeLightbox() {
  if (!lightbox) return;
  lightbox.classList.add('hidden');
  if (lightboxImg) {
    lightboxImg.src = '';
    lightboxImg.alt = 'Imagen';
  }
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
  try {
    renderMarkers();
  } catch (err) {
    console.error('renderMarkers failed', err);
  }
  try {
    focusMapOnPois();
  } catch (err) {
    console.error('focusMapOnPois failed', err);
  }
  try {
    if (state.poiFocal) {
      const updated = state.pois.find((poi) => poi.id === state.poiFocal.id);
      setFocalPoi(updated || state.pois[0] || null);
    } else if (state.pois.length) {
      setFocalPoi(state.pois[0]);
    } else {
      setFocalPoi(null);
    }
  } catch (err) {
    console.error('setFocalPoi failed', err);
  }
}

function renderMarkers() {
  if (!state.map) return;
  if (!state.map.loaded()) {
    state.map.once('load', renderMarkers);
    return;
  }

  state.poiMarkers.forEach(({ marker, popup }) => {
    marker.remove();
    popup.remove();
  });
  state.poiMarkers.clear();

  ensurePoiImages(state.map);
  ensurePoiSource(state.map);
  ensurePoiLayers(state.map);
  bindPoiLayerInteractions(state.map);
  if (state.poiFocal?.id !== undefined && state.poiFocal?.id !== null) {
    setPoiSelected(state.poiFocal.id);
  }
}

function focusMapOnPois() {
  if (!state.map || !state.pois.length) return;
  const valid = state.pois
    .map((poi) => ({ poi, lng: Number(poi.longitude), lat: Number(poi.latitude) }))
    .filter((entry) => Number.isFinite(entry.lng) && Number.isFinite(entry.lat));
  if (!valid.length) return;
  if (valid.length === 1) {
    const { lng, lat } = valid[0];
    state.map.flyTo({ center: [lng, lat], zoom: 13 });
    return;
  }

  const bounds = valid.reduce((acc, entry) => {
    return acc.extend([entry.lng, entry.lat]);
  }, new mapboxgl.LngLatBounds([valid[0].lng, valid[0].lat], [valid[0].lng, valid[0].lat]));

  state.map.fitBounds(bounds, { padding: 80, maxZoom: 13, duration: 1200 });
}
function buildPopupHtml(poi) {
  const dmNoteHtml = state.dmMode
    ? `<div class="dm-note"><strong>Solo DJ:</strong> ${sanitize(poi.dm_note || 'Sin nota')}</div>`
    : '';

  return `
    <div>
      <h3>${sanitize(poi.name)}</h3>
      <div>${categoryLabels[poi.category] || poi.category} ${categoryIcons[poi.category] || ''}</div>
      <div>Amenaza: ${poi.threat_level}/5</div>
      <div>Membrana: ${sanitize(formatVeilLabel(poi.veil_status))}</div>
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

function formatVeilLabel(value) {
  const key = (value || '').toString().trim().toLowerCase();
  return veilLabels[key] || value || '—';
}

function buildPopupImage(poi) {
  const safeUrl = sanitizeUrlValue(poi.image_url);
  if (!safeUrl) return '';
  return `<div class="map-popup-image"><img src="${safeUrl}" alt="${sanitize(poi.name)} image" data-lightbox-img="${safeUrl}" /></div>`;
}

function renderPoiList() {
  const filtered = getFilteredPois();
  const mobileGrouping = isMobileView();
  renderPoiListInto(poiList, { items: filtered, mobileGrouping });
  if (poiListDm) {
    renderPoiListInto(poiListDm, { items: filtered, mobileGrouping });
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
    const group = document.createElement('div');
    group.className = 'mobile-poi-group';
    group.appendChild(renderSessionHeader(null, tag === 'Sin sesión' ? 'Otras ubicaciones' : `Sesión ${tag}`));
    poisForSession.forEach((poi) => renderPoiItem(poi, group));
    target.appendChild(group);
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
  const headerItem = document.createElement('div');
  headerItem.className = 'poi-session-header';
  headerItem.textContent = label;
  if (target) target.appendChild(headerItem);
  return headerItem;
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
  const isCreature = entityTypeInput?.value === 'criatura';
  entityForm.classList.toggle('is-poi', isPoi);
  entityForm.classList.toggle('is-creature', isCreature);
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
      <span class="badge veil-${poi.veil_status}">Velo ${sanitize(formatVeilLabel(poi.veil_status))}</span>
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
      <span class="badge ${veilClass}">Velo ${sanitize(formatVeilLabel(poi.veil_status))}</span>
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
    img.dataset.lightboxImg = safeImageUrl;
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
  const existingGeocoder = target.querySelector('.map-geocoder');
  target.innerHTML = '';
  const chipsWrap = document.createElement('div');
  chipsWrap.className = 'map-filter-chips';
  const allBtn = document.createElement('button');
  allBtn.textContent = 'Todos';
  allBtn.className = 'filter-chip active';
  allBtn.dataset.category = '';
  chipsWrap.appendChild(allBtn);
  Object.entries(categoryLabels).forEach(([value, label]) => {
    const btn = document.createElement('button');
    btn.textContent = label;
    btn.className = 'filter-chip';
    btn.dataset.category = value;
    chipsWrap.appendChild(btn);
  });
  target.appendChild(chipsWrap);
  if (existingGeocoder) {
    target.appendChild(existingGeocoder);
  }
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
  if (!state.map) return;
  const poi = state.pois.find((item) => Number(item.id) === Number(id));
  if (!poi) return;
  state.map.flyTo({ center: [poi.longitude, poi.latitude], zoom: 12 });
  openPoiPopup(poi);
}

function exitDmMode(silent = false, options = {}) {
  state.dmMode = false;
  state.mobileDmEditMode = false;
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
  loadEntities();
  setWorkspaceView('map');
  syncMobileDmEditMode(true);
}

function activateDmMode() {
  state.dmMode = true;
  state.mobileDmEditMode = false;
  state.agent = null;
  if (dmSecretInput) dmSecretInput.value = '';
  if (dmWarning) dmWarning.textContent = '';
  updateDmVisibility();
  renderPoiList();
  renderMarkers();
  showMessage('Canal de Sr. Verdad conectado. Autorización guardada en memoria.');
  updateRoleLayoutClasses();
  loadEntities();
  loadMissionNotes();
  loadActivity();
  void refreshBaseZoneData({ silent: true });
  setWorkspaceView('map');
  syncMobileDmEditMode(true);
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
  if (poiSubmitButton) poiSubmitButton.disabled = !state.dmMode;
  if (pickButton) pickButton.disabled = !state.dmMode;
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
  if (!state.dmMode) {
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
      'Content-Type': 'application/json'
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
  loadActivity();
}

async function submitPoiFromEntityForm() {
  if (!state.dmMode) {
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

  const entityLinks = parseMultiSelect(poiEntityLinksInput?.value, 'entity')
    .map((link) => ({
      entity_id: link.to_entity_id,
      role_at_poi: link.relation_type || '',
      is_public: link.is_public !== false
    }))
    .filter((link) => link.entity_id);

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
    dm_note: (formIds.dmNote || entityDmNoteInput)?.value?.trim() || '',
    entity_links: entityLinks,
    visibility: entityVisibilityInput?.value || 'agent_public',
    unlock_code: entityUnlockInput?.value?.trim() || '',
    locked_hint: entityLockedHintInput?.value?.trim() || ''
  };

  const isEdit = !!entityIdInput.value;
  const endpoint = isEdit ? `/api/pois/${entityIdInput.value}` : '/api/pois';
  const method = isEdit ? 'PUT' : 'POST';

  try {
    console.debug('[DM] Guardando PdI', payload);
    const response = await fetch(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json'
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
    loadActivity();
  } catch (err) {
    logDebug(`Error guardando PdI: ${err.message}`);
    console.error('[DM] Error guardando PdI', err);
    showMessage('No se pudo guardar el PdI.', true);
  } finally {
    setSavingButton(entitySubmitBtn, false);
  }
}

async function handleDeletePoi(poi) {
  if (!state.dmMode) {
    if (dmWarning) dmWarning.textContent = 'Introduce un código de autorización válido para borrar PdIs.';
    return;
  }
  const confirmed = window.confirm(`¿Borrar ${poi.name}?`);
  if (!confirmed) return;

  const response = await fetch(`/api/pois/${poi.id}`, {
    method: 'DELETE'
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
  loadActivity();
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
  performLogout({ silent: true, message: 'Sesión expirada. Vuelve a autenticarte.' });
}

function resetAuthState() {
  state.dmMode = false;
  state.agent = null;
  state.characterSheet = null;
  state.characterSheetSaveState = 'idle';
  state.characterSheetSelections = {};
  state.characterSheetOpenPanels = new Set();
  state.activeEntityAdmin = null;
  state.activeEntityAgent = null;
  state.activeEntityContext = null;
  if (dmSecretInput) dmSecretInput.value = '';
  if (dmWarning) dmWarning.textContent = '';
  if (activityList) activityList.innerHTML = '';
  if (activityStatus) activityStatus.textContent = 'Esperando sesión...';
  if (state.activityPoll) state.activityPoll.lastSuccessAt = null;
  if (state.activityPagination) {
    state.activityPagination.page = 0;
    state.activityPagination.hasMore = false;
    state.activityPagination.loading = false;
    state.activityPagination.loadedIds = null;
  }
  updateActivityConnectionLabel();
  updateActivityPaginationControls();
  stopActivityPolling();
  updateDmVisibility();
  applyAgentStatus();
  updateRoleLayoutClasses();
}

async function performLogout(options = {}) {
  const { silent = false, message = '' } = options;
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch (err) {
    logDebug(`Logout call failed: ${err.message}`);
  }
  clearLegacyCookies();
  resetAuthState();
  if (!silent && message) {
    showMessage(message, true);
  } else if (!silent) {
    showMessage('Sesión cerrada.');
  }
  showBootScreen();
}

function clearLegacyCookies() {
  deleteCookie('amina_role');
  deleteCookie('amina_secret');
  deleteCookie('amina_agent');
  deleteCookie('agent_active_entity');
}

function showBootScreen() {
  bootScreen.classList.remove('hidden');
  bootDmForm.classList.remove('visible');
  bootDmSecretInput.value = '';
  bootStatus.textContent = '';
  hideDmPasswordPanel();
  bootMenu?.classList.remove('hidden');
  logDebug('Showing boot screen (change clearance)');
  startBootSequence();
  document.body.classList.add('booting');
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
  resetAuthState();
  hideBootScreen();
  showMessage('Vista de agente de campo cargada.');
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
        'x-dm-secret': secret,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password: secret })
    });
    if (!response.ok) {
      if (response.status === 409) {
        bootStatus.textContent = 'Contraseña no configurada. Configúrala primero.';
        showDmPasswordPanel();
      } else if (response.status === 500) {
        const data = await response.json().catch(() => ({ error: 'Servidor mal configurado' }));
        bootStatus.textContent = data.error || 'Error del servidor.';
        logDebug('Error de autenticación de DJ: ' + (data.error || 'Error del servidor'));
      } else {
        bootStatus.textContent = 'Acceso denegado.';
        logDebug('Autenticación de DJ denegada');
      }
      return;
    }
    activateDmMode();
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

async function loadMessages(context) {
  try {
    const params = new URLSearchParams();
    const activeContext = getMessageContext(context);
    const { recipient, session_tag, since, box, unread_only, q, page, page_size } =
      getMessageFilters(activeContext);
    const viewer = getMessageViewer();
    const role = getMessageRole();
    if (recipient) params.append('recipient', recipient);
    if (session_tag) params.append('session_tag', session_tag);
    if (since) params.append('since', since);
    if (box) params.append('box', box);
    if (unread_only) params.append('unread_only', 'true');
    if (q) params.append('q', q);
    if (viewer) params.append('viewer', viewer);
    if (role) params.append('role', role);
    if (page_size) {
      params.append('limit', String(page_size));
      params.append('offset', String((page || 0) * page_size));
    }
    const response = await fetch(`/api/messages${params.toString() ? `?${params.toString()}` : ''}`);
    if (!response.ok) throw new Error('Fallo al cargar mensajes.');
    const messages = await response.json();
    state.messages = messages;
    syncMessagePollState(activeContext, messages);
    renderMessages(messages, activeContext);
  } catch (err) {
    console.warn('Fallo al cargar mensajes', err);
    logDebug(`Error de carga de mensajes: ${err.message}`);
    showMessage('No se pudieron cargar despachos.', true);
  }
}

function getMessageViewer() {
  return state.dmMode ? DM_DEFAULT_SENDER : state.agent?.display || '';
}

function getMessageRole() {
  if (state.dmMode) return 'dm';
  if (state.agent) return 'agent';
  return '';
}

function getUnreadBadge(context) {
  return context === 'dm' ? unreadBadgeDm : unreadBadgeAgent;
}

function updateUnreadBadge(context, count, truncated = false) {
  const badge = getUnreadBadge(context);
  if (!badge) return;
  if (!count) {
    badge.textContent = '';
    badge.classList.add('hidden');
    return;
  }
  badge.textContent = truncated ? `${count}+` : String(count);
  badge.classList.remove('hidden');
}

function syncMessagePollState(context, messages) {
  if (!state.messagePoll || !state.messagePoll.lastNewestId) return;
  state.messagePoll.lastNewestId[context] = messages?.[0]?.id || null;
}

function isReplyPaneOpen() {
  const pane = state.dmMode ? replyPaneDm : replyPane;
  return !!pane && !pane.classList.contains('hidden');
}

function shouldAutoRefreshMessages(context) {
  if (state.activeMessageContext !== context) return false;
  if (getMessageFilters(context).box === 'sent') return false;
  if (isReplyPaneOpen()) return false;
  return true;
}

async function fetchMessageStatus(context, viewer) {
  const unreadLimit = 200;
  const unreadParams = new URLSearchParams({
    viewer,
    unread_only: 'true',
    limit: String(unreadLimit)
  });
  const latestParams = new URLSearchParams({ viewer, limit: '1' });
  const role = getMessageRole();
  if (role) {
    unreadParams.append('role', role);
    latestParams.append('role', role);
  }
  const [unreadRes, latestRes] = await Promise.all([
    fetch(`/api/messages?${unreadParams.toString()}`),
    fetch(`/api/messages?${latestParams.toString()}`)
  ]);
  if (!unreadRes.ok || !latestRes.ok) {
    throw new Error('Fallo al actualizar estado de mensajes.');
  }
  const [unreadMessages, latestMessages] = await Promise.all([
    unreadRes.json(),
    latestRes.json()
  ]);
  const unreadCount = Array.isArray(unreadMessages) ? unreadMessages.length : 0;
  const newest = Array.isArray(latestMessages) ? latestMessages[0] : null;
  return {
    unreadCount,
    unreadTruncated: unreadCount >= unreadLimit,
    newestId: newest?.id || null
  };
}

async function pollMessages() {
  if (!state.messagePoll || state.messagePoll.inFlight) return;
  if (!state.dmMode && !state.agent) return;
  const context = getMessageContext();
  const viewer = getMessageViewer();
  if (!viewer) return;
  state.messagePoll.inFlight = true;
  try {
    const status = await fetchMessageStatus(context, viewer);
    if (!status) return;
    updateUnreadBadge(context, status.unreadCount, status.unreadTruncated);
    state.messagePoll.lastUnread[context] = status.unreadCount;
    if (
      status.newestId &&
      status.newestId !== state.messagePoll.lastNewestId[context] &&
      shouldAutoRefreshMessages(context)
    ) {
      state.messagePoll.lastNewestId[context] = status.newestId;
      await loadMessages(context);
    }
  } catch (err) {
    logDebug(`Message poll failed: ${err.message}`);
  } finally {
    state.messagePoll.inFlight = false;
  }
}

function startMessagePolling() {
  if (!state.messagePoll || state.messagePoll.timer) return;
  pollMessages();
  state.messagePoll.timer = window.setInterval(pollMessages, state.messagePoll.intervalMs);
}

function stopMessagePolling() {
  if (!state.messagePoll || !state.messagePoll.timer) return;
  clearInterval(state.messagePoll.timer);
  state.messagePoll.timer = null;
}

function getMessageSocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}`;
}

function handleMessageSocketMessage(message) {
  if (!message || message.type !== 'message') return;
  pollMessages();
  if (!state.dmMode && state.agent) {
    loadMessageIdentities();
  }
}

function scheduleMessageSocketReconnect() {
  if (state.messageSocketRetry) return;
  state.messageSocketRetry = window.setTimeout(() => {
    state.messageSocketRetry = null;
    connectMessageSocket();
  }, 3000);
}

function connectMessageSocket() {
  const role = getMessageRole();
  if (!role) return;
  if (
    state.messageSocket &&
    (state.messageSocket.readyState === WebSocket.OPEN ||
      state.messageSocket.readyState === WebSocket.CONNECTING) &&
    state.messageSocketRole === role
  ) {
    return;
  }
  disconnectMessageSocket();
  const ws = new WebSocket(getMessageSocketUrl());
  state.messageSocket = ws;
  state.messageSocketRole = role;
  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        type: 'hello',
        role: 'console',
        mode: role,
        viewer: getMessageViewer()
      })
    );
  };
  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      handleMessageSocketMessage(payload);
    } catch (err) {
      logDebug(`Message socket parse failed: ${err.message}`);
    }
  };
  ws.onclose = () => {
    if (state.messageSocket === ws) {
      state.messageSocket = null;
      state.messageSocketRole = null;
    }
    if (state.dmMode || state.agent) {
      scheduleMessageSocketReconnect();
    }
  };
  ws.onerror = (err) => {
    logDebug(`Message socket error: ${err.message || err}`);
  };
}

function disconnectMessageSocket() {
  if (state.messageSocket) {
    state.messageSocket.close();
    state.messageSocket = null;
  }
  state.messageSocketRole = null;
  if (state.messageSocketRetry) {
    clearTimeout(state.messageSocketRetry);
    state.messageSocketRetry = null;
  }
}

function syncMessageSocket() {
  if (!state.dmMode && !state.agent) {
    disconnectMessageSocket();
    return;
  }
  connectMessageSocket();
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
      return (msg.created_by || '').trim() === trimmedViewer && !!msg.reply_to_id;
    }
    if (recipient === trimmedViewer) return true;
    if (preferredPublic.has(recipient)) return true;
    return false;
  });
}

function renderMessages(messages, context) {
  const viewer = getMessageViewer();
  const activeContext = getMessageContext(context);
  state.activeMessageContext = activeContext;
  const filters = getMessageFilters(activeContext);
  const filtered = filterMessagesForViewer(messages, viewer, filters.box);
  state.messages = filtered;
  state.activeMessageIndex = Math.min(
    state.activeMessageIndex,
    Math.max(filtered.length - 1, 0)
  );
  state.activeMessage = filtered[state.activeMessageIndex] || null;
  if (activeContext === 'overlay') {
    return;
  }
  if (state.dmMode) {
    updateMessageList(messageList, filtered, viewer);
    renderMessageReader(messageReader, state.activeMessage, viewer, filters);
  } else {
    updateMessageList(messageListDm, filtered, viewer);
    renderMessageReader(messageReaderDm, state.activeMessage, viewer, filters);
    updateMessageBoxLabel();
  }
}

function updateMessageSelectionUI() {
  const viewer = getMessageViewer();
  if (state.activeMessageContext === 'overlay') {
    return;
  }
  if (state.dmMode) {
    updateMessageList(messageList, state.messages, viewer);
    renderMessageReader(messageReader, state.activeMessage, viewer, getMessageFilters('dm'));
  } else {
    updateMessageList(messageListDm, state.messages, viewer);
    renderMessageReader(messageReaderDm, state.activeMessage, viewer, getMessageFilters('agent'));
  }
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
        ${msg.thread_id ? `<span>Hilo #${sanitize(msg.thread_id)}</span>` : ''}
        ${msg.priority && msg.priority !== 'normal' ? `<span>Prioridad ${sanitize(msg.priority)}</span>` : ''}
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
    showMessage('Despacho eliminado.');
  } catch (err) {
    logDebug(`Delete message failed: ${err.message}`);
    showMessage('No se pudo eliminar el despacho.', true);
  }
}

function showNextMessage() {
  if (!state.messages.length) return;
  state.activeMessageIndex = (state.activeMessageIndex + 1) % state.messages.length;
  state.activeMessage = state.messages[state.activeMessageIndex];
  updateMessageSelectionUI();
}

function showPrevMessage() {
  if (!state.messages.length) return;
  state.activeMessageIndex =
    (state.activeMessageIndex - 1 + state.messages.length) % state.messages.length;
  state.activeMessage = state.messages[state.activeMessageIndex];
  updateMessageSelectionUI();
}

function toggleMessageBoxView() {
  const activeContext = getMessageContext();
  const { box } = getMessageFilters(activeContext);
  const nextBox = box === 'sent' ? '' : 'sent';
  setMessageFilters(activeContext, { box: nextBox, page: 0 });
  state.activeMessageIndex = 0;
  updateMessageBoxLabel();
  loadMessages(activeContext);
}

function updateMessageBoxLabel() {
  if (!msgBoxLabel) return;
  const { box } = getMessageFilters('agent');
  msgBoxLabel.textContent = box === 'sent' ? 'Enviados' : 'Entrada';
  if (msgBoxInboxBtn && msgBoxSentBtn) {
    msgBoxInboxBtn.classList.toggle('active', box !== 'sent');
    msgBoxSentBtn.classList.toggle('active', box === 'sent');
  }
}

function startReply(message) {
  const { pane, body, label } = getReplyElements();
  if (!pane || !body) return;
  if (!state.dmMode && (message?.created_by || '') !== DM_ACTOR) {
    showMessage('Solo se permite responder a despachos del DM.', true);
    return;
  }
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
  if (!state.dmMode && (state.replyTarget.created_by || '') !== DM_ACTOR) {
    showMessage('Solo se permite responder a despachos del DM.', true);
    return;
  }
  const text = body.value.trim();
  if (!text) return;
  const recipient = state.replyTarget.sender || DM_DEFAULT_SENDER;
  const viewer = state.dmMode ? (messageFromInput?.value || DM_DEFAULT_SENDER) : state.agent?.display;
  const payload = {
    sender: viewer || 'Agente de Campo',
    recipient,
    subject: state.replyTarget.subject?.startsWith('Re:') ? state.replyTarget.subject : `Re: ${state.replyTarget.subject}`,
    body: text,
    session_tag: state.replyTarget.session_tag || '',
    reply_to_id: state.replyTarget.id,
    thread_id: state.replyTarget.thread_id || state.replyTarget.id,
    priority: state.replyTarget.priority || 'normal'
  };
  try {
    if (state.dmMode) {
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
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (response.status === 401) {
    performLogout({ message: 'Sesión expirada. Vuelve a autenticarte.' });
    return;
  }
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
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Fallo en la respuesta del agente');
  }
}

async function handleMessageSubmit(event) {
  event.preventDefault();
  const payload = {
    sender: messageFromInput.value.trim(),
    recipient: messageToSelect.value.trim(),
    subject: messageSubjectInput.value.trim(),
    body: messageBodyInput.value.trim(),
    session_tag: messageSessionInput?.value.trim() || ''
  };
  if (state.dmMode) {
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    if (response.status === 401) {
      performLogout({ message: 'Sesión expirada. Vuelve a autenticarte.' });
      return;
    }
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      showMessage(errorData.error || 'Fallo en la emisión.', true);
      return;
    }
    messageForm.reset();
    updateMessageFromField();
    loadMessages();
    loadMessageIdentities();
    showMessage('Mensaje emitido.');
    return;
  }
  if (!state.agent) {
    showMessage('Se requiere sesión activa para emitir.', true);
    return;
  }
  if (!payload.recipient) {
    showMessage('Selecciona una identidad de destino.', true);
    return;
  }
  try {
    await sendAgentMessage(payload);
    messageForm.reset();
    updateMessageFromField();
    loadMessages();
    showMessage('Mensaje enviado.');
  } catch (err) {
    showMessage(err.message || 'Fallo en la emisión.', true);
  }
}

function getChatRole() {
  if (state.dmMode) return 'dm';
  if (state.agent) return 'agent';
  return '';
}

function updateChatStatusLabels() {
  if (chatAgentLabel) {
    chatAgentLabel.textContent = `Agente: ${state.agent?.display || '—'}`;
  }
  if (chatIdentityLabel) {
    const identity = state.chat.identities.find((item) => item.id === state.chat.activeIdentityId);
    chatIdentityLabel.textContent = `Identidad: ${identity ? identity.name : '—'}`;
  }
  if (dmChatActiveLabel) {
    const thread = state.chat.threads.find((item) => item.id === state.chat.activeThreadId);
    if (thread) {
      dmChatActiveLabel.textContent = `${thread.agent_display || thread.agent_username} ↔ ${thread.dm_identity_name}`;
    } else if (state.chat.activeAgentUsername && state.chat.activeDmIdentityId) {
      const agentMeta = state.agents.find((item) => item.username === state.chat.activeAgentUsername);
      const agentLabel = agentMeta?.display || state.chat.activeAgentUsername;
      const identity = state.chat.identities.find(
        (item) => item.id === state.chat.activeDmIdentityId
      );
      dmChatActiveLabel.textContent = `${agentLabel} ↔ ${identity?.name || 'Identidad'}`;
    } else {
      dmChatActiveLabel.textContent = 'Selecciona un par agente/identidad.';
    }
  }
  if (dmChatSessionStatus) {
    const hasSession =
      !!state.chat.activeThreadId ||
      (!!state.chat.activeAgentUsername && !!state.chat.activeDmIdentityId);
    dmChatSessionStatus.textContent = hasSession ? 'Sesión activa' : 'Sin sesión';
    dmChatSessionStatus.dataset.status = hasSession ? 'active' : 'idle';
  }
}

function setJournalStatus(status) {
  state.journalStatus = status;
  if (!dmJournalStatus) return;
  const labels = {
    clean: 'Sin cambios',
    dirty: 'Cambios no guardados',
    saved: 'Guardado'
  };
  dmJournalStatus.textContent = labels[status] || labels.clean;
  dmJournalStatus.dataset.status = status || 'clean';
}

function clearChatState() {
  state.chat.threads = [];
  state.chat.messages = [];
  state.chat.activeThreadId = null;
  state.chat.activeIdentityId = null;
  state.chat.activeAgentUsername = null;
  state.chat.activeDmIdentityId = null;
  renderChatTranscript();
  renderDmChatThreads();
  renderChatIdentityList();
}

function formatChatTimestamp(value, options = {}) {
  if (!value) return '';
  const raw = String(value).trim();
  if (!raw) return '';
  let normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  if (!/Z|[+-]\d{2}:\d{2}$/.test(normalized)) {
    normalized += 'Z';
  }
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }
  return date.toLocaleString('es-ES', { timeZone: 'Europe/Madrid', ...options });
}

function renderChatTranscript() {
  const target = state.dmMode ? dmChatTranscript : chatTranscript;
  if (!target) return;
  if (!state.chat.messages.length) {
    target.textContent = state.dmMode
      ? 'Sin mensajes en esta sesión.'
      : 'Terminal lista. Selecciona una identidad y escribe tu mensaje.';
    return;
  }
  const lines = state.chat.messages.map((msg) => {
    const stamp = formatChatTimestamp(msg.created_at, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    return `[${stamp}] ${msg.sender_label}: ${msg.body}`;
  });
  target.textContent = lines.join('\n');
  target.scrollTop = target.scrollHeight;
}

function renderChatIdentityList() {
  if (!chatIdentityList) return;
  chatIdentityList.innerHTML = '';
  if (!state.chat.identities.length) {
    const empty = document.createElement('div');
    empty.className = 'chat-thread-item';
    empty.textContent = 'Sin identidades disponibles.';
    chatIdentityList.appendChild(empty);
    return;
  }
  state.chat.identities.forEach((identity) => {
    const thread = state.chat.threads.find(
      (item) => item.dm_identity_id === identity.id && item.agent_username === state.agent?.username
    );
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `chat-thread-item ${state.chat.activeIdentityId === identity.id ? 'active' : ''}`;
    card.dataset.chatIdentity = String(identity.id);
    const lastStamp = thread?.last_message_at
      ? formatChatTimestamp(thread.last_message_at, { year: 'numeric', month: '2-digit', day: '2-digit' })
      : 'Sin actividad';
    card.innerHTML = `
      <div>${sanitize(identity.name)}</div>
      <div class="meta">${lastStamp}</div>
    `;
    chatIdentityList.appendChild(card);
  });
}

function renderDmChatThreads() {
  if (!dmChatThreadList) return;
  dmChatThreadList.innerHTML = '';
  if (!state.chat.threads.length) {
    const empty = document.createElement('div');
    empty.className = 'chat-thread-item';
    empty.textContent = 'Sin sesiones activas.';
    dmChatThreadList.appendChild(empty);
    return;
  }
  state.chat.threads.forEach((thread) => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = `chat-thread-item ${state.chat.activeThreadId === thread.id ? 'active' : ''}`;
    card.dataset.chatThread = String(thread.id);
    const lastStamp = thread.last_message_at
      ? formatChatTimestamp(thread.last_message_at, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
      : 'Sin actividad';
    card.innerHTML = `
      <div>${sanitize(thread.agent_display || thread.agent_username)} · ${sanitize(thread.dm_identity_name)}</div>
      <div class="meta">${lastStamp}</div>
    `;
    dmChatThreadList.appendChild(card);
  });
}

async function loadChatIdentities() {
  try {
    const response = await fetch('/api/chat/identities');
    if (!response.ok) throw new Error('Fallo al cargar identidades.');
    const payload = await response.json();
    state.chat.identities = Array.isArray(payload.identities) ? payload.identities : [];
    populateDmChatIdentitySelect();
    renderDmIdentityList();
    renderChatIdentityList();
    updateChatStatusLabels();
  } catch (err) {
    logDebug(`Error de identidades: ${err.message}`);
  }
}

async function loadChatThreads() {
  try {
    const response = await fetch('/api/chat/threads');
    if (!response.ok) throw new Error('Fallo al cargar sesiones.');
    const payload = await response.json();
    state.chat.threads = Array.isArray(payload.threads) ? payload.threads : [];
    renderDmChatThreads();
    renderChatIdentityList();
  } catch (err) {
    logDebug(`Error de sesiones: ${err.message}`);
  }
}

function populateDmChatIdentitySelect() {
  if (!dmChatIdentitySelect) return;
  dmChatIdentitySelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Seleccionar identidad';
  dmChatIdentitySelect.appendChild(placeholder);
  state.chat.identities.forEach((identity) => {
    const opt = document.createElement('option');
    opt.value = String(identity.id);
    opt.textContent = identity.name;
    dmChatIdentitySelect.appendChild(opt);
  });
}

function populateDmChatAgentSelect() {
  if (!dmChatAgentSelect) return;
  dmChatAgentSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Seleccionar agente';
  dmChatAgentSelect.appendChild(placeholder);
  state.agents.forEach(({ username, display }) => {
    const opt = document.createElement('option');
    opt.value = username;
    opt.textContent = display;
    dmChatAgentSelect.appendChild(opt);
  });
}

function renderDmIdentityList() {
  if (!dmIdentityList) return;
  dmIdentityList.innerHTML = '';
  state.chat.identities.forEach((identity) => {
    const row = document.createElement('div');
    row.className = 'dm-identity-item';
    row.dataset.identityId = String(identity.id);
    row.innerHTML = `
      <span>${sanitize(identity.name)}</span>
      <div class="dm-identity-actions">
        <button type="button" class="ghost small" data-identity-edit>Editar</button>
        <button type="button" class="ghost small danger" data-identity-delete>Eliminar</button>
      </div>
    `;
    dmIdentityList.appendChild(row);
  });
}

async function setActiveIdentity(identityId) {
  state.chat.activeIdentityId = identityId;
  updateChatStatusLabels();
  renderChatIdentityList();
  const thread = state.chat.threads.find(
    (item) => item.dm_identity_id === identityId && item.agent_username === state.agent?.username
  );
  if (thread) {
    state.chat.activeThreadId = thread.id;
    await loadChatMessages(thread.id);
    return;
  }
  state.chat.activeThreadId = null;
  state.chat.messages = [];
  renderChatTranscript();
}

async function setActiveThread(threadId) {
  const thread = state.chat.threads.find((item) => item.id === threadId);
  if (!thread) return;
  state.chat.activeThreadId = thread.id;
  state.chat.activeAgentUsername = thread.agent_username;
  state.chat.activeDmIdentityId = thread.dm_identity_id;
  if (dmChatAgentSelect) dmChatAgentSelect.value = thread.agent_username;
  if (dmChatIdentitySelect) dmChatIdentitySelect.value = String(thread.dm_identity_id);
  updateChatStatusLabels();
  renderDmChatThreads();
  await loadChatMessages(thread.id);
}

async function loadChatMessages(threadId) {
  if (!threadId) return;
  try {
    const response = await fetch(`/api/chat/threads/${threadId}/messages`);
    if (!response.ok) throw new Error('Fallo al cargar mensajes.');
    const payload = await response.json();
    state.chat.messages = Array.isArray(payload.messages) ? payload.messages : [];
    renderChatTranscript();
  } catch (err) {
    logDebug(`Error de mensajes: ${err.message}`);
  }
}

async function reloadChatData() {
  if (!state.dmMode && !state.agent) return;
  await Promise.all([loadChatIdentities(), loadChatThreads()]);
  if (state.dmMode) {
    if (state.chat.activeThreadId) {
      await loadChatMessages(state.chat.activeThreadId);
    } else if (state.chat.threads.length) {
      await setActiveThread(state.chat.threads[0].id);
    }
    return;
  }
  if (!state.chat.activeIdentityId && state.chat.identities.length) {
    await setActiveIdentity(state.chat.identities[0].id);
    return;
  }
  if (state.chat.activeIdentityId) {
    const thread = state.chat.threads.find(
      (item) =>
        item.dm_identity_id === state.chat.activeIdentityId &&
        item.agent_username === state.agent?.username
    );
    if (thread) {
      state.chat.activeThreadId = thread.id;
      await loadChatMessages(thread.id);
      return;
    }
  }
  state.chat.activeThreadId = null;
  renderChatTranscript();
}

async function handleChatSubmit(event) {
  event.preventDefault();
  if (!chatInput) return;
  const body = chatInput.value.trim();
  if (!body) return;
  if (!state.chat.activeIdentityId && !state.chat.activeThreadId) {
    showMessage('Selecciona una identidad antes de enviar.', true);
    return;
  }
  const payload = { body };
  if (state.chat.activeThreadId) {
    payload.threadId = state.chat.activeThreadId;
  } else {
    payload.identityId = state.chat.activeIdentityId;
  }
  try {
    const response = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'No se pudo enviar.');
    }
    const data = await response.json();
    chatInput.value = '';
    if (data.thread?.id) {
      state.chat.activeThreadId = data.thread.id;
    }
    await reloadChatData();
  } catch (err) {
    showMessage(err.message || 'Fallo al enviar.', true);
  }
}

async function handleDmChatOpen() {
  const agentUsername = dmChatAgentSelect?.value;
  const identityId = dmChatIdentitySelect?.value ? Number(dmChatIdentitySelect.value) : null;
  if (!agentUsername || !identityId) {
    showMessage('Selecciona agente e identidad.', true);
    return;
  }
  const thread = state.chat.threads.find(
    (item) => item.agent_username === agentUsername && item.dm_identity_id === identityId
  );
  state.chat.activeAgentUsername = agentUsername;
  state.chat.activeDmIdentityId = identityId;
  if (thread) {
    await setActiveThread(thread.id);
    return;
  }
  state.chat.activeThreadId = null;
  state.chat.messages = [];
  updateChatStatusLabels();
  renderChatTranscript();
}

async function handleDmChatSubmit(event) {
  event.preventDefault();
  if (!dmChatInput) return;
  const body = dmChatInput.value.trim();
  if (!body) return;
  const payload = { body };
  if (state.chat.activeThreadId) {
    payload.threadId = state.chat.activeThreadId;
  } else {
    payload.agentUsername = state.chat.activeAgentUsername;
    payload.identityId = state.chat.activeDmIdentityId;
  }
  if (!payload.threadId && (!payload.agentUsername || !payload.identityId)) {
    showMessage('Selecciona agente e identidad.', true);
    return;
  }
  try {
    const response = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'No se pudo enviar.');
    }
    const data = await response.json();
    dmChatInput.value = '';
    if (data.thread?.id) {
      state.chat.activeThreadId = data.thread.id;
    }
    await reloadChatData();
  } catch (err) {
    showMessage(err.message || 'Fallo al enviar.', true);
  }
}

function setDmIdentityEditing(identity) {
  state.chat.dmIdentityEditingId = identity ? identity.id : null;
  if (dmIdentityNameInput) {
    dmIdentityNameInput.value = identity ? identity.name : '';
    dmIdentityNameInput.focus();
  }
}

async function handleDmIdentitySubmit(event) {
  event.preventDefault();
  if (!dmIdentityNameInput) return;
  const name = dmIdentityNameInput.value.trim();
  if (!name) return;
  const editingId = state.chat.dmIdentityEditingId;
  const method = editingId ? 'PUT' : 'POST';
  const endpoint = editingId ? `/api/chat/identities/${editingId}` : '/api/chat/identities';
  try {
    const response = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'No se pudo guardar la identidad.');
    }
    dmIdentityNameInput.value = '';
    state.chat.dmIdentityEditingId = null;
    await loadChatIdentities();
  } catch (err) {
    showMessage(err.message || 'Fallo al guardar identidad.', true);
  }
}

async function handleDmIdentityDelete(identityId) {
  const identity = state.chat.identities.find((item) => item.id === identityId);
  if (!identity) return;
  const ok = window.confirm(`¿Eliminar identidad ${identity.name}?`);
  if (!ok) return;
  try {
    const response = await fetch(`/api/chat/identities/${identityId}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'No se pudo eliminar.');
    }
    await loadChatIdentities();
    await loadChatThreads();
  } catch (err) {
    showMessage(err.message || 'Fallo al eliminar identidad.', true);
  }
}

function handleChatSocketMessage(payload) {
  if (!payload || payload.type !== 'chat') return;
  if (payload.event === 'message') {
    loadChatThreads();
    if (payload.threadId && payload.threadId === state.chat.activeThreadId) {
      loadChatMessages(payload.threadId);
    }
  }
}

function connectChatSocket() {
  const role = getChatRole();
  if (!role) return;
  if (
    state.chat.socket &&
    (state.chat.socket.readyState === WebSocket.OPEN ||
      state.chat.socket.readyState === WebSocket.CONNECTING) &&
    state.chat.socketRole === role
  ) {
    return;
  }
  disconnectChatSocket();
  const ws = new WebSocket(getMessageSocketUrl());
  state.chat.socket = ws;
  state.chat.socketRole = role;
  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        type: 'hello',
        role: 'chat',
        mode: role,
        agentUsername: state.agent?.username || null
      })
    );
  };
  ws.onmessage = (event) => {
    try {
      const payload = JSON.parse(event.data);
      handleChatSocketMessage(payload);
    } catch (err) {
      logDebug(`Chat socket parse failed: ${err.message}`);
    }
  };
  ws.onclose = () => {
    if (state.chat.socket === ws) {
      state.chat.socket = null;
      state.chat.socketRole = null;
    }
    if (state.dmMode || state.agent) {
      if (!state.chat.socketRetry) {
        state.chat.socketRetry = window.setTimeout(() => {
          state.chat.socketRetry = null;
          connectChatSocket();
        }, 3000);
      }
    }
  };
  ws.onerror = (err) => {
    logDebug(`Chat socket error: ${err.message || err}`);
  };
}

function disconnectChatSocket() {
  if (state.chat.socket) {
    state.chat.socket.close();
    state.chat.socket = null;
  }
  state.chat.socketRole = null;
  if (state.chat.socketRetry) {
    clearTimeout(state.chat.socketRetry);
    state.chat.socketRetry = null;
  }
}

async function loadAuthBootstrap() {
  try {
    const response = await fetch('/api/auth/bootstrap');
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('bootstrap_not_found');
      }
      throw new Error('Fallo al cargar estado de autenticacion');
    }
    const data = await response.json();
    state.authBootstrap.dmConfigured = !!data.dmConfigured;
    state.authBootstrap.agents = (data.agents || []).reduce((acc, agent) => {
      acc[agent.username] = { configured: !!agent.configured };
      return acc;
    }, {});
    state.agents = data.agents || [];
    populateAgentSelect();
    updateAgentPasswordPanel();
    updateDmPasswordPanel();
    logDebug('Estado de autenticacion cargado.');
  } catch (err) {
    if (err.message === 'bootstrap_not_found') {
      try {
        const fallback = await fetch('/api/auth/agents');
        if (fallback.ok) {
          state.agents = await fallback.json();
          state.authBootstrap.agents = state.agents.reduce((acc, agent) => {
            acc[agent.username] = { configured: true };
            return acc;
          }, {});
          populateAgentSelect();
          updateAgentPasswordPanel();
          updateDmPasswordPanel();
          logDebug('Estado de autenticacion cargado via fallback.');
          return;
        }
      } catch (fallbackErr) {
        console.warn(fallbackErr);
      }
    }
    console.warn(err);
    logDebug(`Error en estado de autenticacion: ${err.message}`);
  }
}

async function loadAgentList() {
  try {
    await loadAuthBootstrap();
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
  populateDmChatAgentSelect();
  populateMessageRecipientSelect();
}

function populateMessageIdentitySelect() {
  if (!messageFromSelect) return;
  messageFromSelect.innerHTML = '';
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = 'Seleccionar identidad';
  messageFromSelect.appendChild(placeholder);
  state.messageIdentities.forEach((identity) => {
    const opt = document.createElement('option');
    opt.value = identity;
    opt.textContent = identity;
    messageFromSelect.appendChild(opt);
  });
}

function populateMessageRecipientSelect() {
  if (!messageToSelect) return;
  messageToSelect.innerHTML = '';
  if (state.dmMode) {
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
    return;
  }
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = 'Seleccionar identidad';
  messageToSelect.appendChild(defaultOpt);
  if (!state.messageIdentities.length) {
    const empty = document.createElement('option');
    empty.value = '';
    empty.textContent = 'Sin identidades disponibles';
    empty.disabled = true;
    messageToSelect.appendChild(empty);
    return;
  }
  state.messageIdentities.forEach((identity) => {
    const opt = document.createElement('option');
    opt.value = identity;
    opt.textContent = identity;
    messageToSelect.appendChild(opt);
  });
}

function applyMessageComposeRole() {
  if (messageToLabel) {
    messageToLabel.textContent = state.dmMode ? 'Para' : 'Para (identidad OV)';
  }
  if (messageFromSelect) {
    messageFromSelect.classList.toggle('hidden', !state.dmMode);
  }
  if (messageFromSelectLabel) {
    messageFromSelectLabel.classList.toggle('hidden', !state.dmMode);
  }
  populateMessageRecipientSelect();
}

async function loadMessageIdentities() {
  if (!state.dmMode && !state.agent) return;
  try {
    const response = await fetch('/api/messages/identities');
    if (!response.ok) throw new Error('Fallo al cargar identidades.');
    const payload = await response.json();
    state.messageIdentities = Array.isArray(payload.identities) ? payload.identities : [];
    populateMessageIdentitySelect();
    populateMessageRecipientSelect();
  } catch (err) {
    logDebug(`Error de identidades: ${err.message}`);
  }
}

function showAgentLogin() {
  bootMenu.classList.add('hidden');
  agentLoginDiv.classList.remove('hidden');
  agentLoginDiv.classList.add('visible');
  agentLoginStatus.textContent = '';
  agentPassInput.value = '';
  hideAgentPasswordPanel();
  updateAgentPasswordPanel();
  agentSelect?.focus();
}

function hideAgentLogin() {
  agentLoginDiv.classList.remove('visible');
  agentLoginDiv.classList.add('hidden');
  bootMenu.classList.remove('hidden');
  hideAgentPasswordPanel();
}

function isAgentConfigured(username) {
  return !!state.authBootstrap.agents?.[username]?.configured;
}

function updateAgentPasswordPanel() {
  if (!agentPasswordPanel || !agentPassCurrentWrap || !agentSelect) return;
  const configured = isAgentConfigured(agentSelect.value);
  agentPassCurrentWrap.classList.toggle('hidden', !configured);
  if (!configured) {
    agentPassCurrent.value = '';
  }
}

function updateDmPasswordPanel() {
  if (!bootDmPasswordPanel || !bootDmCurrentWrap) return;
  bootDmCurrentWrap.classList.toggle('hidden', !state.authBootstrap.dmConfigured);
  if (!state.authBootstrap.dmConfigured && bootDmCurrentInput) {
    bootDmCurrentInput.value = '';
  }
}

function showCommandMenu() {
  if (!commandMenu || !commandInput || !commandLog) return;
  commandMenu.classList.add('visible');
  commandInput.value = 'MOSTRAR MAPA AMINA';
  commandLog.textContent = 'COMANDO LISTO // escriba MOSTRAR MAPA AMINA o MOSTRAR TERMINAL DE MENSAJERIA';
  commandInput.focus();
}

function hideCommandMenu() {
  commandMenu?.classList.remove('visible');
}

function runCommand(value) {
  const command = (value || '').toUpperCase().trim();
  if (command.includes('INBOX') || command.includes('MENSAJERIA') || command.includes('CHAT')) {
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
    if (response.status === 409) {
      agentLoginStatus.textContent = 'Agente sin contraseña configurada.';
      showAgentPasswordPanel();
    } else {
      agentLoginStatus.textContent = 'Credenciales inválidas.';
    }
    logDebug('Fallo en el login del agente ' + username);
    return;
  }

  const agent = await response.json();
  setAgent(agent);
  await refreshBaseZoneData();
  bootMenu.classList.add('hidden');
  hideAgentLogin();
  hideBootScreen();
  showMessage('Vista de agente de campo cargada.');
}

function resetAgentPasswordForm() {
  if (agentPassCurrent) agentPassCurrent.value = '';
  if (agentPassNew) agentPassNew.value = '';
  if (agentPassConfirm) agentPassConfirm.value = '';
  if (agentPassStatus) agentPassStatus.textContent = '';
}

function showAgentPasswordPanel() {
  if (!agentPasswordPanel) return;
  agentPasswordPanel.classList.remove('hidden');
  updateAgentPasswordPanel();
}

function hideAgentPasswordPanel() {
  if (!agentPasswordPanel) return;
  agentPasswordPanel.classList.add('hidden');
  resetAgentPasswordForm();
}

async function handleAgentPasswordSave() {
  const username = agentSelect?.value;
  const currentPassword = agentPassCurrent.value.trim();
  const newPassword = agentPassNew.value.trim();
  const confirm = agentPassConfirm.value.trim();
  if (!username) {
    agentPassStatus.textContent = 'Selecciona un agente.';
    return;
  }
  if (!newPassword || newPassword.length < 6) {
    agentPassStatus.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.';
    return;
  }
  if (newPassword !== confirm) {
    agentPassStatus.textContent = 'Las contraseñas no coinciden.';
    return;
  }
  const payload = { username, newPassword };
  if (currentPassword) payload.currentPassword = currentPassword;
  try {
    const response = await fetch('/api/auth/agent/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      agentPassStatus.textContent = error.error || 'No se pudo guardar la contraseña.';
      return;
    }
    agentPassStatus.textContent = 'Contraseña actualizada.';
    await loadAuthBootstrap();
  } catch (err) {
    agentPassStatus.textContent = 'No se pudo guardar la contraseña.';
  }
}

function resetDmPasswordForm() {
  if (bootDmCurrentInput) bootDmCurrentInput.value = '';
  if (bootDmNewInput) bootDmNewInput.value = '';
  if (bootDmConfirmInput) bootDmConfirmInput.value = '';
  if (bootDmPassStatus) bootDmPassStatus.textContent = '';
}

function showDmPasswordPanel() {
  if (!bootDmPasswordPanel) return;
  bootDmPasswordPanel.classList.remove('hidden');
  updateDmPasswordPanel();
}

function hideDmPasswordPanel() {
  if (!bootDmPasswordPanel) return;
  bootDmPasswordPanel.classList.add('hidden');
  resetDmPasswordForm();
}

async function handleDmPasswordSave() {
  const currentPassword = bootDmCurrentInput?.value.trim();
  const newPassword = bootDmNewInput?.value.trim();
  const confirm = bootDmConfirmInput?.value.trim();
  if (!newPassword || newPassword.length < 6) {
    bootDmPassStatus.textContent = 'La nueva contraseña debe tener al menos 6 caracteres.';
    return;
  }
  if (newPassword !== confirm) {
    bootDmPassStatus.textContent = 'Las contraseñas no coinciden.';
    return;
  }
  const payload = { newPassword };
  if (currentPassword) payload.currentPassword = currentPassword;
  try {
    const response = await fetch('/api/auth/dm/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      bootDmPassStatus.textContent = error.error || 'No se pudo guardar la contraseña.';
      return;
    }
    bootDmPassStatus.textContent = 'Contraseña actualizada.';
    await loadAuthBootstrap();
  } catch (err) {
    bootDmPassStatus.textContent = 'No se pudo guardar la contraseña.';
  }
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
  state.dmMode = false;
  state.agent = agent;
  applyAgentStatus();
  updateRoleLayoutClasses();
  loadMissionNotes();
  loadEntities();
  loadActivity();
  loadCharacterSheet();
}

function clearAgentSession() {
  state.agent = null;
  applyAgentStatus();
  updateRoleLayoutClasses();
}

function applyAgentStatus() {
  if (!clearanceStatus || !agentStatus) return;
  clearanceStatus.textContent = state.dmMode ? 'Sr. Verdad' : 'Agente de Campo';
  agentStatus.textContent = state.agent ? state.agent.display : 'Ningún agente seleccionado';
  if (state.dmMode || state.agent) {
    startActivityPolling();
    reloadChatData();
    connectChatSocket();
  } else {
    stopActivityPolling();
    disconnectChatSocket();
    clearChatState();
  }
  if (!state.dmMode && state.agent) {
    loadAgentJournal();
  }
}

function updateActivityPaginationControls() {
  if (!activityMoreBtn || !state.activityPagination) return;
  const isMobile = typeof isMobileView === 'function' ? isMobileView() : document.body.classList.contains('is-mobile');
  if (isMobile) {
    activityMoreBtn.style.display = 'none';
    return;
  }
  activityMoreBtn.style.display = state.activityPagination.hasMore ? 'inline-flex' : 'none';
  activityMoreBtn.disabled = !!state.activityPagination.loading;
}

function renderActivity(items = [], options = {}) {
  const { append = false } = options;
  if (!activityList || !activityStatus) return;
  const isMobile = typeof isMobileView === 'function' ? isMobileView() : document.body.classList.contains('is-mobile');
  if (isMobile && append) return;
  if (!append) activityList.innerHTML = '';
  if (!items.length) {
    if (append) {
      updateActivityPaginationControls();
      return;
    }
    const empty = document.createElement('li');
    empty.className = 'activity-empty';
    empty.textContent = 'Sin actividad reciente.';
    activityList.appendChild(empty);
    activityStatus.textContent = 'Sin registros nuevos.';
    updateActivityPaginationControls();
    return;
  }
  const typeLabels = { entity: 'Entidad', poi: 'PdI' };
  const visibleItems = isMobile ? items.slice(0, 3) : items;
  visibleItems.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'activity-item';
    const time = document.createElement('div');
    time.className = 'activity-item-time';
    const timestamp = item.created_at ? new Date(item.created_at) : null;
    if (!timestamp || Number.isNaN(timestamp.getTime())) {
      time.textContent = '—';
    } else {
      const now = new Date();
      const isSameDay =
        timestamp.getFullYear() === now.getFullYear() &&
        timestamp.getMonth() === now.getMonth() &&
        timestamp.getDate() === now.getDate();
      time.textContent = isSameDay
        ? timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        : timestamp.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    }
    const body = document.createElement('div');
    body.className = 'activity-item-body';
    const actionLabelMap = {
      create: 'creada',
      update: 'actualizada',
      delete: 'eliminada'
    };
    const action = actionLabelMap[item.action] || 'actualizada';
    const typeLabel = typeLabels[item.entity_type] || 'Entidad';
    const label = item.entity_label || 'Entidad';
    const prefix = document.createElement('span');
    prefix.className = 'activity-item-prefix';
    prefix.textContent = `${typeLabel} `;
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'activity-entity-link';
    link.textContent = label;
    link.addEventListener('click', () => {
      openActivityEntity(item);
    });
    const suffix = document.createElement('span');
    suffix.className = 'activity-item-action';
    suffix.textContent = ` ${action}`;
    body.appendChild(prefix);
    body.appendChild(link);
    body.appendChild(suffix);
    const meta = document.createElement('span');
    meta.className = 'activity-item-meta';
    const actorName = item.actor_name || 'Ordo Veritatis';
    meta.textContent = `· Operador: ${actorName}`;
    body.appendChild(meta);
    li.appendChild(time);
    li.appendChild(body);
    if (Array.isArray(item.updated_fields) && item.updated_fields.length) {
      const fields = document.createElement('span');
      fields.className = 'activity-item-fields';
      const fieldLabels = {
        agent_notes: 'notas agentes',
        dm_notes: 'notas DM',
        public_summary: 'resumen público',
        public_note: 'nota pública',
        dm_note: 'nota DM',
        image_url: 'imagen',
        threat_level: 'amenaza',
        veil_status: 'velo',
        session_tag: 'sesión',
        code_name: 'callsign',
        real_name: 'nombre real',
        role: 'rol',
        status: 'estado',
        alignment: 'alineación',
        visibility: 'visibilidad',
        unlock_code: 'clave',
        locked_hint: 'pista',
        archived: 'archivado',
        category: 'categoría',
        latitude: 'latitud',
        longitude: 'longitud',
        mel: 'MEL'
      };
      const fieldNames = item.updated_fields.map((field) => {
        const key = String(field);
        return fieldLabels[key] || key.replace(/_/g, ' ');
      });
      fields.textContent = '· Cambios';
      fields.title = `Campos: ${fieldNames.join(', ')}`;
      body.appendChild(fields);
    }
    activityList.appendChild(li);
  });
  activityStatus.textContent = 'Últimos cambios sincronizados.';
  updateActivityPaginationControls();
}

function formatElapsedTime(ms) {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const totalMinutes = Math.floor(totalSeconds / 60);
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) return `${totalHours}h`;
  const totalDays = Math.floor(totalHours / 24);
  return `${totalDays}d`;
}

function updateActivityConnectionLabel() {
  if (!activityConnection) return;
  if (!state.activityPoll?.lastSuccessAt) {
    activityConnection.textContent = 'Ultima conexion con mainframe: —';
    return;
  }
  const elapsed = Date.now() - state.activityPoll.lastSuccessAt;
  activityConnection.textContent = `Ultima conexion con mainframe hace ${formatElapsedTime(elapsed)}`;
}

function ensureActivityLabelTimer() {
  if (!state.activityPoll || state.activityPoll.labelTimer) return;
  state.activityPoll.labelTimer = window.setInterval(updateActivityConnectionLabel, 1000);
}

function findActivityEntity(activity) {
  if (!activity || !activity.entity_id) return null;
  return state.entities.find((entity) => {
    if (activity.entity_type === 'poi') {
      if (entity.type !== 'poi') return false;
      const poiId = entity.poi_id || entity.id;
      return Number(poiId) === Number(activity.entity_id);
    }
    if (entity.type === 'poi') return false;
    return Number(entity.id) === Number(activity.entity_id);
  });
}

async function openActivityEntity(activity) {
  if (!activity) return;
  if (state.dmMode) {
    setWorkspaceView('entities');
  } else {
    setWorkspaceView('database');
  }
  let entity = findActivityEntity(activity);
  if (!entity) {
    await loadEntities();
    entity = findActivityEntity(activity);
  }
  if (!entity) {
    showMessage('Entidad no disponible en esta vista.', true);
    return;
  }
  if (state.dmMode) {
    await selectAdminEntity(entity);
    return;
  }
  state.activeEntityAgent = entity;
  setCookie('agent_active_entity', entity.id);
  renderAgentDossiers();
  if (entity.visibility !== 'locked') {
    loadAgentContext(entity.id);
  } else {
    renderAgentEntityDetailCard(entity);
  }
}

async function loadActivity(options = {}) {
  const { silent = false, page = 0, append = false } = options;
  if (!activityPanel || !activityList || !activityStatus) return;
  if (!state.activityPagination) {
    state.activityPagination = { limit: 10, page: 0, hasMore: false, loading: false };
  }
  if (typeof isMobileView === 'function' ? isMobileView() : document.body.classList.contains('is-mobile')) {
    state.activityPagination.limit = 3;
  }
  if (!state.activityPagination.loadedIds) {
    state.activityPagination.loadedIds = new Set();
  }
  const limit = state.activityPagination.limit || 10;
  const offset = page * limit;
  if (!state.dmMode && !state.agent) {
    activityList.innerHTML = '';
    activityStatus.textContent = 'Esperando sesión...';
    updateActivityConnectionLabel();
    updateActivityPaginationControls();
    return;
  }
  ensureActivityLabelTimer();
  state.activityPagination.loading = true;
  updateActivityPaginationControls();
  if (!silent) {
    activityStatus.textContent = 'Actualizando registro...';
  }
  try {
    const response = await fetch(`/api/activity?limit=${limit}&offset=${offset}`);
    if (response.status === 401) {
      activityStatus.textContent = 'Sesión no activa.';
      activityList.innerHTML = '';
      updateActivityConnectionLabel();
      return;
    }
    if (!response.ok) throw new Error('Fallo al cargar actividad.');
    const payload = await response.json();
    const rawItems = Array.isArray(payload) ? payload : payload.items || [];
    const total = Array.isArray(payload) ? null : payload.total;
    if (!append) {
      state.activityPagination.loadedIds.clear();
    }
    const items = append
      ? rawItems.filter((item) => item && !state.activityPagination.loadedIds.has(item.id))
      : rawItems;
    renderActivity(items, { append });
    items.forEach((item) => {
      if (item && item.id != null) state.activityPagination.loadedIds.add(item.id);
    });
    state.activityPagination.page = page;
    const rawHasMore =
      total !== null && total !== undefined
        ? offset + rawItems.length < total
        : rawItems.length === limit;
    state.activityPagination.hasMore = append ? rawHasMore && items.length > 0 : rawHasMore;
    if (state.activityPoll) {
      state.activityPoll.lastSuccessAt = Date.now();
      updateActivityConnectionLabel();
    }
  } catch (err) {
    if (!silent) {
      activityStatus.textContent = 'No se pudo cargar el registro.';
    }
    logDebug(`Error actividad: ${err.message}`);
  } finally {
    state.activityPagination.loading = false;
    updateActivityPaginationControls();
  }
}

async function pollActivity() {
  if (!state.activityPoll || state.activityPoll.inFlight) return;
  if (!state.dmMode && !state.agent) return;
  if (state.activityPagination?.page > 0) return;
  state.activityPoll.inFlight = true;
  try {
    await loadActivity({ silent: true });
  } finally {
    state.activityPoll.inFlight = false;
  }
}

function startActivityPolling() {
  if (!state.activityPoll) return;
  if (!state.activityPoll.timer) {
    state.activityPoll.timer = window.setInterval(pollActivity, state.activityPoll.intervalMs);
  }
  ensureActivityLabelTimer();
}

function stopActivityPolling() {
  if (!state.activityPoll || !state.activityPoll.timer) return;
  clearInterval(state.activityPoll.timer);
  state.activityPoll.timer = null;
  if (state.activityPoll.labelTimer) {
    clearInterval(state.activityPoll.labelTimer);
    state.activityPoll.labelTimer = null;
  }
}

function applyMessageFilters() {
  setMessageFilters('dm', {
    recipient: filterRecipientSelect?.value || '',
    q: filterQueryInput?.value.trim() || '',
    session_tag: filterSessionInput?.value.trim() || '',
    since: filterSinceInput?.value || '',
    box: filterBoxSelect?.value || '',
    unread_only: !!(filterUnreadCheckbox && filterUnreadCheckbox.checked),
    page: 0
  });
  loadMessages('dm');
}

function isDmViewer() {
  return !!state.dmMode;
}

async function loadEntities() {
  if (!state.dmMode && !state.agent) {
    state.entities = [];
    renderAgentDossiers();
    renderAdminDossiers();
    populateDmGraphOptions();
    return;
  }
  try {
    const params = new URLSearchParams();
    if (isDmViewer()) {
      params.append('includeArchived', '1');
    } else {
      if (state.entityFiltersAgent.type) params.append('type', state.entityFiltersAgent.type);
    }
    const base = isDmViewer() ? '/api/dm/entities' : '/api/agent/entities';
    const url = params.toString() ? `${base}?${params.toString()}` : base;
    const response = await fetch(url);
    if (response.status === 401) {
      if (state.dmMode || state.agent) {
        performLogout({ message: 'Sesión expirada. Vuelve a autenticarte.' });
      }
      return;
    }
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
        state.activeEntityAdmin = { ...found, kind: found.type === 'poi' ? 'poi' : 'entity' };
        populateEntityForm(state.activeEntityAdmin);
      } else {
        enterNewEntityMode();
      }
    }

    renderAgentDossiers();
    renderAdminDossiers();
    renderFocalPoiCard();
    populateDmGraphOptions();
    setGraphSelectionIds('dm', state.dmGraphSelections);
    setGraphSelectionIds('agent', state.agentGraphSelections);
    if (state.workspaceView === 'relations') {
      if (state.dmMode) {
        renderDmRelationsGraph();
      } else {
        renderAgentRelationsGraph();
      }
    }
  } catch (err) {
    logDebug(`Error cargando entidades: ${err.message}`);
  }
}

function filterEntityList(list = [], filters = {}, options = {}) {
  const includeArchived = options.includeArchived || false;
  const ignoreType = options.ignoreType || false;
  const query = (filters.q || '').toLowerCase().trim();
  const base = list.filter((entity) => {
    if (!includeArchived && entity.archived) return false;
    if (!ignoreType && filters.type && entity.type !== filters.type) return false;
    if (filters.status && entity.status !== filters.status) return false;
    return true;
  });

  if (!query) return base;
  if (typeof Fuse === 'undefined') {
    // fallback simple match
    return base.filter((entity) => {
      const target = `${entity.code_name || ''} ${entity.name || ''} ${entity.real_name || ''} ${entity.role || ''} ${entity.public_summary || ''} ${entity.public_note || ''} ${entity.category || ''} ${entity.sessions || ''}`.toLowerCase();
      return target.includes(query);
    });
  }

  const fuse = new Fuse(base, {
    keys: [
      { name: 'code_name', weight: 0.28 },
      { name: 'name', weight: 0.22 },
      { name: 'real_name', weight: 0.08 },
      { name: 'role', weight: 0.15 },
      { name: 'status', weight: 0.1 },
      { name: 'alignment', weight: 0.05 },
      { name: 'public_summary', weight: 0.05 },
      { name: 'public_note', weight: 0.05 },
      { name: 'category', weight: 0.04 },
      { name: 'sessions', weight: 0.03 }
    ],
    threshold: 0.34,
    ignoreLocation: true
  });
  return fuse.search(query).map((res) => res.item);
}

function filterEntities(filters = {}, options = {}) {
  return filterEntityList(state.entities, filters, options);
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
    mel: poi.mel || '',
    category: poi.category,
    latitude: poi.latitude,
    longitude: poi.longitude,
    visibility: poi.visibility || 'agent_public',
    unlock_code: poi.unlock_code || '',
    locked_hint: poi.locked_hint || '',
    poi_id: poi.id,
    veil_status: poi.veil_status
  };
}

function mapPoiToAgentItem(poi) {
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
    public_note: poi.public_note || '',
    category: poi.category,
    latitude: poi.latitude,
    longitude: poi.longitude,
    visibility: poi.visibility || 'agent_public',
    unlock_code: poi.unlock_code || '',
    locked_hint: poi.locked_hint || ''
  };
}

function buildAgentEntityPool() {
  const base = state.entities.slice();
  const hasPoi = base.some((entity) => (entity.type || entity.kind) === 'poi');
  if (!hasPoi && Array.isArray(state.pois) && state.pois.length) {
    return base.concat(state.pois.map(mapPoiToAgentItem));
  }
  return base;
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
  const canRenderLegacyDetail = !!detailTarget;
  if (!listTarget) return;
  const isMobileDatabase = isMobileView() && state.mobileTab === 'database';
  const filters = {
    ...state.entityFiltersAgent,
    type: isMobileDatabase ? '' : state.entityFiltersAgent.type
  };
  if (isMobileDatabase && state.entityFiltersAgent.type) {
    state.entityFiltersAgent.type = '';
  }
  highlightDossierType('agent', state.entityFiltersAgent.type);
  const pool = isMobileDatabase ? buildAgentEntityPool() : state.entities;
  const entities = filterEntityList(pool, filters, {
    includeArchived: false,
    ignoreType: isMobileDatabase
  });
  const hasQuery = (filters.q || '').trim().length > 0;
  listTarget.innerHTML = '';
  if (isMobileDatabase) {
    listTarget.style.display = 'grid';
  } else {
    listTarget.style.display = '';
  }
  if (!entities.length) {
    const empty = document.createElement('div');
    empty.className = 'dossier-empty';
    empty.textContent = isMobileDatabase
      ? 'Usa el buscador para encontrar dossiers y PdI.'
      : 'Sin entidades con estos filtros.';
    listTarget.appendChild(empty);
    if (detailTarget) {
      detailTarget.textContent = isMobileDatabase
        ? 'Busca una entidad o PdI para ver su dossier.'
        : 'Selecciona una entidad para ver su dossier.';
    }
    if (!isMobileDatabase) {
      renderAgentEntityDetailCard(null);
    }
    return;
  }

  if (isMobileDatabase) {
    if (state.activeEntityAgent && !entities.find((e) => e.id === state.activeEntityAgent.id)) {
      state.activeEntityAgent = null;
      setCookie('agent_active_entity', '');
    }
  } else if (!state.activeEntityAgent || !entities.find((e) => e.id === state.activeEntityAgent.id)) {
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
      } else {
        if (canRenderLegacyDetail) {
          renderDossierDetailView(detailTarget, entity, { dm: false });
        }
        renderAgentEntityDetailCard(entity);
      }
    });
    listTarget.appendChild(card);
  });

  if (canRenderLegacyDetail) {
    renderDossierDetailView(detailTarget, state.activeEntityAgent, { dm: false });
  }
  if (state.activeEntityAgent) {
    if (state.activeEntityAgent.visibility !== 'locked') {
      loadAgentContext(state.activeEntityAgent.id);
    } else {
      renderAgentEntityDetailCard(state.activeEntityAgent);
    }
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
  const nameParts = splitEntityName(entity.code_name || entity.name || 'Entidad');
  const titleHtml = `
      <span class="dossier-row-title">
        <span class="dossier-title-primary">${sanitize(nameParts.primary)}</span>
        <span class="dossier-title-secondary">${sanitize(nameParts.secondary)}</span>
      </span>
    `;
  if (locked) {
    card.innerHTML = `
      <div class="dossier-row-header">${badge} ${titleHtml}</div>
      <div class="dossier-row-note">LOCKED — requiere clave</div>
    `;
  } else {
    const roleLine = sanitize(role || 'Sin rol');
    card.innerHTML = `
      <div class="dossier-row-header">${badge} ${titleHtml}</div>
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

function splitEntityName(name) {
  const raw = String(name || '').trim();
  if (!raw) return { primary: 'Entidad', secondary: '' };
  const delimiters = [',', ' - ', ' — ', ' / ', ' | ', ': '];
  for (const delimiter of delimiters) {
    if (!raw.includes(delimiter)) continue;
    const [head, ...rest] = raw.split(delimiter);
    const primary = head.trim();
    const secondary = rest.join(delimiter).trim();
    if (primary) return { primary, secondary };
  }
  const words = raw.split(/\s+/);
  const primary = words.shift() || raw;
  const secondary = words.join(' ').trim();
  return { primary, secondary };
}

function renderDossierDetailView(target, entity, options = {}) {
  if (!target) return;
  if (!entity) {
    target.textContent = 'Selecciona una entidad para ver su dossier.';
    return;
  }
  const dmView = options.dm;
  const isPoiLocked = entity.type === 'poi' && entity.visibility === 'locked' && !dmView;
  const showUnlockButton = isPoiLocked || (entity.visibility === 'locked' && !dmView);
  if (entity.type === 'poi') {
    if (isPoiLocked) {
      target.innerHTML = `
        <div class="dossier-detail">
          <div class="locked-placeholder">LOCKED</div>
          <div class="dossier-title">${sanitize(entity.code_name || entity.name)}</div>
          <button type="button" class="ghost" data-unlock-target="${entity.id}" data-unlock-hint="${sanitize(
            entity.locked_hint || ''
          )}">Desbloquear</button>
        </div>
      `;
    } else {
      target.innerHTML = `
        <div class="dossier-detail">
          <div class="dossier-title">${sanitize(entity.code_name || entity.name)}</div>
          <div class="dossier-subtitle">${sanitize(categoryLabels[entity.category] || entity.role || 'PdI')}</div>
          <div class="dossier-badges">
            <span class="badge">Amenaza ${sanitize(String(entity.threat_level || '?'))}</span>
            <span class="badge">Velo ${sanitize(formatVeilLabel(entity.veil_status || entity.alignment || '?'))}</span>
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
    }
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
    )}" data-lightbox-img="${sanitizeUrlValue(entity.image_url)}"/></div>`
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

function createGraphHelpers(overrides = {}) {
  return {
    sanitize,
    sanitizeUrlValue,
    getEntityTypeLabel,
    getPoiImageUrl(id) {
      const poi = state.pois.find((p) => Number(p.id) === Number(id));
      return poi?.image_url || '';
    },
    openLightbox,
    showMessage,
    createElement: (tag) => document.createElement(tag),
    ...overrides
  };
}

// Fullscreen helpers keep a graph panel visible without re-rendering the layout; they toggle the DOM Fullscreen API.
function getFullscreenElement() {
  return (
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement ||
    null
  );
}

function requestFullscreen(container) {
  if (!container) return;
  if (container.requestFullscreen) return container.requestFullscreen();
  if (container.webkitRequestFullscreen) return container.webkitRequestFullscreen();
  if (container.mozRequestFullScreen) return container.mozRequestFullScreen();
  if (container.msRequestFullscreen) return container.msRequestFullscreen();
  return null;
}

function exitFullscreen() {
  if (document.exitFullscreen) return document.exitFullscreen();
  if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
  if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
  if (document.msExitFullscreen) return document.msExitFullscreen();
  return null;
}

function toggleGraphFullscreen(container) {
  if (!container) return;
  const activeElement = getFullscreenElement();
  if (activeElement === container) {
    exitFullscreen();
    return;
  }
  requestFullscreen(container);
}

function ensureDmGraphApi() {
  if (dmGraphApi) return dmGraphApi;
  const helpers = createGraphHelpers({
    onNodeDoubleClick(data, mode) {
      if (mode === 'agent') return;
      const entityId = Number(data?.entityId);
      if (!entityId) return;
      setDmGraphFocus(entityId);
    }
  });
  dmGraphApi = new GraphAPI({
    cytoscape,
    container: dmGraphContainer,
    summaryPanel: dmGraphSummary,
    mode: 'dm',
    layout: state.dmGraphLayout,
    helpers
  });
  dmGraphApi.on('dblclick', ({ data }) => {
    if (data?.entityId) {
      setDmGraphFocus(data.entityId);
    }
  });
  if (typeof window !== 'undefined') {
    window.dmGraphApi = dmGraphApi;
  }
  return dmGraphApi;
}

function ensureAgentGraphApi() {
  if (agentGraphApi) return agentGraphApi;
  const helpers = createGraphHelpers({
    onNodeDoubleClick(data, mode) {
      if (mode !== 'agent') return;
      const entityId = Number(data?.entityId);
      if (!entityId) return;
      setAgentGraphFocus(entityId);
    }
  });
  agentGraphApi = new GraphAPI({
    cytoscape,
    container: agentGraphContainer,
    summaryPanel: agentGraphSummary,
    mode: 'agent',
    layout: state.agentGraphLayout,
    helpers
  });
  agentGraphApi.on('dblclick', ({ data }) => {
    if (data?.entityId) {
      setAgentGraphFocus(data.entityId);
    }
  });
  if (typeof window !== 'undefined') {
    window.agentGraphApi = agentGraphApi;
  }
  return agentGraphApi;
}

function getDmGraphPool() {
  return (state.entities || []).filter((e) => e.type !== 'poi');
}

function getAgentGraphPool() {
  return (state.entities || []).filter((e) => e.type !== 'poi');
}

function formatEntityGraphLabel(entity) {
  if (!entity) return 'Entidad';
  const label = entity.code_name || entity.name || 'Entidad';
  const typeLabel = getEntityTypeLabel(entity.type || '');
  return `${label} · ${typeLabel || entity.type || '—'}`;
}

function formatDmGraphLabel(entity) {
  return formatEntityGraphLabel(entity);
}

function formatAgentGraphLabel(entity) {
  return formatEntityGraphLabel(entity);
}

function setGraphSearchSelection(input, entity, formatter) {
  if (!input || !entity) return;
  input.value = formatter(entity);
  input.dataset.entityId = String(entity.id);
}

function clearGraphSearchSelection(input) {
  if (!input) return;
  input.dataset.entityId = '';
}

function normalizeGraphSelectionIds(list, pool) {
  const allowed = new Set((pool || []).map((entity) => String(entity.id)));
  const seen = new Set();
  return (list || [])
    .map((id) => String(id))
    .filter((id) => allowed.has(id) && !seen.has(id) && (seen.add(id) || true))
    .map((id) => Number(id));
}

function getGraphSelectionPool(mode) {
  return mode === 'dm' ? getDmGraphPool() : getAgentGraphPool();
}

function getGraphSelectionIds(mode) {
  return mode === 'dm' ? state.dmGraphSelections : state.agentGraphSelections;
}

function setGraphSelectionIds(mode, ids) {
  const pool = getGraphSelectionPool(mode);
  const normalized = normalizeGraphSelectionIds(ids, pool);
  if (mode === 'dm') {
    state.dmGraphSelections = normalized;
  } else {
    state.agentGraphSelections = normalized;
  }
  renderGraphSelectionChips(mode, pool);
  return normalized;
}

function renderGraphSelectionChips(mode, poolOverride) {
  const chips = mode === 'dm' ? dmGraphChips : agentGraphChips;
  const clearBtn = mode === 'dm' ? dmGraphClearBtn : agentGraphClearBtn;
  const pool = poolOverride || getGraphSelectionPool(mode);
  if (!chips) return;
  chips.innerHTML = '';
  const ids = getGraphSelectionIds(mode);
  const formatter = mode === 'dm' ? formatDmGraphLabel : formatAgentGraphLabel;
  ids.forEach((id) => {
    const entity = pool.find((item) => Number(item.id) === Number(id));
    if (!entity) return;
    const chip = document.createElement('span');
    chip.className = 'chip';
    const label = document.createElement('span');
    label.className = 'chip-label';
    label.textContent = formatter(entity);
    const actions = document.createElement('div');
    actions.className = 'chip-actions';
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', () => {
      const next = ids.filter((entry) => Number(entry) !== Number(id));
      setGraphSelectionIds(mode, next);
      if (mode === 'dm') {
        renderDmRelationsGraph();
      } else {
        renderAgentRelationsGraph();
      }
    });
    actions.appendChild(removeBtn);
    chip.appendChild(label);
    chip.appendChild(actions);
    chips.appendChild(chip);
  });
  if (clearBtn) {
    clearBtn.disabled = !ids.length;
  }
}

function updateGraphSelectionControls(mode, enabled) {
  const addBtn = mode === 'dm' ? dmGraphAddBtn : agentGraphAddBtn;
  const clearBtn = mode === 'dm' ? dmGraphClearBtn : agentGraphClearBtn;
  if (addBtn) addBtn.disabled = !enabled;
  if (clearBtn) clearBtn.disabled = !enabled || !getGraphSelectionIds(mode).length;
}

function normalizeNodeId(rawId, typeHint = 'entity') {
  if (rawId == null) return '';
  const text = String(rawId);
  if (text.startsWith('e-') || text.startsWith('p-')) return text;
  const prefix = typeHint === 'poi' ? 'p' : 'e';
  return `${prefix}-${text}`;
}

function ensureStubNode(nodes, id) {
  if (!id || nodes.has(id)) return;
  const isPoi = String(id).startsWith('p-');
  nodes.set(id, {
    id,
    label: isPoi ? 'PdI' : 'Entidad',
    type: isPoi ? 'poi' : 'npc',
    entityId: id.replace(/^[ep]-/, ''),
    role: '',
    visibility: 'agent_public',
    image_url: '',
    session: '',
    publicSummary: ''
  });
}

function stripGraphPrefix(id) {
  if (typeof id !== 'string') return id;
  if (id.startsWith('e-') || id.startsWith('p-')) {
    return id.slice(2);
  }
  return id;
}

function addGraphSelection(mode, id) {
  const pool = getGraphSelectionPool(mode);
  const num = Number(id);
  if (!num || Number.isNaN(num)) return;
  const allowed = new Set(pool.map((entity) => Number(entity.id)));
  if (!allowed.has(num)) return;
  const next = [...getGraphSelectionIds(mode), num];
  setGraphSelectionIds(mode, next);
  if (mode === 'dm') {
    state.dmGraphFocusId = num;
    renderDmRelationsGraph();
  } else {
    state.agentGraphFocusId = num;
    renderAgentRelationsGraph();
  }
}

function clearGraphSelections(mode) {
  setGraphSelectionIds(mode, []);
  if (mode === 'dm') {
    renderDmRelationsGraph();
  } else {
    renderAgentRelationsGraph();
  }
}

function buildGraphNodePayload(info) {
  const fallbackId = info.id ?? info.entityId ?? info.poi_id ?? 'unknown';
  const typeHint = info.type === 'poi' ? 'poi' : 'entity';
  const nodeId = info.graphId || normalizeNodeId(fallbackId, typeHint);
  const summaryText =
    info.public_summary ||
    info.publicSummary ||
    info.summary ||
    info.public_note ||
    info.note ||
    info.dm_notes ||
    '';
  return {
    id: nodeId,
    label: info.code_name || info.name || `Entidad ${fallbackId}`,
    code_name: info.code_name || info.name || '',
    name: info.name || info.code_name || '',
    type: info.type || info.to_type || info.from_type || 'npc',
    entityId: info.entityId ?? fallbackId,
    threat: info.threat_level || info.threat,
    role: info.role || info.to_role || info.from_role || '',
    visibility: info.visibility || info.to_visibility || info.from_visibility || 'agent_public',
    image_url: info.image_url || info.to_image_url || info.from_image_url || '',
    session: info.first_session || info.sessions || info.session || '',
    publicSummary: summaryText.trim()
  };
}

function buildCombinedGraphContext(contexts, options = {}) {
  const nodes = new Map();
  const edges = new Map();
  const helpers = createGraphHelpers();
  const focusEntityId = Number(options.focusId);
  let focusEntity = null;
  contexts.forEach((ctx) => {
    if (!ctx || !ctx.entity) return;
    if (!focusEntity) focusEntity = ctx.entity;
    if (focusEntityId && Number(ctx.entity.id) === focusEntityId) {
      focusEntity = ctx.entity;
    }
    const focusNode = buildGraphNodePayload(ctx.entity);
    const focusId = normalizeNodeId(focusNode.id, 'entity');
    nodes.set(focusId, focusNode);
    (ctx.relations || []).forEach((rel, idx) => {
      if (!rel?.to_entity_id) return;
      const nodeInfo = {
        id: rel.to_entity_id,
        code_name: rel.to_code_name || rel.target_name,
        type: rel.to_type || rel.target_type,
        role: rel.to_role || rel.target_role,
        image_url: rel.to_image_url,
        visibility: rel.to_visibility,
        session: rel.session_tag || null
      };
      if (rel.to_public_summary || rel.to_public_note) {
        nodeInfo.public_summary = rel.to_public_summary || rel.to_public_note;
      }
      const targetNode = buildGraphNodePayload(nodeInfo);
      const targetId = normalizeNodeId(targetNode.id, 'entity');
      nodes.set(targetId, { ...targetNode, id: targetId });
      const edgeId = rel.id ? `rel-${rel.id}` : `rel-${ctx.entity.id}-${rel.to_entity_id}-${idx}`;
      if (!edges.has(edgeId)) {
        edges.set(edgeId, {
          id: edgeId,
          source: focusId,
          target: targetId,
          relation: rel.relation_type || rel.relation || 'vínculo',
          strength: rel.strength || 1,
          linkType: 'entity',
          is_public: rel.is_public !== undefined ? rel.is_public : 1
        });
      }
    });
    (ctx.pois || []).forEach((link, idx) => {
      if (!link?.poi_id) return;
      const poiId = `p-${link.poi_id}`;
      const imageFallback = helpers.getPoiImageUrl(Number(link.poi_id));
      const poiNodeData = {
        id: link.poi_id,
        entityId: link.poi_id,
        graphId: poiId,
        code_name: link.name,
        type: 'poi',
        role: link.category || 'PdI',
        image_url: link.image_url || imageFallback,
        visibility: link.visibility,
        session: link.session_tag || link.poi_session || ''
      };
      if (link.public_note) {
        poiNodeData.public_summary = link.public_note;
      }
      const poiNode = buildGraphNodePayload(poiNodeData);
      const poiNodeId = normalizeNodeId(poiNode.id, 'poi');
      nodes.set(poiNodeId, { ...poiNode, id: poiNodeId });
      const edgeId = link.id ? `poi-${link.id}` : `poi-${ctx.entity.id}-${link.poi_id}-${idx}`;
      if (!edges.has(edgeId)) {
        edges.set(edgeId, {
          id: edgeId,
          source: focusId,
          target: poiNodeId,
          relation: link.role_at_poi || 'PdI',
          strength: 1,
          linkType: 'poi',
          is_public: link.is_public !== undefined ? link.is_public : 1
        });
      }
    });
  });

  edges.forEach((edge) => {
    ensureStubNode(nodes, edge.source);
    ensureStubNode(nodes, edge.target);
  });

  const nodeList = Array.from(nodes.values()).map((data) => {
    const graphId = typeof data.id === 'string' ? data.id : '';
    const normalized = graphId ? stripGraphPrefix(graphId) : data.id;
    return {
      data: {
        ...data,
        graphId: graphId || data.graphId,
        id: data.entityId ?? normalized
      }
    };
  });
  const nodeIds = new Set(nodeList.map((node) => node.data.graphId || node.data.id));
  const edgeList = Array.from(edges.values())
    .filter((edge) => nodeIds.has(edge.source) && nodeIds.has(edge.target))
    .map((data) => ({ data }));
  let focusId = options.focusId ? `e-${options.focusId}` : null;
  if (!focusId || !nodes.has(focusId)) {
    focusId = nodeList[0]?.data?.id || null;
  }
  const entity = focusEntity || {
    id: 'multi',
    code_name: 'Relaciones',
    type: 'org',
    role: 'Selección múltiple',
    visibility: 'agent_public',
    public_summary: 'Grafo combinado.'
  };
  return {
    entity,
    graph: {
      nodes: nodeList,
      edges: edgeList
    },
    graphFocusId: focusId
  };
}

async function fetchGraphContext(id, mode) {
  const url = mode === 'dm' ? `/api/dm/entities/${id}/context` : `/api/agent/entities/${id}/context`;
  const response = await fetch(url);
  if (response.status === 401) {
    if (mode === 'dm') {
      performLogout({ message: 'Sesión expirada. Vuelve a autenticarte.' });
    } else {
      handleUnauthorized();
    }
    return null;
  }
  if (!response.ok) {
    throw new Error('No se pudo cargar contexto para el grafo combinado.');
  }
  return response.json();
}

function resolveGraphFocusId(ids, preferredId) {
  const preferred = Number(preferredId);
  if (preferred && ids.includes(preferred)) return preferred;
  return ids[0] || null;
}

async function renderCombinedRelationsGraph(mode) {
  const container = mode === 'dm' ? dmGraphContainer : agentGraphContainer;
  const pool = getGraphSelectionPool(mode);
  const selections = normalizeGraphSelectionIds(getGraphSelectionIds(mode), pool);
  const focusId = resolveGraphFocusId(
    selections,
    mode === 'dm' ? state.dmGraphFocusId : state.agentGraphFocusId
  );
  if (!selections.length) return false;
  if (!container) return true;
  try {
    const results = await Promise.allSettled(selections.map((id) => fetchGraphContext(id, mode)));
    const filtered = results
      .filter((result) => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter(Boolean);
    results.forEach((result) => {
      if (result.status === 'rejected') {
        logDebug(`Grafo combinado error: ${result.reason?.message || result.reason}`);
        console.error('Grafo combinado error', result.reason);
      }
    });
    if (!filtered.length) {
      container.textContent = 'No se pudo cargar el grafo combinado.';
      return true;
    }
    const ctx = buildCombinedGraphContext(filtered, { focusId });
    if (mode === 'dm') {
      state.dmGraphFocusId = focusId;
    } else {
      state.agentGraphFocusId = focusId;
    }
    const api = mode === 'dm' ? ensureDmGraphApi() : ensureAgentGraphApi();
    const baseLayout = mode === 'dm' ? state.dmGraphLayout : state.agentGraphLayout;
    const isMulti = selections.length > 1;
    const layout = isMulti ? 'cose' : baseLayout;
    const fitPadding = isMulti ? 60 : undefined;
    await api.update(ctx, { focusId: ctx.graphFocusId, mode, layout, fitPadding });
    return true;
  } catch (err) {
    logDebug(`Grafo combinado error: ${err.message}`);
    console.error('Grafo combinado error', err);
    if (container) {
      container.textContent = 'No se pudo dibujar el grafo combinado.';
    }
    return true;
  }
}

function refreshDmGraphFuse() {
  const pool = getDmGraphPool();
  if (typeof Fuse === 'undefined' || !pool.length) {
    dmGraphFuse = null;
    return;
  }
  dmGraphFuse = new Fuse(pool, {
    keys: ['code_name', 'name', 'real_name', 'role', 'type'],
    threshold: 0.35,
    includeScore: true
  });
}

function setDmGraphFocus(id) {
  if (id === DM_GRAPH_CAMPAIGN_VALUE) {
    state.dmGraphScope = DM_GRAPH_SCOPE.CAMPAIGN;
    state.dmGraphFocusId = null;
    if (dmGraphSelect) {
      dmGraphSelect.value = DM_GRAPH_CAMPAIGN_VALUE;
    }
    if (dmGraphSearchInput) {
      dmGraphSearchInput.value = DM_GRAPH_CAMPAIGN_LABEL;
      clearGraphSearchSelection(dmGraphSearchInput);
    }
    setGraphSelectionIds('dm', []);
    updateGraphSelectionControls('dm', false);
    return renderDmCampaignGraph();
  }
  state.dmGraphScope = DM_GRAPH_SCOPE.ENTITY;
  const num = Number(id);
  state.dmGraphFocusId = Number.isNaN(num) ? null : num;
  updateGraphSelectionControls('dm', true);
  if (dmGraphSelect) {
    dmGraphSelect.value = state.dmGraphFocusId ? String(state.dmGraphFocusId) : '';
  }
  if (dmGraphSearchInput && state.dmGraphFocusId) {
    const selected = getDmGraphPool().find((item) => Number(item.id) === Number(state.dmGraphFocusId));
    if (selected) {
      setGraphSearchSelection(dmGraphSearchInput, selected, formatDmGraphLabel);
    }
  }
  return renderDmRelationsGraph();
}

function clearDmGraphSuggestions() {
  if (!dmGraphSuggestions) return;
  dmGraphSuggestions.innerHTML = '';
  dmGraphSuggestions.classList.remove('visible');
}

function renderDmGraphSearchResults(query) {
  if (!dmGraphSuggestions || !dmGraphSearchInput) return;
  dmGraphSuggestions.innerHTML = '';
  dmGraphSuggestions.classList.remove('visible');
  const pool = getDmGraphPool();
  if (!query) return;
  const results = dmGraphFuse
    ? dmGraphFuse.search(query).map((r) => r.item)
    : pool.filter((item) => {
        const target = `${item.code_name || ''} ${item.name || ''} ${item.role || ''}`.toLowerCase();
        return target.includes(query.toLowerCase());
      });
  results.slice(0, 8).forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = formatDmGraphLabel(item);
    btn.addEventListener('click', () => {
      setDmGraphFocus(item.id);
      setGraphSearchSelection(dmGraphSearchInput, item, formatDmGraphLabel);
      clearDmGraphSuggestions();
    });
    dmGraphSuggestions.appendChild(btn);
  });
  if (dmGraphSuggestions.children.length) {
    dmGraphSuggestions.classList.add('visible');
  }
}

function populateDmGraphOptions() {
  if (!dmGraphSelect) return;
  dmGraphSelect.innerHTML = '<option value="">Selecciona entidad</option>';
  const campaignOpt = document.createElement('option');
  campaignOpt.value = DM_GRAPH_CAMPAIGN_VALUE;
  campaignOpt.textContent = DM_GRAPH_CAMPAIGN_LABEL;
  dmGraphSelect.appendChild(campaignOpt);
  const pool = getDmGraphPool().sort((a, b) =>
    (a.code_name || a.name || '').localeCompare(b.code_name || b.name || '')
  );
  if (state.dmGraphScope === DM_GRAPH_SCOPE.ENTITY && !state.dmGraphFocusId && pool.length) {
    state.dmGraphFocusId = pool[0].id;
  }
  pool.forEach((entity) => {
    const opt = document.createElement('option');
    opt.value = entity.id;
    opt.textContent = formatDmGraphLabel(entity);
    dmGraphSelect.appendChild(opt);
  });
  refreshDmGraphFuse();
  if (state.dmGraphScope === DM_GRAPH_SCOPE.CAMPAIGN) {
    dmGraphSelect.value = DM_GRAPH_CAMPAIGN_VALUE;
    if (dmGraphSearchInput) {
      dmGraphSearchInput.value = DM_GRAPH_CAMPAIGN_LABEL;
      clearGraphSearchSelection(dmGraphSearchInput);
    }
    return;
  }
  if (state.dmGraphFocusId) {
    dmGraphSelect.value = String(state.dmGraphFocusId);
    if (dmGraphSearchInput) {
      const selected = pool.find((p) => p.id === state.dmGraphFocusId);
      if (selected) {
        setGraphSearchSelection(dmGraphSearchInput, selected, formatDmGraphLabel);
      }
    }
  } else {
    if (dmGraphSelect) dmGraphSelect.value = '';
    if (dmGraphSearchInput) {
      dmGraphSearchInput.value = '';
      clearGraphSearchSelection(dmGraphSearchInput);
    }
  }
}

async function renderDmRelationsGraph() {
  if (!dmGraphContainer) return;
  if (!state.dmMode) {
    dmGraphContainer.textContent = 'Activa el modo Sr. Verdad para ver relaciones.';
    return;
  }
  if (state.dmGraphScope === DM_GRAPH_SCOPE.CAMPAIGN) {
    return renderDmCampaignGraph();
  }
  populateDmGraphOptions();
  state.dmGraphScope = DM_GRAPH_SCOPE.ENTITY;
  const dmSelections = normalizeGraphSelectionIds(state.dmGraphSelections, getDmGraphPool());
  if (dmSelections.length) {
    state.dmGraphSelections = dmSelections;
    state.dmGraphFocusId = resolveGraphFocusId(dmSelections, state.dmGraphFocusId);
    renderGraphSelectionChips('dm', getDmGraphPool());
    updateGraphSelectionControls('dm', true);
    return renderCombinedRelationsGraph('dm');
  }
  updateGraphSelectionControls('dm', true);
  const focusId = state.dmGraphFocusId || (state.entities.find((e) => e.type !== 'poi')?.id || null);
  if (!focusId) {
    dmGraphContainer.textContent = 'No hay entidades para graficar.';
    return;
  }
  if (dmGraphSelect) dmGraphSelect.value = String(focusId);
  if (dmGraphSearchInput) {
    const selected = getDmGraphPool().find((p) => p.id === focusId);
    if (selected) {
      setGraphSearchSelection(dmGraphSearchInput, selected, formatDmGraphLabel);
    }
  }
  try {
    const response = await fetch(`/api/dm/entities/${focusId}/context`);
    if (response.status === 401) {
      performLogout({ message: 'Sesión expirada. Vuelve a autenticarte.' });
      return;
    }
    if (!response.ok) throw new Error('No se pudo cargar contexto para grafo.');
    const ctx = await response.json();
    await ensureDmGraphApi().update(ctx, { focusId, mode: 'dm', layout: state.dmGraphLayout });
  } catch (err) {
    logDebug(`Grafo relaciones error: ${err.message}`);
    console.error('Grafo relaciones error', err);
    dmGraphContainer.textContent = 'No se pudo dibujar el grafo.';
  }
}

async function renderDmCampaignGraph() {
  if (!dmGraphContainer) return;
  if (!state.dmMode) {
    dmGraphContainer.textContent = 'Activa el modo Sr. Verdad para ver relaciones.';
    return;
  }
  state.dmGraphScope = DM_GRAPH_SCOPE.CAMPAIGN;
  setGraphSelectionIds('dm', []);
  updateGraphSelectionControls('dm', false);
  if (dmGraphSearchInput) {
    dmGraphSearchInput.value = DM_GRAPH_CAMPAIGN_LABEL;
    clearGraphSearchSelection(dmGraphSearchInput);
  }
  try {
    const response = await fetch('/api/dm/graph/campaign');
    if (response.status === 401) {
      performLogout({ message: 'Sesión expirada. Vuelve a autenticarte.' });
      return;
    }
    if (!response.ok) throw new Error('No se pudo cargar el grafo de campaña.');
    const ctx = await response.json();
    const nodes = ctx.graph?.nodes || [];
    const candidate = nodes.find((node) => {
      const data = node.data || node;
      return data.entityId && data.type !== 'poi';
    });
    const focusId =
      ctx.graphFocusId ||
      candidate?.data?.graphId ||
      candidate?.data?.id ||
      (nodes[0]?.data?.graphId || nodes[0]?.data?.id || null);
    await ensureDmGraphApi().update(ctx, { focusId, mode: 'dm', layout: state.dmGraphLayout });
  } catch (err) {
    logDebug(`Grafo campaña error: ${err.message}`);
    console.error('Grafo campaña error', err);
    dmGraphContainer.textContent = 'No se pudo dibujar el grafo de campaña.';
  }
}

function populateAgentGraphOptions() {
  if (!agentGraphSelect) return;
  agentGraphSelect.innerHTML = '<option value="">Selecciona entidad</option>';
  const campaignOpt = document.createElement('option');
  campaignOpt.value = AGENT_GRAPH_CAMPAIGN_VALUE;
  campaignOpt.textContent = AGENT_GRAPH_CAMPAIGN_LABEL;
  agentGraphSelect.appendChild(campaignOpt);
  const pool = getAgentGraphPool().sort((a, b) =>
    (a.code_name || a.name || '').localeCompare(b.code_name || b.name || '')
  );
  if (state.agentGraphScope === AGENT_GRAPH_SCOPE.ENTITY && !state.agentGraphFocusId && pool.length) {
    state.agentGraphFocusId = pool[0].id;
  }
  pool.forEach((entity) => {
    const opt = document.createElement('option');
    opt.value = entity.id;
    opt.textContent = formatAgentGraphLabel(entity);
    agentGraphSelect.appendChild(opt);
  });
  if (state.agentGraphScope === AGENT_GRAPH_SCOPE.CAMPAIGN) {
    agentGraphSelect.value = AGENT_GRAPH_CAMPAIGN_VALUE;
    if (agentGraphSearchInput) {
      agentGraphSearchInput.value = AGENT_GRAPH_CAMPAIGN_LABEL;
      clearGraphSearchSelection(agentGraphSearchInput);
    }
    return;
  }
  if (state.agentGraphFocusId) {
    agentGraphSelect.value = String(state.agentGraphFocusId);
    if (agentGraphSearchInput) {
      const selected = pool.find((p) => p.id === state.agentGraphFocusId);
      if (selected) {
        setGraphSearchSelection(agentGraphSearchInput, selected, formatAgentGraphLabel);
      }
    }
  } else {
    agentGraphSelect.value = '';
    if (agentGraphSearchInput) {
      agentGraphSearchInput.value = '';
      clearGraphSearchSelection(agentGraphSearchInput);
    }
  }
  refreshAgentGraphFuse();
}

function refreshAgentGraphFuse() {
  const pool = getAgentGraphPool();
  if (typeof Fuse === 'undefined' || !pool.length) {
    agentGraphFuse = null;
    return;
  }
  agentGraphFuse = new Fuse(pool, {
    keys: ['code_name', 'name', 'real_name', 'role', 'type'],
    threshold: 0.35,
    includeScore: true
  });
}

function clearAgentGraphSuggestions() {
  if (!agentGraphSuggestions) return;
  agentGraphSuggestions.innerHTML = '';
  agentGraphSuggestions.classList.remove('visible');
}

function renderAgentGraphSearchResults(query) {
  if (!agentGraphSuggestions) return;
  agentGraphSuggestions.innerHTML = '';
  agentGraphSuggestions.classList.remove('visible');
  const pool = getAgentGraphPool();
  if (!query) return;
  const results = agentGraphFuse
    ? agentGraphFuse.search(query).map((r) => r.item)
    : pool.filter((item) => {
        const target = `${item.code_name || ''} ${item.name || ''} ${item.role || ''}`.toLowerCase();
        return target.includes(query.toLowerCase());
      });
  results.slice(0, 8).forEach((item) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = formatAgentGraphLabel(item);
    btn.addEventListener('click', () => {
      setAgentGraphFocus(item.id);
      if (agentGraphSearchInput) {
        setGraphSearchSelection(agentGraphSearchInput, item, formatAgentGraphLabel);
      }
      clearAgentGraphSuggestions();
    });
    agentGraphSuggestions.appendChild(btn);
  });
  if (agentGraphSuggestions.children.length) {
    agentGraphSuggestions.classList.add('visible');
  }
}

function setAgentGraphFocus(id) {
  if (id === AGENT_GRAPH_CAMPAIGN_VALUE) {
    state.agentGraphScope = AGENT_GRAPH_SCOPE.CAMPAIGN;
    state.agentGraphFocusId = null;
    if (agentGraphSelect) {
      agentGraphSelect.value = AGENT_GRAPH_CAMPAIGN_VALUE;
    }
    if (agentGraphSearchInput) {
      agentGraphSearchInput.value = AGENT_GRAPH_CAMPAIGN_LABEL;
      clearGraphSearchSelection(agentGraphSearchInput);
    }
    setGraphSelectionIds('agent', []);
    updateGraphSelectionControls('agent', false);
    return renderAgentCampaignGraph();
  }
  state.agentGraphScope = AGENT_GRAPH_SCOPE.ENTITY;
  const num = Number(id);
  state.agentGraphFocusId = Number.isNaN(num) ? null : num;
  updateGraphSelectionControls('agent', true);
  if (agentGraphSelect) {
    agentGraphSelect.value = state.agentGraphFocusId ? String(state.agentGraphFocusId) : '';
  }
  if (agentGraphSearchInput && state.agentGraphFocusId) {
    const selected = getAgentGraphPool().find((item) => Number(item.id) === Number(state.agentGraphFocusId));
    if (selected) {
      setGraphSearchSelection(agentGraphSearchInput, selected, formatAgentGraphLabel);
    }
  }
  return renderAgentRelationsGraph();
}

async function renderAgentRelationsGraph() {
  if (!agentGraphContainer) return;
  if (!state.agent) {
    agentGraphContainer.textContent = 'Inicia sesión como agente para ver relaciones.';
    return;
  }
  if (state.agentGraphScope === AGENT_GRAPH_SCOPE.CAMPAIGN) {
    return renderAgentCampaignGraph();
  }
  state.agentGraphScope = AGENT_GRAPH_SCOPE.ENTITY;
  populateAgentGraphOptions();
  const agentSelections = normalizeGraphSelectionIds(state.agentGraphSelections, getAgentGraphPool());
  if (agentSelections.length) {
    state.agentGraphSelections = agentSelections;
    state.agentGraphFocusId = resolveGraphFocusId(agentSelections, state.agentGraphFocusId);
    renderGraphSelectionChips('agent', getAgentGraphPool());
    updateGraphSelectionControls('agent', true);
    return renderCombinedRelationsGraph('agent');
  }
  updateGraphSelectionControls('agent', true);
  const focusId =
    state.agentGraphFocusId ||
    state.activeEntityAgent?.id ||
    (state.entities.find((e) => e.type !== 'poi')?.id || null);
  if (!focusId) {
    agentGraphContainer.textContent = 'No hay entidades para graficar.';
    return;
  }
  if (agentGraphSelect) agentGraphSelect.value = String(focusId);
  if (agentGraphSearchInput) {
    const selected = getAgentGraphPool().find((p) => p.id === focusId);
    if (selected) {
      setGraphSearchSelection(agentGraphSearchInput, selected, formatAgentGraphLabel);
    }
  }
  try {
    const response = await fetch(`/api/agent/entities/${focusId}/context`);
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    if (!response.ok) throw new Error('No se pudo cargar contexto para el grafo de agente.');
    const ctx = await response.json();
    await ensureAgentGraphApi().update(ctx, { focusId, mode: 'agent', layout: state.agentGraphLayout });
  } catch (err) {
    logDebug(`Grafo de agente error: ${err.message}`);
    console.error('Grafo de agente error', err);
    console.error(err.stack);
    agentGraphContainer.textContent = 'No se pudo dibujar el grafo.';
  }
}

async function renderAgentCampaignGraph() {
  if (!agentGraphContainer) return;
  if (!state.agent) {
    agentGraphContainer.textContent = 'Inicia sesión como agente para ver relaciones.';
    return;
  }
  state.agentGraphScope = AGENT_GRAPH_SCOPE.CAMPAIGN;
  setGraphSelectionIds('agent', []);
  updateGraphSelectionControls('agent', false);
  if (agentGraphSearchInput) {
    agentGraphSearchInput.value = AGENT_GRAPH_CAMPAIGN_LABEL;
    clearGraphSearchSelection(agentGraphSearchInput);
  }
  try {
    const response = await fetch('/api/agent/graph/campaign');
    if (response.status === 401) {
      handleUnauthorized();
      return;
    }
    if (!response.ok) throw new Error('No se pudo cargar el grafo de campaña.');
    const ctx = await response.json();
    const focusId =
      ctx.graphFocusId ||
      ctx.graph?.nodes?.[0]?.data?.graphId ||
      ctx.graph?.nodes?.[0]?.data?.id ||
      null;
    await ensureAgentGraphApi().update(ctx, { focusId, mode: 'agent', layout: state.agentGraphLayout });
  } catch (err) {
    logDebug(`Grafo campaña agente error: ${err.message}`);
    console.error('Grafo campaña agente error', err);
    agentGraphContainer.textContent = 'No se pudo dibujar el grafo de campaña para agentes.';
  }
}

if (typeof window !== 'undefined') {
  window.appGraph = window.appGraph || {};
  Object.assign(window.appGraph, {
    renderAgentRelationsGraph,
    renderDmRelationsGraph,
    setAgentGraphFocus,
    setDmGraphFocus,
    setWorkspaceView
  });
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
  updateMobileStateBadge();
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
  if (view === 'base') {
    ensureBaseVisualDefaults();
    applyBaseVisualSettings();
    base3d.resize();
    if (!baseState.baseViewActivated) {
      base3d.resetCamera?.({ immediate: true });
      baseState.baseViewActivated = true;
    }
  }
  base3d.setActive?.(view === 'base');
  if (view === 'entities') {
    renderAgentDossiers();
    renderAdminDossiers();
    if (isDmViewer() || state.agent) {
      loadEntities();
    }
  }
  if (view === 'inbox') {
    showInboxView();
  }
  if (view === 'relations') {
    if (state.dmMode) {
      renderDmRelationsGraph();
    } else {
      renderAgentRelationsGraph();
    }
  }
  if (view === 'journal' && state.dmMode) {
    reloadChatData();
    connectChatSocket();
  }
  if (view === 'console' && state.agent) {
    reloadChatData();
    connectChatSocket();
  }
}

async function loadDmContext(id) {
  if (!id) return;
  try {
    const response = await fetch(`/api/dm/entities/${id}/context`);
    if (response.status === 401) {
      performLogout({ message: 'Sesión expirada. Vuelve a autenticarte.' });
      return;
    }
    if (!response.ok) throw new Error('No se pudo cargar contexto.');
    const ctx = await response.json();
    state.activeEntityContext = ctx;
    if (state.entityEditorMode === 'edit' && state.activeEntityAdmin && Number(state.activeEntityAdmin.id) === Number(id)) {
      const enriched = {
        ...state.activeEntityAdmin,
        ...ctx.entity,
        poi_links: ctx.pois || [],
        relations: ctx.relations || [],
        entity_links: ctx.entity_links || []
      };
      populateEntityForm(enriched);
    }
    renderDmContext(ctx);
    renderEntitiesMap(ctx);
    await ensureDmGraphApi().update(ctx, { focusId: id, mode: 'dm', layout: state.dmGraphLayout });
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

function ensureMobileDmEditToggle(detail) {
  if (!detail || !isMobileView() || !isDmViewer()) return;
  if (detail.querySelector('#dm-mobile-edit-toggle')) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.id = 'dm-mobile-edit-toggle';
  button.className = 'ghost small dm-mobile-edit-toggle';
  button.textContent = 'Editar dossier';
  button.addEventListener('click', () => setMobileDmEditMode(true));
  const title = detail.querySelector('.card-title');
  if (title) {
    title.insertAdjacentElement('afterend', button);
  } else {
    detail.prepend(button);
  }
}

function renderDmEntityDetailCard(entity, ctx = {}) {
  const detail = document.getElementById('dm-entity-detail-card');
  const hero = document.getElementById('dm-entity-hero-card');
  const bestiaryRoot = document.getElementById('dm-bestiary-card') || bestiaryCard;
  const heroStack = hero?.parentElement;
  const stateSectionTitle = document.getElementById('entity-state-title'); // estado/afinidad label

  // When the hero card is re-rendered its innerHTML is replaced, which used to orphan the DM bestiary
  // (it lived inside the hero card in the static markup). Keep the card mounted as a sibling in the
  // hero stack so subsequent renders don't wipe it out.
  if (heroStack && bestiaryRoot && bestiaryRoot.parentElement !== heroStack) {
    heroStack.appendChild(bestiaryRoot);
  }

  if (!detail || !hero) return;
  const isPoi = entity && (entity.kind === 'poi' || entity.type === 'poi');
  const isCreature = normalizeEntityType(entity) === 'criatura';
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
      hero.style.display = '';
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
      hero.style.display = '';
      hero.innerHTML =
        '<div class="dm-entity-hero-body muted">Sin imagen disponible. Al elegir un dossier se mostrará aquí su foto o el plano.</div>';
    }
    ensureMobileDmEditToggle(detail);
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
          <div class="dm-detail-value">${sanitize(formatVeilLabel(entity.veil_status || entity.alignment || '—'))}</div>
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
    ensureMobileDmEditToggle(detail);
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
    ensureMobileDmEditToggle(detail);
  }

  const img = entity.image_url || entity.photo || '';
  const locked = entity.visibility === 'locked' && !isDmViewer();

  if (isPoi) {
    hero.classList.add('map-only');
    hero.style.display = '';
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
    hero.classList.remove('map-only');
    hero.classList.add('hidden');
    hero.style.display = 'none';
    hero.innerHTML = '';
    if (bestiaryRoot) {
      bestiaryRoot.classList.remove('hidden');
      bestiaryRoot.classList.add('bestiary-promoted');
      bestiaryRoot.style.display = 'block';
      bestiaryRoot.dataset.variant = 'dm';
      bestiaryRoot.dataset.empty = 'false';
    }
    renderBestiary(entity, 'dm');
  } else {
    hero.classList.remove('map-only');
    hero.style.display = '';
      hero.innerHTML = `
        <div class="dm-entity-hero-body">
            <div class="dm-entity-hero-media">
              ${locked
                ? `<div class="hero-wrapper hero-locked"><div class="locked-placeholder">LOCKED</div></div>`
                : img
              ? `<div class="hero-wrapper"><img src="${sanitize(img)}" alt="${callsign}" data-lightbox-img="${sanitize(img)}" /></div>`
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

function normalizeMelEntry(entry) {
  if (!entry) return null;
  if (typeof entry === 'string') {
    return { text: entry.trim(), is_public: true };
  }
  const text = (entry.text || entry.mel || entry.value || '').toString().trim();
  if (!text) return null;
  const isPublic = entry.is_public !== false && entry.visibility !== 'dm';
  return { text, is_public: isPublic };
}

function parseMel(raw = '') {
  if (!raw) return [];
  const trimmed = typeof raw === 'string' ? raw.trim() : raw;
  if (typeof trimmed === 'string' && trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed.map(normalizeMelEntry).filter(Boolean);
      }
    } catch (err) {
      console.warn('Fallo al parsear MEL JSON', err);
    }
  }
  return String(trimmed)
    .split(/[\n;,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((token) => {
      const parts = token.split('|');
      const maybeVis = parts.length > 1 ? parts.pop().trim().toLowerCase() : 'public';
      const text = parts.join('|').trim() || token.trim();
      const isPublic = maybeVis === 'dm' ? false : true;
      return normalizeMelEntry({ text, is_public: isPublic });
    })
    .filter(Boolean);
}

function serializeMel(list = []) {
  if (!list.length) return '';
  const sanitized = list.map(normalizeMelEntry).filter(Boolean);
  return sanitized.length ? JSON.stringify(sanitized) : '';
}

function normalizeEntityType(entity) {
  if (!entity) return '';
  const value = (entity.type || entity.kind || '').toString().trim().toLowerCase();
  return value;
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
    mel: scope.querySelector('[data-bestiary-mel]'),
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
  const summarySection = elements.summary?.closest('.bestiary-section');
  if (summarySection) {
    summarySection.style.display = 'none'; // Resumen público ya se muestra en el panel de detalle
  }
  const isCreature = normalizeEntityType(entity) === 'criatura';
  elements.card.classList.toggle('hidden', !isCreature);
  elements.card.dataset.variant = variant;
  if (elements.dmOnly.length) {
    elements.dmOnly.forEach((el) => el.classList.toggle('hidden', variant !== 'dm'));
  }
  const hasSelection = !!entity && isCreature;
  elements.card.dataset.empty = hasSelection ? 'false' : 'true';
  if (hasSelection) {
    elements.card.classList.remove('hidden');
    elements.card.style.display = 'block';
  }
  if (!hasSelection) {
    elements.callsign && (elements.callsign.textContent = 'Sin entidad seleccionada');
    elements.classification && (elements.classification.textContent = 'Clasificación: —');
    elements.threat && (elements.threat.textContent = 'Nivel de amenaza: —');
    elements.status && (elements.status.textContent = 'Estado: —');
    elements.alignment && (elements.alignment.textContent = 'Alineación: —');
    if (elements.behaviour) elements.behaviour.textContent = '—';
    if (elements.origin) elements.origin.textContent = '—';
    if (elements.protocols) {
      elements.protocols.innerHTML = '<li>Sin protocolos registrados.</li>';
    }
    if (elements.mel) {
      elements.mel.innerHTML = '<li>Sin MEL registradas.</li>';
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
  if (elements.mel) {
    const melItems = parseMel(record.mel);
    const visibleMel = variant === 'dm' ? melItems : melItems.filter((item) => item.is_public !== false);
    const hasHidden = melItems.some((item) => item.is_public === false);
    if (!visibleMel.length) {
      elements.mel.innerHTML = hasHidden && variant !== 'dm' ? '<li>MEL reservadas al DJ.</li>' : '<li>Sin MEL registradas.</li>';
    } else {
      elements.mel.innerHTML = visibleMel
        .map((item) => {
          const dmTag = item.is_public === false ? '<span class="muted text-xs">(DM)</span>' : '';
          return `<li>${sanitize(item.text)}${dmTag ? ` ${dmTag}` : ''}</li>`;
        })
        .join('');
    }
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
  const target = state.entities.find((entity) => Number(entity.id) === targetId) || state.activeEntityAdmin;
  try {
    const response = await fetch(`/api/dm/entities/${targetId}`, {
      method: 'DELETE'
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
    if (target && target.type === 'poi') {
      await loadPois();
    }
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
  const focalLink = `<button type="button" class="focal-link" data-focal-poi-jump="${poi.id}">${sanitize(poi.name)}</button>`;
  const mobile = isMobileView();
  const mobileHtml = `
    <div class="mobile-focal-card">
      <div class="mobile-focal-eyebrow">
        <span>PDI FOCAL</span>
        <span class="mobile-focal-session">Sesión ${sanitize(poi.session_tag || '—')}</span>
      </div>
      <div class="mobile-focal-title">
        <span class="focal-icon">${icon}</span>
        ${focalLink}
      </div>
      <div class="mobile-focal-meta">
        <div class="mobile-focal-line"><span class="label">Amenaza</span><span>${poi.threat_level}</span></div>
        <div class="mobile-focal-line"><span class="label">Velo</span><span>${sanitize(formatVeilLabel(poi.veil_status))}</span></div>
        <div class="mobile-focal-line"><span class="label">Notas</span><span>${sanitize(poi.public_note || 'Sin notas públicas')}</span></div>
      </div>
      ${safeImage
        ? `<div class="mobile-focal-image"><img src="${safeImage}" alt="${sanitize(poi.name)}"/></div>`
        : `<div class="mobile-focal-image"><span class="muted">No image available</span></div>`}
      ${relatedBlock ? `<div class="mobile-focal-related">${relatedBlock}</div>` : ''}
    </div>
  `;

  const desktopHtml = `
    <div class="poi-focal-header">
      <div class="poi-name">${icon} ${focalLink}</div>
    <div class="poi-meta">Amenaza ${poi.threat_level} · Velo ${sanitize(formatVeilLabel(poi.veil_status))}</div>
  </div>
  <div class="poi-session">Sesión ${sanitize(poi.session_tag || '—')}</div>
  <div class="poi-note">${sanitize(poi.public_note || 'Sin notas públicas')}</div>
    ${safeImage ? `<div class="poi-image-thumb"><img src="${safeImage}" alt="${sanitize(poi.name)}" data-lightbox-img="${safeImage}"/></div>` : ''}
  ${relatedBlock}
`;

  focalPoiContent.innerHTML = mobile ? mobileHtml : desktopHtml;
  if (focalPoiContentDm) {
    focalPoiContentDm.innerHTML = mobile ? mobileHtml : desktopHtml;
  }
}

function renderActiveMessageCard() {
  const msg = state.activeMessage;
  const viewer = getMessageViewer();
  const filters = getMessageFilters(state.activeMessageContext);
  if (state.activeMessageContext === 'overlay') {
    return;
  }
  if (state.dmMode) {
    renderMessageReader(messageReader, msg, viewer, filters);
  } else {
    renderMessageReader(messageReaderDm, msg, viewer, filters);
  }
}

function renderMessageReader(reader, msg, viewer, filters) {
  if (!reader) return;
  if (!msg) {
    reader.textContent = 'No hay despachos.';
    return;
  }
  const isRead = viewer ? Array.isArray(msg.read_by) && msg.read_by.includes(viewer) : true;
  const threadLine = msg.thread_id ? `Hilo #${sanitize(msg.thread_id)}` : '';
  const replyLine = msg.reply_to_id ? `Respuesta a #${sanitize(msg.reply_to_id)}` : '';
  const priorityLine = msg.priority && msg.priority !== 'normal' ? `Prioridad ${sanitize(msg.priority)}` : '';
  const metaExtras = [threadLine, replyLine, priorityLine].filter(Boolean).join(' · ');
  const canReply =
    filters?.box !== 'sent' && (state.dmMode || (msg.created_by || '') === DM_ACTOR);
  const html = `
    <div class="message-reader-header">
      <div class="title">${sanitize(msg.subject || '(Sin asunto)')}</div>
      <div class="meta">De: ${sanitize(msg.sender)} → ${sanitize(msg.recipient)} · ${new Date(
    msg.created_at
  ).toLocaleString()}</div>
      ${metaExtras ? `<div class="meta">${metaExtras}</div>` : ''}
    </div>
    <div class="message-body">${sanitize(msg.body || '')}</div>
    <div class="message-actions">
      ${!isRead && viewer ? `<button type="button" class="ghost small" data-mark-read="${msg.id}">Marcar como leído</button>` : ''}
      ${canReply ? `<button type="button" class="ghost small" data-reply="${msg.id}">Responder</button>` : ''}
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
    deleteBtn.addEventListener('click', () => {
      const ok = window.confirm('¿Eliminar este despacho?');
      if (!ok) return;
      deleteMessageForViewer(msg.id, viewer, filters?.box || 'inbox');
    });
  }
}

function setFocalPoi(poi) {
  const normalized = state.workspaceView || 'map';
  if (!poi) {
    state.poiFocal = null;
    setPoiSelected(null);
    renderFocalPoiCard();
    highlightPoiInList(null);
    return;
  }
  state.poiFocal = poi;
  setPoiSelected(poi?.id);
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
  if (!state.dmMode && !state.agent) return;
  loadJournalEntry();
}

async function loadJournalEntry() {
  if (!state.dmMode && !state.agent) {
    state.missionNotes = '';
    renderMissionCards();
    return;
  }
  const season = Number(journalSeasonInput?.value) || state.journalSeason || 2;
  const session = Number(journalSessionInput?.value) || state.journalSession || 0;
  state.journalSeason = season;
  state.journalSession = session;
  const path = state.dmMode ? `/api/dm/journal?season=${season}&session=${session}` : `/api/agent/journal?season=${season}&session=${session}`;
  try {
    const res = await fetch(path);
    if (res.status === 401) {
      if (state.dmMode || state.agent) {
        performLogout({ message: 'Sesión expirada. Vuelve a autenticarte.' });
      }
      return;
    }
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
  if (state.dmMode) {
    setJournalStatus('clean');
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
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ ...payload, dm_note: state.dmMode ? state.journalDm : undefined })
    });
    if (res.status === 401) {
      if (state.dmMode || state.agent) {
        performLogout({ message: 'Sesión expirada. Vuelve a autenticarte.' });
      }
      return false;
    }
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
    if (state.dmMode) {
      setJournalStatus('saved');
    }
  } catch (err) {
    logDebug(`Error guardando journal: ${err.message}`);
    showMessage('No se pudo guardar el journal.', true);
  } finally {
    setSavingButton(journalSaveBtn, false);
  }
}

function renderMissionCards() {
  if (missionBriefText) {
    missionBriefText.textContent = state.missionNotes || DEFAULT_MISSION_BRIEF;
  }
  if (journalPublicInput && journalPublicInput !== document.activeElement) {
    journalPublicInput.value = state.missionNotes;
  }
  setAgentJournalText(state.missionNotes || DEFAULT_MISSION_BRIEF);
}

async function loadAgentJournal() {
  if (!state.agent) return;
  const season = Number(agentJournalSeasonInput?.value) || state.agentJournalSeason || 2;
  const session = Number(agentJournalSessionInput?.value) || state.agentJournalSession || 0;
  state.agentJournalSeason = season;
  state.agentJournalSession = session;
  if (agentJournalPublicInput?.isContentEditable) {
    setAgentJournalEditing(false);
  }
  try {
    const res = await fetch(`/api/agent/journal?season=${season}&session=${session}`);
    if (!res.ok) throw new Error('No se pudo cargar journal de agente');
    const data = await res.json();
    state.missionNotes = data.public_note || data.public_summary || '';
    if (missionBriefText) {
      missionBriefText.textContent = state.missionNotes || DEFAULT_MISSION_BRIEF;
    }
    setAgentJournalText(state.missionNotes || DEFAULT_MISSION_BRIEF);
  } catch (err) {
    logDebug(`Journal agente load error: ${err.message}`);
    showMessage('No se pudo cargar el journal.', true);
  }
}

async function handleAgentJournalSave() {
  if (!agentJournalSaveBtn) return;
  setSavingButton(agentJournalSaveBtn, true, 'Guardando…');
  const draft = getAgentJournalText();
  const noteText = draft === DEFAULT_MISSION_BRIEF ? '' : draft;
  const payload = {
    season: Number(agentJournalSeasonInput?.value) || state.agentJournalSeason || 2,
    session: Number(agentJournalSessionInput?.value) || state.agentJournalSession || 0,
    public_note: noteText
  };
  try {
    const res = await fetch('/api/agent/journal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'No se pudo guardar.');
    }
    state.agentJournalSeason = payload.season;
    state.agentJournalSession = payload.session;
    state.missionNotes = payload.public_note;
    if (missionBriefText) missionBriefText.textContent = state.missionNotes || DEFAULT_MISSION_BRIEF;
    setAgentJournalText(state.missionNotes || DEFAULT_MISSION_BRIEF);
    showMessage('Journal de agente guardado.');
    return true;
  } catch (err) {
    logDebug(`Journal agente save error: ${err.message}`);
    showMessage('No se pudo guardar el journal.', true);
    return false;
  } finally {
    setSavingButton(agentJournalSaveBtn, false);
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

function updateMapInteractionMode() {
  if (!state.map) return;
  const mobile = isMobileView();
  const isMapView = state.workspaceView === 'map' || document.body?.classList.contains('map-view');
  const canvas = state.map.getCanvas?.();
  const container = state.map.getCanvasContainer?.();
  if (mobile) {
    if (isMapView) {
      state.map.dragPan.enable();
      state.map.touchZoomRotate.enable();
      state.map.scrollZoom.disable();
      state.map.dragRotate.disable();
      state.map.doubleClickZoom.disable();
      state.map.keyboard.disable();
      if (canvas) canvas.style.touchAction = 'none';
      if (container) container.style.touchAction = 'none';
    } else {
      state.map.dragPan.disable();
      state.map.scrollZoom.disable();
      state.map.dragRotate.disable();
      state.map.touchZoomRotate.disable();
      state.map.doubleClickZoom.disable();
      state.map.keyboard.disable();
      if (canvas) canvas.style.touchAction = 'pan-y';
      if (container) container.style.touchAction = 'pan-y';
    }
  } else {
    state.map.dragPan.enable();
    state.map.scrollZoom.enable();
    state.map.dragRotate.enable();
    state.map.touchZoomRotate.enable();
    state.map.doubleClickZoom.enable();
    state.map.keyboard.enable();
    if (canvas) canvas.style.touchAction = '';
    if (container) container.style.touchAction = '';
  }
}

function syncMobileDmEditMode(forceOff = false) {
  if (!document.body) return;
  const mobile = isMobileView();
  const dm = isDmViewer();
  const onDatabase = state.mobileTab === 'database';
  if (forceOff || !mobile || !dm || !onDatabase) {
    state.mobileDmEditMode = false;
  }
  document.body.classList.toggle('mobile-dm-edit', mobile && dm && onDatabase && state.mobileDmEditMode);
}

function syncMobileDmConsoleTab(forceTab) {
  if (!document.body) return;
  const mobile = isMobileView();
  const dm = isDmViewer();
  const onConsole = state.mobileTab === 'console';
  if (!mobile || !dm || !onConsole) {
    document.body.removeAttribute('data-dm-console-tab');
    if (journalPublicInput) journalPublicInput.readOnly = false;
    return;
  }
  const tab = forceTab || state.mobileDmConsoleTab || 'messages';
  state.mobileDmConsoleTab = tab;
  document.body.setAttribute('data-dm-console-tab', tab);
  dmMobileConsoleTabs.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.dmConsoleTab === tab);
  });
  if (journalPublicInput) {
    journalPublicInput.readOnly = tab === 'journal';
  }
}

function setMobileDmConsoleTab(tab) {
  state.mobileDmConsoleTab = tab;
  syncMobileDmConsoleTab(tab);
}

function setMobileDmEditMode(enabled) {
  state.mobileDmEditMode = !!enabled;
  syncMobileDmEditMode();
  if (state.mobileDmEditMode) {
    window.scrollTo(0, 0);
  }
}

function updateMobileStateBadge() {
  if (!document.body) return;
  if (!mobileStateBadge) return;
  const mobileTab = document.body.dataset.mobileTab || 'none';
  const workspaceView = document.body.dataset.workspaceView || 'none';
  const isMobile = isMobileView() ? 'mobile' : 'desktop';
  const hasMobileClass = document.body.classList.contains('is-mobile') ? 'yes' : 'no';
  mobileStateBadge.textContent =
    `tab:${mobileTab}\n` +
    `view:${workspaceView}\n` +
    `mode:${isMobile} is-mobile:${hasMobileClass}`;
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
  updateMobileStateBadge();
  if (tab === 'map') {
    setWorkspaceView('map');
    scheduleMapResize();
  } else if (tab === 'console') {
    if (isDmViewer()) {
      setWorkspaceView('journal');
      setMobileDmConsoleTab('messages');
    } else {
      setWorkspaceView('console');
    }
  } else if (tab === 'base') {
    setWorkspaceView('base');
  } else if (tab === 'database') {
    if (isDmViewer()) {
      setWorkspaceView('entities');
    } else {
      setWorkspaceView('database');
    }
  } else if (tab === 'sheet') {
    setWorkspaceView('sheet');
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
  syncMobileDmEditMode(tab !== 'database');
  syncMobileDmConsoleTab();
}

function updateViewportMode() {
  const mobile = isMobileView();
  if (!document.body) return;
  document.body.classList.toggle('mobile-mode', mobile);
  document.body.classList.toggle('is-mobile', mobile);
  updateMapInteractionMode();
  syncMobileDmEditMode();
  syncMobileDmConsoleTab();
  updateMobileStateBadge();
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
      await loadPois();
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

function triggerUnlockFlow(entityId, hint = '') {
  if (!entityId) return;
  openUnlockOverlay(entityId, hint);
}

function updateMessageFromField() {
  if (!messageFromInput) return;
  if (state.dmMode) {
    messageFromInput.readOnly = false;
    if (!messageFromInput.value || messageFromInput.value === 'Agente de Campo') {
      messageFromInput.value = DM_DEFAULT_SENDER;
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
  const parsed = raw
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
  if (kind === 'poi') {
    const seen = new Map();
    parsed.forEach((entry) => {
      seen.set(entry.poi_id, entry);
    });
    return Array.from(seen.values());
  }
  const seen = new Map();
  parsed.forEach((entry) => {
    seen.set(entry.to_entity_id, entry);
  });
  return Array.from(seen.values());
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

function getTokenLabel(item, kind = 'entity', options = {}) {
  const showVisibility = options.showVisibility !== false;
  const showRelationType = options.showRelationType === true;
  if (kind === 'poi') {
    const name = item.code_name || item.name || item.title || `PdI #${item.id || item.poi_id}`;
    if (!showVisibility) return name;
    const vis = item.is_public === false ? 'solo DM' : 'agentes';
    return vis ? `${name} · ${vis}` : name;
  }
  const name = item.code_name || item.name || item.title || `Entidad #${item.id || item.to_entity_id}`;
  const rel = item.relation_type ? String(item.relation_type).trim() : '';
  const withRel = showRelationType && rel ? `${name} - ${rel}` : name;
  if (!showVisibility) return withRel;
  const vis = item.is_public === false ? 'solo DM' : 'agentes';
  return vis ? `${withRel} · ${vis}` : withRel;
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
  const allowVisibilityToggle = config.allowVisibilityToggle !== false;
  const forcedVisibility = config.forceVisibility || '';
  const showVisibilityLabel = config.showVisibilityLabel !== false;
  const showRelationType = config.showRelationType === true;
  const allowRelationEdit = config.allowRelationEdit !== false;

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
    const visToken = forcedVisibility || (item.is_public === false ? 'dm' : 'public');
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
    const normalizedTokens = forcedVisibility
      ? tokens.map((token) => {
        const [idPart, extraPart = ''] = token.split('|');
        return `${idPart}|${extraPart}|${forcedVisibility}`;
      })
      : tokens;
    if (forcedVisibility && normalizedTokens.join(',') !== tokens.join(',')) {
      writeTokens(hidden, normalizedTokens);
    }
    normalizedTokens.forEach((token) => {
      const [id, extra, visibility = 'public'] = token.split('|');
      const displayVisibility = forcedVisibility || visibility;
      const match = dataList.find((item) => String(item.id || item.poi_id || item.to_entity_id || item.target_id) === id);
      const roleParts = (extra || '').split(':');
      const label = match
        ? getTokenLabel(
          {
            ...match,
            relation_type: extra,
            role_at_poi: roleParts[0] || '',
            session_tag: roleParts[1] || match.session_tag,
            is_public: displayVisibility !== 'dm'
          },
          mode,
          { showVisibility: showVisibilityLabel, showRelationType }
        )
        : token;
      const chip = document.createElement('span');
      chip.className = 'chip';
      const labelSpan = document.createElement('span');
      labelSpan.className = 'chip-label';
      labelSpan.textContent = label;
      chip.appendChild(labelSpan);
      if (mode === 'entity' && allowRelationEdit) {
        labelSpan.title = 'Editar relación';
        labelSpan.style.cursor = 'pointer';
        labelSpan.addEventListener('click', () => {
          const current = extra || '';
          const next = window.prompt('Tipo de relación', current);
          if (next === null) return;
          const trimmed = next.trim();
          if (!trimmed) return;
          const tokensCurrent = tokensFromHidden(hidden);
          const newToken = `${id}|${trimmed}|${visibility}`;
          const filtered = tokensCurrent.filter((t) => !t.startsWith(`${id}|`));
          filtered.push(newToken);
          writeTokens(hidden, filtered);
          renderChips(filtered);
        });
      }
      const actions = document.createElement('div');
      actions.className = 'chip-actions';
      if ((mode === 'entity' || mode === 'poi') && allowVisibilityToggle && !forcedVisibility) {
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.textContent = displayVisibility === 'dm' ? 'DM' : 'AG';
        toggle.title = displayVisibility === 'dm' ? 'Solo DM' : 'Visible agentes';
        toggle.addEventListener('click', () => {
          const tokensCurrent = tokensFromHidden(hidden);
          const nextVis = displayVisibility === 'dm' ? 'public' : 'dm';
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

function getMelTokens() {
  return Array.isArray(state.melTokens) ? state.melTokens : [];
}

function setMelTokens(list = []) {
  const normalized = (list || []).map((entry) => normalizeMelEntry(entry) || entry).filter(Boolean);
  console.log('MEL set tokens', normalized);
  state.melTokens = normalized;
  if (entityMelInput) {
    entityMelInput.value = serializeMel(normalized);
  }
  renderMelChips();
}

function toggleMelVisibilityAt(index) {
  const tokens = Array.isArray(state.melTokens)
    ? state.melTokens.map((entry) => ({ ...entry }))
    : [];
  const current = tokens[index];
  if (!current) return;
  const isPublic = current.is_public !== false && current.visibility !== 'dm';
  tokens.splice(index, 1, { ...current, is_public: !isPublic });
  console.log('MEL toggle', { index, from: isPublic ? 'ag' : 'dm', to: isPublic ? 'dm' : 'ag' });
  setMelTokens(tokens);
}

function renderMelChips() {
  if (!entityMelChips) return;
  const tokens = getMelTokens();
  console.log('MEL render chips', tokens);
  entityMelChips.innerHTML = '';
  tokens.forEach((item, index) => {
    const chip = document.createElement('span');
    const isDmOnly = item.is_public === false;
    chip.className = 'chip';
    if (isDmOnly) chip.classList.add('mel-dm');
    chip.dataset.visibility = isDmOnly ? 'dm' : 'ag';
    chip.dataset.index = String(index);
    const label = document.createElement('span');
    label.className = 'chip-label';
    label.textContent = isDmOnly ? `[DM] ${item.text}` : `[AG] ${item.text}`;
    chip.appendChild(label);
    const actions = document.createElement('div');
    actions.className = 'chip-actions';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'chip-toggle';
    toggle.dataset.index = String(index);
    toggle.textContent = isDmOnly ? 'DM' : 'AG';
    toggle.title = isDmOnly ? 'Solo DM' : 'Visible agentes';
    toggle.dataset.visibility = isDmOnly ? 'dm' : 'ag';
    if (isDmOnly) toggle.classList.add('is-dm');
    toggle.addEventListener('click', (e) => {
      console.log('MEL toggle btn', { index, target: e.target?.className });
      e.stopPropagation();
      toggleMelVisibilityAt(index);
    });
    actions.appendChild(toggle);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.className = 'chip-remove';
    remove.dataset.index = String(index);
    remove.addEventListener('click', () => {
      const next = getMelTokens().slice();
      next.splice(index, 1);
      setMelTokens(next);
    });
    actions.appendChild(remove);
    chip.appendChild(actions);
    chip.addEventListener('click', (event) => {
      if (event.target.closest('.chip-remove') || event.target.closest('.chip-toggle')) return;
      toggleMelVisibilityAt(index);
    });
    entityMelChips.appendChild(chip);
  });
}

function addMelFromInput() {
  if (!entityMelEntry) return;
  const value = entityMelEntry.value.trim();
  if (!value) return;
  const tokens = getMelTokens().concat([{ text: value, is_public: true }]);
  setMelTokens(tokens);
  entityMelEntry.value = '';
}

function handleMelChipClick(event) {
  const toggle = event.target.closest('.chip-toggle');
  const remover = event.target.closest('.chip-remove');
  const chip = event.target.closest('.chip');
  console.log('MEL handler event', { type: event.type, target: event.target?.className });
  if (!chip) return;
  const index = Number(chip.dataset.index);
  if (Number.isNaN(index)) return;
  if (remover) {
    console.log('MEL remove', { index });
    const next = getMelTokens().slice();
    next.splice(index, 1);
    setMelTokens(next);
    return;
  }
  if (toggle) {
    // button handles its own toggle; avoid double flip
    return;
  }
  console.log('MEL chip click', { index, toggle: !!toggle });
  toggleMelVisibilityAt(index);
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
  setMelTokens(parseMel(entity.mel || ''));
  entityPublicNoteInput.value = entity.public_summary || entity.public_note || '';
  entityDmNoteInput.value = entity.dm_notes || entity.dm_note || '';
  entityVisibilityInput.value = entity.visibility || 'agent_public';
  entityUnlockInput.value = entity.unlock_code || '';
  entityLockedHintInput.value = entity.locked_hint || '';
  entityArchivedInput.checked = !!entity.archived;
  const poiTokens = buildMultiTokens(entity.pois || entity.poi_links || [], 'poi');
  entityPoisInput.value = poiTokens.join(',');
  const relationTokens = buildMultiTokens(entity.relations || entity.links || [], 'entity');
  entityLinksInput.value = relationTokens.join(',');
  entityPoisSelect?.renderChips?.(tokensFromHidden(entityPoisInput));
  entityLinksSelect?.renderChips?.(tokensFromHidden(entityLinksInput));

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
    if (poiEntityLinksInput && poiEntityLinksSelect) {
      const poiEntityTokens = buildMultiTokens(entity.entity_links || entity.links || [], 'entity');
      poiEntityLinksInput.value = poiEntityTokens.join(',');
      poiEntityLinksSelect.renderChips(tokensFromHidden(poiEntityLinksInput));
    }
  }
  toggleUnlockFields();
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
  setMelTokens([]);
  entityPoisInput.value = '';
  entityLinksInput.value = '';
  entityPoisSelect?.renderChips?.([]);
  entityLinksSelect?.renderChips?.([]);
  poiEntityLinksInput && (poiEntityLinksInput.value = '');
  poiEntityLinksSelect?.renderChips?.([]);
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
    if (!state.dmMode) {
      showMessage('Se requiere canal de Sr. Verdad para borrar entidades.', true);
      return;
    }
    const response = await fetch(`/api/dm/entities/${entity.id}`, {
      method: 'DELETE'
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
    if (entity.type === 'poi') {
      await loadPois();
    }
    loadActivity();
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
    mel: entityMelInput?.value.trim(),
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
  if (!state.dmMode) {
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
        'Content-Type': 'application/json'
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
    loadActivity();
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

function findPoiEntityById(id) {
  return state.entities.find((entity) => {
    const isPoi = entity.type === 'poi' || entity.kind === 'poi';
    if (!isPoi) return false;
    const candidate = entity.poi_id || entity.id;
    return Number(candidate) === Number(id);
  });
}

function findEntityByName(name) {
  if (!name) return null;
  const target = name.trim().toLowerCase();
  return state.entities.find((e) => (e.name || '').toLowerCase() === target) || null;
}

function setActiveEntityAgentById(id) {
  if (!state.agent) return;
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
  if (!state.agent) return;
  try {
    const response = await fetch(`/api/agent/entities/${id}/context`);
    if (response.status === 401) {
      performLogout({ message: 'Sesión expirada. Vuelve a autenticarte.' });
      return;
    }
    if (!response.ok) return;
    const ctx = await response.json();
    if (ctx.entity && ctx.entity.visibility === 'locked') return;
    const merged = { ...ctx.entity, poi_links: ctx.pois, sessions: ctx.sessions, links: ctx.relations };
    updateAgentCreatureLayout(merged);
    renderAgentEntityDetailCard(merged, ctx);
    const detailTarget = agentDossierDetail || dossierDetail;
    if (detailTarget) {
      renderDossierDetailView(detailTarget, merged, { dm: false });
    }
    state.agentGraphFocusId = Number(id);
    await ensureAgentGraphApi().update(ctx, { focusId: id, mode: 'agent', layout: state.agentGraphLayout });
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

async function hydrateFromSession() {
  const storedAgentEntity = getCookie('agent_active_entity');
  try {
    const response = await fetch('/api/auth/me');
    if (!response.ok) throw new Error(`status ${response.status}`);
    const session = await response.json();
    if (session.role === 'dm') {
      activateDmMode();
      hideBootScreen();
      showMessage('Acceso de Sr. Verdad restaurado.');
      setWorkspaceView('map');
    } else if (session.role === 'agent') {
      const agent = {
        username: session.agentId || 'agent',
        display: session.agentDisplay || session.agentId || 'Agente de Campo'
      };
      setAgent(agent);
      hideBootScreen();
      showMessage('Sesión de agente restaurada.');
      if (storedAgentEntity) {
        state.pendingAgentEntityId = Number(storedAgentEntity);
      }
    } else {
      resetAuthState();
    }
  } catch (err) {
    logDebug(`hydrateFromSession failed: ${err.message}`);
  }
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
  const isCreature = normalizeEntityType(entity) === 'criatura';
  document.body.classList.toggle('agent-creature-view', !!isCreature);
}

function setAgentDossierPanel(panel, root) {
  const target = panel || 'dossier';
  state.agentDossierPanel = target;
  if (!root) return;
  root.querySelectorAll('[data-agent-dossier-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.agentDossierTab === target);
  });
  root.querySelectorAll('[data-agent-dossier-panel]').forEach((pane) => {
    pane.classList.toggle('active', pane.dataset.agentDossierPanel === target);
  });
}

function bindAgentDossierTabs(root) {
  if (!root) return;
  root.querySelectorAll('[data-agent-dossier-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setAgentDossierPanel(btn.dataset.agentDossierTab, root);
    });
  });
  setAgentDossierPanel(state.agentDossierPanel || 'dossier', root);
}

function initAgentNotesEditor(root, entity, ctx) {
  if (!root) return;
  const panel = root.querySelector('[data-agent-dossier-panel="notes"]');
  if (!panel) return;
  if (!entity || entity.visibility === 'locked') return;

  const notesInput = panel.querySelector('[data-agent-notes-input]');
  const status = panel.querySelector('[data-agent-notes-status]');
  const saveBtn = panel.querySelector('[data-agent-notes-save]');
  const poisBlock = panel.querySelector('[data-agent-notes-pois-block]');
  const linksBlock = panel.querySelector('[data-agent-notes-links-block]');
  const poisSearch = panel.querySelector('[data-agent-pois-search]');
  const poisSuggestions = panel.querySelector('[data-agent-pois-suggestions]');
  const poisChips = panel.querySelector('[data-agent-pois-chips]');
  const poisHidden = panel.querySelector('[data-agent-pois-hidden]');
  const linksSearch = panel.querySelector('[data-agent-links-search]');
  const linksSuggestions = panel.querySelector('[data-agent-links-suggestions]');
  const linksChips = panel.querySelector('[data-agent-links-chips]');
  const linksHidden = panel.querySelector('[data-agent-links-hidden]');

  if (notesInput) notesInput.value = entity.agent_notes || '';
  const isPoi = entity.type === 'poi';
  if (poisBlock) poisBlock.classList.toggle('hidden', isPoi);
  if (linksBlock) linksBlock.classList.toggle('hidden', isPoi);

  const poiTokens = buildMultiTokens(ctx?.pois || [], 'poi');
  const linkTokens = buildMultiTokens(ctx?.relations || [], 'entity');
  if (poisHidden) poisHidden.value = isPoi ? '' : poiTokens.join(',');
  if (linksHidden) linksHidden.value = isPoi ? '' : linkTokens.join(',');

  let poiConfig = null;
  let linkConfig = null;
  if (!isPoi) {
    poiConfig = {
      input: poisSearch,
      suggestions: poisSuggestions,
      chips: poisChips,
      hidden: poisHidden,
      allowVisibilityToggle: false,
      forceVisibility: 'public',
      showVisibilityLabel: false
    };
    linkConfig = {
      input: linksSearch,
      suggestions: linksSuggestions,
      chips: linksChips,
      hidden: linksHidden,
      allowVisibilityToggle: false,
      forceVisibility: 'public',
      showVisibilityLabel: false,
      showRelationType: true,
      allowRelationEdit: true
    };

    setupMultiSelect(
      poiConfig,
      () => (state.pois || []).filter((p) => p.visibility === 'agent_public'),
      'poi'
    );
    setupMultiSelect(
      linkConfig,
      () => (state.entities || []).filter((e) => e.type !== 'poi' && e.visibility === 'agent_public'),
      'entity'
    );

    if (poisHidden && poiConfig.renderChips) {
      poiConfig.renderChips(tokensFromHidden(poisHidden));
    }
    if (linksHidden && linkConfig.renderChips) {
      linkConfig.renderChips(tokensFromHidden(linksHidden));
    }
  }

  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      if (!entity?.id) return;
      if (status) status.textContent = '';
      const payload = {
        agent_notes: notesInput?.value.trim() || ''
      };
      if (!isPoi) {
        payload.poi_links = parseMultiSelect(poisHidden?.value, 'poi');
        payload.relations = parseMultiSelect(linksHidden?.value, 'entity');
      }
      setSavingButton(saveBtn, true, 'Guardando…');
      try {
        const response = await fetch(`/api/agent/entities/${entity.id}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (response.status === 401) {
          performLogout({ message: 'Sesión expirada. Vuelve a autenticarte.' });
          return;
        }
        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          if (status) status.textContent = error.error || 'No se pudo guardar.';
          return;
        }
        if (status) status.textContent = 'Notas actualizadas.';
        state.agentDossierPanel = 'notes';
        await loadAgentContext(entity.id);
        loadActivity();
      } catch (err) {
        if (status) status.textContent = 'No se pudo guardar.';
      } finally {
        setSavingButton(saveBtn, false);
      }
    });
  }
}

function renderAgentEntityDetailCard(entity, ctx = {}) {
  const panels = Array.from(document.querySelectorAll('.agent-entities-top'));
  if (!panels.length) return;
  const isPoi = entity && (entity.kind === 'poi' || entity.type === 'poi');
  const isCreature = normalizeEntityType(entity) === 'criatura';
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
  const locked = entity?.visibility === 'locked';
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
      detail.innerHTML = `
        <div class="card-title">Detalle de entidad</div>
        <div class="agent-dossier-tabs">
          <button type="button" class="agent-dossier-tab active" data-agent-dossier-tab="dossier">Dossier</button>
          <button type="button" class="agent-dossier-tab" data-agent-dossier-tab="notes">Notas agentes</button>
        </div>
        <div class="agent-dossier-panels">
          <div class="agent-dossier-panel active" data-agent-dossier-panel="dossier">
            <div class="muted">Selecciona un dossier en la lista para ver sus notas.</div>
          </div>
          <div class="agent-dossier-panel" data-agent-dossier-panel="notes">
            <div class="agent-notes-empty">Selecciona una entidad para ver notas de agente.</div>
          </div>
        </div>
      `;
      hero.classList.remove('map-only', 'hidden');
      hero.innerHTML = '<div class="dm-entity-hero-body muted">Sin imagen disponible.</div>';
      if (bestiaryRoot) bestiaryRoot.classList.add('hidden');
      renderBestiary(null, { variant: 'agent', root: bestiaryRoot });
      bindAgentDossierTabs(detail);
      return;
    }

    if (isPoi) {
      if (locked) {
        detail.innerHTML = `
          <div class="card-title">PdI</div>
          <div class="agent-dossier-tabs">
            <button type="button" class="agent-dossier-tab active" data-agent-dossier-tab="dossier">Dossier</button>
            <button type="button" class="agent-dossier-tab" data-agent-dossier-tab="notes">Notas agentes</button>
          </div>
          <div class="agent-dossier-panels">
            <div class="agent-dossier-panel active" data-agent-dossier-panel="dossier">
              <div class="dossier-detail locked">
                <div class="locked-placeholder small">LOCKED</div>
                <div class="dossier-title">${callsign || 'PdI bloqueado'}</div>
                <p class="muted">PROTOCOLO OV-RESTRINGIDO // Membrana clasificada. Credenciales de campo requeridas.</p>
                <button type="button" class="ghost" data-unlock-target="${entity.id}" data-unlock-hint="${sanitize(
          entity.locked_hint || ''
        )}">Desbloquear</button>
              </div>
            </div>
            <div class="agent-dossier-panel" data-agent-dossier-panel="notes">
              <div class="agent-notes-empty">Notas de agente no disponibles para PdI bloqueado.</div>
            </div>
          </div>
        `;
        hero.classList.remove('map-only');
        hero.innerHTML = `
          <div class="dm-entity-hero-body">
            <div class="dm-entity-hero-media">
              <div class="hero-wrapper hero-locked"><img src="${LOCKED_IMAGE}" alt="Dossier bloqueado" /></div>
            </div>
            <div class="dm-entity-hero-info">
              <div class="dm-entity-hero-title">${callsign || 'PdI bloqueado'}</div>
              <div class="dm-entity-hero-role">${categoryLabel}</div>
            </div>
          </div>
        `;
        if (bestiaryRoot) bestiaryRoot.classList.add('hidden');
        renderBestiary(null, { variant: 'agent', root: bestiaryRoot });
        bindAgentDossierTabs(detail);
        return;
      }
      detail.innerHTML = `
        <div class="card-title">PdI</div>
        <div class="agent-dossier-tabs">
          <button type="button" class="agent-dossier-tab active" data-agent-dossier-tab="dossier">Dossier</button>
          <button type="button" class="agent-dossier-tab" data-agent-dossier-tab="notes">Notas agentes</button>
        </div>
        <div class="agent-dossier-panels">
          <div class="agent-dossier-panel active" data-agent-dossier-panel="dossier">
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
                <div class="dm-detail-value">${sanitize(formatVeilLabel(entity.veil_status || entity.alignment || '—'))}</div>
                ${sessionTag ? `<div class="dm-detail-label">Sesión</div><div class="dm-detail-value">${sessionTag}</div>` : ''}
              </div>
              <div class="dm-detail-box scroll full">
                <div class="dm-detail-label">Resumen público</div>
                <div class="dm-detail-value multiline">${summary}</div>
              </div>
            </div>
          </div>
          <div class="agent-dossier-panel" data-agent-dossier-panel="notes">
            <div class="agent-notes-form" data-agent-notes-entity="${sanitize(String(entity.id))}">
              <div>
                <div class="section-title">Notas agentes</div>
                <textarea rows="6" placeholder="Escribe observaciones de campo..." data-agent-notes-input></textarea>
              </div>
              <div data-agent-notes-pois-block>
                <div class="section-title">PdIs vinculados</div>
                <div class="multi-select">
                  <input type="search" placeholder="Buscar PdI..." autocomplete="off" data-agent-pois-search />
                  <div class="multi-suggestions" data-agent-pois-suggestions></div>
                  <div class="multi-chips" data-agent-pois-chips></div>
                </div>
                <input type="hidden" data-agent-pois-hidden />
              </div>
              <div data-agent-notes-links-block>
                <div class="section-title">Conexiones</div>
                <div class="multi-select">
                  <input type="search" placeholder="Buscar PJ/PNJ/Org..." autocomplete="off" data-agent-links-search />
                  <div class="multi-suggestions" data-agent-links-suggestions></div>
                  <div class="multi-chips" data-agent-links-chips></div>
                </div>
                <input type="hidden" data-agent-links-hidden />
              </div>
              <div class="agent-notes-actions">
                <button type="button" class="ghost" data-agent-notes-save>Guardar</button>
              </div>
              <p class="muted" data-agent-notes-status></p>
            </div>
          </div>
        </div>
      `;
    } else {
      if (locked) {
        detail.innerHTML = `
          <div class="card-title">Dossier</div>
          <div class="agent-dossier-tabs">
            <button type="button" class="agent-dossier-tab active" data-agent-dossier-tab="dossier">Dossier</button>
            <button type="button" class="agent-dossier-tab" data-agent-dossier-tab="notes">Notas agentes</button>
          </div>
          <div class="agent-dossier-panels">
            <div class="agent-dossier-panel active" data-agent-dossier-panel="dossier">
              <div class="dossier-detail locked">
                <div class="locked-placeholder small">LOCKED</div>
                <div class="dossier-title">${callsign || 'Entidad bloqueada'}</div>
                <p class="muted">DOSSIER SELLADO // Nivel Ordo Veritatis: Restringido. Credenciales de campo requeridas.</p>
                <button type="button" class="ghost" data-unlock-target="${entity.id}" data-unlock-hint="${sanitize(
          entity.locked_hint || ''
        )}">Desbloquear</button>
              </div>
            </div>
            <div class="agent-dossier-panel" data-agent-dossier-panel="notes">
              <div class="agent-notes-empty">Notas de agente no disponibles para dossiers bloqueados.</div>
            </div>
          </div>
        `;
        hero.classList.remove('map-only');
        hero.classList.remove('hidden');
        hero.innerHTML = `
          <div class="dm-entity-hero-body">
            <div class="dm-entity-hero-media">
              <div class="hero-wrapper hero-locked"><img src="${LOCKED_IMAGE}" alt="Dossier bloqueado" /></div>
            </div>
            <div class="dm-entity-hero-info">
              <div class="dm-entity-hero-title">${callsign || 'Entidad bloqueada'}</div>
              <div class="dm-entity-hero-role">${role}</div>
            </div>
          </div>
        `;
        if (bestiaryRoot) bestiaryRoot.classList.add('hidden');
        renderBestiary(null, { variant: 'agent', root: bestiaryRoot });
        bindAgentDossierTabs(detail);
        return;
      }
      detail.innerHTML = `
        <div class="card-title">Dossier</div>
        <div class="agent-dossier-tabs">
          <button type="button" class="agent-dossier-tab active" data-agent-dossier-tab="dossier">Dossier</button>
          <button type="button" class="agent-dossier-tab" data-agent-dossier-tab="notes">Notas agentes</button>
        </div>
        <div class="agent-dossier-panels">
          <div class="agent-dossier-panel active" data-agent-dossier-panel="dossier">
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
          </div>
          <div class="agent-dossier-panel" data-agent-dossier-panel="notes">
            <div class="agent-notes-form" data-agent-notes-entity="${sanitize(String(entity.id))}">
              <div>
                <div class="section-title">Notas agentes</div>
                <textarea rows="6" placeholder="Escribe observaciones de campo..." data-agent-notes-input></textarea>
              </div>
              <div data-agent-notes-pois-block>
                <div class="section-title">PdIs vinculados</div>
                <div class="multi-select">
                  <input type="search" placeholder="Buscar PdI..." autocomplete="off" data-agent-pois-search />
                  <div class="multi-suggestions" data-agent-pois-suggestions></div>
                  <div class="multi-chips" data-agent-pois-chips></div>
                </div>
                <input type="hidden" data-agent-pois-hidden />
              </div>
              <div data-agent-notes-links-block>
                <div class="section-title">Conexiones</div>
                <div class="multi-select">
                  <input type="search" placeholder="Buscar PJ/PNJ/Org..." autocomplete="off" data-agent-links-search />
                  <div class="multi-suggestions" data-agent-links-suggestions></div>
                  <div class="multi-chips" data-agent-links-chips></div>
                </div>
                <input type="hidden" data-agent-links-hidden />
              </div>
              <div class="agent-notes-actions">
                <button type="button" class="ghost" data-agent-notes-save>Guardar</button>
              </div>
              <p class="muted" data-agent-notes-status></p>
            </div>
          </div>
        </div>
      `;
    }

    const img = entity.image_url || entity.photo || '';

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
      bindAgentDossierTabs(detail);
      initAgentNotesEditor(detail, entity, ctx);
      return;
    }

    if (isCreature) {
      hero.classList.remove('hidden');
      hero.classList.remove('map-only');
      hero.innerHTML = '';
      if (bestiaryRoot) {
        bestiaryRoot.classList.remove('hidden');
        bestiaryRoot.classList.add('bestiary-promoted');
      }
      renderBestiary(entity, { variant: 'agent', root: bestiaryRoot });
      bindAgentDossierTabs(detail);
      initAgentNotesEditor(detail, entity, ctx);
      return;
    }

  const heroImage = sanitizeUrlValue(img || HERO_FALLBACK_IMAGE) || HERO_FALLBACK_IMAGE;
  hero.classList.remove('map-only', 'hidden');
  hero.innerHTML = `
    <div class="dm-entity-hero-body">
      <div class="dm-entity-hero-media">
        ${locked
          ? `<div class="hero-wrapper hero-locked"><div class="locked-placeholder">LOCKED</div></div>`
          : `<div class="hero-wrapper"><img src="${heroImage}" alt="${callsign || 'Entidad'}" data-lightbox-img="${heroImage}" /></div>`
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
    bindAgentDossierTabs(detail);
    initAgentNotesEditor(detail, entity, ctx);
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
  setWorkspaceView('console');
  await reloadChatData();
  chatInput?.focus();
}

function hideInboxView() {
  return;
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

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((err) => {
      logDebug(`Service worker failed: ${err.message}`);
    });
  });
}

registerServiceWorker();
init();
