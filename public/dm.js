// --- State ---
const state = {
    ws: null,
    agents: [],
    authenticatedAgents: [],
    authenticatedAgentsPoll: null,
    screenCount: 0,
    initialized: false,
    pois: [],
    mediaAssets: [],
    scenes: [],
    activeSceneId: null,
    currentBeats: [],
    dmMap: null,
    dmMapMarkers: new Map(),
    selectedMarkerType: 'default',
    coordPickerMap: null,
    coordPickerMarkers: [],
    coordPickerCallback: null,
    sweepTarget: 'start',
    lastPickedCoords: null,
};

// --- DOM refs ---
const agentSelect        = document.getElementById('agent-select');
const poiSelect          = document.getElementById('poi-select');
const aminaMarkerSelector = document.getElementById('amina-marker-selector');
const dmMapContainer     = document.getElementById('dm-map');
const mapbox             = window.mapboxgl || null;
const wsStatusEl         = document.getElementById('ws-status');
const wsStatusLabelEl    = document.getElementById('ws-status-label');
const agentsStatusEl     = document.getElementById('agents-status');
const agentsStatusListEl = document.getElementById('agents-status-list');
const dmAuthOverlayEl    = document.getElementById('dm-auth-overlay');
const dmAuthFormEl       = document.getElementById('dm-auth-form');
const dmAuthPasswordEl   = document.getElementById('dm-auth-password');
const dmAuthStatusEl     = document.getElementById('dm-auth-status');

// --- Marker taxonomy ---
const AMINA_MARKER_TYPES = [
    { id: 'default',               label: 'Neutro' },
    { id: 'incident-active',       label: 'Incidente Activo' },
    { id: 'incident-closed',       label: 'Incidente Cerrado' },
    { id: 'anomaly',               label: 'Anomalía' },
    { id: 'entity-person',         label: 'Persona' },
    { id: 'entity-organization',   label: 'Organización' },
    { id: 'location-safehouse',    label: 'Piso Franco' },
    { id: 'location-hotspot',      label: 'Punto Caliente' },
];

// =====================
// WebSocket
// =====================
function updateWsStatus(status, label) {
    if (!wsStatusEl || !wsStatusLabelEl) return;
    wsStatusEl.classList.remove(
        'ws-status-connecting',
        'ws-status-connected',
        'ws-status-disconnected',
        'ws-status-error'
    );
    wsStatusEl.classList.add(`ws-status-${status}`);
    const screenLabel = state.screenCount === 1
        ? 'Pantalla 1'
        : `Pantallas ${state.screenCount}`;
    wsStatusLabelEl.textContent = `${label} · ${screenLabel}`;
}

async function hasDmSession() {
    try {
        const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (!response.ok) return false;
        const payload = await response.json();
        return payload.role === 'dm';
    } catch (_err) {
        return false;
    }
}

function showDmAuthOverlay(message = '') {
    dmAuthOverlayEl?.classList.remove('hidden');
    if (dmAuthStatusEl) dmAuthStatusEl.textContent = message;
    dmAuthPasswordEl?.focus();
}

function hideDmAuthOverlay() {
    dmAuthOverlayEl?.classList.add('hidden');
    if (dmAuthStatusEl) dmAuthStatusEl.textContent = '';
    if (dmAuthPasswordEl) dmAuthPasswordEl.value = '';
}

async function submitDmLogin(password) {
    const response = await fetch('/api/auth/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password })
    });

    if (!response.ok) {
        let message = 'No se pudo abrir sesión DM.';
        try {
            const payload = await response.json();
            if (payload?.error) message = payload.error;
        } catch (_err) {}
        throw new Error(message);
    }
}

function bindDmAuth() {
    if (!dmAuthFormEl) return;
    dmAuthFormEl.addEventListener('submit', async (event) => {
        event.preventDefault();
        const password = dmAuthPasswordEl?.value || '';
        if (!password) {
            if (dmAuthStatusEl) dmAuthStatusEl.textContent = 'Introduce la contraseña DM.';
            return;
        }
        if (dmAuthStatusEl) dmAuthStatusEl.textContent = 'Validando...';
        try {
            await submitDmLogin(password);
            hideDmAuthOverlay();
            if (!state.initialized) {
                await main();
            } else {
                connectWebSocket();
                startAuthenticatedAgentsPolling();
            }
        } catch (err) {
            if (dmAuthStatusEl) dmAuthStatusEl.textContent = err.message;
        }
    });
}

async function refreshAuthenticatedAgents() {
    try {
        const response = await fetch('/api/auth/agent-presence', { credentials: 'same-origin' });
        if (!response.ok) return;
        const payload = await response.json();
        state.authenticatedAgents = Array.isArray(payload.agents) ? payload.agents : [];
        updateAgentPresence();
    } catch (err) {
        console.error('Authenticated agents load error', err);
    }
}

function startAuthenticatedAgentsPolling() {
    if (state.authenticatedAgentsPoll) return;
    refreshAuthenticatedAgents();
    state.authenticatedAgentsPoll = window.setInterval(refreshAuthenticatedAgents, 5000);
}

function stopAuthenticatedAgentsPolling() {
    if (state.authenticatedAgentsPoll) {
        clearInterval(state.authenticatedAgentsPoll);
        state.authenticatedAgentsPoll = null;
    }
}

function connectWebSocket() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    updateWsStatus('connecting', 'WS conectando');
    state.ws = new WebSocket(`${proto}://${window.location.host}`);

    state.ws.onopen = () => {
        updateWsStatus('connected', 'WS activo');
        startAuthenticatedAgentsPolling();
        state.ws.send(JSON.stringify({ type: 'hello', role: 'dm' }));
    };
    state.ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'agents-list') updateAgentList(msg.agents);
            if (msg.type === 'screen-status') {
                state.screenCount = Number(msg.count) || 0;
                if (state.ws?.readyState === WebSocket.OPEN) {
                    updateWsStatus('connected', 'WS activo');
                }
            }
        } catch (e) {
            console.error('WS parse error', e);
        }
    };
    state.ws.onclose = () => {
        stopAuthenticatedAgentsPolling();
        state.authenticatedAgents = [];
        updateAgentPresence();
        state.screenCount = 0;
        updateWsStatus('disconnected', 'WS reconectando');
        setTimeout(connectWebSocket, 3000);
    };
    state.ws.onerror = (err) => {
        stopAuthenticatedAgentsPolling();
        state.authenticatedAgents = [];
        updateAgentPresence();
        state.screenCount = 0;
        updateWsStatus('error', 'WS error');
        console.error('WS error', err);
    };
}

// =====================
// Targeting
// =====================
function getTarget() {
    const v = agentSelect.value;
    if (v === 'all' || v === 'agents' || v === 'screen') return { target: v };
    return { target: 'agent', agentId: v };
}

function sendEffect(effect, payload = {}, targetOverride) {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
        console.error('WS not connected');
        return;
    }
    if (effect.startsWith('POI_')) payload.markerType = state.selectedMarkerType;
    const targeting = targetOverride ? { target: targetOverride } : getTarget();
    state.ws.send(JSON.stringify({ type: 'effect', effect, ...targeting, payload }));
}

function sendSceneControl(action, sceneId) {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    state.ws.send(JSON.stringify({ type: 'scene-control', action, sceneId }));
}

// =====================
// Agent list
// =====================
function updateAgentPresence() {
    if (!agentsStatusEl || !agentsStatusListEl) return;
    const count = state.authenticatedAgents.length;
    const labelEl = agentsStatusEl.querySelector('.presence-status-label');
    const names = state.authenticatedAgents.map((agent) => agent.agentDisplay || agent.agentId).filter(Boolean);
    if (labelEl) {
        labelEl.textContent = count === 1 ? 'Auth 1' : `Auth ${count}`;
    }
    agentsStatusListEl.textContent = names.length ? names.join(', ') : 'ninguno';
    agentsStatusEl.title = names.length
        ? `Agentes autenticados: ${names.join(', ')}`
        : 'No hay agentes autenticados';
}

function updateAgentList(agents) {
    state.agents = agents;
    // Remove individual agents (keep static options)
    const staticCount = 3; // all, agents, screen
    while (agentSelect.options.length > staticCount) agentSelect.remove(staticCount);
    agents.forEach(agent => {
        const opt = document.createElement('option');
        opt.value = agent.agentId;
        opt.textContent = `🟢 ${agent.agentId}`;
        agentSelect.appendChild(opt);
    });
}

// =====================
// POIs
// =====================
async function loadPois() {
    try {
        state.pois = await fetch('/api/pois').then(r => r.json());
    } catch (e) {
        console.error('POIs load error', e);
    }
}

function renderPoiSelector() {
    if (!poiSelect) return;
    poiSelect.innerHTML = '';
    state.pois.forEach(poi => {
        const opt = document.createElement('option');
        opt.value = poi.id;
        opt.textContent = poi.name;
        poiSelect.appendChild(opt);
    });
}

// =====================
// Marker selector
// =====================
function renderMarkerSelector() {
    if (!aminaMarkerSelector) return;
    aminaMarkerSelector.innerHTML = '';
    AMINA_MARKER_TYPES.forEach(mt => {
        const btn = document.createElement('button');
        btn.dataset.markerTypeId = mt.id;
        btn.textContent = mt.label;
        if (mt.id === state.selectedMarkerType) btn.classList.add('active');
        btn.addEventListener('click', () => {
            state.selectedMarkerType = mt.id;
            renderMarkerSelector();
        });
        aminaMarkerSelector.appendChild(btn);
    });
}

// =====================
// DM Map
// =====================
async function initializeDmMap() {
    if (!dmMapContainer || !mapbox) return;
    try {
        const config = await fetch('/api/config').then(r => r.json());
        mapbox.accessToken = config.mapboxToken;
        state.dmMap = new mapbox.Map({
            container: 'dm-map',
            style: config.mapStyle || 'mapbox://styles/mapbox/dark-v11',
            center: [-76.229, 40.68],
            zoom: 9
        });
        state.dmMap.on('load', () => {
            addPoisToDmMap();
            handlePoiSelectChange();
        });

        // Click on DM effects map → fill focused coord input
        state.dmMap.on('click', (e) => {
            const { lng, lat } = e.lngLat;
            const coords6 = `${lng.toFixed(6)},${lat.toFixed(6)}`;
            const focused = document.activeElement;
            const focusInput = document.getElementById('focus-coords');
            const sweepInput = document.getElementById('sweep-coords');
            if (focused === sweepInput) {
                // Append to sweep: first click sets start, second sets end
                const parts = sweepInput.value.split('|');
                if (parts.length >= 2) {
                    sweepInput.value = `${parts[0]}|${coords6}`;
                } else if (parts[0] && parts[0] !== '') {
                    sweepInput.value = `${parts[0]}|${coords6}`;
                } else {
                    sweepInput.value = coords6;
                }
            } else {
                focusInput.value = `${coords6},15`;
                focusInput.focus();
            }
        });
    } catch (e) {
        console.error('DM map init error', e);
    }
}

function addPoisToDmMap() {
    if (!state.dmMap || !mapbox || !state.pois.length) return;
    state.dmMapMarkers.forEach(m => m.remove());
    state.dmMapMarkers.clear();
    state.pois.forEach(poi => {
        const el = document.createElement('div');
        el.className = 'dm-poi-marker';
        el.dataset.poiId = poi.id;
        const marker = new mapbox.Marker(el)
            .setLngLat([poi.longitude, poi.latitude])
            .setPopup(new mapbox.Popup({ offset: 25 }).setText(poi.name))
            .addTo(state.dmMap);
        el.addEventListener('click', () => {
            poiSelect.value = poi.id;
            handlePoiSelectChange();
        });
        state.dmMapMarkers.set(poi.id, marker);
    });
}

function handlePoiSelectChange() {
    const sel = poiSelect.value;
    state.dmMapMarkers.forEach((marker, poiId) => {
        const el = marker.getElement();
        if (String(poiId) === String(sel)) {
            el.classList.add('selected');
            const poi = state.pois.find(p => String(p.id) === String(sel));
            if (poi && state.dmMap) state.dmMap.flyTo({ center: [poi.longitude, poi.latitude], zoom: 12, essential: true });
        } else {
            el.classList.remove('selected');
        }
    });
}

// =====================
// Tab navigation
// =====================
function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');

            if (btn.dataset.tab === 'scenes') {
                if (!state.coordPickerMap) {
                    initCoordPickerMap();
                } else {
                    // Mapbox needs resize() after being in a hidden element
                    setTimeout(() => state.coordPickerMap.resize(), 50);
                }
            }
        });
    });

    // Sweep toggle
    document.getElementById('sweep-toggle-btn').addEventListener('click', () => {
        state.sweepTarget = state.sweepTarget === 'start' ? 'end' : 'start';
        const btn = document.getElementById('sweep-toggle-btn');
        btn.textContent = state.sweepTarget === 'start' ? 'INICIO' : 'FIN';
        btn.classList.toggle('active', state.sweepTarget === 'start');
    });

    // Copy coords button
    document.getElementById('coord-copy-btn').addEventListener('click', () => {
        if (!state.lastPickedCoords) return;
        const { lng, lat } = state.lastPickedCoords;
        navigator.clipboard.writeText(`${lng.toFixed(6)},${lat.toFixed(6)}`).then(() => {
            const btn = document.getElementById('coord-copy-btn');
            btn.textContent = '✓ Copiado';
            setTimeout(() => btn.textContent = '⎘ Copiar', 1500);
        });
    });
}

// =====================
// Coord Picker Map
// =====================

const COORD_EFFECTS = new Set([
    'FOCUS_INCIDENT', 'SWEEP_AREA', 'SIGNAL_TRIANGULATION',
    'LABEL_PING', 'HEATMAP_SET', 'POI_BLINK_ON', 'POI_BLINK_OFF',
    'POI_HIGHLIGHT', 'POI_LOCKED', 'POI_UNLOCKED'
]);

async function initCoordPickerMap() {
    const container = document.getElementById('coord-picker-map');
    if (!container || !mapbox || state.coordPickerMap) return;
    try {
        const config = await fetch('/api/config').then(r => r.json());
        mapbox.accessToken = config.mapboxToken;
        state.coordPickerMap = new mapbox.Map({
            container: 'coord-picker-map',
            style: config.mapStyle || 'mapbox://styles/mapbox/dark-v11',
            center: [-76.229, 40.68],
            zoom: 9
        });
        state.coordPickerMap.on('load', () => {
            // Add POIs as reference markers (non-interactive)
            state.pois.forEach(poi => {
                const el = document.createElement('div');
                el.className = 'coord-poi-marker';
                el.title = poi.name;
                new mapbox.Marker(el)
                    .setLngLat([poi.longitude, poi.latitude])
                    .setPopup(new mapbox.Popup({ offset: 20, closeButton: false }).setText(poi.name))
                    .addTo(state.coordPickerMap);
            });
        });
        state.coordPickerMap.on('click', (e) => {
            handleCoordPickerClick(e.lngLat.lng, e.lngLat.lat);
        });
    } catch (e) {
        console.error('Coord picker map init error', e);
    }
}

function handleCoordPickerClick(lng, lat) {
    state.lastPickedCoords = { lng, lat };
    const display = document.getElementById('coord-picker-display');
    if (display) {
        display.textContent = `LNG: ${lng.toFixed(6)}  LAT: ${lat.toFixed(6)}`;
        display.classList.add('flash');
        setTimeout(() => display.classList.remove('flash'), 400);
    }
    if (typeof state.coordPickerCallback === 'function') {
        state.coordPickerCallback(lng, lat);
    }
}

function clearCoordPickerPreview() {
    state.coordPickerMarkers.forEach(m => m.remove());
    state.coordPickerMarkers = [];
    if (!state.coordPickerMap) return;
    ['preview-fill', 'preview-line'].forEach(id => {
        if (state.coordPickerMap.getLayer(id)) state.coordPickerMap.removeLayer(id);
    });
    if (state.coordPickerMap.getSource('preview-bounds')) {
        state.coordPickerMap.removeSource('preview-bounds');
    }
}

function addCoordPreviewMarker(lng, lat, color, label) {
    if (!state.coordPickerMap) return null;
    const el = document.createElement('div');
    el.className = 'coord-preview-marker';
    el.style.setProperty('--marker-color', color || '#00ff88');
    if (label) {
        const lbl = document.createElement('span');
        lbl.className = 'coord-preview-label';
        lbl.textContent = label;
        el.appendChild(lbl);
    }
    const marker = new mapbox.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(state.coordPickerMap);
    state.coordPickerMarkers.push(marker);
    return marker;
}

function updateCoordPickerPreview(type, payloadStr) {
    if (!state.coordPickerMap || !state.coordPickerMap.isStyleLoaded()) return;
    clearCoordPickerPreview();

    const p = tryParseJson(payloadStr);
    const sweepRow = document.getElementById('sweep-toggle-row');
    if (sweepRow) sweepRow.style.display = 'none';

    const hint = document.getElementById('coord-picker-hint');
    if (hint) hint.textContent = COORD_EFFECTS.has(type) ? '— click para coords' : '';

    switch (type) {
        case 'FOCUS_INCIDENT':
        case 'SIGNAL_TRIANGULATION':
            if (p.lng && p.lat) {
                addCoordPreviewMarker(p.lng, p.lat, '#00ff88');
                state.coordPickerMap.flyTo({ center: [p.lng, p.lat], zoom: 12, duration: 600 });
            }
            break;

        case 'LABEL_PING':
            if (p.lng && p.lat) {
                addCoordPreviewMarker(p.lng, p.lat, '#ffb700', p.text || '◎');
                state.coordPickerMap.flyTo({ center: [p.lng, p.lat], zoom: 12, duration: 600 });
            }
            break;

        case 'SWEEP_AREA': {
            if (sweepRow) sweepRow.style.display = 'flex';
            const s = p.start, e = p.end;
            if (s?.lng && s?.lat) addCoordPreviewMarker(s.lng, s.lat, '#00ff88', 'A');
            if (e?.lng && e?.lat) addCoordPreviewMarker(e.lng, e.lat, '#ff4136', 'B');
            if (s?.lng && e?.lng && state.coordPickerMap.isStyleLoaded()) {
                try {
                    const coords = [
                        [s.lng, s.lat], [e.lng, s.lat],
                        [e.lng, e.lat], [s.lng, e.lat], [s.lng, s.lat]
                    ];
                    state.coordPickerMap.addSource('preview-bounds', {
                        type: 'geojson',
                        data: { type: 'Feature', geometry: { type: 'Polygon', coordinates: [coords] } }
                    });
                    state.coordPickerMap.addLayer({ id: 'preview-fill', type: 'fill', source: 'preview-bounds', paint: { 'fill-color': '#00ff88', 'fill-opacity': 0.08 } });
                    state.coordPickerMap.addLayer({ id: 'preview-line', type: 'line', source: 'preview-bounds', paint: { 'line-color': '#00ff88', 'line-width': 1.5, 'line-dasharray': [3, 2] } });
                    state.coordPickerMap.fitBounds(
                        [[Math.min(s.lng, e.lng), Math.min(s.lat, e.lat)],
                         [Math.max(s.lng, e.lng), Math.max(s.lat, e.lat)]],
                        { padding: 40, duration: 600 }
                    );
                } catch {}
            }
            break;
        }

        case 'HEATMAP_SET':
            (p.points || []).forEach((pt, i) => {
                addCoordPreviewMarker(pt.lng, pt.lat, '#ff4136', String(i + 1));
            });
            break;
    }
}

function injectCoordsIntoPayload(payloadStr, type, lng, lat) {
    const obj = tryParseJson(payloadStr);
    if (type === 'SWEEP_AREA') {
        const target = state.sweepTarget;
        if (!obj.start) obj.start = {};
        if (!obj.end) obj.end = {};
        obj[target].lng = parseFloat(lng.toFixed(6));
        obj[target].lat = parseFloat(lat.toFixed(6));
    } else if (type === 'HEATMAP_SET') {
        if (!Array.isArray(obj.points)) obj.points = [];
        obj.points.push({ lng: parseFloat(lng.toFixed(6)), lat: parseFloat(lat.toFixed(6)), weight: 1 });
    } else {
        obj.lng = parseFloat(lng.toFixed(6));
        obj.lat = parseFloat(lat.toFixed(6));
    }
    return JSON.stringify(obj, null, 2);
}

// =====================
// Quick narrative events
// =====================

const QUICK_EVENTS = [
    {
        id: 'alert-membrana',
        label: 'Alerta Membrana',
        hint: 'Rojo pulsante: anomalía detectada',
        title: 'MEMBRANA FLUCTUATION DETECTED',
        body: 'ANOMALY LEVEL: 4\nSTANDBY FOR FURTHER INSTRUCTION',
        voice: 'alert'
    },
    {
        id: 'signal-acquired',
        label: 'Señal Adquirida',
        hint: 'Ámbar: triangulación incompleta',
        title: 'SIGNAL LOCK',
        body: 'SOURCE TRIANGULATING\nPRECISION: 73%\nSCANNING...',
        voice: 'intercepted'
    },
    {
        id: 'unauthorized-access',
        label: 'Acceso No Autorizado',
        hint: 'Gris: pantalla comprometida',
        title: 'UNAUTHORIZED ACCESS ATTEMPTED',
        body: 'SYSTEM COMPROMISED\nAUTH LEVEL: 9\nCONTAINMENT IN PROGRESS',
        voice: 'corrupted'
    },
    {
        id: 'interference',
        label: 'Interferencia',
        hint: 'Glitch: zona oscurecida',
        title: 'INTERFERENCE PATTERN DETECTED',
        body: 'SIGNAL NOISE: 89%\nUNABLE TO PROCESS\nSYSTEM DEGRADED',
        voice: 'corrupted'
    },
    {
        id: 'blackout',
        label: 'Apagón',
        hint: 'Negro/rojo: urgencia total',
        title: 'SYSTEM FAILURE',
        body: 'POWER LOSS IMMINENT\nBACKUP INITIATING\nALL PERSONNEL STAND BY',
        voice: 'alert'
    },
    {
        id: 'archive-recovered',
        label: 'Archivo Recuperado',
        hint: 'Verde: oficial y formal',
        title: 'ARCHIVE RECOVERED',
        body: 'PARTIAL INTEGRITY CONFIRMED\nCLASSIFICATION LEVEL: ALPHA\nPROCESSING DATA...',
        voice: 'ov'
    },
    {
        id: 'entity-detected',
        label: 'Entidad Detectada',
        hint: 'Rojo: amenaza inmediata',
        title: 'ENTITY SIGNATURE DETECTED',
        body: 'MEMBRANA CORRELATION: 68%\nLOCATION APPROXIMATED\nTACTICAL RESPONSE ADVISED',
        voice: 'alert'
    },
    {
        id: 'message-intercepted',
        label: 'Mensaje Interceptado',
        hint: 'Ámbar: desconfianza',
        title: 'EXTERNAL TRANSMISSION DETECTED',
        body: 'SOURCE UNKNOWN\nENCRYPTED SIGNAL\nREQUIRES AUTHENTICATION',
        voice: 'intercepted'
    },
    {
        id: 'coords-locked',
        label: 'Coords Localizadas',
        hint: 'Verde: preciso y confiable',
        title: 'COORDINATES LOCKED',
        body: 'TRIANGULATION COMPLETE\nCONFIDENCE: 94%\nREADY FOR DISPATCH',
        voice: 'ov'
    },
    {
        id: 'system-error',
        label: 'Error Sistema',
        hint: 'Gris: pánico controlado',
        title: 'CRITICAL ERROR',
        body: 'DATABASE INTEGRITY COMPROMISED\nRECOVERY IN PROGRESS\nSYSTEM UNSTABLE',
        voice: 'corrupted'
    },
    {
        id: 'intercepted-transmission',
        label: 'Transmisión Interceptada',
        hint: 'Ámbar: audio sucio, transcripción con cortes',
        effect: 'INTERCEPTED_TRANSMISSION',
        payload: {
            source: 'FUENTE DESCONOCIDA — BANDA NO REGISTRADA',
            frequency: '147.300 MHz',
            lines: [
                '...no deberían estar escuchando esto...',
                '...repito: la señal viene de DEBAJO de...',
                '',
                '...no confíen en el archivo. El archivo ha sido...'
            ],
            lost: [2],
            duration: 14000
        }
    },
    {
        id: 'correlation-reveal',
        label: 'Correlación Anómala',
        hint: 'Rojo: AMINA conecta piezas que no deberían estar conectadas',
        effect: 'CORRELATION_REVEAL',
        payload: {
            title: 'CORRELACIÓN ANÓMALA DETECTADA',
            nodes: ['INCIDENTE ACTUAL', 'EXPEDIENTE SELLADO', 'CASO CERRADO — 1987'],
            confidence: 62,
            source: 'ARCHIVO SELLADO — ACCESO RESTRINGIDO',
            duration: 13000
        }
    }
];

function renderQuickEvents() {
    const grid = document.getElementById('quick-events-grid');
    grid.innerHTML = '';
    QUICK_EVENTS.forEach(evt => {
        const btn = document.createElement('button');
        btn.className = 'quick-event-btn';
        btn.title = evt.hint;
        btn.innerHTML = `<span class="event-label">${evt.label}</span><span class="event-hint">${evt.hint}</span>`;
        btn.addEventListener('click', () => {
            if (evt.effect) {
                sendEffect(evt.effect, evt.payload || {});
                return;
            }
            sendEffect('SCENE_CARD', {
                title: evt.title,
                body: evt.body,
                voice: evt.voice,
                theme: evt.theme || undefined
            });
        });
        grid.appendChild(btn);
    });
}

// =====================
// Effects tab bindings
// =====================
function bindEffectEvents() {
    document.getElementById('effect-glitch').addEventListener('click', () => sendEffect('GLITCH'));
    document.getElementById('effect-noise').addEventListener('click', () => sendEffect('NOISE_PULSE'));
    document.getElementById('effect-vignette').addEventListener('click', () => {
        sendEffect('VIGNETTE_LEVEL', { level: parseInt(document.getElementById('vignette-level').value, 10) });
    });
    document.getElementById('effect-blackout').addEventListener('click', () => sendEffect('MODE_BLACKOUT', {}));
    document.getElementById('effect-clear').addEventListener('click', () => sendEffect('CLEAR_OVERLAYS', {}));
    document.getElementById('effect-home').addEventListener('click', () => sendEffect('AMINA_HOME', {}, 'screen'));

    // Membrane status: only the projector renders it, so always target the screen
    document.getElementById('membrana-intact').addEventListener('click', () => sendEffect('MEMBRANA_SET', { status: 'INTACT' }, 'screen'));
    document.getElementById('membrana-frayed').addEventListener('click', () => sendEffect('MEMBRANA_SET', { status: 'FRAYED' }, 'screen'));
    document.getElementById('membrana-torn').addEventListener('click', () => sendEffect('MEMBRANA_SET', { status: 'TORN' }, 'screen'));

    document.getElementById('effect-nudge').addEventListener('click', () => {
        const [lng, lat, zoom] = document.getElementById('focus-coords').value.split(',').map(Number);
        if (Number.isFinite(lng) && Number.isFinite(lat)) {
            sendEffect('NUDGE_CAMERA', { lng, lat, zoom });
            return;
        }
        sendEffect('NUDGE_CAMERA');
    });
    document.getElementById('effect-focus').addEventListener('click', () => {
        const [lng, lat, zoom] = document.getElementById('focus-coords').value.split(',').map(Number);
        sendEffect('FOCUS_INCIDENT', { lng, lat, zoom });
    });
    document.getElementById('effect-sweep').addEventListener('click', () => {
        const [startStr, endStr] = document.getElementById('sweep-coords').value.split('|');
        const [sLng, sLat] = startStr.split(',').map(Number);
        const [eLng, eLat] = endStr.split(',').map(Number);
        sendEffect('SWEEP_AREA', { start: { lng: sLng, lat: sLat }, end: { lng: eLng, lat: eLat } });
    });

    document.getElementById('effect-poi-blink-on').addEventListener('click', () => sendEffect('POI_BLINK_ON', { poiId: poiSelect.value }));
    document.getElementById('effect-poi-blink-off').addEventListener('click', () => sendEffect('POI_BLINK_OFF', { poiId: poiSelect.value }));
    document.getElementById('effect-poi-highlight').addEventListener('click', () => sendEffect('POI_HIGHLIGHT', { poiId: poiSelect.value }));
    document.getElementById('effect-poi-lock').addEventListener('click', () => sendEffect('POI_LOCKED', { poiId: poiSelect.value }));
    document.getElementById('effect-poi-unlock').addEventListener('click', () => sendEffect('POI_UNLOCKED', { poiId: poiSelect.value }));

    document.getElementById('poi-triangulate').addEventListener('click', () => {
        const poi = state.pois.find(p => String(p.id) === String(poiSelect.value));
        if (!poi || poi.longitude == null) return;
        sendEffect('SIGNAL_TRIANGULATION', {
            lng: poi.longitude,
            lat: poi.latitude,
            precision: 55 + Math.floor(Math.random() * 36),
            duration: 8000
        });
    });
    document.getElementById('poi-alert').addEventListener('click', () => {
        const poi = state.pois.find(p => String(p.id) === String(poiSelect.value));
        if (!poi || poi.longitude == null) return;
        sendEffect('LABEL_PING', { lng: poi.longitude, lat: poi.latitude, text: poi.name || 'ZONA MARCADA', duration: 9000 });
        sendEffect('SCENE_CARD', {
            title: 'ACTIVIDAD ANÓMALA DETECTADA',
            subtitle: poi.name || '',
            body: `SECTOR: ${(poi.name || 'DESCONOCIDO').toUpperCase()}\nCOORD: ${Number(poi.latitude).toFixed(4)}, ${Number(poi.longitude).toFixed(4)}\nEQUIPO DE CAMPO: INVESTIGAR`,
            voice: 'alert'
        });
    });

    document.getElementById('effect-layer-on').addEventListener('click', () => sendEffect('LAYER_TOGGLE', { layerId: document.getElementById('layer-id').value, visible: true }));
    document.getElementById('effect-layer-off').addEventListener('click', () => sendEffect('LAYER_TOGGLE', { layerId: document.getElementById('layer-id').value, visible: false }));

    document.getElementById('create-ephemeral-poi').addEventListener('click', () => {
        const name = document.getElementById('ephemeral-poi-name').value.trim();
        const coords = document.getElementById('ephemeral-poi-coords').value.trim();
        if (!name || !coords) return;
        const [lng, lat] = coords.split(',').map(Number);
        if (isNaN(lng) || isNaN(lat)) return;
        sendEffect('POI_EPHEMERAL_ADD', { poiId: `ephemeral_${Date.now()}`, name, lng, lat, markerType: state.selectedMarkerType });
    });

    document.getElementById('effect-card').addEventListener('click', () => {
        const title = document.getElementById('card-title-input').value.trim();
        const subtitle = document.getElementById('card-subtitle-input').value.trim();
        const body = document.getElementById('card-body-input').value.trim();
        const theme = document.getElementById('card-theme-input').value;
        if (!title && !body) return;
        sendEffect('SCENE_CARD', { title, subtitle, body, theme: theme || undefined });
    });

    document.getElementById('request-satellite-image').addEventListener('click', async () => {
        const poiId = poiSelect.value;
        if (!poiId) return;
        const panel = document.getElementById('image-analysis-panel');
        panel.innerHTML = '<p>Solicitando imagen...</p>';
        try {
            const data = await fetch(`/api/dm/generate_static_map/${poiId}`).then(r => r.json());
            panel.innerHTML = `<img src="${data.imageUrl}" alt="Satelital POI ${poiId}" />`;
        } catch (err) {
            panel.innerHTML = `<p style="color:#ff4136">Error: ${err.message}</p>`;
        }
    });

    poiSelect.addEventListener('change', handlePoiSelectChange);
}

// =====================
// Media tab
// =====================
async function loadMedia() {
    try {
        state.mediaAssets = await fetch('/api/media').then(r => r.json());
    } catch (e) {
        console.error('Media load error', e);
        state.mediaAssets = [];
    }
    renderMediaGrid();
}

function mimeIcon(mime) {
    if (!mime) return '📄';
    if (mime.startsWith('image/')) return '🖼';
    if (mime.startsWith('video/')) return '🎬';
    if (mime.startsWith('audio/')) return '🎵';
    return '📄';
}

function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderMediaGrid() {
    const grid = document.getElementById('media-grid');
    if (!state.mediaAssets.length) {
        grid.innerHTML = '<p class="media-empty">No hay assets. Sube el primero.</p>';
        return;
    }
    grid.innerHTML = '';
    state.mediaAssets.forEach(asset => {
        const card = document.createElement('div');
        card.className = 'media-card';
        card.innerHTML = `
            <div class="media-card-thumb">${buildThumb(asset)}</div>
            <div class="media-card-info">
                <div class="media-card-name" title="${asset.original_name}">${mimeIcon(asset.mime_type)} ${asset.original_name}</div>
                <div class="media-card-size">${formatBytes(asset.size)}</div>
                <div class="media-card-desc" id="desc-text-${asset.id}">${asset.description || '<em>Sin descripción</em>'}</div>
            </div>
            <div class="media-card-actions">
                <button class="btn-launch-media" data-id="${asset.id}" data-url="${asset.url}" data-mime="${asset.mime_type}" data-target="agents">→ Agentes</button>
                <button class="btn-launch-media" data-id="${asset.id}" data-url="${asset.url}" data-mime="${asset.mime_type}" data-target="screen">→ Pantalla</button>
                <button class="btn-launch-media" data-id="${asset.id}" data-url="${asset.url}" data-mime="${asset.mime_type}" data-target="all">→ Todos</button>
                <button class="btn-edit-desc" data-id="${asset.id}">✎ Editar</button>
                <button class="btn-delete-media" data-id="${asset.id}">✕ Borrar</button>
            </div>
        `;
        grid.appendChild(card);
    });

    // Launch buttons
    grid.querySelectorAll('.btn-launch-media').forEach(btn => {
        btn.addEventListener('click', () => {
            const { url, mime, target } = btn.dataset;
            launchMediaAsset(url, mime, target);
        });
    });

    // Edit description
    grid.querySelectorAll('.btn-edit-desc').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            const asset = state.mediaAssets.find(a => String(a.id) === String(id));
            const newDesc = prompt('Nueva descripción:', asset?.description || '');
            if (newDesc === null) return;
            try {
                await fetch(`/api/media/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ description: newDesc })
                });
                await loadMedia();
            } catch (e) { console.error(e); }
        });
    });

    // Delete
    grid.querySelectorAll('.btn-delete-media').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            if (!confirm('¿Borrar este asset?')) return;
            try {
                await fetch(`/api/media/${id}`, { method: 'DELETE' });
                await loadMedia();
            } catch (e) { console.error(e); }
        });
    });
}

function buildThumb(asset) {
    if (!asset.mime_type) return mimeIcon(asset.mime_type);
    if (asset.mime_type.startsWith('image/')) {
        return `<img src="${asset.url}" alt="${asset.original_name}" loading="lazy" />`;
    }
    return `<span class="media-thumb-icon">${mimeIcon(asset.mime_type)}</span>`;
}

function launchMediaAsset(url, mime, target) {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) return;
    let effect, payload;
    if (mime.startsWith('image/')) {
        effect = 'MEDIA_IMAGE';
        payload = { url };
    } else if (mime.startsWith('video/')) {
        effect = 'MEDIA_VIDEO';
        payload = { url, autoplay: true, loop: false, muted: false };
    } else if (mime.startsWith('audio/')) {
        effect = 'MEDIA_AUDIO';
        payload = { url, volume: 0.8, loop: false };
    } else {
        return;
    }
    state.ws.send(JSON.stringify({ type: 'effect', effect, target, payload }));
}

function bindMediaEvents() {
    document.getElementById('media-refresh').addEventListener('click', loadMedia);

    const dropZone = document.getElementById('upload-drop-zone');
    const fileInput = document.getElementById('upload-file-input');

    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]);
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files[0]) uploadFile(fileInput.files[0]);
    });

    document.getElementById('upload-submit').addEventListener('click', () => {
        if (fileInput.files[0]) uploadFile(fileInput.files[0]);
    });
}

async function uploadFile(file) {
    const status = document.getElementById('upload-status');
    status.textContent = `Subiendo ${file.name}...`;
    const form = new FormData();
    form.append('file', file);
    const desc = document.getElementById('upload-description').value.trim();
    if (desc) form.append('description', desc);
    try {
        const res = await fetch('/api/media', { method: 'POST', body: form });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Error al subir');
        }
        status.textContent = '✓ Subido correctamente.';
        document.getElementById('upload-description').value = '';
        document.getElementById('upload-file-input').value = '';
        await loadMedia();
    } catch (e) {
        status.textContent = `✕ Error: ${e.message}`;
    }
}

// =====================
// Scenes tab
// =====================
async function loadScenes() {
    try {
        state.scenes = await fetch('/api/scenes').then(r => r.json());
    } catch (e) {
        state.scenes = [];
    }
    renderSceneList();
}

function renderSceneList() {
    const list = document.getElementById('scene-list');
    list.innerHTML = '';
    state.scenes.forEach(scene => {
        const li = document.createElement('li');
        li.className = 'scene-list-item';
        if (String(scene.id) === String(state.activeSceneId)) li.classList.add('active');
        li.innerHTML = `
            <span class="scene-name">${scene.name}</span>
            <span class="scene-target-badge">${scene.default_target}</span>
            <button class="btn-scene-delete" data-id="${scene.id}" title="Borrar">✕</button>
        `;
        li.querySelector('.scene-name').addEventListener('click', () => openScene(scene.id));
        li.querySelector('.btn-scene-delete').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (!confirm(`¿Borrar escena "${scene.name}"?`)) return;
            await fetch(`/api/scenes/${scene.id}`, { method: 'DELETE' });
            if (state.activeSceneId === scene.id) { state.activeSceneId = null; hideSceneEditor(); }
            await loadScenes();
        });
        list.appendChild(li);
    });
}

document.getElementById('scene-create-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-scene-name').value.trim();
    if (!name) return;
    const target = document.getElementById('scene-target-select').value;
    const scene = await fetch('/api/scenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, default_target: target })
    }).then(r => r.json());
    document.getElementById('new-scene-name').value = '';
    await loadScenes();
    openScene(scene.id);
});

async function openScene(sceneId) {
    state.activeSceneId = sceneId;
    const scene = await fetch(`/api/scenes/${sceneId}`).then(r => r.json());
    renderSceneList();
    showSceneEditor(scene);
}

function hideSceneEditor() {
    document.getElementById('scene-empty-state').style.display = '';
    document.getElementById('scene-editor').style.display = 'none';
}

function showSceneEditor(scene) {
    document.getElementById('scene-empty-state').style.display = 'none';
    const editor = document.getElementById('scene-editor');
    editor.style.display = '';
    document.getElementById('scene-editor-name').textContent = scene.name;
    renderBeatList(scene.beats || []);
}

// --- Beat list ---
const BEAT_TYPES = [
    { value: 'FOCUS_INCIDENT',        label: 'Cámara: Enfocar' },
    { value: 'SWEEP_AREA',            label: 'Cámara: Barrido' },
    { value: 'NUDGE_CAMERA',          label: 'Cámara: Sacudida' },
    { value: 'SIGNAL_TRIANGULATION',  label: 'Triangulación de señal' },
    { value: 'MEDIA_IMAGE',           label: 'Media: Imagen' },
    { value: 'MEDIA_VIDEO',           label: 'Media: Vídeo' },
    { value: 'MEDIA_AUDIO',           label: 'Media: Audio' },
    { value: 'MEDIA_CLEAR',           label: 'Media: Limpiar' },
    { value: 'SCENE_CARD',            label: 'Card de texto' },
    { value: 'FILE_RECOVERY',         label: 'Recuperación de archivo' },
    { value: 'LABEL_PING',            label: 'Etiqueta en mapa' },
    { value: 'HEATMAP_SET',           label: 'Heatmap' },
    { value: 'HEATMAP_CLEAR',         label: 'Heatmap: Limpiar' },
    { value: 'GLITCH',                label: 'Efecto: Glitch' },
    { value: 'NOISE_PULSE',           label: 'Efecto: Ruido' },
    { value: 'MODE_BLACKOUT',         label: 'Blackout' },
    { value: 'CLEAR_OVERLAYS',        label: 'Limpiar Todo' },
    { value: 'POI_BLINK_ON',          label: 'POI: Parpadeo ON' },
    { value: 'POI_BLINK_OFF',         label: 'POI: Parpadeo OFF' },
    { value: 'POI_HIGHLIGHT',         label: 'POI: Resaltar' },
    { value: 'POI_LOCKED',            label: 'POI: Bloquear' },
    { value: 'VIGNETTE_LEVEL',        label: 'Viñeta' },
];

function renderBeatList(beats) {
    state.currentBeats = beats;
    const list = document.getElementById('beat-list');
    list.innerHTML = '';
    if (!beats.length) {
        list.innerHTML = '<p class="beats-empty">Sin beats. Añade el primero.</p>';
        return;
    }
    beats.forEach((beat, idx) => {
        const row = document.createElement('div');
        row.className = 'beat-row';
        row.dataset.beatId = beat.id;
        const payloadObj = tryParseJson(beat.payload);
        row.innerHTML = `
            <span class="beat-index">${idx + 1}</span>
            <span class="beat-type-label">${beat.type}</span>
            <span class="beat-label-text">${beat.label || ''}</span>
            <span class="beat-timing">+${beat.delay_ms || 0}ms${beat.duration_ms ? ` / ${beat.duration_ms}ms` : ''}</span>
            <span class="beat-target-badge">${beat.target}</span>
            <div class="beat-actions">
                <button class="btn-beat-up" data-idx="${idx}" title="Subir">↑</button>
                <button class="btn-beat-down" data-idx="${idx}" title="Bajar">↓</button>
                <button class="btn-beat-edit" data-id="${beat.id}" title="Editar">✎</button>
                <button class="btn-beat-delete" data-id="${beat.id}" title="Borrar">✕</button>
            </div>
        `;
        list.appendChild(row);
    });

    list.querySelectorAll('.btn-beat-up').forEach(btn => {
        btn.addEventListener('click', () => moveBeat(parseInt(btn.dataset.idx), -1));
    });
    list.querySelectorAll('.btn-beat-down').forEach(btn => {
        btn.addEventListener('click', () => moveBeat(parseInt(btn.dataset.idx), 1));
    });
    list.querySelectorAll('.btn-beat-edit').forEach(btn => {
        btn.addEventListener('click', () => openBeatModal(btn.dataset.id));
    });
    list.querySelectorAll('.btn-beat-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('¿Borrar este beat?')) return;
            await fetch(`/api/scenes/${state.activeSceneId}/beats/${btn.dataset.id}`, { method: 'DELETE' });
            await refreshActiveScene();
        });
    });
}

async function moveBeat(idx, dir) {
    const scene = await fetch(`/api/scenes/${state.activeSceneId}`).then(r => r.json());
    const beats = scene.beats || [];
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= beats.length) return;
    const ids = beats.map(b => b.id);
    [ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]];
    await fetch(`/api/scenes/${state.activeSceneId}/beats/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: ids })
    });
    await refreshActiveScene();
}

async function refreshActiveScene() {
    if (!state.activeSceneId) return;
    const scene = await fetch(`/api/scenes/${state.activeSceneId}`).then(r => r.json());
    renderBeatList(scene.beats || []);
}

// --- Add beat ---
document.getElementById('add-beat-btn').addEventListener('click', () => openBeatModal(null));

function openBeatModal(beatId) {
    // Simple inline modal using a dialog approach
    const existing = document.getElementById('beat-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'beat-modal';
    modal.className = 'beat-modal-backdrop';

    const currentBeat = beatId ? getBeatFromDOM(beatId) : null;

    modal.innerHTML = `
        <div class="beat-modal">
            <h3>${beatId ? 'Editar Beat' : 'Nuevo Beat'}</h3>
            <div class="beat-form">
                <label>Tipo</label>
                <select id="bm-type">
                    ${BEAT_TYPES.map(t => `<option value="${t.value}" ${currentBeat?.type === t.value ? 'selected' : ''}>${t.label}</option>`).join('')}
                </select>
                <label>Label (opcional)</label>
                <input type="text" id="bm-label" value="${currentBeat?.label || ''}" placeholder="Descripción interna" />
                <label>Delay antes de ejecutar (ms)</label>
                <input type="number" id="bm-delay" value="${currentBeat?.delay_ms || 0}" min="0" />
                <label>Duración antes del siguiente beat (ms, vacío = inmediato)</label>
                <input type="number" id="bm-duration" value="${currentBeat?.duration_ms || ''}" min="0" placeholder="vacío = inmediato" />
                <label>Target</label>
                <select id="bm-target">
                    <option value="inherit" ${!currentBeat || currentBeat.target === 'inherit' ? 'selected' : ''}>Heredar de escena</option>
                    <option value="all" ${currentBeat?.target === 'all' ? 'selected' : ''}>Todos</option>
                    <option value="agents" ${currentBeat?.target === 'agents' ? 'selected' : ''}>Solo Agentes</option>
                    <option value="screen" ${currentBeat?.target === 'screen' ? 'selected' : ''}>Pantalla</option>
                </select>
                <label>Payload (JSON)</label>
                <textarea id="bm-payload" rows="5" placeholder="{}">${currentBeat ? JSON.stringify(tryParseJson(currentBeat.payload), null, 2) : '{}'}</textarea>
                <div id="bm-payload-helper" class="payload-helper"></div>
            </div>
            <div class="beat-modal-actions">
                <button id="bm-cancel">Cancelar</button>
                <button id="bm-save" class="btn-primary">Guardar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Payload helper + coord picker integration
    const typeSelect = modal.querySelector('#bm-type');
    const payloadArea = modal.querySelector('#bm-payload');
    const helper = modal.querySelector('#bm-payload-helper');

    function updateHelper() {
        helper.textContent = payloadHint(typeSelect.value);
        if (payloadArea.value.trim() === '{}' || !payloadArea.value.trim()) {
            payloadArea.value = JSON.stringify(defaultPayload(typeSelect.value), null, 2);
        }
    }

    function refreshCoordPreview() {
        updateCoordPickerPreview(typeSelect.value, payloadArea.value);
    }

    typeSelect.addEventListener('change', () => {
        updateHelper();
        refreshCoordPreview();
    });
    payloadArea.addEventListener('input', refreshCoordPreview);
    updateHelper();

    // Register coord picker callback
    state.coordPickerCallback = (lng, lat) => {
        payloadArea.value = injectCoordsIntoPayload(payloadArea.value, typeSelect.value, lng, lat);
        refreshCoordPreview();
    };

    // Show initial preview after a tick (map may need to be ready)
    setTimeout(refreshCoordPreview, 100);

    function closeModal() {
        state.coordPickerCallback = null;
        clearCoordPickerPreview();
        const hint = document.getElementById('coord-picker-hint');
        if (hint) hint.textContent = '';
        const sweepRow = document.getElementById('sweep-toggle-row');
        if (sweepRow) sweepRow.style.display = 'none';
        modal.remove();
    }

    modal.querySelector('#bm-cancel').addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    modal.querySelector('#bm-save').addEventListener('click', async () => {
        let payload;
        try { payload = JSON.parse(payloadArea.value || '{}'); } catch { alert('JSON inválido en payload.'); return; }
        const body = {
            type: typeSelect.value,
            label: modal.querySelector('#bm-label').value.trim() || null,
            delay_ms: parseInt(modal.querySelector('#bm-delay').value, 10) || 0,
            duration_ms: parseInt(modal.querySelector('#bm-duration').value, 10) || null,
            target: modal.querySelector('#bm-target').value,
            payload
        };
        if (beatId) {
            await fetch(`/api/scenes/${state.activeSceneId}/beats/${beatId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        } else {
            await fetch(`/api/scenes/${state.activeSceneId}/beats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
        }
        closeModal();
        await refreshActiveScene();
    });
}

function getBeatFromDOM(beatId) {
    return state.currentBeats.find(b => String(b.id) === String(beatId)) || null;
}

function payloadHint(type) {
    const hints = {
        'FOCUS_INCIDENT':       '{ "lng": -76.26, "lat": 40.70, "zoom": 15, "pitch": 50, "bearing": 0 }',
        'SWEEP_AREA':           '{ "start": {"lng":-76.3,"lat":40.7}, "end": {"lng":-76.2,"lat":40.65}, "durationMs": 4000 }',
        'SIGNAL_TRIANGULATION': '{ "lng": -76.26, "lat": 40.70, "precision": 73, "duration": 6000 }',
        'MEDIA_IMAGE':          '{ "url": "/uploads/...", "caption": "Texto", "duration": 8000 }',
        'MEDIA_IMAGE (CCTV)':   '{ "url": "/uploads/...", "cctv": true, "camera_name": "CAM-04", "duration": 10000 }',
        'MEDIA_VIDEO':          '{ "url": "/uploads/...", "autoplay": true, "loop": false, "muted": false }',
        'MEDIA_VIDEO (CCTV)':   '{ "url": "/uploads/...", "cctv": true, "camera_name": "CAM-02", "autoplay": true }',
        'MEDIA_AUDIO':          '{ "url": "/uploads/...", "volume": 0.8, "loop": false }',
        'SCENE_CARD':           '{ "title": "Título", "subtitle": "Sub", "body": "Texto...", "voice": "ov", "confidence": 62, "source": "ARCHIVO SELLADO" }',
        'FILE_RECOVERY':        '{ "lines": ["LINE 1", "CLASSIFIED", "LINE 3"], "censored": [1], "duration": 8000 }',
        'INTERCEPTED_TRANSMISSION': '{ "source": "FUENTE DESCONOCIDA", "frequency": "147.300 MHz", "lines": ["...", "..."], "lost": [1], "audio_url": "", "duration": 12000 }',
        'CORRELATION_REVEAL':   '{ "nodes": ["NOMBRE A", "INCIDENTE B"], "confidence": 62, "source": "ARCHIVO SELLADO", "duration": 12000 }',
        'ENTITY_DOSSIER':       '{ "title": "VICTORIA ALLEN", "fields": [{"label":"NOMBRE REAL","redacted":true},{"label":"ROL","value":"..."}], "summary": "...", "voice": "ov", "duration": 20000 }',
        'MEMBRANA_SET':         '{ "status": "FRAYED" }  (INTACT | FRAYED | TORN)',
        'LABEL_PING':           '{ "lng": -76.26, "lat": 40.70, "text": "Etiqueta", "duration": 4000 }',
        'HEATMAP_SET':          '{ "points": [{"lng":-76.26,"lat":40.70,"weight":1}] }',
        'VIGNETTE_LEVEL':       '{ "level": 2 }',
        'POI_BLINK_ON':         '{ "poiId": 1 }',
        'POI_HIGHLIGHT':        '{ "poiId": 1 }',
    };
    return hints[type] ? `Ejemplo: ${hints[type]}` : '';
}

function defaultPayload(type) {
    const defaults = {
        'FOCUS_INCIDENT':       { lng: -76.26391, lat: 40.70682, zoom: 15, pitch: 50, bearing: 0 },
        'SWEEP_AREA':           { start: { lng: -76.3, lat: 40.7 }, end: { lng: -76.2, lat: 40.65 }, durationMs: 4000 },
        'SIGNAL_TRIANGULATION': { lng: -76.26391, lat: 40.70682, precision: 73, duration: 6000 },
        'MEDIA_IMAGE':          { url: '', caption: '' },
        'MEDIA_VIDEO':          { url: '', autoplay: true, loop: false, muted: false },
        'MEDIA_AUDIO':          { url: '', volume: 0.8, loop: false },
        'SCENE_CARD':           { title: '', subtitle: '', body: '', voice: 'ov' },
        'FILE_RECOVERY':        { lines: ['CAMPO 1', 'CAMPO CENSURADO', 'CAMPO 3'], censored: [1], duration: 8000 },
        'INTERCEPTED_TRANSMISSION': { source: 'FUENTE DESCONOCIDA', frequency: '147.300 MHz', lines: ['LÍNEA 1', 'LÍNEA PERDIDA', 'LÍNEA 3'], lost: [1], audio_url: '', duration: 12000 },
        'CORRELATION_REVEAL':   { title: 'CORRELACIÓN ANÓMALA DETECTADA', nodes: ['NODO A', 'NODO B', 'NODO C'], confidence: 62, source: 'ARCHIVO SELLADO', duration: 12000 },
        'ENTITY_DOSSIER':       { title: 'NOMBRE EN CLAVE', classification: 'EXPEDIENTE — ORDO VERITATIS', stamp: 'CLASIFICADO', image_url: '', fields: [{ label: 'NOMBRE REAL', redacted: true }, { label: 'TIPO', value: 'INDIVIDUO' }], summary: '', voice: 'ov', duration: 20000 },
        'MEMBRANA_SET':         { status: 'FRAYED' },
        'LABEL_PING':           { lng: -76.26391, lat: 40.70682, text: '', duration: 4000 },
        'HEATMAP_SET':          { points: [{ lng: -76.26391, lat: 40.70682, weight: 1 }] },
        'VIGNETTE_LEVEL':       { level: 2 },
        'POI_BLINK_ON':         { poiId: 1 },
        'POI_HIGHLIGHT':        { poiId: 1 },
    };
    return defaults[type] || {};
}

function tryParseJson(str) {
    try { return JSON.parse(str); } catch { return {}; }
}

// --- Scene playback controls ---
function bindSceneControls() {
    document.getElementById('scene-play-btn').addEventListener('click', () => {
        if (state.activeSceneId) sendSceneControl('play', state.activeSceneId);
    });
    document.getElementById('scene-pause-btn').addEventListener('click', () => sendSceneControl('pause', state.activeSceneId));
    document.getElementById('scene-next-btn').addEventListener('click', () => sendSceneControl('next', state.activeSceneId));
    document.getElementById('scene-prev-btn').addEventListener('click', () => sendSceneControl('prev', state.activeSceneId));
    document.getElementById('scene-stop-btn').addEventListener('click', () => sendSceneControl('stop', state.activeSceneId));

    document.getElementById('scene-export-btn').addEventListener('click', async () => {
        if (!state.activeSceneId) return;
        const scene = await fetch(`/api/scenes/${state.activeSceneId}`).then(r => r.json());
        const area = document.getElementById('scene-json-area');
        area.value = JSON.stringify(scene, null, 2);
        area.style.display = area.style.display === 'none' ? '' : 'none';
        document.getElementById('scene-import-confirm-btn').style.display = 'none';
    });

    document.getElementById('scene-import-btn').addEventListener('click', () => {
        const area = document.getElementById('scene-json-area');
        const confirmBtn = document.getElementById('scene-import-confirm-btn');
        area.value = '';
        area.style.display = '';
        confirmBtn.style.display = '';
    });

    document.getElementById('scene-import-confirm-btn').addEventListener('click', async () => {
        const area = document.getElementById('scene-json-area');
        let data;
        try { data = JSON.parse(area.value); } catch { alert('JSON inválido.'); return; }
        // Create new scene from import
        const scene = await fetch('/api/scenes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: (data.name || 'Importada') + ' (copia)', description: data.description, default_target: data.default_target || 'all' })
        }).then(r => r.json());
        // Import beats
        for (const beat of (data.beats || [])) {
            await fetch(`/api/scenes/${scene.id}/beats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: beat.type, payload: beat.payload, delay_ms: beat.delay_ms, duration_ms: beat.duration_ms, target: beat.target, label: beat.label })
            });
        }
        area.style.display = 'none';
        document.getElementById('scene-import-confirm-btn').style.display = 'none';
        await loadScenes();
        openScene(scene.id);
    });
}

// =====================
// Intel tab — Presets
// =====================

let presetsData = [];
let presetsActiveCategory = null;

async function loadPresets() {
    try {
        presetsData = await fetch('/api/presets').then(r => r.json());
    } catch (e) {
        presetsData = [];
    }
    renderPresetFilters();
    renderPresetsList();
}

function presetsCategories() {
    const cats = new Set(presetsData.map(p => p.category || '').filter(Boolean));
    return Array.from(cats).sort();
}

function renderPresetFilters() {
    const bar = document.getElementById('preset-filter-bar');
    const cats = presetsCategories();
    bar.innerHTML = '';
    if (!cats.length) return;

    const allBtn = document.createElement('button');
    allBtn.className = 'filter-chip' + (!presetsActiveCategory ? ' active' : '');
    allBtn.textContent = 'Todos';
    allBtn.addEventListener('click', () => { presetsActiveCategory = null; renderPresetFilters(); renderPresetsList(); });
    bar.appendChild(allBtn);

    cats.forEach(cat => {
        const btn = document.createElement('button');
        btn.className = 'filter-chip' + (presetsActiveCategory === cat ? ' active' : '');
        btn.textContent = cat;
        btn.addEventListener('click', () => { presetsActiveCategory = cat; renderPresetFilters(); renderPresetsList(); });
        bar.appendChild(btn);
    });
}

function renderPresetsList() {
    const container = document.getElementById('presets-list');
    const filtered = presetsActiveCategory
        ? presetsData.filter(p => p.category === presetsActiveCategory)
        : presetsData;

    if (!filtered.length) {
        container.innerHTML = '<p class="intel-empty">Sin presets. Crea el primero.</p>';
        return;
    }

    container.innerHTML = '';
    filtered.forEach(preset => {
        const row = document.createElement('div');
        row.className = 'preset-row';
        const catBadge = preset.category ? `<span class="intel-badge">${preset.category}</span>` : '';
        const targetBadge = `<span class="intel-badge target-badge">${preset.target}</span>`;
        row.innerHTML = `
            <div class="preset-info">
                <span class="preset-name">${preset.name}</span>
                ${catBadge}${targetBadge}
                <span class="preset-effect-type">${preset.effect_type}</span>
            </div>
            <div class="preset-actions">
                <button class="btn-fire-preset btn-primary" data-id="${preset.id}" title="Lanzar ahora">▶ Lanzar</button>
                <button class="btn-delete-preset" data-id="${preset.id}" title="Borrar">✕</button>
            </div>
        `;
        container.appendChild(row);
    });

    container.querySelectorAll('.btn-fire-preset').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            btn.disabled = true;
            btn.textContent = '✓';
            try {
                await fetch(`/api/presets/${id}/fire`, { method: 'POST' });
            } catch (e) { console.error(e); }
            setTimeout(() => { btn.disabled = false; btn.textContent = '▶ Lanzar'; }, 1500);
        });
    });

    container.querySelectorAll('.btn-delete-preset').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('¿Borrar este preset?')) return;
            await fetch(`/api/presets/${btn.dataset.id}`, { method: 'DELETE' });
            await loadPresets();
        });
    });
}

function bindPresetsEvents() {
    document.getElementById('intel-presets-refresh').addEventListener('click', loadPresets);

    document.getElementById('preset-create-btn').addEventListener('click', async () => {
        const name = document.getElementById('preset-name').value.trim();
        const category = document.getElementById('preset-category').value.trim();
        const target = document.getElementById('preset-target').value;
        const effect_type = document.getElementById('preset-effect-type').value;
        const payloadRaw = document.getElementById('preset-payload').value.trim();

        if (!name || !effect_type) { alert('Nombre y tipo de efecto son obligatorios.'); return; }

        let payload;
        try { payload = payloadRaw ? JSON.parse(payloadRaw) : {}; }
        catch { alert('JSON inválido en el payload.'); return; }

        await fetch('/api/presets', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, category, effect_type, payload, target })
        });

        document.getElementById('preset-name').value = '';
        document.getElementById('preset-payload').value = '';
        await loadPresets();
    });

    // Auto-fill payload hint when effect type changes
    document.getElementById('preset-effect-type').addEventListener('change', (e) => {
        const area = document.getElementById('preset-payload');
        if (area.value.trim() === '' || area.value.trim() === '{}') {
            area.value = JSON.stringify(defaultPayload(e.target.value), null, 2);
        }
    });
}

// =====================
// Intel tab — Analysis Queue
// =====================

let analysisData = [];

async function loadAnalysis() {
    try {
        analysisData = await fetch('/api/analysis').then(r => r.json());
    } catch (e) {
        analysisData = [];
    }
    renderAnalysisList();
}

const STATUS_LABELS = {
    pending: { label: 'Pendiente', css: 'status-pending' },
    processing: { label: 'Procesando', css: 'status-processing' },
    complete: { label: 'Completado', css: 'status-complete' }
};

function renderAnalysisList() {
    const container = document.getElementById('analysis-list');
    if (!analysisData.length) {
        container.innerHTML = '<p class="intel-empty">Cola vacía. Añade un análisis.</p>';
        return;
    }

    container.innerHTML = '';
    analysisData.forEach(item => {
        const st = STATUS_LABELS[item.status] || STATUS_LABELS.pending;
        const row = document.createElement('div');
        row.className = `analysis-row analysis-${item.status}`;
        const desc = item.description ? `<span class="analysis-desc">${item.description}</span>` : '';
        const resultEffect = item.result_effect
            ? `<span class="intel-badge">${item.result_effect}</span>`
            : '<span class="intel-badge" style="opacity:.4">sin efecto</span>';

        row.innerHTML = `
            <div class="analysis-info">
                <span class="analysis-label">${item.label}</span>
                <span class="analysis-status-badge ${st.css}">${st.label}</span>
                ${resultEffect}
                ${desc}
            </div>
            <div class="analysis-actions">
                ${item.status !== 'complete'
                    ? `<button class="btn-complete-analysis btn-primary" data-id="${item.id}">⚡ Disparar</button>`
                    : `<button class="btn-reset-analysis" data-id="${item.id}" title="Reabrir">↺ Reabrir</button>`
                }
                <button class="btn-delete-analysis" data-id="${item.id}" title="Borrar">✕</button>
            </div>
        `;
        container.appendChild(row);
    });

    container.querySelectorAll('.btn-complete-analysis').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.dataset.id;
            btn.disabled = true;
            btn.textContent = '✓';
            try {
                await fetch(`/api/analysis/${id}/complete`, { method: 'POST' });
                await loadAnalysis();
            } catch (e) {
                console.error(e);
                btn.disabled = false;
                btn.textContent = '⚡ Disparar';
            }
        });
    });

    container.querySelectorAll('.btn-reset-analysis').forEach(btn => {
        btn.addEventListener('click', async () => {
            await fetch(`/api/analysis/${btn.dataset.id}/reset`, { method: 'POST' });
            await loadAnalysis();
        });
    });

    container.querySelectorAll('.btn-delete-analysis').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!confirm('¿Borrar este análisis?')) return;
            await fetch(`/api/analysis/${btn.dataset.id}`, { method: 'DELETE' });
            await loadAnalysis();
        });
    });
}

function bindAnalysisEvents() {
    document.getElementById('intel-analysis-refresh').addEventListener('click', loadAnalysis);

    document.getElementById('analysis-create-btn').addEventListener('click', async () => {
        const label = document.getElementById('analysis-label').value.trim();
        const description = document.getElementById('analysis-description').value.trim();
        const result_target = document.getElementById('analysis-result-target').value;
        const result_effect = document.getElementById('analysis-result-effect').value;
        const payloadRaw = document.getElementById('analysis-result-payload').value.trim();

        if (!label) { alert('La etiqueta es obligatoria.'); return; }

        let result_payload;
        try { result_payload = payloadRaw ? JSON.parse(payloadRaw) : {}; }
        catch { alert('JSON inválido en el payload de resultado.'); return; }

        await fetch('/api/analysis', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ label, description, result_effect, result_payload, result_target })
        });

        document.getElementById('analysis-label').value = '';
        document.getElementById('analysis-description').value = '';
        document.getElementById('analysis-result-payload').value = '';
        await loadAnalysis();
    });

    // Auto-fill payload hint when result effect changes
    document.getElementById('analysis-result-effect').addEventListener('change', (e) => {
        const area = document.getElementById('analysis-result-payload');
        if (area.value.trim() === '' || area.value.trim() === '{}') {
            area.value = e.target.value ? JSON.stringify(defaultPayload(e.target.value), null, 2) : '';
        }
    });
}

// =====================
// Proyectar Expediente (entidades → ENTITY_DOSSIER / CORRELATION_REVEAL)
// =====================

let dossierEntities = [];

const ENTITY_TYPE_LABELS = {
    pc: 'AGENTE OV',
    npc: 'INDIVIDUO',
    org: 'ORGANIZACIÓN',
    criatura: 'ENTIDAD ANÓMALA'
};

async function loadEntities() {
    try {
        const list = await fetch('/api/dm/entities').then(r => r.json());
        dossierEntities = (list || []).filter(e => !e.archived);
    } catch (e) {
        console.error('Entities load error', e);
        dossierEntities = [];
    }
    renderEntitySelector();
}

function renderEntitySelector() {
    const select = document.getElementById('dossier-entity-select');
    if (!select) return;
    select.innerHTML = '';
    if (!dossierEntities.length) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = 'Sin entidades registradas';
        select.appendChild(opt);
        return;
    }
    dossierEntities.forEach(entity => {
        const opt = document.createElement('option');
        opt.value = entity.id;
        const name = entity.code_name || entity.real_name || `Entidad #${entity.id}`;
        opt.textContent = `${name} (${ENTITY_TYPE_LABELS[entity.type] || entity.type})`;
        select.appendChild(opt);
    });
}

function buildDossierPayload(entity) {
    const revealName = document.getElementById('dossier-reveal-name').checked;
    const includeImage = document.getElementById('dossier-include-image').checked;
    const includeSummary = document.getElementById('dossier-include-summary').checked;
    const voice = document.getElementById('dossier-voice').value;
    const source = document.getElementById('dossier-source').value.trim();
    const confidence = document.getElementById('dossier-confidence').value;

    // Solo campos narrativos: dm_notes y unlock_code jamás salen de la consola
    const fields = [];
    if (entity.real_name) {
        fields.push(revealName
            ? { label: 'NOMBRE REAL', value: entity.real_name }
            : { label: 'NOMBRE REAL', redacted: true });
    }
    fields.push({ label: 'TIPO', value: ENTITY_TYPE_LABELS[entity.type] || entity.type });
    if (entity.role) fields.push({ label: 'ROL', value: entity.role });
    if (entity.status) fields.push({ label: 'ESTADO', value: entity.status });
    if (entity.alignment) fields.push({ label: 'ALINEACIÓN', value: entity.alignment });
    if (entity.threat_level != null && entity.threat_level !== '') {
        const n = Math.max(0, Math.min(5, Number(entity.threat_level) || 0));
        fields.push({ label: 'NIVEL DE AMENAZA', value: '▮'.repeat(n) + '▯'.repeat(5 - n) + `  ${n}/5` });
    }

    const payload = {
        title: entity.code_name || entity.real_name || `ENTIDAD #${entity.id}`,
        classification: 'EXPEDIENTE — ORDO VERITATIS',
        stamp: 'CLASIFICADO',
        fields,
        voice,
        duration: 20000
    };
    if (includeImage && entity.image_url) payload.image_url = entity.image_url;
    if (includeSummary && entity.public_summary) payload.summary = entity.public_summary;
    if (source) payload.source = source;
    if (confidence !== '') payload.confidence = Number(confidence);
    return payload;
}

function bindDossierEvents() {
    document.getElementById('dossier-refresh').addEventListener('click', loadEntities);

    document.getElementById('dossier-project-btn').addEventListener('click', () => {
        const id = document.getElementById('dossier-entity-select').value;
        const entity = dossierEntities.find(e => String(e.id) === String(id));
        if (!entity) return;
        sendEffect('ENTITY_DOSSIER', buildDossierPayload(entity));
    });

    document.getElementById('dossier-connections-btn').addEventListener('click', async () => {
        const id = document.getElementById('dossier-entity-select').value;
        const entity = dossierEntities.find(e => String(e.id) === String(id));
        if (!entity) return;
        let ctx;
        try {
            ctx = await fetch(`/api/dm/entities/${id}/context`).then(r => r.json());
        } catch (e) {
            console.error('Context load error', e);
            return;
        }
        const relations = (ctx.relations || []).filter(r => r.to_code_name);
        if (!relations.length) {
            alert('Esta entidad no tiene conexiones registradas.');
            return;
        }
        const centerName = entity.code_name || entity.real_name || `ENTIDAD #${entity.id}`;
        const nodes = [centerName, ...relations.slice(0, 3).map(r => r.to_code_name)];
        const source = document.getElementById('dossier-source').value.trim();
        const confidence = document.getElementById('dossier-confidence').value;
        sendEffect('CORRELATION_REVEAL', {
            title: 'CORRELACIÓN ANÓMALA DETECTADA',
            nodes,
            confidence: confidence !== '' ? Number(confidence) : 62,
            source: source || 'ARCHIVO OV — GRAFO DE CAMPAÑA',
            duration: 13000
        });
    });
}

// =====================
// Boot
// =====================
async function main() {
    if (state.initialized) return;
    state.initialized = true;
    initTabs();
    renderQuickEvents();
    connectWebSocket();
    await loadPois();
    renderPoiSelector();
    renderMarkerSelector();
    bindEffectEvents();
    bindDossierEvents();
    bindMediaEvents();
    bindSceneControls();
    bindPresetsEvents();
    bindAnalysisEvents();
    initializeDmMap();
    await loadEntities();
    await loadMedia();
    await loadScenes();
    await loadPresets();
    await loadAnalysis();
}

async function bootDmConsole() {
    bindDmAuth();
    const authenticated = await hasDmSession();
    if (!authenticated) {
        showDmAuthOverlay('Sesión DM requerida.');
        return;
    }
    hideDmAuthOverlay();
    await main();
}

bootDmConsole();
