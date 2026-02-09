const fs = require('fs');
const path = require('path');

function registerEventTickerRoutes(app, deps = {}) {
  const rootDir = deps.rootDir || path.join(__dirname, '..', '..');

  app.get('/api/event-ticker', (req, res) => {
    const jsonPath = path.join(rootDir, 'docs', 'eventTicker.json');
    fs.readFile(jsonPath, 'utf8', (err, data) => {
      if (err) {
        console.error('Failed to read ticker data', err);
        return res.status(500).json({ error: 'Unable to load ticker data.' });
      }
      try {
        const payload = JSON.parse(data);
        res.json(payload);
      } catch (parseErr) {
        console.error('Ticker JSON parse error', parseErr);
        res.status(500).json({ error: 'Ticker data corrupted.' });
      }
    });
  });
}

module.exports = {
  registerEventTickerRoutes
};
