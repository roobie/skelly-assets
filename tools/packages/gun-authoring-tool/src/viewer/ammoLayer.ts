import { MATERIALS } from '@skelly/thing-core/materials';
import { meshForSolid } from '@skelly/construct/shapes/mesh.ts';
import type { RevolvedSolid, Vec2 } from '@skelly/construct/shapes/solid.ts';
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
import type { Cartridge, Shotshell } from '../ammo/cartridge.ts';
import { roundProfiles } from '../ammo/roundProfile.ts';
import { cartridgeFinish, type CartridgeFinish } from '../gun/cartridgeFinish.ts';
import { shotshellGeometry } from '../gun/shotshellGeometry.ts';
import { mmToU } from '../gun/units.ts';

const DEFAULT_ROUND_FACETS = 24;
const ROUND_CREASE_DEGREES = 12;
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

const revolvedGeometry = (profile: readonly Vec2[], facets: number): BufferGeometry => {
  const solid: RevolvedSolid = {
    id: 'cartridge-component',
    kind: 'revolved',
    axis: 'x',
    profile: profile.map(([axial, radius]): Vec2 => [mmToU(axial), mmToU(radius)]),
    creaseDegrees: ROUND_CREASE_DEGREES,
  };
  const mesh = meshForSolid(solid, 0, facets);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(mesh.positions, 3));
  geometry.setAttribute('normal', new BufferAttribute(mesh.normals, 3));
  geometry.setIndex(new BufferAttribute(mesh.indices, 1));
  return geometry;
};

const buildShellMeshes = (shell: Shotshell, finish: CartridgeFinish, env: Texture, facets: number): AmmoMeshes => {
  const solids = shotshellGeometry(shell);
  const materialFor = finishMaterials(finish, env);
  const groupOf = (parts: typeof solids.round): Group => {
    const group = new Group();
    for (const solid of parts) {
      const scaled =
        solid.kind === 'revolved'
          ? { ...solid, profile: solid.profile.map(([x, y]): Vec2 => [mmToU(x), mmToU(y)]) }
          : {
              ...solid,
              profile: solid.profile.map(([x, y]): Vec2 => [mmToU(x), mmToU(y)]),
              z: [mmToU(solid.z[0]), mmToU(solid.z[1])] as const,
            };
      const data = meshForSolid(scaled, 0, facets);
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
  return {
    loose: groupOf(solids.round),
    fired: groupOf(solids.case),
    lengthUnits: mmToU(shell.length.loaded.value!),
    caseLengthUnits: mmToU(shell.length.nominal.value!),
    headDiameterUnits: mmToU(shell.head.rimDiameter.value!),
  };
};

/** Build the loose loaded round/shell and fired case in real-size-derived gungen units, axis along +X. */
export const buildAmmoMeshes = (
  cartridge: Cartridge,
  finish: CartridgeFinish,
  env: Texture,
  facets = DEFAULT_ROUND_FACETS,
): AmmoMeshes => {
  if (cartridge.kind === 'shotshell') {
    return buildShellMeshes(cartridge, finish, env, facets);
  }
  const profiles = roundProfiles(cartridge);
  const materialFor = finishMaterials(finish, env);
  const loose = new Group();
  loose.add(
    new Mesh(revolvedGeometry(profiles.loadedCase, facets), materialFor('case')),
    new Mesh(revolvedGeometry(profiles.primer, facets), materialFor('primer')),
    new Mesh(revolvedGeometry(profiles.bullet, facets), materialFor('bullet')),
  );
  const fired = new Group();
  fired.add(
    new Mesh(revolvedGeometry(profiles.firedCase, facets), materialFor('case').clone()),
    new Mesh(revolvedGeometry(profiles.primer, facets), materialFor('primer').clone()),
  );
  const lengthMm = Math.max(...profiles.bullet.map(([axial]) => axial));
  const caseLengthMm = Math.max(...profiles.loadedCase.map(([axial]) => axial));
  const headDiameterMm = Math.max(...profiles.loadedCase.map(([, radius]) => radius)) * 2;
  return {
    loose,
    fired,
    lengthUnits: mmToU(lengthMm),
    caseLengthUnits: mmToU(caseLengthMm),
    headDiameterUnits: mmToU(headDiameterMm),
  };
};
