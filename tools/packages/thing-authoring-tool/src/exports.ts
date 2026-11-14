import { MATERIALS } from '@skelly/thing-core/materials';
import type { VoxelGrains } from '@skelly/thing-export/exportTypes.ts';
import { exportGlb, paintMaterials } from '@skelly/thing-export/glb.ts';
import { assemblyProperties, drawnVolumeM3, modelParts } from '@skelly/thing-export/physical.ts';
import { loadRecipe, type RecipeRow, recipeAsset, recipeOptions, recipeVoxel } from '@skelly/thing-export/recipe.ts';
import { literal, optional, parse, picklist, strictObject } from 'valibot';
import { buildItem, type Catalogue, type CatalogueSettings, itemMotion, itemPalette, type ToolItem } from './catalogue.ts';
import { checkDrawnDensity, type DensityBounds, DensityBoundsSchema } from './density.ts';
import { authoredSkin } from './skin.ts';

/** The material names in a GLB's JSON chunk, which follows the 12-byte header and its own 8-byte chunk header. */
const glbMaterialNames = (glb: Uint8Array): readonly string[] => {
  const length = new DataView(glb.buffer, glb.byteOffset, glb.byteLength).getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(glb.subarray(20, 20 + length))) as {
    readonly materials?: readonly { readonly name?: string }[];
  };
  return (json.materials ?? []).flatMap(({ name }) => (name === undefined ? [] : [name]));
};

/**
 * The glow the model entry tags must be one material the written GLB draws: a slot no solid draws leaves the tag
 * naming nothing, and two materials of one colour would light both.
 */
const checkGlow = (id: string, glow: string, glb: Uint8Array) => {
  const count = glbMaterialNames(glb).filter((name) => name === glow).length;
  if (count !== 1) {
    throw new Error(`${id}: emissive material ${glow} names ${count} materials in the GLB, not one`);
  }
};

/**
 * The finish library a vehicle site names its paint from, as the glTF material each finish gives a paintable surface
 * of a catalogue part, so a consumer repaints a copy with what an export in that finish would carry.
 */
export const finishLibrary = (settings: Pick<CatalogueSettings, 'defaultMaterial'>) => paintMaterials(itemPalette(settings));

export const exportItem = (
  item: ToolItem,
  settings: CatalogueSettings,
  asset: ReturnType<typeof recipeAsset>,
  voxel: VoxelGrains,
  {
    collision = false,
    density,
  }: { readonly collision?: boolean; readonly density?: DensityBounds | undefined } = {},
) => {
  const built = buildItem(item, settings, voxel);
  const { report, masses, handling, label, drawn, glow, paintable } = built;
  if (density) {
    checkDrawnDensity(item, report.resolved, drawn, masses, density);
  }
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
  if (glow) {
    checkGlow(item.id, glow, out.glb);
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
  const motion = itemMotion(item, settings, built, voxel.voxelGrain);
  return {
    glb: out.glb,
    partNodes: out.partNodes,
    modelEntry: {
      ...asset,
      ...(item.exportMass === 'parts' ? { parts } : {}),
      ...handling,
      ...(motion ? { motion } : {}),
      ...(glow ? { emissiveMaterial: glow } : {}),
      ...(paintable.length > 0 ? { paintable } : {}),
      ...(item.covers ? { covers: item.covers } : {}),
      ...(label ? { label: { ...label, text: item.label?.text ?? item.title } } : {}),
    },
    physical: { ...assemblyProperties(parts), volumeM3: drawnVolumeM3(report.resolved, drawn) },
  };
};
const itemOptions = strictObject({
  mass: picklist(['parts', 'inventory-atom']),
  collision: optional(literal(true)),
  density: optional(DensityBoundsSchema),
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
      return () =>
        exportItem(item, settings, recipeAsset(row), recipeVoxel(row), {
          collision: options.collision === true,
          density: options.density,
        });
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
 * The thing rows of whole recipe files, for a driver that reads them without the build's partition: a pack's recipe
 * also holds rows other tools own, such as its guns.
 */
export const loadThingRecipeFiles = (files: readonly unknown[], catalogue: Catalogue) =>
  loadThingRecipe(
    files.flatMap((rows) => (rows as readonly RecipeRow[]).filter(({ kind }) => THING_KINDS.includes(kind))),
    catalogue,
  );
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
