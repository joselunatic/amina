# Android UX Audit - Phase 1

Fecha: 2026-04-09

## Objetivo

Documentar los hallazgos, decisiones y recomendaciones de la primera fase de optimizacion UX/UI para movil Android en AMINA, con foco en las tabs prioritarias para jugadores:

- Mapa
- Consola
- Dossier

Tabs de prioridad secundaria en esta fase:

- Ficha
- Entropia

## Contexto del producto

AMINA parte de una experiencia desktop-first, muy inmersiva y visual, adaptada despues a movil. La webapp tiene una identidad fuerte, pero en movil cargaba demasiada complejidad estructural y visual al mismo tiempo.

Para jugadores en Android, la app debe comportarse menos como "consola de control total" y mas como interfaz tactica de consulta y accion rapida.

## Diagnostico general del repo

### Fortalezas

- Identidad visual clara y diferenciada.
- Funcionalidad amplia y util para partida: mapa, mensajeria, dossiers, journal, estados.
- Ya existia navegacion movil y variante PWA/Capacitor.
- Backend simple y mantenible para iterar rapido.

### Debilidades detectadas

- Payload inicial excesivo para movil.
- Carga eager de Entropia/3D en el arranque.
- Precache offline demasiado pesado.
- Muchas capas decorativas costosas en pintura y composicion.
- Jerarquia movil heredada del desktop, con demasiada altura consumida por paneles secundarios.
- Un unico archivo frontend muy grande que mezcla logica de multiples vistas.

### Riesgos en Android

- Jank visual en dispositivos medios.
- Consumo de bateria innecesario.
- Ruido visual por encima de la claridad operativa.
- Fatiga de scroll en tabs de uso frecuente.

## Cambios implementados en Phase 1

### Rendimiento

- Entropia/3D pasa a carga diferida. Ya no se importa en el arranque principal.
- El service worker reduce el precache inicial a un app shell mucho mas pequeño.
- El precache aproximado bajo de ~7.29 MB a ~0.91 MB.

Archivos tocados:

- `public/app.v2.js`
- `public/service-worker.js`

### Navegacion movil

- Al cambiar de tab movil, la vista hace reset de scroll al inicio.
- Esto corrige el problema de tabs que reaparecian "a mitad de pantalla" por scroll residual.

Archivo tocado:

- `public/app.v2.js`

### Ajustes visuales y de layout movil

- Menos overlays CRT y menos animaciones persistentes en movil.
- Compactacion de stacks verticales para movil.
- Ajustes de altura del mapa y listas.
- Mejor control de `min-height` y contenedores activos en tabs moviles.

Archivo tocado:

- `public/styles.css`

### Infraestructura de QA

- Corregido `tests/e2e-server.mjs` para Windows usando `fileURLToPath(import.meta.url)`.
- La suite de layout movil vuelve a ejecutarse sin workaround manual.

Archivo tocado:

- `tests/e2e-server.mjs`

## Verificacion ejecutada

### Playwright

Se validaron iteraciones moviles con emulacion de navegador movil y con la suite existente:

- `npx playwright test tests/mobile-layout.spec.ts --reporter=line`

Resultado tras los cambios:

- 6 tests pasados

Tambien se hicieron auditorias visuales ad hoc con emulacion movil para detectar:

- offsets negativos en `workspace`
- scroll residual entre tabs
- exceso de altura en `console`, `database` y `base`

## Priorizacion UX movil para jugadores

Orden acordado de prioridad:

1. Mapa
2. Consola
3. Dossier

Tabs no prioritarias en esta fase:

- Ficha
- Entropia

## Principios de diseno para Android

- Una tarea principal por pantalla.
- Un CTA principal por estado.
- Menos scroll en tabs de accion frecuente.
- Thumb-first: acciones clave en zona inferior o facilmente alcanzable.
- El contenido secundario debe estar plegado, resumido o diferido.
- Menos atmosfera persistente cuando compite con legibilidad u operativa.

## Analisis por tabs prioritarias

## 1. Mapa

### Funcion

Vista de orientacion tactica. Debe responder rapido a:

- donde esta lo importante
- que PdI merece atencion
- que accion narrativa hay que tomar

### Valor real en Android

Es la tab principal del jugador.

### Fricciones detectadas

- El mapa comparte demasiada altura con bloques secundarios.
- La tarjeta focal aun consume demasiado espacio para una tarea de confirmacion rapida.
- El bloque de actividad compite con el contexto espacial.
- Demasiado peso estetico persistente para una vista que deberia sentirse instrumental.
- Sin token de Mapbox valido, la degradacion de valor es brusca.

### Recomendaciones

- Mantener `Mapa` como home operativa.
- Priorizar `mapa + tarjeta focal compacta + nav inferior`.
- Convertir `Registro de actividad` en panel colapsado o resumen minimo.
- Reducir texto secundario en la tarjeta focal.
- Añadir CTA claro desde la tarjeta focal a `Dossier`.
- Tratar `Mapa` como lanzador contextual, no como pantalla explicativa.

### Estado tras cambios

- Mejor estabilidad de layout.
- Menos coste visual persistente.
- Aun queda margen para simplificar la tarjeta focal y plegar actividad.

## 2. Consola

### Funcion

Mensajeria activa y archivo de sesiones/campaña.

### Valor real en Android

Muy alta. Debe ser la segunda tab mas importante para jugador.

### Fricciones detectadas

- Mezcla varias capas en la misma pantalla: lista de hilos, transcript, input y archivo de sesiones.
- Antes de los ajustes habia demasiada altura vertical y la vista podia arrancar fuera de foco.
- El transcript y la lista de hilos competian por espacio.
- El archivo de sesiones compartia demasiado protagonismo con la mensajeria.

### Recomendaciones

- Tratar `Consola` como inbox/chat principal.
- Mantener una jerarquia clara:
  - identidad y acceso a hilo
  - transcript
  - input
  - archivo de sesiones compacto o plegable
- El archivo de sesiones debe ser claramente secundario.
- Los hilos deben ser muy tactiles y rapidos de recorrer.
- La vista debe priorizar leer y responder antes que consultar bloques auxiliares.

### Cambios ya aplicados

- Lista de hilos adaptada a patron mas compacto en movil.
- Targets tactiles mas generosos.
- Transcript mas contenido en altura.
- Controles principales con mejor ergonomia movil.
- Reset de scroll al cambiar de tab.

### Siguiente iteracion recomendada

- Convertir el archivo de sesiones en panel plegable por defecto.
- Evaluar badge o resumen de mensajes no leidos en la propia tab.
- Explorar una vista de transcript aun mas dominante.

## 3. Dossier

### Funcion

Consulta de entidades, personajes y contexto narrativo.

### Valor real en Android

Alta, pero mas deliberada y menos reactiva que `Mapa` o `Consola`.

### Fricciones detectadas

- Mezcla de selector y detalle en un flujo largo.
- Sigue teniendo scroll alto.
- Riesgo de carga cognitiva: resumen, estado, notas y lista compiten entre si.

### Recomendaciones

- Tratarlo como lookup rapido, no como enciclopedia abierta.
- Mantener selector compacto y muy escaneable.
- Priorizar:
  - nombre
  - rol
  - amenaza
  - estado
  - resumen corto
- Mover informacion secundaria a acordeones o secciones plegables.
- Permitir llegar desde `Mapa` al `Dossier` de la entidad activa.

### Estado tras cambios

- Selector mejor contenido.
- Mejor control del alto de listas.
- Aun necesita una segunda iteracion de jerarquia para consulta rapida.

## Tabs secundarias

## Ficha

No prioritaria en esta fase. Debe mantenerse funcional, pero no marca la direccion del rediseño movil actual.

## Entropia

No prioritaria para jugador en esta fase. Mantener estable y compacta, pero sin dedicarle trabajo principal hasta resolver `Mapa`, `Consola` y `Dossier`.

## Decisiones de producto tomadas en esta fase

- Para jugadores Android, `Mapa`, `Consola` y `Dossier` concentran el valor principal.

## Iteracion adicional: texto, tarjetas e iconografia en Dossier

Tras la primera ronda, se detecto un problema claro de consistencia visual en `Dossier`:

- nombres muy largos y muy cortos convivian mal en la misma lista
- la jerarquia textual cambiaba demasiado entre entidades
- faltaba una firma visual rapida por tipo de entidad
- el dossier activo no heredaba la misma semantica visual que la lista

### Ajustes aplicados

- La lista de `Dossier` pasa a usar una composicion de tarjeta con:
  - chip visual/iconico por entidad
  - badges compactos de tipo y amenaza
  - nombre principal con mejor tolerancia a 2 lineas
  - subtitulo opcional solo cuando aporta valor
  - resumen corto consistente en todas las filas
- La funcion de particion de nombre se vuelve mas conservadora:
  - ya no divide de forma agresiva nombres cortos
  - intenta preservar nombres de 1-2 palabras como bloque principal
  - solo envia el resto a segunda linea cuando hay longitud suficiente para justificarlo
- El `dossier activo` adopta el mismo lenguaje visual:
  - icono
  - bloque principal de copy
  - mejor comportamiento con nombres largos

### Objetivo UX

- Mejor escaneo vertical.
- Menor castigo para nombres largos.
- Mas consistencia entre lista y detalle activo.
- Reconocimiento de tipo de entidad con una mirada, sin leer toda la fila.

### Resultado esperado

En Android, `Dossier` debe sentirse menos como una lista textual plana y mas como un selector contextual con peso visual controlado.

## Iteracion adicional: ficha activa del Dossier

Despues de estabilizar la lista, la ficha activa seguia teniendo una debilidad:

- resolvia bien los datos, pero no dejaba una jerarquia clara en el primer vistazo
- el nombre de la entidad y su tipo quedaban demasiado repartidos entre cajas de detalle
- los badges importantes no aparecian lo bastante arriba

### Ajustes aplicados

- Se añade una cabecera compacta para la ficha activa:
  - icono semantico
  - eyebrow contextual
  - nombre principal
  - subtitulo con tipo/rol y cola de nombre cuando existe
  - badges prioritarios
  - resumen corto
- Esta cabecera se aplica tanto a entidades normales como a PdI.
- En movil Android:
  - se oculta el `card-title` redundante de la ficha
  - se compactan tabs y cajas del grid
  - se elimina scroll interno innecesario en el panel principal

### Objetivo UX

- Hacer que la entidad activa se entienda antes de leer el grid.
- Mejorar legibilidad de nombres largos en la ficha superior.
- Mantener continuidad visual entre:
  - lista de dossiers
  - strip de dossier activo
  - detalle principal
- `Ficha` y `Entropia` quedan en segundo plano temporalmente.
- El enfoque ya no es "hacer que todo quepa", sino "hacer que lo importante funcione muy bien".

## Backlog recomendado para Phase 2

### Mapa

- Colapsar actividad por defecto.
- Reducir altura de la tarjeta focal.
- Añadir CTA directo a `Dossier`.
- Revisar estado vacio y degradacion sin mapa.

### Consola

- Plegar archivo de sesiones por defecto.
- Priorizar transcript y respuesta.
- Revisar si la lista de hilos debe ser horizontal siempre o segun numero de identidades.
- Mejorar estados sin actividad o sin conversacion.

### Dossier

- Convertir detalle secundario en acordeones.
- Mejorar transicion `Mapa -> Dossier`.
- Hacer mas evidente el estado activo de la entidad seleccionada.
- Reducir aun mas la densidad de texto por pantalla.

## Nota sobre Stitch

Stitch puede ser util en fases posteriores para:

- explorar variantes de navegacion movil
- redefinir la jerarquia de `Mapa`, `Consola` y `Dossier`
- construir una propuesta de design system mas mobile-first

No es la herramienta adecuada para resolver el problema tecnico principal de rendimiento inicial. Su valor esta en la exploracion de layouts y pantallas, no en la optimizacion del runtime actual.
