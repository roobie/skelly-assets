// What the Node drivers ask of the page, kept free of three so the drivers can enumerate it too.
import type { SurfacePass, Vec3 } from '../../../src/patch.ts';
import type { LeafInputs, Surface } from '../../../src/schema.ts';

/** The three programs a surface patches as a game draws them: the lit materials, and the shadow maps' materials. */
export const PROGRAMS = {
  colour: ['standard', 'physical'],
  depth: ['depth'],
  distance: ['distance'],
} as const satisfies Record<SurfacePass, readonly string[]>;
export type Program = (typeof PROGRAMS)[SurfacePass][number];

/** The ways a game draws one mesh, each a different program of the same material. */
export const VARIANTS = ['plain', 'instanced', 'skinned', 'batched'] as const;
export type Variant = (typeof VARIANTS)[number];

export interface CompileCase {
  readonly surface: Surface;
  readonly pass: SurfacePass;
  readonly program: Program;
  readonly variant: Variant;
  /** Adds a line that cannot compile, so a run can show the page reports a broken program at all. */
  readonly broken: boolean;
}

/** A square orthographic view straight onto the box's front face: its centre, its width in metres and in pixels. */
export interface View {
  readonly centre: readonly [number, number];
  readonly width: number;
  readonly pixels: number;
}

export type Light = 'none' | 'ambient' | 'directional';

export interface DrawSpec {
  /** None draws the plain finish, for a patched render to be held against. */
  readonly surface?: Surface;
  readonly pass: SurfacePass;
  readonly colour: Vec3;
  /** The box drawn, centred on the origin and wider than the view, so its front face fills the view. */
  readonly model: Vec3;
  readonly view: View;
  readonly light: Light;
  readonly inputs?: LeafInputs;
}

/** The pixels whose centres lie between `from` and `to` metres of `centre`, in the plane of the view. */
export interface Ring {
  readonly centre: readonly [number, number];
  readonly from: number;
  readonly to: number;
}
