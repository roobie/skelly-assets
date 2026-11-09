import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { expect, it } from 'vitest';
import { catalogue } from '../src/content.ts';
import { exportThingRecipes } from '../src/cli/export.ts';
import { loadThingRecipe } from '../src/exports.ts';
import { installJsonnetSources } from '../../../sources.mjs';
import { sweepGroup } from './sweeps.ts';

await installJsonnetSources();

it('exports one recipe file into its pack output without changing its source root', async () => {
  const root = mkdtempSync(join(tmpdir(), 'thing-recipes-'));
  const out = mkdtempSync(join(tmpdir(), 'thing-output-'));
  try {
    const item = catalogue.items.find(({ exportMass, parts }) =>
      exportMass === 'parts' && parts.length === 1 && parts[0]!.family === 'fuse')!;
    const packId = 'fixture.pack';
    const value = [{
      id: `${item.id}_fixture_model`, kind: 'item', source: item.id,
      voxel: { grain: 0.01 }, options: { mass: item.exportMass },
    }];
    mkdirSync(join(root, 'models/recipes'), { recursive: true });
    writeFileSync(join(root, 'models/recipes', `${packId}.jsonnet`), JSON.stringify(value));
    writeFileSync(join(root, 'models/recipes', `${packId}.json`), JSON.stringify(value));
    const sourceRoot = readdirSync(root, { recursive: true }).sort();
    const { modelEntry, glb } = loadThingRecipe(value, catalogue)[0]!.generate();
    await exportThingRecipes(root, out);

    const base = join(out, packId);
    expect(JSON.parse(readFileSync(join(base, 'things/index.json'), 'utf8'))).toEqual([modelEntry]);
    expect(JSON.parse(readFileSync(join(base, 'things', `${modelEntry.id}.model.json`), 'utf8'))).toEqual(modelEntry);
    expect(readFileSync(join(base, modelEntry.file))).toEqual(Buffer.from(glb));
    expect(readdirSync(root, { recursive: true }).sort()).toEqual(sourceRoot);
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});

sweepGroup('complete recipe export', () => {
  it('exports every recipe file without changing its source root', async () => {
    const root = resolve(import.meta.dirname, '../../../..');
    const out = mkdtempSync(join(tmpdir(), 'thing-output-'));
    const sourceRoot = readdirSync(root, { recursive: true }).sort();
    try {
      const { files } = await exportThingRecipes(root, out);
      expect(files.length).toBeGreaterThan(0);
      expect(readdirSync(root, { recursive: true }).sort()).toEqual(sourceRoot);
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });
});
