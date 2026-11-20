import { COMPACT_SMG_PROPORTIONS, SMG_CHARGING_HANDLE } from './compactSmgProportions.ts';
import { POLYMER_SMG_PROPORTIONS } from './polymerSmgProportions.ts';
import type { TracedSmgProportions } from './tracedSmgProportions.ts';

/** The part sections whose shapes come from a traced submachine gun, by section name. */
export const TRACED_SMG_SECTIONS = {
  'compact-smg': COMPACT_SMG_PROPORTIONS,
  'polymer-smg': POLYMER_SMG_PROPORTIONS,
} as const satisfies Record<string, TracedSmgProportions>;

export type TracedSmgSection = keyof typeof TRACED_SMG_SECTIONS;

export const TRACED_SMG_SECTION_NAMES = Object.keys(TRACED_SMG_SECTIONS) as TracedSmgSection[];

/** One entry per traced section, built from its table, so a new table needs no entry of its own. */
export const byTracedSmgSection = <T>(build: (table: TracedSmgProportions) => T): Record<TracedSmgSection, T> =>
  Object.fromEntries(
    TRACED_SMG_SECTION_NAMES.map((section) => [section, build(TRACED_SMG_SECTIONS[section])]),
  ) as Record<TracedSmgSection, T>;

export const isTracedSmgSection = (section: unknown): section is TracedSmgSection =>
  typeof section === 'string' && Object.hasOwn(TRACED_SMG_SECTIONS, section);

/** The traced proportions behind a part section, or undefined for a section that is not a traced SMG. */
export const tracedSmgFor = (section: unknown): TracedSmgProportions | undefined =>
  isTracedSmgSection(section) ? TRACED_SMG_SECTIONS[section] : undefined;

/** The tube, knob and notch turn of a section's SMG handle; an untraced section takes the generic handle. */
export const smgChargingHandleFor = (section: unknown): TracedSmgProportions['chargingHandle'] =>
  tracedSmgFor(section)?.chargingHandle ?? SMG_CHARGING_HANDLE;
