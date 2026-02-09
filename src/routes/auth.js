function registerAuthRoutes(app, deps) {
  const {
    getAuthUser,
    listAuthUsersByRole,
    updateAuthPassword,
    hashPassword,
    verifyPassword,
    DM_SECRET,
    normalizeUsername,
    validateNewPassword,
    isDmSession,
    isAgentSession
  } = deps;

  app.post('/api/auth/dm', async (req, res, next) => {
    try {
      const password = (req.body && req.body.password) || req.header('x-dm-secret');
      if (!password) {
        return res.status(400).json({ error: 'Password is required.' });
      }
      const hasBackdoor = DM_SECRET && password === DM_SECRET;
      if (!hasBackdoor) {
        const dmUser = await getAuthUser('dm', 'dm');
        if (!dmUser || !dmUser.password_hash) {
          return res.status(409).json({ error: 'DM password is not configured.' });
        }
        if (!verifyPassword(password, dmUser.password_hash, dmUser.password_salt)) {
          return res.status(401).json({ error: 'Invalid credentials.' });
        }
      }
      req.session.role = 'dm';
      req.session.agentId = null;
      req.session.agentDisplay = null;
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/auth/agents', async (req, res, next) => {
    try {
      const agents = await listAuthUsersByRole('agent');
      res.json(
        agents.map((agent) => ({
          username: agent.username,
          display: agent.display,
          configured: !!agent.password_hash
        }))
      );
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/auth/bootstrap', async (req, res, next) => {
    try {
      const dmUser = await getAuthUser('dm', 'dm');
      const agents = await listAuthUsersByRole('agent');
      res.json({
        dmConfigured: !!(dmUser && dmUser.password_hash),
        agents: agents.map((agent) => ({
          username: agent.username,
          display: agent.display,
          configured: !!agent.password_hash
        }))
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/agent', async (req, res, next) => {
    try {
      const { username, password } = req.body || {};
      const normalized = normalizeUsername(username);
      if (!normalized || !password) {
        return res.status(400).json({ error: 'Username and password are required.' });
      }
      const user = await getAuthUser('agent', normalized);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }
      if (!user.password_hash) {
        return res.status(409).json({ error: 'Agent password is not configured.' });
      }
      if (!verifyPassword(password, user.password_hash, user.password_salt)) {
        return res.status(401).json({ error: 'Invalid credentials.' });
      }
      req.session.role = 'agent';
      req.session.agentId = user.username;
      req.session.agentDisplay = user.display;
      res.json({ username: user.username, display: user.display });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/dm/password', async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body || {};
      validateNewPassword(newPassword);
      const dmUser = await getAuthUser('dm', 'dm');
      if (!dmUser) {
        return res.status(404).json({ error: 'DM user not found.' });
      }
      if (dmUser.password_hash) {
        if (!currentPassword) {
          return res.status(401).json({ error: 'Current password is required.' });
        }
        if (!verifyPassword(currentPassword, dmUser.password_hash, dmUser.password_salt)) {
          return res.status(401).json({ error: 'Invalid current password.' });
        }
      }
      const creds = hashPassword(newPassword);
      await updateAuthPassword({
        role: 'dm',
        username: 'dm',
        password_hash: creds.hash,
        password_salt: creds.salt
      });
      res.json({ status: 'ok' });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/auth/agent/password', async (req, res, next) => {
    try {
      const { username, currentPassword, newPassword } = req.body || {};
      const normalized = normalizeUsername(username);
      if (!normalized) {
        return res.status(400).json({ error: 'Username is required.' });
      }
      validateNewPassword(newPassword);
      const user = await getAuthUser('agent', normalized);
      if (!user) {
        return res.status(404).json({ error: 'Agent not found.' });
      }
      if (user.password_hash) {
        if (!currentPassword) {
          return res.status(401).json({ error: 'Current password is required.' });
        }
        if (!verifyPassword(currentPassword, user.password_hash, user.password_salt)) {
          return res.status(401).json({ error: 'Invalid current password.' });
        }
      }
      const creds = hashPassword(newPassword);
      await updateAuthPassword({
        role: 'agent',
        username: normalized,
        password_hash: creds.hash,
        password_salt: creds.salt
      });
      res.json({ status: 'ok' });
    } catch (err) {
      next(err);
    }
  });

  app.get('/api/auth/me', (req, res) => {
    if (isDmSession(req)) {
      return res.json({ role: 'dm' });
    }
    if (isAgentSession(req)) {
      return res.json({
        role: 'agent',
        agentId: req.session.agentId || null,
        agentDisplay: req.session.agentDisplay || null
      });
    }
    return res.json({ role: 'guest' });
  });

  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {
      res.clearCookie('amina.sid');
      res.status(204).send();
    });
  });
}

module.exports = {
  registerAuthRoutes
};
