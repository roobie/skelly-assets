import type { MaterialDef } from '@skelly/thing-core/materials';
import { expect, it } from 'vitest';
import { exportIn } from './materialExport.ts';

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
