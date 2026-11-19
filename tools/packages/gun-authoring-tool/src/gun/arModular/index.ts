// The modular AR family: one set of part families per frame table (models/guns/tables/<frame>.jsonnet), each named by
// its frame and role. parts.ts, domain.ts, templates.ts and anchorData.ts each register this folder with one line, so
// the rest of the work stays here. Nothing here may import the first AR (arLayout.ts, arFrames.ts or the `ar`
// template); test/arModular.test.ts holds that line.

import type { PartFamily, Rule } from '@skelly/construct/assembly/schema.ts';
import type { Template } from '@skelly/construct/assembly/template.ts';
import type { GunPartFamily } from '../actionRoles.ts';
import type { GunAnchorDeclarations } from '../anchors.ts';
import { arModularAnchors } from './anchors.ts';
import { arBarrel, arFlashHider, arGasBlock } from './barrel.ts';
import { AR15_FRAME, type ArFrame } from './frame.ts';
import { arGrip } from './grip.ts';
import { arHandguard } from './handguard.ts';
import { arLower } from './lower.ts';
import { arReceiverExtension, arStock } from './stock.ts';
import { type ArModularGun, arModularTemplate } from './template.ts';
import { arUpper } from './upper.ts';

/** Each frame of the family, with what its template says of the gun it builds. */
const FRAMES: readonly { readonly frame: ArFrame; readonly gun: ArModularGun }[] = [
  {
    frame: AR15_FRAME,
    gun: {
      description:
        'Modular AR-15 carbine: flat-top upper, free-float railed handguard, low-profile gas block, A2 flash hider, collapsible stock.',
      variant: '5.56x45',
    },
  },
];

const PART_FAMILIES: readonly ((frame: ArFrame) => PartFamily)[] = [
  arLower,
  arUpper,
  arBarrel,
  arGasBlock,
  arHandguard,
  arFlashHider,
  arReceiverExtension,
  arStock,
  arGrip,
];

// Every frame table is authored in exact millimetres.
export const AR_MODULAR_FAMILIES: Readonly<Record<string, GunPartFamily>> = Object.fromEntries(
  FRAMES.flatMap(({ frame }) => PART_FAMILIES.map((family) => family(frame))).map((family) => [
    family.name,
    { ...family, millimetreAuthored: true },
  ]),
);

export const AR_MODULAR_ANCHORS: GunAnchorDeclarations = Object.assign(
  {},
  ...FRAMES.map(({ frame }) => arModularAnchors(frame)),
);

export const AR_MODULAR_TEMPLATES: readonly Template[] = FRAMES.map(({ frame, gun }) => arModularTemplate(frame, gun));

export const AR_MODULAR_RULES: readonly Rule[] = [];
