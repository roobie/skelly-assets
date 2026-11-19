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
import { arFrontSightBase } from './frontSightBase.ts';
import { arGrip } from './grip.ts';
import { arDropInHandguard, arHandguard } from './handguard.ts';
import { arLower } from './lower.ts';
import { arModularRules } from './rules.ts';
import { arReceiverExtension, arStock } from './stock.ts';
import { type ArModularGuns, arModularTemplates } from './template.ts';
import { arUpper } from './upper.ts';

/** Each frame of the family, with what its templates say of the guns they build. */
const FRAMES: readonly { readonly frame: ArFrame; readonly guns: ArModularGuns }[] = [
  {
    frame: AR15_FRAME,
    guns: {
      freeFloat: {
        description:
          'Modular AR-15 carbine: flat-top upper, free-float railed handguard, low-profile gas block, A2 flash hider, collapsible stock.',
        variant: '5.56x45',
      },
      frontSight: {
        description:
          'Modular AR-15 with a front sight base: flat-top or carry-handle upper, drop-in handguard, A2 flash hider, collapsible or A2 stock.',
        variant: '5.56x45',
      },
    },
  },
];

const PART_FAMILIES: readonly ((frame: ArFrame) => PartFamily)[] = [
  arLower,
  arUpper,
  arBarrel,
  arGasBlock,
  arFrontSightBase,
  arHandguard,
  arDropInHandguard,
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

export const AR_MODULAR_TEMPLATES: readonly Template[] = FRAMES.flatMap(({ frame, guns }) =>
  arModularTemplates(frame, guns),
);

export const AR_MODULAR_RULES: readonly Rule[] = FRAMES.flatMap(({ frame }) => arModularRules(frame));
