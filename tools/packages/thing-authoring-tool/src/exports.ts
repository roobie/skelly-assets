import { MATERIALS } from '@skelly/thing-core/materials';
import type { VoxelGrains } from '@skelly/thing-export/exportTypes.ts';
import { exportGlb } from '@skelly/thing-export/glb.ts';
import { assemblyProperties, modelParts } from '@skelly/thing-export/physical.ts';
import { displayName, loadRecipe, type RecipeRow, recipeAsset, recipeOptions, recipeVoxel } from '@skelly/thing-export/recipe.ts';
import { literal, optional, parse, picklist, strictObject } from 'valibot';
import { buildItem, catalogue, palette, type ToolItem } from './catalogue.ts';
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

export const exportItem = (
  item: ToolItem,
  asset: ReturnType<typeof recipeAsset>,
  voxel: VoxelGrains,
  { collision = false }: { readonly collision?: boolean } = {},
) => {
  const { report, masses, handling, label, drawn, glow } = buildItem(item, voxel);
  const out = exportGlb({
    resolved: report.resolved,
    ...(item.skin ? { skin: authoredSkin(item.skin) } : {}),
    asset,
    palette,
    revolveFacets: catalogue.facets,
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
const exporters = {
  item: (row: RecipeRow) => {
    const options = parse(
      strictObject({
        mass: picklist(['parts', 'inventory-atom']),
        collision: optional(literal(true)),
      }),
      recipeOptions(row),
    );
    const item = catalogue.items.find(({ id }) => id === row.source);
    if (!item) {
      throw new Error(`Unknown tool item ${row.source}`);
    }
    if (options.mass !== item.exportMass) {
      throw new Error(`Recipe mass ownership differs from tool item ${row.source}`);
    }
    return () => exportItem(item, recipeAsset(row), recipeVoxel(row), { collision: options.collision === true });
  },
};
// The recipe row kinds this tool owns; a driver hands it only rows of these kinds.
export const THING_KINDS: readonly string[] = Object.freeze(Object.keys(exporters));
const { items: _items, ...settings } = catalogue;
/**
 * What an item row's export reads besides code and the row: its item, the catalogue settings and the materials it may
 * name. A material counts when its id occurs anywhere in the item's text, even inside a string parameter, since naming
 * one too many only widens the key.
 */
const itemInputs = (row: RecipeRow) => {
  const item = catalogue.items.find(({ id }) => id === row.source);
  const text = JSON.stringify(item);
  const named = Object.keys(MATERIALS).filter((id) => id === catalogue.defaultMaterial || text.includes(id));
  return { item, settings, materials: named.sort().map((id) => [id, MATERIALS[id]]) };
};
export const loadThingRecipe = (value: unknown) => loadRecipe(value, exporters, { item: itemInputs });
