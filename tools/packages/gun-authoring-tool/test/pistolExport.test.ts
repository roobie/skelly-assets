import { expect, it } from 'vitest';
import cartridge from '../../../../models/guns/cartridges/9x19.json' with { type: 'json' };
import { exportFileText } from '../src/cli/exportFile.ts';
import { readGlb } from './glbReader.ts';
import { designText } from './helpers.ts';
import { parseModel } from './modelSchema.ts';

it('exports a cycling semi-auto slide with the calibre and anchors Deadvox admits', () => {
  const exported = exportFileText(designText('service-nine'), {
    id: 'fixture_pistol',
    file: 'assets/models/fixture_pistol.glb',
  });
  if (!exported.ok) {
    throw new Error(exported.message);
  }
  const model = exported.modelEntry;
  const action = model.gun.action!;
  expect(model.gun.calibre).toBeTruthy();
  expect(model.gun.sight?.kind).toBe('iron');
  expect(model.grip).toBeDefined();
  expect(model.anchors?.ejection).toBeDefined();
  expect(model.anchors?.muzzle).toBeDefined();
  expect(action.triggerMode).toBe('semi');
  expect(action.hand.durationSimSeconds).toBeGreaterThan(0);
  expect(action.hand.unlockSimSeconds).toBeGreaterThan(0);
  expect(Object.values(action.parts).some(({ handGrip }) => handGrip?.every(Number.isFinite))).toBe(true);
  expect(action.fire!.durationSimSeconds).toBeGreaterThan(0);
  expect(action.roundsPerSimMinute).toBeGreaterThan(0);
  const glb = readGlb(exported.glb);
  const slide = glb.json.nodes.find(({ name, mesh }) => name === 'slide:slide' && mesh !== undefined);
  if (slide?.mesh === undefined) {
    throw new Error('Pistol slide is missing from the exported model');
  }
  const solids = new Set(
    glb.json.meshes[slide.mesh]!.primitives.flatMap((primitive) =>
      primitive.extras?.solid ? [primitive.extras.solid] : [],
    ),
  );
  expect([...solids]).toEqual(expect.arrayContaining(['front-sight-post', 'rear-sight-left', 'rear-sight-right']));
  expect(Object.values(action.parts).length).toBeGreaterThan(0);
  for (const part of Object.values(action.parts)) {
    expect(part.strokeMetres).toBeGreaterThan(cartridge.overallLength.max.value / 1000);
    expect(part.modes).toContain('fire');
    expect(part.modes).toContain('hand');
    expect(glb.json.nodes.some(({ name, mesh }) => name === part.node && mesh !== undefined)).toBe(true);
  }
  const parsed = parseModel(model);
  expect(parsed.gun.action?.triggerMode).toBe(action.triggerMode);
});
