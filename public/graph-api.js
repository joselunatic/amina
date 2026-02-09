const createClassList = (store = new Set()) => ({
  add(name) {
    store.add(name);
  },
  remove(name) {
    store.delete(name);
  },
  toggle(name, force) {
    if (typeof force === 'boolean') {
      if (force) store.add(name);
      else store.delete(name);
      return this.contains(name);
    }
    if (store.has(name)) {
      store.delete(name);
      return false;
    }
    store.add(name);
    return true;
  },
  contains(name) {
    return store.has(name);
  }
});

const GRAPH_STYLE = [
  {
    selector: 'node',
    style: {
      'background-color': '#11222a',
      'background-opacity': 0.92,
      label: 'data(label)',
      'text-valign': 'center',
      'text-halign': 'center',
      'text-wrap': 'wrap',
      'text-max-width': 120,
      color: '#e7f6ff',
      'text-outline-width': 4,
      'text-outline-color': '#0a141f',
      'font-size': 10,
      width: 52,
      height: 52,
      'border-width': 2,
      'border-color': '#1f9af4',
      'overlay-opacity': 0,
      'overlay-padding': 0,
      'overlay-color': '#001720'
    }
  },
  {
    selector: 'node[image_url != ""]',
    style: {
      'background-image': 'data(image_url)',
      'background-fit': 'cover cover'
    }
  },
  {
    selector: 'node[threat]',
    style: {
      'border-color': 'mapData(threat, 1, 5, #63d4ff, #ff5b5b)'
    }
  },
  { selector: 'node[type = "pc"]', style: { shape: 'round-rectangle', 'border-color': '#4bd3ff' } },
  { selector: 'node[type = "npc"]', style: { shape: 'ellipse', 'border-color': '#7bffb5' } },
  { selector: 'node[type = "org"]', style: { shape: 'hexagon', 'border-color': '#ffcd70' } },
  { selector: 'node[type = "criatura"]', style: { shape: 'star', 'border-color': '#ff708e' } },
  {
    selector: 'node[type = "poi"]',
    style: {
      shape: 'diamond',
      'border-color': '#a67bff',
      width: 46,
      height: 46
    }
  },
  {
    selector: 'node.hovered',
    style: {
      'border-color': '#80ffdf',
      'border-width': 3
    }
  },
  {
    selector: 'node.focus-ring',
    style: {
      'border-color': '#9cf8ff',
      'border-width': 4,
      'overlay-color': '#4bd3ff',
      'overlay-opacity': 0.45,
      'overlay-padding': 6
    }
  },
  {
    selector: 'edge',
    style: {
      'line-color': '#4bd3ff',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#4bd3ff',
      'curve-style': 'bezier',
      width: 'mapData(strength, 1, 5, 1, 4)',
      opacity: 'mapData(is_public, 0, 1, 0.2, 1)',
      label: 'data(relation)',
      'font-size': 9,
      'text-background-opacity': 0.6,
      'text-background-color': '#0f1c27',
      'text-background-padding': 2,
      'text-rotation': 'autorotate',
      color: '#c1ecff'
    }
  },
  {
    selector: 'edge[linkType = "poi"]',
    style: {
      'line-style': 'dashed',
      'line-color': '#9b8cff',
      'target-arrow-color': '#9b8cff'
    }
  },
  {
    selector: 'edge[is_public = 0]',
    style: {
      'line-style': 'dotted',
      opacity: 0.35
    }
  }
];

const defaultHelpers = {
  sanitize(value) {
    return value == null ? '' : String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  },
  sanitizeUrlValue(url) {
    if (!url) return '';
    try {
      const parsed = new URL(String(url));
      if (!['http:', 'https:'].includes(parsed.protocol)) return '';
      return parsed.toString();
    } catch (err) {
      return '';
    }
  },
  getEntityTypeLabel(type = '') {
    if (type === 'pc') return 'PJ';
    if (type === 'npc') return 'PNJ';
    if (type === 'org') return 'Org';
    if (type === 'criatura') return 'Criatura';
    return 'Entidad';
  },
  getPoiImageUrl() {
    return '';
  },
  openLightbox() {},
  showMessage() {},
  createElement(tag) {
    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      return document.createElement(tag);
    }
    return {
      tag,
      classList: createClassList(),
      style: {},
      appendChild() {},
      remove() {}
    };
  },
  onNodeDoubleClick() {}
};

export class GraphAPI {
  constructor({ cytoscape, container, summaryPanel = null, mode = 'dm', layout = 'spread', helpers = {} }) {
    if (!cytoscape) {
      throw new Error('GraphAPI requires a cytoscape factory.');
    }
    this.container = container;
    this.summaryPanel = summaryPanel;
    this.mode = mode;
    this.layoutName = layout;
    this.helpers = { ...defaultHelpers, ...helpers };
    this.cytoscapeFactory = cytoscape;
    this.cy = null;
    this.handlers = new Map();
    this.resizeObserver = null;
    this.doubleClickWindow = 450;
    this.doubleClickCandidate = null;
    this.lastDoubleClick = { nodeId: null, time: 0 };
    this.hoverCard = null;
    if (this.container && typeof this.container.style !== 'undefined') {
      if (!this.container.style.position || this.container.style.position === 'static') {
        this.container.style.position = 'relative';
      }
    }
  }

  on(event, handler) {
    if (!event || typeof handler !== 'function') return;
    if (!this.handlers.has(event)) this.handlers.set(event, []);
    this.handlers.get(event).push(handler);
  }

  off(event, handler) {
    if (!event) {
      this.handlers.clear();
      return;
    }
    if (!this.handlers.has(event)) return;
    if (!handler) {
      this.handlers.delete(event);
      return;
    }
    const list = this.handlers.get(event).filter((fn) => fn !== handler);
    if (list.length) this.handlers.set(event, list);
    else this.handlers.delete(event);
  }

  invokeHandlers(event, payload) {
    const list = this.handlers.get(event);
    if (!list) return;
    list.forEach((handler) => {
      try {
        handler(payload);
      } catch (err) {
        // swallow handler errors to not break graph
        /* ignore */
      }
    });
  }

  rebuildElements(ctx, options = {}) {
    const elements = { nodes: [], edges: [] };
    if (!ctx || !ctx.entity) return { ...elements, focusId: null };
    const fallbackFocusId = ctx.entity ? `e-${ctx.entity.id}` : null;
    const focusId = fallbackFocusId;
    const seen = new Set();
    const pushNode = (data) => {
      if (seen.has(data.id)) return;
      seen.add(data.id);
      elements.nodes.push({ data });
    };
    const createNodePayload = (info) => {
      const fallbackId = info.id ?? info.entityId ?? info.poi_id ?? 'unknown';
      const nodeId = info.graphId || `e-${fallbackId}`;
      const summaryText =
        info.public_summary ||
        info.publicSummary ||
        info.summary ||
        info.public_note ||
        info.note ||
        info.dm_notes ||
        '';
      return {
        id: nodeId,
        label: info.code_name || info.name || `Entidad ${fallbackId}`,
        type: info.type || info.to_type || info.from_type || 'npc',
        entityId: info.entityId ?? fallbackId,
        threat: info.threat_level || info.threat,
      role: info.role || info.to_role || info.from_role || '',
      visibility: info.visibility || info.to_visibility || info.from_visibility || 'agent_public',
      image_url: info.image_url || info.to_image_url || info.from_image_url || '',
      session: info.first_session || info.sessions || info.session || '',
      publicSummary: summaryText.trim()
      };
    };

    const graphNodes = ctx.graph?.nodes || [];
    const graphEdges = ctx.graph?.edges || [];
    const graphFocusId = ctx.graphFocusId || null;
    if (graphNodes.length) {
      graphNodes.forEach((node) => pushNode(createNodePayload(node.data || node)));
      graphEdges.forEach((edge, idx) => {
        const edgeData = edge.data || edge;
        if (!edgeData.source || !edgeData.target) return;
        elements.edges.push({
          data: {
            id: edgeData.id || `graph-edge-${idx}`,
            source: edgeData.source,
            target: edgeData.target,
            relation: edgeData.relation || edgeData.label || 'vínculo',
            strength: edgeData.strength || 1,
            linkType: edgeData.linkType || 'entity',
            is_public: edgeData.is_public !== undefined ? edgeData.is_public : 1
          }
        });
      });
      const computedFocusId = options.focusId || graphFocusId || fallbackFocusId;
      return { ...elements, focusId: computedFocusId };
    }

    pushNode(createNodePayload(ctx.entity));
    const mode = options.mode || this.mode;
    const onlyAgentVisible = mode === 'agent';
    const relationList = (ctx.relations || []).filter((rel) => !onlyAgentVisible || rel.is_public !== false);
    const poiList = (ctx.pois || []).filter((link) => !onlyAgentVisible || link.is_public !== false);

    relationList.forEach((rel, idx) => {
      const nodeInfo = {
        id: rel.to_entity_id,
        code_name: rel.to_code_name || rel.target_name,
        type: rel.to_type || rel.target_type,
        role: rel.to_role || rel.target_role,
        image_url: rel.to_image_url,
        visibility: rel.to_visibility,
        session: rel.session_tag || null
      };
      if (rel.to_public_summary || rel.to_public_note) {
        nodeInfo.public_summary = rel.to_public_summary || rel.to_public_note;
      }
      pushNode(createNodePayload(nodeInfo));
      elements.edges.push({
        data: {
          id: `rel-${ctx.entity.id}-${rel.to_entity_id}-${idx}`,
          source: focusId,
          target: `e-${rel.to_entity_id}`,
          relation: rel.relation_type || rel.relation || 'vínculo',
          strength: rel.strength || 1,
          linkType: 'entity',
          is_public: rel.is_public !== undefined ? rel.is_public : 1
        }
      });
    });

    poiList.forEach((link, idx) => {
      const poiId = `p-${link.poi_id}`;
      const imageFallback = this.helpers.getPoiImageUrl(Number(link.poi_id));
      const poiNodeData = {
        id: link.poi_id,
        entityId: link.poi_id,
        graphId: poiId,
        code_name: link.name,
        type: 'poi',
        role: link.category || 'PdI',
        image_url: link.image_url || imageFallback,
        visibility: link.visibility,
        session: link.session_tag || link.poi_session || ''
      };
      if (link.public_note) {
        poiNodeData.public_summary = link.public_note;
      }
      pushNode(createNodePayload(poiNodeData));
      elements.edges.push({
        data: {
          id: `poi-${ctx.entity.id}-${link.poi_id}-${idx}`,
          source: focusId,
          target: poiId,
          relation: link.role_at_poi || 'PdI',
          strength: 1,
          linkType: 'poi',
          is_public: link.is_public !== undefined ? link.is_public : 1
        }
      });
    });

    return { ...elements, focusId };
  }

  getBoundingBox() {
    if (!this.container || !this.container.getBoundingClientRect) return null;
    const rect = this.container.getBoundingClientRect();
    const width = rect.width || this.container.clientWidth || this.container.offsetWidth || 640;
    const height = rect.height || this.container.clientHeight || this.container.offsetHeight || 400;
    if (!width || !height) return null;
    return { x1: 0, y1: 0, w: width, h: height };
  }

  ensureLoader() {
    if (!this.container) return null;
    let loader = this.container.querySelector?.('.graph-loading-indicator');
    if (loader) return loader;
    const element = this.helpers.createElement('div');
    element.classList = element.classList || createClassList();
    element.classList.add('graph-loading-indicator');
    element.style = element.style || {};
    this.container.appendChild(element);
    return element;
  }

  toggleLoader(show) {
    if (!this.container) return;
    this.ensureLoader();
    this.container.classList?.toggle?.('graph-loading', !!show);
    const loader = this.container.querySelector?.('.graph-loading-indicator');
    if (loader && loader.classList) {
      loader.classList.toggle('visible', !!show);
    }
  }

  ensureResizeObserver() {
    if (!this.container || typeof ResizeObserver === 'undefined' || this.resizeObserver) return;
    this.resizeObserver = new ResizeObserver(() => {
      if (!this.cy) return;
      this.cy.resize?.();
      this.cy.fit?.(undefined, 20);
    });
    this.resizeObserver.observe(this.container);
  }

  ensureHoverCard() {
    if (this.hoverCard) return this.hoverCard;
    if (!this.container) return null;
    const card = this.helpers.createElement('div');
    card.classList = card.classList || createClassList();
    card.classList.add('graph-hover-card');
    card.style = card.style || {};
    card.style.pointerEvents = 'none';
    this.container.appendChild(card);
    this.hoverCard = card;
    return card;
  }

  hideHoverCard() {
    if (!this.hoverCard) return;
    this.hoverCard.classList?.remove('visible');
  }

  showHoverCard(node) {
    if (!node || !this.container) {
      this.hideHoverCard();
      return;
    }
    const summaryRaw = node.data('publicSummary') || '';
    if (!summaryRaw) {
      this.hideHoverCard();
      return;
    }
    const card = this.ensureHoverCard();
    if (!card) return;
    const sanitize = this.helpers.sanitize;
    const label = sanitize(node.data('label') || node.data('code_name') || 'Entidad');
    const snippet = summaryRaw.trim().length > 220 ? `${summaryRaw.trim().slice(0, 220)}…` : summaryRaw.trim();
    card.innerHTML = `
      <div class="graph-hover-card-label">${label}</div>
      <p class="graph-hover-card-text">${sanitize(snippet)}</p>
    `;
    const pos = node.renderedPosition();
    if (!pos) {
      this.hideHoverCard();
      return;
    }
    const width = this.container.clientWidth || 0;
    const height = this.container.clientHeight || 0;
    const clampX = Math.min(Math.max(pos.x, 32), width - 32);
    const clampY = Math.min(Math.max(pos.y, 40), height - 40);
    card.style.left = `${clampX}px`;
    card.style.top = `${clampY}px`;
    card.classList?.add('visible');
  }

  getLayoutOptions(layoutName, focusId) {
    if (layoutName === 'cose') {
      return {
        name: 'cose',
        padding: 50,
        nodeRepulsion: 9000,
        idealEdgeLength: 220,
        edgeElasticity: 0.1,
        gravity: 0.25,
        animate: false
      };
    }
    if (layoutName === 'spread') {
      const concentricPreset = {
        name: 'concentric',
        padding: 20,
        sweep: 2 * Math.PI,
        startAngle: 1.5 * Math.PI,
        concentric: (node) => (node.id() === focusId ? 2 : 1),
        levelWidth: () => 1
      };
      const options = {
        name: 'spread',
        animate: true,
        minDist: 36,
        padding: 20,
        expandingFactor: -0.2,
        prelayout: concentricPreset,
        maxExpandIterations: 1,
        fit: false,
        randomize: false
      };
      const boundingBox = this.getBoundingBox();
      if (boundingBox) {
        options.boundingBox = boundingBox;
      }
      return options;
    }
    return {
      name: 'concentric',
      padding: 24,
      sweep: 2 * Math.PI,
      startAngle: 1.5 * Math.PI,
      concentric: (node) => (node.id() === focusId ? 2 : 1),
      levelWidth: () => 1
    };
  }

  updateSummary(data, mode) {
    if (!this.summaryPanel) return;
    const panel = this.summaryPanel;
    const sanitize = this.helpers.sanitize;
    const sanitizeUrlValue = this.helpers.sanitizeUrlValue;
    const typeLabel = sanitize(this.helpers.getEntityTypeLabel(data.type));
    const threat = data.threat ? `Amenaza ${sanitize(String(data.threat))}` : 'Amenaza —';
    const session = data.session ? `Sesión ${sanitize(data.session)}` : '';
    const role = data.role ? sanitize(data.role) : '';
    const visibilityRaw = data.visibility || '';
    const visibilityLabel =
      mode === 'agent' && visibilityRaw ? sanitize(String(visibilityRaw).replace('_', ' ')) : '';
    const metaElements = [threat, role, session, visibilityLabel].filter(Boolean);
    const label = sanitize(data.label || data.code_name || data.name || 'Entidad');
    const avatar = data.image_url
      ? `<span class="graph-summary-avatar" style="background-image:url('${sanitizeUrlValue(data.image_url)}')"></span>`
      : '';
    panel.innerHTML = `
      <div class="graph-summary-header">
        ${avatar}
        <div>
          <strong>${label}</strong>
          <span class="graph-summary-role">${typeLabel}</span>
        </div>
      </div>
      <div class="graph-summary-meta">${metaElements.map((item) => `<span>${item}</span>`).join('')}</div>
      <div class="graph-summary-whisper" aria-live="polite"></div>
    `;
    panel.classList?.add?.('graph-summary-panel');
    panel.classList?.toggle?.(
      'graph-summary--restricted',
      mode === 'agent' && visibilityRaw && visibilityRaw !== 'agent_public'
    );
    const updateDataAttribute = (name, value) => {
      if (!panel) return;
      const stringValue = value == null ? '' : String(value);
      if (typeof panel.setAttribute === 'function') {
        panel.setAttribute(name, stringValue);
        return;
      }
      if (panel.dataset) {
        const key = name.replace(/^data-/, '').replace(/-([a-z])/g, (_, char) => char.toUpperCase());
        panel.dataset[key] = stringValue;
      }
    };
    updateDataAttribute('data-node-visibility', visibilityRaw);
    updateDataAttribute('data-graph-mode', mode);
    updateDataAttribute('data-last-hover', '');
    const whisper = panel.querySelector('.graph-summary-whisper');
    if (whisper) {
      whisper.textContent = `Intel preparado para ${label}`;
      whisper.classList.add('active');
      setTimeout(() => whisper?.classList?.remove('active'), 2200);
    }
  }

  clearPendingDoubleClick() {
    if (this.doubleClickCandidate?.timer) {
      clearTimeout(this.doubleClickCandidate.timer);
    }
    this.doubleClickCandidate = null;
  }

  queueDoubleClick(node, event, mode) {
    if (!node) return;
    const nodeId = node.id?.();
    if (!nodeId) return;
    const now = Date.now();
    const threshold = this.doubleClickWindow;
    const candidate = this.doubleClickCandidate;
    if (candidate && candidate.id === nodeId && now - candidate.ts <= threshold) {
      if (candidate.timer) {
        clearTimeout(candidate.timer);
      }
      this.doubleClickCandidate = null;
      this.handleNodeDoubleClick(node, event, mode);
      return;
    }
    if (candidate?.timer) {
      clearTimeout(candidate.timer);
    }
    const timer = setTimeout(() => {
      if (this.doubleClickCandidate?.timer === timer) {
        this.doubleClickCandidate = null;
      }
    }, threshold);
    this.doubleClickCandidate = { id: nodeId, ts: now, timer };
  }

  handleNodeDoubleClick(node, event, mode) {
    if (!node) return;
    const nodeId = node.id?.();
    if (!nodeId) return;
    const now = Date.now();
    if (this.lastDoubleClick.nodeId === nodeId && now - this.lastDoubleClick.time < this.doubleClickWindow) {
      return;
    }
    this.lastDoubleClick.nodeId = nodeId;
    this.lastDoubleClick.time = now;
    const data = node.data();
    this.helpers.onNodeDoubleClick?.(data, mode);
    this.invokeHandlers('dblclick', { event, node, data });
  }

  setupInteractions(mode) {
    if (!this.cy) return;
    this.clearPendingDoubleClick();
    this.hideHoverCard();
    const cy = this.cy;
    cy.off?.('tap', 'node');
    cy.off?.('click', 'node');
    cy.off?.('cxttap', 'node');
    cy.off?.('mouseover', 'node');
    cy.off?.('mouseout', 'node');
    cy.off?.('dblclick', 'node');
    cy.nodes?.().removeClass?.('focus-ring');
    cy.nodes?.().removeClass?.('hovered');
    cy.on?.('tap', 'node', (event) => {
      const node = event.target;
      cy.nodes().removeClass('focus-ring');
      node.addClass('focus-ring');
      this.updateSummary(node.data(), mode);
      const label = node.data('label') || 'Entidad';
      this.invokeHandlers('tap', { event, node, label, data: node.data() });
      this.queueDoubleClick(node, event, mode);
    });
    cy.on?.('click', 'node', (event) => {
      this.queueDoubleClick(event.target, event, mode);
    });
    cy.on?.('cxttap', 'node', (event) => {
      const node = event.target;
      const image = node.data('image_url');
      const title = node.data('label') || 'Imagen ampliada';
      const maxZoom = typeof cy.maxZoom === 'function' ? cy.maxZoom() : 2;
      const targetZoom = Math.min(maxZoom, Math.max(1.25, cy.zoom() * 1.05));
      cy.animate?.({ center: node.position(), zoom: targetZoom }, { duration: 260, easing: 'ease-in-out' });
      if (image) {
        this.helpers.openLightbox(image, title);
      } else {
        this.helpers.showMessage?.(`No hay imagen para ${title}.`, true);
      }
      this.invokeHandlers('cxttap', { event, node, data: node.data() });
    });
    cy.on?.('mouseover', 'node', (event) => {
      const node = event.target;
      node.addClass('hovered');
      const label = node.data('label') || 'Entidad';
      this.invokeHandlers('mouseover', { event, label, data: node.data() });
      this.showHoverCard(node);
    });
    cy.on?.('mouseout', 'node', (event) => {
      event.target.removeClass('hovered');
      this.invokeHandlers('mouseout', { event, data: event.target.data() });
      this.hideHoverCard();
    });
    cy.on?.('dblclick', 'node', (event) => {
      const node = event.target;
      this.handleNodeDoubleClick(node, event, mode);
    });
  }

  update(ctx, options = {}) {
    if (!this.container) return Promise.resolve();
    const mode = options.mode || this.mode;
    const layoutName = options.layout || this.layoutName;
    this.mode = mode;
    this.layoutName = layoutName;
    const { nodes, edges, focusId } = this.rebuildElements(ctx, { mode });
    if (!nodes.length) {
      this.container.textContent = 'Sin relaciones registradas.';
      return Promise.resolve();
    }
    const elements = [...nodes, ...edges];
    if (!this.cy) {
      this.resetContainer();
      this.cy = this.cytoscapeFactory({
        container: this.container,
        elements,
        style: GRAPH_STYLE,
        layout: { name: layoutName }
      });
      this.cy.dblclick?.();
    } else {
      this.cy.elements()?.remove();
      this.cy.add(elements);
    }
    this.ensureResizeObserver();
    this.cy.resize?.();
    this.updateNodeFocus(focusId);
    const targetFocusId = options.focusId || focusId;
    const layout = this.getLayoutOptions(layoutName, targetFocusId);
    this.toggleLoader(true);
    this.setupInteractions(mode);
    const layoutRunner = this.cy.elements().layout(layout);
    layoutRunner.run();
    return new Promise((resolve) => {
      layoutRunner.once('layoutstop', () => {
        const fitPadding = typeof options.fitPadding === 'number' ? options.fitPadding : 20;
        this.cy.fit?.(undefined, fitPadding);
        this.toggleLoader(false);
        const summaryTarget = this.summaryPanel || this.container;
        this.updateSummary(ctx.entity, mode);
        this.updateNodeFocus(targetFocusId);
        resolve();
      });
    });
  }

  resetContainer() {
    if (!this.container) return;
    this.clearPendingDoubleClick();
    if (this.hoverCard) {
      this.hideHoverCard();
      this.hoverCard.remove();
      this.hoverCard = null;
    }
    if (typeof this.container.innerHTML !== 'undefined') {
      this.container.innerHTML = '';
    } else {
      this.container.textContent = '';
    }
    this.ensureLoader();
  }

  updateNodeFocus(focusId) {
    if (!this.cy || !focusId) return;
    this.cy.nodes().removeClass('focus');
    this.cy.nodes().removeClass('focus-ring');
    const focusNode = this.cy.nodes(`[id = "${focusId}"]`);
    focusNode?.addClass?.('focus');
    focusNode?.addClass?.('focus-ring');
  }
}
