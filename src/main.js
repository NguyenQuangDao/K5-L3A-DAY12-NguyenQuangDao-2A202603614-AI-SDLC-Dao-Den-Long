import * as THREE from "three";
import "./style.css";
import { advanceState, createInitialState, makeSnapshot } from "./game-engine.js";

const canvas = document.querySelector("#game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x090b1a);
scene.fog = new THREE.FogExp2(0x090b1a, 0.012);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 500);
camera.position.set(12, 9, 12);

scene.add(new THREE.HemisphereLight(0x8095c9, 0x17102a, 0.7));

const island = new THREE.Mesh(
  new THREE.CylinderGeometry(32, 34, 2, 48),
  new THREE.MeshStandardMaterial({ color: 0x263542, roughness: 0.9 })
);
island.position.y = -1;
island.receiveShadow = true;
scene.add(island);

const playerMesh = new THREE.Group();
const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.42, 0.9, 6, 12),
  new THREE.MeshStandardMaterial({ color: 0x5cc9c2 })
);
body.position.y = 0.9;
body.castShadow = true;
playerMesh.add(body);
const hat = new THREE.Mesh(
  new THREE.ConeGeometry(0.75, 0.35, 16),
  new THREE.MeshStandardMaterial({ color: 0xb7a66a })
);
hat.position.y = 1.75;
hat.castShadow = true;
playerMesh.add(hat);
scene.add(playerMesh);

const lanternObjects = new Map();
const moteObjects = new Map();
const shadeObjects = new Map();

function makeLantern(lantern) {
  const group = new THREE.Group();
  const post = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 2, 8),
    new THREE.MeshStandardMaterial({ color: 0x7b6548 })
  );
  post.position.y = 1;
  post.castShadow = true;
  group.add(post);
  const bulb = new THREE.Mesh(
    new THREE.SphereGeometry(0.32, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0x55505b, emissive: 0x000000 })
  );
  bulb.position.y = 2.15;
  group.add(bulb);
  const light = new THREE.PointLight(0xffb84d, 0, 12);
  light.position.y = 2.15;
  group.add(light);
  group.userData.bulb = bulb;
  group.userData.light = light;
  lanternObjects.set(lantern.id, group);
  scene.add(group);
}

function syncLanternObjects(state) {
  for (const lantern of state.lanterns) {
    let object = lanternObjects.get(lantern.id);
    if (!object) {
      makeLantern(lantern);
      object = lanternObjects.get(lantern.id);
    }
    object.position.set(lantern.pos[0], lantern.pos[1], lantern.pos[2]);
    object.userData.bulb.material.color.set(lantern.lit ? 0xffbd63 : 0x55505b);
    object.userData.bulb.material.emissive.set(lantern.lit ? 0xff9f32 : 0x000000);
    object.userData.light.intensity = lantern.lit ? 18 : 0;
  }
  document.querySelector("#lanterns").innerHTML = state.lanterns
    .map((lantern) => `<span class="lantern-dot ${lantern.lit ? "lit" : ""}"></span>`)
    .join("");
}

function syncMotes(state) {
  const ids = new Set(state.motes.map((mote) => mote.id));
  for (const [id, object] of moteObjects) {
    if (!ids.has(id)) {
      scene.remove(object);
      moteObjects.delete(id);
    }
  }
  for (const mote of state.motes) {
    let object = moteObjects.get(mote.id);
    if (!object) {
      object = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xc8ff9a })
      );
      moteObjects.set(mote.id, object);
      scene.add(object);
    }
    object.position.set(mote.pos[0], 0.65, mote.pos[2]);
  }
}

function syncShades(state) {
  const ids = new Set(state.shades.map((shade) => shade.id));
  for (const [id, object] of shadeObjects) {
    if (!ids.has(id)) {
      scene.remove(object);
      shadeObjects.delete(id);
    }
  }
  for (const shade of state.shades) {
    let object = shadeObjects.get(shade.id);
    if (!object) {
      object = new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.55, 1),
        new THREE.MeshStandardMaterial({ color: 0x21162d, emissive: 0x16001f, roughness: 0.4 })
      );
      object.castShadow = true;
      shadeObjects.set(shade.id, object);
      scene.add(object);
    }
    object.position.set(shade.pos[0], 0.65, shade.pos[2]);
    object.material.emissive.set(shade.state === "stunned" ? 0x764f2c : 0x16001f);
  }
}

let state = createInitialState(42, 1);
syncLanternObjects(state);
syncMotes(state);
syncShades(state);

const keys = new Set();
let yaw = 45 * Math.PI / 180;
let pointerDown = false;
let previousX = 0;
let previousInteract = false;
let previousPulse = false;

addEventListener("keydown", (event) => keys.add(event.code));
addEventListener("keyup", (event) => keys.delete(event.code));
canvas.addEventListener("pointerdown", (event) => {
  pointerDown = true;
  previousX = event.clientX;
});
addEventListener("pointerup", () => { pointerDown = false; });
addEventListener("pointermove", (event) => {
  if (!pointerDown) return;
  yaw -= (event.clientX - previousX) * 0.005;
  previousX = event.clientX;
});

document.querySelector("#restart").addEventListener("click", () => {
  state = createInitialState(Date.now() & 0xffff, 1);
  document.querySelector("#overlay").hidden = true;
  syncLanternObjects(state);
  syncMotes(state);
  syncShades(state);
});

function updateHud() {
  document.querySelector("#carried").textContent = state.player.carried;
  document.querySelector("#flames").textContent = state.player.flames;
  document.querySelector("#score").textContent = state.score;
  document.querySelector("#time").textContent = Math.ceil(state.timeLeftS);
}

let previousTime = performance.now();
let accumulator = 0;
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
    const result = advanceState(state, {
      move,
      cam_yaw_deg: yaw * 180 / Math.PI,
      interact: interact && !previousInteract,
      pulse: pulse && !previousPulse
    });
    previousInteract = interact;
    previousPulse = pulse;
    state = result.state;
    accumulator -= 1000 / 60;
  }

  if (state.state !== "playing") {
    const overlay = document.querySelector("#overlay");
    overlay.hidden = false;
    document.querySelector("#overlay-title").textContent = state.state === "won" ? "Đảo sáng trở lại" : "Sương đen đã nuốt ánh sáng";
    document.querySelector("#overlay-score").textContent = `Điểm: ${state.score}`;
  }

  const target = new THREE.Vector3(
    state.player.pos[0],
    state.player.pos[1],
    state.player.pos[2]
  );
  playerMesh.position.copy(target);
  const distance = 10;
  camera.position.set(
    target.x + Math.sin(yaw) * distance,
    target.y + 7,
    target.z + Math.cos(yaw) * distance
  );
  camera.lookAt(target);

  syncLanternObjects(state);
  syncMotes(state);
  syncShades(state);
  updateHud();
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);

addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
