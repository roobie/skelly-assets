import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { PartDef, Resolved } from '@skelly/construct/assembly/schema.ts';
import { displayItems } from '@skelly/construct/shapes/display.ts';
import { latticeOrigin, partVoxelGrain, terraceLattice, voxelSourceOf } from '@skelly/thing-export/glb.ts';
import { recipeVoxel } from '@skelly/thing-export/recipe.ts';
import { fillVoxels, type VoxelFill } from '@skelly/thing-export/voxelize.ts';
import { describe, expect, it } from 'vitest';
import { DESIGNS } from '../src/cli/content.ts';
import { loadGunDesign } from '../src/gun/designLoader.ts';
import { gunDomain } from '../src/gun/domain.ts';
import gunVoxel from '../src/gun/gunVoxel.json' with { type: 'json' };

/**
 * Lattice lines, along each axis, that are empty although all four lines beside them are filled: a pinhole a player
 * sees straight through. Cells of the fill are keyed by the other two axes of each line.
 */
const seeThrough = (fill: VoxelFill): string[] => {
  const voxels = [...fill.cells.keys()].map((key) => fill.cells.voxelOf(key));
  const holes = new Set<string>();
  for (const along of [0, 1, 2]) {
    const [a, b] = [0, 1, 2].filter((axis) => axis !== along) as [number, number];
    const lines = new Set(voxels.map((voxel) => `${voxel[a]},${voxel[b]}`));
    for (const line of lines) {
      const [u, v] = line.split(',').map(Number) as [number, number];
      for (const [du, dv] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const [hu, hv] = [u + du, v + dv];
        const around = [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ].every(([eu, ev]) => lines.has(`${hu + eu!},${hv + ev!}`));
        if (!lines.has(`${hu},${hv}`) && around) {
          holes.add(`along ${'xyz'[along]} at ${'xyz'[a]}=${hu} ${'xyz'[b]}=${hv}`);
        }
      }
    }
  }
  return [...holes].sort();
};

/** A part's voxels as the export samples them, or none for a part it leaves smooth. */
const fillOf = (part: string, def: PartDef, resolved: Resolved): VoxelFill | undefined => {
  const placed = resolved.placed.get(part)!;
  const unit = gunDomain.units.metresPerUnit;
  const grain = partVoxelGrain(def, recipeVoxel({ voxel: gunVoxel }), unit);
  if (grain === undefined) {
    return undefined;
  }
  const lattice = terraceLattice(placed, grain, unit);
  const sources = displayItems(def.displaySolids ?? def.solids).map((item) => {
    const mesh = voxelSourceOf(item, lattice);
    return { positions: mesh.positions.map((x) => x * unit), indices: mesh.indices };
  });
  return fillVoxels(sources, grain, latticeOrigin(placed, grain, unit));
};

/**
 * Holes the authored solids themselves leave, the part's own seams rather than anything the exporter makes of them;
 * see backlog B-XDYII4SC5V3A4B74. Each is a design file and the parts it leaves, with the count of lines each leaves.
 */
const AUTHORED_SEAMS: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  'archetype-revolver.json': { frame: 1 },
  'archetype-smg.json': { handguard: 1 },
};

const designFiles = readdirSync(DESIGNS)
  .filter((file) => file.endsWith('.json') && !file.startsWith('look-'))
  .sort();

describe('the voxels of every published gun', () => {
  it.each(designFiles)('%s leaves no see-through line but its authored seams', (file) => {
    const loaded = loadGunDesign(readFileSync(join(DESIGNS, file), 'utf8'));
    if (!loaded.ok) {
      return;
    }
    const resolved = resolve(loaded.design.assembly, gunDomain);
    const found: Record<string, number> = {};
    for (const [part, def] of resolved.defs) {
      const fill = fillOf(part, def, resolved);
      const holes = fill === undefined ? [] : seeThrough(fill);
      if (holes.length > 0) {
        found[part] = holes.length;
      }
    }
    expect(found).toEqual(AUTHORED_SEAMS[file] ?? {});
  });
});
