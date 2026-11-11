// The showcase page: a grid of thumbnails drawn by one shared offscreen renderer, and a viewer dialog with orbit
// controls and, for creatures, their body-backed pose clips. A vehicle is shown assembled from its parts' models, and
// can be exploded to show each part apart from the others, as can a model that comes in components; a wearable can be shown loose or worn on the doll. What it
// draws, and how, is render.mjs's.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { canPose, clipSet, comesApart, explodable, frame, isVehicle, isWearable, loadEntry, looseName, makeStage, playable, pose, registerModels, setupRenderer, spread, stillInstance, wornEntry } from './render.mjs';

const $ = (id) => document.getElementById(id);
const FINITE_REST = 0.6; // s held after a finite clip, such as an attack, before it plays again
const EXPLODE_EASE = 0.12; // share of the remaining way an exploding part moves each frame

const nameOf = (id) => {
  const s = id.replace(/_/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const massText = (kg) => `${kg.toLocaleString('en', { maximumSignificantDigits: 3 })} kg`;
const kb = (n) => (n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

// A walk loop states a stride distance, so the viewer walks it at the row's authored walk speed.
function clipTime(clip, seconds, walkSpeed) {
  if (clip.loop && clip.strideMetres !== undefined) return seconds * walkSpeed / (clip.strideMetres * (clip.cycles ?? 1));
  // The viewer has no Sim clock, so an idle loop plays its Sim seconds one to one on Real time.
  if (clip.loop) return seconds / clip.periodSimSeconds;
  return Math.min(clip.durationSimSeconds, seconds % (clip.durationSimSeconds + FINITE_REST));
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
      const loaded = await loadEntry(model);
      const obj = stillInstance(loaded, model);
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

let entries = []; // vehicles, then models
let shown = [];
let taxonomy = { categories: {}, facets: {} };
// Vocabulary terms are kebab-case, so these capitalised shelf keys never collide with a category.
const ALL = 'All';
const UNCATEGORISED = 'Uncategorised';
const VEHICLES = 'Vehicles';
let shelf = ALL;
const picked = new Map(); // facet -> the term its filter requires

const labelOf = (term) => term[0].toUpperCase() + term.slice(1).replaceAll('-', ' ');
const shelfOf = (entry) => (isVehicle(entry) ? VEHICLES : entry.category ?? UNCATEGORISED);
const shelfLabel = (key) => ([ALL, UNCATEGORISED, VEHICLES].includes(key) ? key : labelOf(key));
const shelfTitles = { [VEHICLES]: 'Whole vehicles, assembled from their parts.' };

function renderShelves() {
  const counts = new Map([[ALL, entries.length]]);
  for (const m of entries) counts.set(shelfOf(m), (counts.get(shelfOf(m)) ?? 0) + 1);
  const categories = [...counts.keys()].filter((key) => ![ALL, UNCATEGORISED, VEHICLES].includes(key)).sort();
  const names = [ALL, ...(counts.has(VEHICLES) ? [VEHICLES] : []), ...categories, ...(counts.has(UNCATEGORISED) ? [UNCATEGORISED] : [])];
  $('shelves').replaceChildren(...names.map((name) => {
    const b = document.createElement('button');
    b.className = 'chip';
    b.type = 'button';
    b.title = taxonomy.categories[name] ?? shelfTitles[name] ?? '';
    b.setAttribute('aria-pressed', String(name === shelf));
    b.append(shelfLabel(name), Object.assign(document.createElement('span'), { textContent: counts.get(name) }));
    b.onclick = () => { shelf = name; renderShelves(); applyFilter(); };
    return b;
  }));
}

// One select per facet that any model uses, listing the terms in use.
function renderFacets() {
  const used = new Map();
  for (const m of entries) {
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
  label.querySelector('.meta').textContent = `${shelfLabel(shelfOf(model))} · ${isVehicle(model) ? `${model.sites.length} parts` : kb(model.bytes)}`;
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
  const matches = (m) => !q || m.id.includes(id) || [...Object.values(m.tags).flat(), ...m.keywords].some((t) => t.includes(term));
  const tagged = (m) => [...picked].every(([facet, t]) => m.tags[facet]?.includes(t));
  shown = entries.filter((m) => (shelf === ALL || shelfOf(m) === shelf) && tagged(m) && matches(m));
  $('grid').replaceChildren(...shown.map((m) => cards.get(m.id)));
  $('count').textContent = `${shown.length} of ${entries.length} models`;
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
  viewer = { renderer, camera, controls, stage: makeStage(renderer), obj: null, loaded: null, clip: null, t0: 0, model: null, parts: [], spread: 0, exploded: false, worn: false };

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
    spreadParts(v);
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

function spreadParts(v) {
  const goal = v.exploded ? 1 : 0;
  if (v.spread === goal) return;
  v.spread = Math.abs(goal - v.spread) < 0.001 ? goal : v.spread + (goal - v.spread) * EXPLODE_EASE;
  spread(v.parts, v.spread);
}

// Switches a vehicle or a component model between assembled and exploded, keeping the camera's direction and fitting the camera to the
// view it is switching to.
function explode(exploded) {
  const v = viewer;
  v.exploded = exploded;
  for (const b of $('v-clips').children) b.setAttribute('aria-pressed', String((b.dataset.view === 'exploded') === exploded));
  spread(v.parts, exploded ? 1 : 0);
  const direction = v.camera.position.clone().sub(v.controls.target).normalize();
  frame(v.camera, v.obj, v.controls.target, direction);
  spread(v.parts, v.spread);
  v.controls.update();
}

// Switches a wearable between loose and worn on the doll, keeping the camera's direction and fitting the camera to the
// view it is switching to.
async function wear(worn) {
  const v = viewer;
  const model = v.model;
  v.worn = worn;
  for (const b of $('v-clips').children) b.setAttribute('aria-pressed', String((b.dataset.view === 'worn') === worn));
  const entry = worn ? wornEntry(model) : model;
  const loaded = await loadEntry(entry);
  if (v.model !== model || v.worn !== worn) return; // a later pick overtook this load
  v.stage.remove(v.obj);
  v.obj = stillInstance(loaded, entry);
  v.stage.add(v.obj);
  const direction = v.camera.position.clone().sub(v.controls.target).normalize();
  frame(v.camera, v.obj, v.controls.target, direction);
  v.controls.update();
}

function step(d) {
  const list = shown.length ? shown : entries;
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
  const file = isVehicle(model) ? model.placements : model.file;
  $('v-id').textContent = file;
  $('v-download').href = `built/${file}`;
  $('v-download').setAttribute('download', file);
  $('v-download').textContent = isVehicle(model) ? 'Download placements' : 'Download .glb';
  // A wearable's fit in a pose is reviewed on the posing page (pose.html).
  $('v-pose').hidden = !isWearable(model);
  $('v-pose').href = `pose.html?${new URLSearchParams({ wear: model.id })}`;
  $('v-facts').replaceChildren();
  $('v-materials').replaceChildren();
  $('v-clips').replaceChildren();
  $('v-clips').setAttribute('aria-label', comesApart(model) || isWearable(model) ? 'View' : 'Clip');

  const loaded = await loadEntry(model);
  if (viewer.model !== model) return; // a later pick overtook this load

  if (viewer.obj) viewer.stage.remove(viewer.obj);
  viewer.obj = stillInstance(loaded, model);
  viewer.loaded = loaded;
  viewer.clip = null;
  viewer.parts = comesApart(model) ? explodable(viewer.obj, model) : [];
  viewer.spread = 0;
  viewer.exploded = false;
  viewer.worn = false;
  viewer.stage.add(viewer.obj);
  const { box, target } = frame(viewer.camera, viewer.obj);
  viewer.controls.target.copy(target);
  viewer.controls.update();

  const size = box.getSize(new THREE.Vector3());
  const shelfKey = shelfOf(model);
  const facts = [
    ...(shelfKey === UNCATEGORISED ? [] : [['Category', shelfLabel(shelfKey), taxonomy.categories[shelfKey] ?? shelfTitles[shelfKey]]]),
    ...Object.entries(model.tags).map(([facet, terms]) => [labelOf(facet), terms.map(labelOf).join(', ')]),
    ...(model.keywords.length > 0 ? [['Keywords', model.keywords.map(labelOf).join(', ')]] : []),
    ...(isVehicle(model) ? [['Parts', model.sites.length]] : model.components ? [['Components', model.components.length]] : []),
    ...(model.massKg === undefined ? [] : [['Mass', massText(model.massKg)]]),
    ...(model.massKg > 0 && model.volumeM3 > 0 ? [['Density', `${Math.round(model.massKg / model.volumeM3).toLocaleString('en')} kg/m³`]] : []),
    ['Size', `${size.x.toFixed(2)} × ${size.y.toFixed(2)} × ${size.z.toFixed(2)} m`],
    ['Triangles', Math.round(loaded.triangles).toLocaleString('en')],
    ...(isVehicle(model) ? [] : [['File', kb(model.bytes)]]),
  ];
  if (canPose(model, loaded.clips, loaded.body)) facts.push(['Bones', loaded.body.bones.length]);
  $('v-facts').replaceChildren(...facts.flatMap(([k, v, title = '']) => [
    Object.assign(document.createElement('dt'), { textContent: k, title }),
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
  if (comesApart(model)) $('v-clips').replaceChildren(...viewChips([['assembled', 'Assembled'], ['exploded', 'Exploded']], (view) => explode(view === 'exploded')));
  if (isWearable(model)) $('v-clips').replaceChildren(...viewChips([['loose', looseName(model)], ['worn', 'Worn']], (view) => wear(view === 'worn')));
}

// A chip for each of a model's views, [view, text], the first pressed; picking one calls `pick` with its view.
const viewChips = (views, pick) => views.map(([view, text], i) => {
  const b = document.createElement('button');
  b.className = 'chip';
  b.type = 'button';
  b.dataset.view = view;
  b.textContent = text;
  b.setAttribute('aria-pressed', String(i === 0));
  b.onclick = () => pick(view);
  return b;
});

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
  const { taxonomy: vocabulary, models, vehicles } = await fetch('models.json').then((r) => r.json());
  taxonomy = vocabulary;
  registerModels(models);
  entries = [...vehicles, ...models];
  for (const m of entries) cards.set(m.id, makeCard(m));
  renderShelves();
  renderFacets();
  applyFilter();
  $('search').addEventListener('input', applyFilter);
  const fromHash = entries.find((m) => m.id === decodeURIComponent(location.hash.slice(1)));
  if (fromHash) openViewer(fromHash);
}

main();
