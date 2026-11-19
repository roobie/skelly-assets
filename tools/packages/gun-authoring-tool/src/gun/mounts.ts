import type { PortDef } from '@skelly/construct/assembly/schema.ts';
import { mmToU } from './units.ts';

/** Generic attachment faces. Future accessories use these interfaces, not optic-specific ports. */
export const MOUNT_KINDS = ['rail-top', 'rail-side', 'rail-bottom', 'muzzle'] as const;
export type MountKind = (typeof MOUNT_KINDS)[number];

export interface MountStandard {
  readonly family: 'slotted-rail' | 'thread';
  /** Contact width available to an attachment, in gungen units. */
  readonly contactWidthU: number;
  /** Slot spacing for rail interfaces; omitted for continuous thread interfaces. */
  readonly slotPitchU?: number;
}

/** The real Picatinny (MIL-STD-1913) slot pitch, the one every rail and optic mount shares. */
const RAIL_SLOT_PITCH_MM = 10.01;
export const RAIL_SLOT_PITCH_U = mmToU(RAIL_SLOT_PITCH_MM);

/**
 * The slots of a rail whose slotted run is at least `spanU` long: a slot at each end and one every pitch between. The
 * run rounds up, so a rail never gets shorter than the contact length of the optic it was sized for. A rail bounded
 * by its host (a handguard's, with an end margin) may thus overshoot that margin by up to one pitch, by design.
 */
export const railSlots = (spanU: number): NonNullable<PortDef['slots']> => ({
  count: Math.ceil(spanU / RAIL_SLOT_PITCH_U - 1e-9) + 1,
  pitch: RAIL_SLOT_PITCH_U,
});

/** Mount specifications are data so future parts can declare compatible interfaces. */
export const MOUNT_STANDARDS: Readonly<Record<MountKind, MountStandard>> = {
  'rail-top': { family: 'slotted-rail', contactWidthU: 1.75, slotPitchU: RAIL_SLOT_PITCH_U },
  'rail-side': { family: 'slotted-rail', contactWidthU: 1.75, slotPitchU: RAIL_SLOT_PITCH_U },
  'rail-bottom': { family: 'slotted-rail', contactWidthU: 1.75, slotPitchU: RAIL_SLOT_PITCH_U },
  muzzle: { family: 'thread', contactWidthU: 0 },
};

export interface MountRequirement {
  readonly kind: MountKind;
  readonly contactLengthU: number;
  readonly contactWidthU: number;
  readonly ringSpanU?: number;
  /** Conservative keep-clear distances around the interface, in U. */
  readonly clearanceU: { readonly forward: number; readonly rearward: number; readonly lateral: number };
}

const railSpanU = (port: PortDef): number =>
  port.slots && port.slots.count > 1 ? (port.slots.count - 1) * port.slots.pitch : 0;

export const mountCanAccept = (port: PortDef, requirement: MountRequirement, slot = 0): boolean => {
  if (port.mount !== requirement.kind) {
    return false;
  }
  const standard = MOUNT_STANDARDS[requirement.kind];
  return (
    standard.family !== 'slotted-rail' ||
    (port.slots !== undefined &&
      (standard.slotPitchU === undefined || Math.abs(port.slots.pitch - standard.slotPitchU) <= 1e-9) &&
      railSpanU(port) + 1e-9 >= requirement.contactLengthU &&
      (requirement.ringSpanU === undefined || railSpanU(port) + 1e-9 >= requirement.ringSpanU) &&
      requirement.contactWidthU <= standard.contactWidthU + 1e-9 &&
      slot * port.slots.pitch + 1e-9 >= Math.max(requirement.contactLengthU, requirement.ringSpanU ?? 0) / 2 &&
      railSpanU(port) - slot * port.slots.pitch + 1e-9 >=
        Math.max(requirement.contactLengthU, requirement.ringSpanU ?? 0) / 2)
  );
};
