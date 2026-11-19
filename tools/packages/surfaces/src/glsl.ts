import type { UniformField } from './schema.ts';

/** A uniform as three's programs take it: plain numbers, so the package serves whichever three drew the model. */
export interface Uniform {
  value: number | number[];
}
export type Uniforms = Record<string, Uniform>;

/**
 * The program a surface patches: 'colour' is three's lit standard or physical program; 'depth' and 'distance' are
 * the depth and distance materials a renderer draws shadows with.
 */
export const SURFACE_PASSES = ['colour', 'depth', 'distance'] as const;
export type SurfacePass = (typeof SURFACE_PASSES)[number];

export type Vec3 = readonly [number, number, number];

/** What a kind reads from the model it draws: the size of the box of the faces wearing the surface, in metres. */
export interface SurfaceModel {
  readonly size: Vec3;
}

/**
 * A kind's code: its edits for each pass it patches, the passes that read the game's inputs, and its uniforms read
 * from a look.
 */
export interface SurfaceKindCode<Look> {
  readonly edits: Partial<Record<SurfacePass, readonly SurfaceEdit[]>>;
  readonly inputs: readonly SurfacePass[];
  readonly uniforms: (look: Look, model: SurfaceModel) => Uniforms;
}

/**
 * One insertion into three's raw shader source, placed right after `anchor`, an `#include <…>` line of three
 * 0.186's ShaderLib.
 */
export interface SurfaceEdit {
  readonly stage: 'vertex' | 'fragment';
  readonly anchor: string;
  readonly code: string;
}

/** The anchors the kinds hook, each in the physical (colour), depth and distance programs alike unless noted. */
export const ANCHORS = {
  common: '#include <common>',
  project: '#include <project_vertex>',
  clipping: '#include <clipping_planes_fragment>',
  /** The physical program only. */
  colour: '#include <map_fragment>',
  /** The physical program only. */
  normal: '#include <normal_fragment_maps>',
} as const;

const capitalised = (name: string) => `${name.charAt(0).toUpperCase()}${name.slice(1)}`;

/** A field's uniform name: the kind, then the field's path, camel-cased, such as `barkFurrowSpacing`. */
export const uniformName = (kind: string, path: readonly string[]) => `${kind}${path.map(capitalised).join('')}`;

/** The GLSL declarations of a kind's uniforms from its fields. */
export const declarations = (kind: string, fields: readonly UniformField[]) =>
  fields.map(({ path, type }) => `uniform ${type} ${uniformName(kind, path)};`).join('\n');

const valueAt = (source: unknown, path: readonly string[]): unknown =>
  path.reduce<unknown>((at, name) => (at as Record<string, unknown>)[name], source);

/** The uniforms holding `source`'s values of `fields`, each array copied so a later tune never writes into content. */
export const uniformValues = (kind: string, fields: readonly UniformField[], source: unknown): Uniforms =>
  Object.fromEntries(
    fields.map(({ path }) => {
      const value = valueAt(source, path);
      return [uniformName(kind, path), { value: Array.isArray(value) ? [...value] : (value as number) }];
    }),
  );

/**
 * Sets `uniforms` to `values` in place, so a program that already holds the uniforms draws the new values without a
 * recompile. A name the program lacks means the surface changed kind, which only a recompile serves.
 */
export const retune = (uniforms: Uniforms, values: Uniforms) => {
  for (const [name, { value }] of Object.entries(values)) {
    const uniform = uniforms[name];
    if (uniform === undefined) throw new Error(`no uniform ${name} to tune; a surface of another kind recompiles`);
    if (Array.isArray(value) && Array.isArray(uniform.value)) uniform.value.splice(0, uniform.value.length, ...value);
    else uniform.value = value;
  }
};

/**
 * Hashing, noise and a pixel's footprint, shared by the kinds. The hash works on integer lattice cells rather than
 * `sin`, so a cell far from the origin hashes the same on every GPU and its rank never shimmers.
 */
export const COMMON = /* glsl */ `
uvec3 surfacePcg(uvec3 v) {
  v = v * 1664525u + 1013904223u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  v ^= v >> 16u;
  v.x += v.y * v.z; v.y += v.z * v.x; v.z += v.x * v.y;
  return v;
}
// Three values in [0, 1) for a lattice cell and a seed. The cell is offset to stay positive, since a negative int's
// conversion to uint is not defined in GLSL ES 3.0; that holds for a million cells either side of the origin.
vec3 surfaceHash(ivec3 cell, uint seed) {
  uvec3 h = surfacePcg(uvec3(cell + 1048576) + uvec3(seed * 7919u, seed * 104729u, seed * 1299709u));
  return vec3(h >> 8u) / 16777216.0;
}
// Smooth value noise in [0, 1], its mean exactly one half, because each corner's hash is uniform.
float surfaceNoise(vec3 p, uint seed) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  ivec3 c = ivec3(i);
  return mix(
    mix(mix(surfaceHash(c, seed).x, surfaceHash(c + ivec3(1, 0, 0), seed).x, f.x),
        mix(surfaceHash(c + ivec3(0, 1, 0), seed).x, surfaceHash(c + ivec3(1, 1, 0), seed).x, f.x), f.y),
    mix(mix(surfaceHash(c + ivec3(0, 0, 1), seed).x, surfaceHash(c + ivec3(1, 0, 1), seed).x, f.x),
        mix(surfaceHash(c + ivec3(0, 1, 1), seed).x, surfaceHash(c + ivec3(1, 1, 1), seed).x, f.x), f.y),
    f.z);
}
// The narrow side of the patch of surface a pixel covers at \`p\`, scaled to match a face-on footprint: the smaller
// singular value of p's screen derivatives, its square taken as the determinant over the larger eigenvalue, which does
// not cancel to noise on a grazing face. It grows with distance alone, so a field faded by it does not band where a
// stepped surface turns.
float surfaceNarrowSide(vec3 p) {
  vec3 dx = dFdx(p), dy = dFdy(p);
  float xx = dot(dx, dx), yy = dot(dy, dy), xy = dot(dx, dy);
  float mean = 0.5 * (xx + yy), spread = sqrt(0.25 * (xx - yy) * (xx - yy) + xy * xy);
  return sqrt(2.0 * max(xx * yy - xy * xy, 0.0) / max(mean + spread, 1e-30));
}
// How much of a detail \`size\` metres across still shows where a pixel spans \`pixel\` metres: all of it until it
// is \`from\` features per pixel, none from \`to\`.
float surfaceFine(float pixel, float size, float from, float to) {
  return 1.0 - smoothstep(from, to, pixel / max(size, 1e-6));
}
`;
