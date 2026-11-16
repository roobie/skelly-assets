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
const { exportMob } = await import('../mobs.mjs');
const { outputPath } = await import('../layout.mjs');
const { CUT_MATERIAL } = await import('../severedPartBake.mjs');
const { readSeveredParts, severedPartPlan } = await import('../severedParts.mjs');
const { mobManifest } = await import('../manifest.mjs');

// The bone ids a cut at `bone` takes, walked down the body file's parent links.
const subtreeOf = (bones, bone) => {
  const taken = new Set([bone]);
  for (const { id, parent } of bones) if (taken.has(parent)) taken.add(id);
  return taken;
};

test('every cut point of each named mob type bakes a part weighing its template\'s share of the body', async () => {
  const plans = await readSeveredParts();
  assert(plans.length > 0, 'the sheet must name a mob type with severed parts');
  const out = mkdtempSync(join(tmpdir(), 'severed-parts-'));
  try {
    for (const plan of plans) {
      exportMob(plan.source, out, undefined, plan);
      const body = JSON.parse(readFileSync(join(out, outputPath(plan.source.pack, plan.source.body))));
      const map = JSON.parse(readFileSync(join(out, outputPath(plan.pack, plan.map))));
      const cuts = body.bones.filter((bone) => bone.disposition === 'sever').map((bone) => bone.id);
      assert.deepEqual(Object.keys(map).sort(), [...cuts].sort(), `${plan.mob}: one part per cut point`);
      const bodyVoxelCount = body.bones.reduce((n, bone) => n + (bone.voxels?.length ?? 0), 0);
      for (const bone of cuts) {
        const model = map[bone];
        assert(safeParse(NeutralModelSchema, model).success, `${model.id}: a neutral model sidecar`);
        const taken = subtreeOf(body.bones, bone);
        const points = body.bones.filter((b) => taken.has(b.id)).flatMap((b) => b.voxels ?? []);
        const expected = partMassProperties({ points, voxelSize: body.voxelSize, bodyVoxelCount, bodyMassKg: body.bodyMassKg, massFractions: body.massFractions, part: bone });
        const { massKg } = model.parts[bone];
        if (body.massFractions?.[bone] !== undefined) assert.equal(massKg, expected.mass, `${model.id}: its authored share`);
        else assert(Math.abs(massKg - expected.mass) <= 1e-9 * expected.mass, `${model.id}: its voxel share`);
        const gltf = glbJson(readFileSync(join(out, outputPath(plan.pack, model.file))));
        assert(gltf.materials.some(({ name }) => name === plan.materials[CUT_MATERIAL]), `${model.id}: shows the face it was cut at`);
      }
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('the manifest lists each severed part with the mob type, bone and cut map it is cut at', () => {
  const plan = { mob: 'm', pack: 'p', map: 'severed/m.json', parts: [{ bone: 'arm.L', id: 'm_arm_l', title: 'M left arm', path: 'assets/models/m_arm_l.glb' }] };
  const { models, files } = mobManifest([], [plan]);
  assert.deepEqual(models, [{ id: 'm_arm_l', title: 'M left arm', kind: 'severed-part', pack: 'p', path: 'assets/models/m_arm_l.glb', cut: { mob: 'm', bone: 'arm.L', map: 'severed/m.json' } }]);
  assert.deepEqual(files.sort(), ['p/assets/models/m_arm_l.glb', 'p/severed/m.json']);
});

test('a severed type without a row in its pack, a cut point without a title, or a material drawn as no catalogue material, is refused', () => {
  const row = { id: 'm.1', type: 'm', pack: 'p' };
  const sheet = (mobs, cuts, materials = {}) => ({ pack: 'body', taxonomy: {}, mobs, cuts, materials });
  const plan = (severed) => severedPartPlan(severed, [row], () => ['head'], new Set(['body-gore']));
  assert.throws(() => plan(sheet({ q: { m: 'M' } }, { head: 'head' })), /q has no row of type m/);
  assert.throws(() => plan(sheet({ p: { m: 'M' } }, {})), /no title for head/);
  assert.throws(() => plan(sheet({ p: { m: 'M' } }, { head: 'head' }, { cut: 'gore' })), /draws cut as gore/);
});
