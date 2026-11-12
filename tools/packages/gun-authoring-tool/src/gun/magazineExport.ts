import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Assembly, PartInstance } from '@skelly/construct/assembly/schema.ts';
import { drawnGeometry } from '@skelly/thing-export/drawn.ts';
import type {
  AppearanceContext,
  GlbAssetIdentity,
  GlbExportError,
  GlbExportResult,
  VoxelGrains,
} from '@skelly/thing-export/exportTypes.ts';
import { modelCollision } from '@skelly/thing-export/physical.ts';
import { calibreSlug } from '../ammo/calibreSlug.ts';
import type { MetallicCartridge } from '../ammo/cartridge.ts';
import { gunDomain } from './domain.ts';
import type { DeadvoxModelEntry, DeadvoxModelFile } from './exportGlb.ts';
import { inFileFrame } from './exportFrame.ts';
import { exportGunGeometry as exportGlb } from './glbWriter.ts';
import { magazineRoundColumn, magazineRoundPoses } from './magazineGeometry.ts';
import { GUN_PALETTE } from './palette.ts';
import { FAMILIES } from './parts.ts';
import { GUN_PREFABS, type PrefabCatalogueEntry } from './prefabs.ts';

export interface MagazineExportInput {
  readonly asset: GlbAssetIdentity;
  /** The registry key of a family that builds the `magazine` role. */
  readonly family: string;
  readonly params: Readonly<Record<string, string>>;
  readonly cartridge: MetallicCartridge;
  readonly appearance?: AppearanceContext;
  readonly voxel?: VoxelGrains;
}

export type MagazineExportResult =
  | {
      readonly ok: true;
      readonly glb: Uint8Array;
      readonly partNodes: readonly string[];
      readonly modelEntry: DeadvoxModelEntry;
    }
  | { readonly ok: false; readonly error: GlbExportError };

/** The curated prefab a loose magazine exports from: one whose family builds the `magazine` role. */
export const magazinePrefab = (id: string): PrefabCatalogueEntry | undefined =>
  GUN_PREFABS.find(
    (prefab) => prefab.id === id && FAMILIES[prefab.family]?.build(prefab.fixedParams).family === 'magazine',
  );

/** Exports one generated magazine as a detached model plus its full round-column metadata. */
export const exportMagazineGlb = (input: MagazineExportInput): MagazineExportResult => {
  calibreSlug(input.cartridge.id);
  const magazine: PartInstance = { family: input.family, params: input.params };
  const assembly: Assembly = {
    name: input.asset.id,
    root: 'magazine',
    parts: { magazine },
    connections: [],
  };
  const resolved = resolve(assembly, gunDomain);
  const def = resolved.defs.get('magazine');
  if (def?.family !== 'magazine') {
    throw new Error(`family "${input.family}" does not build a magazine`);
  }
  const output: GlbExportResult = exportGlb({
    resolved,
    palette: GUN_PALETTE,
    ...(input.appearance ? { appearance: input.appearance } : {}),
    asset: input.asset,
    ...input.voxel,
  });
  if (!output.ok) {
    return output;
  }
  // The family's defaults fill the params a prefab leaves out, as they do for the viewer's column.
  const params = Object.fromEntries(
    Object.entries(resolved.params.get('magazine') ?? {}).map(([key, param]) => [key, param.value]),
  );
  const { column } = magazineRoundColumn(def.displaySolids ?? def.solids, input.cartridge, params, def.solids);
  const fileResolved = inFileFrame(resolved);
  const drawn = drawnGeometry(fileResolved, input.voxel);
  return {
    ok: true,
    glb: output.glb,
    partNodes: output.partNodes,
    modelEntry: {
      id: input.asset.id,
      file: input.asset.file as DeadvoxModelFile,
      collision: modelCollision(fileResolved, drawn),
      gun: {
        calibre: input.cartridge.id,
        capacity: column.capacity,
        rounds: magazineRoundPoses(column, drawn.point),
      },
    },
  };
};
