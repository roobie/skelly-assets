// The .50 BMG round the anti-materiel rifle is sized from, read from the cited cartridge record so the
// magazine, the magazine well and the action derive from one set of measurements.

import bmgJson from '../../../../../../models/guns/cartridges/50-bmg.json' with { type: 'json' };
import type { MetallicCartridge } from '../../ammo/cartridge.ts';
import { formatCartridgeParseError, parseCartridge } from '../../ammo/parseCartridge.ts';
import { mmToU } from '../units.ts';

const parsed = parseCartridge(bmgJson);
if (!parsed.ok) {
  throw new Error(`Invalid .50 BMG cartridge data: ${formatCartridgeParseError(parsed.error)}`);
}
const { cartridge } = parsed;
if (
  cartridge.kind !== 'metallic' ||
  cartridge.overallLength.max.value === null ||
  cartridge.case.length.value === null ||
  cartridge.case.rim.diameter.value === null ||
  cartridge.case.body.diameterAtHead.value === null
) {
  throw new Error('.50 BMG cartridge data must give a sourced overall length, case length and head diameters.');
}

export const BMG_CARTRIDGE: MetallicCartridge = cartridge;
/** The maximum loaded length: a magazine must take the longest round the standard admits. */
export const BMG_OVERALL_LENGTH_U = mmToU(cartridge.overallLength.max.value);
export const BMG_CASE_LENGTH_U = mmToU(cartridge.case.length.value);
/** The widest part of the case, rim or head, which sets how rounds stack. */
export const BMG_BASE_DIAMETER_U = mmToU(
  Math.max(cartridge.case.rim.diameter.value, cartridge.case.body.diameterAtHead.value),
);

/** The smallest multiple of `step` that is at least `value` (a float-noise tolerance keeps exact multiples). */
export const ceilTo = (value: number, step: number): number => Math.ceil(value / step - 1e-9) * step;
