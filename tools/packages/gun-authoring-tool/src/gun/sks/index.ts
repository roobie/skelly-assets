// The SKS: its own receiver, action and furniture, traced from one side photo into ../sksProportions.ts. parts.ts,
// templates.ts and anchorData.ts each register this folder with one line, so the rest of the work stays here. It
// borrows only small shared builders; the sporter and AK receivers are other guns' and are not bent toward it.

import type { Template } from '@skelly/construct/assembly/template.ts';
import type { GunPartFamily } from '../actionRoles.ts';
import { sksBoltCarrier, sksReceiver } from './action.ts';
import { sksBarrel, sksHandguard } from './barrel.ts';
import { sksLower } from './lower.ts';
import { sksFrontSight, sksRearSight } from './sights.ts';
import { sksStock } from './stock.ts';
import { SKS_TEMPLATE } from './template.ts';

export { SKS_ANCHORS } from './anchors.ts';

export const SKS_FAMILIES: Readonly<Record<string, GunPartFamily>> = Object.fromEntries(
  [
    sksReceiver,
    sksBoltCarrier,
    sksBarrel,
    sksHandguard,
    sksLower,
    sksFrontSight,
    sksRearSight,
    sksStock,
  ].map((family) => [family.name, family]),
);

export const SKS_TEMPLATES: readonly Template[] = [SKS_TEMPLATE];
