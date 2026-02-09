function isDmSession(req) {
  return req.session && req.session.role === 'dm';
}

function isAgentSession(req) {
  return req.session && req.session.role === 'agent';
}

function getRole(req) {
  if (isDmSession(req)) return 'dm';
  if (isAgentSession(req)) return 'agent';
  return 'guest';
}

function requireDm(req, res, next) {
  if (!isDmSession(req)) {
    return res.status(401).json({ error: 'DM session is required.' });
  }
  return next();
}

function requireAgent(req, res, next) {
  if (!isAgentSession(req)) {
    return res.status(401).json({ error: 'Agent session is required.' });
  }
  return next();
}

function requireAny(req, res, next) {
  if (!isDmSession(req) && !isAgentSession(req)) {
    return res.status(401).json({ error: 'Session is required.' });
  }
  return next();
}

module.exports = {
  isDmSession,
  isAgentSession,
  getRole,
  requireDm,
  requireAgent,
  requireAny
};
