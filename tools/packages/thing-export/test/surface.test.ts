import { MATERIALS } from '@skelly/thing-core/materials';
import { expect, it } from 'vitest';
import { exportIn } from './materialExport.ts';

const { bark } = MATERIALS;

it('exports a shader-surfaced finish with its look in the extras, beside its material id', () => {
  expect(bark?.finish.surface).toBeDefined();
  if (bark === undefined) return;
  const [material] = exportIn(bark).materials;
  expect(material?.extras).toEqual(expect.objectContaining({ materialId: 'fixture', surface: bark.finish.surface }));
  expect(material?.pbrMetallicRoughness.roughnessFactor).toBe(bark.finish.roughness);
});

it('exports a finish without a surface with none in the extras', () => {
  const { surface: _, ...plain } = bark?.finish ?? { metallic: 0, roughness: 1 };
  const [material] = exportIn({ colour: [0.3, 0.2, 0.1], finish: plain }).materials;
  expect(material?.extras?.materialId).toBe('fixture');
  expect(material?.extras).not.toHaveProperty('surface');
});
