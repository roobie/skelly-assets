import type { Surface, UniformField } from '@skelly/surfaces/schema';

// What a slider changes and what the author pastes back: the lab writes nothing into the repo, so a tune lives on the
// page until its snippet goes into models/finishes.jsonnet by hand.

/** A slider: a number of a look by its path, over the range the look's schema allows. */
export interface Slider {
  readonly path: readonly string[];
  readonly range: readonly [number, number];
  /** The slider's step, a thousandth of its range rounded down to a power of ten, so values print short. */
  readonly step: number;
}

/** A slider for every ranged number of a kind's schema, as `uniformFields` walks it, so no slider is listed by hand. */
export const slidersOf = (fields: readonly UniformField[]): Slider[] =>
  fields.flatMap(({ path, type, range }) =>
    type === 'float' && range !== undefined
      ? [{ path, range, step: 10 ** Math.floor(Math.log10((range[1] - range[0]) / 1000)) }]
      : [],
  );

/** A value rounded to a slider's step, so the snippet shows what the slider shows. */
export const onStep = (value: number, step: number) =>
  Number((Math.round(value / step) * step).toFixed(Math.max(0, -Math.log10(step))));

type Tree = { readonly [key: string]: unknown };
const isTree = (value: unknown): value is Tree => typeof value === 'object' && value !== null && !Array.isArray(value);

export const valueAt = (tree: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>((at, name) => (isTree(at) ? at[name] : undefined), tree);

/** `tree` with the value at `path` set, its other branches shared. */
export const withValue = <T>(tree: T, path: readonly string[], value: unknown): T => {
  const [head, ...rest] = path;
  if (head === undefined) return value as T;
  const branch: Tree = isTree(tree) ? tree : {};
  return { ...branch, [head]: withValue(branch[head], rest, value) } as T;
};

/** The leaves where `tuned` differs from `base`, nested as in both, or undefined where they agree. */
export const difference = (base: unknown, tuned: unknown): Tree | undefined => {
  if (!isTree(base) || !isTree(tuned)) return undefined;
  const entries = Object.entries(tuned).flatMap(([key, value]): [string, unknown][] => {
    if (isTree(value)) {
      const inner = difference(base[key], value);
      return inner === undefined ? (isTree(base[key]) ? [] : [[key, value]]) : [[key, inner]];
    }
    return JSON.stringify(value) === JSON.stringify(base[key]) ? [] : [[key, value]];
  });
  return entries.length === 0 ? undefined : Object.fromEntries(entries);
};

const leaves = (tree: Tree | undefined): number =>
  tree === undefined
    ? 0
    : Object.values(tree).reduce<number>((sum, value) => sum + (isTree(value) ? leaves(value) : 1), 0);

/**
 * The look `surface` is nearest, of its kind: the one it differs from in fewest numbers, the earliest on a tie. A
 * finish names its look in Jsonnet only, so the lab finds it from the values it wears.
 */
export const nearestLook = (surface: Surface, looks: Readonly<Record<string, Surface>>): string | undefined =>
  Object.entries(looks)
    .filter(([, look]) => look.kind === surface.kind)
    .map(([name, look]) => ({ name, apart: leaves(difference(look, surface)) }))
    .reduce<{ name: string; apart: number } | undefined>(
      (best, next) => (best === undefined || next.apart < best.apart ? next : best),
      undefined,
    )?.name;

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** An object's field name in Jsonnet: bare when it can be, quoted when not. */
export const jsonnetKey = (key: string) => (IDENTIFIER.test(key) ? key : jsonnet(key));

/** A value as a Jsonnet literal, on one line. */
export const jsonnet = (value: unknown): string => {
  if (typeof value === 'string') return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
  if (Array.isArray(value)) return `[${value.map(jsonnet).join(', ')}]`;
  if (isTree(value)) {
    const fields = Object.entries(value).map(([key, inner]) => `${jsonnetKey(key)}: ${jsonnet(inner)}`);
    return fields.length === 0 ? '{}' : `{ ${fields.join(', ')} }`;
  }
  return JSON.stringify(value);
};

/**
 * What a finish pastes to wear `tuned`, as models/surfaces.libsonnet's `wear` takes it: the look's name and the numbers
 * that differ from it.
 */
export const wearSnippet = (name: string, look: Surface, tuned: Surface) => {
  const tune = difference(look, tuned);
  return tune === undefined ? `wear(${jsonnet(name)})` : `wear(${jsonnet(name)}, ${jsonnet(tune)})`;
};
