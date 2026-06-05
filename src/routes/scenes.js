const db = require('../../db');

function registerScenesRoutes(app, { requireDm }) {
  // List scenes
  app.get('/api/scenes', requireDm, async (_req, res, next) => {
    try {
      const scenes = await db.listScenes();
      res.json(scenes);
    } catch (err) {
      next(err);
    }
  });

  // Create scene
  app.post('/api/scenes', requireDm, async (req, res, next) => {
    try {
      const { name, description, default_target } = req.body;
      if (!name) return res.status(400).json({ error: 'name es obligatorio.' });
      const scene = await db.createScene({ name, description, default_target });
      res.status(201).json(scene);
    } catch (err) {
      next(err);
    }
  });

  // Get scene + beats
  app.get('/api/scenes/:id', requireDm, async (req, res, next) => {
    try {
      const scene = await db.getSceneWithBeats(req.params.id);
      if (!scene) return res.status(404).json({ error: 'Escena no encontrada.' });
      res.json(scene);
    } catch (err) {
      next(err);
    }
  });

  // Update scene
  app.put('/api/scenes/:id', requireDm, async (req, res, next) => {
    try {
      const { name, description, default_target } = req.body;
      if (!name) return res.status(400).json({ error: 'name es obligatorio.' });
      const scene = await db.updateScene(req.params.id, { name, description, default_target });
      if (!scene) return res.status(404).json({ error: 'Escena no encontrada.' });
      res.json(scene);
    } catch (err) {
      next(err);
    }
  });

  // Delete scene
  app.delete('/api/scenes/:id', requireDm, async (req, res, next) => {
    try {
      const ok = await db.deleteScene(req.params.id);
      if (!ok) return res.status(404).json({ error: 'Escena no encontrada.' });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  // List beats
  app.get('/api/scenes/:id/beats', requireDm, async (req, res, next) => {
    try {
      const scene = await db.getSceneById(req.params.id);
      if (!scene) return res.status(404).json({ error: 'Escena no encontrada.' });
      const beats = await db.getSceneBeats(req.params.id);
      res.json(beats);
    } catch (err) {
      next(err);
    }
  });

  // Reorder beats
  app.post('/api/scenes/:id/beats/reorder', requireDm, async (req, res, next) => {
    try {
      const { orderedIds } = req.body;
      if (!Array.isArray(orderedIds)) return res.status(400).json({ error: 'orderedIds debe ser un array.' });
      const beats = await db.reorderSceneBeats(req.params.id, orderedIds);
      res.json(beats);
    } catch (err) {
      next(err);
    }
  });

  // Create beat
  app.post('/api/scenes/:id/beats', requireDm, async (req, res, next) => {
    try {
      const scene = await db.getSceneById(req.params.id);
      if (!scene) return res.status(404).json({ error: 'Escena no encontrada.' });
      const { type, payload, delay_ms, duration_ms, target, label, order_index } = req.body;
      if (!type) return res.status(400).json({ error: 'type es obligatorio.' });
      const beat = await db.createSceneBeat(req.params.id, {
        type, payload, delay_ms, duration_ms, target, label, order_index
      });
      res.status(201).json(beat);
    } catch (err) {
      next(err);
    }
  });

  // Update beat
  app.put('/api/scenes/:id/beats/:beatId', requireDm, async (req, res, next) => {
    try {
      const existing = await db.getSceneBeatById(req.params.beatId);
      if (!existing || String(existing.scene_id) !== String(req.params.id)) {
        return res.status(404).json({ error: 'Beat no encontrado.' });
      }
      const { type, payload, delay_ms, duration_ms, target, label } = req.body;
      if (!type) return res.status(400).json({ error: 'type es obligatorio.' });
      const beat = await db.updateSceneBeat(req.params.beatId, {
        type, payload, delay_ms, duration_ms, target, label
      });
      res.json(beat);
    } catch (err) {
      next(err);
    }
  });

  // Delete beat
  app.delete('/api/scenes/:id/beats/:beatId', requireDm, async (req, res, next) => {
    try {
      const existing = await db.getSceneBeatById(req.params.beatId);
      if (!existing || String(existing.scene_id) !== String(req.params.id)) {
        return res.status(404).json({ error: 'Beat no encontrado.' });
      }
      const ok = await db.deleteSceneBeat(req.params.beatId);
      if (!ok) return res.status(404).json({ error: 'Beat no encontrado.' });
      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
}

module.exports = { registerScenesRoutes };
