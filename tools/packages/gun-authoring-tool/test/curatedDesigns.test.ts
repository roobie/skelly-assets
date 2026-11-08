import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exportFileText } from '../src/cli/exportFile.ts';
import { PART_CATALOGUE } from '../src/gun/catalogue.ts';
import { loadGunDesign } from '../src/gun/designLoader.ts';

const DESIGNS = join(import.meta.dirname, '..', 'designs');

const curated = readdirSync(DESIGNS)
  .filter((file) => file.endsWith('.json') && !file.startsWith('look-'))
  .sort()
  .map((file) => {
    const text = readFileSync(join(DESIGNS, file), 'utf8');
    const loaded = loadGunDesign(text);
    if (!loaded.ok) {
      throw new Error(`${file}: ${loaded.error.message}`);
    }
    const id = file.slice(0, -'.json'.length).replaceAll('-', '_');
    const exported = exportFileText(text, { id, file: `assets/models/${id}.glb` }, {});
    if (!exported.ok) {
      throw new Error(`${file}: ${exported.message}`);
    }
    return { file, items: loaded.design.items ?? {}, parts: exported.modelEntry.parts ?? {} };
  });

describe('curated designs', () => {
  it('exports each authored part item as the item of the part it names, and no other part item', () => {
    expect(curated.length).toBeGreaterThan(0);
    for (const { file, items, parts } of curated) {
      const fitted = Object.fromEntries(
        Object.entries(parts)
          .filter(([, part]) => part.item !== undefined)
          .map(([id, part]) => [id, part.item]),
      );
      expect(fitted, `${file}: exported part items differ from the design's`).toEqual(items);
    }
    expect(
      curated.some(({ items }) => Object.keys(items).length > 0),
      'no curated design authors a part item',
    ).toBe(true);
  });

  it('exports each item part with the catalogue mass of its item', () => {
    let weighed = 0;
    for (const { file, items, parts } of curated) {
      for (const [id, itemId] of Object.entries(items)) {
        weighed += 1;
        expect(parts[id]?.massKg, `${file} ${id}: mass differs from catalogue item ${itemId}`).toBe(
          PART_CATALOGUE.items.get(itemId)?.massKg,
        );
      }
    }
    expect(weighed, 'no curated design authors a part item').toBeGreaterThan(0);
  });
});
