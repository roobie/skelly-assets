import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Assembly, Domain, PartDef, PartFamily } from '@skelly/construct/assembly/schema.ts';
import type { RevolvedSolid, Solid } from '@skelly/construct/shapes/solid.ts';
import type {
  AppearanceContext,
  GlbAssetIdentity,
  GlbExportError,
  VoxelGrains,
} from '@skelly/thing-export/exportTypes.ts';
import { featureFitsGrain } from '@skelly/thing-export/featureFit.ts';
import { type CartridgeModelKind, cartridgeModelAsset } from '../ammo/calibreSlug.ts';
import type { Cartridge } from '../ammo/cartridge.ts';
import { type RoundProfiles, roundProfiles } from '../ammo/roundProfile.ts';
import type { DeadvoxModelEntry, DeadvoxModelFile } from './exportGlb.ts';
import { exportGunGeometry as exportGlb } from './glbWriter.ts';
import { AMMO_PALETTE, GUN_APPEARANCE } from './palette.ts';
import { shotshellGeometry, shotshellHullMaterial } from './shotshellGeometry.ts';

interface CartridgeModel {
  readonly glb: Uint8Array;
  readonly partNodes: readonly string[];
  readonly modelEntry: DeadvoxModelEntry;
}

interface CartridgeModels {
  readonly round: CartridgeModel;
  readonly case: CartridgeModel;
}

export type CartridgeExportResult =
  | { readonly ok: true; readonly models: CartridgeModels }
  | { readonly ok: false; readonly error: GlbExportError };

type SingleCartridgeExportResult =
  | { readonly ok: true; readonly model: CartridgeModel }
  | { readonly ok: false; readonly error: GlbExportError };

const EMPTY_PORTS: PartDef['ports'] = [];
const EMPTY_KEEPOUTS: PartDef['keepOuts'] = [];
const EMPTY_AXES: PartDef['axes'] = [];
const MM_DOMAIN: Domain['units'] = { metresPerUnit: 0.001, grid: 0.001, bevel: 0 };

interface CartridgeLook {
  readonly appearance?: AppearanceContext | undefined;
  readonly voxel?: Partial<VoxelGrains>;
}

/**
 * The thinnest feature that shapes a cartridge's outline, in metres: its rim, which every head has, where an extractor
 * groove is absent from rimmed and shotshell heads.
 */
const rimThickness = (cartridge: Cartridge): number => {
  const { value } = cartridge.kind === 'shotshell' ? cartridge.head.rimThickness : cartridge.case.rim.thickness;
  if (value === null) {
    throw new Error(`cartridge ${cartridge.id} has no rim thickness`);
  }
  return value * MM_DOMAIN.metresPerUnit;
};

/**
 * A cartridge whose rim is too thin for its grain is drawn smooth, as voxels would lose its rim and step its taper;
 * a large one keeps the voxel look of the guns around it. Its data may decide either way.
 */
const voxelized = (cartridge: Cartridge, voxelGrain: number | undefined): boolean =>
  voxelGrain !== undefined && (cartridge.voxelize ?? featureFitsGrain(rimThickness(cartridge), voxelGrain));

const makeModelExport = (
  cartridge: Cartridge,
  asset: GlbAssetIdentity,
  solids: readonly Solid[],
  { appearance, voxel }: CartridgeLook,
): SingleCartridgeExportResult => {
  const family: PartFamily = {
    name: 'cartridge-model',
    params: {},
    build: (): PartDef => ({
      family: 'cartridge-model',
      solids,
      ports: EMPTY_PORTS,
      keepOuts: EMPTY_KEEPOUTS,
      axes: EMPTY_AXES,
    }),
  };
  const domain: Domain = {
    name: 'cartridge-model',
    units: MM_DOMAIN,
    families: { 'cartridge-model': family },
    axisRules: [],
  };
  const assembly: Assembly = {
    name: asset.id,
    root: 'cartridge',
    parts: { cartridge: { family: 'cartridge-model' } },
    connections: [],
  };
  const resolved = resolve(assembly, domain);
  const effectiveAppearance: AppearanceContext = {
    ...appearance,
    finish: {
      ...GUN_APPEARANCE.cartridgeFinish,
      ...(cartridge.kind === 'shotshell' ? { hull: shotshellHullMaterial(cartridge) } : {}),
      ...appearance?.finish,
    },
  };
  const voxels = voxelized(cartridge, voxel?.voxelGrain);
  const result = exportGlb({
    resolved,
    palette: AMMO_PALETTE,
    revolveFacets: voxels ? 96 : GUN_APPEARANCE.smoothCartridgeSides,
    asset,
    appearance: effectiveAppearance,
    ...(voxels ? voxel : {}),
  });
  if (!result.ok) {
    return result;
  }
  return {
    ok: true,
    model: {
      glb: result.glb,
      partNodes: result.partNodes,
      modelEntry: {
        id: asset.id,
        file: asset.file as DeadvoxModelFile,
        gun: { calibre: cartridge.id },
      },
    },
  };
};

const revolved = (id: string, profile: RevolvedSolid['profile'], slot: string): RevolvedSolid => ({
  id,
  kind: 'revolved',
  axis: 'x',
  profile,
  slot,
});

const metallicSolids = (cartridge: Extract<Cartridge, { kind: 'metallic' }>) => {
  const profiles: RoundProfiles = roundProfiles(cartridge);
  return {
    // The bullet's seated length lies inside the case, within a voxel of its wall; a later solid takes a shared voxel,
    // so the case comes after the bullet and the round shows brass to the mouth.
    round: [
      revolved('bullet', profiles.bullet, 'bullet'),
      revolved('case', profiles.loadedCase, 'case'),
      revolved('primer', profiles.primer, 'primer'),
    ],
    case: [revolved('case', profiles.firedCase, 'case'), revolved('primer', profiles.primer, 'primer')],
  };
};

export const exportCartridgeModel = (
  cartridge: Cartridge,
  component: CartridgeModelKind,
  asset: GlbAssetIdentity,
  look: CartridgeLook = {},
): SingleCartridgeExportResult => {
  const solids = cartridge.kind === 'shotshell' ? shotshellGeometry(cartridge) : metallicSolids(cartridge);
  return makeModelExport(cartridge, asset, solids[component], look);
};

/** Export loaded-round/shell and fired-case/hull GLBs at real millimetre-derived dimensions. */
export const exportCartridgeModels = (cartridge: Cartridge, appearance?: AppearanceContext): CartridgeExportResult => {
  const round = exportCartridgeModel(cartridge, 'round', cartridgeModelAsset('round', cartridge.id), { appearance });
  if (!round.ok) {
    return round;
  }
  const firedCase = exportCartridgeModel(cartridge, 'case', cartridgeModelAsset('case', cartridge.id), {
    appearance,
  });
  if (!firedCase.ok) {
    return firedCase;
  }
  return { ok: true, models: { round: round.model, case: firedCase.model } };
};
