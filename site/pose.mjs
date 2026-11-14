// The posing page: the doll, bare or dressed, bent at its rig's joints (rig.json, from tools/dollRig.mjs) by a pose
// file, by sliders, by two-bone IK or by a clip, its worn pieces riding the parts they are drawn in, so a wearable's fit
// can be reviewed in a pose and a pose or a clip authored by hand. A clearance probe marks where the body shows through
// a piece or a piece sinks into the body (clearance.mjs), and the skin check counts the covered body a camera sees
// (skin.mjs).
//
// The figure is a hierarchy of one three.js joint per bone, each at its bone's head, with the doll part node and the
// piece sites a bone binds attached under it; a clip frame's quaternions go straight onto the joints, which composes
// the same world transforms kinematics.mjs computes (`boneTransforms`), so the picture and the maths agree.
//
// tools/pose-sheet.mjs drives it headless through `window.posed`; opened with `?wear=a,b&pose=name` it shows that
// figure with its controls, and `window.showPose` loads a fixture by name or a pose file object into them.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clearanceProbe, coveredSurface } from './clearance.mjs';
import { clipKeys, clipSpanSeconds, decodeFrame, sampleClip } from './clipFrames.mjs';
import { add, boneTransforms, jointAngles, jointRotation, solveTwoBone, sub } from './kinematics.mjs';
import { viewSet } from './lookOptions.mjs';
import { FRONT_QUARTER } from './modelFrame.mjs';
import { clipIssues, compilePose, encodeFrame, frameAngles, poseFileOf, rigFrame } from './poseFile.mjs';
import { clipSet, frame as frameCamera, loadEntry, makeStage, playable, registerModels, setupRenderer } from './render.mjs';
import { addCoveredSkin, skinCheck } from './skin.mjs';
import { drawEye, drawView, gridCell, groundGrid, makeDrawer, ruleAt, startTile } from './tile.mjs';

const ISSUE_COLOUR = { pokes: 0xd0301a, flush: 0xb03ab0, sinks: 0xe0901a };
const IDENTITY_Q = [0, 0, 0, 1];
// The doll at rest, standing on the ground: the page's pose until a fixture is chosen.
const standing = (rig) => ({ rig: { id: rig.id, revision: rig.revision }, ground: true });

const ready = (async () => {
  const [{ models }, rig] = await Promise.all([fetch('models.json').then((r) => r.json()), fetch('rig.json').then((r) => r.json())]);
  registerModels(models);
  return { models: new Map(models.map((model) => [model.id, model])), rig };
})();

const loadPoseFile = (name) => fetch(`poses/${name}.json`).then((r) => {
  if (!r.ok) throw new Error(`no pose fixture ${name}`);
  return r.json();
});

// ---- the figure: sites bound to joints ----

const siteKey = ({ model, at, mirror }) => `${model}@${at.map((x) => x.toFixed(4)).join(',')}${mirror ? '~' : ''}`;

// The doll's own sites, first and in the rig's site order, and the worn pieces of each wearable. A wearable's `worn`
// begins with the doll's sites (tools/dress.mjs, `wornSites`), which count once however many wearables are worn.
function dressedSites({ models, rig }, wear) {
  const sites = [...rig.doll];
  const seen = new Set(sites.map(siteKey));
  for (const id of wear) {
    const model = models.get(id);
    if (!model?.worn) throw new Error(`${id} is no wearable of the built tree`);
    for (const site of model.worn) {
      if (seen.has(siteKey(site))) continue;
      seen.add(siteKey(site));
      sites.push(site);
    }
  }
  return sites;
}

// The doll part node a bone moves: the node marked with the bind's part in the doll site the bind names.
function boundPart(bone, groups) {
  const found = [];
  groups[bone.bind.site].traverse((node) => { if (node.userData.part === bone.bind.part) found.push(node); });
  if (found.length !== 1) throw new Error(`${bone.id}: ${found.length} ${bone.bind.part} nodes in doll site ${bone.bind.site}; the rig needs one`);
  return found[0];
}

// Every drawn mesh under `object` as one triangle mesh in world axes, each triangle with the region its primitive is
// marked as; what a worn piece hides (hiding.mjs) is not drawn, so it is neither probed nor counted as showing.
function worldMesh(object) {
  const positions = [], indices = [], pieces = [];
  const p = new THREE.Vector3();
  object.traverse((o) => {
    if (!o.isMesh || !o.visible) return;
    const base = positions.length / 3;
    const { attributes: { position }, index } = o.geometry;
    for (let i = 0; i < position.count; i++) positions.push(...p.fromBufferAttribute(position, i).applyMatrix4(o.matrixWorld).toArray());
    if (index) for (let i = 0; i < index.count; i++) indices.push(base + index.getX(i));
    else for (let i = 0; i < position.count; i++) indices.push(base + i);
    for (let t = 0; t < (index ?? position).count / 3; t++) pieces.push(o.geometry.userData.piece);
  });
  return { positions, indices, pieces };
}

// The dressed doll as a jointed figure: `root` holds the joints, each named by its bone, `bones` maps a bone id to its
// joint, `pieces` lists the worn pieces with the bones they ride, `held` the items it has carried (`carry`), and `clearance()` gives the figure's covered surface
// at rest and the clearance probe over it, made when first asked for, since a figure drawn only to be looked at needs
// neither. A piece rides the bone of the part copy it is drawn in (its site's part and side); what no bone carries,
// such as a wearable placed whole, stays where the dressing put it.
export async function buildFigure(data, wear) {
  const { rig } = data;
  const sites = dressedSites(data, wear);
  const loaded = await loadEntry({ id: `posed ${wear.join(',') || 'doll'}`, sites });
  const dressed = loaded.scene.clone(true);
  const groups = [...dressed.children];
  const root = new THREE.Group();
  const marks = new THREE.Group();
  root.add(dressed, marks);
  const joints = new Map();
  for (const bone of rig.bones) {
    const joint = new THREE.Object3D();
    joint.name = bone.id;
    joint.position.fromArray(bone.parent === null ? bone.head : sub(bone.head, rig.bones.find(({ id }) => id === bone.parent).head));
    (bone.parent === null ? root : joints.get(bone.parent)).add(joint);
    joints.set(bone.id, joint);
  }
  root.updateMatrixWorld(true);
  const rest = { body: [], pieces: [] };
  const bound = rig.bones.map((bone) => {
    const joint = joints.get(bone.id);
    const part = boundPart(bone, groups);
    joint.attach(part);
    const pieces = sites.flatMap((site, i) => (site.part === bone.bind.part && site.side === bone.bind.side ? [{ site, group: groups[i] }] : []));
    for (const { group } of pieces) joint.attach(group);
    return { bone, joint, part, pieces };
  });
  root.updateMatrixWorld(true);
  for (const { bone, part, pieces } of bound) {
    const mesh = worldMesh(part);
    if (mesh.indices.length > 0) rest.body.push({ bone: bone.id, part: bone.bind.part, mesh });
    for (const { site, group } of pieces) rest.pieces.push({ piece: site.model, bone: bone.id, covers: site.covers, mesh: worldMesh(group) });
  }
  const bones = new Map(bound.map((entry) => [entry.bone.id, entry]));
  let clearance;
  const covered = () => {
    if (!clearance) {
      const surface = coveredSurface(rig, rest, { whole: true });
      clearance = { surface, probe: clearanceProbe(rig, rest, surface) };
    }
    return clearance;
  };
  return { rig, root, marks, bones, pieces: rest.pieces.map(({ piece, bone }) => ({ piece, bone })), clearance: covered, held: new Map() };
}

// Poses the figure by a clip frame: a quaternion per bone about its head, the root moved by `frame.root`.
export function applyFrame(figure, frame) {
  for (const { bone, joint } of figure.bones.values()) {
    joint.quaternion.fromArray(frame.rotations[bone.id] ?? IDENTITY_Q);
    if (bone.parent === null) joint.position.fromArray(add(bone.head, frame.root));
  }
  figure.root.updateMatrixWorld(true);
}

// Runs the clearance probe on the figure in `frame`, marking its findings: pokes in red, flush points in purple, sinks
// in orange, drawn through whatever hides them. Seams are the garment overlapping itself, so they are not marked.
function probe(figure, frame) {
  const found = figure.clearance().probe(boneTransforms(figure.rig.bones, decodeFrame(frame)));
  figure.marks.clear();
  for (const [kind, color] of Object.entries(ISSUE_COLOUR)) {
    const points = found[kind].flatMap(({ point }) => point);
    if (points.length === 0) continue;
    const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    figure.marks.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color, size: 0.012, sizeAttenuation: true, depthTest: false })));
  }
  return found;
}

// ---- frames, angles and clips ----

const identityAngles = (rig) => Object.fromEntries(rig.bones.map((bone) => [bone.id, [0, 0, 0]]));
const bent = (angles) => angles.some((a) => Math.abs(a) > 1e-9);
const round = (x, places) => Math.round(x * 10 ** places) / 10 ** places;

// A clip frame from a root and the angles of every bone, leaving out the bones at rest.
const frameOf = (rig, { root, angles }) => encodeFrame({
  root,
  rotations: Object.fromEntries(rig.bones.filter((bone) => bent(angles[bone.id])).map((bone) => [bone.id, jointRotation(bone, angles[bone.id])])),
});
const anglesOf = (rig, frame) => ({ ...identityAngles(rig), ...frameAngles(rig, frame) });

// A pose file of the frame, rounded for a person to read and edit.
const readablePose = (rig, frame) => {
  const { angles, root, ...file } = poseFileOf(rig, frame);
  return {
    ...file,
    angles: Object.fromEntries(Object.entries(angles).filter(([, a]) => bent(a)).map(([id, a]) => [id, a.map((x) => round(x, 2))])),
    ...(bent(root) ? { root: root.map((x) => round(x, 4)) } : {}),
  };
};

const slerp = (() => {
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  return (a, b, w) => qa.fromArray(a).slerp(qb.fromArray(b), w).toArray();
})();

// The seconds a clip plays over once: a walk by its stride at the actor's walk speed, a loop by its period, a finite
// clip by its duration. The page has no Sim clock, so Sim seconds play one to one on Real time.
const spanOf = (clip, walkSpeed) => {
  if (clip.loop && clip.strideMetres !== undefined) return clip.strideMetres * (clip.cycles ?? 1) / walkSpeed;
  return clip.loop ? clip.periodSimSeconds : clipSpanSeconds(clip);
};
// A clip of the rig's frames, its span stated the way its loop needs, timed by `timing` (`keyPhases` and `easing`) if given.
const authoredClip = (frames, loop, seconds, timing) => ({
  kind: 'pose', loop, ...(loop ? { periodSimSeconds: seconds } : { durationSimSeconds: seconds }), ...timing, frames,
});
// A clip's own key timing, kept apart from its span, so the span can be changed and the timing scales with it.
const timingOf = ({ keyPhases, easing }) => ({ ...(keyPhases ? { keyPhases } : {}), ...(easing ? { easing } : {}) });

// ---- headless: a tile of the posed figure ----

let drawer;

// Four views of the figure, `size` pixels each, as a PNG data URL. A close-up frames on `framed`, a part of the figure,
// and draws only `shown`, that part and what it holds, so the rest of the figure does not stand between it and the camera.
function drawTile(obj, size, views, { framed = obj, shown = [obj] } = {}) {
  drawer ??= makeDrawer();
  const directions = viewSet(views).map(([name, direction]) => [name, new THREE.Vector3(...direction)]);
  const box = new THREE.Box3().setFromObject(obj);
  const grid = framed === obj ? groundGrid(box, gridCell(Math.max(...box.getSize(new THREE.Vector3()).toArray()))) : new THREE.Group();
  const { tile, g } = startTile(size, 2, 2);
  const kept = new Set();
  for (const part of shown) part.traverse((o) => kept.add(o));
  const hidden = [];
  obj.traverse((o) => { if (o.isMesh && !kept.has(o)) { o.visible = false; hidden.push(o); } });
  drawer.stage.add(obj);
  directions.forEach((view, i) => { drawView(drawer, g, framed, grid, view, (i % 2) * size, Math.floor(i / 2) * size, size); });
  drawer.stage.remove(obj);
  for (const o of hidden) o.visible = true;
  ruleAt(g, { x: size }, tile.height);
  ruleAt(g, { y: size }, tile.width);
  return tile.toDataURL('image/png');
}

// The figure's eyes: half the head's height above the head's joint, a little inside its face, looking the way the head
// faces; the head is not drawn from there, as the camera stands inside it.
const EYES_INSIDE_FACE = 0.02;
function eyesOf(figure) {
  const { bone, joint } = figure.bones.get('head');
  const { min, max } = bone.bind.box;
  const eye = joint.localToWorld(new THREE.Vector3(0, (max[1] - min[1]) / 2, max[2] - bone.head[2] - EYES_INSIDE_FACE));
  const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(joint.getWorldQuaternion(new THREE.Quaternion()));
  return { eye, forward, head: joint };
}

// Two views of the figure, `size` pixels each: from its own eyes, as a player sees what the hands do, beside the front
// three-quarter that shows where it stands.
function drawEyeTile(obj, size, figure) {
  drawer ??= makeDrawer();
  const { eye, forward, head } = eyesOf(figure);
  const box = new THREE.Box3().setFromObject(obj);
  const grid = groundGrid(box, gridCell(Math.max(...box.getSize(new THREE.Vector3()).toArray())));
  const { tile, g } = startTile(size, 2, 1);
  const hidden = [];
  head.traverse((o) => { if (o.isMesh) { o.visible = false; hidden.push(o); } });
  drawer.stage.add(obj, grid);
  drawEye(drawer, g, 'eyes', eye, forward, 0, 0, size);
  for (const o of hidden) o.visible = true;
  drawView(drawer, g, obj, grid, ['front ¾', new THREE.Vector3(...FRONT_QUARTER)], size, 0, size);
  drawer.stage.remove(obj, grid);
  ruleAt(g, { x: size }, tile.height);
  return tile.toDataURL('image/png');
}

// The node of `obj` marked as the part `part`; the model needs exactly one.
function partNode(obj, model, part) {
  const found = [];
  obj.traverse((node) => { if (node.userData.part === part) found.push(node); });
  if (found.length !== 1) throw new Error(`moved.${model}: ${found.length} ${part} nodes in ${model}; it needs one`);
  return found[0];
}

// A copy of a held model at rest, `obj`, and `move(moved)`, which stands each moving part the share `moved` gives it
// (a pose file's `moved` for the model) of the way along its linear motion and the rest at rest. A motion's ends are in
// the part's own axes and in the model's unit, which the model's root node states (the gun exporter's `gungen` extras).
function heldItem(scene, model) {
  const obj = scene.clone(true);
  const slides = new Map();
  const slideOf = (part) => {
    if (slides.has(part)) return slides.get(part);
    const found = [];
    obj.traverse((node) => { if (node.userData.part === part) found.push(node); });
    if (found.length !== 1) throw new Error(`moved.${model}: ${found.length} ${part} nodes in ${model}; it needs one`);
    const [node] = found;
    const { motion } = node.userData;
    if (motion?.kind !== 'linear') throw new Error(`moved.${model}.${part}: ${part} has no linear motion`);
    let unit;
    for (let o = node; o && unit === undefined; o = o.parent) unit = o.userData.gungen?.metresPerUnit;
    if (!unit) throw new Error(`moved.${model}.${part}: ${model} states no unit for its motion`);
    const rest = node.position.clone();
    const stroke = new THREE.Vector3(...motion.rearmost).sub(new THREE.Vector3(...motion.rest)).multiplyScalar(unit).applyQuaternion(node.quaternion);
    const slide = (share) => node.position.copy(rest).addScaledVector(stroke, share);
    slides.set(part, slide);
    return slide;
  };
  const move = (moved = {}) => {
    for (const part of Object.keys(moved)) slideOf(part);
    for (const [part, slide] of slides) slide(moved[part] ?? 0);
  };
  return { obj, move };
}

// Each held model's scene, loaded once at the origin.
const heldScenes = new Map();
function heldScene(model) {
  if (!heldScenes.has(model)) heldScenes.set(model, loadEntry({ id: `held ${model}`, sites: [{ model, at: [0, 0, 0] }] }).then(({ scene }) => scene));
  return heldScenes.get(model);
}

// The mesh a grip closes on: the model with its parts moved as the pose file says, in the model's own axes.
async function heldMesh(model, moved) {
  const { obj, move } = heldItem(await heldScene(model), model);
  move(moved);
  obj.updateMatrixWorld(true);
  return worldMesh(obj);
}

/**
 * Puts the carried items in the figure's hands, taking out what is not carried. A carry is `{ model, hand, at, turn,
 * moved }`: the item under the joint of `hand`, at `at` and turned by the quaternion `turn` in that joint's axes, its
 * parts moved by `moved`. Each model is carried once, so the figure keeps one copy of it.
 */
async function carry(figure, carries) {
  for (const { model } of carries) if (!figure.held.has(model)) figure.held.set(model, heldItem(await heldScene(model), model));
  carryLoaded(figure, carries);
}
// `carry`, for items the figure has carried before, at once, so a playing clip moves them on the frame it draws.
function carryLoaded(figure, carries) {
  const kept = new Set(carries.map(({ model }) => model));
  for (const [model, { obj }] of figure.held) if (!kept.has(model)) obj.removeFromParent();
  for (const { model, hand, at, turn, moved } of carries) {
    const { obj, move } = figure.held.get(model);
    figure.bones.get(hand).joint.add(obj);
    obj.position.fromArray(at);
    obj.quaternion.fromArray(turn);
    move(moved);
  }
}

// The carries between `a` and `b` at the weight `w` of `b`: the place in the hand and the parts' shares blended when both
// carry the same models in the same hands; otherwise the nearer one, as a change of grip has no way between.
function blendCarries(a, b, w) {
  const same = a.length === b.length && a.every((c, k) => c.model === b[k].model && c.hand === b[k].hand);
  if (!same) return w < 0.5 ? a : b;
  const lerp = (x, y) => x + (y - x) * w;
  return a.map((c, k) => {
    const d = b[k];
    const parts = new Set([...Object.keys(c.moved), ...Object.keys(d.moved)]);
    return {
      model: c.model,
      hand: c.hand,
      at: c.at.map((x, axis) => lerp(x, d.at[axis])),
      turn: slerp(c.turn, d.turn, w),
      moved: Object.fromEntries([...parts].map((part) => [part, lerp(c.moved[part] ?? 0, d.moved[part] ?? 0)])),
    };
  });
}

/**
 * Poses the figure by a pose file and puts what it holds in its hands: the grips close on the held items' meshes, and
 * each item is carried by the first hand holding it, so a later frame (a slider, a clip, a ground lift) moves it with
 * that hand. Gives the compile result and the carries.
 */
async function holdPose(figure, rig, file) {
  const models = [...new Set(Object.values(file.hold ?? {}).map(({ model }) => model))];
  const meshes = new Map(await Promise.all(models.map(async (model) => [model, await heldMesh(model, file.moved?.[model])])));
  const compiled = compilePose(rig, file, { meshOf: (model) => meshes.get(model) });
  applyFrame(figure, compiled.frame);
  figure.root.updateMatrixWorld(true);
  const firstHands = new Map();
  for (const [hand, item] of Object.entries(compiled.held)) if (!firstHands.has(item.model)) firstHands.set(item.model, { hand, item });
  const carries = [...firstHands.values()].map(({ hand, item: { model, r, t } }) => {
    const inRoot = new THREE.Matrix4().set(r[0], r[1], r[2], t[0], r[3], r[4], r[5], t[1], r[6], r[7], r[8], t[2], 0, 0, 0, 1);
    const joint = figure.bones.get(hand).joint;
    const inHand = joint.matrixWorld.clone().invert().multiply(figure.root.matrixWorld).multiply(inRoot);
    const at = new THREE.Vector3(), turn = new THREE.Quaternion();
    inHand.decompose(at, turn, new THREE.Vector3());
    return { model, hand, at: at.toArray(), turn: turn.toArray(), moved: file.moved?.[model] ?? {} };
  });
  await carry(figure, carries);
  return { ...compiled, carries };
}

// The figure the last call drew, kept for the next while it asks for the same wear, so a sweep through poses builds
// the figure and its probe once.
let kept;
async function keptFigure(data, wear, skin) {
  const key = JSON.stringify({ wear, skin });
  if (kept?.key !== key) {
    const figure = await buildFigure(data, wear);
    if (skin) addCoveredSkin(figure, figure.clearance().surface);
    kept = { key, figure };
  }
  return kept.figure;
}

// The doll wearing `wear`, posed by the fixture `pose` names or the pose file object it is, holding what the pose holds,
// drawn as a tile framed on the whole figure or on the bone `focus` and what hangs from it, or from its own eyes when
// `views` is `eye`, with the pieces that ride its bones, the compile report, the clearance probe's findings and the
// skin check when asked, and the frame the pose compiled to.
async function posed({ wear = [], pose, size = 384, views = 'review', probe: probing = false, skin = false, focus } = {}) {
  const data = await ready;
  const figure = await keptFigure(data, wear, skin);
  const file = typeof pose === 'string' ? await loadPoseFile(pose) : pose ?? standing(data.rig);
  const { frame, report, carries } = await holdPose(figure, data.rig, file);
  const found = probing ? probe(figure, frame) : null;
  const framed = focus === undefined ? figure.root : figure.bones.get(focus)?.joint;
  if (!framed) throw new Error(`focus: the rig has no bone ${focus}`);
  const closeUp = focus === undefined ? {} : { framed, shown: [framed, figure.marks, ...carries.map(({ model }) => figure.held.get(model).obj)] };
  const png = views === 'eye' ? drawEyeTile(figure.root, size, figure) : drawTile(figure.root, size, views, closeUp);
  // The marks would draw over the skin check's masks.
  figure.marks.clear();
  const skinFound = skin ? skinCheck(figure.root, size, views) : null;
  // The figure is kept for the next call, which holds what its own pose holds.
  carryLoaded(figure, []);
  return { png, pieces: figure.pieces, report, clearance: found, skin: skinFound, frame };
}

window.posed = posed;

// ---- the page ----

const $ = (id) => document.getElementById(id);
const numbers = (ids) => ids.map((id) => Number($(id).value));
const setNumbers = (ids, values) => ids.forEach((id, i) => { $(id).value = round(values[i], 4); });
const format = (x) => (Math.abs(x) < 0.05 ? '0' : x.toFixed(1));
const describe = ({ clamped, residuals }) => [
  clamped.length === 0 ? 'no limits held' : `held: ${clamped.map(({ bone, asked, held }) => `${bone} ${asked.map(format).join('/')} -> ${held.map(format).join('/')}`).join('; ')}`,
  ...Object.entries(residuals).map(([id, left]) => `${id} reach residual ${(left * 1000).toFixed(1)} mm`),
].join('\n');
const countBy = (list, key) => Object.entries(Object.groupBy(list, (item) => item[key])).map(([id, items]) => `${id} ${items.length}`).join(', ');

function download(name, object) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(object, null, 1)], { type: 'application/json' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  a.click();
  URL.revokeObjectURL(url);
}

// The viewport: the figure on the stage over a ground grid, orbited by the mouse.
function viewport(main) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  setupRenderer(renderer);
  renderer.setPixelRatio(devicePixelRatio);
  main.append(renderer.domElement);
  const stage = makeStage(renderer);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  const fit = () => {
    renderer.setSize(main.clientWidth, main.clientHeight, false);
    camera.aspect = main.clientWidth / main.clientHeight;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(fit).observe(main);
  fit();
  const shown = new THREE.Group();
  stage.add(shown);
  const render = () => renderer.render(stage, camera);
  const tick = () => {
    controls.update();
    render();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  return {
    // Grids and frames the object where it stands now; called when a pose is loaded, not as sliders move, so an orbit
    // the reviewer has chosen survives their edits.
    show(obj) {
      shown.clear();
      const box = new THREE.Box3().setFromObject(obj);
      shown.add(obj, groundGrid(box, gridCell(Math.max(...box.getSize(new THREE.Vector3()).toArray()))));
      frameCamera(camera, obj, controls.target, new THREE.Vector3(...FRONT_QUARTER));
      controls.update();
      render();
    },
    render,
  };
}

// A collapsible group of three sliders per bone, bounded by its limits; `onChange(id, angles)` fires as one moves.
function bonePanel(container, rig, onChange) {
  const rows = new Map();
  for (const bone of rig.bones) {
    const details = document.createElement('details');
    details.className = 'bone';
    const summary = document.createElement('summary');
    const shown = document.createElement('span');
    shown.className = 'angles';
    summary.append(bone.id, shown);
    details.append(summary);
    const fields = ['flex', 'twist', 'abduct'].map((axis) => {
      const [min, max] = bone.limits[axis];
      const label = document.createElement('label');
      const slider = Object.assign(document.createElement('input'), { type: 'range', min, max, step: 0.5, value: 0, disabled: min === max });
      const output = document.createElement('output');
      label.append(axis, slider, output);
      details.append(label);
      slider.addEventListener('input', () => onChange(bone.id, fields.map((field) => Number(field.slider.value))));
      return { slider, output };
    });
    container.append(details);
    rows.set(bone.id, { fields, shown });
  }
  return {
    set(angles) {
      for (const [id, { fields, shown }] of rows) {
        fields.forEach(({ slider, output }, i) => {
          slider.value = angles[id][i];
          output.value = format(angles[id][i]);
        });
        shown.textContent = angles[id].map(format).join(' / ');
      }
    },
  };
}

// Reports what a control was refused, and rethrows so a headless caller sees it fail.
function shownError(id, run) {
  return async (...args) => {
    try {
      $(id).className = '';
      return await run(...args);
    } catch (error) {
      $(id).className = 'error';
      $(id).textContent = error.message;
      throw error;
    }
  };
}

async function startPage(data, query) {
  const { rig } = data;
  const byId = new Map(rig.bones.map((bone) => [bone.id, bone]));
  const wear = query.get('wear')?.split(',').filter(Boolean) ?? [];
  const state = { root: [0, 0, 0], angles: identityAngles(rig), carries: [] };
  const view = viewport($('view'));
  const target = new THREE.Mesh(new THREE.SphereGeometry(0.015), new THREE.MeshBasicMaterial({ color: 0xb5532c, depthTest: false }));
  target.visible = false;
  $('wear').value = wear.join(',');
  $('report').textContent = 'loading the figure';
  const figure = await buildFigure(data, wear);
  figure.root.add(target);

  const ROOT = ['root-x', 'root-y', 'root-z'], TARGET = ['ik-tx', 'ik-ty', 'ik-tz'], POLE = ['ik-px', 'ik-py', 'ik-pz'];
  const bones = bonePanel($('bones'), rig, (id, angles) => {
    state.angles[id] = angles;
    refresh();
  });
  // The pose on screen follows the root and angles; the probe reruns when it is on.
  const refresh = () => {
    const frame = frameOf(rig, state);
    applyFrame(figure, frame);
    bones.set(state.angles);
    setNumbers(ROOT, state.root);
    if ($('probe').checked) {
      const { pokes, flush, sinks, seams } = probe(figure, frame);
      $('probe-report').textContent = [
        `${pokes.length} poke, ${flush.length} flush, ${sinks.length} sink, ${seams.length} seam`,
        pokes.length ? `pokes: ${countBy(pokes, 'bone')}` : '',
        flush.length ? `flush: ${countBy(flush, 'bone')}` : '',
        sinks.length ? `sinks: ${countBy(sinks, 'piece')}` : '',
      ].filter(Boolean).join('\n');
    } else {
      figure.marks.clear();
      $('probe-report').textContent = '';
    }
    view.render();
  };
  const take = (frame) => {
    state.root = [...frame.root];
    state.angles = anglesOf(rig, frame);
    refresh();
  };
  // A fixture by name or a pose file object, compiled and taken on with what it holds in place of what the last one held,
  // its report shown and the view framed on it.
  const show = shownError('report', async (pose) => {
    const file = typeof pose === 'string' ? await loadPoseFile(pose) : pose;
    const { frame, report, carries } = await holdPose(figure, rig, file);
    state.carries = carries;
    take(frame);
    view.show(figure.root);
    $('report').textContent = describe(report);
  });

  // Figure
  $('load').addEventListener('click', () => {
    const next = new URLSearchParams({ wear: $('wear').value.replace(/\s/g, '') });
    if ($('fixture').value) next.set('pose', $('fixture').value);
    location.search = next.toString();
  });
  $('fixture').append(new Option('(rest)', ''), ...rig.poses.map((name) => new Option(name, name)));
  $('fixture').addEventListener('change', () => show($('fixture').value || standing(rig)));
  for (const id of ROOT) $(id).addEventListener('change', () => { state.root = numbers(ROOT); refresh(); });
  $('ground').addEventListener('click', () => {
    const { frame } = compilePose(rig, { ...poseFileOf(rig, frameOf(rig, state)), root: [state.root[0], 0, state.root[2]], ground: true });
    state.root = frame.root;
    refresh();
  });
  $('pose-open').addEventListener('change', shownError('report', async () => {
    const [file] = $('pose-open').files;
    if (file) await show(JSON.parse(await file.text()));
  }));

  // Reach: two-bone IK places a reach bone's joint by turning the two bones above it.
  const ends = rig.bones.filter((bone) => bone.reach);
  $('ik-end').append(...ends.map((bone) => new Option(bone.id, bone.id)));
  const aimAtEnd = () => {
    const end = byId.get($('ik-end').value);
    setNumbers(TARGET, figure.bones.get(end.id).joint.getWorldPosition(new THREE.Vector3()).toArray());
    setNumbers(POLE, end.reach.pole);
    target.position.fromArray(numbers(TARGET));
    target.visible = true;
    view.render();
  };
  $('ik-end').addEventListener('change', aimAtEnd);
  for (const id of TARGET) $(id).addEventListener('input', () => { target.position.fromArray(numbers(TARGET)); target.visible = true; });
  $('ik-solve').addEventListener('click', () => {
    const end = byId.get($('ik-end').value);
    const clamped = [];
    const { pose: solved, residual } = solveTwoBone(rig, decodeFrame(frameOf(rig, state)), end.reach.chain, numbers(TARGET), numbers(POLE), clamped);
    for (const id of end.reach.chain) state.angles[id] = jointAngles(byId.get(id), solved.rotations[id]);
    refresh();
    $('ik-report').textContent = describe({ clamped, residuals: { [end.id]: residual } });
  });

  // Clip: frames collected here, a sequence of fixtures, a clip file opened or one of the clip actor's clips, scrubbed
  // and played. Collected frames and a sequence's keep what the hands carry at each frame (`carries`, one per frame), so
  // a held item's place in the hand and its moving parts follow the clip; the others leave the hands as they are. A
  // timed clip's Seconds scales its timing; an added frame leaves the frames evenly spaced, as it has no time of its own.
  const clip = { frames: [], carries: [], timing: {}, phase: 0, playing: false, actor: null };
  const span = () => (clip.actor ? spanOf(clip.actor, rig.clips.walkSpeed) : Number($('clip-seconds').value));
  const current = () => clip.actor ?? authoredClip(clip.frames, $('clip-loop').checked, span(), clip.timing);
  const seek = (phase) => {
    clip.phase = phase;
    $('clip-scrub').value = phase;
    const playing = current();
    // A loop's cursor is its phase, a finite clip's its seconds.
    const cursor = playing.loop ? phase : phase * span();
    if (clip.carries) {
      const { i, j, w } = clipKeys(playing, cursor);
      state.carries = blendCarries(clip.carries[i], clip.carries[j], w);
      carryLoaded(figure, state.carries);
    }
    take(sampleClip(playing, cursor, slerp));
  };
  const setClip = (frames, { actor = null, carries = null, timing = {}, loop = false, seconds = Number($('clip-seconds').value) } = {}) => {
    clip.frames = frames;
    clip.carries = carries;
    clip.timing = timing;
    clip.actor = actor;
    $('clip-loop').checked = loop;
    $('clip-seconds').value = round(seconds, 3);
    $('clip-count').textContent = `${frames.length} frame${frames.length === 1 ? '' : 's'}`;
    $('clip-scrub').disabled = $('clip-play').disabled = frames.length < 2;
  };
  const stop = () => { clip.playing = false; $('clip-play').textContent = 'Play'; };
  const play = () => {
    let last = performance.now();
    const step = (now) => {
      if (!clip.playing) return;
      const next = clip.phase + (now - last) / 1000 / span();
      last = now;
      const loop = current().loop;
      seek(loop ? next % 1 : Math.min(next, 1));
      if (!loop && next >= 1) stop();
      else requestAnimationFrame(step);
    };
    clip.playing = true;
    $('clip-play').textContent = 'Pause';
    if (!current().loop && clip.phase >= 1) clip.phase = 0;
    requestAnimationFrame(step);
  };
  $('clip-play').addEventListener('click', () => (clip.playing ? stop() : play()));
  // A frame added to an opened clip file carries nothing, as the file's frames do not say what the hands held.
  $('clip-add').addEventListener('click', () => {
    const [frames, carries] = clip.actor ? [[], []] : [clip.frames, clip.carries];
    setClip([...frames, frameOf(rig, state)], { carries: carries && [...carries, state.carries] });
    $('clip-source').value = '';
  });
  $('clip-clear').addEventListener('click', () => { stop(); setClip([], { carries: [] }); $('clip-source').value = ''; });
  $('clip-scrub').addEventListener('input', () => seek(Number($('clip-scrub').value)));
  // An actor clip retimed is collected frames; a sequence retimed keeps its carries and its timing, scaled.
  const retimed = () => {
    if (clip.actor) [clip.carries, clip.timing] = [null, {}];
    clip.actor = null;
    $('clip-source').value = '';
  };
  $('clip-seconds').addEventListener('change', retimed);
  $('clip-loop').addEventListener('change', retimed);
  // The clip actor's clips (the rig's `clips`), each frame folded onto the doll's bones.
  const actorClips = clipSet(await fetch(`built/${rig.clips.file}`).then((r) => r.json()));
  const named = Object.entries(actorClips).filter(([, c]) => playable(c) && c.frames.length > 1);
  const sequences = new Map(Object.entries(rig.sequences).map(([name, sequence]) => [`sequence ${name}`, { name, ...sequence }]));
  $('clip-source').append(
    new Option('(authored)', ''),
    ...[...sequences].map(([value, { name }]) => new Option(name, value)),
    ...named.map(([name]) => new Option(name, name)),
  );
  // A sequence's frames and carries, each key's fixture posed with what it holds, at the key's own time.
  const playSequence = async ({ keys, easing }) => {
    const posed = new Map();
    for (const { fixture } of keys) if (!posed.has(fixture)) posed.set(fixture, await holdPose(figure, rig, await loadPoseFile(fixture)));
    const seconds = keys.at(-1).at;
    setClip(keys.map(({ fixture }) => posed.get(fixture).frame), {
      carries: keys.map(({ fixture }) => posed.get(fixture).carries),
      timing: timingOf({ keyPhases: keys.map(({ at }) => at / seconds), easing }),
      seconds,
    });
    seek(0);
    $('clip-report').textContent = `${posed.size} key frames from ${keys[0].fixture} to ${keys.at(-1).fixture}`;
  };
  $('clip-source').addEventListener('change', shownError('clip-report', async () => {
    stop();
    $('clip-report').textContent = '';
    const value = $('clip-source').value;
    if (sequences.has(value)) return playSequence(sequences.get(value));
    const chosen = actorClips[value];
    if (!chosen) return setClip([], { carries: [] });
    const actor = { ...chosen, frames: chosen.frames.map((frame) => rigFrame(rig, frame)) };
    setClip(actor.frames, { actor, loop: Boolean(actor.loop), seconds: spanOf(actor, rig.clips.walkSpeed) });
    seek(0);
  }));
  $('clip-open').addEventListener('change', shownError('clip-report', async () => {
    const [file] = $('clip-open').files;
    if (!file) return;
    const opened = JSON.parse(await file.text());
    const issues = clipIssues(rig, opened);
    if (issues.length > 0) throw new Error(`clip does not fit rig ${rig.id}: ${issues.join('; ')}`);
    stop();
    $('clip-source').value = '';
    setClip(opened.frames, { timing: timingOf(opened), loop: Boolean(opened.loop), seconds: spanOf(opened, rig.clips.walkSpeed) || Number($('clip-seconds').value) });
    seek(0);
    $('clip-report').textContent = `opened ${file.name}`;
  }));
  $('download-clip').addEventListener('click', () => download('clip.json', current()));
  $('download-frame').addEventListener('click', () => download('frame.json', frameOf(rig, state)));
  $('download-pose').addEventListener('click', () => download('pose.json', readablePose(rig, frameOf(rig, state))));
  $('probe').addEventListener('change', refresh);

  setClip([], { carries: [] });
  const fixture = query.get('pose');
  if (fixture) $('fixture').value = fixture;
  await show(fixture ?? standing(rig));
  aimAtEnd();
  window.showPose = show;
}

startPage(await ready, new URLSearchParams(location.search));
