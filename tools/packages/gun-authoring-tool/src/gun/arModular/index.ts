// The modular AR family (AR-15 first): families built from the millimetre frame table models/guns/tables/ar15.jsonnet.
// parts.ts, domain.ts, templates.ts and anchorData.ts each register this folder with one line, so the rest of the work
// stays here.
// Nothing here may import the first AR (arLayout.ts, arFrames.ts or the `ar` template); test/arModular.test.ts holds
// that line.

import type { PartFamily, Rule } from '@skelly/construct/assembly/schema.ts';
import { ar15Barrel, ar15FlashHider, ar15GasBlock } from './barrel.ts';
import { ar15Grip } from './grip.ts';
import { ar15Handguard } from './handguard.ts';
import { ar15Lower } from './lower.ts';
import { ar15ReceiverExtension, ar15Stock } from './stock.ts';
import { ar15Upper } from './upper.ts';

export const AR_MODULAR_FAMILIES: Readonly<Record<string, PartFamily>> = {
  'ar15-lower': ar15Lower,
  'ar15-upper': ar15Upper,
  'ar15-barrel': ar15Barrel,
  'ar15-gas-block': ar15GasBlock,
  'ar15-handguard': ar15Handguard,
  'ar15-flash-hider': ar15FlashHider,
  'ar15-receiver-extension': ar15ReceiverExtension,
  'ar15-stock': ar15Stock,
  'ar15-grip': ar15Grip,
};

export const AR_MODULAR_RULES: readonly Rule[] = [];

export { AR_MODULAR_ANCHORS } from './anchors.ts';
export { arModular } from './template.ts';
