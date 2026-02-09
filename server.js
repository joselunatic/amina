require('dotenv').config();
const http = require('http');
const { WebSocketServer } = require('ws');
const { app, setRealtimeHooks, normalizeUsername, DEBUG_MODE } = require('./src/app');

const DEFAULT_PORT = 3002;
const PORT = parseInt(process.env.PORT, 10) || DEFAULT_PORT;
const HOST = process.env.HOST || '127.0.0.1';

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

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

setRealtimeHooks({
  broadcastMessageEvent,
  broadcastChatMessage
});

wss.on('connection', (ws) => {
  if (DEBUG_MODE) {
    console.log('[DEBUG] WebSocket client connected');
  }

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'hello') {
        if (data.role === 'dm') {
          dmClients.add(ws);
          console.log('DM client connected');
          broadcastAgentList();
        } else if (data.role === 'agent' && data.agentId) {
          agentClients.set(ws, { agentId: data.agentId });
          console.log(`Agent client connected: ${data.agentId}`);
          broadcastAgentList();
        } else if (data.role === 'console') {
          messageClients.add(ws);
        } else if (data.role === 'chat') {
          const mode = data.mode === 'dm' ? 'dm' : 'agent';
          const agentUsername = data.agentUsername ? normalizeUsername(data.agentUsername) : null;
          chatClients.set(ws, { role: mode, agentUsername });
        }
      } else if (data.type === 'effect') {
        if (!dmClients.has(ws)) {
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
    if (dmClients.has(ws)) {
      dmClients.delete(ws);
      console.log('DM client disconnected');
    } else if (agentClients.has(ws)) {
      agentClients.delete(ws);
      console.log('Agent client disconnected');
      broadcastAgentList();
    }
    if (messageClients.has(ws)) {
      messageClients.delete(ws);
    }
    if (chatClients.has(ws)) {
      chatClients.delete(ws);
    }
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
