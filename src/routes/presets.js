const db = require('../../db');

function registerPresetsRoutes(app, { requireDm, dispatchEffect }) {
  // List presets, optional ?category= filter
  app.get('/api/presets', requireDm, async (req, res, next) => {
    try {
      const items = await db.listPresets(req.query.category || null);
      res.json(items);
    } catch (err) {
      next(err);
    }
  });

  // Create preset
  app.post('/api/presets', requireDm, async (req, res, next) => {
    try {
      const { name, category, effect_type, payload, target } = req.body;
      if (!name) return res.status(400).json({ error: 'name es obligatorio.' });
      if (!effect_type) return res.status(400).json({ error: 'effect_type es obligatorio.' });
      const preset = await db.createPreset({ name, category, effect_type, payload, target });
      res.status(201).json(preset);
    } catch (err) {
      next(err);
    }
  });

  // Update preset
  app.put('/api/presets/:id', requireDm, async (req, res, next) => {
    try {
      const { name, category, effect_type, payload, target } = req.body;
      if (!name || !effect_type) return res.status(400).json({ error: 'name y effect_type son obligatorios.' });
      const preset = await db.updatePreset(req.params.id, { name, category, effect_type, payload, target });
      if (!preset) return res.status(404).json({ error: 'Preset no encontrado.' });
      res.json(preset);
    } catch (err) {
      next(err);
    }
  });

  // Delete preset
  app.delete('/api/presets/:id', requireDm, async (req, res, next) => {
    try {
      const ok = await db.deletePreset(req.params.id);
      if (!ok) return res.status(404).json({ error: 'Preset no encontrado.' });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // Fire preset → dispatch effect immediately via WebSocket
  app.post('/api/presets/:id/fire', requireDm, async (req, res, next) => {
    try {
      const preset = await db.getPresetById(req.params.id);
      if (!preset) return res.status(404).json({ error: 'Preset no encontrado.' });

      let payload;
      try { payload = JSON.parse(preset.payload); } catch { payload = {}; }

      // Allow override of target from request body
      const target = req.body?.target || preset.target;

      dispatchEffect(preset.effect_type, payload, target);
      console.log(`[presets] fired "${preset.name}" (${preset.effect_type}) → ${target}`);

      res.json({ ok: true, effect: preset.effect_type, target });
    } catch (err) {
      next(err);
    }
  });
}

module.exports = { registerPresetsRoutes };
