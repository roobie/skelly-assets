// The 9x19 case the traced SMGs chamber, read from the cited cartridge record so the ejection port follows it.

import nineMmJson from '../../../../../models/guns/cartridges/9x19.json' with { type: 'json' };
import { formatCartridgeParseError, parseCartridge } from '../ammo/parseCartridge.ts';
import { mmToU } from './units.ts';

const parsed = parseCartridge(nineMmJson);
if (!parsed.ok) {
  throw new Error(`Invalid 9x19 cartridge data: ${formatCartridgeParseError(parsed.error)}`);
}
const { cartridge } = parsed;
if (
  cartridge.kind !== 'metallic' ||
  cartridge.case.length.value === null ||
  cartridge.case.rim.diameter.value === null ||
  cartridge.case.body.diameterAtHead.value === null
) {
  throw new Error('9x19 cartridge data must give a sourced case length and head diameters.');
}

/** The case's length and its widest part, rim or head. */
export const NINE_MM_CASE = {
  lengthU: mmToU(cartridge.case.length.value),
  headDiameterU: mmToU(Math.max(cartridge.case.rim.diameter.value, cartridge.case.body.diameterAtHead.value)),
} as const;
