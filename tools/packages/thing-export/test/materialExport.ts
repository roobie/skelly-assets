import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Domain } from '@skelly/construct/assembly/schema.ts';
import type { MaterialDef } from '@skelly/thing-core/materials';
import { exportGlb } from '../src/glb.ts';

export interface GltfMaterial {
  readonly pbrMetallicRoughness: { readonly roughnessFactor: number; readonly metallicFactor: number };
  readonly extensions?: Record<string, { readonly sheenRoughnessFactor: number }>;
  readonly extras?: { readonly materialId?: string; readonly fabric?: unknown; readonly surface?: unknown };
}

/** The glTF JSON of a one-box model whose only solid is finished in `material`. */
export const exportIn = (material: MaterialDef): { extensionsUsed?: string[]; materials: GltfMaterial[] } => {
  const domain: Domain = {
    name: 'fixture',
    units: { metresPerUnit: 1, grid: 1, bevel: 0 },
    axisRules: [],
    families: {
      shape: {
        name: 'shape',
        params: {},
        build: () => ({
          family: 'shape',
          solids: [{ id: 'box', kind: 'box', box: { center: [0, 0, 0], half: [0.5, 0.5, 0.5] } }],
          ports: [],
          keepOuts: [],
          axes: [],
        }),
      },
    },
  };
  const result = exportGlb({
    resolved: resolve({ name: 'fixture', root: 'body', parts: { body: { family: 'shape' } }, connections: [] }, domain),
    asset: { id: 'fixture', file: 'assets/models/fixture.glb' },
    palette: {
      familyColors: {},
      specialColors: {},
      fallbackColor: [0.5, 0.5, 0.5],
      fallbackFinish: { metallic: 0, roughness: 0.5 },
      materials: { fixture: material },
      roleMaterials: { shape: 'fixture' },
    },
  });
  if (!result.ok) {
    throw new Error(JSON.stringify(result.error));
  }
  const view = new DataView(result.glb.buffer, result.glb.byteOffset, result.glb.byteLength);
  return JSON.parse(new TextDecoder().decode(result.glb.subarray(20, 20 + view.getUint32(12, true))));
};
