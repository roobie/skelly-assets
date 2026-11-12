import { Mesh, Texture } from 'three';
import { describe, expect, it } from 'vitest';
import type { MetallicCartridge } from '../src/ammo/cartridge.ts';
import { cartridgeFinish } from '../src/gun/cartridgeFinish.ts';
import { ammoFinishFromQuery, buildAmmoMeshes } from '../src/viewer/ammoLayer.ts';
import { loadCartridgeFile } from './ammoHelpers.ts';

const cartridge = loadCartridgeFile('7.62x39.json') as MetallicCartridge;

describe('viewer ammunition orientation', () => {
  it("draws the cartridge's own finish unless ammoCase names another case material", () => {
    expect(ammoFinishFromQuery(cartridge, null)).toEqual(cartridgeFinish(cartridge));
    expect(ammoFinishFromQuery(cartridge, 'no-such-material')).toEqual(cartridgeFinish(cartridge));
    expect(ammoFinishFromQuery(cartridge, 'lead')).toEqual({ ...cartridgeFinish(cartridge), case: 'lead' });
  });

  it('places cartridge length along local +X like exported revolved solids', () => {
    const ammo = buildAmmoMeshes(cartridge, cartridgeFinish(cartridge), new Texture());
    const meshes = ammo.loose.children.filter((child): child is Mesh => child instanceof Mesh);
    const bounds = meshes.map((mesh) => {
      mesh.geometry.computeBoundingBox();
      return mesh.geometry.boundingBox!;
    });
    const min = [0, 1, 2].map((axis) => Math.min(...bounds.map((box) => box.min.getComponent(axis))));
    const max = [0, 1, 2].map((axis) => Math.max(...bounds.map((box) => box.max.getComponent(axis))));
    const dimensions = max.map((value, axis) => value - min[axis]!);

    expect(dimensions[0]).toBeCloseTo(ammo.lengthUnits, 6);
    expect(dimensions[1]).toBeCloseTo(ammo.headDiameterUnits, 6);
    expect(dimensions[2]).toBeCloseTo(ammo.headDiameterUnits, 6);
  });
});
