import type { Axis, PartDef } from '@skelly/construct/assembly/schema.ts';

/**
 * What a sight is to the shooter: the eye looks through a rear sight or an optic and lines it up on a front sight, so
 * the export aims from the first and the rules pair the two.
 */
export type SightRole = 'rear' | 'front' | 'optic';

/** A part's sight axis in the given role. */
export const sightAxis = (role: SightRole, axis: Omit<Axis, 'kind' | 'role'>): Axis => ({
  kind: 'sight',
  role,
  ...axis,
});

/** The part's sight axis, if it has one. */
export const sightAxisOf = (def: PartDef): Axis | undefined => def.axes.find(({ kind }) => kind === 'sight');

/** The role of the part's sight axis, if it has one. */
export const sightRoleOf = (def: PartDef): SightRole | undefined => sightAxisOf(def)?.role as SightRole | undefined;
