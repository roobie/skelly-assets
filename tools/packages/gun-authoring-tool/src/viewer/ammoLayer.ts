import { MATERIALS } from '@skelly/thing-core/materials';
import { meshForSolid } from '@skelly/construct/shapes/mesh.ts';
import type { Vec2 } from '@skelly/construct/shapes/solid.ts';
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PMREMGenerator,
  SRGBColorSpace,
  type Texture,
  type WebGLRenderer,
} from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { Cartridge } from '../ammo/cartridge.ts';
import { roundProfiles } from '../ammo/roundProfile.ts';
import { cartridgeFinish, type CartridgeFinish } from '../gun/cartridgeFinish.ts';
import { type CartridgeSolids, cartridgeSolids } from '../gun/cartridgeSolids.ts';
import { mmToU } from '../gun/units.ts';

/** The cartridge's own finish, with `ammoCase` trying another case material on it when it names one. */
export const ammoFinishFromQuery = (cartridge: Cartridge, ammoCase: string | null): CartridgeFinish => ({
  ...cartridgeFinish(cartridge),
  ...(ammoCase !== null && Object.hasOwn(MATERIALS, ammoCase) ? { case: ammoCase } : {}),
});

export interface AmmoMeshes {
  readonly loose: Group;
  readonly fired: Group;
  readonly lengthUnits: number;
  readonly caseLengthUnits: number;
  readonly headDiameterUnits: number;
}

/** Build an image-based environment so metallic case and jacket materials stay legible. */
export const ammoEnvironment = (renderer: WebGLRenderer): Texture => {
  const generator = new PMREMGenerator(renderer);
  const { texture } = generator.fromScene(new RoomEnvironment(), 0.04);
  generator.dispose();
  return texture;
};

/** One material per slot, drawn as the export draws it, so the viewer shows the cartridge's exported look. */
const finishMaterials = (finish: CartridgeFinish, env: Texture) => {
  const bySlot = new Map<string, MeshStandardMaterial>();
  return (slot: string): MeshStandardMaterial => {
    const known = bySlot.get(slot);
    if (known) {
      return known;
    }
    const material = MATERIALS[finish[slot] ?? ''];
    if (!material) {
      throw new Error(`cartridge slot ${slot} has no finish material`);
    }
    const drawn = new MeshStandardMaterial({
      color: new Color().setRGB(...material.colour, SRGBColorSpace),
      metalness: material.finish.metallic,
      roughness: material.finish.roughness,
      envMap: env,
    });
    bySlot.set(slot, drawn);
    return drawn;
  };
};

const scaledToUnits = (solid: CartridgeSolids['round'][number]) =>
  solid.kind === 'revolved'
    ? { ...solid, profile: solid.profile.map(([x, y]): Vec2 => [mmToU(x), mmToU(y)]) }
    : {
        ...solid,
        profile: solid.profile.map(([x, y]): Vec2 => [mmToU(x), mmToU(y)]),
        z: [mmToU(solid.z[0]), mmToU(solid.z[1])] as const,
      };

const groupOf = (parts: CartridgeSolids['round'], finish: CartridgeFinish, env: Texture): Group => {
  const materialFor = finishMaterials(finish, env);
  const group = new Group();
  for (const solid of parts) {
    const data = meshForSolid(scaledToUnits(solid));
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(data.positions, 3));
    geometry.setAttribute('normal', new BufferAttribute(data.normals, 3));
    geometry.setIndex(new BufferAttribute(data.indices, 1));
    const mesh = new Mesh(geometry, materialFor(solid.slot ?? 'hull'));
    mesh.name = solid.id;
    group.add(mesh);
  }
  return group;
};

const ammoDimensions = (cartridge: Cartridge): Omit<AmmoMeshes, 'loose' | 'fired'> => {
  if (cartridge.kind === 'shotshell') {
    return {
      lengthUnits: mmToU(cartridge.length.loaded.value!),
      caseLengthUnits: mmToU(cartridge.length.nominal.value!),
      headDiameterUnits: mmToU(cartridge.head.rimDiameter.value!),
    };
  }
  const profiles = roundProfiles(cartridge);
  return {
    lengthUnits: mmToU(Math.max(...profiles.bullet.map(([axial]) => axial))),
    caseLengthUnits: mmToU(Math.max(...profiles.loadedCase.map(([axial]) => axial))),
    headDiameterUnits: mmToU(Math.max(...profiles.loadedCase.map(([, radius]) => radius)) * 2),
  };
};

/** Build the loose loaded round/shell and fired case in real-size-derived gungen units, axis along +X. */
export const buildAmmoMeshes = (cartridge: Cartridge, finish: CartridgeFinish, env: Texture): AmmoMeshes => {
  const solids = cartridgeSolids(cartridge);
  return {
    loose: groupOf(solids.round, finish, env),
    fired: groupOf(solids.case, finish, env),
    ...ammoDimensions(cartridge),
  };
};
