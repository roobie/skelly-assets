// The showcase page: a grid of thumbnails drawn by one shared offscreen renderer, and a viewer dialog with orbit
// controls and, for creatures, their body-backed pose clips.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { samplePose } from './poseSample.mjs';

const $ = (id) => document.getElementById(id);
const VIEW_DIR = new THREE.Vector3(0.85, 0.5, 1.25).normalize(); // front three-quarter: models face +z
const ATTACK_REST = 0.6; // s held after an attack before it plays again

const nameOf = (id) => {
  const s = id.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const kb = (n) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

// ---- loading ----

const loader = new GLTFLoader();
const cache = new Map();

// A model, its clips (or null) and facts read from the glTF. Every caller gets its own clone of the scene.
function load(model) {
  if (!cache.has(model.id)) {
    cache.set(model.id, (async () => {
      const [gltf, clips, body] = await Promise.all([
        loader.loadAsync(`built/${model.file}`),
        model.clips ? fetch(`built/${model.clips}`).then((r) => r.json()) : null,
        model.body ? fetch(`built/${model.body}`).then((r) => r.json()) : null,
      ]);
      let triangles = 0;
      const materials = new Map();
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        const g = o.geometry;
        triangles += (g.index ? g.index.count : g.attributes.position.count) / 3;
        // A primitive with no material gets glTF's default, fully metallic; vertex-coloured mobs want a matte one.
        if (g.attributes.color && o.material.metalness === 1 && o.material.roughness === 1 && !o.material.name) {
          o.material = new THREE.MeshStandardMaterial({ vertexColors: true, metalness: 0, roughness: 0.85 });
        }
        for (const m of [o.material].flat()) if (m.name) materials.set(m.name, m);
      });
      return { scene: gltf.scene, clips, body, triangles, materials: [...materials.values()] };
    })());
  }
  return cache.get(model.id);
}

const clipSet = (clips) => clips?.standing ?? clips?.crawling ?? clips;
const playable = (clip) => clip?.kind === 'pose';
const initialClip = (clips) => clips.idle ?? clips.walk;
const canPose = (model, clips, body) => Boolean(model.body && body && clipSet(clips) && Object.values(clipSet(clips)).some(playable));

function instance(loaded, model) {
  const scene = loaded.scene.clone(true);
  // Posing writes into the geometry, so a creature needs its own copy.
  if (canPose(model, loaded.clips)) {
    scene.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry = o.geometry.clone();
      const g = o.geometry;
      g.userData.rest = g.attributes.position.array.slice();
      g.userData.restNormal = g.attributes.normal.array.slice();
    });
  }
  return scene;
}

// ---- rigid posing: each vertex follows its body bone (TEXCOORD_1.x) ----

const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
const mul = (a, b) => [0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => a[r * 3] * b[c] + a[r * 3 + 1] * b[c + 3] + a[r * 3 + 2] * b[c + 6]));
const quaternionMatrix = ([x, y, z, w]) => [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];

const slerp = (a, b, w) => new THREE.Quaternion(...a).slerp(new THREE.Quaternion(...b), w).toArray();

function pose(scene, body, clip, time) {
  if (!playable(clip)) return;
  const pose = samplePose(clip, time, slerp), transforms = [], byId = new Map();
  for (const bone of body.bones) {
    const r = quaternionMatrix(pose.rotations[bone.id] ?? [0, 0, 0, 1]), h = bone.head;
    let t = h.map((x, axis) => x - r.slice(axis * 3, axis * 3 + 3).reduce((sum, value, c) => sum + value * h[c], 0));
    const parent = byId.get(bone.parent);
    if (parent) { t = t.map((x, axis) => parent.r.slice(axis * 3, axis * 3 + 3).reduce((sum, value, c) => sum + value * t[c], 0) + parent.t[axis]); transforms.push({ r: mul(parent.r, r), t }); }
    else { t = t.map((x, axis) => x + pose.root[axis]); transforms.push({ r, t }); }
    byId.set(bone.id, transforms.at(-1));
  }
  scene.traverse((o) => {
    if (!o.isMesh || !o.geometry.userData.rest) return;
    const g = o.geometry, bone = g.attributes.uv1.array, rest = g.userData.rest, restN = g.userData.restNormal, pos = g.attributes.position.array, nor = g.attributes.normal.array;
    for (let v = 0; v < pos.length / 3; v++) {
      const m = transforms[bone[v * 2]], i = v * 3;
      for (let axis = 0; axis < 3; axis++) { pos[i + axis] = m.r.slice(axis * 3, axis * 3 + 3).reduce((sum, value, c) => sum + value * rest[i + c], m.t[axis]); nor[i + axis] = m.r.slice(axis * 3, axis * 3 + 3).reduce((sum, value, c) => sum + value * restN[i + c], 0); }
    }
    g.attributes.position.needsUpdate = g.attributes.normal.needsUpdate = true;
    g.computeBoundingSphere(); g.computeBoundingBox();
  });
}

function clipTime(clip, name, seconds) {
  if (clip.loop) return seconds / clip.period;
  if (name === 'attack') return Math.min(clip.duration, seconds % (clip.duration + ATTACK_REST));
  return seconds;
}

// ---- staging ----

function makeStage(renderer) {
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.8;
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(2, 4, 3);
  scene.add(sun, new THREE.HemisphereLight(0xffffff, 0x8a8070, 0.6));
  return scene;
}

function setupRenderer(renderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
}

// Point the camera at the object from the front three-quarter, far enough to see all of it.
function frame(camera, object, target = new THREE.Vector3()) {
  const box = new THREE.Box3().setFromObject(object);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const r = Math.max(sphere.radius, 0.01);
  const dist = (r / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2)) * 1.02;
  target.copy(sphere.center);
  camera.position.copy(sphere.center).addScaledVector(VIEW_DIR, dist);
  camera.near = dist / 100;
  camera.far = dist * 100;
  camera.updateProjectionMatrix();
  camera.lookAt(target);
  return { box, target };
}

// ---- thumbnails: one offscreen renderer, drawn into each card's 2D canvas as it scrolls into view ----

const THUMB = 256;
let thumbRenderer = null;
let thumbStage = null;
const thumbCamera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
const queue = [];
let drawing = false;

function initThumbs() {
  thumbRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  setupRenderer(thumbRenderer);
  const px = Math.round(THUMB * Math.min(2, window.devicePixelRatio || 1));
  thumbRenderer.setSize(px, px, false);
  thumbStage = makeStage(thumbRenderer);
}

async function drainThumbs() {
  if (drawing) return;
  drawing = true;
  while (queue.length) {
    const { model, canvas } = queue.shift();
    try {
      const loaded = await load(model);
      const obj = instance(loaded, model);
      if (canPose(model, loaded.clips, loaded.body)) {
        const clips = clipSet(loaded.clips), clip = initialClip(clips);
        pose(obj, loaded.body, clip, 0);
      }
      thumbStage.add(obj);
      frame(thumbCamera, obj);
      thumbRenderer.render(thumbStage, thumbCamera);
      thumbStage.remove(obj);
      const src = thumbRenderer.domElement;
      canvas.width = src.width;
      canvas.height = src.height;
      canvas.getContext('2d').drawImage(src, 0, 0);
    } catch (err) {
      console.error(model.id, err);
      canvas.closest('.card')?.classList.add('broken');
    }
  }
  drawing = false;
}

const seen = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    seen.unobserve(e.target);
    queue.push({ model: e.target._model, canvas: e.target });
  }
  drainThumbs();
}, { rootMargin: '400px' });

// ---- grid and filters ----

let models = [];
let shown = [];
let shelf = 'All';

function renderShelves() {
  const counts = new Map([['All', models.length]]);
  for (const m of models) counts.set(m.category, (counts.get(m.category) ?? 0) + 1);
  const names = ['All', ...[...counts.keys()].filter((n) => n !== 'All').sort()];
  $('shelves').replaceChildren(...names.map((name) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.type = 'button';
    b.setAttribute('aria-pressed', String(name === shelf));
    b.append(name, Object.assign(document.createElement('span'), { textContent: counts.get(name) }));
    b.onclick = () => { shelf = name; renderShelves(); applyFilter(); };
    return b;
  }));
}

function makeCard(model) {
  const card = document.createElement('button');
  card.className = 'card';
  card.type = 'button';
  card.dataset.id = model.id;
  const canvas = document.createElement('canvas');
  canvas.className = 'thumb';
  canvas.width = canvas.height = 1;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', nameOf(model.id));
  canvas._model = model;
  const label = document.createElement('div');
  label.className = 'label';
  label.innerHTML = '<div class="name"></div><div class="meta"></div>';
  label.querySelector('.name').textContent = nameOf(model.id);
  label.querySelector('.meta').textContent = `${model.category} · ${kb(model.bytes)}`;
  card.append(canvas, label);
  card.onclick = () => openViewer(model);
  if (thumbRenderer) seen.observe(canvas);
  return card;
}

const cards = new Map();

function applyFilter() {
  const q = $('search').value.trim().toLowerCase().replace(/\s+/g, '_');
  shown = models.filter((m) => (shelf === 'All' || m.category === shelf) && (!q || m.id.includes(q)));
  $('grid').replaceChildren(...shown.map((m) => cards.get(m.id)));
  $('count').textContent = `${shown.length} of ${models.length} models`;
}

// ---- viewer ----

let viewer = null;

function initViewer() {
  const canvas = $('v-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  setupRenderer(renderer);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  viewer = { renderer, camera, controls, stage: makeStage(renderer), obj: null, loaded: null, clip: null, t0: 0, model: null };

  const resize = () => {
    const { clientWidth: w, clientHeight: h } = canvas;
    if (!w || !h) return;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(canvas);

  renderer.setAnimationLoop((ms) => {
    if (!$('viewer').open) return;
    const v = viewer;
    const clips = clipSet(v.loaded?.clips);
    if (v.obj && canPose(v.model, v.loaded?.clips, v.loaded?.body) && v.clip) pose(v.obj, v.loaded.body, clips[v.clip], clipTime(clips[v.clip], v.clip, (ms - v.t0) / 1000));
    controls.update();
    renderer.render(v.stage, camera);
  });

  $('v-close').onclick = () => $('viewer').close();
  $('viewer').addEventListener('close', () => { if (location.hash) history.replaceState(null, '', location.pathname + location.search); });
  $('viewer').addEventListener('click', (e) => { if (e.target === $('viewer')) $('viewer').close(); });
  $('v-prev').onclick = () => step(-1);
  $('v-next').onclick = () => step(1);
  document.addEventListener('keydown', (e) => {
    if (!$('viewer').open) return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  });
}

function step(d) {
  const list = shown.length ? shown : models;
  const i = list.findIndex((m) => m.id === viewer.model?.id);
  openViewer(list[(i + d + list.length) % list.length]);
}

async function openViewer(model) {
  if (!viewer) return;
  viewer.model = model;
  if (!$('viewer').open) $('viewer').showModal();
  history.replaceState(null, '', `#${model.id}`);

  $('v-category').textContent = model.category;
  $('v-name').textContent = nameOf(model.id);
  $('v-id').textContent = model.file;
  $('v-download').href = `built/${model.file}`;
  $('v-download').setAttribute('download', model.file);
  $('v-facts').replaceChildren();
  $('v-materials').replaceChildren();
  $('v-clips').replaceChildren();

  const loaded = await load(model);
  if (viewer.model !== model) return; // a later pick overtook this load

  if (viewer.obj) viewer.stage.remove(viewer.obj);
  viewer.obj = instance(loaded, model);
  viewer.loaded = loaded;
  viewer.clip = null;
  if (canPose(model, loaded.clips, loaded.body)) {
    const clips = clipSet(loaded.clips), clip = initialClip(clips);
    pose(viewer.obj, loaded.body, clip, 0);
  }
  viewer.stage.add(viewer.obj);
  const { box, target } = frame(viewer.camera, viewer.obj);
  viewer.controls.target.copy(target);
  viewer.controls.update();

  const size = box.getSize(new THREE.Vector3());
  const facts = [
    ['Size', `${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m`],
    ['Triangles', Math.round(loaded.triangles).toLocaleString('en')],
    ['File', kb(model.bytes)],
  ];
  if (canPose(model, loaded.clips, loaded.body)) facts.push(['Bones', loaded.body.bones.length]);
  $('v-facts').replaceChildren(...facts.flatMap(([k, v]) => [
    Object.assign(document.createElement('dt'), { textContent: k }),
    Object.assign(document.createElement('dd'), { textContent: v }),
  ]));

  const mats = loaded.materials.length
    ? loaded.materials.map((m) => {
      const li = document.createElement('li');
      const sw = document.createElement('span');
      sw.className = 'swatch';
      sw.style.background = `#${m.color.getHexString(THREE.SRGBColorSpace)}`;
      li.append(sw, m.userData?.materialId ?? m.name);
      return li;
    })
    : [Object.assign(document.createElement('li'), { textContent: 'Vertex colours' })];
  $('v-materials').replaceChildren(...mats);

  if (canPose(model, loaded.clips, loaded.body)) {
    const clips = clipSet(loaded.clips);
    const names = ['walk', 'attack', 'idle'].filter((n) => playable(clips[n]));
    const pick = (name) => {
      viewer.clip = name;
      viewer.t0 = performance.now();
      for (const b of $('v-clips').children) b.setAttribute('aria-pressed', String(b.dataset.clip === name));
    };
    $('v-clips').replaceChildren(...names.map((n) => {
      const b = document.createElement('button');
      b.className = 'chip';
      b.type = 'button';
      b.dataset.clip = n;
      b.textContent = nameOf(n);
      b.onclick = () => pick(n);
      return b;
    }));
    pick(names[0]);
  }
}

// ---- start ----

async function main() {
  try {
    initThumbs();
    initViewer();
  } catch (err) {
    console.error(err);
    const note = document.createElement('p');
    note.className = 'notice';
    note.textContent = `The 3D previews need WebGL, which this browser did not provide (${err.message}). The models are still listed and can be downloaded from the repository.`;
    $('grid').before(note);
  }
  models = (await fetch('models.json').then((r) => r.json())).models;
  for (const m of models) cards.set(m.id, makeCard(m));
  renderShelves();
  applyFilter();
  $('search').addEventListener('input', applyFilter);
  const fromHash = models.find((m) => m.id === decodeURIComponent(location.hash.slice(1)));
  if (fromHash) openViewer(fromHash);
}

main();
