import { bark } from './bark.ts';
import {
  retune,
  SURFACE_PASSES,
  type SurfaceEdit,
  type SurfaceKindCode,
  type SurfaceModel,
  type SurfacePass,
  type Uniforms,
} from './glsl.ts';
import { leaf } from './leaf.ts';
import type { Surface, SurfaceKind } from './schema.ts';

export { grainAxis } from './bark.ts';
export {
  SURFACE_PASSES,
  type SurfaceEdit,
  type SurfaceModel,
  type SurfacePass,
  type Uniform,
  type Uniforms,
  type Vec3,
} from './glsl.ts';
export { leafInputs, setLeafInputs } from './leaf.ts';

/** Inserts `replacement` in place of `hook` in `source`, and throws when `source` lacks it, as skelly's `replaceHook`. */
export type ReplaceHook = (source: string, hook: string, replacement: string) => string;

/** The part of three's compile hook argument a surface edits. */
export interface SurfaceShader {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, { value: unknown }>;
}

export interface PatchOptions {
  readonly pass: SurfacePass;
  /** Applies each edit, so a three upgrade that drops an anchor fails in the caller's own way. */
  readonly replace: ReplaceHook;
  /** The material's own uniforms, from `surfaceUniforms`; share them with its shadow materials. */
  readonly uniforms: Uniforms;
  /** The game's inputs, shared by every material of the kind, for a pass that reads them. */
  readonly inputs?: Uniforms;
}

const KINDS: Record<SurfaceKind, Pick<SurfaceKindCode<never>, 'edits' | 'inputs'>> = { bark, leaf };

/** Every edit of every kind and pass, so a test can hold each anchor against three's sources. */
export const SURFACE_EDITS: Readonly<Record<SurfaceKind, Partial<Record<SurfacePass, readonly SurfaceEdit[]>>>> = {
  bark: bark.edits,
  leaf: leaf.edits,
};

/**
 * The passes a kind patches. A kind that cuts holes patches its shadow passes too, so a renderer gives its materials
 * custom depth and distance materials; one that only shades leaves its shadows plain.
 */
export const surfacePasses = (kind: SurfaceKind): SurfacePass[] =>
  SURFACE_PASSES.filter((pass) => KINDS[kind].edits[pass] !== undefined);

/** The program cache key a patched material adds: the kind and the pass, never a look's numbers, which are uniforms. */
export const surfaceKey = (surface: Surface, pass: SurfacePass) => `surface-${surface.kind}-${pass}`;

/** A material's own uniforms for `surface` on `model`. */
export const surfaceUniforms = (surface: Surface, model: SurfaceModel): Uniforms => {
  switch (surface.kind) {
    case 'bark':
      return bark.uniforms(surface, model);
    case 'leaf':
      return leaf.uniforms(surface, model);
  }
};

/** Sets a material's uniforms to a retuned look in place, so the look changes without a recompile. */
export const tuneSurface = (uniforms: Uniforms, surface: Surface, model: SurfaceModel) =>
  retune(uniforms, surfaceUniforms(surface, model));

/**
 * Patches three's shader source for `surface` in `pass`, through the caller's `replace`, and gives the program its
 * uniforms. The caller calls it from its own compile hook and keys the program with `surfaceKey`, so its other
 * patches, their order and its program cache stay its own.
 */
export const patchSurface = (shader: SurfaceShader, surface: Surface, options: PatchOptions): void => {
  const { pass, replace, uniforms, inputs } = options;
  const kind = KINDS[surface.kind];
  const edits = kind.edits[pass];
  if (edits === undefined) throw new Error(`a ${surface.kind} surface patches no ${pass} pass; see surfacePasses`);
  const reads = kind.inputs.includes(pass);
  if (reads && inputs === undefined)
    throw new Error(`a ${surface.kind} surface's ${pass} pass reads the game's inputs, which were not given`);
  for (const { stage, anchor, code } of edits) {
    const source = stage === 'vertex' ? 'vertexShader' : 'fragmentShader';
    shader[source] = replace(shader[source], anchor, `${anchor}\n${code}`);
  }
  Object.assign(shader.uniforms, uniforms, reads ? inputs : {});
};
