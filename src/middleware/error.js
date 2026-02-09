function errorHandler(err, req, res, next) {
  console.error(err);
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Invalid JSON payload.' });
  }
  const status = Number.isInteger(err?.status) ? err.status : 500;
  const safeStatus = status >= 400 && status <= 599 ? status : 500;
  return res.status(safeStatus).json({ error: err?.message || 'Internal Server Error' });
}

module.exports = {
  errorHandler
};
