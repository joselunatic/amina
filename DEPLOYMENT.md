# AMINA — Guía de Despliegue en VPS

Complete guide for deploying AMINA to a production VPS (Linux: Ubuntu 20.04 LTS recommended).

---

## 1. Requisitos de Sistema

### VPS Specs (Mínimo)
- **OS**: Ubuntu 20.04 LTS o superior (Debian 11+)
- **CPU**: 2 cores (recomendado 4)
- **RAM**: 2 GB (recomendado 4)
- **Almacenamiento**: 20 GB SSD (incluye BD, uploads, logs)
- **Conexión**: 5+ Mbps (para streaming de video)

### Soft Dependencies
- **Node.js**: 18.0.0 o superior (recomendado 20 LTS)
- **npm**: 9.0.0 o superior
- **Mapbox Access Token**: token público `pk.*` para Mapbox GL JS
- **SSL Certificate**: Let's Encrypt (gratuito) o proveedor propio
- **Email** (opcional): SMTP para notificaciones de error

---

## 2. Preparación del VPS

### 2.1 SSH Access & Security

```bash
# SSH a tu VPS como root o sudo user
ssh root@your-vps-ip

# Actualizar paquetes del sistema
apt update && apt upgrade -y

# Instalar utilidades esenciales
apt install -y curl wget git build-essential unzip
```

### 2.2 Crear Usuario Dedicado (no root)

```bash
# Crear usuario 'amina' (sin login shell interactivo)
useradd -m -s /bin/bash amina

# Añadir a grupo sudo (opcional, para debug)
usermod -aG sudo amina

# Cambiar a usuario amina
su - amina
```

### 2.3 Instalar Node.js

```bash
# Usando NodeSource repository (recomendado)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar
node --version  # v20.x.x
npm --version   # 9.x.x
```

### 2.4 Instalar Nginx (Reverse Proxy)

```bash
sudo apt install -y nginx

# Habilitar al inicio
sudo systemctl enable nginx
sudo systemctl start nginx

# Verificar
sudo systemctl status nginx
```

---

## 3. Clonar & Configurar AMINA

### 3.1 Clonar Repositorio

```bash
cd /home/amina
git clone https://github.com/your-org/amina.git
cd amina

# Checkout rama principal (o feature si es necesario)
git checkout main
```

### 3.2 Instalar Dependencias

```bash
npm install --production

# Verificar que las dépendencias críticas están presentes
npm ls express ws mapbox-gl sqlite3 | head -10
```

### 3.3 Configurar `.env`

Crea `/home/amina/amina/.env`:

```bash
# Ambiente
NODE_ENV=production

# Puerto local (Nginx lo expone a 80/443 externamente)
PORT=3002

# Base de datos (se crea automáticamente en primera ejecución)
DB_PATH=./schuylkill.db

# Mapbox
MAPBOX_PUBLIC_TOKEN=pk.your_public_token_here
MAPBOX_STYLE_URL=mapbox://styles/joselun/cmi3ezivh00gi01s98tef234h

# Secreto DM (cambiar a algo fuerte)
DM_SECRET=your-secure-dm-secret-32-chars-min

# Session Secret (para cookies HttpOnly)
SESSION_SECRET=your-session-secret-32-chars-min

# Uploads (crear directorio antes)
UPLOAD_DIR=./uploads

# Logging
LOG_LEVEL=info
DEBUG=false

# HTTPS/Proxy headers (cuando esté detrás de Nginx)
TRUST_PROXY=1

# Email alerts (opcional)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# ADMIN_EMAIL=admin@yourdomain.com
```

⚠️ **Proteger `.env`**:
```bash
chmod 600 /home/amina/amina/.env
```

### 3.4 Crear Directorios de Datos

```bash
cd /home/amina/amina

# Uploads
mkdir -p uploads && chmod 755 uploads

# Logs
mkdir -p logs && chmod 755 logs

# DB (se crea en primera ejecución)
ls -la | grep schuylkill.db
```

### 3.5 Inicializar Base de Datos

```bash
# Primera ejecución: crea BD + seed
npm start &

# Dejar 5-10 segundos para que se cree la BD
sleep 10
kill %1

# Verificar que schuylkill.db existe
ls -lah schuylkill.db

# Verificar schema
sqlite3 schuylkill.db ".tables"
# Debería listar: analysis_queue, chat_threads, dm_presets, entities, media_assets, messages, pois, scene_beats, scenes
```

---

## 4. Setup de Nginx (Reverse Proxy + SSL)

### 4.1 Crear Config de Nginx

Crea `/etc/nginx/sites-available/amina`:

```nginx
# Redirigir HTTP → HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    
    location /.well-known/acme-challenge {
        root /var/www/letsencrypt;
    }
    
    location / {
        return 301 https://$server_name$request_uri;
    }
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;
    
    # SSL certificates (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    
    # SSL Security
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Logging
    access_log /var/log/nginx/amina_access.log;
    error_log /var/log/nginx/amina_error.log;
    
    # Cliente max upload (media)
    client_max_body_size 100M;
    
    # Proxy hacia Node.js local
    location / {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600;
    }
    
    # Servir static files directamente (cache)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:3002;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Uploads (cache corto)
    location /uploads/ {
        proxy_pass http://127.0.0.1:3002;
        expires 30d;
        add_header Cache-Control "public";
    }
}
```

### 4.2 Habilitar Config

```bash
# Verificar syntax
sudo nginx -t

# Habilitar site
sudo ln -s /etc/nginx/sites-available/amina /etc/nginx/sites-enabled/amina

# Recargar Nginx
sudo systemctl reload nginx
```

### 4.3 Obtener SSL con Let's Encrypt

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtener certificado (reemplaza your-domain.com)
sudo certbot certonly --webroot -w /var/www/letsencrypt -d your-domain.com -d www.your-domain.com

# Verificar
sudo ls -la /etc/letsencrypt/live/your-domain.com/

# Auto-renovación (Certbot lo configura automáticamente)
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

---

## 5. Process Manager (PM2)

Usa PM2 para mantener AMINA corriendo y auto-restart en caso de crash.

### 5.1 Instalar PM2

```bash
sudo npm install -g pm2

# Habilitar PM2 al boot
sudo pm2 startup systemd -u amina --hp /home/amina
sudo pm2 save
```

### 5.2 Configurar PM2

Crea `/home/amina/amina/ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'amina',
      script: './src/app.js',
      instances: 2,  // usar 2 workers (load balance)
      exec_mode: 'cluster',
      watch: false,  // no reload on file change en prod
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_file: './logs/pm2-combined.log'
    }
  ]
};
```

### 5.3 Lanzar con PM2

```bash
cd /home/amina/amina

# Iniciar
pm2 start ecosystem.config.js

# Verificar status
pm2 status

# Ver logs
pm2 logs amina

# Autostart al boot (ya configurado)
pm2 save
```

---

## 6. Backup Automatizado

### 6.1 Script de Backup Diario

Crea `/home/amina/backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/home/amina/backups"
DB_PATH="/home/amina/amina/schuylkill.db"
UPLOADS_DIR="/home/amina/amina/uploads"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_FILE="$BACKUP_DIR/amina_backup_$DATE.tar.gz"

# Crear directorio
mkdir -p "$BACKUP_DIR"

# Compactar BD + uploads
tar -czf "$BACKUP_FILE" "$DB_PATH" "$UPLOADS_DIR" 2>/dev/null

# Retener solo últimos 30 días
find "$BACKUP_DIR" -name "amina_backup_*.tar.gz" -mtime +30 -delete

# Log
echo "[$(date)] Backup completado: $BACKUP_FILE" >> "$BACKUP_DIR/backup.log"
```

### 6.2 Cron Job

```bash
# Editar crontab del usuario amina
crontab -e

# Agregar línea: backup diario a las 2 AM
0 2 * * * bash /home/amina/backup.sh

# Verificar
crontab -l
```

### 6.3 Transferir Backups a Storage Remoto (Opcional)

Usa rclone o rsync para sincronizar a S3, Backblaze B2, etc.

```bash
# Instalar rclone
curl https://rclone.org/install.sh | bash

# Configurar (rclone config)
rclone config

# Agregar a cron (post-backup)
30 2 * * * rclone sync /home/amina/backups remote:amina-backups
```

---

## 7. Monitoreo & Alertas

### 7.1 Health Check Endpoint

Añade a `src/app.js`:

```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});
```

### 7.2 Monitoring con PM2+

```bash
# PM2 Plus (servicios de monitoreo en la nube — opcional)
pm2 plus

# O, usar monitoring local simple: curl cron
# (cada 5 min, chequear http://localhost:3002/health)
```

### 7.3 Alertas por Email (Opcional)

Instala `node-cron` + `nodemailer`:

```bash
npm install node-cron nodemailer
```

En `src/monitoring.js`:

```javascript
const cron = require('node-cron');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// Chequear BD cada hora
cron.schedule('0 * * * *', async () => {
  const count = await db.all('SELECT COUNT(*) as cnt FROM pois');
  if (count[0].cnt === 0) {
    transporter.sendMail({
      to: process.env.ADMIN_EMAIL,
      subject: '[AMINA] Database corrupted?',
      text: 'POIs table is empty!'
    });
  }
});
```

---

## 8. Troubleshooting

### 8.1 Nginx no conecta a Node

```bash
# Verificar que Node escucha en 3002
netstat -tlnp | grep 3002

# Si no aparece, verificar logs de Node
pm2 logs amina | tail -50

# Verificar firewall
sudo ufw status
sudo ufw allow 3002/tcp
```

### 8.2 SSL Certificate Issues

```bash
# Renovar manualmente
sudo certbot renew --dry-run

# Verificar fecha de expiración
sudo certbot certificates
```

### 8.3 Uploads no Persisten

```bash
# Verificar permisos
ls -la /home/amina/amina/uploads/

# Debe ser propiedad de usuario amina
sudo chown -R amina:amina /home/amina/amina/uploads

# Permisos
chmod 755 /home/amina/amina/uploads
```

### 8.4 BD Corrupta

```bash
# Backup actual
cp schuylkill.db schuylkill.db.bak

# Re-inicializar (cuidado: pierde datos)
rm schuylkill.db
npm start  # crea BD nueva
# Ctrl+C después de 5-10 seg
```

### 8.5 Memoria Llena

```bash
# Chequear uso
du -sh /home/amina/amina/uploads/
du -sh /home/amina/backups/

# Limpiar uploads viejos
find /home/amina/amina/uploads -type f -mtime +90 -delete

# Limpiar backups viejos (ya lo hace el cron, pero manual)
find /home/amina/backups -name "*.tar.gz" -mtime +30 -delete
```

---

## 9. Optimización de Producción

### 9.1 Variables de Entorno

```bash
# En /home/amina/amina/.env, añadir:
NODE_ENV=production
DEBUG=false

# Compression
COMPRESSION=true

# Rate limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

### 9.2 PM2 Clustering

Ya configurado en `ecosystem.config.js` (2 workers). Ajustar según CPU:

```javascript
instances: 'max',  // usar todos los cores
```

### 9.3 Nginx Caching

Ya habilitado en config (static files, uploads).

### 9.4 DB Indexes

Crear índices en tablas frecuentes:

```sql
CREATE INDEX idx_pois_category ON pois(category);
CREATE INDEX idx_pois_session_tag ON pois(session_tag);
CREATE INDEX idx_entities_archived ON entities(archived);
CREATE INDEX idx_messages_timestamp ON messages(timestamp DESC);
```

Ejecutar:

```bash
cd /home/amina/amina
sqlite3 schuylkill.db < optimization.sql  # archivo con índices
```

---

## 10. Actualizaciones Futuras

### 10.1 Pull & Restart

```bash
cd /home/amina/amina
git pull origin main
npm install --production

# Restart con PM2
pm2 restart amina

# Verificar
pm2 logs amina
```

### 10.2 Cero Downtime (con múltiples procesos)

PM2 con 2+ workers permite reload sin downtime:

```bash
pm2 reload amina
```

---

## 11. Checklist de Despliegue Final

- [ ] VPS preparada (usuario amina, Node.js 20+)
- [ ] Repositorio clonado en `/home/amina/amina`
- [ ] `.env` configurado con secretos seguros
- [ ] BD inicializada (schuylkill.db existe, schema aplicado)
- [ ] Nginx configurado + SSL válido
- [ ] PM2 ejecutando (2+ workers)
- [ ] Health endpoint accesible: `https://your-domain.com/health`
- [ ] Uploads funcionan: test POST `/api/media`
- [ ] Backup cron habilitado
- [ ] Firewall abierto: 80, 443 (SSH 22 restringido)
- [ ] DNS apunta a VPS IP
- [ ] Email de alertas configurado (opcional)

---

## 12. URLs de Referencia

- **Production**: https://your-domain.com
- **DM Console**: https://your-domain.com/dm (requiere clearance)
- **Agent View**: https://your-domain.com/agent (requiere agente+password)
- **Projector**: https://your-domain.com/entropia (público)
- **Health**: https://your-domain.com/health

---

## Contacto & Soporte

Para issues post-despliegue, verificar:
1. `pm2 logs amina` (últimos 50 líneas)
2. `/var/log/nginx/amina_error.log`
3. `df -h` (espacio en disco)
4. `free -h` (memoria disponible)

**Nota**: Este es despliegue *light-duty* apto para campañas small-group. Para producción multi-tenant, considerar:
- DB externa (PostgreSQL)
- Redis cache
- CDN para assets
- Load balancer (AWS ELB, etc.)
