// Gun-owned discovery and coupling. Consumers choose a presentation mode, not instance names.

import type { PartDef, Resolved } from '@skelly/construct/assembly/schema.ts';
import {
  applyDir,
  applyPoint,
  invert,
  length,
  scale,
  type Transform,
  type Vec3,
} from '@skelly/construct/foundation/math.ts';
import type { Motion } from '@skelly/motion/motion';
import { partNodeName } from '@skelly/thing-export/glb.ts';
import { hingeOf, slideOf } from './actionMotion.ts';
import {
  type ActionRoleKey,
  actionRoleKeyOf,
  type DescribedActionKind,
  describedActionKindOf,
  type GunPartFamily,
} from './actionRoles.ts';
import { boltCycleMotion, type CycleMode, type CycleMotion, cycleMotion, pumpCycleMotion } from './cycle.ts';
import { localEjectionPoint } from './ejection.ts';
import { smgChargingHandleFor } from './tracedSmgSections.ts';

interface ActionPart {
  readonly id: string;
  readonly node: string;
  readonly def: Omit<PartDef, 'motion'>;
  readonly motion: Motion;
  readonly placed: Transform;
  readonly axis: Vec3;
  readonly travel: Vec3;
  /** References the shared action timelines; absent modes keep this node at home. */
  readonly modes: readonly CycleMode[];
}

export interface ResolvedGunAction {
  readonly kind: DescribedActionKind;
  readonly carrier: ActionPart;
  readonly parts: { readonly carrier: ActionPart } & Readonly<Partial<Record<ActionRoleKey, ActionPart>>>;
  readonly receiverId: string;
  readonly ejection?: Vec3;
  /** Self-loading actions additionally have a fire timeline. */
  readonly cycle: CycleMotion;
}

const actionPart = (resolved: Resolved, id: string, modes: readonly CycleMode[]): ActionPart | undefined => {
  const def = resolved.defs.get(id);
  const motion = resolved.motions.get(id);
  const placed = resolved.placed.get(id);
  const family = resolved.assembly.parts[id]?.family;
  if (!(def && motion && placed && family)) {
    return undefined;
  }
  const { direction, travel } = slideOf(motion);
  return {
    id,
    node: partNodeName(id, family),
    def,
    motion,
    placed,
    axis: applyDir(placed, direction),
    travel: applyDir(placed, scale(direction, travel)),
    modes,
  };
};

const carrierReceiver = (resolved: Resolved, id: string): string | undefined => {
  const connection = resolved.connections.find(
    ({ from, to }) => (from.part === id && from.port.id === 'mount') || (to.part === id && to.port.id === 'mount'),
  );
  return connection && (connection.from.part === id ? connection.to.part : connection.from.part);
};

/**
 * The carrier and every part that declares an action role. Such a part moves by hand only, never with a shot: the
 * forward handle of an automatic action is non-reciprocating.
 */
const coupledParts = (resolved: Resolved, carrier: ActionPart): ResolvedGunAction['parts'] => {
  const movers: Partial<Record<ActionRoleKey, ActionPart>> = {};
  for (const [id, def] of resolved.defs) {
    const key = actionRoleKeyOf(def);
    const mover = key === undefined || key in movers ? undefined : actionPart(resolved, id, ['hand']);
    if (key !== undefined && mover) {
      movers[key] = mover;
    }
  }
  return { carrier, ...movers };
};

/** The carrier family's own rate for the params it was built with; absent keeps the action's default. */
const carrierCyclicRpm = (resolved: Resolved, id: string): number | undefined => {
  const family: GunPartFamily | undefined = resolved.domain.families[resolved.assembly.parts[id]?.family ?? ''];
  const params = Object.fromEntries(
    Object.entries(resolved.params.get(id) ?? {}).map(([name, { value }]) => [name, value]),
  );
  return family?.cyclicRpm?.(params);
};

export const resolveGunAction = (resolved: Resolved): ResolvedGunAction | undefined => {
  const entry = [...resolved.defs].find(([, def]) => describedActionKindOf(def) !== undefined);
  const kind = entry && describedActionKindOf(entry[1]);
  if (!(entry && kind)) {
    return undefined;
  }
  const [id] = entry;
  const carrier = actionPart(resolved, id, ['pump', 'bolt'].includes(kind) ? ['hand'] : ['fire', 'hand']);
  const receiverId = kind === 'slide' ? id : carrierReceiver(resolved, id);
  const receiver = receiverId && resolved.defs.get(receiverId);
  const placed = receiverId && resolved.placed.get(receiverId);
  if (!(carrier && receiverId && receiver && placed)) {
    return undefined;
  }
  const local = localEjectionPoint(receiver);
  const port = receiver.keepOuts.find(({ id: volumeId }) => volumeId === 'ejection');
  const carrierHome = applyPoint(invert(placed), carrier.placed.t);
  const boltEjectAt = port ? (carrierHome[0] - (port.box.center[0] - port.box.half[0])) / length(carrier.travel) : 0;
  const parts = coupledParts(resolved, carrier);
  // A turning hand-only handle on an automatic action is a notch hold, such as the SMG's.
  const handNotch = Object.values(parts).some(({ motion, modes }) => hingeOf(motion) && !modes.includes('fire'));
  const notchTurnSeconds = handNotch
    ? smgChargingHandleFor(resolved.params.get(receiverId)?.section?.value).notchTurnSeconds
    : undefined;
  let cycle: CycleMotion;
  if (kind === 'bolt') {
    cycle = boltCycleMotion(carrier.motion, resolved.domain.units.metresPerUnit, boltEjectAt);
  } else if (kind === 'pump') {
    cycle = pumpCycleMotion(carrier.motion, resolved.domain.units.metresPerUnit);
  } else {
    cycle = cycleMotion(kind, carrier.motion, resolved.domain.units.metresPerUnit, {
      rpm: carrierCyclicRpm(resolved, id),
      notchTurnSeconds,
    });
  }
  return {
    kind,
    carrier,
    parts,
    receiverId,
    ...(local ? { ejection: applyPoint(placed, local) } : {}),
    cycle,
  };
};

export const actionOpenOffsets = (action: ResolvedGunAction | undefined): ReadonlyMap<string, Vec3> =>
  new Map(action?.kind === 'pump' ? Object.values(action.parts).map((part) => [part.id, part.travel]) : []);
