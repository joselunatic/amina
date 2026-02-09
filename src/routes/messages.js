function registerMessageRoutes(app, deps) {
  const {
    listAuthUsersByRole,
    getMessages,
    listDmMessageIdentities,
    listAgentMessageIdentities,
    createMessage,
    markMessageRead,
    deleteMessageForViewer,
    getMessageById,
    listChatIdentities,
    getChatIdentityById,
    createChatIdentity,
    updateChatIdentity,
    deleteChatIdentity,
    listChatThreads,
    getChatThreadById,
    listChatMessages,
    resolveChatThread,
    createChatMessage,
    DM_ACTOR,
    requireAny,
    requireDm,
    requireAgent,
    isDmSession,
    isAgentSession,
    normalizeUsername,
    broadcastMessageEvent,
    broadcastChatMessage
  } = deps;

  app.get('/api/messages', async (req, res, next) => {
    try {
      const agentUsers = await listAuthUsersByRole('agent');
      const agentDisplays = agentUsers.map((a) => a.display);
      const role = isDmSession(req) ? 'dm' : isAgentSession(req) ? 'agent' : req.query.role;
      const filters = {
        recipient: req.query.recipient,
        session_tag: req.query.session_tag,
        since: req.query.since,
        limit: parseInt(req.query.limit, 10) || 40,
        offset: parseInt(req.query.offset, 10) || 0,
        q: req.query.q,
        box: req.query.box,
        unread_only: req.query.unread_only === 'true',
        viewer: req.query.viewer,
        agentDisplays,
        role,
        dmActor: DM_ACTOR
      };
      filters.enforceDmInbox =
        role === 'dm' && !req.query.recipient && (!req.query.box || req.query.box !== 'sent');
      const messages = await getMessages(filters);
      res.json(messages);
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/messages/identities', requireAny, async (req, res, next) => {
    try {
      if (isDmSession(req)) {
        const identities = await listDmMessageIdentities(DM_ACTOR);
        res.json({ identities });
        return;
      }
      const agentDisplay = req.session.agentDisplay || req.session.agentId || '';
      const identities = await listAgentMessageIdentities(DM_ACTOR, agentDisplay);
      res.json({ identities });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/chat/identities', requireAny, async (req, res, next) => {
    try {
      const identities = await listChatIdentities();
      res.json({ identities });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/chat/identities', requireDm, async (req, res, next) => {
    try {
      const name = (req.body && req.body.name) || '';
      if (!name.trim()) {
        return res.status(400).json({ error: 'Identity name is required.' });
      }
      const created = await createChatIdentity(name);
      if (!created) {
        return res.status(400).json({ error: 'Unable to create identity.' });
      }
      res.status(201).json(created);
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Identity already exists.' });
      }
      next(err);
    }
  });

  app.put('/api/chat/identities/:id', requireDm, async (req, res, next) => {
    try {
      const name = (req.body && req.body.name) || '';
      if (!name.trim()) {
        return res.status(400).json({ error: 'Identity name is required.' });
      }
      const updated = await updateChatIdentity(req.params.id, name);
      if (!updated) {
        return res.status(404).json({ error: 'Identity not found.' });
      }
      res.json(updated);
    } catch (err) {
      if (err.message && err.message.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Identity already exists.' });
      }
      next(err);
    }
  });

  app.delete('/api/chat/identities/:id', requireDm, async (req, res, next) => {
    try {
      const result = await deleteChatIdentity(req.params.id);
      if (!result.ok && result.reason === 'in_use') {
        return res.status(409).json({ error: 'Identity has active threads.' });
      }
      if (!result.ok) {
        return res.status(404).json({ error: 'Identity not found.' });
      }
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/chat/threads', requireAny, async (req, res, next) => {
    try {
      const role = isDmSession(req) ? 'dm' : 'agent';
      const agentUsername = role === 'agent' ? req.session.agentId : null;
      const threads = await listChatThreads({ role, agentUsername });
      res.json({ threads });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/chat/threads/:id/messages', requireAny, async (req, res, next) => {
    try {
      const threadId = Number(req.params.id);
      if (!threadId || Number.isNaN(threadId)) {
        return res.status(400).json({ error: 'Thread id is invalid.' });
      }
      const thread = await getChatThreadById(threadId);
      if (!thread) {
        return res.status(404).json({ error: 'Thread not found.' });
      }
      if (isAgentSession(req) && thread.agent_username !== req.session.agentId) {
        return res.status(403).json({ error: 'Forbidden.' });
      }
      const limit = parseInt(req.query.limit, 10) || 200;
      const offset = parseInt(req.query.offset, 10) || 0;
      const messages = await listChatMessages(threadId, { limit, offset });
      res.json({ thread, messages });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/chat/messages', requireAny, async (req, res, next) => {
    try {
      const body = String(req.body?.body || '').trim();
      if (!body) {
        return res.status(400).json({ error: 'Message body is required.' });
      }
      if (isDmSession(req)) {
        const threadId = req.body?.threadId ? Number(req.body.threadId) : null;
        const agentUsername = req.body?.agentUsername;
        const identityId = req.body?.identityId ? Number(req.body.identityId) : null;
        let thread = null;
        if (threadId) {
          thread = await getChatThreadById(threadId);
        } else if (agentUsername && identityId) {
          const identity = await getChatIdentityById(identityId);
          if (!identity) {
            return res.status(404).json({ error: 'Identity not found.' });
          }
          thread = await resolveChatThread(normalizeUsername(agentUsername), identityId);
        }
        if (!thread) {
          return res.status(404).json({ error: 'Thread not found.' });
        }
        const message = await createChatMessage({
          threadId: thread.id,
          senderRole: 'dm',
          senderLabel: thread.dm_identity_name,
          body
        });
        broadcastChatMessage({ thread, message });
        res.status(201).json({ thread, message });
        return;
      }

      const agentUsername = req.session.agentId;
      if (!agentUsername) {
        return res.status(403).json({ error: 'Agent session required.' });
      }
      const threadId = req.body?.threadId ? Number(req.body.threadId) : null;
      const identityId = req.body?.identityId ? Number(req.body.identityId) : null;
      let thread = null;
      if (threadId) {
        thread = await getChatThreadById(threadId);
        if (!thread || thread.agent_username !== agentUsername) {
          return res.status(403).json({ error: 'Forbidden.' });
        }
      } else if (identityId) {
        const identity = await getChatIdentityById(identityId);
        if (!identity) {
          return res.status(404).json({ error: 'Identity not found.' });
        }
        thread = await resolveChatThread(agentUsername, identityId);
      }
      if (!thread) {
        return res.status(404).json({ error: 'Thread not found.' });
      }
      const senderLabel = req.session.agentDisplay || req.session.agentId || 'Agente';
      const message = await createChatMessage({
        threadId: thread.id,
        senderRole: 'agent',
        senderLabel,
        body
      });
      broadcastChatMessage({ thread, message });
      res.status(201).json({ thread, message });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/messages', requireDm, async (req, res, next) => {
    try {
      const { sender, recipient, subject, body, session_tag, reply_to_id, thread_id, priority } = req.body || {};
      if (!sender || !recipient || !subject || !body) {
        return res.status(400).json({ error: 'All message fields are required.' });
      }
      const created = await createMessage({
        sender: sender.trim(),
        recipient: recipient.trim(),
        subject: subject.trim(),
        body: body.trim(),
        session_tag: session_tag || null,
        reply_to_id: reply_to_id ? Number(reply_to_id) : null,
        thread_id: thread_id ? Number(thread_id) : null,
        priority: priority || 'normal',
        created_by: DM_ACTOR
      });
      broadcastMessageEvent(created);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/messages/:id/read', async (req, res, next) => {
    try {
      const viewer = (req.body && req.body.viewer) || req.query.viewer;
      if (!viewer) {
        return res.status(400).json({ error: 'Viewer is required to mark a message as read.' });
      }
      const updated = await markMessageRead(req.params.id, viewer);
      if (!updated) {
        return res.status(404).json({ error: 'Message not found.' });
      }
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/messages/:id/delete', async (req, res, next) => {
    try {
      const viewer = (req.body && req.body.viewer) || req.query.viewer;
      const box = (req.body && req.body.box) || req.query.box || 'inbox';
      if (!viewer) {
        return res.status(400).json({ error: 'Viewer is required to delete a message.' });
      }
      const updated = await deleteMessageForViewer(req.params.id, viewer, box);
      if (!updated) {
        return res.status(404).json({ error: 'Message not found.' });
      }
      res.json({ status: 'ok' });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/messages/agent', requireAgent, async (req, res, next) => {
    try {
      const { recipient, subject, body, session_tag, reply_to_id, thread_id, priority } = req.body || {};
      if (!subject || !body) {
        return res.status(400).json({ error: 'Agent messages require subject and body.' });
      }
      const agentDisplay = req.session.agentDisplay || req.session.agentId || 'Agente de Campo';
      let resolvedRecipient = recipient ? String(recipient).trim() : '';
      const replyId = reply_to_id ? Number(reply_to_id) : null;
      if (replyId && Number.isNaN(replyId)) {
        return res.status(400).json({ error: 'Reply target is invalid.' });
      }
      if (replyId) {
        const parent = await getMessageById(replyId);
        if (!parent) {
          return res.status(404).json({ error: 'Reply target not found.' });
        }
        if (parent.created_by !== DM_ACTOR) {
          return res.status(403).json({ error: 'Agents can only reply to DM messages.' });
        }
        const allowedRecipients = new Set([
          agentDisplay,
          'All agents',
          'all agents',
          'Todos los agentes',
          'todos los agentes'
        ]);
        const parentRecipient = String(parent.recipient || '').trim();
        if (parentRecipient && !allowedRecipients.has(parentRecipient)) {
          return res.status(403).json({ error: 'Agents can only reply to their own messages.' });
        }
        resolvedRecipient = String(parent.sender || 'Sr. Verdad').trim();
      } else {
        if (!resolvedRecipient) {
          return res.status(400).json({ error: 'Recipient is required.' });
        }
        const identities = await listAgentMessageIdentities(DM_ACTOR, agentDisplay);
        const allowed = new Set(identities.map((name) => String(name).trim()));
        if (!allowed.has(resolvedRecipient)) {
          return res.status(403).json({ error: 'Recipient must be a known DM identity.' });
        }
      }
      const created = await createMessage({
        sender: agentDisplay.trim(),
        recipient: resolvedRecipient,
        subject: subject.trim(),
        body: body.trim(),
        session_tag: session_tag || null,
        reply_to_id: replyId,
        thread_id: thread_id ? Number(thread_id) : null,
        priority: priority || 'normal',
        created_by: agentDisplay.trim()
      });
      broadcastMessageEvent(created);
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  });
}

module.exports = {
  registerMessageRoutes
};
