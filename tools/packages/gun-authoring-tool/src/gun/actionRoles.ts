import type { PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';

/** The tag of each hand-driven part of an action, by the key the part takes in `ResolvedGunAction.parts`. */
export const ACTION_PART_ROLES = {
  handle: 'charging-handle',
  forend: 'pump-forend',
  arm: 'bolt-handle-arm',
  knob: 'bolt-handle-knob',
} as const;

/** The tag of each kind of action carrier; the carrier's tag is how the action description finds it and its kind. */
export const ACTION_CARRIER_ROLES = {
  ar: 'ar-carrier',
  ak: 'ak-carrier',
  smg: 'smg-carrier',
  pump: 'pump-carrier',
  bolt: 'turn-bolt-carrier',
  slide: 'slide-carrier',
} as const;

export type ActionRoleKey = keyof typeof ACTION_PART_ROLES;
export type ActionKind = keyof typeof ACTION_CARRIER_ROLES;

/** Every action role tag a part may claim, at most once per gun. */
export const ACTION_ROLE_TAGS: readonly string[] = [
  ...Object.values(ACTION_PART_ROLES),
  ...Object.values(ACTION_CARRIER_ROLES),
];

const lookup = <Key extends string>(roles: Readonly<Record<Key, string>>, tags: readonly string[] | undefined) =>
  (Object.keys(roles) as Key[]).find((key) => tags?.includes(roles[key]));

/** The part key a part's tags give it, if it declares a hand-driven action role. */
export const actionRoleKeyOf = (def: PartDef): ActionRoleKey | undefined => lookup(ACTION_PART_ROLES, def.tags);

/** The action kind a part's tags give it, if it declares itself an action carrier. */
export const actionKindOf = (def: PartDef): ActionKind | undefined => lookup(ACTION_CARRIER_ROLES, def.tags);

/**
 * What a gun part family declares of itself beyond its parts. Each is the family's own content, so a family in any
 * module supplies it without the code that reads it knowing the family.
 */
export interface GunPartFamily extends PartFamily {
  /**
   * Rounds per minute for the resolved params, or undefined to keep the action's default. A family that declares an
   * action carrier reports how fast it cycles.
   */
  readonly cyclicRpm?: (params: Readonly<Record<string, string>>) => number | undefined;
  /**
   * The family builds from millimetre tables kept exact rather than rounded to the grid, so its positions and sizes
   * fall off the grid by design; the min-feature rule, not the grid, bounds how fine it goes.
   */
  readonly millimetreAuthored?: true;
}
