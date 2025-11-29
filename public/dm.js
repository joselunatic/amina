// --- State & DOM ---
const state = {
    ws: null,
    agents: [],
    pois: [],
    selectedMarkerType: 'default', // Default marker type
};

const agentSelect = document.getElementById('agent-select');
const poiSelect = document.getElementById('poi-select');
const aminaMarkerSelector = document.getElementById('amina-marker-selector');

// --- AMINA Marker Types Taxonomy ---
const AMINA_MARKER_TYPES = [
    {
        id: 'default',
        label: 'Neutro (Default)',
        description: 'Marcador genérico sin categoría específica.'
    },
    {
        id: 'incident-active',
        label: 'Incidente Activo',
        description: 'Ubicación de un incidente en curso o una alerta activa.'
    },
    {
        id: 'incident-closed',
        label: 'Incidente Cerrado',
        description: 'Lugar donde ocurrió un incidente ya resuelto o archivado.'
    },
    {
        id: 'anomaly',
        label: 'Anomalía (Red Vacía)',
        description: 'Presencia de actividad esoterrorista o fenómenos anómalos.'
    },
    {
        id: 'entity-person',
        label: 'Entidad (Persona)',
        description: 'PNJ relevante, sospechoso, testigo, etc.'
    },
    {
        id: 'entity-organization',
        label: 'Entidad (Organización)',
        description: 'Grupo, célula, culto, empresa tapadera, etc.'
    },
    {
        id: 'location-safehouse',
        label: 'Ubicación (Piso Franco)',
        description: 'Piso franco o refugio seguro de la AMINA.'
    },
    {
        id: 'location-hotspot',
        label: 'Ubicación (Punto Caliente)',
        description: 'Lugar hostil, peligroso o de interés crítico.'
    }
];


// --- WebSocket Communication ---
function connectWebSocket() {
    const wsUrl = `ws://${window.location.host}`;
    state.ws = new WebSocket(wsUrl);

    state.ws.onopen = () => {
        console.log("DM WebSocket connection established.");
        state.ws.send(JSON.stringify({ type: "hello", role: "dm" }));
    };

    state.ws.onmessage = (event) => {
        try {
            const message = JSON.parse(event.data);
            if (message.type === 'agents-list') {
                updateAgentList(message.agents);
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

// --- Data Fetching ---
async function loadPois() {
    try {
        const pois = await fetch('/api/pois').then(res => {
            if (!res.ok) throw new Error('Failed to fetch POIs');
            return res.json();
        });
        state.pois = pois;
        console.log('POIs loaded:', state.pois); // Debugging line
        // renderPoiSelector will be called from main after awaiting
    } catch (e) {
        console.error(e.message);
        // Maybe render an error in the dropdown
    }
}


// --- UI Logic ---
function updateAgentList(agents) {
    state.agents = agents;
    // Clear all but the first "All Agents" option
    while (agentSelect.options.length > 1) {
        agentSelect.remove(1);
    }
    agents.forEach(agent => {
        const option = document.createElement('option');
        option.value = agent.agentId;
        option.textContent = agent.agentId;
        agentSelect.appendChild(option);
    });
}

function renderPoiSelector() {
    if (!poiSelect) return;
    poiSelect.innerHTML = '';
    if (state.pois.length === 0) {
        const option = document.createElement('option');
        option.value = '';
        option.textContent = 'No POIs available';
        poiSelect.appendChild(option);
        return;
    }
    state.pois.forEach(poi => {
        const option = document.createElement('option');
        option.value = poi.id;
        option.textContent = poi.name; // Display name
        poiSelect.appendChild(option);
    });

    // Set default selected value
    if (state.pois.length > 0) {
        poiSelect.value = state.pois[0].id;
    }
}

function getTarget() {
    const selected = agentSelect.value;
    if (selected === 'all') {
        return { target: 'all' };
    }
    return { target: 'agent', agentId: selected };
}

function sendEffect(effect, payload = {}) {
    if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
        console.error("WebSocket is not connected.");
        return;
    }
    
    // Add markerType to POI effects payload
    if (effect.startsWith('POI_')) {
        payload.markerType = state.selectedMarkerType;
    }

    const message = {
        type: 'effect',
        effect,
        ...getTarget(),
        payload,
    };
    console.log("Sending effect:", message);
    state.ws.send(JSON.stringify(message));
}

// --- AMINA Marker Selector UI ---
function renderMarkerSelector() {
    if (!aminaMarkerSelector) return;

    aminaMarkerSelector.innerHTML = ''; // Clear previous buttons

    AMINA_MARKER_TYPES.forEach(markerType => {
        const button = document.createElement('button');
        button.dataset.markerTypeId = markerType.id;
        button.innerHTML = `
            <span class="label">${markerType.label}</span>
            <span class="description">${markerType.description}</span>
        `;
        if (markerType.id === state.selectedMarkerType) {
            button.classList.add('active');
        }
        button.addEventListener('click', () => handleMarkerTypeChange(markerType.id));
        aminaMarkerSelector.appendChild(button);
    });
}

function handleMarkerTypeChange(markerTypeId) {
    state.selectedMarkerType = markerTypeId;
    renderMarkerSelector(); // Re-render to update active state
}


// --- Event Listeners ---
function bindEvents() {
    // Visual Effects
    document.getElementById('effect-glitch').addEventListener('click', () => sendEffect('GLITCH'));
    document.getElementById('effect-noise').addEventListener('click', () => sendEffect('NOISE_PULSE'));
    document.getElementById('effect-vignette').addEventListener('click', () => {
        const level = document.getElementById('vignette-level').value;
        sendEffect('VIGNETTE_LEVEL', { level: parseInt(level, 10) });
    });

    // Camera Effects
    document.getElementById('effect-nudge').addEventListener('click', () => sendEffect('NUDGE_CAMERA'));
    document.getElementById('effect-focus').addEventListener('click', () => {
        const [lng, lat, zoom] = document.getElementById('focus-coords').value.split(',').map(Number);
        sendEffect('FOCUS_INCIDENT', { lng, lat, zoom });
    });
    document.getElementById('effect-sweep').addEventListener('click', () => {
        const [startStr, endStr] = document.getElementById('sweep-coords').value.split('|');
        const [startLng, startLat] = startStr.split(',').map(Number);
        const [endLng, endLat] = endStr.split(',').map(Number);
        sendEffect('SWEEP_AREA', { start: {lng: startLng, lat: startLat}, end: {lng: endLng, lat: endLat} });
    });

    // POI Effects
    document.getElementById('effect-poi-blink-on').addEventListener('click', () => {
        const poiId = document.getElementById('poi-select').value;
        sendEffect('POI_BLINK_ON', { poiId });
    });
    document.getElementById('effect-poi-blink-off').addEventListener('click', () => {
        const poiId = document.getElementById('poi-select').value;
        sendEffect('POI_BLINK_OFF', { poiId });
    });
    document.getElementById('effect-poi-highlight').addEventListener('click', () => {
        const poiId = document.getElementById('poi-select').value;
        sendEffect('POI_HIGHLIGHT', { poiId });
    });
    document.getElementById('effect-poi-lock').addEventListener('click', () => {
        const poiId = document.getElementById('poi-select').value;
        sendEffect('POI_LOCKED', { poiId });
    });
    document.getElementById('effect-poi-unlock').addEventListener('click', () => {
        const poiId = document.getElementById('poi-select').value;
        sendEffect('POI_UNLOCKED', { poiId });
    });
    
    // Layer Effects
    document.getElementById('effect-layer-on').addEventListener('click', () => {
        const layerId = document.getElementById('layer-id').value;
        sendEffect('LAYER_TOGGLE', { layerId, visible: true });
    });
    document.getElementById('effect-layer-off').addEventListener('click', () => {
        const layerId = document.getElementById('layer-id').value;
        sendEffect('LAYER_TOGGLE', { layerId, visible: false });
    });

    // Satellite Image Request
    document.getElementById('request-satellite-image').addEventListener('click', async () => {
        const poiId = document.getElementById('poi-select').value;
        if (!poiId) {
            alert("Por favor, selecciona un POI.");
            return;
        }
        const imagePanel = document.getElementById('image-analysis-panel');
        imagePanel.innerHTML = '<p>Solicitando imagen de satélite...</p>';

        try {
            const response = await fetch(`/api/dm/generate_static_map/${poiId}`);
            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || 'Fallo al generar la imagen.');
            }
            const data = await response.json();
            imagePanel.innerHTML = `<img src="${data.imageUrl}" alt="Imagen de Satélite para POI ${poiId}" />`;
        } catch (error) {
            imagePanel.innerHTML = `<p style="color: #ff0000;">Error: ${error.message}</p>`;
        }
    });

    // Ephemeral POI
    document.getElementById('create-ephemeral-poi').addEventListener('click', () => {
        const name = document.getElementById('ephemeral-poi-name').value;
        const coords = document.getElementById('ephemeral-poi-coords').value;
        if (!name || !coords) {
            alert("Por favor, introduce nombre y coordenadas para el POI efímero.");
            return;
        }

        const [lng, lat] = coords.split(',').map(Number);
        if (isNaN(lng) || isNaN(lat)) {
            alert("Coordenadas inválidas. Usa el formato 'lng,lat'.");
            return;
        }
        
        const ephemeralId = `ephemeral_${Date.now()}`;
        const payload = {
            poiId: ephemeralId,
            name,
            lng,
            lat,
            markerType: state.selectedMarkerType,
        };

        sendEffect('POI_EPHEMERAL_ADD', payload);
    });
}

// --- App Startup ---
async function main() {
    connectWebSocket();
    await loadPois(); // Await POI loading before rendering selector
    renderPoiSelector();
    renderMarkerSelector(); // Render the selector on startup
    bindEvents();
}

main();

