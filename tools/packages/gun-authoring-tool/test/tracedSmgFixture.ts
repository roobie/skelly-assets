import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Resolved } from '@skelly/construct/assembly/schema.ts';
import { GRID } from '@skelly/construct/foundation/conventions.ts';
import { applyPoint, type Vec3 } from '@skelly/construct/foundation/math.ts';
import { obbPolyhedron, worldSolid } from '@skelly/construct/shapes/geometry.ts';
import { DESIGNS } from '../src/cli/content.ts';
import { GUN_ANCHORS } from '../src/gun/anchorData.ts';
import { loadGunDesign } from '../src/gun/designLoader.ts';
import { gunDomain } from '../src/gun/domain.ts';
import { uToMm } from '../src/gun/units.ts';

/** A traced estimate sits on the gun grid, so it may miss its published figure by half a grid step. */
export const GRID_TOLERANCE_MM = uToMm(GRID / 2);

/** A design resolved in the gun frame, with some of its parts' params overridden. */
export const resolveDesign = (file: string, params: Record<string, Record<string, string>> = {}): Resolved => {
  const loaded = loadGunDesign(readFileSync(join(DESIGNS, file), 'utf8'));
  if (!loaded.ok) {
    throw new Error(JSON.stringify(loaded.error));
  }
  const { assembly } = loaded.design;
  const parts = Object.fromEntries(
    Object.entries(assembly.parts).map(([name, part]) => [
      name,
      { ...part, params: { ...part.params, ...params[name] } },
    ]),
  );
  return resolve({ ...assembly, parts }, gunDomain);
};

export const owner = (resolved: Resolved, family: string): string => {
  const entry = [...resolved.defs].find(([, def]) => def.family === family);
  if (!entry) {
    throw new Error(`Fixture needs ${family}`);
  }
  return entry[0];
};

export const worldXs = (resolved: Resolved, family: string): number[] => {
  const id = owner(resolved, family);
  return resolved.defs
    .get(id)!
    .solids.flatMap((solid) => {
      const shape = worldSolid(resolved.placed.get(id)!, solid);
      return [...('vertices' in shape ? shape : obbPolyhedron(shape)).vertices];
    })
    .map(([x]) => x);
};

export const muzzleTip = (resolved: Resolved): Vec3 => {
  const barrel = owner(resolved, 'barrel');
  const muzzle = GUN_ANCHORS.barrel!.anchors({}, resolved.defs.get(barrel)!).muzzle!;
  return applyPoint(resolved.placed.get(barrel)!, muzzle.position);
};

export const breech = (resolved: Resolved): Vec3 => {
  const barrel = owner(resolved, 'barrel');
  const rear = resolved.defs.get(barrel)!.ports.find(({ id }) => id === 'rear')!;
  return applyPoint(resolved.placed.get(barrel)!, rear.pos);
};

/** The built gun's overall length, from the muzzle tip to the stock's rearmost face. */
export const overallLengthMm = (resolved: Resolved): number =>
  uToMm(muzzleTip(resolved)[0] - Math.min(...worldXs(resolved, 'stock')));
