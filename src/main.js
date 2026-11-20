import * as THREE from "three";
import { advanceState, applyScenario, createInitialState, TUNING, validateLeaderboardName, addLeaderboardEntry, createLeaderboardEntry, exportLeaderboard } from "./game-engine.js";
import "./style.css";

const appStartedAt = performance.now();
const renderBenchmarkParams = new URLSearchParams(location.search);
const demoMode = renderBenchmarkParams.get("demo") === "1";
const renderBenchmark = renderBenchmarkParams.get("bench") === "render"
  ? {
      seed: Number(renderBenchmarkParams.get("seed") ?? 42),
      durationS: Number(renderBenchmarkParams.get("duration") ?? 30),
      readyAt: null
    }
  : null;
if (renderBenchmark &&
    (!Number.isInteger(renderBenchmark.seed) ||
     !Number.isInteger(renderBenchmark.durationS) ||
     renderBenchmark.durationS < 1)) {
  throw new TypeError("Render benchmark requires integer seed and positive duration");
}
if (renderBenchmark) document.documentElement.classList.add("render-benchmark");

// ============= Accessibility & Key Bindings =============
const ACCESSIBILITY_KEYS = {
  moveUp: "KeyW",
  moveDown: "KeyS",
  moveLeft: "KeyA",
  moveRight: "KeyD",
  jump: "Space",
  dash: "ShiftLeft",
  interact: "KeyE",
  pulse: "KeyF",
  pause: "Escape"
};

const DEFAULT_KEYS = { ...ACCESSIBILITY_KEYS };

let accessibility = {
  reducedMotion: false,
  fontSizeMultiplier: 1.0,
  subtitles: true,
  visualIndicators: true,
  colorBlindMode: false
};

function loadAccessibility() {
  try {
    const raw = localStorage.getItem("dao-den-long-a11y");
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        accessibility = {
          ...accessibility,
          reducedMotion: Boolean(saved.reducedMotion),
          colorBlindMode: Boolean(saved.colorBlindMode),
          visualIndicators: saved.visualIndicators !== false,
          subtitles: saved.subtitles !== false,
          fontSizeMultiplier: saved.fontSizeMultiplier === 1.25 ? 1.25 : 1
        };
      }
    }
  } catch (error) {
    console.error("Could not load accessibility preferences", error);
  }
}
function saveAccessibility() {
  try {
    localStorage.setItem("dao-den-long-a11y", JSON.stringify(accessibility));
  } catch (error) {
    console.error("Could not save accessibility preferences", error);
  }
}

function loadKeyBindings() {
  try {
    const raw = localStorage.getItem("dao-den-long-keys");
    if (raw) {
      const saved = JSON.parse(raw);
      const candidate = { ...DEFAULT_KEYS };
      for (const key of Object.keys(saved)) {
        if (Object.prototype.hasOwnProperty.call(candidate, key) &&
            typeof saved[key] === "string" &&
            /^[A-Za-z][A-Za-z0-9]*$/.test(saved[key])) {
          candidate[key] = saved[key];
        }
      }
      if (new Set(Object.values(candidate)).size === Object.keys(candidate).length) {
        Object.assign(ACCESSIBILITY_KEYS, candidate);
      } else {
        console.error("Saved key bindings contain duplicates; defaults were kept");
      }
    }
  } catch (error) {
    console.error("Could not load key bindings", error);
  }
}
function saveKeyBindings() {
  try {
    localStorage.setItem("dao-den-long-keys", JSON.stringify(ACCESSIBILITY_KEYS));
  } catch (error) {
    console.error("Could not save key bindings", error);
  }
}

function resetKeyBindings() {
  bindingAction = null;
  for (const key of Object.keys(DEFAULT_KEYS)) {
    ACCESSIBILITY_KEYS[key] = DEFAULT_KEYS[key];
  }
  saveKeyBindings();
  updateKeyHelp();
}

function checkKeyConflict(newKey, excludeAction) {
  for (const [action, key] of Object.entries(ACCESSIBILITY_KEYS)) {
    if (action !== excludeAction && key === newKey) return action;
  }
  return null;
}

const ACCESSIBILITY_LABELS = {
  moveUp: "Tiến",
  moveDown: "Lùi",
  moveLeft: "Trái",
  moveRight: "Phải",
  jump: "Nhảy",
  dash: "Lướt",
  interact: "Tương tác",
  pulse: "Tỏa Sáng",
  pause: "Tạm dừng"
};

function formatKey(code) {
  if (code === "Space") return "Space";
  if (code === "ShiftLeft" || code === "ShiftRight") return "Shift";
  if (code === "Escape") return "Esc";
  return code.replace(/^(Key|Digit)/, "");
}

function applyAccessibility() {
  const scale = accessibility.fontSizeMultiplier === 1.25 ? 1.25 : 1;
  const root = document.documentElement;
  root.classList.toggle("reduced-motion", accessibility.reducedMotion);
  root.classList.toggle("colorblind", accessibility.colorBlindMode);
  root.style.setProperty("--font-small", `${Math.round(13 * scale)}px`);
  root.style.setProperty("--font-base", `${Math.round(16 * scale)}px`);
  root.style.setProperty("--font-button", `${Math.round(16 * scale)}px`);
  root.style.setProperty("--font-label", `${Math.round(18 * scale)}px`);
  root.style.setProperty("--font-body", `${Math.round(24 * scale)}px`);
  root.style.setProperty("--font-title", `${Math.round(56 * scale)}px`);
}

// ============= Leaderboard =============
let leaderboard = [];

function loadLeaderboard() {
  try {
    const raw = localStorage.getItem("dao-den-long-leaderboard");
    if (raw) {
      const saved = JSON.parse(raw);
      if (Array.isArray(saved)) {
        leaderboard = saved.filter((entry) =>
          entry &&
          validateLeaderboardName(entry.name) &&
          Number.isFinite(entry.score) &&
          Number.isFinite(entry.nights_won) &&
          Number.isFinite(entry.seed) &&
          typeof entry.achieved_at === "string"
        ).slice(0, 10);
      }
    }
  } catch (error) {
    leaderboard = [];
    console.error("Could not load leaderboard", error);
  }
}
function saveLeaderboard() {
  try {
    localStorage.setItem("dao-den-long-leaderboard", JSON.stringify(leaderboard));
  } catch (error) {
    console.error("Could not save leaderboard", error);
  }
}
function addToLeaderboard(name, score, nightsWon, seed) {
  if (!validateLeaderboardName(name)) return false;
  const entry = createLeaderboardEntry(name, score, nightsWon, seed);
  leaderboard = addLeaderboardEntry(leaderboard, entry);
  saveLeaderboard();
  return true;
}

class AudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);
    this.initialized = true;
  }

  playTone(freq, type, duration, volume = 1) {
    if (!this.initialized) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    gain.gain.setValueAtTime(volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }

  playCollect() {
    this.playTone(880, "sine", 0.1, 0.5);
    setTimeout(() => this.playTone(1100, "sine", 0.15, 0.4), 50);
  }

  playLanternLight() {
    this.playTone(440, "triangle", 0.2, 0.6);
    setTimeout(() => this.playTone(554, "triangle", 0.3, 0.5), 100);
    setTimeout(() => this.playTone(659, "triangle", 0.4, 0.4), 200);
  }

  playPulse() {
    if (!this.initialized) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, this.ctx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.5);
  }

  playStun() {
    this.playTone(300, "square", 0.2, 0.5);
    setTimeout(() => this.playTone(250, "square", 0.2, 0.5), 100);
  }

  playHit() {
    this.playTone(150, "sawtooth", 0.2, 0.7);
  }

  playDash() {
    this.playTone(1200, "triangle", 0.15, 0.3);
  }

  playJump() {
    this.playTone(440, "sine", 0.15, 0.4);
  }

  playWin() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.4, now + i * 0.1 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 1.5);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 1.5);
    });
  }

  playLose() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    [392, 349.23, 311.13, 261.63].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.5, now + i * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.3 + 0.5);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.3);
      osc.stop(now + i * 0.3 + 0.5);
    });
  }

  playNightStart(night) {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    const notes = [261.63, 329.63, 392, 523.25, 659.25];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.3, now + i * 0.15 + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 1);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 1);
    });
  }

  playWarning() {
    if (!this.initialized) return;
    const now = this.ctx.currentTime;
    [1200, 1000, 1200, 1000].forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.2, now + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.05);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.05);
    });
  }
}

const audio = new AudioManager();

const canvas = document.querySelector("#game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: false });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(renderBenchmark ? 1 : Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = !renderBenchmark;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1430);
scene.fog = new THREE.FogExp2(0x0e1430, 0.006);

// Create starry skybox
const starGeometry = new THREE.BufferGeometry();
const starCount = 300;
const starPositions = new Float32Array(starCount * 3);
const starSizes = new Float32Array(starCount);
const starPhases = new Float32Array(starCount);

for (let i = 0; i < starCount; i++) {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const radius = 200 + Math.random() * 100;
  
  starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
  starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
  starPositions[i * 3 + 2] = radius * Math.cos(phi);
  
  starSizes[i] = 0.5 + Math.random() * 1.5;
  starPhases[i] = Math.random() * Math.PI * 2;
}

starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));
starGeometry.setAttribute('phase', new THREE.BufferAttribute(starPhases, 1));

const starMaterial = new THREE.PointsMaterial({
  color: 0xffffff,
  size: 1.5,
  transparent: true,
  opacity: 0.8,
  sizeAttenuation: true
});

const stars = new THREE.Points(starGeometry, starMaterial);
stars.userData = { originalSizes: starSizes.slice(), phases: starPhases.slice(), count: starCount };
scene.add(stars);

const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 500);
const cameraDistance = renderBenchmark ? 70 : 12;
const cameraTargetHeight = renderBenchmark ? 1.3 : 2.0;

const ambientLight = new THREE.AmbientLight(0x6080b0, 0.25);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0x80a0c0, 0.4);
sunLight.position.set(100, 100, 50);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 500;
sunLight.shadow.camera.left = -100;
sunLight.shadow.camera.right = 100;
sunLight.shadow.camera.top = 100;
sunLight.shadow.camera.bottom = -100;
scene.add(sunLight);

const particles = [];
const rings = [];
const fireflies = [];
const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);

const nightMeshes = {};

function createNightMesh(night) {
  const group = new THREE.Group();
  
  if (night === 1) {
    // Island Ben (Night 1)
    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(40, 42, 2, 48),
      new THREE.MeshStandardMaterial({ 
        color: 0x2f5d50, 
        roughness: 0.92,
        metalness: 0.1
      })
    );
    island.position.y = -1;
    island.receiveShadow = true;
    group.add(island);

    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(48, 50, 1, 32),
      new THREE.MeshStandardMaterial({ 
        color: 0x12384a,
        roughness: 0.9,
        metalness: 0.8
      })
    );
    water.position.y = -1.5;
    water.userData.isWater = true;
    group.add(water);
  } else if (night === 2) {
    // Island Cau (Night 2)
    const islandA = new THREE.Mesh(
      new THREE.CylinderGeometry(28, 30, 2, 48),
      new THREE.MeshStandardMaterial({ 
        color: 0x2f5d50, 
        roughness: 0.92
      })
    );
    islandA.position.set(0, -1, 0);
    islandA.receiveShadow = true;
    group.add(islandA);

    const islandB = new THREE.Mesh(
      new THREE.CylinderGeometry(28, 30, 2, 48),
      new THREE.MeshStandardMaterial({ 
        color: 0x2f5d50, 
        roughness: 0.92
      })
    );
    islandB.position.set(70, -1, 0);
    islandB.receiveShadow = true;
    group.add(islandB);

    // Bridge
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(18, 1, 4),
      new THREE.MeshStandardMaterial({ 
        color: 0x6b4a2f,
        roughness: 0.8
      })
    );
    bridge.position.set(35, 0, 0);
    bridge.receiveShadow = true;
    group.add(bridge);

    // Jump pads
    const padA = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.5, 16),
      new THREE.MeshStandardMaterial({ 
        color: 0x8b5a2f,
        roughness: 0.7
      })
    );
    padA.position.set(20, 0.25, 18);
    group.add(padA);

    const padB = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.5, 16),
      new THREE.MeshStandardMaterial({ 
        color: 0x8b5a2f,
        roughness: 0.7
      })
    );
    padB.position.set(50, 0.25, -18);
    group.add(padB);

    // Water around islands
    const waterA = new THREE.Mesh(
      new THREE.CylinderGeometry(35, 37, 1, 32),
      new THREE.MeshStandardMaterial({ 
        color: 0x12384a,
        roughness: 0.9,
        metalness: 0.8
      })
    );
    waterA.position.set(0, -1.5, 0);
    waterA.userData.isWater = true;
    group.add(waterA);

    const waterB = new THREE.Mesh(
      new THREE.CylinderGeometry(35, 37, 1, 32),
      new THREE.MeshStandardMaterial({ 
        color: 0x12384a,
        roughness: 0.9,
        metalness: 0.8
      })
    );
    waterB.position.set(70, -1.5, 0);
    waterB.userData.isWater = true;
    group.add(waterB);
  } else if (night === 3) {
    // Island Chuong (Night 3)
    const island = new THREE.Mesh(
      new THREE.CylinderGeometry(45, 47, 2, 48),
      new THREE.MeshStandardMaterial({ 
        color: 0x2f5d50, 
        roughness: 0.92
      })
    );
    island.position.y = -1;
    island.receiveShadow = true;
    group.add(island);

    // Water
    const water = new THREE.Mesh(
      new THREE.CylinderGeometry(52, 54, 1, 32),
      new THREE.MeshStandardMaterial({ 
        color: 0x12384a,
        roughness: 0.9,
        metalness: 0.8
      })
    );
    water.position.y = -1.5;
    water.userData.isWater = true;
    group.add(water);

    // Level 1 - donut ring
    const level1 = new THREE.Mesh(
      new THREE.TorusGeometry(18, 0.8, 16, 48),
      new THREE.MeshStandardMaterial({ 
        color: 0x2f5d50, 
        roughness: 0.92
      })
    );
    level1.position.y = 3;
    level1.rotation.x = Math.PI / 2;
    level1.rotation.z = Math.PI;
    group.add(level1);

    // Level 2 - disk
    const level2 = new THREE.Mesh(
      new THREE.CylinderGeometry(8, 8, 0.5, 32),
      new THREE.MeshStandardMaterial({ 
        color: 0x2f5d50, 
        roughness: 0.92
      })
    );
    level2.position.y = 6;
    group.add(level2);

    // Jump pad
    const jumpPad = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.5, 16),
      new THREE.MeshStandardMaterial({ 
        color: 0x8b5a2f,
        roughness: 0.7
      })
    );
    jumpPad.position.set(0, 3.25, 13);
    group.add(jumpPad);

    // Bell tower
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(2, 2, 8, 16),
      new THREE.MeshStandardMaterial({ 
        color: 0x6b4a2f,
        roughness: 0.8
      })
    );
    tower.position.set(0, 10, 0);
    group.add(tower);
  }
  
  return group;
}

nightMeshes[1] = createNightMesh(1);
nightMeshes[2] = createNightMesh(2);
nightMeshes[3] = createNightMesh(3);
scene.add(nightMeshes[1]);

// Create fireflies
createFireflies();

const playerMesh = new THREE.Group();

// Body - áo mây
const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.45, 1.2, 6, 12),
  new THREE.MeshStandardMaterial({ 
    color: 0xe8e2d0,
    roughness: 0.5,
    metalness: 0.3
  })
);
body.position.y = 1;
body.castShadow = true;
playerMesh.add(body);

// Head
const head = new THREE.Mesh(
  new THREE.SphereGeometry(0.35, 12, 12),
  new THREE.MeshStandardMaterial({ 
    color: 0xe8e2d0,
    roughness: 0.6
  })
);
head.position.y = 1.9;
head.castShadow = true;
playerMesh.add(head);

// Hat - nón lá
const hat = new THREE.Mesh(
  new THREE.ConeGeometry(0.5, 0.3, 16),
  new THREE.MeshStandardMaterial({ 
    color: 0x6b4a2f,
    roughness: 0.8
  })
);
hat.position.y = 2.3;
hat.rotation.x = 0.1;
hat.castShadow = true;
playerMesh.add(hat);

// Hat brim
const hatBrim = new THREE.Mesh(
  new THREE.CylinderGeometry(0.7, 0.7, 0.05, 24),
  new THREE.MeshStandardMaterial({ 
    color: 0x6b4a2f,
    roughness: 0.8
  })
);
hatBrim.position.y = 2.2;
playerMesh.add(hatBrim);

// Scarf - khăn đỏ
const scarf = new THREE.Mesh(
  new THREE.TorusGeometry(0.38, 0.06, 8, 24),
  new THREE.MeshStandardMaterial({ 
    color: 0xc8102e,
    roughness: 0.6
  })
);
scarf.position.y = 1.65;
scarf.rotation.x = Math.PI / 2;
playerMesh.add(scarf);

// Scarf tail trailing behind
const scarfTail = new THREE.Mesh(
  new THREE.BoxGeometry(0.1, 0.4, 0.02),
  new THREE.MeshStandardMaterial({ 
    color: 0xc8102e,
    roughness: 0.6
  })
);
scarfTail.position.set(0, 1.5, -0.35);
playerMesh.add(scarfTail);

// Face - eyes
const leftEye = new THREE.Mesh(
  new THREE.SphereGeometry(0.05, 8, 8),
  new THREE.MeshBasicMaterial({ color: 0x333333 })
);
leftEye.position.set(-0.12, 1.95, 0.3);
playerMesh.add(leftEye);

const rightEye = new THREE.Mesh(
  new THREE.SphereGeometry(0.05, 8, 8),
  new THREE.MeshBasicMaterial({ color: 0x333333 })
);
rightEye.position.set(0.12, 1.95, 0.3);
playerMesh.add(rightEye);

// Lantern in hand
const handLantern = new THREE.Group();
const lanternBody = new THREE.Mesh(
  new THREE.BoxGeometry(0.2, 0.3, 0.2),
  new THREE.MeshStandardMaterial({ 
    color: 0x6b4a2f,
    roughness: 0.7
  })
);
handLantern.add(lanternBody);

const lanternBulb = new THREE.Mesh(
  new THREE.SphereGeometry(0.08, 8, 8),
  new THREE.MeshBasicMaterial({ 
    color: 0xffb347,
    transparent: true,
    opacity: 0.9
  })
);
lanternBulb.position.y = 0;
handLantern.add(lanternBulb);

const handLight = new THREE.PointLight(0xffb347, 0.5, 5);
handLantern.add(handLight);

handLantern.position.set(0.55, 1.3, 0.3);
playerMesh.add(handLantern);

// Player glow
const glow = new THREE.PointLight(0xffb347, 0, 8);
glow.position.set(0, 1.5, 0);
playerMesh.add(glow);

playerMesh.userData = { walkTime: 0, targetYaw: 0 };

scene.add(playerMesh);

const lanternObjects = new Map();
const moteObjects = new Map();
const shadeObjects = new Map();
let benchmarkMoteMesh = null;
let benchmarkShadeMesh = null;
const benchmarkTransform = new THREE.Object3D();
const drifterObjects = new Map();
const charmObjects = new Map();
const safeZoneObjects = new Map();

function makeLantern(lantern) {
  const group = new THREE.Group();
  
  // Post
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 2.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2f })
  );
  post.position.y = 1.25;
  post.castShadow = true;
  group.add(post);
  
  // Frame (cross bars)
  const frameH = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.04, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2f })
  );
  frameH.position.y = 2.3;
  group.add(frameH);
  
  const frameV = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.3, 0.04),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2f })
  );
  frameV.position.y = 2.45;
  group.add(frameV);
  
  // Cage (wireframe effect using thin box)
  const cage = new THREE.Mesh(
    new THREE.BoxGeometry(0.25, 0.35, 0.25),
    new THREE.MeshBasicMaterial({ 
      color: 0x4a3520,
      wireframe: true,
      transparent: true,
      opacity: 0.3
    })
  );
  cage.position.y = 2.4;
  group.add(cage);
  
  // Bulb
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 12, 12),
    new THREE.MeshStandardMaterial({ 
      color: 0xffe9b0, 
      emissive: 0x000000, 
      emissiveIntensity: 0 
    })
  );
  bulb.position.y = 2.4;
  group.add(bulb);
  
  // Roof
  const roof = new THREE.Mesh(
    new THREE.ConeGeometry(0.35, 0.25, 8),
    new THREE.MeshStandardMaterial({ 
      color: 0x5b3a2f,
      roughness: 0.8
    })
  );
  roof.position.y = 2.65;
  roof.rotation.x = Math.PI;
  roof.castShadow = true;
  group.add(roof);
  
  // Light
  const light = new THREE.PointLight(0xffb347, 0, 22);
  light.position.y = 2.4;
  light.castShadow = true;
  group.add(light);

  const tear = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.08, 2.55, 0.16),
      new THREE.Vector3(0.01, 2.46, 0.16),
      new THREE.Vector3(-0.04, 2.38, 0.16),
      new THREE.Vector3(0.08, 2.27, 0.16)
    ]),
    new THREE.LineBasicMaterial({ color: 0xffffff })
  );
  tear.visible = false;
  group.add(tear);
  
  group.userData.bulb = bulb;
  group.userData.light = light;
  group.userData.tear = tear;
  lanternObjects.set(lantern.id, group);
  scene.add(group);
}

function createParticle(position, color, velocity, life) {
  const material = new THREE.MeshBasicMaterial({ 
    color: color, 
    transparent: true, 
    opacity: 1 
  });
  const mesh = new THREE.Mesh(particleGeometry, material);
  mesh.position.copy(position);
  mesh.userData = { 
    velocity: new THREE.Vector3(...velocity),
    life: life,
    maxLife: life
  };
  particles.push(mesh);
  scene.add(mesh);
}

function createParticleExplosion(position, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count;
    const velocity = [
      Math.cos(angle) * speed * (0.5 + Math.random()),
      0.2 + Math.random() * 0.3,
      Math.sin(angle) * speed * (0.5 + Math.random())
    ];
    createParticle(position, color, velocity, 30 + Math.random() * 20);
  }
}

function createPulseRing(position) {
  const geometry = new THREE.RingGeometry(0.1, 0.3, 32);
  const material = new THREE.MeshBasicMaterial({ 
    color: 0x7a3cff, 
    transparent: true, 
    opacity: 0.8,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.position.copy(position);
  ring.position.y = 0.5;
  ring.rotation.x = Math.PI / 2;
  ring.userData = { 
    scale: 1,
    maxScale: 16.7, // 5m radius
    life: 24, // 0.4s at 60fps
    maxLife: 24
  };
  rings.push(ring);
  scene.add(ring);
}

function createDashTrail(position, direction) {
  for (let i = 0; i < 5; i++) {
    const offset = direction.clone().multiplyScalar(-i * 0.3);
    const trailPos = position.clone().add(offset);
    const velocity = [
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1,
      (Math.random() - 0.5) * 0.1
    ];
    createParticle(trailPos, 0xffffff, velocity, 12);
  }
}

function createFireflies() {
  const fireflyGeometry = new THREE.SphereGeometry(0.08, 6, 6);
  const fireflyMaterial = new THREE.MeshBasicMaterial({ 
    color: 0xffe58a,
    transparent: true,
    opacity: 0.9
  });
  
  for (let i = 0; i < 60; i++) {
    const firefly = new THREE.Mesh(fireflyGeometry, fireflyMaterial.clone());
    const angle = Math.random() * Math.PI * 2;
    const radius = 15 + Math.random() * 25;
    firefly.position.set(
      Math.cos(angle) * radius,
      1 + Math.random() * 3,
      Math.sin(angle) * radius
    );
    firefly.userData = {
      baseX: firefly.position.x,
      baseZ: firefly.position.z,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 0.5,
      radius: radius
    };
    fireflies.push(firefly);
    scene.add(firefly);
  }
}

function updateParticles() {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.userData.life -= 1;
    p.position.add(p.userData.velocity);
    p.userData.velocity.y -= 0.01;
    p.material.opacity = p.userData.life / p.userData.maxLife;
    p.scale.setScalar(p.userData.life / p.userData.maxLife);
    if (p.userData.life <= 0) {
      scene.remove(p);
      particles.splice(i, 1);
    }
  }
  
  // Update rings
  for (let i = rings.length - 1; i >= 0; i--) {
    const ring = rings[i];
    ring.userData.life -= 1;
    const progress = 1 - (ring.userData.life / ring.userData.maxLife);
    const scale = 1 + progress * (ring.userData.maxScale - 1);
    ring.scale.setScalar(scale);
    ring.material.opacity = ring.userData.life / ring.userData.maxLife;
    if (ring.userData.life <= 0) {
      scene.remove(ring);
      rings.splice(i, 1);
    }
  }
  
  // Update fireflies
  const time = performance.now() * 0.001;
  for (const firefly of fireflies) {
    const data = firefly.userData;
    const angle = time * data.speed + data.phase;
    
    // Circular drift around player
    firefly.position.x = state.player.pos[0] + Math.cos(angle) * data.radius;
    firefly.position.z = state.player.pos[2] + Math.sin(angle) * data.radius;
    
    // Gentle vertical bobbing
    firefly.position.y = 1 + Math.sin(time * 2 + data.phase) * 1.5;
    
    // Twinkle effect
    firefly.material.opacity = 0.5 + Math.sin(time * 3 + data.phase) * 0.4;
  }
}

function syncLanternObjects(state) {
  // Update lanterns
  for (const lantern of state.lanterns) {
    let object = lanternObjects.get(lantern.id);
    if (!object) {
      makeLantern(lantern);
      object = lanternObjects.get(lantern.id);
    }
    object.position.set(lantern.pos[0], lantern.pos[1], lantern.pos[2]);
    object.scale.y = accessibility.colorBlindMode && !lantern.lit ? 0.8 : 1;
    object.userData.tear.visible = accessibility.colorBlindMode && !lantern.lit;
    
    const targetEmissive = new THREE.Color(lantern.lit ? 0xffb347 : 0x000000);
    object.userData.bulb.material.emissive.lerp(targetEmissive, 0.2);
    object.userData.bulb.material.emissiveIntensity = THREE.MathUtils.lerp(
      object.userData.bulb.material.emissiveIntensity, 
      lantern.lit ? 1.2 : 0, 
      0.1
    );
    object.userData.light.intensity = THREE.MathUtils.lerp(
      object.userData.light.intensity, 
      lantern.lit ? 32 : 0, 
      0.2
    );
  }
  
  // Create/update safe zones
  const safeLanterns = state.lanterns.filter(l => l.lit);
  safeLanterns.forEach(lantern => {
    let zone = safeZoneObjects.get(lantern.id);
    if (!zone) {
      zone = new THREE.Mesh(
        new THREE.RingGeometry(5.5, 6.5, 32),
        new THREE.MeshBasicMaterial({ 
          color: 0xffb347, 
          transparent: true, 
          opacity: 0.3, 
          side: THREE.DoubleSide 
        })
      );
      zone.rotation.x = Math.PI / 2;
      zone.position.y = 0.1;
      zone.userData.lanternId = lantern.id;
      safeZoneObjects.set(lantern.id, zone);
      scene.add(zone);
    }
    zone.position.set(lantern.pos[0], 0.1, lantern.pos[2]);
  });
  
  // Remove old zones
  const safeIds = new Set(safeLanterns.map(l => l.id));
  for (const [id, zone] of safeZoneObjects) {
    if (!safeIds.has(id)) {
      scene.remove(zone);
      safeZoneObjects.delete(id);
    }
  }
}

function syncMotes(state) {
  if (renderBenchmark) {
    if (!benchmarkMoteMesh) {
      benchmarkMoteMesh = new THREE.InstancedMesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshStandardMaterial({
          color: 0xfff6c2,
          emissive: 0xffe58a,
          emissiveIntensity: 0.5
        }),
        state.motes.length
      );
      benchmarkMoteMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(benchmarkMoteMesh);
    }
    state.motes.forEach((mote, index) => {
      benchmarkTransform.position.set(mote.pos[0], 0.65, mote.pos[2]);
      benchmarkTransform.rotation.set(0, performance.now() * 0.0002 + index, 0);
      benchmarkTransform.updateMatrix();
      benchmarkMoteMesh.setMatrixAt(index, benchmarkTransform.matrix);
    });
    benchmarkMoteMesh.instanceMatrix.needsUpdate = true;
    return;
  }

  const ids = new Set(state.motes.map(m => m.id));
  for (const [id, obj] of moteObjects) {
    if (!ids.has(id)) {
      scene.remove(obj);
      moteObjects.delete(id);
    }
  }
  for (const mote of state.motes) {
    let obj = moteObjects.get(mote.id);
    if (!obj) {
      obj = new THREE.Mesh(
        new THREE.SphereGeometry(0.2, 8, 8),
        new THREE.MeshStandardMaterial({ 
          color: 0xfff6c2, 
          emissive: 0xffe58a, 
          emissiveIntensity: 0.5 
        })
      );
      moteObjects.set(mote.id, obj);
      scene.add(obj);
    }
    obj.position.set(mote.pos[0], 0.65, mote.pos[2]);
    if (!accessibility.reducedMotion) obj.rotation.y += 0.05;
  }
}

function syncShades(state) {
  if (renderBenchmark) {
    if (!benchmarkShadeMesh) {
      benchmarkShadeMesh = new THREE.InstancedMesh(
        new THREE.DodecahedronGeometry(0.7, 0),
        new THREE.MeshStandardMaterial({
          color: 0x120a1a,
          emissive: 0x301050,
          emissiveIntensity: 0.45,
          roughness: 0.4,
          metalness: 0
        }),
        state.shades.length
      );
      benchmarkShadeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(benchmarkShadeMesh);
    }
    const now = performance.now();
    const time = now * 0.003;
    state.shades.forEach((shade, index) => {
      const phase = index * 0.37;
      const wanderTime = now * 0.00025 + phase;
      benchmarkTransform.position.set(
        shade.pos[0] + Math.cos(wanderTime) * 0.5,
        shade.pos[1] + 0.65 + Math.sin(time + phase) * 0.12,
        shade.pos[2] + Math.sin(wanderTime) * 0.5
      );
      benchmarkTransform.rotation.set(0, Math.sin(time * 0.5 + phase) * 0.12, 0);
      benchmarkTransform.updateMatrix();
      benchmarkShadeMesh.setMatrixAt(index, benchmarkTransform.matrix);
    });
    benchmarkShadeMesh.instanceMatrix.needsUpdate = true;
    return;
  }

  const ids = new Set(state.shades.map(s => s.id));
  for (const [id, obj] of shadeObjects) {
    if (!ids.has(id)) {
      scene.remove(obj);
      shadeObjects.delete(id);
    }
  }
  for (const shade of state.shades) {
    let obj = shadeObjects.get(shade.id);
    if (!obj) {
      // Main body
      obj = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.7, 0),
        new THREE.MeshStandardMaterial({ 
          color: 0x120a1a,
          emissive: 0x301050,
          emissiveIntensity: 0.45,
          roughness: 0.4,
          metalness: 0,
          transparent: true,
          opacity: 0.5,
          depthWrite: false
        })
      );
      obj.castShadow = false;
      
      // Glowing eyes
      const eyeGeometry = new THREE.SphereGeometry(0.1, 8, 8);
      const eyeMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x7a3cff,
        transparent: true,
        opacity: 0.9
      });
      
      const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      leftEye.position.set(-0.2, 0.1, 0.55);
      obj.add(leftEye);
      
      const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
      rightEye.position.set(0.2, 0.1, 0.55);
      obj.add(rightEye);
      
      // Aura (point light)
      const auraLight = new THREE.PointLight(0x7a3cff, renderBenchmark ? 0 : 0.3, 3);
      auraLight.position.y = 0;
      obj.add(auraLight);

      const outline = new THREE.LineSegments(
        new THREE.EdgesGeometry(obj.geometry),
        new THREE.LineBasicMaterial({ color: 0x00b3ff, transparent: true, opacity: 0.95 })
      );
      outline.userData.shadeOutline = true;
      outline.visible = true;
      obj.add(outline);
      obj.userData.animationPhase = [...shade.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) * 0.13;
      
      shadeObjects.set(shade.id, obj);
      scene.add(obj);
    }
    const bob = accessibility.reducedMotion
      ? 0
      : Math.sin(performance.now() * 0.003 + obj.userData.animationPhase) * 0.12;
    obj.position.set(shade.pos[0], shade.pos[1] + 0.65 + bob, shade.pos[2]);
    obj.rotation.y = accessibility.reducedMotion ? 0 : Math.sin(performance.now() * 0.0015 + obj.userData.animationPhase) * 0.12;
    const outline = obj.children.find((child) => child.userData.shadeOutline);
    if (outline) {
      outline.visible = true;
      outline.material.color.setHex(accessibility.colorBlindMode ? 0x00b3ff : 0x7a3cff);
    }
    
    if (shade.state === "stunned") {
      obj.material.color.setHex(0x3a3450);
      obj.material.emissive.setHex(0x7a3cff);
      obj.material.emissiveIntensity = 0.65;
      // Increase aura when stunned
      obj.children[2].intensity = renderBenchmark ? 0 : 0.8;
    } else if (shade.state === "recoil") {
      obj.material.emissive.setHex(0x211038);
      obj.material.color.setHex(0x312542);
      obj.material.emissiveIntensity = 0.2;
      obj.children[2].intensity = renderBenchmark ? 0 : 0.1;
    } else {
      obj.material.emissive.setHex(0x301050);
      obj.material.color.setHex(0x120a1a);
      obj.material.emissiveIntensity = 0.45;
      obj.children[2].intensity = renderBenchmark ? 0 : 0.3;
    }
  }
}

function syncDrifters(state) {
  const ids = new Set(state.drifters.map(d => d.id));
  for (const [id, obj] of drifterObjects) {
    if (!ids.has(id)) {
      scene.remove(obj);
      drifterObjects.delete(id);
    }
  }
  for (const drifter of state.drifters) {
    if (drifter.state === "removed") continue;
    
    let obj = drifterObjects.get(drifter.id);
    if (!obj) {
      obj = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 2, 0.05),
        new THREE.MeshStandardMaterial({ 
          color: 0x8fa3b8, 
          transparent: true, 
          opacity: 0.7 
        })
      );
      obj.userData.stolen = 0;
      drifterObjects.set(drifter.id, obj);
      scene.add(obj);
    }
    
    obj.position.set(drifter.pos[0], 1, drifter.pos[2]);
    obj.rotation.z = drifter.pos[0] - state.player.pos[0];
    
    if (drifter.stolen && drifter.stolen.length > obj.userData.stolen) {
      createParticleExplosion(
        drifter.pos,
        new THREE.Color(0xffd700),
        5,
        0.2
      );
      obj.userData.stolen = drifter.stolen.length;
    }
  }
}

function syncCharms(state) {
  const ids = new Set(state.charms.filter(c => c.available).map(c => c.id));
  for (const [id, obj] of charmObjects) {
    if (!ids.has(id)) {
      scene.remove(obj);
      charmObjects.delete(id);
    }
  }
  for (const charm of state.charms) {
    if (!charm.available) continue;
    
    let obj = charmObjects.get(charm.id);
    if (!obj) {
      obj = new THREE.Mesh(
        new THREE.BoxGeometry(0.4, 0.1, 0.6),
        new THREE.MeshStandardMaterial({ 
          color: 0xc8102e, 
          metalness: 0.3 
        })
      );
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.25, 0.03, 8, 16),
        new THREE.MeshStandardMaterial({ color: 0xf2c14e })
      );
      rim.position.y = 0;
      obj.add(rim);
      obj.position.y = 0.65;
      obj.userData.pulse = 0;
      charmObjects.set(charm.id, obj);
      scene.add(obj);
    }
    
    obj.position.set(charm.pos[0], 0.65, charm.pos[2]);
    if (accessibility.reducedMotion) {
      obj.scale.setScalar(1);
    } else {
      obj.userData.pulse += 0.1;
      obj.scale.setScalar(1 + Math.sin(obj.userData.pulse) * 0.1);
    }
  }
}

function updateHud(state) {
  document.querySelector("#carried").textContent = state.player.carried;
  document.querySelector("#flames").textContent = state.player.flames;
  document.querySelector("#score").textContent = state.score;
  
  const timeSec = Math.ceil(state.timeLeftS);
  const timeEl = document.querySelector("#time");
  timeEl.textContent = `${Math.floor(timeSec / 60)}:${String(timeSec % 60).padStart(2, "0")}`;
  
  if (timeSec <= 30) {
    timeEl.style.color = "#FF5A5F";
    timeEl.style.animation = "blink 0.5s infinite";
  } else {
    timeEl.style.color = "";
    timeEl.style.animation = "";
  }
  
  // Lantern progress
  const lanternsEl = document.querySelector("#lanterns");
  const lanterns = state.lanterns;
  const litCount = lanterns.filter(l => l.lit).length;
  lanternsEl.textContent = `${litCount}/${lanterns.length}`;
  
  // Mote bar
  const motesEl = document.querySelector("#motes");
  let bar = "";
  for (let i = 0; i < 10; i++) {
    if (i < state.player.carried) {
      bar += '<span class="mote-dot lit"></span>';
    } else {
      bar += '<span class="mote-dot"></span>';
    }
  }
  motesEl.innerHTML = bar;
  
  // Cooldown indicators
  const dashCd = document.querySelector("#dash-cd");
  const pulseCd = document.querySelector("#pulse-cd");
  
  if (dashCd) {
    const dashProgress = state.player.dashCdTicks / (TUNING.dashCooldownS * 60);
    dashCd.style.setProperty("--cooldown-progress", `${dashProgress * 100}%`);
  }
  
  if (pulseCd) {
    const pulseProgress = state.player.pulseCdTicks / (TUNING.pulseCooldownS * 60);
    pulseCd.style.setProperty("--cooldown-progress", `${pulseProgress * 100}%`);
  }
  
  // Lantern hint
  const nearestLantern = state.lanterns.find(l => !l.lit);
  if (nearestLantern) {
    const dist = Math.hypot(
      state.player.pos[0] - nearestLantern.pos[0],
      state.player.pos[2] - nearestLantern.pos[2]
    );
    const hintEl = document.querySelector("#lantern-hint");
    if (hintEl) {
      if (dist <= 2.0) {
        hintEl.textContent = `E — Nạp ánh sáng (${Math.min(state.player.carried, TUNING.lanternCost - nearestLantern.deposited)}/${TUNING.lanternCost})`;
        hintEl.style.display = "block";
      } else {
        hintEl.style.display = "none";
      }
    }
  }
  
  // Pause indicator
  if (state.paused) {
    let pauseInd = document.querySelector("#pause-indicator");
    if (!pauseInd) {
      pauseInd = document.createElement("div");
      pauseInd.id = "pause-indicator";
      pauseInd.textContent = "Tạm dừng";
      document.body.appendChild(pauseInd);
    }
    pauseInd.classList.add("visible");
  } else {
    const pauseInd = document.querySelector("#pause-indicator");
    if (pauseInd) pauseInd.classList.remove("visible");
  }
  
  // Vignette for low health warning
  const vignette = document.querySelector("#vignette");
  if (vignette) {
    vignette.classList.remove("warning", "critical");
    if (state.player.flames <= 1) {
      vignette.classList.add("critical");
    } else if (state.player.flames <= 2) {
      vignette.classList.add("warning");
    }
  }
}

function createNightStartScreen(night) {
  const nightNames = {
    1: "Đảo Bến",
    2: "Đảo Cau",
    3: "Đảo Chuông"
  };
  
  const overlay = document.querySelector("#overlay");
  const title = document.querySelector("#overlay-title");
  const score = document.querySelector("#overlay-score");
  
  overlay.hidden = false;
  title.textContent = `Bắt đầu ${nightNames[night]}`;
  score.innerHTML = "<p style='font-size:18px;margin:20px 0'>Đợi trong giây lát...</p>";
  
  setTimeout(() => {
    overlay.hidden = true;
  }, 2000);
}

function createGameOverScreen(state) {
  const overlay = document.querySelector("#overlay");
  const title = document.querySelector("#overlay-title");
  const score = document.querySelector("#overlay-score");
  
  overlay.hidden = false;
  overlay.dataset.menuScreen = "false";
  document.querySelector("#restart").hidden = false;
  
  if (state.state === "won") {
    title.textContent = "Bình Minh!";
    title.style.color = "#ffd889";
    const isFinalWin = state.night >= 3;
    score.innerHTML = `
      <p style="font-size:24px;color:#fff8d8">Đêm ${state.night} hoàn thành!</p>
      <p style="font-size:18px;color:#b9bdd9">Điểm: ${state.score}</p>
      <p style="font-size:16px;color:#8fa3b8">Tổng điểm: ${totalScore + state.score}</p>
      ${isFinalWin ? `
        <div style="margin:15px 0">
          <label style="font-size:18px;display:block;margin-bottom:5px">Nhập tên (3-12 ký tự):</label>
          <input id="leaderboard-name" type="text" maxlength="12" style="font-size:18px;padding:8px;width:200px" placeholder="Tên của bạn">
          <div id="leaderboard-error" style="font-size:14px;color:#ff5a5f;margin-top:5px"></div>
        </div>
        <button id="save-score" style="margin-top:15px">Lưu bảng xếp hạng</button>
      ` : ""}
      <button id="next-night" style="margin-top:20px">${isFinalWin ? "Xem bảng xếp hạng" : "Đêm tiếp theo"}</button>
    `;
  } else {
    title.textContent = "Sương đen nuốt ánh sáng";
    title.style.color = "#ff5a5f";
    score.innerHTML = `
      <p style="font-size:24px;color:#fff8d8">Thời gian: ${Math.floor(state.timeLeftS / 60)}m ${Math.floor(state.timeLeftS % 60)}s</p>
      <p style="font-size:18px;color:#b9bdd9">Điểm: ${state.score}</p>
      <div style="margin:15px 0">
        <label style="font-size:18px;display:block;margin-bottom:5px">Nhập tên (3-12 ký tự):</label>
        <input id="leaderboard-name" type="text" maxlength="12" style="font-size:18px;padding:8px;width:200px" placeholder="Tên của bạn">
        <div id="leaderboard-error" style="font-size:14px;color:#ff5a5f;margin-top:5px"></div>
      </div>
      <button id="save-score" style="margin-top:15px">Lưu bảng xếp hạng</button>
      <button id="retry-night" style="margin-top:10px">Chơi lại Đêm này</button>
    `;
  }

  // Save score handler
  const saveBtn = document.querySelector("#save-score");
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      const nameInput = document.querySelector("#leaderboard-name");
      const errorEl = document.querySelector("#leaderboard-error");
      const name = nameInput ? nameInput.value.trim() : "";
      const nightsWon = state.state === "won" ? 1 : 0;
      if (!validateLeaderboardName(name)) {
        if (errorEl) errorEl.textContent = "Tên phải có 3-12 ký tự [A-Za-z0-9_]";
        return;
      }
      if (errorEl) errorEl.textContent = "";
      const finalScore = totalScore + state.score;
      addToLeaderboard(name, finalScore, nightsWon, state.seed || 42);
      if (nameInput) nameInput.disabled = true;
      saveBtn.disabled = true;
      saveBtn.textContent = "Đã lưu!";
    });
  }

  // Next-night / leaderboard button handler
  const nextBtn = document.querySelector("#next-night");
  if (nextBtn) {
    const isFinal = state.state === "won" && state.night >= 3;
    nextBtn.addEventListener("click", () => {
      if (isFinal) {
        showLeaderboard();
      }
    });
  }
}


function showLeaderboard() {
  pauseForOverlayMenu();
  const overlay = document.querySelector("#overlay");
  const title = document.querySelector("#overlay-title");
  const score = document.querySelector("#overlay-score");
  overlay.hidden = false;
  overlay.dataset.menuScreen = "true";
  document.querySelector("#restart").hidden = true;
  title.textContent = "Bảng Xếp Hạng";
  title.style.color = "#f2c14e";

  let html = `<table style="font-size:18px;width:100%;border-collapse:collapse;margin-top:10px">
    <thead><tr style="color:#ffd889">
      <th style="text-align:left;padding:5px">#</th>
      <th style="text-align:left;padding:5px">Tên</th>
      <th style="text-align:left;padding:5px">Điểm</th>
      <th style="text-align:left;padding:5px">Đêm thắng</th>
      <th style="text-align:left;padding:5px">Ngày</th>
      <th style="text-align:left;padding:5px">Seed</th>
    </tr></thead>
    <tbody>`;
  leaderboard.forEach((e, i) => {
    const date = new Date(e.achieved_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
    html += `<tr style="color:#f5f1e6;border-bottom:1px solid rgba(255,255,255,.1)">
      <td style="padding:5px">${i + 1}</td>
      <td style="padding:5px">${e.name}</td>
      <td style="padding:5px">${e.score}</td>
      <td style="padding:5px">${e.nights_won}</td>
      <td style="padding:5px">${date}</td>
      <td style="padding:5px">${e.seed}</td>
    </tr>`;
  });
  if (leaderboard.length === 0) {
    html += `<tr><td colspan="6" style="padding:18px">Chưa có điểm được lưu.</td></tr>`;
  }
  html += `</tbody></table>`;
  html += `<button id="export-leaderboard" style="margin-top:20px">Tải JSON</button>`;
  html += `<button id="close-leaderboard" style="margin-top:20px">Đóng</button>`;
  score.innerHTML = html;

  document.querySelector("#export-leaderboard").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(exportLeaderboard(leaderboard), null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "leaderboard.json";
    link.style.position = "fixed";
    link.style.left = "-9999px";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  document.querySelector("#close-leaderboard").addEventListener("click", () => {
    closeOverlayMenu();
  });
}

let bindingAction = null;
let resumeAfterOverlay = false;

function pauseForOverlayMenu() {
  if (state.state !== "playing") return;
  if (resumeAfterOverlay) return;
  if (state.paused && pauseRequested) {
    pauseRequested = false;
    resumeAfterOverlay = true;
    return;
  }
  resumeAfterOverlay = !state.paused;
  if (resumeAfterOverlay) {
    keys.clear();
    if (!pauseRequested) pauseRequested = true;
  }
}

function closeOverlayMenu() {
  const overlay = document.querySelector("#overlay");
  overlay.hidden = true;
  overlay.dataset.menuScreen = "false";
  document.querySelector("#restart").hidden = false;
  bindingAction = null;
  if (resumeAfterOverlay) {
    pauseRequested = state.paused;
    resumeAfterOverlay = false;
  }
}

function createAccessibilityScreen(message = "") {
  pauseForOverlayMenu();
  const overlay = document.querySelector("#overlay");
  const title = document.querySelector("#overlay-title");
  const score = document.querySelector("#overlay-score");
  overlay.hidden = false;
  overlay.dataset.menuScreen = "true";
  document.querySelector("#restart").hidden = true;
  title.textContent = "Hỗ trợ tiếp cận";
  title.style.color = "#ffd889";

  const bindings = Object.entries(ACCESSIBILITY_KEYS).map(([action, key]) =>
    `<button type="button" data-bind-action="${action}">${ACCESSIBILITY_LABELS[action]}: ${formatKey(key)}</button>`
  ).join("");
  score.innerHTML = `
    <section class="settings-panel" aria-label="Cài đặt hỗ trợ tiếp cận">
      <label class="setting-row">Giảm chuyển động
        <input id="setting-reduced-motion" type="checkbox" ${accessibility.reducedMotion ? "checked" : ""}>
      </label>
      <label class="setting-row">Chế độ mù màu
        <input id="setting-colorblind" type="checkbox" ${accessibility.colorBlindMode ? "checked" : ""}>
      </label>
      <label class="setting-row">Chỉ báo hình ảnh cho sự kiện
        <input id="setting-visual-indicators" type="checkbox" ${accessibility.visualIndicators ? "checked" : ""}>
      </label>
      <label class="setting-row" for="setting-font-size">Cỡ chữ
        <select id="setting-font-size">
          <option value="1" ${accessibility.fontSizeMultiplier === 1 ? "selected" : ""}>Mặc định</option>
          <option value="1.25" ${accessibility.fontSizeMultiplier === 1.25 ? "selected" : ""}>Lớn hơn ×1,25</option>
        </select>
      </label>
      <h2>Đổi phím</h2>
      <p>Chọn hành động rồi nhấn phím mới. Phím trùng sẽ bị từ chối.</p>
      <div class="key-bindings">${bindings}</div>
      <p id="settings-message" class="settings-message" role="status">${message}</p>
      <button id="reset-key-bindings" type="button">Khôi phục phím mặc định</button>
    </section>
    <button id="close-accessibility" type="button">Đóng</button>
  `;

  score.querySelectorAll("[data-bind-action]").forEach((button) => {
    button.addEventListener("click", () => {
      bindingAction = button.dataset.bindAction;
      document.querySelector("#settings-message").textContent =
        `Nhấn phím mới cho hành động “${ACCESSIBILITY_LABELS[bindingAction]}”.`;
    });
  });
  document.querySelector("#setting-reduced-motion").addEventListener("change", (event) => {
    accessibility.reducedMotion = event.target.checked;
    applyAccessibility();
    saveAccessibility();
  });
  document.querySelector("#setting-colorblind").addEventListener("change", (event) => {
    accessibility.colorBlindMode = event.target.checked;
    applyAccessibility();
    saveAccessibility();
  });
  document.querySelector("#setting-visual-indicators").addEventListener("change", (event) => {
    accessibility.visualIndicators = event.target.checked;
    saveAccessibility();
  });
  document.querySelector("#setting-font-size").addEventListener("change", (event) => {
    accessibility.fontSizeMultiplier = Number(event.target.value);
    applyAccessibility();
    saveAccessibility();
  });
  document.querySelector("#reset-key-bindings").addEventListener("click", () => {
    resetKeyBindings();
    createAccessibilityScreen("Đã khôi phục phím mặc định.");
  });
  document.querySelector("#close-accessibility").addEventListener("click", closeOverlayMenu);
}

function showVisualEvent(text) {
  if (!accessibility.visualIndicators) return;
  const indicator = document.querySelector("#event-indicator");
  indicator.textContent = text;
  indicator.hidden = false;
  visualEventUntil = performance.now() + 2500;
}

function updateKeyHelp() {
  const help = document.querySelector("#help");
  if (!help) return;
  help.innerHTML = `
    <strong>${formatKey(ACCESSIBILITY_KEYS.moveUp)}${formatKey(ACCESSIBILITY_KEYS.moveLeft)}${formatKey(ACCESSIBILITY_KEYS.moveDown)}${formatKey(ACCESSIBILITY_KEYS.moveRight)}</strong> di chuyển ·
    <strong>Chuột</strong> quay camera ·
    <strong>${formatKey(ACCESSIBILITY_KEYS.jump)}</strong> nhảy ·
    <strong>${formatKey(ACCESSIBILITY_KEYS.dash)}</strong> lướt ·
    <strong>${formatKey(ACCESSIBILITY_KEYS.interact)}</strong> nạp đèn ·
    <strong>${formatKey(ACCESSIBILITY_KEYS.pulse)}</strong> Tỏa Sáng
  `;
}

let state = createInitialState(renderBenchmark?.seed ?? 42, 1);
if (demoMode) {
  applyScenario(state, {
    player: { pos: [0, 0, 23.5], carried: 13, capacity: 14 },
    motes: [],
    shades: [{ id: "S-demo", pos: [3.5, 0, 23.5], state: "chase", state_ticks_left: 120 }],
    random_motes: false,
    random_shades: false,
    random_drifters: false,
    wind_enabled: false
  });
}
if (renderBenchmark) {
  state.randomMotes = false;
  state.randomShades = false;
  state.randomDrifters = false;
  state.shades = Array.from({ length: 200 }, (_, index) => {
    const angle = index * Math.PI * 2 / 200;
    return {
      id: `SB${index + 1}`,
      pos: [Math.cos(angle) * 34, 0, Math.sin(angle) * 34],
      state: "wander",
      stateTicks: Number.MAX_SAFE_INTEGER,
      stunTicks: 0,
      hitCooldownTicks: 0,
      targetLanternId: null,
      recoil: { active: false, ticks: 0, nextState: "chase" }
    };
  });
  state.motes = Array.from({ length: 100 }, (_, index) => {
    const angle = index * Math.PI * 2 / 100;
    const radius = index % 2 === 0 ? 14 : 28;
    return {
      id: `MB${index + 1}`,
      pos: [Math.cos(angle) * radius, 0, Math.sin(angle) * radius],
      kind: "random",
      ttlS: Number.MAX_SAFE_INTEGER
    };
  });
  state.moteIdSequence = 100;
  state.lanterns.forEach((lantern, index) => {
    if (index < 3) {
      lantern.lit = true;
      lantern.fuel = 100;
      lantern.everLit = true;
    }
  });
  state.player.invulnTicks = Number.MAX_SAFE_INTEGER;
}
let totalScore = 0;
let currentNight = 1;
let visualEventUntil = 0;

loadAccessibility();
loadKeyBindings();
loadLeaderboard();
applyAccessibility();
updateKeyHelp();

syncLanternObjects(state);
syncMotes(state);
syncShades(state);
syncDrifters(state);
syncCharms(state);

const keys = new Set();
let pauseRequested = false;
let yaw = Math.PI / 4;
let cameraYaw = yaw;
let pitch = 0.35;
let isPointerLocked = false;
let isDraggingCamera = false;
let wasMoving = false;
let previousInteract = false;
let previousPulse = false;
let previousJump = false;
let previousDash = false;
let renderBenchmarkStartedAt = null;
let renderBenchmarkLastFrameAt = null;
let renderBenchmarkLoadMs = null;
const renderBenchmarkFrameIntervals = [];
let renderBenchmarkFrames = 0;
let renderBenchmarkComplete = false;

function finishRenderBenchmark(now) {
  if (!renderBenchmark || renderBenchmarkComplete || renderBenchmarkStartedAt === null) return;
  if (renderBenchmarkFrameIntervals.length === 0 || renderBenchmarkLoadMs === null) {
    throw new Error("Render benchmark did not capture a complete frame interval");
  }
  const sortedIntervals = [...renderBenchmarkFrameIntervals].sort((a, b) => b - a);
  const slowFrameCount = Math.max(1, Math.ceil(sortedIntervals.length * 0.01));
  const slowFrameAverage = sortedIntervals.slice(0, slowFrameCount)
    .reduce((sum, interval) => sum + interval, 0) / slowFrameCount;
  const ascendingIntervals = [...renderBenchmarkFrameIntervals].sort((a, b) => a - b);
  const p95Index = Math.min(ascendingIntervals.length - 1, Math.ceil(ascendingIntervals.length * 0.95) - 1);
  const requestedDurationMs = renderBenchmark.durationS * 1000;
  const actualDurationMs = now - renderBenchmarkStartedAt;
  const result = {
    contract_version: "1.3",
    benchmark_type: "render",
    seed: renderBenchmark.seed,
    requested_duration_s: renderBenchmark.durationS,
    warmup_s: 3,
    measured_duration_s: renderBenchmark.durationS,
    measurement_stop_overrun_ms: Number(Math.max(0, actualDurationMs - requestedDurationMs).toFixed(3)),
    avg_fps: Number((renderBenchmarkFrames * 1000 / requestedDurationMs).toFixed(3)),
    p1_low_fps: Number((1000 / slowFrameAverage).toFixed(3)),
    frame_ms_p95: Number(ascendingIntervals[p95Index].toFixed(3)),
    frames: renderBenchmarkFrames,
    load_ms: Number(renderBenchmarkLoadMs.toFixed(3)),
    scene: {
      shade_count: state.shades.length,
      mote_count: state.motes.length,
      lit_lantern_count: state.lanterns.filter((lantern) => lantern.lit).length
    },
    resolution: { width: innerWidth, height: innerHeight },
    device_pixel_ratio: renderer.getPixelRatio(),
    vsync_off: false,
    renderer: "Three.js WebGLRenderer",
    os: navigator.platform
  };
  result.passed = result.avg_fps >= 60 && result.p1_low_fps >= 30 && result.load_ms <= 10_000;
  const output = document.querySelector("#render-benchmark-result");
  output.textContent = JSON.stringify(result);
  output.dataset.status = "complete";
  output.hidden = false;
  renderBenchmarkComplete = true;
}

function recordRenderBenchmarkFrame(now) {
  if (!renderBenchmark || renderBenchmarkComplete) return;
  if (renderBenchmark.readyAt === null) return;
  const warmupEndsAt = renderBenchmark.readyAt + 3000;
  if (renderBenchmarkStartedAt === null) {
    if (now < warmupEndsAt) return;
    renderBenchmarkStartedAt = now;
    renderBenchmarkLastFrameAt = now;
    return;
  }
  if (now - renderBenchmarkStartedAt >= renderBenchmark.durationS * 1000) {
    finishRenderBenchmark(now);
    return;
  }
  renderBenchmarkFrameIntervals.push(now - renderBenchmarkLastFrameAt);
  renderBenchmarkLastFrameAt = now;
  renderBenchmarkFrames += 1;
}

function updateCamera(target, immediate = false) {
  const horizontalDistance = cameraDistance * Math.cos(pitch);
  const desired = new THREE.Vector3(
    target.x - Math.sin(cameraYaw) * horizontalDistance,
    target.y + cameraTargetHeight + Math.sin(pitch) * cameraDistance,
    target.z - Math.cos(cameraYaw) * horizontalDistance
  );
  if (immediate) {
    camera.position.copy(desired);
  } else {
    camera.position.lerp(desired, 0.12);
  }
  camera.lookAt(target.x, target.y + cameraTargetHeight, target.z);
}

updateCamera(new THREE.Vector3(...state.player.pos), true);

addEventListener("keydown", (event) => {
  if (bindingAction) {
    event.preventDefault();
    const action = bindingAction;
    const conflict = checkKeyConflict(event.code, action);
    if (conflict) {
      document.querySelector("#settings-message").textContent =
        `Phím ${formatKey(event.code)} đã được gán cho “${ACCESSIBILITY_LABELS[conflict]}”.`;
      return;
    }
    ACCESSIBILITY_KEYS[action] = event.code;
    bindingAction = null;
    saveKeyBindings();
    updateKeyHelp();
    createAccessibilityScreen("Đã lưu phím mới.");
    return;
  }
  const activeOverlay = document.querySelector("#overlay");
  if (!activeOverlay.hidden && activeOverlay.dataset.menuScreen === "true") {
    if (event.code === "Escape") closeOverlayMenu();
    event.preventDefault();
    return;
  }
  if (event.code === "Space") event.preventDefault();
  if (event.code === ACCESSIBILITY_KEYS.pause || event.code === "KeyP") {
    if (!event.repeat) pauseRequested = true;
    event.preventDefault();
    return;
  }
  keys.add(event.code);
});
addEventListener("keyup", (event) => keys.delete(event.code));

canvas.addEventListener("mousedown", () => {
  if (!isPointerLocked) isDraggingCamera = true;
});
document.addEventListener("mouseup", () => {
  isDraggingCamera = false;
});

canvas.addEventListener("click", () => {
  if (!isPointerLocked) {
    canvas.requestPointerLock();
    audio.init();
  }
});

document.addEventListener("pointerlockchange", () => {
  isPointerLocked = document.pointerLockElement === canvas;
  const hint = document.querySelector("#pointer-hint");
  if (hint) {
    if (isPointerLocked) {
      hint.classList.add("hidden");
    } else {
      hint.classList.remove("hidden");
    }
  }
});

document.addEventListener("pointerlockerror", () => {
  console.error("Pointer lock failed");
  const hint = document.querySelector("#pointer-hint");
  if (hint) hint.textContent = "Giữ và kéo chuột để xoay camera";
});

addEventListener("mousemove", (event) => {
  if (!isPointerLocked && !isDraggingCamera) return;
  yaw -= event.movementX * 0.002;
  pitch -= event.movementY * 0.002;
  // Clamp pitch between -10° and 50°
  pitch = Math.max(-0.17, Math.min(0.87, pitch));
});

// Handle night transitions
document.addEventListener("click", (e) => {
  if (e.target.id === "next-night") {
    currentNight++;
    if (currentNight > 3) {
      // Game complete
      const overlay = document.querySelector("#overlay");
      const title = document.querySelector("#overlay-title");
      const score = document.querySelector("#overlay-score");
      
      overlay.hidden = false;
      title.textContent = "Chúc mừng!";
      score.innerHTML = `
        <p style="font-size:32px;color:#ffd889">Hoàn thành cả 3 Đêm!</p>
        <p style="font-size:24px;color:#fff8d8">Tổng điểm: ${totalScore}</p>
        <button id="restart-game" style="margin-top:20px">Chơi lại từ đầu</button>
      `;
    } else {
      state = createInitialState(Date.now() & 0xffff, currentNight);
      scene.remove(nightMeshes[state.night - 1]);
      scene.add(nightMeshes[state.night]);
      overlay.hidden = true;
      audio.playNightStart(state.night);
      syncLanternObjects(state);
      syncMotes(state);
      syncShades(state);
      syncDrifters(state);
      syncCharms(state);
    }
  } else if (e.target.id === "retry-night") {
    state = createInitialState(Date.now() & 0xffff, currentNight);
    scene.remove(nightMeshes[state.night - 1]);
    scene.add(nightMeshes[state.night]);
    overlay.hidden = true;
    syncLanternObjects(state);
    syncMotes(state);
    syncShades(state);
    syncDrifters(state);
    syncCharms(state);
  } else if (e.target.id === "restart-game") {
    const previousNight = state.night;
    currentNight = 1;
    totalScore = 0;
    state = createInitialState(Date.now() & 0xffff, 1);
    scene.remove(nightMeshes[previousNight]);
    scene.add(nightMeshes[state.night]);
    overlay.hidden = true;
    syncLanternObjects(state);
    syncMotes(state);
    syncShades(state);
    syncDrifters(state);
    syncCharms(state);
  }
});

const overlay = document.querySelector("#overlay");
overlay.hidden = true;

document.querySelector("#open-accessibility").addEventListener("click", () => {
  createAccessibilityScreen();
});
document.querySelector("#open-leaderboard").addEventListener("click", showLeaderboard);
document.querySelector("#restart").addEventListener("click", () => {
  const previousNight = state.night;
  state = createInitialState(Date.now() & 0xffff, currentNight);
  if (previousNight !== currentNight) scene.remove(nightMeshes[previousNight]);
  scene.add(nightMeshes[currentNight]);
  syncLanternObjects(state);
  syncMotes(state);
  syncShades(state);
  syncDrifters(state);
  syncCharms(state);
  overlay.hidden = true;
});

let previousTime = performance.now();
let accumulator = 0;
let lastWindActive = false;

function animate(now) {
  requestAnimationFrame(animate);
  const elapsed = Math.min(100, now - previousTime);
  previousTime = now;
  accumulator += elapsed;
  if (renderBenchmark) {
    yaw = Math.PI / 4 + (now - (renderBenchmark.readyAt ?? appStartedAt)) / 1000 * 0.35;
  }

  while (!renderBenchmark && accumulator >= 1000 / 60 && state.state === "playing") {
    // Camera-relative movement: rotate input by yaw
    const rawMoveX = (keys.has(ACCESSIBILITY_KEYS.moveRight) ? 1 : 0) - (keys.has(ACCESSIBILITY_KEYS.moveLeft) ? 1 : 0);
    const rawMoveY = (keys.has(ACCESSIBILITY_KEYS.moveUp) ? 1 : 0) - (keys.has(ACCESSIBILITY_KEYS.moveDown) ? 1 : 0);
    
    const move = [rawMoveX, rawMoveY];
    
    const interact = keys.has(ACCESSIBILITY_KEYS.interact);
    const pulse = keys.has(ACCESSIBILITY_KEYS.pulse);
    const jump = keys.has(ACCESSIBILITY_KEYS.jump);
    const dash = keys.has(ACCESSIBILITY_KEYS.dash) ||
      (ACCESSIBILITY_KEYS.dash === "ShiftLeft" && keys.has("ShiftRight"));
    const pause = pauseRequested;
    pauseRequested = false;
    
    const result = advanceState(state, {
      move,
      cam_yaw_deg: (yaw * 180 / Math.PI) % 360,
      jump: jump && !previousJump,
      interact: interact && !previousInteract,
      pulse: pulse && !previousPulse,
      dash: dash && !previousDash,
      pause
    });

    if (jump && !previousJump) audio.playJump();
    
    previousJump = jump;
    result.events.forEach(event => {
      if (event.name === "mote_picked") {
        audio.playCollect();
        showVisualEvent("Đã nhặt đom đóm");
        if (!accessibility.reducedMotion) {
          createParticleExplosion(
            new THREE.Vector3(state.player.pos[0], state.player.pos[1] + 0.65, state.player.pos[2]),
            0xffd700,
            12,
            0.3
          );
        }
      }
      if (event.name === "lantern_lit") {
        audio.playLanternLight();
        showVisualEvent("Đèn lồng đã được thắp sáng");
        if (!accessibility.reducedMotion) {
          createParticleExplosion(
            new THREE.Vector3(state.player.pos[0], 2.4, state.player.pos[2]),
            0xffb347,
            20,
            0.4
          );
        }
      }
      if (event.name === "pulse") {
        audio.playPulse();
        if (!accessibility.reducedMotion) {
          createPulseRing(new THREE.Vector3(state.player.pos[0], 0, state.player.pos[2]));
        }
        showVisualEvent("Tỏa Sáng");
      }
      if (event.name === "player_hit") {
        audio.playHit();
        showVisualEvent("⚠ Bạn bị đánh trúng");
        if (!accessibility.reducedMotion) {
          createParticleExplosion(
            new THREE.Vector3(state.player.pos[0], 1, state.player.pos[2]),
            0xff5a5f,
            8,
            0.2
          );
        }
      }
      if (event.name === "dash") {
        audio.playDash();
        const dir = new THREE.Vector3(
          Math.sin(yaw),
          0,
          Math.cos(yaw)
        );
        if (!accessibility.reducedMotion) {
          createDashTrail(new THREE.Vector3(state.player.pos[0], 1, state.player.pos[2]), dir);
        }
      }
      if (event.name === "drifter_steal") showVisualEvent("⚠ Bóng Mực Gió Lạc đã lấy đom đóm");
      if (event.name === "lantern_out") showVisualEvent("⚠ Đèn lồng đã tắt");
    });
    
    previousInteract = interact;
    previousPulse = pulse;
    previousDash = dash;
    
    state = result.state;
    
    // Check for game over
    if (state.state !== "playing") {
      if (state.state === "won") {
        totalScore += state.score;
        createGameOverScreen(state);
        audio.init();
        audio.playWin();
      } else if (state.state === "lost") {
        createGameOverScreen(state);
        audio.init();
        audio.playLose();
      }
    }
    
    accumulator -= 1000 / 60;
  }
  if (renderBenchmark) accumulator = 0;
  
  // Update 3D objects
  const target = new THREE.Vector3(
    state.player.pos[0],
    state.player.pos[1],
    state.player.pos[2]
  );
  playerMesh.position.copy(target);
  
  // Walking animation
  const isMoving = [
    ACCESSIBILITY_KEYS.moveUp,
    ACCESSIBILITY_KEYS.moveDown,
    ACCESSIBILITY_KEYS.moveLeft,
    ACCESSIBILITY_KEYS.moveRight
  ].some((key) => keys.has(key));
  const followsMovement = isMoving && state.state === "playing" && !state.paused;
  let targetCameraYaw = yaw;
  
  // Calculate movement direction for player rotation
  if (followsMovement) {
    const moveX = (keys.has(ACCESSIBILITY_KEYS.moveRight) ? 1 : 0) - (keys.has(ACCESSIBILITY_KEYS.moveLeft) ? 1 : 0);
    const moveY = (keys.has(ACCESSIBILITY_KEYS.moveUp) ? 1 : 0) - (keys.has(ACCESSIBILITY_KEYS.moveDown) ? 1 : 0);
    const worldX = -moveX * Math.cos(yaw) + moveY * Math.sin(yaw);
    const worldZ = moveX * Math.sin(yaw) + moveY * Math.cos(yaw);
    
    // Set player facing direction based on movement
    if (Math.abs(worldX) > 0.01 || Math.abs(worldZ) > 0.01) {
      playerMesh.userData.targetYaw = Math.atan2(worldX, worldZ);
    }
    
    targetCameraYaw = Math.atan2(worldX, worldZ);
  } else if (wasMoving) {
    yaw = cameraYaw;
    targetCameraYaw = yaw;
  }
  
  // Smooth player rotation
  const currentYaw = playerMesh.rotation.y;
  const targetYaw = playerMesh.userData.targetYaw;
  const yawDiff = Math.atan2(Math.sin(targetYaw - currentYaw), Math.cos(targetYaw - currentYaw));
  playerMesh.rotation.y += yawDiff * (accessibility.reducedMotion ? 1 : 0.15);
  
  const yawDelta = Math.atan2(
    Math.sin(targetCameraYaw - cameraYaw),
    Math.cos(targetCameraYaw - cameraYaw)
  );
  cameraYaw += yawDelta * (accessibility.reducedMotion ? 1 : 1 - Math.exp(-elapsed / 180));
  wasMoving = followsMovement;

  if (isMoving && !accessibility.reducedMotion) {
    playerMesh.userData.walkTime += 0.15;
    // Bob up and down
    playerMesh.position.y = target.y + Math.sin(playerMesh.userData.walkTime) * 0.05;
    // Slight tilt in movement direction
    playerMesh.rotation.x = Math.sin(playerMesh.userData.walkTime) * 0.03;
  } else {
    playerMesh.userData.walkTime = 0;
    playerMesh.rotation.x = 0;
  }
  
  updateCamera(target, accessibility.reducedMotion);

  const lanternCharge = Math.min(1, state.player.carried / Math.max(state.player.capacity, 1));
  const hasLight = state.player.carried > 0;
  handLight.intensity = THREE.MathUtils.lerp(handLight.intensity, hasLight ? 1.4 + lanternCharge * 1.6 : 0.5, 0.12);
  handLight.distance = THREE.MathUtils.lerp(handLight.distance, hasLight ? 8 + lanternCharge * 6 : 5, 0.12);
  glow.intensity = THREE.MathUtils.lerp(glow.intensity, hasLight ? 0.8 + lanternCharge * 1.2 : 0, 0.12);
  glow.distance = THREE.MathUtils.lerp(glow.distance, hasLight ? 12 + lanternCharge * 8 : 8, 0.12);
  
  // Update dynamic light intensity based on lit lanterns
  const litCount = state.lanterns.filter(l => l.lit).length;
  const totalLanterns = state.lanterns.length;
  const lightIntensity = 0.15 + 0.55 * (litCount / totalLanterns);
  ambientLight.intensity = lightIntensity;
  
  // Improve fog based on lit lanterns - more lanterns = less fog
  const fogDensity = 0.008 - 0.004 * (litCount / totalLanterns);
  scene.fog.density = fogDensity;
  
  // Wind warning
  if (state.windEnabled && state.wind.active && !lastWindActive) {
    audio.playWarning();
    showVisualEvent(`⚠ Gió mạnh · ${Math.round(state.wind.dirDeg)}°`);
  }
  lastWindActive = state.wind.active;
  
  syncLanternObjects(state);
  syncMotes(state);
  syncShades(state);
  syncDrifters(state);
  syncCharms(state);
  updateParticles();
  
  if (accessibility.visualIndicators && state.player.flames <= 1) {
    showVisualEvent(`⚠ Nguy hiểm: còn ${state.player.flames} Ngọn Lửa`);
  } else if (now >= visualEventUntil) {
    document.querySelector("#event-indicator").hidden = true;
  }

  // Animate star twinkling
  const sizes = stars.geometry.attributes.size.array;
  const phases = stars.userData.phases;
  const originalSizes = stars.userData.originalSizes;
  const count = stars.userData.count;
  const time = now * 0.003;
  for (let i = 0; i < count && !renderBenchmark && !accessibility.reducedMotion; i++) {
    const twinkle = Math.sin(time + phases[i]) * 0.5 + 0.5;
    sizes[i] = originalSizes[i] * (0.5 + twinkle * 0.5);
  }
  if (!renderBenchmark && !accessibility.reducedMotion) stars.geometry.attributes.size.needsUpdate = true;
  
  // Animate water shimmer
  if (!renderBenchmark && !accessibility.reducedMotion) {
    const waterTime = now * 0.001;
    nightMeshes[state.night].traverse((child) => {
      if (child.userData.isWater && child.geometry) {
        const position = child.geometry.attributes.position;
        if (position) {
          const baseY = child.geometry.userData.baseY ||
            (child.geometry.userData.baseY = Array.from({ length: position.count }, (_, i) => position.getY(i)));
          for (let i = 0; i < position.count; i++) {
            const x = position.getX(i);
            const z = position.getZ(i);
            position.setY(i, baseY[i] + Math.sin(waterTime + x * 0.1 + z * 0.1) * 0.02);
          }
          position.needsUpdate = true;
        }
      }
    });
  }
  
  if (!renderBenchmark) updateHud(state);
  renderer.render(scene, camera);
  if (renderBenchmark && renderBenchmarkLoadMs === null) {
    renderBenchmarkLoadMs = performance.now() - appStartedAt;
    renderBenchmark.readyAt = now;
  }
  recordRenderBenchmarkFrame(now);
  
  // Update minimap
  if (!renderBenchmark) updateMinimap(state);
}

requestAnimationFrame(animate);

// Minimap canvas
const minimapCanvas = document.querySelector("#minimap");
const minimapCtx = minimapCanvas.getContext("2d");
const minimapSize = 180;
minimapCanvas.width = minimapSize;
minimapCanvas.height = minimapSize;

const minimapScale = 0.8; // Scale factor for minimap

function updateMinimap(state) {
  // Clear minimap
  minimapCtx.fillStyle = "rgba(14, 20, 48, 0.95)";
  minimapCtx.fillRect(0, 0, minimapSize, minimapSize);
  
  const cx = minimapSize / 2;
  const cy = minimapSize / 2;
  
  // Get player position
  const px = state.player.pos[0];
  const pz = state.player.pos[2];
  
  // Draw lanterns
  state.lanterns.forEach(lantern => {
    const mx = cx + (lantern.pos[0] - px) * minimapScale;
    const my = cy + (lantern.pos[2] - pz) * minimapScale;
    
    minimapCtx.fillStyle = lantern.lit ? "#FFB347" : "#5B5F6E";
    minimapCtx.beginPath();
    minimapCtx.arc(mx, my, 4, 0, Math.PI * 2);
    minimapCtx.fill();
    
    // Draw range circle for lit lanterns
    if (lantern.lit) {
      minimapCtx.strokeStyle = "rgba(255, 179, 71, 0.3)";
      minimapCtx.lineWidth = 1;
      minimapCtx.beginPath();
      minimapCtx.arc(mx, my, TUNING.safeRadius * minimapScale, 0, Math.PI * 2);
      minimapCtx.stroke();
    }
  });
  
  // Draw safe zones (lanterns that are lit and have sufficient fuel)
  const safeLanterns = state.lanterns.filter(l => l.lit && l.fuel >= TUNING.lowFuelThreshold);
  safeLanterns.forEach(lantern => {
    const mx = cx + (lantern.pos[0] - px) * minimapScale;
    const my = cy + (lantern.pos[2] - pz) * minimapScale;
    
    minimapCtx.strokeStyle = "rgba(255, 179, 71, 0.6)";
    minimapCtx.lineWidth = 2;
    minimapCtx.beginPath();
    minimapCtx.arc(mx, my, TUNING.safeRadius * minimapScale, 0, Math.PI * 2);
    minimapCtx.stroke();
  });
  
  // Draw shades
  state.shades.forEach(shade => {
    const mx = cx + (shade.pos[0] - px) * minimapScale;
    const my = cy + (shade.pos[2] - pz) * minimapScale;
    
    // Only draw if within minimap range
    if (mx >= -20 && mx <= minimapSize + 20 && my >= -20 && my <= minimapSize + 20) {
      if (shade.state === "stunned") {
        minimapCtx.fillStyle = "#3A3450";
      } else {
        minimapCtx.fillStyle = "#7A3CFF";
      }
      minimapCtx.beginPath();
      minimapCtx.arc(mx, my, 3, 0, Math.PI * 2);
      minimapCtx.fill();
    }
  });
  
  // Draw drifters
  state.drifters.forEach(drifter => {
    if (drifter.state === "removed") return;
    
    const mx = cx + (drifter.pos[0] - px) * minimapScale;
    const my = cy + (drifter.pos[2] - pz) * minimapScale;
    
    // Only draw if within minimap range
    if (mx >= -20 && mx <= minimapSize + 20 && my >= -20 && my <= minimapSize + 20) {
      minimapCtx.fillStyle = "#8FA3B8";
      minimapCtx.fillRect(mx - 2, my - 2, 4, 4);
    }
  });
  
  // Draw motes
  state.motes.forEach(mote => {
    const mx = cx + (mote.pos[0] - px) * minimapScale;
    const my = cy + (mote.pos[2] - pz) * minimapScale;
    
    // Only draw if within minimap range
    if (mx >= -15 && mx <= minimapSize + 15 && my >= -15 && my <= minimapSize + 15) {
      minimapCtx.fillStyle = "#FFF6C2";
      minimapCtx.beginPath();
      minimapCtx.arc(mx, my, 1.5, 0, Math.PI * 2);
      minimapCtx.fill();
    }
  });
  
  // Draw player (center of minimap)
  minimapCtx.fillStyle = "#E8E2D0";
  minimapCtx.beginPath();
  minimapCtx.arc(cx, cy, 5, 0, Math.PI * 2);
  minimapCtx.fill();
  
  // Draw player direction indicator (based on movement)
  const isMoving = (keys.has("KeyW") || keys.has("KeyS") || keys.has("KeyA") || keys.has("KeyD"));
  if (isMoving && state.state === "playing" && !state.paused) {
    const moveX = (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0);
    const moveY = (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0);
    const worldX = -moveX * Math.cos(yaw) + moveY * Math.sin(yaw);
    const worldZ = moveX * Math.sin(yaw) + moveY * Math.cos(yaw);
    
    if (Math.abs(worldX) > 0.01 || Math.abs(worldZ) > 0.01) {
      const angle = Math.atan2(worldX, worldZ);
      const dx = Math.sin(angle) * 8;
      const dy = Math.cos(angle) * 8;
      
      minimapCtx.strokeStyle = "#E8E2D0";
      minimapCtx.lineWidth = 2;
      minimapCtx.beginPath();
      minimapCtx.moveTo(cx, cy);
      minimapCtx.lineTo(cx + dx, cy - dy);
      minimapCtx.stroke();
    }
  }
}

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
