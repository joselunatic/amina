import * as THREE from '../vendor/three/three.module.js';
import { SVGLoader } from '../vendor/three/SVGLoader.js';
import { EffectComposer } from '../vendor/three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/three/examples/jsm/postprocessing/OutputPass.js';
import { MCPBridge } from '../vendor/threlte-mcp/MCPBridge.js';

const BASE_SVG_SOURCE = `
<svg width="800" height="600" viewBox="0 0 800 600" xmlns="http://www.w3.org/2000/svg" id="amina_spatial_layout">
  <style>
    .zone_shape { transition: fill 0.3s, stroke 0.3s; fill: #001408; }
    .normal { stroke: #006622; fill: #001e0c; }
    .alert { stroke: #aa8800; fill: #281e0c; }
    .lockdown { stroke: #aa2200; fill: #280008; }
    .label_text { fill: #00cc44; font-family: 'JetBrains Mono', monospace; font-size: 10px; pointer-events: none; text-transform: uppercase; letter-spacing: 1px; }
    .sub_text { fill: #006622; font-family: 'JetBrains Mono', monospace; font-size: 7px; pointer-events: none; }
    .hitbox { fill: transparent; pointer-events: all; cursor: crosshair; }
    .corridor { stroke: #003311; stroke-width: 1.5; fill: none; }
  </style>

  <defs>
    <filter id="glow_subtle" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
    <pattern id="grid_tech" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#001500" stroke-width="0.5"/>
    </pattern>
  </defs>

  <rect width="800" height="600" fill="#000500" />
  <!-- Patrón de rejilla omitido en SVGLoader (url() no soportado) -->

  <g id="system_corridors" class="corridor">
    <path d="M 400 245 V 130" />
    <path d="M 450 280 L 550 210" />
    <path d="M 450 320 L 550 390" />
    <path d="M 400 355 V 470" />
    <path d="M 350 300 L 250 300" />
  </g>

  <g id="zone_cmd" class="zone-group">
    <polygon points="400,245 450,275 450,325 400,355 350,325 350,275" class="zone_shape normal" />
    <circle id="zone_cmd_anchor" cx="400" cy="300" r="1" opacity="0" />
    <text x="400" y="305" text-anchor="middle" class="label_text">COMMAND</text>
  </g>

  <g id="zone_lab" class="zone-group">
    <polygon points="320,70 330,60 470,60 480,70 480,120 470,130 330,130 320,120" class="zone_shape normal" />
    <circle id="zone_lab_anchor" cx="400" cy="95" r="1" opacity="0" />
    <text x="400" y="100" text-anchor="middle" class="label_text">LAB</text>
  </g>

  <g id="zone_arm" class="zone-group">
    <polygon points="550,170 560,160 680,160 690,170 690,230 670,250 560,250 550,230" class="zone_shape normal" />
    <circle id="zone_arm_anchor" cx="620" cy="205" r="1" opacity="0" />
    <text x="620" y="210" text-anchor="middle" class="label_text">ARMORY</text>
  </g>

  <g id="zone_gar" class="zone-group">
    <polygon points="550,360 565,350 690,350 700,365 700,430 680,440 565,440 550,425" class="zone_shape normal" />
    <circle id="zone_gar_anchor" cx="620" cy="395" r="1" opacity="0" />
    <text x="620" y="400" text-anchor="middle" class="label_text">GARAGE</text>
  </g>

  <g id="zone_med" class="zone-group">
    <polygon points="320,480 335,470 465,470 480,485 480,525 465,540 335,540 320,525" class="zone_shape normal" />
    <circle id="zone_med_anchor" cx="400" cy="505" r="1" opacity="0" />
    <text x="400" y="510" text-anchor="middle" class="label_text">MEDICAL</text>
  </g>

  <g id="zone_sec" class="zone-group">
    <polygon points="110,200 125,180 235,180 250,200 250,390 235,420 125,420 110,390" class="zone_shape normal" />
    <circle id="zone_sec_anchor" cx="180" cy="300" r="1" opacity="0" />
    <text x="180" y="305" text-anchor="middle" class="label_text">SECURITY</text>
  </g>
</svg>
`;

const PALETTES = {
  standard: {
    base: 0x06100b,
    plate: 0x050d0a,
    emissiveBase: 0x0b1a12,
    emissivePlate: 0x122319,
    edgeStrong: 0x2f6b4e,
    edgeDim: 0x1e3f30,
    icon: 0x4a7a62,
    ledNormal: 0x2f7b5a,
    ledAlert: 0x8b6b2f,
    ledLockdown: 0x7b3b2f,
    lightAmbient: 0x89bda6,
    lightKey: 0xd2ffe6,
    lightFill: 0x6fa38a
  },
  amber: {
    base: 0x120b06,
    plate: 0x0d0805,
    emissiveBase: 0x24150b,
    emissivePlate: 0x2f1c10,
    edgeStrong: 0xd29646,
    edgeDim: 0x6f4122,
    icon: 0xf2b85f,
    ledNormal: 0xc88a3a,
    ledAlert: 0xe2b65e,
    ledLockdown: 0xdd6a4f,
    lightAmbient: 0xb98b5c,
    lightKey: 0xffd7a6,
    lightFill: 0x8f6b3f
  }
};

const FOG_DENSITY = 0.006;
const TONE_MAPPING = THREE.ACESFilmicToneMapping;
const TONE_MAPPING_EXPOSURE = 1.0;
const MAX_PIXEL_RATIO = 1.5;
const TOUCH_MOVE_THRESHOLD = 10;
const POINTER_MOVE_THRESHOLD = 3;
const CAMERA_ZOOM = {
  minPadding: 18,
  minFactor: 0.35,
  maxPadding: 120,
  maxFactor: 1.35,
  wheelSpeed: 0.0018
};
const MODULE_SIGNAL = {
  ringFactor: 0.52,
  ringMin: 10,
  ringMax: 32,
  pipFactor: 0.1,
  pipMin: 3.2,
  pipMax: 6.0,
  ringInset: 2.6,
  pipZOffset: 0.7,
  microZOffset: 0.55,
  microFactor: 0.56,
  microMin: 1.2,
  microMax: 2.4
};

const VISUAL_MODES = {
  subtle: {
    baseBoost: 0.12,
    baseBoostSelected: 0.18,
    baseBoostHover: 0.15,
    plateBoost: 0.16,
    plateBoostSelected: 0.22,
    plateBoostHover: 0.19,
    edgeOpacity: 0.32,
    edgeOpacitySelected: 0.45,
    edgeOpacityHover: 0.4,
    iconOpacity: 0.45,
    iconOpacitySelected: 0.65,
    iconOpacityHover: 0.55,
    idleGlow: 0.015,
    idleSpeed: 0.00024,
    iconWobble: 0.01,
    iconSpeed: 0.00032,
    bloomStrength: 0.08,
    bloomRadius: 0.15,
    bloomThreshold: 0.92,
    ledScale: 0.5,
    pulseDuration: 820,
    pulseScaleTo: 1.3,
    pulseOpacity: 0.35,
    liftOffset: 0.35,
    baseRoughness: 0.82,
    plateRoughness: 0.75,
    baseMetalness: 0.05,
    plateMetalness: 0.1
  },
  technical: {
    baseBoost: 0.26,
    baseBoostSelected: 0.38,
    baseBoostHover: 0.32,
    plateBoost: 0.34,
    plateBoostSelected: 0.5,
    plateBoostHover: 0.42,
    edgeOpacity: 0.62,
    edgeOpacitySelected: 0.9,
    edgeOpacityHover: 0.75,
    iconOpacity: 0.7,
    iconOpacitySelected: 0.92,
    iconOpacityHover: 0.8,
    idleGlow: 0.12,
    idleSpeed: 0.0007,
    iconWobble: 0.05,
    iconSpeed: 0.00075,
    bloomStrength: 0.55,
    bloomRadius: 0.7,
    bloomThreshold: 0.85,
    ledScale: 1.2,
    pulseDuration: 480,
    pulseScaleTo: 2.3,
    pulseOpacity: 0.7,
    liftOffset: 1.0,
    baseRoughness: 0.6,
    plateRoughness: 0.5,
    baseMetalness: 0.18,
    plateMetalness: 0.28
  },
  dramatic: {
    baseBoost: 0.48,
    baseBoostSelected: 0.72,
    baseBoostHover: 0.6,
    plateBoost: 0.62,
    plateBoostSelected: 0.88,
    plateBoostHover: 0.75,
    edgeOpacity: 0.9,
    edgeOpacitySelected: 1.0,
    edgeOpacityHover: 0.96,
    iconOpacity: 0.85,
    iconOpacitySelected: 0.98,
    iconOpacityHover: 0.92,
    idleGlow: 0.32,
    idleSpeed: 0.0012,
    iconWobble: 0.16,
    iconSpeed: 0.0012,
    bloomStrength: 1.15,
    bloomRadius: 1.05,
    bloomThreshold: 0.78,
    ledScale: 1.9,
    pulseDuration: 380,
    pulseScaleTo: 3.0,
    pulseOpacity: 0.95,
    liftOffset: 1.7,
    baseRoughness: 0.35,
    plateRoughness: 0.25,
    baseMetalness: 0.35,
    plateMetalness: 0.5
  }
};

export function createBase3d() {
  let activePaletteKey = 'standard';
  let activePalette = PALETTES[activePaletteKey];
  let activeVisualModeKey = 'subtle';
  let activeVisualMode = VISUAL_MODES[activeVisualModeKey];
  let renderer;
  let scene;
  let camera;
  let activeCamera;
  let rootGroup;
  let raycaster;
  let pointer;
  let resizeObserver;
  let animationFrame;
  let isAnimating = false;
  let onSelect;
  let onSelectModule;
  let onFlyOff;
  let onToggleFullscreen;
  let rootEl;
  let composer;
  let bloomPass;
  let mcpBridge;

  const zoneVisuals = new Map();
  const zoneCenters = new Map();
  const clickable = [];
  const pipTargets = [];
  const pipLookup = new Map();

  const state = {
    selectedZoneId: null,
    zonesData: {},
    activeModuleByZone: {},
    sceneSize: new THREE.Vector3(1, 1, 1),
    sceneBounds: new THREE.Box3(),
    lookAt: new THREE.Vector3(0, 0, 0),
    defaultCameraPos: new THREE.Vector3(0, 90, 120),
    defaultLookAt: new THREE.Vector3(0, 0, 0),
    cameraAnim: null,
    pendingCameraSwap: null,
    drag: {
      active: false,
      pending: false,
      moved: false,
      startX: 0,
      startY: 0,
      lastX: 0,
      lastY: 0,
      yaw: 0,
      pitch: 0,
      radius: 0,
      timer: null,
      pointerId: null,
      pointerType: null
    },
    pan: {
      active: false,
      startX: 0,
      startY: 0,
      pointerId: null,
      startLookAt: null,
      startPos: null
    },
    pinch: {
      active: false,
      startDistance: 0,
      startRadius: 0
    },
    tap: {
      lastTime: 0,
      lastX: 0,
      lastY: 0
    },
    pulse: {
      mesh: null,
      start: 0,
      active: false,
      config: {
        duration: activeVisualMode.pulseDuration,
        scaleTo: activeVisualMode.pulseScaleTo,
        opacity: activeVisualMode.pulseOpacity
      }
    },
    isActive: true,
    needsRender: true,
    hasDynamicLEDs: false,
    hoveredZoneId: null,
    hoveredModuleKey: null,
    supportsHover: false,
    ledScaleMultiplier: 1,
    cameraLimits: {
      minRadius: 40,
      maxRadius: 240
    },
    lights: {
      ambient: null,
      key: null,
      fill: null,
      rim: null
    }
  };
  const boundEvents = [];
  let selectionLiftOffset = activeVisualMode.liftOffset;
  const selectionLiftDuration = 220;

  const materialCache = createMaterialCache();
  const activeTouches = new Map();

  function init({
    canvas,
    root,
    zonesData,
    activeModules,
    onSelect: onSelectCb,
    onSelectModule: onSelectModuleCb,
    onFlyOff: onFlyOffCb,
    onToggleFullscreen: onToggleFullscreenCb
  }) {
    if (!canvas) return;
    rootEl = root || canvas.parentElement;
    onSelect = onSelectCb;
    onSelectModule = onSelectModuleCb;
    onFlyOff = onFlyOffCb;
    onToggleFullscreen = onToggleFullscreenCb;
    state.zonesData = zonesData || {};
    state.activeModuleByZone = activeModules || {};
    state.supportsHover = Boolean(window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches);

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = TONE_MAPPING;
    renderer.toneMappingExposure = TONE_MAPPING_EXPOSURE;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setClearColor(0x000000, 0);

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(activePalette.base, FOG_DENSITY);
    camera = new THREE.PerspectiveCamera(32, 1, 0.1, 5000);
    const isMobile = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
    const basePos = state.defaultCameraPos.clone();
    if (isMobile) {
      basePos.y *= 1.25;
      basePos.z *= 1.2;
    }
    camera.position.copy(basePos);
    state.lookAt.copy(state.defaultLookAt);
    camera.lookAt(state.lookAt);
    activeCamera = camera;

    raycaster = new THREE.Raycaster();
    pointer = new THREE.Vector2();

    buildScene();
    setBaseLights();
    initPostprocessing();
    initMcpBridge();
    bindEvents(canvas);
    resize();
    startLoop();

    if (rootEl && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(() => resize());
      resizeObserver.observe(rootEl);
    }
  }

  function createMaterialCache() {
    return {
      base: new THREE.MeshStandardMaterial({
        color: activePalette.base,
        emissive: activePalette.emissiveBase,
        roughness: 0.7,
        metalness: 0.12,
        transparent: true,
        opacity: 1
      }),
      plate: new THREE.MeshStandardMaterial({
        color: activePalette.plate,
        emissive: activePalette.emissivePlate,
        roughness: 0.6,
        metalness: 0.18,
        transparent: true,
        opacity: 1
      }),
      edgeStrong: new THREE.LineBasicMaterial({
        color: activePalette.edgeStrong,
        transparent: true,
        opacity: 0.55
      }),
      edgeDim: new THREE.LineBasicMaterial({
        color: activePalette.edgeDim,
        transparent: true,
        opacity: 0.35
      }),
      icon: new THREE.LineBasicMaterial({
        color: activePalette.icon,
        transparent: true,
        opacity: 0.65
      })
    };
  }

  function buildScene() {
    rootGroup = new THREE.Group();
    const loader = new SVGLoader();
    const svgData = loader.parse(BASE_SVG_SOURCE);

    svgData.paths.forEach((path) => {
      const zoneId = resolveZoneId(path.userData?.node);
      if (!zoneId) return;
      const nodeId = path.userData?.node?.id || '';
        const baseDepth = zoneId === 'zone_cmd' ? 16 : 14;
        const plateDepth = 3.6;
        const plateGap = 1.6;
      if (nodeId.endsWith('_anchor')) {
        const shapes = SVGLoader.createShapes(path);
        const center = getShapesCenter(shapes);
        const anchor = new THREE.Object3D();
        anchor.name = `${zoneId}_anchor`;
        anchor.position.set(center.x, center.y, baseDepth + plateGap + plateDepth);
        anchor.userData.zoneId = zoneId;
        const zoneGroup = getZoneGroup(zoneId);
        zoneGroup.add(anchor);
        registerZoneAnchor(zoneId, anchor);
        return;
      }
      const shapes = SVGLoader.createShapes(path);
      shapes.forEach((shape) => {
        const zoneGroup = getZoneGroup(zoneId);
        const insetScale = 0.94;

        const baseGeometry = new THREE.ExtrudeGeometry(shape, {
          depth: baseDepth,
          bevelEnabled: true,
          bevelThickness: 0.8,
          bevelSize: 0.8,
          bevelSegments: 1
        });
        const { geometry: centeredBase, center: baseCenter } = centerGeometry(baseGeometry);
        const baseMaterial = materialCache.base.clone();
        const baseMesh = new THREE.Mesh(centeredBase, baseMaterial);
        baseMesh.position.set(baseCenter.x, baseCenter.y, 0);
        baseMesh.userData.zoneId = zoneId;
        clickable.push(baseMesh);

        const baseEdges = new THREE.LineSegments(
          new THREE.EdgesGeometry(centeredBase),
          materialCache.edgeStrong.clone()
        );
        baseEdges.position.copy(baseMesh.position);

        const plateGeometry = new THREE.ExtrudeGeometry(shape, {
          depth: plateDepth,
          bevelEnabled: true,
          bevelThickness: 0.6,
          bevelSize: 0.6,
          bevelSegments: 1
        });
        const { geometry: centeredPlate, center: plateCenter } = centerGeometry(plateGeometry);
        const plateMaterial = materialCache.plate.clone();
        const plateMesh = new THREE.Mesh(centeredPlate, plateMaterial);
        plateMesh.position.set(plateCenter.x, plateCenter.y, baseDepth + plateGap);
        plateMesh.scale.set(insetScale, insetScale, 1);
        plateMesh.userData.zoneId = zoneId;

        const plateEdges = new THREE.LineSegments(
          new THREE.EdgesGeometry(centeredPlate),
          materialCache.edgeDim.clone()
        );
        plateEdges.position.copy(plateMesh.position);
        plateEdges.scale.copy(plateMesh.scale);

        zoneGroup.add(baseMesh, baseEdges, plateMesh, plateEdges);
        registerZoneVisual(zoneId, {
          baseMesh,
          plateMesh,
          edgesStrong: baseEdges,
          edgesDim: plateEdges
        });
      });
    });

    finalizeZoneVisuals();
    normalizeScene(rootGroup);
    scene.add(rootGroup);
    buildPulseRing();
    updateZoneCenters();
    updateModuleSignals();
    updateCameraLimits();
  }

  function initPostprocessing() {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, activeCamera || camera);
    composer.addPass(renderPass);
    bloomPass = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      activeVisualMode.bloomStrength,
      activeVisualMode.bloomRadius,
      activeVisualMode.bloomThreshold
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
  }

  function initMcpBridge() {
    if (!scene || typeof window === 'undefined' || !('WebSocket' in window)) return;
    const host = window.location?.hostname;
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    try {
      mcpBridge = new MCPBridge(scene, {
        url: 'ws://127.0.0.1:8083',
        autoConnect: isLocal,
        reconnectDelay: 10000,
        maxDepth: 8
      });
    } catch (error) {
      console.warn('[MCPBridge] Failed to initialize', error);
    }
  }

  function getZoneGroup(zoneId) {
    let visuals = zoneVisuals.get(zoneId);
    if (!visuals) {
      const group = new THREE.Group();
      group.name = zoneId;
      group.userData.zoneId = zoneId;
      rootGroup.add(group);
      visuals = {
        group,
        meshes: [],
        plates: [],
        edgesStrong: [],
        edgesDim: [],
        icon: null,
        led: null,
        anchor: null,
        status: state.zonesData[zoneId]?.status || 'normal',
        modulePipGroup: null,
        modulePipEntries: [],
        modulePipMap: new Map(),
        moduleRing: null,
        microdotsGroup: null,
        modulePipConfig: null
      };
      zoneVisuals.set(zoneId, visuals);
    }
    return visuals.group;
  }

  function registerZoneVisual(zoneId, parts) {
      const visuals = zoneVisuals.get(zoneId);
      if (!visuals) return;
      visuals.meshes.push(parts.baseMesh);
      visuals.plates.push(parts.plateMesh);
      visuals.edgesStrong.push(parts.edgesStrong);
      visuals.edgesDim.push(parts.edgesDim);
  }

  function registerZoneAnchor(zoneId, anchor) {
    const visuals = zoneVisuals.get(zoneId);
    if (!visuals) return;
    visuals.anchor = anchor;
  }

  function finalizeZoneVisuals() {
    zoneVisuals.forEach((visuals, zoneId) => {
      const box = new THREE.Box3().setFromObject(visuals.group);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      visuals.plateSize = size;
      visuals.plateCenter = center;
      visuals.plateTop = box.max.z;

      visuals.baseY = visuals.group.position.y;
      visuals.lift = {
        from: visuals.baseY,
        to: visuals.baseY,
        start: 0,
        duration: selectionLiftDuration
      };

      const iconSize = clamp(Math.min(size.x, size.y) * 0.48, 10, 32);
      const icon = createZoneIcon(zoneId, iconSize);
      icon.position.set(center.x, center.y, box.max.z + 0.35);
      icon.userData.baseRotation = icon.rotation.z;
      visuals.group.add(icon);
      visuals.icon = icon;
      visuals.seed = hashString(zoneId) * 0.015;

      const ledRadius = clamp(Math.min(size.x, size.y) * 0.04, 1.2, 3);
      const led = createStatusLed(zoneId, ledRadius);
      const ledOffset = clamp(Math.min(size.x, size.y) * 0.18, 6, 14);
      led.position.set(box.max.x - ledOffset, box.min.y + ledOffset, box.max.z + 0.45);
      visuals.group.add(led);
      visuals.led = led;
      visuals.status = state.zonesData[zoneId]?.status || 'normal';
    });
  }

  function createZoneIcon(zoneId, size) {
    const geometry = new THREE.BufferGeometry();
    const lines = [];
    const radius = size * 0.5;

    if (zoneId === 'zone_cmd') {
      addPolygon(lines, radius, 6);
      addRadials(lines, radius * 0.75, 3);
    } else if (zoneId === 'zone_arm') {
      addParallelBars(lines, radius * 0.9, radius * 0.5);
      addRect(lines, radius * 0.8, radius * 0.35, radius * 0.35, -radius * 0.2);
    } else if (zoneId === 'zone_lab') {
      addTriangle(lines, radius * 0.9);
      addCircle(lines, radius * 0.25, 12, 0, -radius * 0.2);
    } else if (zoneId === 'zone_gar') {
      addRect(lines, radius * 1.3, radius * 0.7);
      addCircle(lines, radius * 0.18, 10, -radius * 0.4, -radius * 0.4);
      addCircle(lines, radius * 0.18, 10, radius * 0.4, -radius * 0.4);
    } else if (zoneId === 'zone_med') {
      addPlus(lines, radius * 0.9, radius * 0.3);
    } else if (zoneId === 'zone_sec') {
      addRect(lines, radius * 1.1, radius * 0.9);
      addCircle(lines, radius * 0.12, 10, 0, 0);
    } else {
      addRect(lines, radius, radius);
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(lines.flat(), 3));
    const icon = new THREE.LineSegments(geometry, materialCache.icon.clone());
    icon.rotation.x = 0;
    icon.userData.zoneId = zoneId;
    return icon;
  }

  function createStatusLed(zoneId, radius) {
    const geometry = new THREE.CircleGeometry(radius, 16);
    const status = state.zonesData[zoneId]?.status || 'normal';
    const color = getLedColor(status);
    const material = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.4,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.75
    });
    const led = new THREE.Mesh(geometry, material);
    led.rotation.x = -Math.PI / 2;
    led.userData.zoneId = zoneId;
    led.userData.status = status;
    return led;
  }

  function createSignalMaterials() {
    const markShared = (material) => {
      material.userData = { ...material.userData, sharedSignal: true };
      return material;
    };
    return {
      microSolid: markShared(new THREE.MeshBasicMaterial({
        color: activePalette.edgeStrong,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        depthTest: false
      })),
      microLine: markShared(new THREE.LineBasicMaterial({
        color: activePalette.edgeDim,
        transparent: true,
        opacity: 0.32,
        depthWrite: false,
        depthTest: false
      })),
      microTick: markShared(new THREE.LineBasicMaterial({
        color: activePalette.edgeDim,
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
        depthTest: false
      })),
      pipFill: markShared(new THREE.MeshStandardMaterial({
        color: activePalette.edgeStrong,
        emissive: activePalette.edgeStrong,
        emissiveIntensity: 0.3,
        roughness: 0.6,
        metalness: 0.15,
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
        depthTest: false
      })),
      ring: markShared(new THREE.LineBasicMaterial({
        color: activePalette.edgeDim,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        depthTest: false
      }))
    };
  }

  const signalMaterials = createSignalMaterials();

  function getOrderedModules(modules = []) {
    const capabilities = [];
    const metrics = [];
    modules.forEach((module) => {
      if (!module || !module.module_id) return;
      const type = String(module.type || '').toLowerCase();
      if (type === 'metrics') {
        metrics.push(module);
      } else {
        capabilities.push(module);
      }
    });
    return [...capabilities, ...metrics];
  }

  function getZoneModules(zoneId) {
    const zone = state.zonesData[zoneId];
    return Array.isArray(zone?.modules) ? zone.modules : [];
  }

  function clearModulePips(visuals) {
    if (!visuals) return;
    if (visuals.moduleRing) {
      visuals.group.remove(visuals.moduleRing);
      disposeObject(visuals.moduleRing);
      visuals.moduleRing = null;
    }
    if (visuals.modulePipGroup) {
      visuals.modulePipEntries.forEach((entry) => {
        if (entry?.hit) {
          const index = pipTargets.indexOf(entry.hit);
          if (index >= 0) pipTargets.splice(index, 1);
          pipLookup.delete(entry.key);
        }
      });
      visuals.group.remove(visuals.modulePipGroup);
      disposeObject(visuals.modulePipGroup);
      visuals.modulePipGroup = null;
    }
    visuals.modulePipEntries = [];
    visuals.modulePipMap.clear();
    visuals.modulePipConfig = null;
  }

  function clearMicrodots(visuals) {
    if (!visuals?.microdotsGroup) return;
    visuals.group.remove(visuals.microdotsGroup);
    disposeObject(visuals.microdotsGroup);
    visuals.microdotsGroup = null;
  }

  function buildModulePips(zoneId) {
    const visuals = zoneVisuals.get(zoneId);
    if (!visuals?.plateSize || !visuals.plateCenter) return;
    clearModulePips(visuals);

    const modules = getOrderedModules(getZoneModules(zoneId));
    const minSide = Math.min(visuals.plateSize.x, visuals.plateSize.y);
    if (!minSide) return;
    const ringRadius = clamp(minSide * MODULE_SIGNAL.ringFactor, MODULE_SIGNAL.ringMin, MODULE_SIGNAL.ringMax);
    const pipSize = clamp(minSide * MODULE_SIGNAL.pipFactor, MODULE_SIGNAL.pipMin, MODULE_SIGNAL.pipMax);
    const pipZ = visuals.plateTop + MODULE_SIGNAL.pipZOffset;
    visuals.modulePipConfig = { ringRadius, pipSize, pipZ };

    if (!modules.length) {
      const ring = createRingLine(ringRadius, signalMaterials.ring.clone());
      ring.position.set(visuals.plateCenter.x, visuals.plateCenter.y, pipZ - 0.03);
      ring.renderOrder = 6;
      ring.frustumCulled = false;
      visuals.group.add(ring);
      visuals.moduleRing = ring;
      return;
    }

    const ringSlots = modules.length > 10 ? 2 : 1;
    const ringRadii = [ringRadius];
    if (ringSlots > 1) {
      const innerRadius = ringRadius - pipSize * MODULE_SIGNAL.ringInset;
      if (innerRadius > pipSize * 2.1) ringRadii.push(innerRadius);
    }

    const group = new THREE.Group();
    group.name = `${zoneId}_module_pips`;
    group.renderOrder = 6;
    group.frustumCulled = false;
    visuals.group.add(group);
    visuals.modulePipGroup = group;

    const outerCount = ringRadii.length > 1 ? Math.ceil(modules.length / 2) : modules.length;
    const ringTotals = ringRadii.map(() => 0);
    const ringAssignments = modules.map((_, index) => (index < outerCount ? 0 : 1));
    ringAssignments.forEach((ringIndex) => {
      ringTotals[ringIndex] = (ringTotals[ringIndex] || 0) + 1;
    });
    const ringOffsets = ringRadii.map(() => 0);

    modules.forEach((module, index) => {
      const ringIndex = ringAssignments[index] || 0;
      const ringCount = ringTotals[ringIndex] || 1;
      const slot = ringOffsets[ringIndex];
      ringOffsets[ringIndex] += 1;
      const angle = (slot / ringCount) * Math.PI * 2 - Math.PI / 2;
      const radius = ringRadii[ringIndex];
      const x = visuals.plateCenter.x + Math.cos(angle) * radius;
      const y = visuals.plateCenter.y + Math.sin(angle) * radius;
      const available = module.available === true;
      const type = String(module.type || '').toLowerCase() === 'metrics' ? 'metrics' : 'capabilities';
      const pip = createModulePipMesh(type, pipSize, available);
      pip.group.renderOrder = 6;
      pip.group.frustumCulled = false;
      pip.line.renderOrder = 6;
      if (pip.fill) {
        pip.fill.renderOrder = 6;
        pip.fill.frustumCulled = false;
      }
      pip.group.position.set(x, y, pipZ);
      group.add(pip.group);

      const key = `${zoneId}:${module.module_id}`;
      pip.hit.userData.zoneId = zoneId;
      pip.hit.userData.moduleId = module.module_id;
      pip.hit.userData.kind = 'module-pip';
      pipTargets.push(pip.hit);
      const entry = {
        key,
        zoneId,
        moduleId: module.module_id,
        available,
        type,
        angle,
        position: new THREE.Vector3(x, y, pipZ),
        line: pip.line,
        fill: pip.fill,
        hit: pip.hit,
        baseLineOpacity: pip.baseLineOpacity,
        baseFillOpacity: pip.baseFillOpacity
      };
      visuals.modulePipEntries.push(entry);
      visuals.modulePipMap.set(module.module_id, entry);
      pipLookup.set(key, entry);
    });
  }

  function createModulePipMesh(type, size, available) {
    const group = new THREE.Group();
    const outlineGeometry = createPipOutlineGeometry(size);
    const lineOpacity = available ? 0.78 : 0.34;
    const lineMaterial = new THREE.LineBasicMaterial({
      color: available ? activePalette.edgeStrong : activePalette.edgeDim,
      transparent: true,
      opacity: lineOpacity,
      depthWrite: false,
      depthTest: false
    });
    const line = new THREE.LineSegments(outlineGeometry, lineMaterial);
    group.add(line);

    let fill = null;
    let fillOpacity = 0;
    if (available) {
      const fillGeometry = new THREE.PlaneGeometry(size * 1.05, size * 1.05);
      const fillMaterial = signalMaterials.pipFill.clone();
      fillMaterial.opacity = 0.2;
      fillMaterial.depthTest = false;
      fillOpacity = fillMaterial.opacity;
      fill = new THREE.Mesh(fillGeometry, fillMaterial);
      group.add(fill);
    }

    if (type === 'metrics') {
      group.rotation.z = Math.PI / 4;
    }

    const hitGeometry = new THREE.PlaneGeometry(size * 1.9, size * 1.9);
    const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const hit = new THREE.Mesh(hitGeometry, hitMaterial);
    group.add(hit);

    return {
      group,
      line,
      fill,
      hit,
      baseLineOpacity: lineOpacity,
      baseFillOpacity: fillOpacity
    };
  }

  function createPipOutlineGeometry(size) {
    const half = size * 0.5;
    const points = [
      [-half, -half],
      [half, -half],
      [half, half],
      [-half, half]
    ];
    const positions = [];
    for (let i = 0; i < points.length; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      positions.push(x1, y1, 0, x2, y2, 0);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    return geometry;
  }

  function createRingLine(radius, material) {
    const segments = 56;
    const points = [];
    for (let i = 0; i < segments; i += 1) {
      const angle = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(angle) * radius, Math.sin(angle) * radius, 0));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.LineLoop(geometry, material);
  }

  function updateMicrodotsForSelection() {
    zoneVisuals.forEach((visuals) => clearMicrodots(visuals));
    const zoneId = state.selectedZoneId;
    if (!zoneId) return;
    buildMicrodots(zoneId);
  }

  function buildMicrodots(zoneId) {
    const visuals = zoneVisuals.get(zoneId);
    if (!visuals?.modulePipConfig) return;
    const activeModuleId = state.activeModuleByZone?.[zoneId];
    if (!activeModuleId) return;
    const modules = getZoneModules(zoneId);
    const module = modules.find((entry) => entry?.module_id === activeModuleId);
    if (!module) return;
    const pipEntry = visuals.modulePipMap.get(activeModuleId);
    if (!pipEntry) return;
    const items = Array.isArray(module.items) ? module.items : [];
    if (!items.length) return;

    const microSize = clamp(
      visuals.modulePipConfig.pipSize * MODULE_SIGNAL.microFactor,
      MODULE_SIGNAL.microMin,
      MODULE_SIGNAL.microMax
    );
    const microRadius = microSize * (items.length > 8 ? 2.2 : 1.6);
    const arc = Math.PI * 1.4;
    const startAngle = -arc * 0.5;
    const z = visuals.plateTop + MODULE_SIGNAL.microZOffset;

    const group = new THREE.Group();
    group.name = `${zoneId}_module_microdots`;
    group.renderOrder = 5;
    group.frustumCulled = false;
    items.forEach((item, index) => {
      if (!item) return;
      const t = items.length > 1 ? index / (items.length - 1) : 0.5;
      const angle = startAngle + arc * t;
      const x = pipEntry.position.x + Math.cos(angle) * microRadius;
      const y = pipEntry.position.y + Math.sin(angle) * microRadius;
      const dotGroup = createMicrodot(item, microSize);
      dotGroup.renderOrder = 5;
      dotGroup.frustumCulled = false;
      dotGroup.position.set(x, y, z);
      group.add(dotGroup);
    });
    visuals.group.add(group);
    visuals.microdotsGroup = group;
  }

  function createMicrodot(item, size) {
    const status = String(item?.status || '').toLowerCase();
    const group = new THREE.Group();
    if (status === 'locked') {
      const ring = createRingLine(size * 0.7, signalMaterials.microLine);
      group.add(ring);
      const notchGeometry = new THREE.BufferGeometry();
      const notchAngle = -Math.PI / 4;
      const r1 = size * 0.55;
      const r2 = size * 0.85;
      const notchPositions = [
        Math.cos(notchAngle) * r1, Math.sin(notchAngle) * r1, 0,
        Math.cos(notchAngle) * r2, Math.sin(notchAngle) * r2, 0
      ];
      notchGeometry.setAttribute('position', new THREE.Float32BufferAttribute(notchPositions, 3));
      const notch = new THREE.LineSegments(notchGeometry, signalMaterials.microLine);
      group.add(notch);
    } else {
      const geometry = new THREE.CircleGeometry(size * 0.65, 14);
      const dot = new THREE.Mesh(geometry, signalMaterials.microSolid);
      group.add(dot);
    }

    const qty = item?.qty;
    if (qty != null && qty > 0) {
      const ticks = Math.min(2, qty);
      const tickPositions = [];
      const tickLength = size * 0.7;
      for (let i = 0; i < ticks; i += 1) {
        const offset = (i - (ticks - 1) / 2) * size * 0.6;
        tickPositions.push(
          size * 1.15, offset - tickLength * 0.5, 0,
          size * 1.15, offset + tickLength * 0.5, 0
        );
      }
      const tickGeometry = new THREE.BufferGeometry();
      tickGeometry.setAttribute('position', new THREE.Float32BufferAttribute(tickPositions, 3));
      const tickLine = new THREE.LineSegments(tickGeometry, signalMaterials.microTick);
      group.add(tickLine);
    }
    return group;
  }

  function addPolygon(lines, radius, sides) {
    const points = [];
    for (let i = 0; i < sides; i += 1) {
      const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
      points.push([Math.cos(angle) * radius, Math.sin(angle) * radius]);
    }
    for (let i = 0; i < points.length; i += 1) {
      const [x1, y1] = points[i];
      const [x2, y2] = points[(i + 1) % points.length];
      lines.push([x1, y1, 0], [x2, y2, 0]);
    }
  }

  function addRadials(lines, radius, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
      lines.push([0, 0, 0], [Math.cos(angle) * radius, Math.sin(angle) * radius, 0]);
    }
  }

  function addParallelBars(lines, width, height) {
    const gap = height / 3;
    for (let i = -1; i <= 1; i += 1) {
      const y = i * gap;
      lines.push([-width * 0.5, y, 0], [width * 0.5, y, 0]);
    }
  }

  function addRect(lines, width, height, offsetX = 0, offsetY = 0) {
    const w = width * 0.5;
    const h = height * 0.5;
    const x0 = offsetX - w;
    const x1 = offsetX + w;
    const y0 = offsetY - h;
    const y1 = offsetY + h;
    lines.push([x0, y0, 0], [x1, y0, 0]);
    lines.push([x1, y0, 0], [x1, y1, 0]);
    lines.push([x1, y1, 0], [x0, y1, 0]);
    lines.push([x0, y1, 0], [x0, y0, 0]);
  }

  function addTriangle(lines, size) {
    const h = size * 0.9;
    const w = size;
    const p1 = [0, h * 0.55];
    const p2 = [-w * 0.5, -h * 0.45];
    const p3 = [w * 0.5, -h * 0.45];
    lines.push([p1[0], p1[1], 0], [p2[0], p2[1], 0]);
    lines.push([p2[0], p2[1], 0], [p3[0], p3[1], 0]);
    lines.push([p3[0], p3[1], 0], [p1[0], p1[1], 0]);
  }

  function addCircle(lines, radius, segments, offsetX = 0, offsetY = 0) {
    let prev = null;
    for (let i = 0; i <= segments; i += 1) {
      const angle = (Math.PI * 2 * i) / segments;
      const point = [Math.cos(angle) * radius + offsetX, Math.sin(angle) * radius + offsetY];
      if (prev) {
        lines.push([prev[0], prev[1], 0], [point[0], point[1], 0]);
      }
      prev = point;
    }
  }

  function addPlus(lines, size, thickness) {
    const half = size * 0.5;
    const t = thickness * 0.5;
    addRect(lines, thickness, size, 0, 0);
    addRect(lines, size, thickness, 0, 0);
    lines.push([-t, half, 0], [t, half, 0]);
  }

  function setBaseLights() {
    const ambient = new THREE.AmbientLight(activePalette.lightAmbient, 0.35);
    const key = new THREE.DirectionalLight(activePalette.lightKey, 1.0);
    key.position.set(80, 140, 120);
    const fill = new THREE.DirectionalLight(activePalette.lightFill, 0.25);
    fill.position.set(-90, 60, 80);
    const rim = new THREE.DirectionalLight(activePalette.icon, 0.35);
    rim.position.set(-120, 90, -140);
    scene.add(ambient, key, fill, rim);
    state.lights.ambient = ambient;
    state.lights.key = key;
    state.lights.fill = fill;
    state.lights.rim = rim;
  }

  function normalizeScene(group) {
    const scaleTarget = 120;
    const box = new THREE.Box3().setFromObject(group);
    const size = box.getSize(new THREE.Vector3());
    const maxSide = Math.max(size.x, size.y) || 1;
    const scale = scaleTarget / maxSide;

    group.scale.set(scale, -scale, scale);
    group.rotation.x = -Math.PI / 2;

    group.updateMatrixWorld(true);
    const centeredBox = new THREE.Box3().setFromObject(group);
    const center = centeredBox.getCenter(new THREE.Vector3());
    group.position.sub(center);
    group.updateMatrixWorld(true);

    const finalBox = new THREE.Box3().setFromObject(group);
    group.position.y -= finalBox.min.y;
    group.updateMatrixWorld(true);

    state.sceneSize = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
    state.sceneBounds = new THREE.Box3().setFromObject(group);
  }

  function updateZoneCenters() {
    zoneCenters.clear();
    zoneVisuals.forEach((visuals, zoneId) => {
      const box = new THREE.Box3().setFromObject(visuals.group);
      const center = box.getCenter(new THREE.Vector3());
      visuals.center = center;
      updatePlateMetrics(visuals);
      zoneCenters.set(zoneId, center);
    });
  }

  function updatePlateMetrics(visuals) {
    if (!visuals?.plates?.length) return;
    const plateBox = new THREE.Box3();
    plateBox.makeEmpty();
    const corners = [
      new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(),
      new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()
    ];
    visuals.plates.forEach((mesh) => {
      const geometry = mesh.geometry;
      if (!geometry) return;
      if (!geometry.boundingBox) geometry.computeBoundingBox();
      const meshBox = geometry.boundingBox;
      if (!meshBox) return;
      const { min, max } = meshBox;
      mesh.updateMatrix();
      corners[0].set(min.x, min.y, min.z);
      corners[1].set(min.x, min.y, max.z);
      corners[2].set(min.x, max.y, min.z);
      corners[3].set(min.x, max.y, max.z);
      corners[4].set(max.x, min.y, min.z);
      corners[5].set(max.x, min.y, max.z);
      corners[6].set(max.x, max.y, min.z);
      corners[7].set(max.x, max.y, max.z);
      corners.forEach((corner) => {
        corner.applyMatrix4(mesh.matrix);
        plateBox.expandByPoint(corner);
      });
    });
    if (plateBox.isEmpty()) return;
    visuals.plateCenter = plateBox.getCenter(new THREE.Vector3());
    visuals.plateSize = plateBox.getSize(new THREE.Vector3());
    visuals.plateTop = plateBox.max.z;
  }

  function updateModuleSignals() {
    zoneVisuals.forEach((_, zoneId) => {
      buildModulePips(zoneId);
    });
    updateMicrodotsForSelection();
    requestRender();
  }

  function updateCameraLimits() {
    const maxSide = Math.max(state.sceneSize.x, state.sceneSize.z) || 1;
    state.cameraLimits.minRadius = Math.max(40, maxSide * CAMERA_ZOOM.minFactor + CAMERA_ZOOM.minPadding);
    state.cameraLimits.maxRadius = Math.max(
      state.cameraLimits.minRadius + 40,
      maxSide * CAMERA_ZOOM.maxFactor + CAMERA_ZOOM.maxPadding
    );
  }

  function getZoneScreenPosition(zoneId) {
    if (!zoneId || !activeCamera || !rootEl) return null;
    const visuals = zoneVisuals.get(zoneId);
    let vector;
    if (visuals?.anchor) {
      vector = new THREE.Vector3();
      visuals.anchor.getWorldPosition(vector);
    } else {
      const center = zoneCenters.get(zoneId);
      if (!center) return null;
      vector = center.clone();
    }
    vector.project(activeCamera);
    if (!Number.isFinite(vector.x) || !Number.isFinite(vector.y) || !Number.isFinite(vector.z)) return null;
    if (vector.z < -1 || vector.z > 1) return null;
    const rect = rootEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = (vector.x * 0.5 + 0.5) * rect.width + rect.left;
    const y = (-vector.y * 0.5 + 0.5) * rect.height + rect.top;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  }

  function buildPulseRing() {
    const geometry = new THREE.RingGeometry(0.5, 0.9, 48);
    const material = new THREE.MeshBasicMaterial({
      color: activePalette.edgeStrong,
      transparent: true,
      opacity: 0
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.2;
    ring.visible = false;
    ring.userData.ignoreRaycast = true;
    state.pulse.mesh = ring;
    scene.add(ring);
  }

  function setHoverZone(zoneId) {
    if (state.hoveredZoneId === zoneId) return;
    state.hoveredZoneId = zoneId;
    updateMaterials(state.selectedZoneId);
    requestRender();
  }

  function setHoveredPip(zoneId, moduleId) {
    const nextKey = zoneId && moduleId ? `${zoneId}:${moduleId}` : null;
    if (state.hoveredModuleKey === nextKey) return;
    const prevKey = state.hoveredModuleKey;
    state.hoveredModuleKey = nextKey;
    if (prevKey) applyPipHover(prevKey, false);
    if (nextKey) applyPipHover(nextKey, true);
    requestRender();
  }

  function applyPipHover(key, isHovered) {
    const entry = pipLookup.get(key);
    if (!entry) return;
    const boost = isHovered ? 0.18 : 0;
    if (entry.line) {
      entry.line.material.opacity = clamp(entry.baseLineOpacity + boost, 0, 1);
    }
    if (entry.fill) {
      entry.fill.material.opacity = clamp(entry.baseFillOpacity + boost * 0.6, 0, 1);
    }
  }

  function selectZoneFromEvent(event) {
    return selectZoneFromPoint(event.clientX, event.clientY);
  }

  function selectZoneFromPoint(clientX, clientY) {
    const rect = renderer?.domElement?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return null;
    pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, activeCamera || camera);
    const pipHits = raycaster.intersectObjects(pipTargets, false);
    if (pipHits.length) {
      const pipHit = pipHits[0]?.object?.userData;
      if (pipHit?.zoneId && pipHit?.moduleId) {
        if (onSelectModule) onSelectModule(pipHit.zoneId, pipHit.moduleId);
        if (pipHit.zoneId !== state.selectedZoneId && onSelect) {
          onSelect(pipHit.zoneId);
        }
        return pipHit.zoneId;
      }
    }
    const hits = raycaster.intersectObjects(clickable, false);
    if (!hits.length) return null;
    const hit = hits[0].object;
    const zoneId = hit.userData.zoneId;
    if (zoneId && onSelect) onSelect(zoneId);
    return zoneId || null;
  }

  function updateHoverFromEvent(event) {
    if (!state.supportsHover || event.pointerType === 'touch') return;
    const rect = renderer?.domElement?.getBoundingClientRect();
    if (!rect || !rect.width || !rect.height) return;
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, activeCamera || camera);
    const pipHits = raycaster.intersectObjects(pipTargets, false);
    if (pipHits.length) {
      const pipHit = pipHits[0]?.object?.userData;
      if (pipHit?.zoneId && pipHit?.moduleId) {
        setHoveredPip(pipHit.zoneId, pipHit.moduleId);
        setHoverZone(null);
        return;
      }
    }
    setHoveredPip(null, null);
    const hits = raycaster.intersectObjects(clickable, false);
    if (!hits.length) {
      setHoverZone(null);
      return;
    }
    const zoneId = hits[0].object?.userData?.zoneId || null;
    setHoverZone(zoneId);
  }

  function beginTouchDrag(event) {
    state.drag.pending = false;
    state.drag.active = true;
    state.drag.moved = false;
    state.drag.startX = event.clientX;
    state.drag.startY = event.clientY;
    state.drag.lastX = event.clientX;
    state.drag.lastY = event.clientY;
    state.drag.pointerId = event.pointerId;
    state.drag.pointerType = event.pointerType || 'touch';
    if (state.drag.timer) window.clearTimeout(state.drag.timer);
    state.drag.timer = null;
    const { yaw, pitch, radius } = getCameraSpherical();
    state.drag.yaw = yaw;
    state.drag.pitch = pitch;
    state.drag.radius = radius;
    requestRender(true);
  }

  function bindEvents(canvas) {
    const onPointerDown = (event) => {
      if (event.pointerType === 'touch') {
        activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (activeTouches.size === 2) {
          const distance = getTouchDistance();
          if (distance > 0) {
            state.pinch.active = true;
            state.pinch.startDistance = distance;
            state.pinch.startRadius = getCameraSpherical().radius;
            state.drag.active = false;
            state.drag.pending = false;
            state.drag.moved = true;
          }
          requestRender(true);
          return;
        }
      }
      if (event.pointerType !== 'touch' && event.button === 2) {
        canvas.setPointerCapture(event.pointerId);
        state.pan.active = true;
        state.pan.startX = event.clientX;
        state.pan.startY = event.clientY;
        state.pan.pointerId = event.pointerId;
        state.pan.startLookAt = state.lookAt.clone();
        state.pan.startPos = activeCamera.position.clone();
        requestRender(true);
        return;
      }
      if (event.pointerType !== 'touch' && event.button !== 0) return;
      canvas.setPointerCapture(event.pointerId);
      if (event.pointerType === 'touch') {
        if (state.pinch.active) return;
        beginTouchDrag(event);
        return;
      }
      const { yaw, pitch, radius } = getCameraSpherical();
      state.drag.active = true;
      state.drag.pending = false;
      state.drag.moved = false;
      state.drag.startX = event.clientX;
      state.drag.startY = event.clientY;
      state.drag.pointerId = event.pointerId;
      state.drag.pointerType = event.pointerType || 'mouse';
      state.drag.yaw = yaw;
      state.drag.pitch = pitch;
      state.drag.radius = radius;
      requestRender(true);
    };

    const onPointerMove = (event) => {
      if (event.pointerType === 'touch') {
        if (activeTouches.has(event.pointerId)) {
          activeTouches.set(event.pointerId, { x: event.clientX, y: event.clientY });
        }
        if (state.pinch.active) {
          const distance = getTouchDistance();
          if (distance > 0) {
            const scale = state.pinch.startDistance / distance;
            const { yaw, pitch } = getCameraSpherical();
            const nextRadius = clampCameraRadius(state.pinch.startRadius * scale);
            setCameraFromSpherical(yaw, pitch, nextRadius);
            requestRender(true);
          }
          return;
        }
      }
      if (state.pan.active && event.pointerId === state.pan.pointerId) {
        const dx = event.clientX - state.pan.startX;
        const dy = event.clientY - state.pan.startY;
        const offset = getPanOffset(dx, dy);
        const nextLookAt = state.pan.startLookAt.clone().add(offset);
        clampLookAtToBounds(nextLookAt);
        const nextPos = state.pan.startPos.clone().add(nextLookAt.clone().sub(state.pan.startLookAt));
        state.lookAt.copy(nextLookAt);
        activeCamera.position.copy(nextPos);
        activeCamera.lookAt(state.lookAt);
        requestRender(true);
        return;
      }
      if (state.drag.pending && event.pointerId === state.drag.pointerId) {
        const dx = event.clientX - state.drag.startX;
        const dy = event.clientY - state.drag.startY;
        state.drag.lastX = event.clientX;
        state.drag.lastY = event.clientY;
        const threshold = event.pointerType === 'touch' ? TOUCH_MOVE_THRESHOLD : POINTER_MOVE_THRESHOLD;
        if (Math.abs(dx) > threshold || Math.abs(dy) > threshold) {
          state.drag.moved = true;
        }
        return;
      }
      if (!state.drag.active) return;
      const dx = event.clientX - state.drag.startX;
      const dy = event.clientY - state.drag.startY;
      const threshold = event.pointerType === 'touch' ? TOUCH_MOVE_THRESHOLD : POINTER_MOVE_THRESHOLD;
      if (!state.drag.moved) {
        if (Math.abs(dx) <= threshold && Math.abs(dy) <= threshold) {
          return;
        }
        state.drag.moved = true;
      }
      const yaw = state.drag.yaw - dx * 0.006;
      const pitch = clamp(state.drag.pitch - dy * 0.006, 0.15, 1.25);
      setCameraFromSpherical(yaw, pitch, state.drag.radius);
      requestRender(true);
    };

    const onPointerUp = (event) => {
      canvas.releasePointerCapture(event.pointerId);
      const isTouch = event.pointerType === 'touch';
      if (isTouch) {
        activeTouches.delete(event.pointerId);
        if (state.pinch.active && activeTouches.size < 2) {
          state.pinch.active = false;
          state.pinch.startDistance = 0;
          state.pinch.startRadius = 0;
          state.drag.active = false;
          state.drag.pending = false;
          state.drag.pointerId = null;
        }
      }
      const isTap =
        isTouch &&
        !state.pinch.active &&
        !state.drag.moved &&
        state.drag.pointerId === event.pointerId;
      if (state.pan.active && event.pointerId === state.pan.pointerId) {
        state.pan.active = false;
        state.pan.pointerId = null;
        return;
      }
      if (state.drag.pending && event.pointerId === state.drag.pointerId) {
        if (state.drag.timer) window.clearTimeout(state.drag.timer);
        state.drag.timer = null;
        const wasMoved = state.drag.moved;
        state.drag.pending = false;
        state.drag.moved = false;
        state.drag.pointerId = null;
        if (wasMoved) return;
        selectZoneFromEvent(event);
        if (state.drag.pointerType === 'touch') {
          handleTouchTap(event);
        }
        return;
      }
      if (!state.drag.active) return;
      const wasMoved = state.drag.moved;
      const wasTouch = state.drag.pointerType === 'touch';
      state.drag.active = false;
      state.drag.moved = false;
      state.drag.pointerId = null;
      if (wasTouch) {
        if (!wasMoved || isTap) {
          selectZoneFromEvent(event);
          handleTouchTap(event);
        }
        return;
      }
      if (wasMoved) return;
      selectZoneFromEvent(event);
    };

    const onPointerLeave = () => {
      state.drag.active = false;
      state.drag.pending = false;
      if (state.drag.timer) window.clearTimeout(state.drag.timer);
      state.drag.timer = null;
      state.drag.pointerId = null;
      state.pan.active = false;
      state.pan.pointerId = null;
      state.pinch.active = false;
      state.pinch.startDistance = 0;
      state.pinch.startRadius = 0;
      activeTouches.clear();
      setHoverZone(null);
      setHoveredPip(null, null);
    };

    const onTouchEnd = (event) => {
      if (state.pinch.active || state.drag.moved) return;
      const touch = event.changedTouches?.[0];
      if (!touch) return;
      selectZoneFromPoint(touch.clientX, touch.clientY);
    };

    const onPointerCancel = (event) => {
      if (event.pointerType === 'touch') {
        activeTouches.delete(event.pointerId);
      }
      state.drag.active = false;
      state.drag.pending = false;
      state.drag.pointerId = null;
      state.pan.active = false;
      state.pan.pointerId = null;
      state.pinch.active = false;
      state.pinch.startDistance = 0;
      state.pinch.startRadius = 0;
      setHoveredPip(null, null);
      requestRender(true);
    };

    const onPointerHover = (event) => {
      if (state.drag.active || state.drag.pending) return;
      updateHoverFromEvent(event);
    };

    const onDoubleClick = (event) => {
      if (state.drag.active || state.drag.pending) return;
      event.preventDefault();
      onToggleFullscreen?.();
    };

    const onWheel = (event) => {
      if (!state.isActive || state.drag.active || state.drag.pending) return;
      event.preventDefault();
      const { yaw, pitch, radius } = getCameraSpherical();
      const delta = Math.sign(event.deltaY || 0);
      const zoomFactor = 1 + Math.min(Math.abs(event.deltaY), 120) * CAMERA_ZOOM.wheelSpeed;
      const nextRadius = clampCameraRadius(
        delta > 0 ? radius * zoomFactor : radius / zoomFactor
      );
      setCameraFromSpherical(yaw, pitch, nextRadius);
      requestRender(true);
    };

    const onContextMenu = (event) => {
      event.preventDefault();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerLeave);
    canvas.addEventListener('pointercancel', onPointerCancel);
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });
    canvas.addEventListener('pointermove', onPointerHover);
    canvas.addEventListener('dblclick', onDoubleClick);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('contextmenu', onContextMenu);

    boundEvents.push(
      { target: canvas, type: 'pointerdown', handler: onPointerDown },
      { target: canvas, type: 'pointermove', handler: onPointerMove },
      { target: canvas, type: 'pointerup', handler: onPointerUp },
      { target: canvas, type: 'pointerleave', handler: onPointerLeave },
      { target: canvas, type: 'pointercancel', handler: onPointerCancel },
      { target: canvas, type: 'touchend', handler: onTouchEnd, options: { passive: true } },
      { target: canvas, type: 'pointermove', handler: onPointerHover },
      { target: canvas, type: 'dblclick', handler: onDoubleClick },
      { target: canvas, type: 'wheel', handler: onWheel, options: { passive: false } },
      { target: canvas, type: 'contextmenu', handler: onContextMenu }
    );
  }

  function getPanOffset(dx, dy) {
    if (!activeCamera?.isPerspectiveCamera) return new THREE.Vector3();
    const rect = renderer?.domElement?.getBoundingClientRect();
    const height = rect?.height || 1;
    const distance = state.pan.startPos.clone().sub(state.pan.startLookAt).length();
    const fov = THREE.MathUtils.degToRad(activeCamera.fov);
    const scale = (2 * Math.tan(fov * 0.5) * distance) / height;
    const offsetX = -dx * scale;
    const offsetY = dy * scale;
    const quaternion = new THREE.Quaternion();
    activeCamera.getWorldQuaternion(quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion);
    return new THREE.Vector3()
      .addScaledVector(right, offsetX)
      .addScaledVector(up, offsetY);
  }

  function getTouchDistance() {
    if (activeTouches.size < 2) return 0;
    const points = Array.from(activeTouches.values());
    const dx = points[0].x - points[1].x;
    const dy = points[0].y - points[1].y;
    return Math.hypot(dx, dy);
  }

  function clampLookAtToBounds(target) {
    if (!state.sceneBounds || state.sceneBounds.isEmpty()) return;
    const padding = 6;
    target.x = clamp(target.x, state.sceneBounds.min.x - padding, state.sceneBounds.max.x + padding);
    target.z = clamp(target.z, state.sceneBounds.min.z - padding, state.sceneBounds.max.z + padding);
    target.y = clamp(target.y, state.sceneBounds.min.y, state.sceneBounds.max.y + padding);
  }

  function handleTouchTap(event) {
    const now = performance.now();
    const dx = event.clientX - state.tap.lastX;
    const dy = event.clientY - state.tap.lastY;
    const isDoubleTap = (now - state.tap.lastTime < 320) && ((dx * dx + dy * dy) < 24 * 24);
    state.tap.lastTime = now;
    state.tap.lastX = event.clientX;
    state.tap.lastY = event.clientY;
    if (isDoubleTap) {
      onToggleFullscreen?.();
    }
  }

  function setSelection(zoneId) {
    const prevSelected = state.selectedZoneId;
    state.selectedZoneId = zoneId;
    updateMaterials(zoneId);
    updateMicrodotsForSelection();
    if (zoneId && zoneId !== prevSelected) {
      triggerPulse(zoneId);
      setLiftTarget(zoneId, true);
      if (prevSelected) setLiftTarget(prevSelected, false);
    }
    requestRender(true);
  }

  function setActiveModule(zoneId, moduleId) {
    if (!zoneId) return;
    state.activeModuleByZone = { ...state.activeModuleByZone, [zoneId]: moduleId };
    updateMicrodotsForSelection();
    requestRender();
  }

  function setActiveModules(activeModules = {}) {
    state.activeModuleByZone = { ...activeModules };
    updateMicrodotsForSelection();
    requestRender();
  }

  function setZonesData(zonesData = {}) {
    state.zonesData = zonesData || {};
    state.hasDynamicLEDs = Object.values(state.zonesData).some((zone) => {
      const status = String(zone?.status || 'normal').toLowerCase();
      return status === 'alert' || status === 'lockdown';
    });
    const ledScale = activeVisualMode.ledScale * state.ledScaleMultiplier;
    zoneVisuals.forEach((visuals, zoneId) => {
      const status = state.zonesData[zoneId]?.status || 'normal';
      visuals.status = status;
      if (visuals.led) {
        const color = getLedColor(status);
        visuals.led.material.color.set(color);
        visuals.led.material.emissive.set(color);
        visuals.led.material.emissiveIntensity = 0.4 * ledScale;
        visuals.led.material.opacity = 0.65;
        visuals.led.scale.setScalar(state.ledScaleMultiplier);
      }
    });
    updateModuleSignals();
    setHoveredPip(null, null);
    updateMaterials(state.selectedZoneId);
    requestRender();
  }

  function setPalette(paletteKey = 'standard') {
    if (!PALETTES[paletteKey]) return;
    activePaletteKey = paletteKey;
    activePalette = PALETTES[paletteKey];
    applyPaletteToMaterials();
    requestRender();
  }

  function applyPaletteToMaterials() {
    materialCache.base.color.set(activePalette.base);
    materialCache.base.emissive.set(activePalette.emissiveBase);
    materialCache.plate.color.set(activePalette.plate);
    materialCache.plate.emissive.set(activePalette.emissivePlate);
    materialCache.edgeStrong.color.set(activePalette.edgeStrong);
    materialCache.edgeDim.color.set(activePalette.edgeDim);
    materialCache.icon.color.set(activePalette.icon);

    zoneVisuals.forEach((visuals) => {
      visuals.meshes.forEach((mesh) => {
        mesh.material.color.set(activePalette.base);
        mesh.material.emissive.set(activePalette.emissiveBase);
      });
      visuals.plates.forEach((mesh) => {
        mesh.material.color.set(activePalette.plate);
        mesh.material.emissive.set(activePalette.emissivePlate);
      });
      visuals.edgesStrong.forEach((edge) => {
        edge.material.color.set(activePalette.edgeStrong);
      });
      visuals.edgesDim.forEach((edge) => {
        edge.material.color.set(activePalette.edgeDim);
      });
      if (visuals.icon) {
        visuals.icon.material.color.set(activePalette.icon);
      }
      if (visuals.led) {
        const color = getLedColor(visuals.status);
        visuals.led.material.color.set(color);
        visuals.led.material.emissive.set(color);
      }
      if (visuals.moduleRing) {
        visuals.moduleRing.material.color.set(activePalette.edgeDim);
      }
      visuals.modulePipEntries.forEach((entry) => {
        const lineColor = entry.available ? activePalette.edgeStrong : activePalette.edgeDim;
        entry.line?.material?.color?.set(lineColor);
        if (entry.fill) {
          entry.fill.material.color.set(activePalette.edgeStrong);
          entry.fill.material.emissive.set(activePalette.edgeStrong);
        }
      });
    });

    if (state.pulse.mesh) {
      state.pulse.mesh.material.color.set(activePalette.edgeStrong);
    }

    signalMaterials.microSolid.color.set(activePalette.edgeStrong);
    signalMaterials.microLine.color.set(activePalette.edgeDim);
    signalMaterials.microTick.color.set(activePalette.edgeDim);
    signalMaterials.pipFill.color.set(activePalette.edgeStrong);
    signalMaterials.pipFill.emissive.set(activePalette.edgeStrong);
    signalMaterials.ring.color.set(activePalette.edgeDim);

    if (state.lights.ambient) state.lights.ambient.color.set(activePalette.lightAmbient);
    if (state.lights.key) state.lights.key.color.set(activePalette.lightKey);
    if (state.lights.fill) state.lights.fill.color.set(activePalette.lightFill);
    if (state.lights.rim) state.lights.rim.color.set(activePalette.icon);
    if (scene?.fog) scene.fog.color.set(activePalette.base);
  }

  function setVisualMode(modeKey = 'subtle') {
    if (!VISUAL_MODES[modeKey]) return;
    activeVisualModeKey = modeKey;
    activeVisualMode = VISUAL_MODES[modeKey];
    selectionLiftOffset = activeVisualMode.liftOffset;
    state.pulse.config = {
      duration: activeVisualMode.pulseDuration,
      scaleTo: activeVisualMode.pulseScaleTo,
      opacity: activeVisualMode.pulseOpacity
    };
    materialCache.base.roughness = activeVisualMode.baseRoughness;
    materialCache.base.metalness = activeVisualMode.baseMetalness;
    materialCache.plate.roughness = activeVisualMode.plateRoughness;
    materialCache.plate.metalness = activeVisualMode.plateMetalness;
    zoneVisuals.forEach((visuals) => {
      visuals.meshes.forEach((mesh) => {
        mesh.material.roughness = activeVisualMode.baseRoughness;
        mesh.material.metalness = activeVisualMode.baseMetalness;
      });
      visuals.plates.forEach((mesh) => {
        mesh.material.roughness = activeVisualMode.plateRoughness;
        mesh.material.metalness = activeVisualMode.plateMetalness;
      });
      if (visuals.led) {
        visuals.led.material.emissiveIntensity = 0.4 * activeVisualMode.ledScale;
        visuals.led.material.opacity = 0.65;
      }
    });
    updateMaterials(state.selectedZoneId);
    if (bloomPass) {
      bloomPass.strength = activeVisualMode.bloomStrength;
      bloomPass.radius = activeVisualMode.bloomRadius;
      bloomPass.threshold = activeVisualMode.bloomThreshold;
    }
    requestRender();
  }

  function focusZone(zoneId, options = {}) {
    const target = zoneCenters.get(zoneId);
    if (!target) return;
    const delay = typeof options.delay === 'number' ? options.delay : 150;
    const immediate = Boolean(options.immediate);

    if (immediate) {
      applyCameraFocus(target, 0);
      requestRender(true);
      return;
    }

    window.setTimeout(() => {
      applyCameraFocus(target, options.duration);
      requestRender(true);
    }, delay);
  }

  function flyOff(options = {}) {
    const delay = typeof options.delay === 'number' ? options.delay : 150;
    window.setTimeout(() => {
      applyCameraFlyOff(options.duration);
      requestRender(true);
    }, delay);
    onFlyOff?.();
  }

  function resetCamera(options = {}) {
    const immediate = options.immediate !== false;
    activeCamera = camera;
    state.cameraAnim = null;
    activeCamera.position.copy(state.defaultCameraPos);
    state.lookAt.copy(state.defaultLookAt);
    activeCamera.lookAt(state.lookAt);
    if (!immediate) {
      applyCameraFlyOff(options.duration);
    }
    requestRender(true);
  }

  function applyCameraFocus(target, duration = 1300) {
    const distance = Math.max(state.sceneSize.x, state.sceneSize.z) * 0.45 + 22;
    const angle = Math.atan2(target.x, target.z) + 0.35;
    const direction = new THREE.Vector3(Math.sin(angle), 0.6, Math.cos(angle)).normalize();
    const nextPos = target.clone().add(direction.multiplyScalar(distance));
    nextPos.y = Math.max(nextPos.y, distance * 0.35);
    activateMainCamera();

    if (duration === 0) {
      activeCamera.position.copy(nextPos);
      state.lookAt.copy(target);
      activeCamera.lookAt(state.lookAt);
      return;
    }

    state.cameraAnim = {
      start: performance.now(),
      duration,
      fromPos: activeCamera.position.clone(),
      toPos: nextPos,
      fromTarget: state.lookAt.clone(),
      toTarget: target.clone()
    };
  }

  function applyCameraFlyOff(duration = 1400) {
    activateMainCamera();
    state.cameraAnim = {
      start: performance.now(),
      duration,
      fromPos: activeCamera.position.clone(),
      toPos: state.defaultCameraPos.clone(),
      fromTarget: state.lookAt.clone(),
      toTarget: state.defaultLookAt.clone()
    };
  }

  function triggerPulse(zoneId) {
    const pulse = state.pulse.mesh;
    if (!pulse) return;
    const target = zoneCenters.get(zoneId);
    if (!target) return;
    pulse.visible = true;
    pulse.position.x = target.x;
    pulse.position.z = target.z;
    state.pulse.start = performance.now();
    state.pulse.active = true;
    pulse.material.opacity = state.pulse.config.opacity;
    pulse.scale.set(0.6, 0.6, 0.6);
    requestRender(true);
  }

  function updateMaterials(selectedZoneId) {
    zoneVisuals.forEach((visuals, zoneId) => {
      const isSelected = zoneId === selectedZoneId;
      const isHovered = !isSelected && zoneId === state.hoveredZoneId;
      const baseBoost = isSelected
        ? activeVisualMode.baseBoostSelected
        : isHovered
          ? activeVisualMode.baseBoostHover
          : activeVisualMode.baseBoost;
      const plateBoost = isSelected
        ? activeVisualMode.plateBoostSelected
        : isHovered
          ? activeVisualMode.plateBoostHover
          : activeVisualMode.plateBoost;
      const edgeOpacity = isSelected
        ? activeVisualMode.edgeOpacitySelected
        : isHovered
          ? activeVisualMode.edgeOpacityHover
          : activeVisualMode.edgeOpacity;
      const iconOpacity = isSelected
        ? activeVisualMode.iconOpacitySelected
        : isHovered
          ? activeVisualMode.iconOpacityHover
          : activeVisualMode.iconOpacity;

      visuals.meshes.forEach((mesh) => {
        mesh.material.emissiveIntensity = baseBoost;
        mesh.material.opacity = 1;
      });
      visuals.plates.forEach((mesh) => {
        mesh.material.emissiveIntensity = plateBoost;
        mesh.material.opacity = 1;
      });
      visuals.edgesStrong.forEach((edge) => {
        edge.material.opacity = edgeOpacity;
      });
      visuals.edgesDim.forEach((edge) => {
        edge.material.opacity = edgeOpacity * 0.7;
      });
      if (visuals.icon) {
        visuals.icon.material.opacity = iconOpacity;
      }
      visuals.baseBoost = baseBoost;
      visuals.plateBoost = plateBoost;
    });
  }

  function updateStatusLEDs(time) {
    if (!state.hasDynamicLEDs) return;
    const ledScale = activeVisualMode.ledScale * state.ledScaleMultiplier;
    zoneVisuals.forEach((visuals) => {
      if (!visuals.led) return;
      const status = String(visuals.status || 'normal').toLowerCase();
      const material = visuals.led.material;
      let intensity = 0.4 * ledScale;
      let opacity = 0.65;
      if (status === 'alert') {
        const phase = time * 0.0055;
        const pulse = 0.5 + 0.5 * Math.sin(phase * Math.PI * 2);
        intensity = (0.35 + pulse * 0.45) * ledScale;
        opacity = 0.5 + pulse * 0.35;
      } else if (status === 'lockdown') {
        const phase = time * 0.008;
        const pulseA = Math.max(0, Math.sin(phase * Math.PI * 2));
        const pulseB = Math.max(0, Math.sin((phase * Math.PI * 2) + 1.6)) * 0.6;
        const pulse = Math.min(1, pulseA + pulseB);
        intensity = (0.35 + pulse * 0.55) * ledScale;
        opacity = 0.45 + pulse * 0.4;
      }
      material.emissiveIntensity = intensity;
      material.opacity = opacity;
    });
  }

  function updateIdleGlow(time) {
    zoneVisuals.forEach((visuals) => {
      const base = visuals.baseBoost ?? activeVisualMode.baseBoost;
      const plate = visuals.plateBoost ?? activeVisualMode.plateBoost;
      const isSelected = visuals.group?.userData?.zoneId === state.selectedZoneId;
      const pulse = Math.sin(time * activeVisualMode.idleSpeed + (visuals.seed || 0));
      const glow = isSelected ? 0 : pulse * activeVisualMode.idleGlow;

      visuals.meshes.forEach((mesh) => {
        mesh.material.emissiveIntensity = base + glow;
      });
      visuals.plates.forEach((mesh) => {
        mesh.material.emissiveIntensity = plate + glow * 1.1;
      });
      if (visuals.icon) {
        if (isSelected) {
          visuals.icon.rotation.z = visuals.icon.userData.baseRotation || 0;
        } else {
          const wobble = Math.sin(time * activeVisualMode.iconSpeed + (visuals.seed || 0));
          visuals.icon.rotation.z = (visuals.icon.userData.baseRotation || 0) + wobble * activeVisualMode.iconWobble;
        }
      }
    });
  }

  function resize() {
    if (!renderer || !camera) return;
    const width = rootEl?.clientWidth || renderer.domElement.clientWidth || 1;
    const height = rootEl?.clientHeight || renderer.domElement.clientHeight || 1;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    renderer.setSize(width, height, false);
    composer?.setSize(width, height);
    if (bloomPass) {
      bloomPass.setSize(width, height);
    }
    updateLedScale();
    if (camera?.isPerspectiveCamera) {
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }
    requestRender();
  }

  function updateLedScale() {
    const isMobile = Boolean(window.matchMedia && window.matchMedia('(max-width: 900px)').matches);
    const nextScale = isMobile ? 1.35 : 1;
    if (state.ledScaleMultiplier === nextScale) return;
    state.ledScaleMultiplier = nextScale;
    zoneVisuals.forEach((visuals) => {
      if (visuals.led) {
        visuals.led.scale.setScalar(state.ledScaleMultiplier);
      }
    });
  }

  function animate() {
    if (!state.isActive) {
      stopLoop();
      return;
    }
    const shouldAnimate =
      Boolean(state.cameraAnim) ||
      state.pulse.active ||
      hasActiveLifts() ||
      state.drag.active ||
      state.hasDynamicLEDs ||
      activeVisualMode.idleGlow > 0;
    const shouldRender = state.needsRender || shouldAnimate;
    if (!shouldRender) {
      stopLoop();
      return;
    }
    animationFrame = window.requestAnimationFrame(animate);
    const now = performance.now();

    if (state.cameraAnim) {
      const { start, duration, fromPos, toPos, fromTarget, toTarget, onUpdate, onComplete } = state.cameraAnim;
      const t = Math.min((now - start) / duration, 1);
      const eased = easeInOutExpo(t);
      activeCamera.position.lerpVectors(fromPos, toPos, eased);
      state.lookAt.lerpVectors(fromTarget, toTarget, eased);
      activeCamera.lookAt(state.lookAt);
      onUpdate?.(eased);
      if (t >= 1) {
        state.cameraAnim = null;
        onComplete?.();
      }
    }

    if (composer?.passes?.length) {
      composer.passes[0].camera = activeCamera || camera;
    }

    if (state.pulse.active && state.pulse.mesh) {
      const elapsed = now - state.pulse.start;
      const { duration, scaleTo, opacity } = state.pulse.config;
      const progress = Math.min(elapsed / duration, 1);
      const scale = 0.6 + progress * (scaleTo - 0.6);
      state.pulse.mesh.scale.set(scale, scale, scale);
      state.pulse.mesh.material.opacity = opacity * (1 - progress);
      if (progress >= 1) {
        state.pulse.active = false;
        state.pulse.mesh.visible = false;
      }
    }

    updateSelectionLift(now);
    updateStatusLEDs(now);
    mcpBridge?.update?.();
    if (composer) {
      composer.render();
    } else {
      renderer.render(scene, activeCamera || camera);
    }
    state.needsRender = false;
    if (!shouldAnimate) {
      stopLoop();
    }
  }

  function hasActiveLifts() {
    for (const visuals of zoneVisuals.values()) {
      if (visuals.lift && visuals.lift.from !== visuals.lift.to) return true;
    }
    return false;
  }

  function requestRender(forceContinuous = false) {
    state.needsRender = true;
    if (forceContinuous) {
      state.isActive = true;
    }
    startLoop();
  }

  function startLoop() {
    if (!renderer || !state.isActive || isAnimating) return;
    isAnimating = true;
    animationFrame = window.requestAnimationFrame(animate);
  }

  function stopLoop() {
    if (animationFrame) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    isAnimating = false;
  }

  function setActive(isActive) {
    state.isActive = Boolean(isActive);
    if (!state.isActive) {
      stopLoop();
      return;
    }
    requestRender();
  }

  function resolveZoneId(node) {
    let current = node;
    while (current) {
      if (current.id && current.id.startsWith('zone_')) {
        if (current.id.endsWith('_anchor')) {
          current = current.parentNode;
          continue;
        }
        return current.id;
      }
      current = current.parentNode;
    }
    return null;
  }

  function setLiftTarget(zoneId, isSelected) {
    const visuals = zoneVisuals.get(zoneId);
    if (!visuals || !visuals.lift) return;
    visuals.lift.from = visuals.group.position.y;
    visuals.lift.to = visuals.baseY + (isSelected ? selectionLiftOffset : 0);
    visuals.lift.start = performance.now();
  }

  function updateSelectionLift(time) {
    zoneVisuals.forEach((visuals, zoneId) => {
      if (!visuals.lift) return;
      const { from, to, start } = visuals.lift;
      if (from === to) return;
      const t = Math.min((time - start) / selectionLiftDuration, 1);
      const eased = 1 - Math.pow(1 - t, 2);
      visuals.group.position.y = from + (to - from) * eased;
      if (t >= 1) {
        visuals.group.position.y = to;
        visuals.lift.from = to;
      }
    });
  }

  function activateMainCamera() {
    activeCamera = camera;
  }

  function centerGeometry(geometry) {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    const center = new THREE.Vector3();
    box.getCenter(center);
    geometry.translate(-center.x, -center.y, 0);
    return { geometry, center };
  }

  function getShapesCenter(shapes) {
    const bounds = new THREE.Box3();
    bounds.makeEmpty();
    shapes.forEach((shape) => {
      const geometry = new THREE.ShapeGeometry(shape);
      geometry.computeBoundingBox();
      if (geometry.boundingBox) bounds.union(geometry.boundingBox);
      geometry.dispose();
    });
    const center = new THREE.Vector3();
    if (bounds.isEmpty()) return center;
    bounds.getCenter(center);
    return center;
  }

  function hashString(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) {
      hash = (hash << 5) - hash + value.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function getLedColor(status) {
    const normalized = String(status || 'normal').toLowerCase();
    if (normalized === 'alert') return activePalette.ledAlert;
    if (normalized === 'lockdown') return activePalette.ledLockdown;
    return activePalette.ledNormal;
  }

  function easeInOutExpo(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    if (t < 0.5) return Math.pow(2, 20 * t - 10) / 2;
    return (2 - Math.pow(2, -20 * t + 10)) / 2;
  }

  function getCameraSpherical() {
    const offset = activeCamera.position.clone().sub(state.lookAt);
    const radius = offset.length();
    const yaw = Math.atan2(offset.x, offset.z);
    const pitch = Math.acos(clamp(offset.y / radius, -1, 1));
    return { yaw, pitch, radius };
  }

  function setCameraFromSpherical(yaw, pitch, radius) {
    const sinPitch = Math.sin(pitch);
    const clampedRadius = clampCameraRadius(radius);
    const x = clampedRadius * sinPitch * Math.sin(yaw);
    const y = clampedRadius * Math.cos(pitch);
    const z = clampedRadius * sinPitch * Math.cos(yaw);
    activeCamera.position.set(state.lookAt.x + x, state.lookAt.y + y, state.lookAt.z + z);
    activeCamera.lookAt(state.lookAt);
  }

  function clampCameraRadius(radius) {
    return clamp(radius, state.cameraLimits.minRadius, state.cameraLimits.maxRadius);
  }

  function destroy() {
    stopLoop();
    if (resizeObserver) resizeObserver.disconnect();
    boundEvents.forEach(({ target, type, handler, options }) => {
      target.removeEventListener(type, handler, options);
    });
    boundEvents.length = 0;
    mcpBridge?.disconnect?.();
    mcpBridge = null;
    disposeSceneResources();
    disposeSignalMaterials();
    bloomPass?.dispose?.();
    composer?.dispose?.();
    composer = null;
    if (renderer) renderer.dispose();
    composer = null;
    clickable.length = 0;
    pipTargets.length = 0;
    pipLookup.clear();
    zoneVisuals.clear();
    zoneCenters.clear();
  }

  function disposeObject(object) {
    if (!object) return;
    object.traverse((child) => {
      if (child.isMesh || child.isLine || child.isLineSegments || child.isLineLoop) {
        if (child.geometry) child.geometry.dispose();
        if (child.material) disposeMaterial(child.material);
      }
    });
  }

  function disposeSceneResources() {
    if (!scene) return;
    scene.traverse((object) => {
      if (object.isMesh || object.isLine || object.isLineSegments) {
        if (object.geometry) object.geometry.dispose();
        if (object.material) disposeMaterial(object.material);
      }
    });
    disposeMaterialCache();
    scene.clear();
  }

  function disposeMaterial(material) {
    if (Array.isArray(material)) {
      material.forEach((item) => item?.dispose?.());
      return;
    }
    if (material?.userData?.sharedSignal) return;
    material?.dispose?.();
  }

  function disposeMaterialCache() {
    Object.values(materialCache).forEach((material) => {
      material?.dispose?.();
    });
  }

  function disposeSignalMaterials() {
    Object.values(signalMaterials).forEach((material) => {
      material?.dispose?.();
    });
  }

  return {
    init,
    setActive,
    setZonesData,
    setSelection,
    setActiveModule,
    setActiveModules,
    setPalette,
    setVisualMode,
    getZoneScreenPosition,
    focusZone,
    flyOff,
    resetCamera,
    resize,
    destroy
  };
}
