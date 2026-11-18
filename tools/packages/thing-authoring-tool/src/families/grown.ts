import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { integer, minValue, number, optional, parse, pipe, strictObject, string, transform } from 'valibot';
import { growSkeleton, type Skeleton } from '../growth/grow.ts';
import { grownSolids } from '../growth/solids.ts';
import { positiveShare, SpeciesSchema } from '../growth/species.ts';
import { thinned } from '../growth/thin.ts';

const numeric = pipe(string(), transform(Number), number());

// A family is given its params alone, so a row passes its voxel grain again here: the clumps keep a least thickness in
// voxels. `density` overrides the species' own, so a set can draw a species sparser than its habit.
const Params = strictObject({
  species: pipe(string(), transform(JSON.parse), SpeciesSchema),
  seed: pipe(numeric, integer(), minValue(0)),
  grain: pipe(numeric, minValue(Number.MIN_VALUE)),
  density: optional(pipe(numeric, positiveShare)),
});

// The catalogue builds every part once to check it and again to export it, and a sparse row shares its thick twin's
// skeleton; growing is the slow part, so skeletons are kept by species and seed, and solids by all the params.
const skeletons = new Map<string, Skeleton>();
const solidsByParams = new Map<string, Solid[]>();

/** A tree or shrub grown from a species and a seed (../growth), drawn in a `bark` and a `leaf` slot. */
export const grown = (params: Readonly<Record<string, string>>): Solid[] => {
  const key = JSON.stringify(params);
  const known = solidsByParams.get(key);
  if (known) return known;
  const { species, seed, grain, density = species.density } = parse(Params, params);
  const grownKey = `${seed}:${params.species}`;
  const skeleton = skeletons.get(grownKey) ?? growSkeleton(species, seed);
  skeletons.set(grownKey, skeleton);
  const solids = grownSolids(skeleton, species, { grain, cut: thinned(skeleton, density, seed) });
  solidsByParams.set(key, solids);
  return solids;
};
