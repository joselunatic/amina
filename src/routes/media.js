const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const db = require('../../db');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');
const MAX_FILE_BYTES = (parseInt(process.env.MAX_UPLOAD_MB, 10) || 200) * 1024 * 1024;

const ALLOWED_MIMES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/mp3'
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIMES.has(file.mimetype)) return cb(null, true);
    cb(new Error(`Tipo de archivo no permitido: ${file.mimetype}`));
  }
});

function registerMediaRoutes(app, { requireDm }) {
  // List all assets
  app.get('/api/media', requireDm, async (_req, res, next) => {
    try {
      const assets = await db.listMediaAssets();
      res.json(assets);
    } catch (err) {
      next(err);
    }
  });

  // Upload new asset
  app.post('/api/media', requireDm, upload.single('file'), async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo.' });

      const asset = await db.createMediaAsset({
        filename: req.file.filename,
        original_name: req.file.originalname,
        mime_type: req.file.mimetype,
        size: req.file.size,
        description: req.body.description || null,
        url: `/uploads/${req.file.filename}`,
        created_by: req.session?.username || 'dm'
      });

      res.status(201).json(asset);
    } catch (err) {
      // Clean up partial upload on error
      if (req.file) {
        fs.unlink(req.file.path, () => {});
      }
      next(err);
    }
  });

  // Update description
  app.put('/api/media/:id', requireDm, async (req, res, next) => {
    try {
      const { description } = req.body;
      const asset = await db.updateMediaAsset(req.params.id, { description });
      if (!asset) return res.status(404).json({ error: 'Asset no encontrado.' });
      res.json(asset);
    } catch (err) {
      next(err);
    }
  });

  // Delete asset
  app.delete('/api/media/:id', requireDm, async (req, res, next) => {
    try {
      const asset = await db.deleteMediaAsset(req.params.id);
      if (!asset) return res.status(404).json({ error: 'Asset no encontrado.' });

      const filePath = path.join(UPLOADS_DIR, asset.filename);
      fs.unlink(filePath, (err) => {
        if (err) console.warn(`[media] No se pudo borrar archivo: ${filePath}`, err.message);
      });

      res.json({ ok: true });
    } catch (err) {
      next(err);
    }
  });
}

module.exports = { registerMediaRoutes };
