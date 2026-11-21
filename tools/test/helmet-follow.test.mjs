import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { after, before, test } from 'node:test';
import { modelMeshes } from '../dress.mjs';
import { helmetFindings, readHelmets } from '../head-fit.mjs';
import { evaluateJsonnetAsync, REPOSITORY_ROOT } from '../jsonnet/index.mjs';
import { loadCatalogue } from '../packages/thing-authoring-tool/src/catalogue.ts';
import { exportItem } from '../packages/thing-authoring-tool/src/exports.ts';

// The jsonnet module's root is the tools folder, which it searches beside the folder above it.
const REPOSITORY = resolve(REPOSITORY_ROOT, '..');
const BUST = 'models/measures/bust.libsonnet';
// The rows that draw the player bust and each solid helmet the kits hold, so a compile can read them over other
// measures.
const ROWS = `local helmets = import 'models/head-helmets.libsonnet';
{
  settings: import 'models/item-settings.libsonnet',
  rows: [r for r in (import 'models/catalogue/sets/avatar.libsonnet') if r.id == 'player_bust']
    + [r for kit in std.objectValues(import 'models/kits/index.libsonnet') for r in kit if std.member(helmets, r.id)],
}`;

/** @type {string} */
let scratch;
before(() => {
  scratch = mkdtempSync(join(tmpdir(), 'helmet-follow-'));
});
after(() => rmSync(scratch, { recursive: true, force: true }));

// The bust and the helmets as built over the bust's measures with the head drawn `headHeight` tall and `headDepth` deep:
// each exported in-process.
async function builtOver(headHeight, headDepth) {
  const overlay = join(scratch, `${headHeight}-${headDepth}`);
  mkdirSync(join(overlay, 'models/measures'), { recursive: true });
  writeFileSync(
    join(overlay, BUST),
    `(import '${join(REPOSITORY, BUST)}') + { headHeight: ${headHeight}, headDepth: ${headDepth} }`,
  );
  const { settings, rows } = JSON.parse(await evaluateJsonnetAsync(ROWS, REPOSITORY_ROOT, { overlay }));
  const built = (id) => {
    const row = rows.find((r) => r.id === id);
    assert.ok(
      row,
      `${id} is listed in models/head-helmets.libsonnet, but no kit (models/kits/index.libsonnet) draws it`,
    );
    const item = loadCatalogue({ ...settings, items: [row] }).items[0];
    const exported = exportItem(
      item,
      settings,
      { id, file: `assets/models/${id}.glb` },
      { voxelGrain: row.voxelGrain },
    );
    return { meshes: modelMeshes(Buffer.from(exported.glb)), anchors: exported.modelEntry.anchors };
  };
  return { built, bust: built('player_bust') };
}

// The helmets are drawn from the head measures, so a smaller or larger head than the bust's still hides inside each.
for (const [headHeight, headDepth] of [
  [0.235, 0.2],
  [0.3, 0.24],
]) {
  test(`every solid helmet hides a head ${headHeight} tall and ${headDepth} deep`, async () => {
    const { built, bust } = await builtOver(headHeight, headDepth);
    const head = bust.meshes.find(({ part }) => part === 'head');
    assert.ok(head);
    const helmets = readHelmets(REPOSITORY_ROOT);
    assert.ok(helmets.length > 0, 'models/head-helmets.libsonnet lists no helmet');
    const findings = helmets.flatMap((model) => {
      const helmet = built(model);
      return helmetFindings({
        head,
        headBrow: bust.anchors.brow,
        meshes: helmet.meshes,
        brow: helmet.anchors.brow,
        model,
      });
    });
    assert.deepEqual(findings, []);
  });
}
