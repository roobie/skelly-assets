import { resolve } from '@skelly/construct/assembly/resolve.ts';
import type { Domain } from '@skelly/construct/assembly/schema.ts';
import type { MaterialDef } from '@skelly/thing-core/materials';
import { expect, it } from 'vitest';
import { exportGlb } from '../src/glb.ts';

const SHEEN = 'KHR_materials_sheen';

const cloth: MaterialDef = {
  colour: [0.6, 0.2, 0.2],
  finish: {
    metallic: 0,
    roughness: 0.9,
    sheen: { colour: [0.8, 0.5, 0.5], roughness: 0.5 },
    fabric: { kind: 'woven', grain: 0.002, relief: 0.5, noise: 0.1, crease: 0.2, fold: 0.07 },
  },
};
const steel: MaterialDef = { colour: [0.5, 0.5, 0.5], finish: { metallic: 1, roughness: 0.3 } };

interface GltfMaterial {
  readonly pbrMetallicRoughness: { readonly roughnessFactor: number; readonly metallicFactor: number };
  readonly extensions?: Record<string, { readonly sheenRoughnessFactor: number }>;
  readonly extras?: { readonly materialId?: string; readonly fabric?: unknown };
}

/** The glTF JSON of a one-box model whose only solid is finished in `material`. */
const exportIn = (material: MaterialDef): { extensionsUsed?: string[]; materials: GltfMaterial[] } => {
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

it('exports a fabric finish as a rough, sheened glTF material that carries its grain in the extras', () => {
  const gltf = exportIn(cloth);
  expect(gltf.extensionsUsed).toContain(SHEEN);
  const [material] = gltf.materials;
  expect(material?.pbrMetallicRoughness.roughnessFactor).toBe(cloth.finish.roughness);
  expect(material?.extensions?.[SHEEN]?.sheenRoughnessFactor).toBe(cloth.finish.sheen?.roughness);
  expect(material?.extras).toMatchObject({ materialId: 'fixture', fabric: cloth.finish.fabric });
});

it('exports a finish without a fabric or sheen with neither the extension nor a grain', () => {
  const gltf = exportIn(steel);
  expect(gltf.extensionsUsed ?? []).not.toContain(SHEEN);
  const [material] = gltf.materials;
  expect(material?.extensions?.[SHEEN]).toBeUndefined();
  expect(material?.extras?.materialId).toBe('fixture');
  expect(material?.extras?.fabric).toBeUndefined();
});
