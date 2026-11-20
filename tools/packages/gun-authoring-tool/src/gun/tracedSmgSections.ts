import { COMPACT_SMG_PROPORTIONS } from './compactSmgProportions.ts';
import { POLYMER_SMG_PROPORTIONS } from './polymerSmgProportions.ts';
import type { TracedSmgProportions } from './tracedSmgProportions.ts';

/** The part sections whose shapes come from a traced submachine gun, by section name. */
export const TRACED_SMG_SECTIONS = {
  'compact-smg': COMPACT_SMG_PROPORTIONS,
  'polymer-smg': POLYMER_SMG_PROPORTIONS,
} as const satisfies Record<string, TracedSmgProportions>;

export type TracedSmgSection = keyof typeof TRACED_SMG_SECTIONS;

export const isTracedSmgSection = (section: unknown): section is TracedSmgSection =>
  typeof section === 'string' && Object.hasOwn(TRACED_SMG_SECTIONS, section);

/** The traced proportions behind a part section, or undefined for a section that is not a traced SMG. */
export const tracedSmgFor = (section: unknown): TracedSmgProportions | undefined =>
  isTracedSmgSection(section) ? TRACED_SMG_SECTIONS[section] : undefined;

/** The knob and notch turn of a section's SMG handle; an untraced section's tube borrows the compact SMG's. */
export const smgChargingHandleFor = (section: unknown): TracedSmgProportions['chargingHandle'] =>
  (tracedSmgFor(section) ?? TRACED_SMG_SECTIONS['compact-smg']).chargingHandle;
