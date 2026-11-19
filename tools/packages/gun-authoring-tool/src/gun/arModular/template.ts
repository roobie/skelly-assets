import type { Template } from '@skelly/construct/assembly/template.ts';
import { AR15 } from './frame.ts';

/** The modular AR-15: a free-float carbine on the shared lower, every length a named choice of the frame table. */
export const arModular: Template = {
  name: 'ar-modular',
  description:
    'Modular AR-15 carbine: flat-top upper, free-float railed handguard, low-profile gas block, A2 flash hider, collapsible stock.',
  variant: '5.56x45',
  root: 'lower',
  slots: [
    { id: 'lower', family: 'ar15-lower' },
    { id: 'upper', family: 'ar15-upper' },
    { id: 'barrel', family: 'ar15-barrel', params: { length: Object.keys(AR15.barrel.lengths) } },
    { id: 'gas-block', family: 'ar15-gas-block' },
    { id: 'handguard', family: 'ar15-handguard', params: { length: Object.keys(AR15.handguard.lengths) } },
    { id: 'flash-hider', family: 'ar15-flash-hider' },
    { id: 'receiver-extension', family: 'ar15-receiver-extension' },
    { id: 'stock', family: 'ar15-stock' },
    { id: 'grip', family: 'ar15-grip' },
    { id: 'magazine', family: 'magazine', params: { length: 'L', profile: 'stanag-curved' } },
  ],
  connections: [
    { from: 'lower.ar-upper', to: 'upper.ar-upper' },
    { from: 'lower.receiver-extension', to: 'receiver-extension.lower' },
    { from: 'receiver-extension.stock', to: 'stock.front' },
    { from: 'lower.grip', to: 'grip.top' },
    { from: 'lower.magazine', to: 'magazine.top' },
    { from: 'upper.barrel', to: 'barrel.rear' },
    { from: 'upper.barrel-nut', to: 'handguard.barrel-nut' },
    { from: 'barrel.gas-block', to: 'gas-block.barrel' },
    { from: 'barrel.muzzle', to: 'flash-hider.base' },
  ],
};
