import type { SurfaceModel, SurfacePass, Uniforms } from '@skelly/surfaces/patch';
import type { LeafInputs, Surface } from '@skelly/surfaces/schema';
import {
  Box3,
  Material,
  type Mesh,
  MeshDepthMaterial,
  MeshDistanceMaterial,
  type Object3D,
  RGBADepthPacking,
} from 'three';
import type { Content } from './content.ts';
import { kinds } from './kinds.ts';

/**
 * Puts `replacement` in place of `hook` and throws when the source lacks it, as skelly's own `replaceHook`
 * (skelly, packages/presentation/src/render/materialPatches.ts) does, so the lab fails on a missing anchor as the game
 * would.
 */
const replaceHook = (source: string, hook: string, replacement: string) => {
  if (!source.includes(hook)) throw new Error(`three no longer has ${hook}; a material patch cannot hook it`);
  return source.replace(hook, () => replacement);
};

/** A lit material wearing a surface, with the shadow materials that cut as it does. */
export interface Worn {
  readonly material: Material;
  readonly shadows: Partial<Record<SurfacePass, Material>>;
  /** What the material shows, by its name in the scene and its finish. */
  readonly label: string;
  /** The surface the content gives it now, so a content push finds its new look. */
  readonly surfaceOf: (content: Content) => Surface | undefined;
  readonly model: SurfaceModel;
  surface: Surface | undefined;
  uniforms: Uniforms;
}

const isMesh = (object: Object3D): object is Mesh => 'isMesh' in object && object.isMesh === true;
const materialsOf = (mesh: Mesh) => [mesh.material].flat();

/** The size of the box of `meshes`' faces in their own axes, the frame a surface lies in. */
const sizeOf = (meshes: readonly Mesh[]): SurfaceModel['size'] => {
  const box = new Box3();
  for (const { geometry } of meshes) {
    if (geometry.boundingBox === null) geometry.computeBoundingBox();
    if (geometry.boundingBox !== null) box.union(geometry.boundingBox);
  }
  const { x, y, z } = box.getSize(box.min.clone());
  return [x, y, z];
};

const shadowMaterial = (pass: SurfacePass, lit: Material) => {
  const material =
    pass === 'depth' ? new MeshDepthMaterial({ depthPacking: RGBADepthPacking }) : new MeshDistanceMaterial();
  material.side = lit.side;
  return material;
};

/**
 * The lab's surface materials. Each material's surface is patched in its own compile hook, as a game stacks it beside
 * its other patches, and keyed by the kind, the pass and the code's revision, so a retune compiles nothing and a code
 * or kind change recompiles. One record of the leaf kind's inputs serves every material, as the game feeds them.
 */
export class SurfaceMaterials {
  private readonly worn = new Map<Material, Worn>();
  private inputs: Uniforms = kinds().patch.leafInputs();

  /**
   * Every material wearing a surface under `root`, its surface found by `surfaceOf` in `content`, labelled after
   * `copy`, the copy of the model or the piece it shows.
   */
  wear(
    root: Object3D,
    copy: string,
    content: Content,
    surfaceOf: (material: Material) => (content: Content) => Surface | undefined,
  ) {
    const meshes = new Map<Material, Mesh[]>();
    root.traverse((object) => {
      if (isMesh(object))
        for (const material of materialsOf(object)) meshes.set(material, [...(meshes.get(material) ?? []), object]);
    });
    for (const [material, users] of meshes) {
      // An export's material is named by its colour; its finish names it better.
      const { materialId } = material.userData as { materialId?: unknown };
      const name = typeof materialId === 'string' ? materialId : material.name || 'unnamed';
      const worn =
        this.worn.get(material) ?? this.install(material, `${copy}: ${name}`, surfaceOf(material), users, content);
      if (worn === undefined) continue;
      for (const mesh of users) {
        if (worn.shadows.depth) mesh.customDepthMaterial = worn.shadows.depth;
        if (worn.shadows.distance) mesh.customDistanceMaterial = worn.shadows.distance;
      }
    }
  }

  /** The worn materials under `root`, in the order the scene holds them. */
  under(root: Object3D): Worn[] {
    const found = new Set<Worn>();
    root.traverse((object) => {
      if (!isMesh(object)) return;
      for (const material of materialsOf(object)) {
        const worn = this.worn.get(material);
        if (worn) found.add(worn);
      }
    });
    return [...found];
  }

  /** Forgets the materials under `root`, which the page no longer draws. */
  drop(root: Object3D) {
    for (const worn of this.under(root)) this.worn.delete(worn.material);
  }

  /** Shows `surface` on `worn`: in place when the kind holds, recompiled when it changes. */
  show(worn: Worn, surface: Surface | undefined) {
    const before = worn.surface;
    worn.surface = surface;
    if (surface !== undefined && before?.kind === surface.kind) {
      kinds().patch.tuneSurface(worn.uniforms, surface, worn.model);
      return;
    }
    worn.uniforms = surface === undefined ? {} : kinds().patch.surfaceUniforms(surface, worn.model);
    this.recompile(worn);
  }

  /** Every material's surface as `content` now gives it. */
  retune(content: Content) {
    for (const worn of this.worn.values()) this.show(worn, worn.surfaceOf(content));
  }

  /** Every material under the surfaces package's new code, whose uniforms or inputs may have changed shape. */
  reload() {
    this.inputs = kinds().patch.leafInputs();
    for (const worn of this.worn.values()) {
      if (worn.surface !== undefined) worn.uniforms = kinds().patch.surfaceUniforms(worn.surface, worn.model);
      this.recompile(worn);
    }
  }

  /** The game's inputs to the leaf kind this frame. */
  feed(inputs: LeafInputs) {
    kinds().patch.setLeafInputs(this.inputs, inputs);
  }

  private recompile(worn: Worn) {
    worn.material.needsUpdate = true;
    for (const shadow of Object.values(worn.shadows)) shadow.needsUpdate = true;
  }

  private install(
    material: Material,
    label: string,
    surfaceOf: (content: Content) => Surface | undefined,
    users: readonly Mesh[],
    content: Content,
  ): Worn | undefined {
    const surface = surfaceOf(content);
    if (surface === undefined) return undefined;
    const model = { size: sizeOf(users) };
    // Every pass the package has, so a surface that changes kind finds its shadow materials ready.
    const shadows = { depth: shadowMaterial('depth', material), distance: shadowMaterial('distance', material) };
    const worn: Worn = {
      material,
      shadows,
      label,
      surfaceOf,
      model,
      surface,
      uniforms: kinds().patch.surfaceUniforms(surface, model),
    };
    this.hook(material, 'colour', worn);
    this.hook(shadows.depth, 'depth', worn);
    this.hook(shadows.distance, 'distance', worn);
    this.worn.set(material, worn);
    return worn;
  }

  // Stacks the surface on the material's own hook and key, as skelly's materialPatch does: a shadow pass the kind does
  // not patch draws plain.
  private hook(material: Material, pass: SurfacePass, worn: Worn) {
    const compile = material.onBeforeCompile;
    // three's default key is the hook's source, and the hook is about to become this wrapper.
    const key =
      material.customProgramCacheKey === Material.prototype.customProgramCacheKey
        ? () => compile.toString()
        : material.customProgramCacheKey.bind(material);
    const patched = () => worn.surface !== undefined && kinds().patch.surfacePasses(worn.surface.kind).includes(pass);
    material.onBeforeCompile = (shader, renderer) => {
      compile.call(material, shader, renderer);
      if (worn.surface !== undefined && patched())
        kinds().patch.patchSurface(shader, worn.surface, {
          pass,
          replace: replaceHook,
          uniforms: worn.uniforms,
          inputs: this.inputs,
        });
    };
    material.customProgramCacheKey = () =>
      [
        key(),
        worn.surface !== undefined && patched() ? kinds().patch.surfaceKey(worn.surface, pass) : 'plain',
        `lab-${kinds().revision}`,
      ].join(':');
    material.needsUpdate = true;
  }
}
