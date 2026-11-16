// The severed parts the mob export bakes: per cut point of each mob type that models/mobs.json's `severed` names, one
// model for each set of cut points below it a cut there may find already gone, cut from the first row of that type in
// its pack. Parts follow the type rather than the row, so a type's variants share one set of items;
// tools/severedPartBake.mjs bakes them with that row.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { readMobRows } from './layout.mjs';
import { remnantCuts, severableParts } from './packages/mobgen/src/mob/dismember.ts';

const repo = resolve(import.meta.dirname, '..');

// The file of a severed parts pack that holds every cut point's parts by mob type and bone, each with the cut points
// below already gone and its model sidecar, so a game finds the part each cut leaves with one lookup.
export const SEVERED_INDEX = 'severed/index.json';

const slug = (bone) => bone.replace(/([a-z0-9])([A-Z])/g, '$1_$2').replace(/\./g, '_').toLowerCase();

/**
 * Each named mob type's plan: its source row, its pack and that pack's index, the catalogue material each mobgen
 * material is drawn as, and per part the cut point it is cut at, the cut points below it already gone, its id, title,
 * GLB and taxonomy. `bonesOf(row)` gives the bones the row's body builds; `catalogue` is the set of catalogue material
 * ids.
 */
export function severedPartPlan(severed, rows, bonesOf, catalogue) {
  if (severed === undefined) return [];
  const { pack, taxonomy, mobs, cuts, without: missing, materials } = severed;
  for (const [name, id] of Object.entries(materials)) {
    if (!catalogue.has(id)) throw new Error(`models/mobs.json severed: materials draws ${name} as ${id}, which is no catalogue material`);
  }
  const titleOf = (titles, field, bone, mob) => {
    if (!Object.hasOwn(titles, bone)) throw new Error(`models/mobs.json severed: ${field} has no title for ${bone}, a cut point of ${mob}`);
    return titles[bone];
  };
  return Object.entries(mobs).flatMap(([sourcePack, types]) => Object.entries(types).map(([mob, mobTitle]) => {
    const source = rows.find((row) => row.pack === sourcePack && (row.type ?? row.id) === mob);
    if (source === undefined) throw new Error(`models/mobs.json severed: ${sourcePack} has no row of type ${mob}`);
    const bones = bonesOf(source);
    const points = severableParts(bones);
    if (points.length === 0) throw new Error(`models/mobs.json severed: ${mob} has no cut point`);
    return {
      mob,
      source,
      pack,
      materials,
      index: SEVERED_INDEX,
      parts: points.flatMap((bone) => remnantCuts(bones, bone).map((gone) => {
        const id = [`${mob}_${slug(bone)}`, ...gone.map((below) => `without_${slug(below)}`)].join('_');
        const title = [mobTitle, titleOf(cuts, 'cuts', bone, mob), ...gone.map((below) => titleOf(missing, 'without', below, mob))].join(' ');
        return { bone, without: gone, id, title, path: `assets/models/${id}.glb`, taxonomy };
      })),
    };
  }));
}

// The plans of the repository's sheet, over the bones each source row builds.
export async function readSeveredParts(root = repo) {
  const { templateFor } = await import('./mobTemplates.mjs');
  const { build, generate } = await import('./packages/mobgen/src/core/generate.ts');
  const { severed } = JSON.parse(readFileSync(join(root, 'models/mobs.json'), 'utf8'));
  const catalogue = new Set(Object.keys(JSON.parse(readFileSync(join(root, 'tools/packages/thing-core/src/materials.json'), 'utf8'))));
  return severedPartPlan(severed, readMobRows(root), (row) => build(generate(templateFor(row), row.seed)).bones, catalogue);
}
