import type { ConnectionTemplate, SlotTemplate, Template } from '@skelly/construct/assembly/template.ts';
import { barrelGas } from './barrel.ts';
import { type ArFrame, familyName } from './frame.ts';

/** What one of a frame's templates says of the gun it builds. */
interface ArModularGun {
  readonly description: string;
  readonly variant: string;
}

/** What a frame's two templates say of their guns: the free-float carbine and the front sight base guns. */
export interface ArModularGuns {
  readonly freeFloat: ArModularGun;
  readonly frontSight: ArModularGun;
}

/** The rail slot a rear sight stands on, at the rear of the upper's rail where the eye is. */
const REAR_SIGHT_RAIL_SLOT = 1;

/**
 * A frame's two modular ARs on its lower, every length a named choice of the frame table. They share the receiver, the
 * stock, the grip and the magazine, and differ ahead of the upper: the free-float carbine clamps a low-profile gas block
 * under a railed handguard, while the front sight gun clamps a front sight base that holds a drop-in handguard's front.
 */
export const arModularTemplates = (frame: ArFrame, guns: ArModularGuns): Template[] => {
  const slot = (role: string, params?: SlotTemplate['params']): SlotTemplate => ({
    id: role,
    family: familyName(frame, role),
    ...(params ? { params } : {}),
  });
  const keys = (choices: Readonly<Record<string, unknown>>): string[] => Object.keys(choices);
  const { barrel, receiverExtension } = frame.table;
  const sharedConnections: ConnectionTemplate[] = [
    { from: 'lower.ar-upper', to: 'upper.ar-upper' },
    { from: 'lower.receiver-extension', to: 'receiver-extension.lower' },
    { from: 'receiver-extension.stock', to: 'stock.front' },
    { from: 'lower.grip', to: 'grip.top' },
    { from: 'lower.magazine', to: 'magazine.top' },
    { from: 'upper.barrel', to: 'barrel.rear' },
    { from: 'upper.barrel-nut', to: 'handguard.barrel-nut' },
  ];
  const freeFloat: Template = {
    name: `${frame.name}-modular`,
    ...guns.freeFloat,
    root: 'lower',
    slots: [
      slot('lower'),
      slot('upper', { top: 'flat-top' }),
      slot('barrel', { length: keys(barrel.lengths) }),
      slot('gas-block'),
      slot('handguard', { length: keys(frame.table.handguard.lengths) }),
      slot('flash-hider'),
      slot('receiver-extension', { buffer: 'carbine' }),
      slot('stock', { style: 'collapsible' }),
      slot('grip'),
      { id: 'magazine', family: 'magazine', params: { length: 'L', profile: 'stanag-curved' } },
    ],
    connections: [
      ...sharedConnections,
      { from: 'barrel.gas-block', to: 'gas-block.barrel' },
      { from: 'barrel.muzzle', to: 'flash-hider.base' },
    ],
  };
  // The A2 rifle's choices follow from its carry-handle upper and rifle extension; the gas system follows the barrel.
  const isCarryHandle = { part: 'upper', param: 'top', equals: 'carry-handle' };
  const isFlatTop = { part: 'upper', param: 'top', equals: 'flat-top' };
  const isA2 = { part: 'stock', param: 'style', equals: 'a2' };
  // A construct condition tests a param against one value, so the drop-in can follow the barrel's gas system only
  // while one barrel length has rifle gas.
  const rifleLengths = keys(barrel.lengths).filter((length) => barrelGas(frame, length) === 'rifle');
  if (rifleLengths.length !== 1) {
    throw new Error(
      `${frame.name}: a template condition tests one value, so the front sight template needs exactly one rifle-gas barrel`,
    );
  }
  const isRifleGas = { part: 'barrel', param: 'length', equals: rifleLengths[0]! };
  const frontSight: Template = {
    name: `${frame.name}-modular-front-sight`,
    ...guns.frontSight,
    root: 'lower',
    slots: [
      slot('lower'),
      slot('upper', { top: ['flat-top', 'carry-handle'] }),
      slot('barrel', { length: keys(barrel.lengths) }),
      slot('front-sight-base', {
        height: { when: isCarryHandle, onMatch: 'carry-handle', onMismatch: 'flat-top' },
      }),
      {
        id: 'handguard',
        family: familyName(frame, 'handguard-drop-in'),
        params: { gas: { when: isRifleGas, onMatch: 'rifle', onMismatch: 'mid' } },
      },
      slot('flash-hider'),
      slot('receiver-extension', { buffer: keys(receiverExtension.buffers) }),
      slot('stock', {
        style: {
          when: { part: 'receiver-extension', param: 'buffer', equals: 'rifle' },
          onMatch: 'a2',
          onMismatch: 'collapsible',
        },
      }),
      slot('grip'),
      {
        id: 'magazine',
        family: 'magazine',
        params: {
          length: { when: isA2, onMatch: 'M', onMismatch: 'L' },
          profile: { when: isA2, onMatch: 'stanag-straight', onMismatch: 'stanag-curved' },
        },
      },
      { id: 'rear-sight', family: familyName(frame, 'rear-sight'), when: isFlatTop },
    ],
    connections: [
      ...sharedConnections,
      { from: 'barrel.gas-block', to: 'front-sight-base.barrel' },
      { from: 'front-sight-base.handguard-cap', to: 'handguard.handguard-cap' },
      { from: 'barrel.muzzle', to: 'flash-hider.base' },
      { from: 'upper.rail', slot: REAR_SIGHT_RAIL_SLOT, to: 'rear-sight.base', when: isFlatTop },
    ],
  };
  return [freeFloat, frontSight];
};
