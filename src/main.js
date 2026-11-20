import * as THREE from "three";
import { advanceState, createInitialState, TUNING } from "./game-engine.js";
import "./style.css";

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
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0e1430);
scene.fog = new THREE.FogExp2(0x0e1430, 0.006);

const camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.1, 500);
camera.position.set(15, 10, 15);

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

const playerMesh = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.45, 1, 6, 12),
  new THREE.MeshStandardMaterial({ 
    color: 0xe8e2d0,
    roughness: 0.5,
    metalness: 0.3
  })
);
body.position.y = 1;
body.castShadow = true;
playerMesh.add(body);

const scarf = new THREE.Mesh(
  new THREE.TorusGeometry(0.6, 0.08, 8, 24),
  new THREE.MeshStandardMaterial({ 
    color: 0xc8102e,
    roughness: 0.6
  })
);
scarf.position.y = 1.5;
scarf.rotation.y = Math.PI / 4;
playerMesh.add(scarf);

const glow = new THREE.PointLight(0xe8e2d0, 0, 8);
glow.position.set(0, 1.5, 0);
playerMesh.add(glow);

scene.add(playerMesh);

const lanternObjects = new Map();
const moteObjects = new Map();
const shadeObjects = new Map();
const drifterObjects = new Map();
const charmObjects = new Map();
const safeZoneObjects = new Map();

function makeLantern(lantern) {
  const group = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 2.5, 8),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2f })
  );
  post.position.y = 1.25;
  post.castShadow = true;
  group.add(post);
  
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 16, 12),
    new THREE.MeshStandardMaterial({ 
      color: 0xffe9b0, 
      emissive: 0x000000, 
      emissiveIntensity: 0 
    })
  );
  bulb.position.y = 2.4;
  group.add(bulb);
  
  const light = new THREE.PointLight(0xffb347, 0, 15);
  light.position.y = 2.4;
  light.castShadow = true;
  group.add(light);
  
  group.userData.bulb = bulb;
  group.userData.light = light;
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
    
    const targetEmissive = new THREE.Color(lantern.lit ? 0xffb347 : 0x000000);
    object.userData.bulb.material.emissive.lerp(targetEmissive, 0.2);
    object.userData.bulb.material.emissiveIntensity = THREE.MathUtils.lerp(
      object.userData.bulb.material.emissiveIntensity, 
      lantern.lit ? 0.8 : 0, 
      0.1
    );
    object.userData.light.intensity = THREE.MathUtils.lerp(
      object.userData.light.intensity, 
      lantern.lit ? 20 : 0, 
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
    obj.rotation.y += 0.05;
  }
}

function syncShades(state) {
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
      obj = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.7, 0),
        new THREE.MeshStandardMaterial({ 
          color: 0x120a1a, 
          roughness: 0.4,
          metalness: 0.5
        })
      );
      obj.castShadow = true;
      shadeObjects.set(shade.id, obj);
      scene.add(obj);
    }
    obj.position.set(shade.pos[0], 0.65, shade.pos[2]);
    
    if (shade.state === "stunned") {
      obj.material.color.setHex(0x3a3450);
      obj.material.emissive.setHex(0x7a3cff);
      obj.material.emissiveIntensity = 0.3;
    } else if (shade.state === "recoil") {
      obj.material.emissive.setHex(0x120a1a);
      obj.material.color.setHex(0x120a1a);
    } else {
      obj.material.emissive.setHex(0x000000);
      obj.material.color.setHex(0x120a1a);
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
    obj.userData.pulse += 0.1;
    obj.scale.setScalar(1 + Math.sin(obj.userData.pulse) * 0.1);
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
    dashCd.querySelector(":after").style.height = `${dashProgress * 100}%`;
  }
  
  if (pulseCd) {
    const pulseProgress = state.player.pulseCdTicks / (TUNING.pulseCooldownS * 60);
    pulseCd.querySelector(":after").style.height = `${pulseProgress * 100}%`;
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
  
  if (state.state === "won") {
    title.textContent = "Bình Minh!";
    title.style.color = "#ffd889";
    score.innerHTML = `
      <p style="font-size:24px;color:#fff8d8">Đêm ${state.night} hoàn thành!</p>
      <p style="font-size:18px;color:#b9bdd9">Điểm: ${state.score}</p>
      <p style="font-size:16px;color:#8fa3b8">Tổng điểm: ${state.score}</p>
      <button id="next-night" style="margin-top:20px">Đêm tiếp theo</button>
    `;
  } else {
    title.textContent = "Sương đen nuốt ánh sáng";
    title.style.color = "#ff5a5f";
    score.innerHTML = `
      <p style="font-size:24px;color:#fff8d8">Thời gian: ${Math.floor(state.timeLeftS / 60)}m ${Math.floor(state.timeLeftS % 60)}s</p>
      <p style="font-size:18px;color:#b9bdd9">Điểm: ${state.score}</p>
      <button id="retry-night" style="margin-top:20px">Chơi lại Đêm này</button>
    `;
  }
}

let state = createInitialState(42, 1);
let totalScore = 0;
let currentNight = 1;

syncLanternObjects(state);
syncMotes(state);
syncShades(state);
syncDrifters(state);
syncCharms(state);

const keys = new Set();
let yaw = Math.PI / 4;
let pointerDown = false;
let previousX = 0;
let previousInteract = false;
let previousPulse = false;
let previousDash = false;
let previousPause = false;

addEventListener("keydown", (event) => {
  keys.add(event.code);
  if (event.code === "Escape" || event.code === "KeyP") {
    keys.delete("Escape");
    keys.delete("KeyP");
    previousPause = false;
  }
});
addEventListener("keyup", (event) => keys.delete(event.code));

canvas.addEventListener("pointerdown", (event) => {
  pointerDown = true;
  previousX = event.clientX;
  audio.init();
});
addEventListener("pointerup", () => { pointerDown = false; });
addEventListener("pointermove", (event) => {
  if (!pointerDown) return;
  yaw -= (event.clientX - previousX) * 0.005;
  previousX = event.clientX;
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
    syncLanternObjects(state);
    syncMotes(state);
    syncShades(state);
    syncDrifters(state);
    syncCharms(state);
  } else if (e.target.id === "restart-game") {
    currentNight = 1;
    totalScore = 0;
    state = createInitialState(Date.now() & 0xffff, 1);
    scene.remove(nightMeshes[state.night - 1]);
    scene.add(nightMeshes[state.night]);
    syncLanternObjects(state);
    syncMotes(state);
    syncShades(state);
    syncDrifters(state);
    syncCharms(state);
  }
});

const overlay = document.querySelector("#overlay");
overlay.hidden = true;

let previousTime = performance.now();
let accumulator = 0;
let lastNotificationTime = 0;

function animate(now) {
  requestAnimationFrame(animate);
  const elapsed = Math.min(100, now - previousTime);
  previousTime = now;
  accumulator += elapsed;

  while (accumulator >= 1000 / 60 && state.state === "playing") {
    const move = [
      (keys.has("KeyD") ? 1 : 0) - (keys.has("KeyA") ? 1 : 0),
      (keys.has("KeyW") ? 1 : 0) - (keys.has("KeyS") ? 1 : 0)
    ];
    const interact = keys.has("KeyE");
    const pulse = keys.has("KeyF");
    const dash = keys.has("Space") || keys.has("ShiftLeft");
    const pause = keys.has("Escape") || keys.has("KeyP");
    
    const result = advanceState(state, {
      move,
      cam_yaw_deg: (yaw * 180 / Math.PI) % 360,
      interact: interact && !previousInteract,
      pulse: pulse && !previousPulse,
      dash: dash && !previousDash,
      pause: pause && !previousPause
    });
    
    result.events.forEach(event => {
      if (event.name === "mote_picked") audio.playCollect();
      if (event.name === "lantern_lit") audio.playLanternLight();
      if (event.name === "pulse") audio.playPulse();
      if (event.name === "player_hit") audio.playHit();
      if (event.name === "dash") audio.playDash();
    });
    
    previousInteract = interact;
    previousPulse = pulse;
    previousDash = dash;
    previousPause = pause;
    
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
  
  // Update 3D objects
  const target = new THREE.Vector3(
    state.player.pos[0],
    state.player.pos[1],
    state.player.pos[2]
  );
  playerMesh.position.copy(target);
  
  // Calculate camera position based on yaw
  const camDist = 12;
  const camHeight = 8;
  const targetCameraX = target.x + Math.sin(yaw) * camDist;
  const targetCameraY = target.y + camHeight;
  const targetCameraZ = target.z + Math.cos(yaw) * camDist;
  
  camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCameraX, 0.15);
  camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCameraY, 0.15);
  camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCameraZ, 0.15);
  camera.lookAt(target);
  
  // Update dynamic light intensity based on lit lanterns
  const litCount = state.lanterns.filter(l => l.lit).length;
  const totalLanterns = state.lanterns.length;
  const lightIntensity = 0.15 + 0.55 * (litCount / totalLanterns);
  ambientLight.intensity = lightIntensity;
  
  // Wind warning
  if (state.windEnabled && state.wind.active && now - lastNotificationTime > 2000) {
    audio.playWarning();
    lastNotificationTime = now;
  }
  
  syncLanternObjects(state);
  syncMotes(state);
  syncShades(state);
  syncDrifters(state);
  syncCharms(state);
  updateParticles();
  updateHud(state);
  renderer.render(scene, camera);
}

requestAnimationFrame(animate);

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
