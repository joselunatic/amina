// --- Agent Identity ---
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
}

function setCookie(name, value, days) {
    let expires = "";
    if (days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}

function getOrCreateAgentId() {
    let agentId = getCookie("agentId");
    if (!agentId) {
        agentId = `agent_${Math.random().toString(36).substr(2, 9)}`;
        setCookie("agentId", agentId, 365);
    }
    return agentId;
}

// --- State & DOM ---
const state = {
    map: null,
    agentId: getOrCreateAgentId(),
    ws: null,
    pois: new Map(),
    heatmapLoaded: false,
    mediaImageTimeout: null,
    transmissionTimeout: null,
    transmissionLineTimeout: null,
    correlationTimeouts: [],
    dossierTimeout: null,
};

const agentIdDisplay = document.getElementById('agent-id-display');
const glitchOverlay = document.getElementById('glitch-overlay');
const vignetteOverlay = document.getElementById('vignette-overlay');
const noiseOverlay = document.getElementById('noise-overlay');
const blackoutOverlay = document.getElementById('blackout-overlay');
const mediaImageOverlay = document.getElementById('media-image-overlay');
const mediaImageEl = document.getElementById('media-image-el');
const mediaImageCaption = document.getElementById('media-image-caption');
const mediaVideoOverlay = document.getElementById('media-video-overlay');
const mediaVideoEl = document.getElementById('media-video-el');
const mediaVideoCaption = document.getElementById('media-video-caption');
const cardOverlay = document.getElementById('card-overlay');
const fileRecoveryOverlay = document.getElementById('file-recovery-overlay');
const signalTriangulationOverlay = document.getElementById('signal-triangulation-overlay');
const transmissionOverlay = document.getElementById('transmission-overlay');
const correlationOverlay = document.getElementById('correlation-overlay');
const dossierOverlay = document.getElementById('dossier-overlay');
const audioPlayer = document.getElementById('audio-player');

// --- WebSocket Communication ---
function connectWebSocket() {
    const wsUrl = `ws://${window.location.host}`;
    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
        console.log("WebSocket connection established.");
        // Send handshake
        state.ws.send(JSON.stringify({
            type: "hello",
            role: "agent",
            agentId: state.agentId
        }));
    };

    state.ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            if (message.type === 'effect') {
                handleEffect(message.effect, message.payload);
            }
        } catch (e) {
            console.error("Failed to parse incoming message:", e);
        }
    };

    state.ws.onclose = () => {
        console.log("WebSocket connection closed. Reconnecting in 3 seconds...");
        setTimeout(connectWebSocket, 3000);
    };

    state.ws.onerror = (err) => {
        console.error("WebSocket error:", err);
    };
}

// --- Effect Handling ---
function applyMarkerStyle(element, markerType) {
    if (!element || !markerType) return;

    // Remove all other marker type classes
    element.className.split(' ').forEach(className => {
        if (className.startsWith('marker-type-')) {
            element.classList.remove(className);
        }
    });

    // Add the new marker type class
    element.classList.add(`marker-type-${markerType}`);
}


function handleEffect(effect, payload) {
    console.log(`Received effect: ${effect}`, payload);
    switch (effect) {
        // Visual Effects
        case 'GLITCH':
            glitchOverlay.classList.add('active');
            setTimeout(() => glitchOverlay.classList.remove('active'), 500); // Duration of the effect
            break;
        case 'VIGNETTE_LEVEL':
            vignetteOverlay.classList.remove('vignette-level-1', 'vignette-level-2', 'vignette-level-3');
            if (payload.level > 0) {
                vignetteOverlay.classList.add(`vignette-level-${payload.level}`);
                vignetteOverlay.style.display = 'block';
            } else {
                 vignetteOverlay.style.display = 'none';
            }
            break;
        case 'NOISE_PULSE':
            noiseOverlay.classList.add('active');
            setTimeout(() => noiseOverlay.classList.remove('active'), 200);
            break;

        // Camera Effects
        case 'NUDGE_CAMERA':
            state.map.panBy([Math.random() * 200 - 100, Math.random() * 200 - 100], { duration: 500 });
            break;
        case 'FOCUS_INCIDENT':
            state.map.flyTo({
                center: [payload.lng, payload.lat],
                zoom: payload.zoom || 15,
                pitch: payload.pitch || 50,
                bearing: payload.bearing || 0,
                essential: true
            });
            break;
        case 'SWEEP_AREA':
             state.map.fitBounds([
                [payload.start.lng, payload.start.lat],
                [payload.end.lng, payload.end.lat]
            ], {
                padding: 40,
                duration: payload.durationMs || 4000
            });
            break;

        // POI Effects
        case 'POI_BLINK_ON':
        case 'POI_HIGHLIGHT':
        case 'POI_LOCKED':
        case 'POI_BLINK_OFF':
        case 'POI_UNLOCKED':
            const poiMarkerEl = document.querySelector(`.poi-marker[data-poi-id="${payload.poiId}"]`);
            if(poiMarkerEl) {
                // Apply marker style if provided
                if (payload.markerType) {
                    applyMarkerStyle(poiMarkerEl, payload.markerType);
                }

                if(effect === 'POI_BLINK_ON') poiMarkerEl.classList.add('blink');
                if(effect === 'POI_BLINK_OFF') poiMarkerEl.classList.remove('blink');
                if(effect === 'POI_HIGHLIGHT') poiMarkerEl.classList.toggle('highlight');
                if(effect === 'POI_LOCKED') {
                    poiMarkerEl.classList.add('locked');
                    // Style is now handled by CSS, but we can override if needed
                }
                if(effect === 'POI_UNLOCKED') {
                    poiMarkerEl.classList.remove('locked');
                }
            }
            break;
        
        case 'POI_EPHEMERAL_ADD':
            const ephemeralEl = document.createElement('div');
            ephemeralEl.className = 'poi-marker';
            ephemeralEl.dataset.poiId = payload.poiId;
            
            applyMarkerStyle(ephemeralEl, payload.markerType);
            
            const ephemeralMarker = new mapboxgl.Marker(ephemeralEl)
                .setLngLat([payload.lng, payload.lat])
                .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(payload.name))
                .addTo(state.map);
            
            // Highlight it immediately
            ephemeralEl.classList.add('highlight');

            state.pois.set(payload.poiId, ephemeralMarker);
            break;

        // Layer Effects
        case 'LAYER_TOGGLE':
            state.map.setLayoutProperty(payload.layerId, 'visibility', payload.visible ? 'visible' : 'none');
            break;

        // Media Effects
        case 'MEDIA_IMAGE':
            showImageOverlay(payload);
            break;
        case 'MEDIA_VIDEO':
            showVideoOverlay(payload);
            break;
        case 'MEDIA_AUDIO':
            playAudio(payload);
            break;
        case 'MEDIA_CLEAR':
            clearMediaOverlays();
            break;

        // Card / Scene overlays
        case 'SCENE_CARD':
            showCard(payload);
            break;

        // Map annotation effects
        case 'LABEL_PING':
            pingLabel(payload);
            break;
        case 'HEATMAP_SET':
            setHeatmap(payload);
            break;
        case 'HEATMAP_CLEAR':
            clearHeatmap();
            break;

        // Full blackout
        case 'MODE_BLACKOUT':
            showBlackout(payload);
            break;

        // Clear all overlays
        case 'CLEAR_OVERLAYS':
            clearAll();
            break;

        case 'FILE_RECOVERY':
            showFileRecovery(payload);
            break;

        case 'SIGNAL_TRIANGULATION':
            showSignalTriangulation(payload);
            break;

        case 'INTERCEPTED_TRANSMISSION':
            showInterceptedTransmission(payload);
            break;

        case 'CORRELATION_REVEAL':
            showCorrelationReveal(payload);
            break;

        case 'ENTITY_DOSSIER':
            showEntityDossier(payload);
            break;
    }
}

// --- Media overlay handlers ---

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
        state.mediaImageTimeout = setTimeout(() => {
            mediaImageOverlay.classList.remove('active');
        }, payload.duration);
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

function showBlackout(_payload) {
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

    const progressDuration = duration * 0.8; // 80% for text, 20% for image
    const lineDelay = progressDuration / Math.max(lines.length, 1);
    let displayedLines = 0;

    function displayNextLine() {
        if (displayedLines >= lines.length) {
            // Complete progress bar
            const barEl = document.getElementById('recovery-bar');
            barEl.style.transition = 'width 0.6s ease';
            barEl.style.width = '100%';
            document.getElementById('recovery-percent').textContent = '100%';

            // Show image if provided
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
        if (isCensored) {
            lineEl.innerHTML = '<span class="censored">██████</span>';
        } else {
            lineEl.textContent = line;
        }
        document.getElementById('recovery-content').appendChild(lineEl);

        // Update progress bar
        const progress = Math.round((displayedLines / lines.length) * 80);
        document.getElementById('recovery-bar').style.width = progress + '%';
        document.getElementById('recovery-percent').textContent = progress + '%';

        displayedLines++;
        setTimeout(displayNextLine, lineDelay);
    }

    displayNextLine();

    // Auto-close after duration
    setTimeout(() => {
        fileRecoveryOverlay.classList.remove('active');
    }, duration + 1000);
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
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 5, 24, 50],
            'circle-color': 'rgba(0, 255, 136, 0)',
            'circle-stroke-color': '#00ff88',
            'circle-stroke-width': 2,
            'circle-stroke-opacity': 0.6
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
    vignetteOverlay.style.display = 'none';
    vignetteOverlay.classList.remove('vignette-level-1', 'vignette-level-2', 'vignette-level-3');
    clearHeatmap();
}

// --- Map annotation handlers ---

function pingLabel(payload) {
    if (!state.map) return;
    const el = document.createElement('div');
    el.className = 'label-ping';
    el.textContent = payload.text || '';
    const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
        .setLngLat([payload.lng, payload.lat])
        .addTo(state.map);
    const duration = payload.duration || 4000;
    setTimeout(() => marker.remove(), duration);
}

function setHeatmap(payload) {
    if (!state.map) return;
    const points = (payload.points || []).map(p => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { weight: p.weight != null ? p.weight : 1 }
    }));
    const geojson = { type: 'FeatureCollection', features: points };

    if (state.heatmapLoaded) {
        state.map.getSource('heatmap-data').setData(geojson);
    } else {
        state.map.addSource('heatmap-data', { type: 'geojson', data: geojson });
        state.map.addLayer({
            id: 'heatmap-layer',
            type: 'heatmap',
            source: 'heatmap-data',
            paint: {
                'heatmap-weight': ['get', 'weight'],
                'heatmap-intensity': 1.5,
                'heatmap-color': [
                    'interpolate', ['linear'], ['heatmap-density'],
                    0, 'rgba(0,0,0,0)',
                    0.2, 'rgba(0,255,100,0.3)',
                    0.6, 'rgba(255,200,0,0.6)',
                    1, 'rgba(255,0,0,0.9)'
                ],
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


// --- Map Initialization ---
async function initializeMap() {
    try {
        const config = await fetch('/api/config').then(res => res.json());
        mapboxgl.accessToken = config.mapboxToken;

        state.map = new mapboxgl.Map({
            container: 'map',
            style: config.mapStyle || 'mapbox://styles/mapbox/dark-v11',
            center: [-76.229, 40.68],
            zoom: 9
        });
        
        state.map.on('load', async () => {
            try {
                const pois = await fetch('/api/pois').then(res => {
                    if (!res.ok) throw new Error('Failed to fetch POIs');
                    return res.json();
                });
                addRealPois(pois);
            } catch (e) {
                console.error("Failed to load real POIs:", e);
                // Fallback to sample POIs if API fails
                addSamplePois();
            }
        });

    } catch (e) {
        console.error("Failed to initialize map:", e);
        document.getElementById('map').textContent = 'Error: Could not load map configuration.';
    }
}

function addRealPois(pois = []) {
    if (!pois.length) {
        console.warn("No POIs loaded from the database.");
        return;
    }
    pois.forEach(poi => {
        const el = document.createElement('div');
        el.className = 'poi-marker';
        el.dataset.poiId = poi.id; // Use the actual ID from the DB

        const marker = new mapboxgl.Marker(el)
            .setLngLat([poi.longitude, poi.latitude])
            .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(poi.name))
            .addTo(state.map);
        
        state.pois.set(poi.id, marker);
    });
}

function addSamplePois() {
    const samplePois = [
        { id: 'poi-1', lng: -76.20956, lat: 40.683987, name: 'Safehouse (Sample)' },
        { id: 'poi-2', lng: -76.26391, lat: 40.70682, name: 'Culvert (Sample)' },
        { id: 'poi-3', lng: -76.3779, lat: 40.6262, name: 'Red Barn (Sample)' }
    ];

    samplePois.forEach(poi => {
        const el = document.createElement('div');
        el.className = 'poi-marker';
        el.dataset.poiId = poi.id;

        const marker = new mapboxgl.Marker(el)
            .setLngLat([poi.lng, poi.lat])
            .setPopup(new mapboxgl.Popup({ offset: 25 }).setText(poi.name))
            .addTo(state.map);
        
        state.pois.set(poi.id, marker);
    });
}


// --- App Startup ---
function main() {
    if (agentIdDisplay) {
        agentIdDisplay.textContent = `Agent ID: ${state.agentId}`;
    }
    initializeMap();
    connectWebSocket();
}

main();
