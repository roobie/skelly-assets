import type { PortDef } from '@skelly/construct/assembly/schema.ts';
import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import { NEG_X, X, Y } from '../antiMateriel/common.ts';
import { SKS_PROPORTIONS as P } from '../sksProportions.ts';

/** A part's joint to the part it hangs from: that part's slot, the joint's mount and the point both ports share. */
interface SksJoint {
  readonly on: 'receiver' | 'barrel';
  /** The port's id on the part it hangs from, where the slot's own name would trip a rule meant for other guns. */
  readonly site?: string;
  readonly mount: string;
  readonly pos: Vec3;
}

/**
 * Where each SKS part meets the part it hangs from. Every part is drawn in the gun frame and both ports of a joint
 * stand at the same point facing each other, so each part goes on where it was drawn.
 */
export const SKS_JOINTS = {
  barrel: { on: 'receiver', mount: 'barrel', pos: [P.barrel.breechX, 0, 0] },
  'bolt-carrier': { on: 'receiver', mount: 'bolt-carrier', pos: [P.carrier.x[1], 0, 0] },
  // The trigger group carries the magazine, so it is not a lower that takes one through a well.
  lower: {
    on: 'receiver',
    site: 'trigger-group',
    mount: 'lower',
    pos: [P.receiver.triggerGroupX, P.receiver.y[0], 0],
  },
  stock: { on: 'receiver', mount: 'stock', pos: [P.receiver.x[0], 0, 0] },
  'rear-sight': { on: 'receiver', mount: 'sight-block', pos: [P.receiver.rearSightX, P.receiver.y[1], 0] },
  // The cover rides on the gas tube rather than fitting a handguard socket on the receiver.
  handguard: { on: 'receiver', site: 'gas-tube', mount: 'handguard', pos: [0, P.handguard.gasTube.centreY, 0] },
  'front-sight': {
    on: 'barrel',
    mount: 'sight-block',
    pos: [(P.frontSight.post.x[0] + P.frontSight.post.x[1]) / 2, P.barrel.sightBase.y[1], 0],
  },
  bayonet: {
    on: 'barrel',
    mount: 'lug',
    pos: [(P.barrel.lug.x[0] + P.barrel.lug.x[1]) / 2, P.barrel.lug.y[0], 0],
  },
} as const satisfies Readonly<Record<string, SksJoint>>;

export type SksSlot = keyof typeof SKS_JOINTS;

const joints = Object.entries(SKS_JOINTS) as [SksSlot, SksJoint][];

/** The port a joint's site carries on the part it hangs from. */
const sitePortId =(slot: SksSlot): string => (SKS_JOINTS[slot] as SksJoint).site ?? slot;

/** The ports a part offers the parts that hang from it. */
export const sitePorts = (on: SksJoint['on']): PortDef[] =>
  joints
    .filter(([, joint]) => joint.on === on)
    .map(([slot, { mount, pos }]) => ({
      id: sitePortId(slot),
      mount,
      gender: 'female',
      pos,
      normal: X,
      up: Y,
      required: true,
    }));

/** The port a part hangs by. */
export const mountPort = (slot: SksSlot): PortDef => {
  const { mount, pos } = SKS_JOINTS[slot];
  return { id: 'mount', mount, gender: 'male', pos, normal: NEG_X, up: Y, required: true };
};

/** The template's connections: every joint, from its site to the part's mount. */
export const jointConnections = (): { readonly from: string; readonly to: string }[] =>
  joints.map(([slot, { on }]) => ({ from: `${on}.${sitePortId(slot)}`, to: `${slot}.mount` }));
