import assert from 'node:assert/strict';
import { GraphAPI } from '../public/graph-api.js';

const DEFAULT_CONTEXT = {
  entity: {
    id: 100,
    code_name: 'Test Node',
    type: 'npc',
    threat_level: 3,
    image_url: '/images/test.png',
    visibility: 'agent_public'
  },
  relations: [
    {
      to_entity_id: 101,
      relation_type: 'aliado',
      to_code_name: 'Ally One',
      to_type: 'pc',
      to_image_url: '/images/ally.png',
      is_public: 1
    }
  ],
  pois: [
    {
      poi_id: 42,
      name: 'Base Omega',
      image_url: '/images/base.png',
      role_at_poi: 'Intel',
      is_public: 1
    }
  ]
};

function createClassList() {
  const classes = new Set();
  return {
    add(value) {
      classes.add(value);
    },
    remove(value) {
      classes.delete(value);
    },
    toggle(value, force) {
      if (typeof force === 'boolean') {
        if (force) classes.add(value); else classes.delete(value);
        return classes.has(value);
      }
      if (classes.has(value)) {
        classes.delete(value);
        return false;
      }
      classes.add(value);
      return true;
    },
    contains(value) {
      return classes.has(value);
    }
  };
}

function createMockContainer() {
  const classList = createClassList();
  const children = [];
  return {
    classList,
    dataset: {},
    innerHTML: '',
    textContent: '',
    style: {},
    clientWidth: 900,
    clientHeight: 520,
    offsetWidth: 900,
    offsetHeight: 520,
    appendChild(child) {
      children.push(child);
    },
    querySelector(selector) {
      if (!selector) return null;
      const className = selector.replace(/^\./, '');
      return children.find((child) => child.classList?.contains(className)) || null;
    },
    getBoundingClientRect() {
      return { width: 900, height: 520 };
    }
  };
}

function createMockPanel() {
  const classList = createClassList();
  const whisper = {
    textContent: '',
    classList: createClassList(),
    __whisperTimeout: null
  };
  const attributes = new Map();
  const dataset = {};
  return {
    innerHTML: '',
    dataset,
    classList,
    querySelector(selector) {
      if (selector === '.graph-summary-whisper') return whisper;
      return null;
    },
    setAttribute(name, value) {
      const stringValue = value == null ? '' : String(value);
      attributes.set(name, stringValue);
      if (name.startsWith('data-')) {
        const key = name
          .slice(5)
          .replace(/-([a-z])/g, (_, char) => char.toUpperCase());
        dataset[key] = stringValue;
      }
    },
    getAttribute(name) {
      return attributes.has(name) ? attributes.get(name) : null;
    }
  };
}

function createLayoutRunner() {
  let stopHandler = null;
  return {
    options: null,
    run() {
      this.ran = true;
    },
    once(event, handler) {
      if (event === 'layoutstop') stopHandler = handler;
    },
    trigger(event) {
      if (event === 'layoutstop' && typeof stopHandler === 'function') {
        stopHandler();
      }
    }
  };
}

function createCytoscapeFactory() {
  const eventHandlers = new Map();
  const layoutRunner = createLayoutRunner();
  const nodesCollection = {
    removeClass() {
      return nodesCollection;
    },
    addClass() {
      return nodesCollection;
    },
    data() {
      return {};
    }
  };
  const focusNode = {
    addClass() {},
    removeClass() {},
    data() {
      return {};
    },
    position() {
      return { x: 0, y: 0 };
    }
  };
  const elementsCollection = {
    layout(options) {
      layoutRunner.options = options;
      return layoutRunner;
    },
    remove() {},
    add() {}
  };
  const cy = {
    elements: () => elementsCollection,
    nodes(selector) {
      if (typeof selector === 'string' && selector.includes('[id')) {
        return focusNode;
      }
      return nodesCollection;
    },
    resize() {
      cy.resized = true;
    },
    fit() {
      cy.fitted = true;
    },
    add() {},
    on(event, selector, handler) {
      if (typeof handler === 'function') {
        eventHandlers.set(event, handler);
      }
    },
    off(event) {
      if (!event) {
        eventHandlers.clear();
      } else {
        eventHandlers.delete(event);
      }
    },
    animate() {},
    zoom() {
      return 1;
    },
    maxZoom() {
      return 2;
    },
    trigger(event, payload) {
      const handler = eventHandlers.get(event);
      if (handler) handler(payload);
    }
  };
  return { factory: () => cy, cy, layoutRunner };
}

async function testLoaderAndSummary() {
  const container = createMockContainer();
  const summaryPanel = createMockPanel();
  const { factory, layoutRunner } = createCytoscapeFactory();
  const graphApi = new GraphAPI({
    cytoscape: factory,
    container,
    summaryPanel,
    mode: 'dm',
    layout: 'spread'
  });
  const updatePromise = graphApi.update(DEFAULT_CONTEXT, {
    focusId: 'e-100',
    mode: 'dm',
    layout: 'spread'
  });
  const loader = container.querySelector('.graph-loading-indicator');
  assert.ok(loader, 'loader overlay should exist');
  assert.ok(container.classList.contains('graph-loading'));
  assert.ok(loader.classList.contains('visible'));
  layoutRunner.trigger('layoutstop');
  await updatePromise;
  assert.ok(!container.classList.contains('graph-loading'));
  assert.ok(!loader.classList.contains('visible'));
  assert.strictEqual(summaryPanel.dataset.graphMode, 'dm');
  assert.ok(summaryPanel.innerHTML.includes('Test Node'));
}

async function testDblclickHandler() {
  const container = createMockContainer();
  const summaryPanel = createMockPanel();
  const { factory, cy, layoutRunner } = createCytoscapeFactory();
  const graphApi = new GraphAPI({
    cytoscape: factory,
    container,
    summaryPanel,
    mode: 'agent',
    layout: 'spread'
  });
  const calls = [];
  graphApi.on('dblclick', (payload) => {
    calls.push(payload);
  });
  const updatePromise = graphApi.update(DEFAULT_CONTEXT, {
    focusId: 'e-100',
    mode: 'agent',
    layout: 'spread'
  });
  layoutRunner.trigger('layoutstop');
  await updatePromise;
  cy.trigger('dblclick', {
    target: {
      id() {
        return 'node-1';
      },
      addClass() {},
      removeClass() {},
      data() {
        return { entityId: 888, label: 'Triggered' };
      },
      position() {
        return { x: 0, y: 0 };
      }
    }
  });
  assert.strictEqual(calls.length, 1);
  assert.strictEqual(calls[0].data.entityId, 888);
  assert.strictEqual(calls[0].event?.type, undefined);
}

async function runTests() {
  await testLoaderAndSummary();
  await testDblclickHandler();
  console.log('GraphAPI specs OK');
}

runTests().catch((err) => {
  console.error(err);
  process.exit(1);
});
