import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, it } from 'vitest';
import { catalogue } from '../src/catalogue.ts';
import { exportThingRecipes } from '../src/cli/export.ts';
import { loadThingRecipe } from '../src/exports.ts';

it('exports each recipe file into its pack output without writing into the source root', () => {
  const root = mkdtempSync(join(tmpdir(), 'thing-recipes-'));
  const out = mkdtempSync(join(tmpdir(), 'thing-output-'));
  try {
    const item = catalogue.items.find((entry) => entry.exportMass === 'inventory-atom')!;
    mkdirSync(join(root, 'models/recipes'), { recursive: true });
    const packs = ['fixture.shared', 'fixture.product'];
    const rows = packs.map((packId, index) => {
      const value = [{
        id: `fixture_model_${index}`, kind: 'item', source: item.id,
        voxel: { grain: 0.01 }, options: { mass: item.exportMass },
      }];
      writeFileSync(join(root, 'models/recipes', `${packId}.jsonnet`), JSON.stringify(value));
      writeFileSync(join(root, 'models/recipes', `${packId}.json`), JSON.stringify(value));
      return loadThingRecipe(value)[0]!;
    });
    exportThingRecipes(root, out);
    packs.forEach((packId, index) => {
      const { modelEntry, glb } = rows[index]!.generate();
      const base = join(out, packId);
      expect(JSON.parse(readFileSync(join(base, 'things/index.json'), 'utf8'))).toEqual([modelEntry]);
      expect(JSON.parse(readFileSync(join(base, 'things', `${modelEntry.id}.model.json`), 'utf8'))).toEqual(modelEntry);
      expect(readFileSync(join(base, modelEntry.file))).toEqual(Buffer.from(glb));
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
    rmSync(out, { recursive: true, force: true });
  }
});
