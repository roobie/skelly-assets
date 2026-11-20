import type { KeepOut } from '@skelly/construct/assembly/schema.ts';
import { boxFromMinMax } from '@skelly/construct/shapes/geometry.ts';

/** How far ahead of a rifle's muzzle its blast reaches, and how far off the bore. */
const BLAST = { lengthU: 30, halfU: 1.5 } as const;

/** The blast ahead of a barrel's muzzle, clear of everything but a device fitted to the muzzle port. */
export const muzzleBlastKeepOut = (muzzleX: number): KeepOut => ({
  id: 'muzzle',
  kind: 'muzzle',
  box: boxFromMinMax([muzzleX, -BLAST.halfU, -BLAST.halfU], [muzzleX + BLAST.lengthU, BLAST.halfU, BLAST.halfU]),
  allowPort: 'muzzle',
});
