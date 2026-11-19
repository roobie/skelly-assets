import type { Axis, PartDef } from '@skelly/construct/assembly/schema.ts';

/**
 * What a sight is to the shooter: the eye looks through a rear sight or an optic and lines it up on a front sight, so
 * the export aims from the first and the rules pair the two.
 */
export const SIGHT_ROLES = ['rear', 'front', 'optic'] as const;
export type SightRole = (typeof SIGHT_ROLES)[number];

/**
 * A sight axis as the gun domain authors it. Construct's axis leaves its role an open string, since what roles an axis
 * kind has is each domain's own; this domain's sights always carry one of its own.
 */
export type SightAxis = Axis & { readonly kind: 'sight'; readonly role: SightRole };

/** A part's sight axis in the given role. */
export const sightAxis = (role: SightRole, axis: Omit<Axis, 'kind' | 'role'>): SightAxis => ({
  kind: 'sight',
  role,
  ...axis,
});

/** The part's sight axis, if it has one. */
export const sightAxisOf = (def: PartDef): Axis | undefined => def.axes.find(({ kind }) => kind === 'sight');

const isSightRole = (role: string | undefined): role is SightRole => SIGHT_ROLES.some((known) => known === role);

/**
 * The role of the part's sight axis, if it has one. A sight with no role, or one this domain does not know, would drop
 * out of aiming and of every rule that pairs sights, so it is an error rather than a sight that quietly does nothing.
 */
export const sightRoleOf = (def: PartDef): SightRole | undefined => {
  const axis = sightAxisOf(def);
  if (axis === undefined) {
    return undefined;
  }
  if (!isSightRole(axis.role)) {
    throw new Error(`${def.family}: sight axis role '${axis.role}' is not one of ${SIGHT_ROLES.join(', ')}`);
  }
  return axis.role;
};
