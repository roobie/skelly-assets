// The posing page: the doll, bare or dressed, bent at its rig's joints (rig.json, from tools/pose/rig.mjs) by a pose
// fixture, by sliders or by two-bone IK, its worn pieces riding the parts they are drawn in, so a wearable's fit can
// be reviewed in a pose and a pose or a clip authored by hand. A clearance probe marks where the body shows through a
// piece or a piece sinks into the body (clearance.mjs).
//
// The figure is a hierarchy of one three.js joint per bone, each at its bone's head, with the doll part node and the
// piece sites a bone binds attached under it; a clip frame's quaternions go straight onto the joints, which composes
// the same world transforms kinematics.mjs computes (`boneTransforms`), so the picture and the maths agree.
//
// tools/pose-sheet.mjs drives it headless through `window.posed`; opened with `?wear=a,b&pose=name` it shows that
// figure with its controls, and `window.showPose` loads a fixture by name or a pose file object into them.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { clearance } from './clearance.mjs';
import { add, compilePose, frameAngles, jointAngles, jointRotation, mat3ToQuat, solveTwoBone, sub } from './kinematics.mjs';
import { viewSet } from './lookOptions.mjs';
import { FRONT_QUARTER } from './modelFrame.mjs';
import { frame as frameCamera, loadEntry, makeStage, registerModels, setupRenderer } from './render.mjs';
import { drawView, gridCell, groundGrid, makeDrawer, ruleAt, startTile } from './tile.mjs';

// Sites and part origins reach the same place by different arithmetic (tools/dress.mjs, `dollOf`), so they agree
// only to rounding.
const SAME_PLACE = 1e-4;
// A piece covers a span of its part shorter than its own extent by about this much at each end: a cuff or a hem.
const PROBE_MARGIN = 0.01;
const ISSUE_COLOUR = { pokes: 0xd0301a, sinks: 0xe0901a };
const IDENTITY_Q = [0, 0, 0, 1];
// The doll at rest, standing on the ground: the page's pose until a fixture is chosen.
const STANDING = { angles: {}, ground: true };

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
const near = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < SAME_PLACE);
const sameSide = (a, b) => Boolean(a.mirror) === Boolean(b.mirror);

// The doll's own sites and the worn pieces of each wearable. A wearable's `worn` begins with the doll's sites
// (tools/dress.mjs, `wornSites`), which count once however many wearables are worn.
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

// The doll part node a bone moves: the node marked with the bind's part in a site of the bind's model on its side,
// whose origin stands where the bind says. Each bind's `at` is its part copy's origin in the doll frame, which tells
// the two arms' copies of one part apart.
function boundPart(bind, sites, groups) {
  const origin = new THREE.Vector3();
  const candidates = [];
  sites.forEach((site, i) => {
    if (site.part !== undefined || site.model !== bind.model || !sameSide(site, bind)) return;
    groups[i].traverse((node) => {
      if (node.userData.part === bind.part && near(node.getWorldPosition(origin).toArray(), bind.at)) candidates.push(node);
    });
  });
  if (candidates.length !== 1) throw new Error(`${candidates.length} ${bind.part} nodes of ${bind.model} at ${bind.at.join(', ')}; the rig needs one`);
  return candidates[0];
}

// The worn piece sites a bone carries: those drawn in the frame of its part copy.
const boundPieces = (bind, sites, groups) => sites
  .map((site, i) => ({ site, group: groups[i] }))
  .filter(({ site }) => site.part === bind.part && near(site.at, bind.at) && sameSide(site, bind));

// The dressed doll as a jointed figure: `root` holds the joints, each named by its bone, and `bones` maps a bone id to
// its joint, the doll part node and the piece sites hung from it. What no bone carries, such as a wearable placed
// whole, stays under the dressed group where the dressing put it.
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
    joint.position.fromArray(bone.parent === null ? bone.head : sub(bone.head, joints.get(bone.parent).userData.head));
    joint.userData.head = bone.head;
    (bone.parent === null ? root : joints.get(bone.parent)).add(joint);
    joints.set(bone.id, joint);
  }
  root.updateMatrixWorld(true);
  const bones = new Map();
  for (const bone of rig.bones) {
    const joint = joints.get(bone.id);
    const part = boundPart(bone.bind, sites, groups);
    const pieces = boundPieces(bone.bind, sites, groups);
    joint.attach(part);
    for (const { group } of pieces) joint.attach(group);
    bones.set(bone.id, { bone, joint, part, pieces });
  }
  return { rig, root, marks, bones };
}

// Poses the figure by a clip frame: a quaternion per bone about its head, the root moved by `frame.root`.
export function applyFrame(figure, frame) {
  for (const { bone, joint } of figure.bones.values()) {
    joint.quaternion.fromArray(frame.rotations[bone.id] ?? IDENTITY_Q);
    if (bone.parent === null) joint.position.fromArray(add(bone.head, frame.root));
  }
  figure.root.updateMatrixWorld(true);
}

// The world position of a bone's tail in the current pose.
const tailOf = (figure, id) => {
  const { bone, joint } = figure.bones.get(id);
  return joint.localToWorld(new THREE.Vector3().fromArray(sub(bone.tail, bone.head))).toArray();
};

// ---- the clearance probe ----

// Every mesh under `object` as one triangle soup in world axes.
function worldMesh(object) {
  const positions = [], indices = [];
  const p = new THREE.Vector3();
  object.traverse((o) => {
    if (!o.isMesh) return;
    const base = positions.length / 3;
    const { attributes: { position }, index } = o.geometry;
    for (let i = 0; i < position.count; i++) positions.push(...p.fromBufferAttribute(position, i).applyMatrix4(o.matrixWorld).toArray());
    if (index) for (let i = 0; i < index.count; i++) indices.push(base + index.getX(i));
    else for (let i = 0; i < position.count; i++) indices.push(base + i);
  });
  return { positions, indices };
}

// Where the posed pieces stop enclosing the parts they cover, each bone's part a body part named by the bone, with
// the issue points marked on the figure: pokes in red, sinks in orange, drawn through whatever hides them.
function probe(figure) {
  const body = [], pieces = [];
  for (const [id, { part, pieces: worn }] of figure.bones) {
    body.push({ part: id, mesh: worldMesh(part) });
    for (const { site, group } of worn) pieces.push({ piece: site.model, part: id, mesh: worldMesh(group) });
  }
  const found = clearance(body, pieces, { margin: PROBE_MARGIN });
  figure.marks.clear();
  for (const [kind, color] of Object.entries(ISSUE_COLOUR)) {
    const points = found.issues.filter((issue) => issue.kind === kind).flatMap((issue) => issue.point);
    if (points.length === 0) continue;
    const geometry = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    figure.marks.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color, size: 0.012, sizeAttenuation: true, depthTest: false })));
  }
  return found;
}

// ---- frames and angles ----

const identityAngles = (rig) => Object.fromEntries(rig.bones.map((bone) => [bone.id, [0, 0, 0]]));
const bent = (angles) => angles.some((a) => Math.abs(a) > 1e-9);

// A clip frame from a root and the angles of every bone, leaving out the bones at rest.
const frameOf = (rig, { root, angles }) => ({
  root: [...root],
  rotations: Object.fromEntries(rig.bones.filter((bone) => bent(angles[bone.id])).map((bone) => [bone.id, mat3ToQuat(jointRotation(bone, angles[bone.id]))])),
});
const anglesOf = (rig, frame) => ({ ...identityAngles(rig), ...frameAngles(rig, frame) });
const round = (x, places) => Math.round(x * 10 ** places) / 10 ** places;
// A pose file (kinematics.mjs, `compilePose`) that compiles back to this root and these angles.
const poseFileOf = ({ root, angles }) => ({
  angles: Object.fromEntries(Object.entries(angles).filter(([, a]) => bent(a)).map(([id, a]) => [id, a.map((x) => round(x, 2))])),
  ...(bent(root) ? { root: root.map((x) => round(x, 4)) } : {}),
});

// The frame `w` of the way from `a` to `b`, each bone's rotation slerped.
function blend(a, b, w) {
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  const ids = new Set([...Object.keys(a.rotations), ...Object.keys(b.rotations)]);
  const rotations = Object.fromEntries([...ids].map((id) => [id, qa.fromArray(a.rotations[id] ?? IDENTITY_Q).slerp(qb.fromArray(b.rotations[id] ?? IDENTITY_Q), w).toArray()]));
  return { root: a.root.map((x, i) => x + (b.root[i] - x) * w), rotations };
}

// ---- headless: a tile of the posed figure ----

let drawer;

// Four views of the figure, `size` pixels each, as a PNG data URL.
function drawTile(obj, size, views) {
  drawer ??= makeDrawer();
  const directions = viewSet(views).map(([name, direction]) => [name, new THREE.Vector3(...direction)]);
  const box = new THREE.Box3().setFromObject(obj);
  const grid = groundGrid(box, gridCell(Math.max(...box.getSize(new THREE.Vector3()).toArray())));
  const { tile, g } = startTile(size, 2, 2);
  drawer.stage.add(obj);
  directions.forEach((view, i) => drawView(drawer, g, obj, grid, view, (i % 2) * size, Math.floor(i / 2) * size, size));
  drawer.stage.remove(obj);
  ruleAt(g, { x: size }, tile.height);
  ruleAt(g, { y: size }, tile.width);
  return tile.toDataURL('image/png');
}

// The doll wearing `wear`, posed by the fixture `pose` names or the pose file object it is, drawn as a tile, with the
// compile report, the clearance probe's findings when asked and the frame the pose compiled to.
async function posed({ wear = [], pose, size = 384, views = 'review', probe: probing = false } = {}) {
  const data = await ready;
  const figure = await buildFigure(data, wear);
  const file = typeof pose === 'string' ? await loadPoseFile(pose) : pose ?? STANDING;
  const { frame, report } = compilePose(data.rig, file);
  applyFrame(figure, frame);
  const found = probing ? probe(figure) : null;
  return { png: drawTile(figure.root, size, views), report, clearance: found, frame };
}

window.posed = posed;

// ---- the page ----

const $ = (id) => document.getElementById(id);
const numbers = (ids) => ids.map((id) => Number($(id).value));
const setNumbers = (ids, values) => ids.forEach((id, i) => { $(id).value = round(values[i], 4); });
const format = (x) => (Math.abs(x) < 0.05 ? '0' : x.toFixed(1));
const describe = ({ clamped, residuals }) => [
  clamped.length === 0 ? 'no limits held' : `held: ${clamped.map(({ bone, asked, held }) => `${bone} ${asked.map(format).join('/')} -> ${held.map(format).join('/')}`).join('; ')}`,
  ...Object.entries(residuals).map(([id, left]) => `${id} IK residual ${(left * 1000).toFixed(1)} mm`),
].join('\n');

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

async function startPage(data, query) {
  const { rig } = data;
  const byId = new Map(rig.bones.map((bone) => [bone.id, bone]));
  const wear = query.get('wear')?.split(',').filter(Boolean) ?? [];
  const state = { root: [0, 0, 0], angles: identityAngles(rig), clip: [] };
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
    applyFrame(figure, frameOf(rig, state));
    bones.set(state.angles);
    setNumbers(ROOT, state.root);
    if ($('probe').checked) {
      const { counts } = probe(figure);
      $('probe-counts').textContent = `${counts.pokes} poke, ${counts.sinks} sink`;
    } else {
      figure.marks.clear();
      $('probe-counts').textContent = '';
    }
    view.render();
  };
  const take = (frame) => {
    state.root = [...frame.root];
    state.angles = anglesOf(rig, frame);
    refresh();
  };
  // A fixture by name or a pose file object, compiled and taken on, with its report shown and the view framed on it.
  const show = async (pose) => {
    try {
      const file = typeof pose === 'string' ? await loadPoseFile(pose) : pose;
      const { frame, report } = compilePose(rig, file);
      take(frame);
      view.show(figure.root);
      $('report').className = '';
      $('report').textContent = describe(report);
    } catch (error) {
      $('report').className = 'error';
      $('report').textContent = error.message;
      throw error;
    }
  };

  // Figure
  $('load').addEventListener('click', () => {
    const next = new URLSearchParams({ wear: $('wear').value.replace(/\s/g, '') });
    if ($('fixture').value) next.set('pose', $('fixture').value);
    location.search = next.toString();
  });
  $('fixture').append(new Option('(rest)', ''), ...rig.poses.map((name) => new Option(name, name)));
  $('fixture').addEventListener('change', () => show($('fixture').value || STANDING));
  for (const id of ROOT) $(id).addEventListener('change', () => { state.root = numbers(ROOT); refresh(); });
  $('ground').addEventListener('click', () => {
    const { frame } = compilePose(rig, { ...poseFileOf(state), root: [state.root[0], 0, state.root[2]], ground: true });
    state.root = frame.root;
    refresh();
  });

  // IK: a two-bone chain keeps its middle joint a hinge, so it ends at the bone below a hinge: a hand or a foot.
  const hinge = (bone) => bone.limits.abduct[0] === bone.limits.abduct[1];
  const ends = rig.bones.filter((bone) => bone.parent !== null && hinge(byId.get(bone.parent)) && byId.get(bone.parent).parent !== null);
  $('ik-end').append(...ends.map((bone) => new Option(bone.id, bone.id)));
  const aimAtEnd = () => {
    const end = byId.get($('ik-end').value);
    setNumbers(TARGET, tailOf(figure, end.parent));
    target.position.fromArray(numbers(TARGET));
    target.visible = true;
    view.render();
  };
  $('ik-end').addEventListener('change', aimAtEnd);
  for (const id of TARGET) $(id).addEventListener('input', () => { target.position.fromArray(numbers(TARGET)); target.visible = true; });
  $('ik-solve').addEventListener('click', () => {
    const end = $('ik-end').value, lower = byId.get(end).parent, upper = byId.get(lower).parent;
    const pose = { root: state.root, rotations: Object.fromEntries(rig.bones.map((bone) => [bone.id, jointRotation(bone, state.angles[bone.id])])) };
    const clamped = [];
    const { pose: solved, residual } = solveTwoBone(rig, pose, [upper, lower], numbers(TARGET), numbers(POLE), clamped);
    for (const id of [upper, lower]) state.angles[id] = jointAngles(byId.get(id), solved.rotations[id]);
    refresh();
    $('ik-report').textContent = describe({ clamped, residuals: { [end]: residual } });
  });

  // Clip: frames the user collects, scrubbed with a slerp between neighbours.
  const countFrames = () => {
    $('clip-count').textContent = `${state.clip.length} frame${state.clip.length === 1 ? '' : 's'}`;
    $('clip-scrub').max = Math.max(0, state.clip.length - 1);
    $('clip-scrub').disabled = state.clip.length < 2;
  };
  $('clip-add').addEventListener('click', () => {
    state.clip.push(frameOf(rig, state));
    $('clip-scrub').value = state.clip.length - 1;
    countFrames();
  });
  $('clip-clear').addEventListener('click', () => { state.clip = []; countFrames(); });
  $('clip-scrub').addEventListener('input', () => {
    const t = Number($('clip-scrub').value), i = Math.floor(t);
    take(blend(state.clip[i], state.clip[Math.min(i + 1, state.clip.length - 1)], t - i));
  });
  $('download-clip').addEventListener('click', () => download('clip.json', { kind: 'pose', loop: false, frames: state.clip }));
  $('download-frame').addEventListener('click', () => download('frame.json', frameOf(rig, state)));
  $('download-pose').addEventListener('click', () => download('pose.json', poseFileOf(state)));
  $('probe').addEventListener('change', refresh);

  const fixture = query.get('pose');
  if (fixture) $('fixture').value = fixture;
  await show(fixture ?? STANDING);
  aimAtEnd();
  window.showPose = show;
}

startPage(await ready, new URLSearchParams(location.search));
