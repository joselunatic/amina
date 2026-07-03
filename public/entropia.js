// --- State ---
const state = {
    map: null,
    ws: null,
    pois: new Map(),
    heatmapLoaded: false,
    mediaImageTimeout: null,
    incidentCode: null,
    membranStatus: 'INTACT',
    triMarker: null,
    triTimeout: null,
    bootShown: true,
    agentsConnected: 0,
    transmissionTimeout: null,
    transmissionLineTimeout: null,
    correlationTimeouts: [],
    dossierTimeout: null,
};

const MEMBRANA_LABELS = {
    INTACT: 'INTACTA',
    FRAYED: 'DEBILITADA',
    TORN: 'ROTA'
};

// --- Ambient HUD data ---
const TICKER_MESSAGES = [
    'SYSTEM ONLINE',
    'SENSORS ACTIVE',
    'NETWORK STABLE',
    'DATABASE SYNCED',
    'MONITORING LIVE',
    'SIGNAL LOCKED',
    'AWAITING INPUT',
    'READY TO ENGAGE'
];
let tickerIndex = 0;

// --- DOM refs ---
const blackoutOverlay     = document.getElementById('blackout-overlay');
const mediaImageOverlay   = document.getElementById('media-image-overlay');
const mediaImageEl        = document.getElementById('media-image-el');
const mediaImageCaption   = document.getElementById('media-image-caption');
const mediaVideoOverlay   = document.getElementById('media-video-overlay');
const mediaVideoEl        = document.getElementById('media-video-el');
const mediaVideoCaption   = document.getElementById('media-video-caption');
const cardOverlay         = document.getElementById('card-overlay');
const fileRecoveryOverlay = document.getElementById('file-recovery-overlay');
const transmissionOverlay = document.getElementById('transmission-overlay');
const correlationOverlay  = document.getElementById('correlation-overlay');
const dossierOverlay      = document.getElementById('dossier-overlay');
const signalTriangulationOverlay = document.getElementById('signal-triangulation-overlay');
const audioPlayer         = document.getElementById('audio-player');
const sceneIndicator      = document.getElementById('scene-indicator');

// --- AMINA Home management ---
function updateHomeScreen() {
    const membEl = document.getElementById('home-membrana');
    const agentsEl = document.getElementById('home-agents');
    if (membEl) membEl.textContent = MEMBRANA_LABELS[state.membranStatus] || state.membranStatus;
    if (agentsEl) agentsEl.textContent = state.agentsConnected;
}

function showAminaHome() {
    const home = document.getElementById('amina-home');
    if (home) {
        home.classList.remove('hidden');
    }
}

function hideAminaHome() {
    const home = document.getElementById('amina-home');
    if (home) {
        home.classList.add('hidden');
    }
}

function setEffectPresentationMode(active) {
    document.body.classList.toggle('effect-presentation-active', active);
}

// --- WebSocket ---
function connectWebSocket() {
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${window.location.host}`);
    state.ws = ws;

    ws.onopen = () => {
        console.log('[entropia] WS connected');
        ws.send(JSON.stringify({ type: 'hello', role: 'screen' }));
    };

    ws.onmessage = (event) => {
        try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'effect') {
                handleEffect(msg.effect, msg.payload);
            }
            if (msg.type === 'agents-list') {
                state.agentsConnected = (msg.agents || []).length;
                updateHomeScreen();
            }
        } catch (e) {
            console.error('[entropia] WS parse error', e);
        }
    };

    ws.onclose = () => {
        console.log('[entropia] WS closed, reconnecting in 3s...');
        setTimeout(connectWebSocket, 3000);
    };

    ws.onerror = (err) => console.error('[entropia] WS error', err);
}

// --- Effect handler (mirrors agent.js, without auth/agentId) ---
function handleEffect(effect, payload = {}) {
    console.log(`[entropia] effect: ${effect}`, payload);
    if (effect !== 'AMINA_HOME') {
        setEffectPresentationMode(true);
        hideAminaHome();
    }
    switch (effect) {
        // Visual
        case 'GLITCH':
            document.body.classList.add('glitch-active');
            setTimeout(() => document.body.classList.remove('glitch-active'), 500);
            break;
        case 'NOISE_PULSE':
            document.body.classList.add('noise-active');
            setTimeout(() => document.body.classList.remove('noise-active'), 200);
            break;

        // Camera
        case 'NUDGE_CAMERA':
            if (state.map) {
                if (Number.isFinite(payload.lng) && Number.isFinite(payload.lat)) {
                    state.map.easeTo({
                        center: [payload.lng, payload.lat],
                        zoom: Number.isFinite(payload.zoom) ? payload.zoom : Math.max(state.map.getZoom(), 13),
                        duration: 900,
                        essential: true
                    });
                } else {
                    state.map.panBy([Math.random() * 200 - 100, Math.random() * 200 - 100], { duration: 500 });
                }
            }
            break;
        case 'FOCUS_INCIDENT':
            if (state.map) state.map.flyTo({
                center: [payload.lng, payload.lat],
                zoom: payload.zoom || 15,
                pitch: payload.pitch || 50,
                bearing: payload.bearing || 0,
                essential: true
            });
            break;
        case 'SWEEP_AREA':
            if (state.map) state.map.fitBounds(
                [[payload.start.lng, payload.start.lat], [payload.end.lng, payload.end.lat]],
                { padding: 40, duration: payload.durationMs || 4000 }
            );
            break;

        // POI
        case 'POI_BLINK_ON': case 'POI_HIGHLIGHT': case 'POI_LOCKED':
        case 'POI_BLINK_OFF': case 'POI_UNLOCKED': {
            const el = document.querySelector(`.poi-marker[data-poi-id="${payload.poiId}"]`);
            if (!el) break;
            if (effect === 'POI_BLINK_ON') el.classList.add('blink');
            if (effect === 'POI_BLINK_OFF') el.classList.remove('blink');
            if (effect === 'POI_HIGHLIGHT') el.classList.toggle('highlight');
            if (effect === 'POI_LOCKED') el.classList.add('locked');
            if (effect === 'POI_UNLOCKED') el.classList.remove('locked');
            break;
        }
        case 'POI_EPHEMERAL_ADD': {
            const ephEl = document.createElement('div');
            ephEl.className = `poi-marker marker-type-${payload.markerType || 'default'}`;
            ephEl.dataset.poiId = payload.poiId;
            const m = new mapboxgl.Marker(ephEl)
                .setLngLat([payload.lng, payload.lat])
                .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(payload.name))
                .addTo(state.map);
            ephEl.classList.add('highlight');
            state.pois.set(payload.poiId, m);
            break;
        }

        // Layer
        case 'LAYER_TOGGLE':
            if (state.map) state.map.setLayoutProperty(payload.layerId, 'visibility', payload.visible ? 'visible' : 'none');
            break;

        // Media
        case 'MEDIA_IMAGE':   showImageOverlay(payload); break;
        case 'MEDIA_VIDEO':   showVideoOverlay(payload); break;
        case 'MEDIA_AUDIO':   playAudio(payload); break;
        case 'MEDIA_CLEAR':   clearMediaOverlays(); break;

        // Scene overlays
        case 'SCENE_CARD':    showCard(payload); break;

        // Map annotation
        case 'LABEL_PING':    pingLabel(payload); break;
        case 'HEATMAP_SET':   setHeatmap(payload); break;
        case 'HEATMAP_CLEAR': clearHeatmap(); break;

        // Blackout / clear
        case 'MODE_BLACKOUT': showBlackout(); break;
        case 'CLEAR_OVERLAYS': clearAll(); break;

        case 'FILE_RECOVERY': showFileRecovery(payload); break;

        case 'SIGNAL_TRIANGULATION': showSignalTriangulation(payload); break;

        case 'INTERCEPTED_TRANSMISSION': showInterceptedTransmission(payload); break;

        case 'CORRELATION_REVEAL': showCorrelationReveal(payload); break;

        case 'ENTITY_DOSSIER': showEntityDossier(payload); break;

        case 'MEMBRANA_SET': applyMembranaStatus(payload); break;

        case 'AMINA_HOME':
            setEffectPresentationMode(false);
            showAminaHome();
            clearAll();
            break;
    }
}

// --- Media handlers ---
function showImageOverlay(payload) {
    clearTimeout(state.mediaImageTimeout);
    mediaImageEl.src = payload.url || '';
    mediaImageCaption.textContent = payload.caption || payload.title || '';
    mediaImageCaption.style.display = mediaImageCaption.textContent ? 'block' : 'none';
    mediaImageOverlay.className = 'media-overlay media-image-overlay';
    if (payload.cctv) {
        mediaImageOverlay.classList.add('cctv-feed');
        const timestamp = new Date().toLocaleTimeString();
        const cctvLabel = payload.camera_name || 'CAM-04';
        mediaImageCaption.innerHTML = `<span class="cctv-timestamp">${timestamp}</span> ${cctvLabel}`;
    }
    mediaImageOverlay.classList.add('active');
    if (payload.duration) {
        state.mediaImageTimeout = setTimeout(() => mediaImageOverlay.classList.remove('active'), payload.duration);
    }
}

function showVideoOverlay(payload) {
    mediaVideoEl.src = payload.url || '';
    mediaVideoEl.loop = !!payload.loop;
    mediaVideoEl.muted = payload.muted !== false;
    mediaVideoEl.volume = payload.volume != null ? payload.volume : 1;
    mediaVideoOverlay.className = 'media-overlay media-video-overlay';
    if (payload.cctv) {
        mediaVideoOverlay.classList.add('cctv-feed');
        const timestamp = new Date().toLocaleTimeString();
        const cctvLabel = payload.camera_name || 'CAM-04';
        mediaVideoCaption.innerHTML = `<span class="cctv-timestamp">${timestamp}</span> ${cctvLabel}`;
    } else {
        mediaVideoCaption.textContent = payload.caption || '';
    }
    mediaVideoCaption.style.display = payload.cctv || mediaVideoCaption.textContent ? 'block' : 'none';
    mediaVideoOverlay.classList.add('active');
    if (payload.autoplay !== false) mediaVideoEl.play().catch(() => {});
}

function playAudio(payload) {
    audioPlayer.src = payload.url || '';
    audioPlayer.loop = !!payload.loop;
    audioPlayer.volume = payload.volume != null ? payload.volume : 0.8;
    audioPlayer.play().catch(() => {});
}

function clearMediaOverlays() {
    clearTimeout(state.mediaImageTimeout);
    mediaImageOverlay.classList.remove('active');
    mediaVideoOverlay.classList.remove('active');
    mediaVideoEl.pause();
    mediaVideoEl.src = '';
    audioPlayer.pause();
    audioPlayer.src = '';
}

function showCard(payload) {
    document.getElementById('card-subtitle').textContent = payload.subtitle || '';
    document.getElementById('card-title').textContent = payload.title || '';
    document.getElementById('card-body').textContent = payload.body || '';
    const metaEl = document.getElementById('card-meta');
    const metaParts = [];
    if (payload.confidence != null && payload.confidence !== '') metaParts.push(`CONFIANZA: ${payload.confidence}%`);
    if (payload.source) metaParts.push(`FUENTE: ${payload.source}`);
    metaEl.textContent = metaParts.join('  ·  ');
    metaEl.style.display = metaParts.length ? 'block' : 'none';
    cardOverlay.className = 'card-overlay active';
    if (payload.theme) cardOverlay.classList.add(`card-theme-${payload.theme}`);
    if (payload.voice) cardOverlay.classList.add(`card-voice-${payload.voice}`);
}

function applyMembranaStatus(payload) {
    const status = String(payload.status || 'INTACT').toUpperCase();
    setMembranStatus(status);
    updateHomeScreen();
    document.body.classList.remove('membrana-frayed', 'membrana-torn');
    if (status === 'FRAYED') document.body.classList.add('membrana-frayed');
    if (status === 'TORN') document.body.classList.add('membrana-torn');
}

function showInterceptedTransmission(payload) {
    const lines = payload.lines || [];
    const lost = new Set(payload.lost || []);
    const duration = payload.duration || 10000;

    hideInterceptedTransmission();

    document.getElementById('transmission-source').textContent = payload.source || 'FUENTE DESCONOCIDA';
    document.getElementById('transmission-freq').textContent = payload.frequency || '---.- MHz';
    const content = document.getElementById('transmission-content');
    content.innerHTML = '';

    const wave = document.getElementById('transmission-wave');
    wave.innerHTML = '';
    for (let i = 0; i < 28; i++) {
        const bar = document.createElement('div');
        bar.className = 'wave-bar';
        bar.style.animationDelay = (Math.random() * 0.8) + 's';
        bar.style.animationDuration = (0.4 + Math.random() * 0.7) + 's';
        wave.appendChild(bar);
    }

    transmissionOverlay.classList.add('active');
    if (payload.audio_url) {
        audioPlayer.src = payload.audio_url;
        audioPlayer.loop = false;
        audioPlayer.volume = payload.volume != null ? payload.volume : 0.8;
        audioPlayer.play().catch(() => {});
    }

    const lineDelay = Math.min(1600, (duration * 0.7) / Math.max(lines.length, 1));
    let idx = 0;
    function nextLine() {
        if (idx >= lines.length) return;
        const el = document.createElement('div');
        el.className = 'transmission-line';
        if (lost.has(idx)) {
            el.classList.add('lost');
            el.textContent = '▓▓▓ SEÑAL PERDIDA ▓▓▓';
        } else {
            el.textContent = lines[idx];
        }
        content.appendChild(el);
        idx++;
        state.transmissionLineTimeout = setTimeout(nextLine, lineDelay);
    }
    nextLine();

    state.transmissionTimeout = setTimeout(hideInterceptedTransmission, duration);
}

function hideInterceptedTransmission() {
    clearTimeout(state.transmissionTimeout);
    clearTimeout(state.transmissionLineTimeout);
    transmissionOverlay.classList.remove('active');
}

function showCorrelationReveal(payload) {
    const nodes = payload.nodes || [];
    const duration = payload.duration || 10000;

    hideCorrelationReveal();

    document.getElementById('correlation-title').textContent = payload.title || 'CORRELACIÓN ANÓMALA DETECTADA';
    const nodesEl = document.getElementById('correlation-nodes');
    nodesEl.innerHTML = '';
    const stampEl = document.getElementById('correlation-stamp');
    stampEl.classList.remove('revealed');
    document.getElementById('correlation-confidence').textContent =
        (payload.confidence != null && payload.confidence !== '') ? `COINCIDENCIA: ${payload.confidence}%` : '';
    document.getElementById('correlation-source').textContent =
        payload.source ? `FUENTE: ${payload.source}` : '';

    const revealables = [];
    nodes.forEach((label, i) => {
        if (i > 0) {
            const link = document.createElement('div');
            link.className = 'correlation-link';
            nodesEl.appendChild(link);
            revealables.push(link);
        }
        const node = document.createElement('div');
        node.className = 'correlation-node';
        node.textContent = label;
        nodesEl.appendChild(node);
        revealables.push(node);
    });

    correlationOverlay.classList.add('active');

    const stepDelay = 550;
    revealables.forEach((el, i) => {
        state.correlationTimeouts.push(setTimeout(() => el.classList.add('revealed'), 600 + i * stepDelay));
    });
    state.correlationTimeouts.push(setTimeout(() => stampEl.classList.add('revealed'), 600 + revealables.length * stepDelay + 400));
    state.correlationTimeouts.push(setTimeout(hideCorrelationReveal, duration));
}

function hideCorrelationReveal() {
    state.correlationTimeouts.forEach(clearTimeout);
    state.correlationTimeouts = [];
    correlationOverlay.classList.remove('active');
}

function showEntityDossier(payload) {
    clearTimeout(state.dossierTimeout);

    document.getElementById('dossier-classification').textContent = payload.classification || 'EXPEDIENTE — ORDO VERITATIS';
    document.getElementById('dossier-stamp').textContent = payload.stamp || 'CLASIFICADO';
    document.getElementById('dossier-name').textContent = payload.title || '';

    const photoEl = document.getElementById('dossier-photo');
    if (payload.image_url) {
        photoEl.innerHTML = '';
        const img = document.createElement('img');
        img.src = payload.image_url;
        img.alt = '';
        photoEl.appendChild(img);
    } else {
        photoEl.innerHTML = '<div class="dossier-no-photo">SIN REGISTRO<br>VISUAL</div>';
    }

    const fieldsEl = document.getElementById('dossier-fields');
    fieldsEl.innerHTML = '';
    (payload.fields || []).forEach((field, i) => {
        const row = document.createElement('div');
        row.className = 'dossier-field';
        row.style.animationDelay = (0.3 + i * 0.25) + 's';
        const label = document.createElement('span');
        label.className = 'dossier-field-label';
        label.textContent = field.label || '';
        const value = document.createElement('span');
        value.className = 'dossier-field-value';
        if (field.redacted) {
            value.classList.add('censored');
            value.textContent = '████████████';
        } else {
            value.textContent = field.value || '—';
        }
        row.appendChild(label);
        row.appendChild(value);
        fieldsEl.appendChild(row);
    });

    const summaryEl = document.getElementById('dossier-summary');
    summaryEl.textContent = payload.summary || '';
    summaryEl.style.display = payload.summary ? 'block' : 'none';

    const metaEl = document.getElementById('dossier-meta');
    const metaParts = [];
    if (payload.confidence != null && payload.confidence !== '') metaParts.push(`CONFIANZA: ${payload.confidence}%`);
    if (payload.source) metaParts.push(`FUENTE: ${payload.source}`);
    metaEl.textContent = metaParts.join('  ·  ');
    metaEl.style.display = metaParts.length ? 'block' : 'none';

    dossierOverlay.className = 'dossier-overlay active';
    if (payload.voice) dossierOverlay.classList.add(`dossier-voice-${payload.voice}`);

    if (payload.duration) {
        state.dossierTimeout = setTimeout(hideEntityDossier, payload.duration);
    }
}

function hideEntityDossier() {
    clearTimeout(state.dossierTimeout);
    dossierOverlay.classList.remove('active');
}

function showBlackout() {
    blackoutOverlay.classList.add('active');
}

function showFileRecovery(payload) {
    const lines = payload.lines || [];
    const censored = new Set(payload.censored || []);
    const imageUrl = payload.image_url;
    const duration = payload.duration || 8000;

    fileRecoveryOverlay.classList.add('active');
    document.getElementById('recovery-content').innerHTML = '';
    document.getElementById('recovery-image').innerHTML = '';
    document.getElementById('recovery-bar').style.width = '0%';
    document.getElementById('recovery-percent').textContent = '0%';

    const progressDuration = duration * 0.8;
    const lineDelay = progressDuration / Math.max(lines.length, 1);
    let displayedLines = 0;

    function displayNextLine() {
        if (displayedLines >= lines.length) {
            const barEl = document.getElementById('recovery-bar');
            barEl.style.transition = 'width 0.6s ease';
            barEl.style.width = '100%';
            document.getElementById('recovery-percent').textContent = '100%';
            if (imageUrl) {
                setTimeout(() => {
                    const imgDiv = document.getElementById('recovery-image');
                    imgDiv.innerHTML = `<img src="${imageUrl}" alt="Recovered" />`;
                    imgDiv.style.opacity = '0';
                    imgDiv.style.transition = 'opacity 0.8s ease';
                    setTimeout(() => imgDiv.style.opacity = '1', 50);
                }, 600);
            }
            return;
        }
        const lineIdx = displayedLines;
        const line = lines[lineIdx];
        const isCensored = censored.has(lineIdx);
        const lineEl = document.createElement('div');
        lineEl.className = 'recovery-line';
        lineEl.innerHTML = isCensored ? '<span class="censored">██████</span>' : line;
        document.getElementById('recovery-content').appendChild(lineEl);
        const progress = Math.round((displayedLines / lines.length) * 80);
        document.getElementById('recovery-bar').style.width = progress + '%';
        document.getElementById('recovery-percent').textContent = progress + '%';
        displayedLines++;
        setTimeout(displayNextLine, lineDelay);
    }

    displayNextLine();
    setTimeout(() => fileRecoveryOverlay.classList.remove('active'), duration + 1000);
}

function showSignalTriangulation(payload) {
    const lng = payload.lng || 0;
    const lat = payload.lat || 0;
    const precision = payload.precision || 73;
    const duration = payload.duration || 6000;

    clearSignalTriangulation();

    signalTriangulationOverlay.classList.add('active');
    document.getElementById('tri-lat').textContent = Math.abs(lat).toFixed(4);
    document.getElementById('tri-lng').textContent = Math.abs(lng).toFixed(4);
    document.getElementById('tri-precision').textContent = precision + '%';

    for (let i = 1; i <= 5; i++) {
        const bar = document.getElementById(`tri-bar-${i}`);
        bar.style.animation = 'none';
        setTimeout(() => {
            bar.style.animation = `bar-scan 1.5s ease-in-out ${(i - 1) * 0.2}s infinite`;
            bar.style.height = (40 + Math.random() * 40) + '%';
        }, 10);
    }

    const circleEl = document.createElement('div');
    circleEl.className = 'triangulation-circle';
    const marker = new mapboxgl.Marker({ element: circleEl })
        .setLngLat([lng, lat])
        .addTo(state.map);
    state.triMarker = marker;

    state.map.addSource('tri-circle', {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] } }
    });
    state.map.addLayer({
        id: 'tri-circle-layer',
        type: 'circle',
        source: 'tri-circle',
        paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 8, 24, 80],
            'circle-color': 'rgba(0, 255, 136, 0)',
            'circle-stroke-color': '#00ff88',
            'circle-stroke-width': 3,
            'circle-stroke-opacity': 0.7
        }
    });

    state.map.flyTo({ center: [lng, lat], zoom: 14, essential: true, duration: 1500 });
    state.triTimeout = setTimeout(() => clearSignalTriangulation(), duration);
}

function clearSignalTriangulation() {
    clearTimeout(state.triTimeout);
    signalTriangulationOverlay.classList.remove('active');
    if (state.map) {
        if (state.map.getLayer('tri-circle-layer')) state.map.removeLayer('tri-circle-layer');
        if (state.map.getSource('tri-circle')) state.map.removeSource('tri-circle');
    }
    if (state.triMarker) { state.triMarker.remove(); state.triMarker = null; }
}

function clearAll() {
    clearMediaOverlays();
    clearSignalTriangulation();
    hideInterceptedTransmission();
    hideCorrelationReveal();
    hideEntityDossier();
    blackoutOverlay.classList.remove('active');
    cardOverlay.classList.remove('active');
    fileRecoveryOverlay.classList.remove('active');
    clearHeatmap();
}

// --- Map annotation ---
function pingLabel(payload) {
    if (!state.map) return;
    const el = document.createElement('div');
    el.className = 'label-ping';
    el.textContent = payload.text || '';
    const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([payload.lng, payload.lat])
        .addTo(state.map);
    setTimeout(() => marker.remove(), payload.duration || 5000);
}

function setHeatmap(payload) {
    if (!state.map) return;
    const features = (payload.points || []).map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { weight: p.weight != null ? p.weight : 1 }
    }));
    const geojson = { type: 'FeatureCollection', features };
    if (state.heatmapLoaded) {
        state.map.getSource('heatmap-data').setData(geojson);
    } else {
        state.map.addSource('heatmap-data', { type: 'geojson', data: geojson });
        state.map.addLayer({
            id: 'heatmap-layer', type: 'heatmap', source: 'heatmap-data',
            paint: {
                'heatmap-weight': ['get', 'weight'],
                'heatmap-intensity': 1.5,
                'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
                    0, 'rgba(0,0,0,0)', 0.2, 'rgba(0,255,100,0.3)',
                    0.6, 'rgba(255,200,0,0.6)', 1, 'rgba(255,0,0,0.9)'],
                'heatmap-radius': 40,
                'heatmap-opacity': 0.85
            }
        });
        state.heatmapLoaded = true;
    }
}

function clearHeatmap() {
    if (!state.map || !state.heatmapLoaded) return;
    if (state.map.getLayer('heatmap-layer')) state.map.removeLayer('heatmap-layer');
    if (state.map.getSource('heatmap-data')) state.map.removeSource('heatmap-data');
    state.heatmapLoaded = false;
}

// --- HUD initialization & updates ---

function generateIncidentCode() {
    const zone = String(Math.floor(Math.random() * 9999)).padStart(4, '0');
    const seq = String(Math.floor(Math.random() * 99)).padStart(2, '0');
    return `INC-${zone}-${seq}`;
}

function initializeHUD() {
    // Generate incident code on load
    state.incidentCode = generateIncidentCode();
    document.getElementById('incident-code').textContent = state.incidentCode;

    // Start clock update (every 1 second)
    updateClock();
    setInterval(updateClock, 1000);

    // Start ticker rotation (every 5 seconds)
    updateTicker();
    setInterval(updateTicker, 5000);

    // Start signal indicator pulse (visual feedback)
    const signalEl = document.getElementById('signal-indicator');
    setInterval(() => {
        signalEl.classList.toggle('pulse');
    }, 1500);
}

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    const secs = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('system-clock').textContent = `${hours}:${mins}:${secs}`;
}

function updateTicker() {
    const msg = TICKER_MESSAGES[tickerIndex];
    const tickerEl = document.getElementById('system-ticker');
    tickerEl.style.animation = 'none';
    setTimeout(() => {
        tickerEl.textContent = msg;
        tickerEl.style.animation = 'ticker-scroll 5s ease-in-out';
    }, 10);
    tickerIndex = (tickerIndex + 1) % TICKER_MESSAGES.length;
}

function updateCoordinates() {
    if (!state.map) return;
    const center = state.map.getCenter();
    const lat = Math.abs(center.lat).toFixed(4);
    const lng = Math.abs(center.lng).toFixed(4);
    const latDir = center.lat >= 0 ? 'N' : 'S';
    const lngDir = center.lng >= 0 ? 'E' : 'W';
    document.getElementById('coordinates-display').textContent =
        `COORD: ${lat}${latDir}, ${lng}${lngDir}`;
}

function setMembranStatus(status) {
    state.membranStatus = status;
    const el = document.getElementById('membrana-status');
    el.textContent = `MEMBRANA: ${MEMBRANA_LABELS[status] || status}`;
    el.className = `hud-item status-${status.toLowerCase()}`;
}

// --- Algorithm Background Animation (global signal analysis simulation) ---

function initializeAlgorithmBackground() {
    const container = document.getElementById('algorithm-background');
    if (!container) return;

    // Configuration for background animation
    const config = {
        signalNodes: 40,      // Total global signal monitoring points
        threatPoints: 8,      // Veil ruptures and anomalies
        scanWaves: 5,         // Simultaneous scanning waves
        networkLines: 6,      // Signal propagation connections
        hotspots: 4           // Regional analysis hotspots
    };

    // Get viewport dimensions
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Create signal nodes (scattered globally)
    for (let i = 0; i < config.signalNodes; i++) {
        const node = document.createElement('div');
        node.className = 'signal-node active';
        const x = Math.random() * vw;
        const y = Math.random() * vh;
        const size = 2 + Math.random() * 3;
        node.style.left = x + 'px';
        node.style.top = y + 'px';
        node.style.width = size + 'px';
        node.style.height = size + 'px';
        node.style.background = 'rgba(0, 255, 136, 0.4)';
        node.style.animationDelay = (Math.random() * 4) + 's';
        container.appendChild(node);
    }

    // Create threat indicators (veil ruptures and extraterrestrial entities)
    for (let i = 0; i < config.threatPoints; i++) {
        const threat = document.createElement('div');
        const threatType = i < 3 ? 'rupture' : 'entity';
        threat.className = `threat-indicator ${threatType}`;
        const x = Math.random() * vw;
        const y = Math.random() * vh;
        const size = 15 + Math.random() * 25;
        threat.style.left = x + 'px';
        threat.style.top = y + 'px';
        threat.style.width = size + 'px';
        threat.style.height = size + 'px';
        threat.style.background = threatType === 'rupture'
            ? 'rgba(255, 65, 54, 0.15)'
            : 'rgba(180, 100, 255, 0.15)';
        threat.style.animationDelay = (Math.random() * 3) + 's';
        container.appendChild(threat);
    }

    // Create regional hotspots (analysis focus areas)
    for (let i = 0; i < config.hotspots; i++) {
        const hotspot = document.createElement('div');
        hotspot.className = 'regional-hotspot active';
        const x = Math.random() * vw * 0.9 + vw * 0.05;
        const y = Math.random() * vh * 0.9 + vh * 0.05;
        const size = 80 + Math.random() * 150;
        hotspot.style.left = (x - size / 2) + 'px';
        hotspot.style.top = (y - size / 2) + 'px';
        hotspot.style.width = size + 'px';
        hotspot.style.height = size + 'px';
        hotspot.style.animationDelay = (Math.random() * 3.5) + 's';
        container.appendChild(hotspot);
    }

    // Periodic scanning waves from random locations
    function createScanWave() {
        const wave = document.createElement('div');
        wave.className = 'scan-wave propagating';
        const x = Math.random() * vw;
        const y = Math.random() * vh;
        const size = 40;
        wave.style.left = (x - size / 2) + 'px';
        wave.style.top = (y - size / 2) + 'px';
        wave.style.width = size + 'px';
        wave.style.height = size + 'px';
        wave.style.borderColor = Math.random() > 0.5 ? 'rgba(0,255,136,0.1)' : 'rgba(180,100,255,0.1)';
        container.appendChild(wave);

        // Remove after animation completes
        setTimeout(() => wave.remove(), 4000);
    }

    // Launch scanning waves periodically
    setInterval(createScanWave, 3000);
    // Create initial wave
    createScanWave();

    // Animated connection lines between random nodes
    function createNetworkLine() {
        const x1 = Math.random() * vw;
        const y1 = Math.random() * vh;
        const x2 = Math.random() * vw;
        const y2 = Math.random() * vh;

        const line = document.createElement('div');
        line.className = 'network-line active';
        const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;

        line.style.position = 'absolute';
        line.style.left = x1 + 'px';
        line.style.top = y1 + 'px';
        line.style.width = length + 'px';
        line.style.height = '1px';
        line.style.transform = `rotate(${angle}deg)`;
        line.style.transformOrigin = '0 0';
        line.style.animationDelay = (Math.random() * 3) + 's';

        container.appendChild(line);

        // Remove after animation
        setTimeout(() => line.remove(), 3000);
    }

    // Create initial network lines
    for (let i = 0; i < config.networkLines; i++) {
        setTimeout(createNetworkLine, i * 400);
    }

    // Periodically create new network lines
    setInterval(() => {
        if (Math.random() > 0.3) createNetworkLine();
    }, 4000);

    // Add analysis status text at random locations
    const statusMessages = [
        'SIGNAL ANALYSIS...',
        'VEIL RUPTURE SCAN...',
        'ENTITY DETECTION...',
        'THREAT ASSESSMENT...',
        'NETWORK MAPPING...',
        'ANOMALY LOGGED...',
        'FREQUENCY TRACKING...',
        'INTERDIMENSIONAL SCAN...'
    ];

    function createStatusIndicator() {
        const status = document.createElement('div');
        status.className = 'algorithm-status analyzing';
        status.textContent = statusMessages[Math.floor(Math.random() * statusMessages.length)];
        const x = Math.random() * (vw - 200);
        const y = Math.random() * (vh - 100);
        status.style.left = x + 'px';
        status.style.top = y + 'px';
        status.style.animationDelay = (Math.random() * 1.5) + 's';

        container.appendChild(status);

        // Remove after duration
        setTimeout(() => status.remove(), 6000);
    }

    // Create status indicators periodically
    setInterval(createStatusIndicator, 5000);
    // Create initial indicators
    for (let i = 0; i < 2; i++) {
        setTimeout(createStatusIndicator, i * 1000);
    }

    console.log('[entropia] Algorithm background initialized - global signal analysis simulation active');
}

// --- Map init ---
async function initializeMap() {
    try {
        const config = await fetch('/api/config').then(r => r.json());
        mapboxgl.accessToken = config.mapboxToken;
        state.map = new mapboxgl.Map({
            container: 'map',
            style: config.mapStyle || 'mapbox://styles/mapbox/dark-v11',
            center: [-76.229, 40.68],
            zoom: 9,
            interactive: false
        });
        state.map.on('load', async () => {
            updateCoordinates();
            try {
                const pois = await fetch('/api/pois').then(r => r.json());
                pois.forEach(poi => {
                    const el = document.createElement('div');
                    el.className = 'poi-marker';
                    el.dataset.poiId = poi.id;
                    const marker = new mapboxgl.Marker(el)
                        .setLngLat([poi.longitude, poi.latitude])
                        .addTo(state.map);
                    state.pois.set(poi.id, marker);
                });
            } catch (e) {
                console.warn('[entropia] POIs not loaded:', e.message);
            }
        });

        state.map.on('move', updateCoordinates);
    } catch (e) {
        console.error('[entropia] Map init failed:', e);
    }
}

// --- Initialization ---
initializeAlgorithmBackground();
initializeHUD();
updateHomeScreen();
initializeMap();
connectWebSocket();
