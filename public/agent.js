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
    pois: new Map(), // To store POI markers
};

const agentIdDisplay = document.getElementById('agent-id-display');
const glitchOverlay = document.getElementById('glitch-overlay');
const vignetteOverlay = document.getElementById('vignette-overlay');
const noiseOverlay = document.getElementById('noise-overlay');

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
                if(effect === 'POI_BLINK_ON') poiMarkerEl.classList.add('blink');
                if(effect === 'POI_BLINK_OFF') poiMarkerEl.classList.remove('blink');
                if(effect === 'POI_HIGHLIGHT') poiMarkerEl.classList.toggle('highlight');
                if(effect === 'POI_LOCKED') {
                    poiMarkerEl.classList.add('locked');
                    poiMarkerEl.style.backgroundColor = '#888';
                }
                if(effect === 'POI_UNLOCKED') {
                    poiMarkerEl.classList.remove('locked');
                    poiMarkerEl.style.backgroundColor = '#00ff88';
                }
            }
            break;
        
        // Layer Effects
        case 'LAYER_TOGGLE':
            state.map.setLayoutProperty(payload.layerId, 'visibility', payload.visible ? 'visible' : 'none');
            break;
    }
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
        
        state.map.on('load', () => {
            // Add some sample POIs for demonstration
            addSamplePois();
        });

    } catch (e) {
        console.error("Failed to initialize map:", e);
        document.getElementById('map').textContent = 'Error: Could not load map configuration.';
    }
}

function addSamplePois() {
    const samplePois = [
        { id: 'poi-1', lng: -76.20956, lat: 40.683987, name: 'Safehouse' },
        { id: 'poi-2', lng: -76.26391, lat: 40.70682, name: 'Culvert' },
        { id: 'poi-3', lng: -76.3779, lat: 40.6262, name: 'Red Barn' }
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
