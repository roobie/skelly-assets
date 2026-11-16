import { readSoundPacks } from '../../../layout.mjs';
import { type ImpactRow, parseImpactRows } from './schema.ts';

/** The shipped impact rows, validated, by pack and id; their sources are `models/sounds/<pack>.jsonnet`. */
export const impactPacks: Record<string, Record<string, ImpactRow>> = Object.fromEntries(
  Object.entries(readSoundPacks()).map(([pack, rows]) => [pack, parseImpactRows(rows)]),
);
