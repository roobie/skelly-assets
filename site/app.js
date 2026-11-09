// The showcase page: a grid of thumbnails drawn by one shared offscreen renderer, and a viewer dialog with orbit
// controls and, for creatures, their body-backed pose clips.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { samplePose } from './poseSample.mjs';

const $ = (id) => document.getElementById(id);
const VIEW_DIR = new THREE.Vector3(0.85, 0.5, 1.25).normalize(); // front three-quarter: models face +z
const FINITE_REST = 0.6; // s held after a finite clip, such as an attack, before it plays again

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
      if (model.label) gltf.scene.add(printedLabel(model.label));
      return { scene: gltf.scene, clips, body, triangles, materials: [...materials.values()] };
    })());
  }
  return cache.get(model.id);
}

// The manifest's label as a decal on its face: the GLB carries no lettering, so every consumer draws the text itself.
const LABEL_PX = 512; // the texture's long side
function printedLabel({ text, at, normal, up, size: [width, height] }) {
  const canvas = document.createElement('canvas');
  const scale = LABEL_PX / Math.max(width, height);
  canvas.width = Math.max(1, Math.round(width * scale));
  canvas.height = Math.max(1, Math.round(height * scale));
  const g = canvas.getContext('2d');
  const margin = Math.min(canvas.width, canvas.height) * 0.08;
  const words = text.split(/\s+/);
  // The largest font at which the words, wrapped to the width, fit the height.
  let px = canvas.height;
  let lines = [];
  for (; px > 4; px *= 0.9) {
    g.font = `bold ${px}px sans-serif`;
    lines = words.reduce((rows, word) => {
      const last = rows.at(-1);
      if (last !== undefined && g.measureText(`${last} ${word}`).width <= canvas.width - 2 * margin) rows[rows.length - 1] = `${last} ${word}`;
      else rows.push(word);
      return rows;
    }, []);
    if (lines.every((line) => g.measureText(line).width <= canvas.width - 2 * margin) && lines.length * px * 1.15 <= canvas.height - 2 * margin) break;
  }
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.lineJoin = 'round';
  g.lineWidth = px * 0.18;
  g.strokeStyle = '#fff';
  g.fillStyle = '#111';
  lines.forEach((line, i) => {
    const y = canvas.height / 2 + (i - (lines.length - 1) / 2) * px * 1.15;
    g.strokeText(line, canvas.width / 2, y);
    g.fillText(line, canvas.width / 2, y);
  });
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 4;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshStandardMaterial({ map, transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }),
  );
  const n = new THREE.Vector3(...normal), u = new THREE.Vector3(...up);
  mesh.matrixAutoUpdate = false;
  mesh.matrix.makeBasis(new THREE.Vector3().crossVectors(u, n), u, n).setPosition(...at);
  return mesh;
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

// A walk loop states a stride distance, so the viewer walks it at the row's authored walk speed.
function clipTime(clip, seconds, walkSpeed) {
  if (clip.loop && clip.strideMetres !== undefined) return seconds * walkSpeed / (clip.strideMetres * (clip.cycles ?? 1));
  // The viewer has no Sim clock, so an idle loop plays its Sim seconds one to one on Real time.
  if (clip.loop) return seconds / clip.periodSimSeconds;
  return Math.min(clip.durationSimSeconds, seconds % (clip.durationSimSeconds + FINITE_REST));
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
let taxonomy = { categories: {}, facets: {} };
// Vocabulary terms are kebab-case, so these capitalised shelf keys never collide with a category.
const ALL = 'All';
const UNCATEGORISED = 'Uncategorised';
let shelf = ALL;
const picked = new Map(); // facet -> the term its filter requires

const labelOf = (term) => term[0].toUpperCase() + term.slice(1).replaceAll('-', ' ');
const shelfOf = (model) => model.category ?? UNCATEGORISED;
const shelfLabel = (key) => (key === ALL || key === UNCATEGORISED ? key : labelOf(key));

function renderShelves() {
  const counts = new Map([[ALL, models.length]]);
  for (const m of models) counts.set(shelfOf(m), (counts.get(shelfOf(m)) ?? 0) + 1);
  const categories = [...counts.keys()].filter((key) => key !== ALL && key !== UNCATEGORISED).sort();
  const names = [ALL, ...categories, ...(counts.has(UNCATEGORISED) ? [UNCATEGORISED] : [])];
  $('shelves').replaceChildren(...names.map((name) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.type = 'button';
    b.title = taxonomy.categories[name] ?? '';
    b.setAttribute('aria-pressed', String(name === shelf));
    b.append(shelfLabel(name), Object.assign(document.createElement('span'), { textContent: counts.get(name) }));
    b.onclick = () => { shelf = name; renderShelves(); applyFilter(); };
    return b;
  }));
}

// One select per facet that any model uses, listing the terms in use.
function renderFacets() {
  const used = new Map();
  for (const m of models) {
    for (const [facet, terms] of Object.entries(m.tags)) {
      const counts = used.get(facet) ?? new Map();
      for (const term of terms) counts.set(term, (counts.get(term) ?? 0) + 1);
      used.set(facet, counts);
    }
  }
  $('facets').replaceChildren(...[...used.keys()].sort().map((facet) => {
    const select = document.createElement('select');
    select.className = 'facet';
    select.title = taxonomy.facets[facet]?.meaning ?? '';
    select.setAttribute('aria-label', labelOf(facet));
    const option = (value, text, title = '') => Object.assign(document.createElement('option'), { value, textContent: text, title });
    select.append(option('', `Any ${facet}`), ...[...used.get(facet)].sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([term, n]) => option(term, `${labelOf(term)} (${n})`, taxonomy.facets[facet]?.terms[term] ?? '')));
    select.onchange = () => {
      if (select.value) picked.set(facet, select.value);
      else picked.delete(facet);
      applyFilter();
    };
    return select;
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
  label.querySelector('.meta').textContent = `${shelfLabel(shelfOf(model))} · ${kb(model.bytes)}`;
  card.append(canvas, label);
  card.onclick = () => openViewer(model);
  if (thumbRenderer) seen.observe(canvas);
  return card;
}

const cards = new Map();

function applyFilter() {
  const q = $('search').value.trim().toLowerCase();
  const id = q.replace(/\s+/g, '_');
  const term = q.replace(/[\s_]+/g, '-');
  const matches = (m) => !q || m.id.includes(id) || Object.values(m.tags).flat().some((t) => t.includes(term));
  const tagged = (m) => [...picked].every(([facet, t]) => m.tags[facet]?.includes(t));
  shown = models.filter((m) => (shelf === ALL || shelfOf(m) === shelf) && tagged(m) && matches(m));
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
    if (v.obj && canPose(v.model, v.loaded?.clips, v.loaded?.body) && v.clip) pose(v.obj, v.loaded.body, clips[v.clip], clipTime(clips[v.clip], (ms - v.t0) / 1000, v.model.walkSpeed));
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

  $('v-category').textContent = shelfLabel(shelfOf(model));
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
    ...Object.entries(model.tags).map(([facet, terms]) => [labelOf(facet), terms.map(labelOf).join(', ')]),
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
    const names = ['walk', 'attack', 'pounce', 'idle'].filter((n) => playable(clips[n]));
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
  ({ taxonomy, models } = await fetch('models.json').then((r) => r.json()));
  for (const m of models) cards.set(m.id, makeCard(m));
  renderShelves();
  renderFacets();
  applyFilter();
  $('search').addEventListener('input', applyFilter);
  const fromHash = models.find((m) => m.id === decodeURIComponent(location.hash.slice(1)));
  if (fromHash) openViewer(fromHash);
}

main();
