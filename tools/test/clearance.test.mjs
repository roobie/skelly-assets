import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clearanceProbe, posedSolid, signedDepth } from '../../site/clearance.mjs';
import { applyPoint, IDENTITY_M, length, rotAxis, rotZ } from '../../site/kinematics.mjs';
import { CLEAN, counted } from './findings.mjs';

// A closed axis-aligned box of 12 triangles about `centre`.
const boxMesh = ([w, h, d], centre = [0, 0, 0]) => {
  const positions = [];
  for (const z of [-d / 2, d / 2]) for (const y of [-h / 2, h / 2]) for (const x of [-w / 2, w / 2]) positions.push(x + centre[0], y + centre[1], z + centre[2]);
  const indices = [
    0, 2, 1, 1, 2, 3, 4, 5, 6, 5, 7, 6, // z faces
    0, 1, 4, 1, 5, 4, 2, 6, 3, 3, 6, 7, // y faces
    0, 4, 2, 2, 4, 6, 1, 3, 5, 3, 7, 5, // x faces
  ];
  return { positions, indices };
};

// Two meshes as one, as a part or a piece built of shells that overlap.
const union = (a, b) => ({ positions: [...a.positions, ...b.positions], indices: [...a.indices, ...b.indices.map((i) => i + a.positions.length / 3)] });

// Two bones hanging down the y axis, an upper arm and a forearm below it, each a 0.1 m thick part.
const rig = { bones: [{ id: 'upper', head: [0, 0, 0], tail: [0, -0.3, 0] }, { id: 'fore', head: [0, -0.3, 0], tail: [0, -0.6, 0] }] };
const body = [{ bone: 'upper', mesh: boxMesh([0.1, 0.3, 0.1], [0, -0.15, 0]) }, { bone: 'fore', mesh: boxMesh([0.1, 0.3, 0.1], [0, -0.45, 0]) }];
// A sleeve from a centimetre above the shoulder, so the arm's end lies inside it, `length` down the arm.
const sleeveMesh = (width, length = 0.3) => boxMesh([width, length + 0.01, width], [0, 0.005 - length / 2, 0]);
const sleeve = (width, length) => ({ piece: 'sleeve', bone: 'upper', mesh: sleeveMesh(width, length) });
const still = new Map(rig.bones.map(({ id }) => [id, { r: IDENTITY_M, t: [0, 0, 0] }]));

test('a sleeve that encloses its arm is clean at rest', () => {
  assert.deepEqual(counted(clearanceProbe(rig, { body, pieces: [sleeve(0.12)] })(still)), CLEAN);
});

test('a sleeve a millimetre narrower than its arm lets the arm poke through at rest', () => {
  const { pokes } = clearanceProbe(rig, { body, pieces: [sleeve(0.099)] })(still);
  assert.ok(pokes.length > 0);
  assert.ok(pokes.every(({ bone }) => bone === 'upper'), 'only the sleeved bone is covered');
});

test('a sleeve whose faces lie on its arm\'s is flush, not poked through', () => {
  const { pokes, flush } = clearanceProbe(rig, { body, pieces: [sleeve(0.1)] })(still);
  assert.equal(pokes.length, 0);
  assert.ok(flush.length > 0 && flush.every(({ bone }) => bone === 'upper'));
});

test('an arm face shared with a shell inside the sleeve is hidden, not flush', () => {
  const lined = { piece: 'sleeve', bone: 'upper', mesh: union(sleeveMesh(0.12), sleeveMesh(0.1)) };
  assert.deepEqual(counted(clearanceProbe(rig, { body, pieces: [lined] })(still)), CLEAN);
});

test('a piece passing through a part beneath its face covers that face, and nothing beyond its end', () => {
  // A sleeve run past the elbow over a forearm wider than it: the forearm's sides poke out of the sleeve's lower end.
  const wide = [body[0], { bone: 'fore', mesh: boxMesh([0.14, 0.3, 0.14], [0, -0.45, 0]) }];
  const { pokes } = clearanceProbe(rig, { body: wide, pieces: [sleeve(0.12, 0.4)] })(still);
  assert.ok(pokes.length > 0);
  assert.ok(pokes.every(({ bone, point }) => bone === 'fore' && point[1] >= -0.4), 'the forearm below the cuff is not covered');
});

test('a piece hung against a part\'s side covers none of the rest of the part', () => {
  const bag = { piece: 'bag', bone: 'upper', mesh: boxMesh([0.06, 0.1, 0.06], [0.08, -0.153, 0.007]) };
  assert.deepEqual(counted(clearanceProbe(rig, { body, pieces: [bag] })(still)), CLEAN);
});

test('a joint that turns a covered part out of its piece pokes, and one that turns a part into a piece sinks', () => {
  // The sleeve runs past the elbow, covering the top of the forearm at rest. Swinging the forearm away pulls that out;
  // sliding the upper arm, sleeve and all, down and aside drives the sleeve's wall through the forearm.
  const probe = clearanceProbe(rig, { body, pieces: [sleeve(0.12, 0.4)] });
  assert.deepEqual(counted(probe(still)), CLEAN);
  const elbow = [0, -0.3, 0];
  const about = (r, [x, y, z]) => ({ r, t: [x - (r[0] * x + r[1] * y + r[2] * z), y - (r[3] * x + r[4] * y + r[5] * z), z - (r[6] * x + r[7] * y + r[8] * z)] });
  const forearmOut = new Map([...still, ['fore', about(rotZ(90), elbow)]]);
  const { pokes } = probe(forearmOut);
  assert.ok(pokes.length > 0 && pokes.every(({ bone }) => bone === 'fore'));
  const shoulderIn = new Map([...still, ['upper', { r: IDENTITY_M, t: [-0.06, -0.25, 0] }]]);
  const { sinks } = probe(shoulderIn);
  assert.ok(sinks.length > 0 && sinks.every(({ piece, into }) => piece === 'sleeve' && into === 'fore'));
});

test('a piece already sunk into the body at rest is its fit, not a sink', () => {
  // A sleeve thinner than the arm along z but wider along x passes through the arm's sides by design.
  const sunk = { body, pieces: [{ piece: 'sleeve', bone: 'upper', mesh: boxMesh([0.12, 0.3, 0.06], [0, -0.15, 0]) }] };
  assert.equal(clearanceProbe(rig, sunk)(still).sinks.length, 0);
});

test('a piece driven into the body inside another piece is a seam, not a sink', () => {
  // A cuff riding the forearm inside the sleeve's lower end: sliding the upper arm aside drives the sleeve through the
  // forearm, but where it passes inside the cuff the garment only overlaps itself.
  const cuff = { piece: 'cuff', bone: 'fore', mesh: boxMesh([0.3, 0.1, 0.3], [0, -0.35, 0]) };
  const probe = clearanceProbe(rig, { body, pieces: [sleeve(0.12, 0.4), cuff] });
  const { sinks, seams } = probe(new Map([...still, ['upper', { r: IDENTITY_M, t: [-0.06, -0.25, 0] }]]));
  assert.ok(seams.some(({ piece, into }) => piece === 'sleeve' && into === 'fore'));
  const sleeveSinks = sinks.filter(({ piece }) => piece === 'sleeve');
  assert.ok(sleeveSinks.length > 0 && sleeveSinks.every(({ point }) => point[1] < -0.4), 'the sleeve sinks only below the cuff');
});

test('a piece that declares the regions it covers passes beneath none of its part\'s other regions', () => {
  // A torso of a trunk and shoulders standing proud of it, as the export marks its regions, and a top over the trunk
  // whose side walls rise beneath the shoulders' sides, as a tank top's armholes lie beneath the deltoids.
  const torso = [boxMesh([0.4, 0.4, 0.2], [0, 0.2, 0]), boxMesh([0.5, 0.2, 0.2], [0, 0.5, 0])];
  const spine = { bones: [{ id: 'spine', head: [0, 0, 0], tail: [0, 0.6, 0] }] };
  const torsoBody = [{ bone: 'spine', part: 'torso', mesh: { ...union(...torso), pieces: [...Array(12).fill('trunk'), ...Array(12).fill('shoulders')] } }];
  const top = (width, covers) => ({ piece: 'top', bone: 'spine', covers, mesh: boxMesh([width, 0.517, 0.22], [0, 0.25, 0]) });
  const probe = (piece) => clearanceProbe(spine, { body: torsoBody, pieces: [piece] })(new Map([['spine', still.get('upper')]]));
  assert.deepEqual(counted(probe(top(0.42, ['trunk']))), CLEAN, 'the bare shoulders are not meant to be covered');
  assert.ok(probe(top(0.42, undefined)).pokes.length > 0, 'without a declaration the shoulders are meant to be covered');
  const { pokes } = probe(top(0.38, ['trunk']));
  assert.ok(pokes.length > 0 && pokes.every(({ point }) => point[1] <= 0.4), 'a top too narrow for the trunk it covers still lets it poke');
});

test('a probe refuses a pose missing a bone', () => {
  const probe = clearanceProbe(rig, { body, pieces: [sleeve(0.12)] });
  assert.throws(() => probe(new Map([['upper', still.get('upper')]])), /no transform for bone fore/);
});

test('a solid of many triangles gives every probe its exact signed distance within reach and only its side beyond', () => {
  // A cube of half-size 1, each face a grid of triangles, turned off the axes so the search over its triangles has
  // many levels to prune. Its signed distance is known in closed form.
  const n = 6;
  const positions = [], indices = [];
  for (let a = 0; a < 3; a++) for (const side of [-1, 1]) {
    const base = positions.length / 3;
    for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) {
      const corner = [0, 0, 0];
      corner[a] = side;
      corner[(a + 1) % 3] = -1 + (2 * i) / n;
      corner[(a + 2) % 3] = -1 + (2 * j) / n;
      positions.push(...corner);
    }
    const at = (i, j) => base + i * (n + 1) + j;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) indices.push(at(i, j), at(i + 1, j), at(i + 1, j + 1), at(i, j), at(i + 1, j + 1), at(i, j + 1));
  }
  const transform = { r: rotAxis([1, 2, 3], 37), t: [0.1, -0.2, 0.05] };
  const solid = posedSolid({ positions, indices }, transform);
  const exact = (q) => {
    const out = q.map((x) => Math.max(Math.abs(x) - 1, 0));
    return out.some((x) => x > 0) ? length(out) : -Math.min(...q.map((x) => 1 - Math.abs(x)));
  };
  const reach = 0.5;
  const steps = [-1.9, -1.3, -0.7, -0.15, 0.35, 0.9, 1.15, 1.6];
  for (const x of steps) for (const y of steps) for (const z of steps) {
    const q = [x, y, z], d = exact(q), depth = signedDepth(solid, applyPoint(transform, q), reach);
    if (Math.abs(d) <= reach) assert.ok(Math.abs(depth - d) < 1e-9, `${q}: ${depth}, not ${d}`);
    else assert.equal(depth, d < 0 ? -Infinity : Infinity, `${q}`);
  }
});
