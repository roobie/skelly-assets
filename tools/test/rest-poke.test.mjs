import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { writeGlb } from '../glb.mjs';
import { restPokeReport, restPokeResults } from '../restPoke.mjs';
import { boxes } from './boxes.mjs';

// A doll of one torso on a one-bone rig, wearing a vest narrower than the torso across x, so each side of the torso
// stands out of the vest it passes beneath by the difference.
const TORSO = [[-0.1, 0, -0.1], [0.1, 0.5, 0.1]];
const SIDE = 0.02;
const VEST = [[-0.1 + SIDE, 0.1, -0.12], [0.1 - SIDE, 0.4, 0.12]];
const partGlb = (part, span) => {
  const { positions, indices } = boxes(span);
  return writeGlb({
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }],
    nodes: [{ extras: { part }, mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1, mode: 4 }] }],
    accessors: [
      { bufferView: 0, componentType: 5126, count: positions.length / 3, type: 'VEC3', min: span[0], max: span[1] },
      { bufferView: 1, componentType: 5125, count: indices.length, type: 'SCALAR' },
    ],
  }, [new Float32Array(positions), new Uint32Array(indices)]);
};
const dressing = { doll: { bust: 'bust', limbs: [], sides: ['right', 'left'], mirrored: 'left' }, piece: 'torso', slots: {} };
const rig = {
  id: 'fixture', revision: 1, root: 'spine', reference: 'left',
  bones: { spine: { model: 'bust', part: 'torso', parent: null, pivot: 'origin', along: [0, 1, 0], limits: { flex: [0, 0], twist: [0, 0], abduct: [0, 0] } } },
};
const root = mkdtempSync(join(tmpdir(), 'rest-poke-'));
after(() => rmSync(root, { recursive: true, force: true }));
mkdirSync(join(root, 'models/poses'), { recursive: true });
writeFileSync(join(root, 'models/dressing.libsonnet'), JSON.stringify(dressing));
writeFileSync(join(root, 'models/poses/rig.libsonnet'), JSON.stringify(rig));
const files = { bust: { glb: partGlb('torso', TORSO), entry: { anchors: {} } }, vest_worn: { glb: partGlb('torso', VEST), entry: {} } };
const generated = {
  models: [{ id: 'bust' }, { id: 'vest_worn', tags: { fit: ['worn'] } }],
  modelOf: async (id) => files[id],
};
const cache = join(root, 'cache');
const probed = await restPokeResults(generated, { root, cache, workers: 1 });

test('the check finds the body poking out of the piece meant to cover it, by its depth', () => {
  assert.deepEqual(Object.keys(probed.results), ['vest']);
  const [poke, ...others] = probed.results.vest;
  assert.deepEqual(others, []);
  assert.equal(`${poke.bone} out of ${poke.piece}`, 'spine out of vest_worn');
  assert.ok(Math.abs(poke.depth - SIDE) < 1e-6, `pokes by ${poke.depth} m, not ${SIDE} m`);
});

test('a garment whose inputs are unchanged is not probed again', async () => {
  assert.equal(probed.probed, 1);
  const again = await restPokeResults(generated, { root, cache, workers: 1 });
  assert.deepEqual({ reused: again.reused, probed: again.probed, results: again.results }, { reused: 1, probed: 0, results: probed.results });
});

// Content writes a cap as the depth rounded up to the millimetre.
const entry = (depth, extra = { why: 'fixture' }) => ({ garment: 'vest', bone: 'spine', piece: 'vest_worn', depth, ...extra });
const none = { pokes: [], unjudged: [] };

test('a poke fails unless an entry allows it to its depth', () => {
  assert.match(restPokeReport(probed.results, none).problems.join('\n'), /vest: the doll's spine pokes out of vest_worn at rest by 20\.0 mm$/);
  assert.match(restPokeReport(probed.results, { ...none, pokes: [entry(0.015)] }).problems.join('\n'), /more than the 15\.0 mm allowed/);
  assert.deepEqual(restPokeReport(probed.results, { ...none, pokes: [entry(0.021)] }), { problems: [], notes: [] });
});

test('an unjudged poke passes and is said on every run', () => {
  const { problems, notes } = restPokeReport(probed.results, { ...none, unjudged: [entry(0.021, { note: 'awaiting a refit' })] });
  assert.deepEqual(problems, []);
  assert.match(notes.join('\n'), /spine pokes out of vest_worn at rest by 20\.0 mm and is not judged: awaiting a refit/);
});

test('an entry that is stale, doubled or capped loose fails', () => {
  const problems = (allowances) => restPokeReport(probed.results, { ...none, ...allowances }).problems.join('\n');
  assert.match(problems({ pokes: [entry(0.021), { ...entry(0.01), bone: 'neck' }] }), /neck out of vest_worn is stale/);
  assert.match(problems({ pokes: [entry(0.021)], unjudged: [entry(0.021, { note: 'twice' })] }), /listed twice/);
  assert.match(problems({ pokes: [entry(0.025)] }), /capped at 25\.0 mm, far above the 20\.0 mm it measures/);
});
