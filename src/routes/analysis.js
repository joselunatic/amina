const db = require('../../db');

function registerAnalysisRoutes(app, { requireDm, dispatchEffect }) {
  // List all analysis items
  app.get('/api/analysis', requireDm, async (_req, res, next) => {
    try {
      const items = await db.listAnalysisItems();
      res.json(items);
    } catch (err) {
      next(err);
    }
  });

  // Create analysis item (starts as 'pending')
  app.post('/api/analysis', requireDm, async (req, res, next) => {
    try {
      const { label, description, result_effect, result_payload, result_target } = req.body;
      if (!label) return res.status(400).json({ error: 'label es obligatorio.' });
      const item = await db.createAnalysisItem({
        label,
        description,
        result_effect: result_effect || null,
        result_payload: result_payload || {},
        result_target: result_target || 'all'
      });
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  });

  // Delete analysis item
  app.delete('/api/analysis/:id', requireDm, async (req, res, next) => {
    try {
      const ok = await db.deleteAnalysisItem(req.params.id);
      if (!ok) return res.status(404).json({ error: 'Item no encontrado.' });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // Complete analysis: fire result effect and mark as complete
  app.post('/api/analysis/:id/complete', requireDm, async (req, res, next) => {
    try {
      const item = await db.getAnalysisItemById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Item no encontrado.' });
      if (item.status === 'complete') {
        return res.status(400).json({ error: 'Este análisis ya fue completado.' });
      }

      // Determine what to fire: override from request body, or stored result
      const effect = req.body?.effect || item.result_effect;
      let payload;
      try {
        payload = req.body?.payload || JSON.parse(item.result_payload);
      } catch {
        payload = {};
      }
      const target = req.body?.target || item.result_target;

      if (effect) {
        dispatchEffect(effect, payload, target);
        console.log(`[analysis] completed "${item.label}" → ${effect} to ${target}`);
      }

      const updated = await db.updateAnalysisStatus(item.id, 'complete');
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });

  // Reopen completed analysis back to pending (useful for reuse)
  app.post('/api/analysis/:id/reset', requireDm, async (req, res, next) => {
    try {
      const item = await db.getAnalysisItemById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Item no encontrado.' });
      const updated = await db.updateAnalysisStatus(item.id, 'pending');
      res.json(updated);
    } catch (err) {
      next(err);
    }
  });
}

module.exports = { registerAnalysisRoutes };
