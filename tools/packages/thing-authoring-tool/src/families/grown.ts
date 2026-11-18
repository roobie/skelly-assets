import type { Solid } from '@skelly/construct/shapes/solid.ts';
import { integer, minValue, number, parse, pipe, strictObject, string, transform } from 'valibot';
import { growSkeleton } from '../growth/grow.ts';
import { grownSolids } from '../growth/solids.ts';
import { SpeciesSchema } from '../growth/species.ts';

const Params = strictObject({
  species: pipe(string(), transform(JSON.parse), SpeciesSchema),
  seed: pipe(string(), transform(Number), number(), integer(), minValue(0)),
});

// The catalogue builds every part once to check it and again to export it; growing is the slow part, so a row's
// solids are kept by its params.
const grownByParams = new Map<string, Solid[]>();

/** A tree or shrub grown from a species and a seed (../growth), drawn in a `bark` and a `leaf` slot. */
export const grown = (params: Readonly<Record<string, string>>): Solid[] => {
  const key = `${params.seed}:${params.species}`;
  const known = grownByParams.get(key);
  if (known) return known;
  const { species, seed } = parse(Params, params);
  const solids = grownSolids(growSkeleton(species, seed), species);
  grownByParams.set(key, solids);
  return solids;
};
