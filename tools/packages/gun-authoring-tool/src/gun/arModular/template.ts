import type { Template } from '@skelly/construct/assembly/template.ts';
import { type ArFrame, familyName } from './frame.ts';

/** What a frame's template says of the gun it builds. */
export interface ArModularGun {
  readonly description: string;
  readonly variant: string;
}

/** A frame's modular AR: a free-float carbine on its lower, every length a named choice of the frame table. */
export const arModularTemplate = (frame: ArFrame, gun: ArModularGun): Template => {
  const slot = (role: string, params?: Template['slots'][number]['params']) => ({
    id: role,
    family: familyName(frame, role),
    ...(params ? { params } : {}),
  });
  return {
    name: `${frame.name}-modular`,
    ...gun,
    root: 'lower',
    slots: [
      slot('lower'),
      slot('upper'),
      slot('barrel', { length: Object.keys(frame.table.barrel.lengths) }),
      slot('gas-block'),
      slot('handguard', { length: Object.keys(frame.table.handguard.lengths) }),
      slot('flash-hider'),
      slot('receiver-extension'),
      slot('stock'),
      slot('grip'),
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
};
