import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { installJsonnetSources } from '../sources.mjs';

await installJsonnetSources();
const { safeParse } = await import('valibot');
const { NeutralModelSchema } = await import('../packages/thing-core/src/schema.ts');
const { glbJson } = await import('../glb.mjs');
const { partMassProperties } = await import('../actorMass.mjs');
const { exportMob, mobStore, severedIndexFiles } = await import('../mobs.mjs');
const { outputPath } = await import('../layout.mjs');
const { CUT_MATERIAL } = await import('../severedPartBake.mjs');
const { readSeveredParts, SEVERED_INDEX, severedPartPlan } = await import('../severedParts.mjs');
const { mobManifest } = await import('../manifest.mjs');

// The bone ids a cut at `bone` takes, walked down the body file's parent links.
const subtreeOf = (bones, bone) => {
  const taken = new Set([bone]);
  for (const { id, parent } of bones) if (taken.has(parent)) taken.add(id);
  return taken;
};

test('every cut point of each named mob type bakes a part for each set of cut points below it already gone, weighing its template\'s share of the body less theirs', async () => {
  const plans = await readSeveredParts();
  assert(plans.length > 0, 'the sheet must name a mob type with severed parts');
  const out = mkdtempSync(join(tmpdir(), 'severed-parts-'));
  try {
    for (const plan of plans) {
      const { cuts: map } = exportMob(plan.source, out, undefined, plan);
      const body = JSON.parse(readFileSync(join(out, outputPath(plan.source.pack, plan.source.body))));
      const cuts = body.bones.filter((bone) => bone.disposition === 'sever').map((bone) => bone.id);
      assert.deepEqual(Object.keys(map).sort(), [...cuts].sort(), `${plan.mob}: parts at every cut point`);
      const bodyVoxelCount = body.bones.reduce((n, bone) => n + (bone.voxels?.length ?? 0), 0);
      const pointsOf = (taken) => body.bones.filter((b) => taken.has(b.id)).flatMap((b) => b.voxels ?? []);
      const shareOf = (bone) => partMassProperties({ points: pointsOf(subtreeOf(body.bones, bone)), voxelSize: body.voxelSize, bodyVoxelCount, bodyMassKg: body.bodyMassKg, massFractions: body.massFractions, part: bone }).mass;
      for (const bone of cuts) {
        const below = cuts.filter((cut) => cut !== bone && subtreeOf(body.bones, bone).has(cut));
        assert.deepEqual(map[bone][0].without, [], `${plan.mob} ${bone}: its whole part first`);
        for (const cut of below) assert(map[bone].some(({ without }) => without.length === 1 && without[0] === cut), `${plan.mob} ${bone}: a part without ${cut}`);
        for (const { without, model } of map[bone]) {
          assert(safeParse(NeutralModelSchema, model).success, `${model.id}: a neutral model sidecar`);
          assert(without.every((cut) => below.includes(cut)), `${model.id}: gone only below its cut point`);
          const expected = without.reduce((mass, cut) => mass - shareOf(cut), shareOf(bone));
          assert(Math.abs(model.parts[bone].massKg - expected) <= 1e-9 * expected, `${model.id}: its share less the shares already gone`);
          const gltf = glbJson(readFileSync(join(out, outputPath(plan.pack, model.file))));
          assert(gltf.materials.some(({ name }) => name === plan.materials[CUT_MATERIAL]), `${model.id}: shows the face it was cut at`);
        }
      }
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('a severed-part source row served from the cache gives the sidecars a fresh bake does', async () => {
  const [plan] = await readSeveredParts();
  const root = mkdtempSync(join(tmpdir(), 'severed-cache-'));
  try {
    const store = mobStore(join(root, 'cache'));
    const fresh = exportMob(plan.source, join(root, 'stored'), store, plan);
    const served = exportMob(plan.source, join(root, 'served'), store, plan);
    assert.deepEqual([served.entry.reused, served.cuts], [true, fresh.cuts]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the manifest lists each severed part with its taxonomy, the mob type and bone it is cut at, the cut points already gone below, and its pack\'s index', () => {
  const plan = { mob: 'm', pack: 'p', index: SEVERED_INDEX, parts: [{ bone: 'arm.L', without: ['hand.L'], id: 'm_arm_l_without_hand_l', title: 'M left arm without hand', path: 'assets/models/m_arm_l_without_hand_l.glb', taxonomy: { category: 'body' } }] };
  const { models, files } = mobManifest([], [plan]);
  assert.deepEqual(models, [{ id: 'm_arm_l_without_hand_l', title: 'M left arm without hand', kind: 'severed-part', pack: 'p', path: 'assets/models/m_arm_l_without_hand_l.glb', taxonomy: { category: 'body' }, cut: { mob: 'm', bone: 'arm.L', without: ['hand.L'], index: SEVERED_INDEX } }]);
  assert.deepEqual(files.sort(), ['p/assets/models/m_arm_l_without_hand_l.glb', `p/${SEVERED_INDEX}`]);
});

test('a pack\'s severed index holds every type cut into it, by type', () => {
  const cuts = new Map([['a', { head: { id: 'a_head' } }], ['b', { head: { id: 'b_head' } }]]);
  const files = severedIndexFiles([{ mob: 'b', pack: 'p' }, { mob: 'a', pack: 'p' }], cuts);
  assert.deepEqual(files.map(([file, json]) => [file, JSON.parse(json)]), [[`p/${SEVERED_INDEX}`, { a: cuts.get('a'), b: cuts.get('b') }]]);
});

test('a severed type without a row in its pack, a cut point without a title or a title for its part\'s remnant, or a material drawn as no catalogue material, is refused', () => {
  const row = { id: 'm.1', type: 'm', pack: 'p' };
  const sheet = (mobs, cuts, materials = {}) => ({ pack: 'body', taxonomy: {}, mobs, cuts, without: {}, materials });
  const bones = [{ id: 'head', parent: null, disposition: 'sever' }, { id: 'maw', parent: 'head', disposition: 'sever' }];
  const plan = (severed) => severedPartPlan(severed, [row], () => bones, new Set(['body-gore']));
  assert.throws(() => plan(sheet({ q: { m: 'M' } }, { head: 'head', maw: 'jaw' })), /q has no row of type m/);
  assert.throws(() => plan(sheet({ p: { m: 'M' } }, { maw: 'jaw' })), /cuts has no title for head/);
  assert.throws(() => plan(sheet({ p: { m: 'M' } }, { head: 'head', maw: 'jaw' })), /without has no title for maw/);
  assert.throws(() => plan(sheet({ p: { m: 'M' } }, { head: 'head' }, { cut: 'gore' })), /draws cut as gore/);
});
