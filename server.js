require('dotenv').config();
const http = require('http');
const { WebSocketServer } = require('ws');
const {
  app,
  sessionMiddleware,
  setRealtimeHooks,
  normalizeUsername,
  DEBUG_MODE
} = require('./src/app');

const DEFAULT_PORT = 3002;
const PORT = parseInt(process.env.PORT, 10) || DEFAULT_PORT;
const HOST = process.env.HOST || '127.0.0.1';

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

const dmClients = new Set();
const agentClients = new Map();
const messageClients = new Set();
const chatClients = new Map();

function broadcastMessageEvent(message) {
  if (!message) return;
  const payload = JSON.stringify({
    type: 'message',
    message: {
      id: message.id,
      sender: message.sender,
      recipient: message.recipient,
      created_by: message.created_by,
      reply_to_id: message.reply_to_id,
      thread_id: message.thread_id,
      priority: message.priority,
      created_at: message.created_at
    }
  });
  for (const client of messageClients) {
    if (client.readyState === 1) {
      client.send(payload);
    }
  }
}

function broadcastAgentList() {
  const agents = Array.from(agentClients.values());
  const message = JSON.stringify({
    type: 'agents-list',
    agents
  });
  for (const client of dmClients) {
    client.send(message);
  }
}

function broadcastChatMessage({ thread, message }) {
  if (!thread || !message) return;
  const payload = JSON.stringify({
    type: 'chat',
    event: 'message',
    threadId: thread.id,
    thread,
    message
  });
  for (const [client, meta] of chatClients.entries()) {
    if (client.readyState !== 1) continue;
    if (meta.role === 'dm') {
      client.send(payload);
      continue;
    }
    if (meta.role === 'agent' && meta.agentUsername === thread.agent_username) {
      client.send(payload);
    }
  }
}

function createSessionResponseShim() {
  const headers = new Map();
  return {
    getHeader(name) {
      return headers.get(String(name).toLowerCase());
    },
    setHeader(name, value) {
      headers.set(String(name).toLowerCase(), value);
    },
    removeHeader(name) {
      headers.delete(String(name).toLowerCase());
    },
    writeHead() {},
    end() {},
    on() {},
    once() {},
    emit() {}
  };
}

function parseUpgradeSession(request) {
  return new Promise((resolve, reject) => {
    sessionMiddleware(request, createSessionResponseShim(), (err) => {
      if (err) return reject(err);
      return resolve(request.session || null);
    });
  });
}

function refreshSocketSession(request) {
  return new Promise((resolve, reject) => {
    if (!request.session || typeof request.session.reload !== 'function') {
      return resolve(null);
    }
    request.session.reload((err) => {
      if (err) {
        if (DEBUG_MODE) {
          console.warn('[DEBUG] WebSocket session reload failed:', err.message);
        }
        request.session = null;
        return resolve(null);
      }
      return resolve(request.session || null);
    });
  });
}

function getSocketAuthMeta(sessionState) {
  if (!sessionState || !sessionState.role) {
    return { role: 'guest', agentId: null, agentUsername: null };
  }
  if (sessionState.role === 'dm') {
    return { role: 'dm', agentId: null, agentUsername: null };
  }
  if (sessionState.role === 'agent' && sessionState.agentId) {
    const agentUsername = normalizeUsername(sessionState.agentId);
    return {
      role: 'agent',
      agentId: agentUsername,
      agentUsername
    };
  }
  return { role: 'guest', agentId: null, agentUsername: null };
}

function sendSocketError(ws, error) {
  if (ws.readyState === 1) {
    ws.send(JSON.stringify({ type: 'error', error }));
  }
}

function registerDmClient(ws) {
  dmClients.add(ws);
  console.log('DM client connected');
  broadcastAgentList();
}

function registerAgentClient(ws, agentId) {
  agentClients.set(ws, { agentId });
  console.log(`Agent client connected: ${agentId}`);
  broadcastAgentList();
}

function unregisterSocket(ws) {
  let shouldBroadcastAgents = false;
  if (dmClients.has(ws)) {
    dmClients.delete(ws);
    console.log('DM client disconnected');
  }
  if (agentClients.has(ws)) {
    agentClients.delete(ws);
    console.log('Agent client disconnected');
    shouldBroadcastAgents = true;
  }
  if (messageClients.has(ws)) {
    messageClients.delete(ws);
  }
  if (chatClients.has(ws)) {
    chatClients.delete(ws);
  }
  if (shouldBroadcastAgents) {
    broadcastAgentList();
  }
}

async function registerSocketFromSession(ws, request, data) {
  const sessionState = await refreshSocketSession(request);
  const auth = getSocketAuthMeta(sessionState);

  if (data.role === 'dm') {
    if (auth.role !== 'dm') {
      sendSocketError(ws, 'DM session is required for DM realtime.');
      return;
    }
    unregisterSocket(ws);
    registerDmClient(ws);
    return;
  }

  if (data.role === 'agent') {
    if (auth.role !== 'agent' || !auth.agentId) {
      sendSocketError(ws, 'Agent session is required for agent realtime.');
      return;
    }
    unregisterSocket(ws);
    registerAgentClient(ws, auth.agentId);
    return;
  }

  if (data.role === 'console') {
    if (auth.role === 'guest') {
      sendSocketError(ws, 'Session is required for message realtime.');
      return;
    }
    unregisterSocket(ws);
    messageClients.add(ws);
    return;
  }

  if (data.role === 'chat') {
    if (auth.role === 'guest') {
      sendSocketError(ws, 'Session is required for chat realtime.');
      return;
    }
    unregisterSocket(ws);
    chatClients.set(ws, {
      role: auth.role,
      agentUsername: auth.role === 'agent' ? auth.agentUsername : null
    });
    return;
  }

  sendSocketError(ws, 'Unknown realtime registration role.');
}

setRealtimeHooks({
  broadcastMessageEvent,
  broadcastChatMessage
});

wss.on('connection', (ws, request) => {
  if (DEBUG_MODE) {
    console.log('[DEBUG] WebSocket client connected');
  }

  ws.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'hello') {
        await registerSocketFromSession(ws, request, data);
      } else if (data.type === 'effect') {
        const sessionState = await refreshSocketSession(request);
        const auth = getSocketAuthMeta(sessionState);
        if (!dmClients.has(ws)) {
          return;
        }
        if (auth.role !== 'dm') {
          unregisterSocket(ws);
          sendSocketError(ws, 'DM session is required for DM realtime.');
          return;
        }
        const { effect, target, agentId, payload } = data;
        const effectMessage = JSON.stringify({ type: 'effect', effect, payload });

        if (target === 'all') {
          for (const clientWs of agentClients.keys()) {
            clientWs.send(effectMessage);
          }
        } else if (target === 'agent' && agentId) {
          for (const [clientWs, clientData] of agentClients.entries()) {
            if (clientData.agentId === agentId) {
              clientWs.send(effectMessage);
              break;
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to parse WebSocket message', e);
    }
  });

  ws.on('close', () => {
    if (DEBUG_MODE) {
      console.log('[DEBUG] WebSocket client disconnected');
    }
    unregisterSocket(ws);
  });
});

server.on('upgrade', async (request, socket, head) => {
  try {
    await parseUpgradeSession(request);
  } catch (err) {
    console.error('Failed to parse WebSocket session', err);
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});

function startServer(host) {
  server.listen(PORT, host, () => {
    console.log(`Server listening on http://${host}:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'ENOTFOUND' || err.code === 'EADDRNOTAVAIL') {
      const fallbackHost =
        host === 'host.docker.internal'
          ? process.env.DOCKER_BRIDGE_HOST || '172.17.0.1'
          : '127.0.0.1';
      console.warn(`Host ${host} not resolvable. Falling back to ${fallbackHost}.`);
      server.listen(PORT, fallbackHost, () => {
        console.log(`Server listening on http://${fallbackHost}:${PORT}`);
      });
    } else {
      throw err;
    }
  });
}

startServer(HOST);
