// The showcase's renderer: loading models and assembled vehicles, posing creatures, lighting and framing. The page
// (app.js) and the review page (look.mjs) both draw through it, so a review image shows what the showcase shows.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { explode } from './explode.mjs';
import { wearFabrics } from './fabric.mjs';
import { hideCovered } from './hiding.mjs';
import { FRONT_QUARTER } from './modelFrame.mjs';
import { decodeFrame, sampleClip } from './clipFrames.mjs';
import { boneTransforms } from './kinematics.mjs';

const VIEW_DIR = new THREE.Vector3(...FRONT_QUARTER);

// ---- loading ----

const loader = new GLTFLoader();
const cache = new Map();
const modelsById = new Map();

// The models.json models a vehicle's sites can name.
export function registerModels(models) {
  for (const m of models) modelsById.set(m.id, m);
}

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
      wearFabrics(gltf.scene);
      if (model.label) gltf.scene.add(printedLabel(model.label));
      return { scene: gltf.scene, clips, body, triangles, materials: [...materials.values()] };
    })());
  }
  return cache.get(model.id);
}

// Models composed at sites, as a vehicle places its parts or the doll wears a wearable: each site's model mirrored
// across its own x = 0 plane when the site says so, turned by its quaternion `turn`, then moved to `at`. Its parts stay
// in site order, so the viewer can move each one apart. What a worn piece's site covers of the doll is not drawn
// (hiding.mjs).
function loadSites(entry) {
  if (!cache.has(entry.id)) {
    cache.set(entry.id, (async () => {
      const parts = await Promise.all(entry.sites.map((site) => load(modelsById.get(site.model))));
      const scene = new THREE.Group();
      const materials = new Map();
      let triangles = 0;
      entry.sites.forEach((site, i) => {
        const part = parts[i].scene.clone(true);
        part.name = site.site ?? site.model;
        part.position.fromArray(site.at);
        if (site.turn) part.quaternion.fromArray(site.turn);
        if (site.mirror) part.scale.x = -1;
        if (site.paint) repaint(part, site.paint);
        scene.add(part);
        triangles += parts[i].triangles;
        for (const m of parts[i].materials) materials.set(m.name, m);
      });
      hideCovered(scene.children, entry.sites);
      return { scene, clips: null, body: null, triangles, materials: [...materials.values()] };
    })());
  }
  return cache.get(entry.id);
}

// A site's finish paints that copy of its part, as a game spawning the vehicle would: only the materials the part marks
// paintable take it, and the clone's other copies keep their own paint.
function repaint(part, paint) {
  const copies = new Map();
  const painted = (material) => {
    if (!material.userData?.paintable) return material;
    if (!copies.has(material)) {
      const copy = material.clone();
      copy.color.setRGB(...paint.linear, THREE.LinearSRGBColorSpace);
      copy.metalness = paint.metallic;
      copy.roughness = paint.roughness;
      copy.opacity = paint.opacity;
      copy.transparent = paint.opacity < 1;
      copies.set(material, copy);
    }
    return copies.get(material);
  };
  part.traverse((o) => {
    if (o.isMesh) o.material = Array.isArray(o.material) ? o.material.map(painted) : painted(o.material);
  });
}

export const isVehicle = (entry) => Boolean(entry.sites);
// Whether an entry can be shown apart: a vehicle or an assembly by the model at each site, a model by its components
// (models.json's `components`, from tools/components.mjs).
export const comesApart = (entry) => Boolean(entry.sites || entry.components);

// The objects an instance of `entry` comes apart into: each site's model, or each component's part node, which the
// GLB keeps beside the others under its root.
function piecesOf(obj, entry) {
  if (!entry.components) return obj.children;
  const byPart = new Map();
  obj.traverse((o) => {
    if (o.userData.part !== undefined) byPart.set(o.userData.part, o);
  });
  return entry.components.map((part) => byPart.get(part));
}

// Each piece of an instance of `entry`, where it sits assembled and how far it moves when exploded; see explode.mjs.
export function explodable(obj, entry) {
  const pieces = piecesOf(obj, entry);
  const boxes = pieces.map((piece) => {
    const box = new THREE.Box3().setFromObject(piece);
    return { min: box.min.toArray(), max: box.max.toArray() };
  });
  return explode(boxes).map((offset, i) => ({
    part: pieces[i],
    home: pieces[i].position.clone(),
    offset: new THREE.Vector3(...offset),
  }));
}

// Moves explodable parts the share `share` of the way from assembled (0) to exploded (1).
export function spread(parts, share) {
  for (const { part, home, offset } of parts) part.position.copy(home).addScaledVector(offset, share);
}
export const loadEntry = (entry) => (isVehicle(entry) ? loadSites(entry) : load(entry));

// A wearable's worn view: the doll wearing it (models.json's `worn`, from tools/dress.mjs), drawn as sites.
export const isWearable = (entry) => Boolean(entry.worn);
export const wornEntry = (entry) => ({ id: `${entry.id} worn`, sites: entry.worn });
// What the loose view of a wearable is called: folded when it lies folded.
export const looseName = (entry) => (entry.tags?.state?.includes('folded') ? 'Folded' : 'Loose');

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

export const clipSet = (clips) => clips?.standing ?? clips?.crawling ?? clips;
export const playable = (clip) => clip?.kind === 'pose';
export const initialClip = (clips) => clips.idle ?? clips.walk;
export const canPose = (model, clips, body) => Boolean(model.body && body && clipSet(clips) && Object.values(clipSet(clips)).some(playable));

export function instance(loaded, model) {
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

// A model's own copy, posed at the start of its first clip when it has one: how a still picture shows it.
export function stillInstance(loaded, model) {
  const obj = instance(loaded, model);
  if (canPose(model, loaded.clips, loaded.body)) pose(obj, loaded.body, initialClip(clipSet(loaded.clips)), 0);
  return obj;
}

// ---- rigid posing: each vertex follows its body bone (TEXCOORD_1.x) ----


export function pose(scene, body, clip, time) {
  if (!playable(clip)) return;
  const posed = boneTransforms(body.bones, decodeFrame(sampleClip(clip, time))), transforms = body.bones.map((bone) => posed.get(bone.id));
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

// ---- staging ----

export function makeStage(renderer) {
  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.8;
  const sun = new THREE.DirectionalLight(0xffffff, 1.6);
  sun.position.set(2, 4, 3);
  scene.add(sun, new THREE.HemisphereLight(0xffffff, 0x8a8070, 0.6));
  return scene;
}

export function setupRenderer(renderer) {
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
}

// Point the camera at the object from the front three-quarter, or from `direction`, far enough to see all of it.
export function frame(camera, object, target = new THREE.Vector3(), direction = VIEW_DIR) {
  const box = new THREE.Box3().setFromObject(object);
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const r = Math.max(sphere.radius, 0.01);
  const dist = (r / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2)) * 1.02;
  target.copy(sphere.center);
  camera.position.copy(sphere.center).addScaledVector(direction, dist);
  // A view straight down needs an up that is not its own direction.
  camera.up.set(0, 1, 0);
  if (Math.abs(direction.y) > 0.999) camera.up.set(0, 0, -1);
  camera.near = dist / 100;
  camera.far = dist * 100;
  camera.updateProjectionMatrix();
  camera.lookAt(target);
  return { box, target };
}
