import type { PortDef } from '@skelly/construct/assembly/schema.ts';
import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import { NEG_X, X, Y } from '../antiMateriel/common.ts';
import { SKS_PROPORTIONS as P } from '../sksProportions.ts';

/** A part's joint to the part it hangs from: that part's slot, the joint's mount and the point both ports share. */
interface SksJoint {
  readonly on: 'receiver' | 'barrel';
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
  lower: { on: 'receiver', mount: 'lower', pos: [P.receiver.triggerGroupX, P.receiver.y[0], 0] },
  stock: { on: 'receiver', mount: 'stock', pos: [P.receiver.x[0], 0, 0] },
  'rear-sight': { on: 'receiver', mount: 'sight-block', pos: [P.receiver.rearSightX, P.receiver.y[1], 0] },
  // The cover rides on the gas tube, at the receiver's front.
  handguard: { on: 'receiver', mount: 'handguard', pos: [0, P.handguard.gasTube.centreY, 0] },
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

/** The ports a part offers the parts that hang from it, each named after the slot it takes. */
export const sitePorts = (on: SksJoint['on']): PortDef[] =>
  joints
    .filter(([, joint]) => joint.on === on)
    .map(([slot, { mount, pos }]) => ({
      id: slot,
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
  joints.map(([slot, { on }]) => ({ from: `${on}.${slot}`, to: `${slot}.mount` }));
