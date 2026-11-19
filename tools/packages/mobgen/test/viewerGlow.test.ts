// The viewer's glow is the game's: each vertex carries its material's emission, which fleshMaterial adds as the
// same emissive term the crowd shader applies. These checks pin the per-vertex half of that path on real bodies
// that glow, so a glowing mob reads lit in the viewer where it does in the game.

import { describe, expect, it } from 'vitest';
import { generate, realize } from '../src/core/generate.ts';
import type { Template } from '../src/core/template.ts';
import { materialOf } from '../src/core/voxelize.ts';
import { acidTemplate } from '../src/mob/acidTemplate.ts';
import { floaterTemplate } from '../src/mob/floaterTemplate.ts';
import { geometryOf } from '../src/viewer/scene.ts';

/** Each surface vertex's viewer glow beside its material's emission. */
const vertexGlows = (template: Template): { glow: number; emissive: number }[] => {
  const realized = realize(generate(template, 7));
  const { materials } = realized.body;
  return [...realized.meshes.values()].flatMap((mesh) => {
    const glow = geometryOf(mesh, materials, realized.voxels).getAttribute('glow')!;
    return [...mesh.colors].map((byte, v) => ({
      glow: glow.getX(v),
      emissive: materials[materialOf(realized.voxels, byte)]!.emissive,
    }));
  });
};

describe.each([floaterTemplate, acidTemplate])('viewer glow of $name', (template) => {
  const vertices = vertexGlows(template);

  it("carries each vertex's material emission, so its emissive parts glow", () => {
    for (const { glow, emissive } of vertices) {
      expect(glow).toBeCloseTo(emissive, 6);
    }
    expect(vertices.some(({ glow }) => glow > 0)).toBe(true);
  });
});

it('leaves a non-emissive part unlit by its own glow', () => {
  // The acid zombie's skin shows beside its glowing sac and eyes.
  const dark = vertexGlows(acidTemplate).filter(({ emissive }) => emissive === 0);
  expect(dark.length).toBeGreaterThan(0);
  expect(dark.every(({ glow }) => glow === 0)).toBe(true);
});
