import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { restPokeReport, restPokeResults } from '../restPoke.mjs';
import { partGlb } from './boxes.mjs';

// A doll of one torso on a one-bone rig, wearing a vest narrower than the torso across x, so each side of the torso
// stands out of the vest it passes beneath by the difference. A second, toy doll of the same shape has no garment
// fitted to it, so nothing is probed on it.
const TORSO = [
  [-0.1, 0, -0.1],
  [0.1, 0.5, 0.1],
];
const SIDE = 0.02;
const VEST = [
  [-0.1 + SIDE, 0.1, -0.12],
  [0.1 - SIDE, 0.4, 0.12],
];
const rig = {
  id: 'fixture',
  revision: 1,
  root: 'spine',
  reference: 'left',
  bones: {
    spine: {
      model: 'bust',
      nodeRotation: [0, 0, 0, 1],
      part: 'torso',
      parent: null,
      pivot: 'origin',
      along: [0, 1, 0],
      limits: { flex: [0, 0], twist: [0, 0], abduct: [0, 0] },
    },
  },
};
const root = mkdtempSync(join(tmpdir(), 'rest-poke-'));
after(() => rmSync(root, { recursive: true, force: true }));
mkdirSync(join(root, 'models'), { recursive: true });
const dressing = {
  dolls: {
    player: { bust: 'bust', limbs: [], sides: ['right', 'left'], mirrored: 'left', slots: {}, rig },
    toy: { bust: 'toybust', limbs: [], sides: ['right', 'left'], mirrored: 'left', slots: {}, rig },
  },
  piece: 'torso',
};
writeFileSync(join(root, 'models/dressing.libsonnet'), JSON.stringify(dressing));
const files = {
  bust: { glb: partGlb('torso', TORSO), entry: { anchors: {} } },
  toybust: { glb: partGlb('torso', TORSO), entry: { anchors: {} } },
  vest_worn: { glb: partGlb('torso', VEST), entry: {} },
};
const generated = {
  models: [{ id: 'bust' }, { id: 'toybust' }, { id: 'vest_worn', tags: { fit: ['worn'] } }],
  modelOf: async (id) => files[id],
};
const cache = join(root, 'cache');
const probed = await restPokeResults(generated, { root, cache, workers: 1 });

test('the check finds the body poking out of the piece meant to cover it, by its depth', () => {
  const [poke, ...others] = probed.results.player.vest.pokes;
  assert.deepEqual(others, []);
  assert.equal(`${poke.bone} out of ${poke.piece}`, 'spine out of vest_worn');
  assert.ok(Math.abs(poke.depth - SIDE) < 1e-6, `pokes by ${poke.depth} m, not ${SIDE} m`);
});

test('a garment is probed on the doll it is fitted to alone', () => {
  assert.deepEqual(Object.keys(probed.results), ['player', 'toy']);
  assert.deepEqual(Object.keys(probed.results.player), ['vest']);
  assert.deepEqual(probed.results.toy, {});
});

test('a garment whose inputs are unchanged is not probed again', async () => {
  assert.equal(probed.probed, 1);
  const again = await restPokeResults(generated, { root, cache, workers: 1 });
  assert.deepEqual(
    { reused: again.reused, probed: again.probed, results: again.results },
    { reused: 1, probed: 0, results: probed.results },
  );
});

// Content writes a cap as the depth rounded up to the millimetre.
const entry = (depth, extra = { why: 'fixture' }) => ({
  doll: 'player',
  garment: 'vest',
  bone: 'spine',
  piece: 'vest_worn',
  depth,
  ...extra,
});
const none = { pokes: [], unjudged: [] };

test('a poke fails unless an entry allows it to its depth', () => {
  assert.match(
    restPokeReport(probed.results, none).problems.join('\n'),
    /vest on player: the doll's spine pokes out of vest_worn at rest by 20\.0 mm$/,
  );
  assert.match(
    restPokeReport(probed.results, { ...none, pokes: [entry(0.015)] }).problems.join('\n'),
    /more than the 15\.0 mm allowed/,
  );
  assert.deepEqual(restPokeReport(probed.results, { ...none, pokes: [entry(0.021)] }), { problems: [], notes: [] });
});

test('an unjudged poke passes and is said on every run', () => {
  const { problems, notes } = restPokeReport(probed.results, {
    ...none,
    unjudged: [entry(0.021, { note: 'awaiting a refit' })],
  });
  assert.deepEqual(problems, []);
  assert.match(
    notes.join('\n'),
    /spine pokes out of vest_worn at rest by 20\.0 mm and is not judged: awaiting a refit/,
  );
});

test('an entry that is stale, doubled or capped loose fails', () => {
  const problems = (allowances) => restPokeReport(probed.results, { ...none, ...allowances }).problems.join('\n');
  assert.match(problems({ pokes: [entry(0.021), { ...entry(0.01), bone: 'neck' }] }), /neck out of vest_worn is stale/);
  assert.match(problems({ pokes: [entry(0.021)], unjudged: [entry(0.021, { note: 'twice' })] }), /listed twice/);
  assert.match(problems({ pokes: [entry(0.025)] }), /capped at 25\.0 mm, far above the 20\.0 mm it measures/);
});

test('an entry is judged against the doll it names', () => {
  const problems = restPokeReport(probed.results, { ...none, pokes: [entry(0.021), { ...entry(0.021), doll: 'toy' }] });
  assert.match(problems.problems.join('\n'), /^vest on toy: allowed rest poke of spine out of vest_worn is stale/);
  assert.equal(problems.problems.length, 1);
});

test('a piece that declares it covers body it does not enclose fails, whatever the entries allow', async () => {
  const declaring = {
    ...generated,
    modelOf: async (id) => (id === 'vest_worn' ? { ...files.vest_worn, entry: { covers: ['torso'] } } : files[id]),
  };
  const { results } = await restPokeResults(declaring, { root, workers: 1 });
  assert.deepEqual(probed.results.player.vest.gaps, []);
  assert.match(
    restPokeReport(results, { ...none, pokes: [entry(0.021)] }).problems.join('\n'),
    /^vest on player: vest_worn \(\w+\) covers torso but would hide body it does not enclose: \d+ samples show/,
  );
});
