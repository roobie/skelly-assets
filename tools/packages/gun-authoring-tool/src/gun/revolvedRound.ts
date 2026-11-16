import type { RevolvedSolid, Vec2 } from '@skelly/construct/shapes/solid.ts';
import appearance from '../../../../../models/guns/tables/appearance.json' with { type: 'json' };

/** A cartridge component turned about its length (+X), with the content side count so every drawing of it agrees. */
export const revolvedRound = (id: string, profile: readonly Vec2[], slot: string): RevolvedSolid => ({
  id,
  kind: 'revolved',
  axis: 'x',
  profile,
  slot,
  sides: appearance.roundSides,
});
