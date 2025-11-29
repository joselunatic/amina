// --- State & DOM ---
const state = {
    ws: null,
    agents: [],
};

const agentSelect = document.getElementById('agent-select');

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
    const message = {
        type: 'effect',
        effect,
        ...getTarget(),
        payload,
    };
    console.log("Sending effect:", message);
    state.ws.send(JSON.stringify(message));
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
        const poiId = document.getElementById('poi-id').value;
        sendEffect('POI_BLINK_ON', { poiId });
    });
    document.getElementById('effect-poi-blink-off').addEventListener('click', () => {
        const poiId = document.getElementById('poi-id').value;
        sendEffect('POI_BLINK_OFF', { poiId });
    });
    document.getElementById('effect-poi-highlight').addEventListener('click', () => {
        const poiId = document.getElementById('poi-id').value;
        sendEffect('POI_HIGHLIGHT', { poiId });
    });
    document.getElementById('effect-poi-lock').addEventListener('click', () => {
        const poiId = document.getElementById('poi-id').value;
        sendEffect('POI_LOCKED', { poiId });
    });
    document.getElementById('effect-poi-unlock').addEventListener('click', () => {
        const poiId = document.getElementById('poi-id').value;
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
        const poiId = document.getElementById('poi-id').value;
        if (!poiId) {
            alert("Por favor, introduce un ID de POI.");
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
}

// --- App Startup ---
function main() {
    connectWebSocket();
    bindEvents();
}

main();
