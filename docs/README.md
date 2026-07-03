# AMINA — Documentación

Guías técnicas y operacionales para trabajar con AMINA.

## Para comenzar

**Desarrolladores nuevos**: Start here.

1. **[../README.md](../README.md)** — Overview, setup, features (5 min read)
2. **[IMPLEMENTATION_GUIDE.md](../IMPLEMENTATION_GUIDE.md)** — Implementar tu primer feature (30 min)
3. **[../ARCHITECTURE.md](../ARCHITECTURE.md)** — Cómo funciona internamente (45 min)

## Operaciones

**SRE / DevOps**: Deploy & monitor.

- **[DEPLOYMENT.md](../DEPLOYMENT.md)** — Desplegar a VPS (AWS, DigitalOcean, Linode, etc.)
  - Sistema requirements
  - Node.js + Nginx + SSL (Let's Encrypt)
  - PM2 clustering (auto-restart)
  - Backup strategy
  - Health checks & alertas

## Reference

**Para búsquedas rápidas**.

- **[../CHANGELOG.md](../CHANGELOG.md)** — Qué cambió en cada sprint
- **[../ARCHITECTURE.md](../ARCHITECTURE.md)** — API Reference, WebSocket payloads, security notes
- **[../README.md](../README.md)** — Efectos disponibles, endpoints, autenticación

## Contribución

**Nuevo en el equipo?**

Leer en orden:

1. README (features + setup local)
2. IMPLEMENTATION_GUIDE (antes de escribir código)
3. ARCHITECTURE (para entender qué ya existe)
4. CHANGELOG (para contexto histórico)

**Implementar un feature nuevo**: IMPLEMENTATION_GUIDE tiene paso-a-paso.

**Desplegar a prod**: DEPLOYMENT tiene todo el workflow.

---

## Preguntas Frecuentes

### "¿Dónde defino un efecto nuevo?"

→ IMPLEMENTATION_GUIDE § "Paso 1: Backend Design"

### "¿Cómo se autentica DM?"

→ ARCHITECTURE § "Autenticación" + README § "Sr. Verdad Access"

### "¿Qué datos NO debo enviar a la proyección?"

→ ARCHITECTURE § "Notas de seguridad", línea: dm_notes, unlock_code

### "¿Cómo despliego a VPS?"

→ DEPLOYMENT, sección 1-6

### "¿Cómo renderiza un efecto?"

→ ARCHITECTURE § "Ciclo de vida de un efecto"

### "¿Dónde están las 71 entidades?"

→ README § "API Overview" + ARCHITECTURE § "API Reference"

---

## Estructura de docs

```
docs/
├── README.md          ← Este archivo (navigation)
├── playwright-troubleshooting.md  ← E2E test issues
└── (otros archivos específicos de debugging)

Raíz proyecto:
├── README.md          ← Features, setup, usage (user-facing)
├── ARCHITECTURE.md    ← Design técnico (developer-facing)
├── CHANGELOG.md       ← Historia de cambios
├── DEPLOYMENT.md      ← VPS setup (operator-facing)
├── IMPLEMENTATION_GUIDE.md  ← Guía de contribución (contributor-facing)
└── (código fuente)
```

---

## Estado Actual

**Última actualización**: 2026-07-03

- ✓ Backend: Express + SQLite + WebSocket
- ✓ Frontend: 3 vistas (DM, Agent, Entropia)
- ✓ Effects: 8+ overlays + utilities
- ✓ Entity System: 71 pre-loaded + dossier projection
- ✓ Design Tokens: Unified palette (5 voices)
- ✓ Documentación: Completa (README, ARCHITECTURE, DEPLOYMENT, GUIDE)

**Next**:
- [ ] Agente-specific private effects
- [ ] Effect history audit log
- [ ] Ticker controlable vía DM

---

## Links Rápidos

| Documento | Para | Tiempo |
|-----------|------|--------|
| README.md | "¿Qué hace AMINA?" | 5 min |
| ARCHITECTURE.md | "¿Cómo funciona?" | 45 min |
| IMPLEMENTATION_GUIDE.md | "¿Cómo agrego features?" | 60 min |
| DEPLOYMENT.md | "¿Cómo lo despliego?" | 90 min |
| CHANGELOG.md | "¿Qué cambió?" | 10 min |

---

## Contacto / Preguntas

Check ARCHITECTURE.md § "Ciclo de vida de un efecto" o IMPLEMENTATION_GUIDE.md § "Troubleshooting" para respuestas rápidas.

¡Bienvenido al proyecto! 🚀
