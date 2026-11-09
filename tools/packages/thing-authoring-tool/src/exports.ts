import { MATERIALS } from '@skelly/thing-core/materials';
import type { VoxelGrains } from '@skelly/thing-export/exportTypes.ts';
import { exportGlb } from '@skelly/thing-export/glb.ts';
import { assemblyProperties, modelParts } from '@skelly/thing-export/physical.ts';
import { displayName, loadRecipe, type RecipeRow, recipeAsset, recipeOptions, recipeVoxel } from '@skelly/thing-export/recipe.ts';
import { literal, optional, parse, picklist, strictObject } from 'valibot';
import { buildItem, type Catalogue, type CatalogueSettings, itemPalette, type ToolItem } from './catalogue.ts';
import { authoredSkin } from './skin.ts';

export const exportItem = (
  item: ToolItem,
  settings: CatalogueSettings,
  asset: ReturnType<typeof recipeAsset>,
  voxel: VoxelGrains,
  { collision = false }: { readonly collision?: boolean } = {},
) => {
  const { report, masses, handling, label, drawn, glow } = buildItem(item, settings, voxel);
  const out = exportGlb({
    resolved: report.resolved,
    ...(item.skin ? { skin: authoredSkin(item.skin) } : {}),
    asset,
    palette: itemPalette(settings),
    revolveFacets: settings.facets,
    ...voxel,
    generator: '@skelly/thing-authoring-tool',
    metadataNamespace: 'thing',
  });
  if (!out.ok) {
    throw new Error(JSON.stringify(out.error));
  }
  const parts = modelParts(
    report.resolved,
    (id, part) => {
      const massKg = masses[id];
      if (massKg === undefined) {
        throw new Error(`Missing authored mass for ${id}`);
      }
      return { part, massKg };
    },
    { collision, drawn },
  );
  if (collision && item.exportMass !== 'parts') {
    throw new Error(`${item.id}: baked collision travels with exported parts`);
  }
  return {
    glb: out.glb,
    partNodes: out.partNodes,
    modelEntry: {
      ...asset,
      ...(item.exportMass === 'parts' ? { parts } : {}),
      ...handling,
      ...(glow ? { emissiveMaterial: glow } : {}),
      ...(label ? { label: { ...label, text: item.label?.text ?? displayName(asset.id) } } : {}),
    },
    physical: assemblyProperties(parts),
  };
};
const itemOptions = strictObject({
  mass: picklist(['parts', 'inventory-atom']),
  collision: optional(literal(true)),
});
/**
 * An item row's export against a catalogue, and its inputs: what the export reads besides code and the row, namely its
 * item, the catalogue settings and the materials it may name. A material counts when its id occurs anywhere in the
 * item's text, even inside a string parameter, since naming one too many only widens the key.
 */
const itemKind = ({ items, ...settings }: Catalogue) => {
  const byId = new Map(items.map((item) => [item.id, item]));
  const itemOf = (row: RecipeRow) => {
    const item = byId.get(row.source);
    if (!item) {
      throw new Error(`Unknown tool item ${row.source}`);
    }
    return item;
  };
  return {
    exporter: (row: RecipeRow) => {
      const options = parse(itemOptions, recipeOptions(row));
      const item = itemOf(row);
      if (options.mass !== item.exportMass) {
        throw new Error(`Recipe mass ownership differs from tool item ${row.source}`);
      }
      return () => exportItem(item, settings, recipeAsset(row), recipeVoxel(row), { collision: options.collision === true });
    },
    inputs: (row: RecipeRow) => {
      const item = itemOf(row);
      const text = JSON.stringify(item);
      const named = Object.keys(MATERIALS).filter((id) => id === settings.defaultMaterial || text.includes(id));
      return { item, settings, materials: named.sort().map((id) => [id, MATERIALS[id]]) };
    },
  };
};
const kinds = { item: itemKind };
// The recipe row kinds this tool owns; a driver hands it only rows of these kinds.
export const THING_KINDS: readonly string[] = Object.freeze(Object.keys(kinds));
export const loadThingRecipe = (value: unknown, catalogue: Catalogue) => {
  const loaded = Object.entries(kinds).map(([kind, of]) => [kind, of(catalogue)] as const);
  return loadRecipe(
    value,
    Object.fromEntries(loaded.map(([kind, { exporter }]) => [kind, exporter])),
    Object.fromEntries(loaded.map(([kind, { inputs }]) => [kind, inputs])),
  );
};
/**
 * Each row with the one-item catalogue its export reads, once every row has loaded against the whole catalogue: a
 * build worker exports a row from its slice, since loading the whole catalogue costs each worker more than most
 * exports do. The slice gives the row the same inputs, so its cache key is the same.
 */
export const thingTasks = (rows: readonly RecipeRow[], catalogue: Catalogue) => {
  loadThingRecipe(rows, catalogue);
  const { items, ...settings } = catalogue;
  const byId = new Map(items.map((item) => [item.id, item]));
  return rows.map((row) => ({ row, catalogue: { ...settings, items: [byId.get(row.source)!] } }));
};
