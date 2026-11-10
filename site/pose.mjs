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
import { add, boneTransforms, jointAngles, jointRotation, solveTwoBone, sub } from './kinematics.mjs';
import { viewSet } from './lookOptions.mjs';
import { FRONT_QUARTER } from './modelFrame.mjs';
import { clipIssues, compilePose, decodeFrame, encodeFrame, frameAngles, poseFileOf, rigFrame } from './poseFile.mjs';
import { samplePose } from './poseSample.mjs';
import { clipSet, frame as frameCamera, loadEntry, makeStage, playable, registerModels, setupRenderer } from './render.mjs';
import { addCoveredSkin, skinCheck } from './skin.mjs';
import { drawView, gridCell, groundGrid, makeDrawer, ruleAt, startTile } from './tile.mjs';

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

// Every mesh under `object` as one triangle mesh in world axes.
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

// The dressed doll as a jointed figure: `root` holds the joints, each named by its bone, `bones` maps a bone id to its
// joint, and `clearance()` gives the figure's covered surface at rest and the clearance probe over it, made when first
// asked for, since a figure drawn only to be looked at needs neither. A piece rides the bone of the part copy it is drawn
// in (its site's part and side); what no bone carries, such as a wearable placed whole, stays where the dressing put it.
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
    rest.body.push({ bone: bone.id, mesh: worldMesh(part) });
    for (const { site, group } of pieces) rest.pieces.push({ piece: site.model, bone: bone.id, mesh: worldMesh(group) });
  }
  const bones = new Map(bound.map((entry) => [entry.bone.id, entry]));
  let clearance;
  const covered = () => {
    if (!clearance) {
      const surface = coveredSurface(rig, rest);
      clearance = { surface, probe: clearanceProbe(rig, rest, surface) };
    }
    return clearance;
  };
  return { rig, root, marks, bones, clearance: covered };
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
  return clip.loop ? clip.periodSimSeconds : clip.durationSimSeconds ?? clip.durationRealSeconds;
};
// A clip at `phase`, 0 to 1 of its span; a loop's cursor is its phase, a finite clip's its seconds.
const clipAt = (clip, phase, span) => samplePose(clip, clip.loop ? phase : phase * span, slerp);
// A clip of the rig's frames, its span stated the way its loop needs.
const authoredClip = (frames, loop, seconds) => ({ kind: 'pose', loop, ...(loop ? { periodSimSeconds: seconds } : { durationSimSeconds: seconds }), frames });

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
// compile report, the clearance probe's findings and the skin check when asked, and the frame the pose compiled to.
async function posed({ wear = [], pose, size = 384, views = 'review', probe: probing = false, skin = false } = {}) {
  const data = await ready;
  const figure = await buildFigure(data, wear);
  if (skin) addCoveredSkin(figure, figure.clearance().surface);
  const file = typeof pose === 'string' ? await loadPoseFile(pose) : pose ?? standing(data.rig);
  const { frame, report } = compilePose(data.rig, file);
  applyFrame(figure, frame);
  const found = probing ? probe(figure, frame) : null;
  const png = drawTile(figure.root, size, views);
  // The marks would draw over the skin check's masks.
  figure.marks.clear();
  return { png, report, clearance: found, skin: skin ? skinCheck(figure.root, size, views) : null, frame };
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
  const state = { root: [0, 0, 0], angles: identityAngles(rig) };
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
  // A fixture by name or a pose file object, compiled and taken on, with its report shown and the view framed on it.
  const show = shownError('report', async (pose) => {
    const file = typeof pose === 'string' ? await loadPoseFile(pose) : pose;
    const { frame, report } = compilePose(rig, file);
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

  // Clip: frames collected here, a clip file opened or one of the clip actor's clips, scrubbed and played.
  const clip = { frames: [], phase: 0, playing: false, actor: null };
  const span = () => (clip.actor ? spanOf(clip.actor, rig.clips.walkSpeed) : Number($('clip-seconds').value));
  const current = () => clip.actor ?? authoredClip(clip.frames, $('clip-loop').checked, span());
  const seek = (phase) => {
    clip.phase = phase;
    $('clip-scrub').value = phase;
    take(clipAt(current(), phase, span()));
  };
  const setClip = (frames, { actor = null, loop = false, seconds = Number($('clip-seconds').value) } = {}) => {
    clip.frames = frames;
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
  $('clip-add').addEventListener('click', () => {
    setClip([...(clip.actor ? [] : clip.frames), frameOf(rig, state)]);
    $('clip-source').value = '';
  });
  $('clip-clear').addEventListener('click', () => { stop(); setClip([]); $('clip-source').value = ''; });
  $('clip-scrub').addEventListener('input', () => seek(Number($('clip-scrub').value)));
  $('clip-seconds').addEventListener('change', () => { clip.actor = null; $('clip-source').value = ''; });
  $('clip-loop').addEventListener('change', () => { clip.actor = null; $('clip-source').value = ''; });
  // The clip actor's clips (the rig's `clips`), each frame folded onto the doll's bones.
  const actorClips = clipSet(await fetch(`built/${rig.clips.file}`).then((r) => r.json()));
  const named = Object.entries(actorClips).filter(([, c]) => playable(c) && c.frames.length > 1);
  $('clip-source').append(new Option('(authored)', ''), ...named.map(([name]) => new Option(name, name)));
  $('clip-source').addEventListener('change', () => {
    stop();
    const chosen = actorClips[$('clip-source').value];
    if (!chosen) return setClip([]);
    const actor = { ...chosen, frames: chosen.frames.map((frame) => rigFrame(rig, frame)) };
    setClip(actor.frames, { actor, loop: Boolean(actor.loop), seconds: spanOf(actor, rig.clips.walkSpeed) });
    seek(0);
  });
  $('clip-open').addEventListener('change', shownError('clip-report', async () => {
    const [file] = $('clip-open').files;
    if (!file) return;
    const opened = JSON.parse(await file.text());
    const issues = clipIssues(rig, opened);
    if (issues.length > 0) throw new Error(`clip does not fit rig ${rig.id}: ${issues.join('; ')}`);
    stop();
    $('clip-source').value = '';
    setClip(opened.frames, { loop: Boolean(opened.loop), seconds: spanOf(opened, rig.clips.walkSpeed) || Number($('clip-seconds').value) });
    seek(0);
    $('clip-report').textContent = `opened ${file.name}`;
  }));
  $('download-clip').addEventListener('click', () => download('clip.json', current()));
  $('download-frame').addEventListener('click', () => download('frame.json', frameOf(rig, state)));
  $('download-pose').addEventListener('click', () => download('pose.json', readablePose(rig, frameOf(rig, state))));
  $('probe').addEventListener('change', refresh);

  setClip([]);
  const fixture = query.get('pose');
  if (fixture) $('fixture').value = fixture;
  await show(fixture ?? standing(rig));
  aimAtEnd();
  window.showPose = show;
}

startPage(await ready, new URLSearchParams(location.search));
