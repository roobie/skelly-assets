import {
  ANCHORS,
  COMMON,
  declarations,
  type SurfaceKindCode,
  type SurfaceModel,
  uniformName,
  uniformValues,
  type Vec3,
} from './glsl.ts';
import { BarkSchema, type BarkSurface, uniformFields } from './schema.ts';

const FIELDS = uniformFields(BarkSchema);

/**
 * The axis a bark's furrows run along, in model axes: up for a standing trunk, or the longest side of the box of the
 * faces wearing it, so a log lying on the ground reads as a log. On a tie the earlier axis, x before y before z, wins.
 */
export const grainAxis = (bark: BarkSurface, size: Vec3): Vec3 => {
  if (bark.grain === 'up') return [0, 1, 0];
  const longest = size.indexOf(Math.max(...size));
  return [longest === 0 ? 1 : 0, longest === 1 ? 1 : 0, longest === 2 ? 1 : 0];
};

const VERTEX_HEAD = /* glsl */ `
varying vec3 vBarkPosition;
varying vec3 vBarkNormal;
varying mat3 vBarkToView;
`;

// The pattern lies in the mesh's own coordinates, so its directions go to view space the way the mesh's do, and a
// skinned, instanced or batched copy tilts its normal along the furrows it shows.
const VERTEX_BODY = /* glsl */ `
vBarkPosition = position;
vBarkNormal = normal;
vBarkToView = mat3(modelViewMatrix);
#ifdef USE_INSTANCING
  vBarkToView = vBarkToView * mat3(instanceMatrix);
#endif
#ifdef USE_BATCHING
  vBarkToView = vBarkToView * mat3(batchingMatrix);
#endif
#ifdef USE_SKINNING
  vBarkToView = vBarkToView * mat3(skinMatrix);
#endif
`;

const FRAGMENT_HEAD = /* glsl */ `
${VERTEX_HEAD}
uniform vec3 barkAxis;
${declarations('bark', FIELDS)}
${COMMON}
// A groove's darkness at \`phase\`, its centre on each whole number and \`width\` its half-width in phases: 1 at the
// centre, none from \`width\` out. Its mean over a phase is exactly \`width\`, which the shade subtracts so that the
// plates lighten by what the grooves darken.
float barkGroove(float phase, float width) {
  return 1.0 - smoothstep(0.0, width, abs(phase - floor(phase + 0.5)));
}

// The bark at \`at\`, metres across and along the grain in a face's plane, with plates \`plateLength\` long: x is the
// height in metres and y the lightness offset from the colour. \`fineFurrow\` and \`fineCrack\` fade what a pixel cannot
// hold. Furrows run at whole phases across the grain, wandering sideways; each plate column is cut by cross cracks
// at its own offset along the grain, so the plates stagger.
vec2 barkPattern(vec2 at, float plateLength, float fineFurrow, float fineCrack) {
  float phase = at.x / barkFurrowSpacing
    + barkFurrowWander * (surfaceNoise(vec3(at / barkFurrowWanderLength, 0.0), 1u) * 2.0 - 1.0);
  float column = floor(phase);
  float along = at.y / plateLength + surfaceHash(ivec3(int(column), 0, 0), 2u).x;
  vec3 plate = surfaceHash(ivec3(int(column), int(floor(along)), 0), 3u);
  float furrow = barkGroove(phase, barkFurrowWidth);
  float crack = barkGroove(along, barkPlateCrack);
  // A groove's walls slope by the relief whatever its width; a plate's lean dies into its grooves, so the height stays
  // continuous where one plate meets the next.
  float height = -barkRelief * (fineFurrow * barkFurrowWidth * barkFurrowSpacing * furrow
      + fineCrack * barkPlateCrack * plateLength * crack)
    + barkPlateTilt * fineFurrow * (plate.y * 2.0 - 1.0) * (fract(phase) - 0.5) * barkFurrowSpacing
      * (1.0 - max(furrow, crack));
  float shade = fineFurrow * (barkFurrowDepth * (barkFurrowWidth - furrow) + barkPlateSpread * (plate.x * 2.0 - 1.0))
    + fineCrack * barkPlateCrackDepth * (barkPlateCrack - crack);
  return vec2(height, shade);
}

// One field of marks at \`at\`, metres across and along the grain, on a lattice of \`cell\`: a mark's darkness less
// the field's mean, which is the share of cells marked times the area under an ellipse's profile, 0.3π times the
// product of its half-axes, so marks darken without shifting the colour's mean.
float barkMarks(vec2 at, vec2 cell, vec2 size, float density, uint seed) {
  vec2 q = at / cell;
  vec2 corner = floor(q);
  vec3 h = surfaceHash(ivec3(ivec2(corner), 0), seed);
  vec2 extent = 0.5 * size;
  vec2 centre = extent + h.xy * (1.0 - 2.0 * extent);
  float reach = length((q - corner - centre) / max(extent, vec2(1e-4)));
  float mark = h.z < density ? 1.0 - smoothstep(0.0, 1.0, reach) : 0.0;
  return mark - density * 0.3 * PI * extent.x * extent.y;
}
`;

/** The lightness a field of marks takes off, faded once its marks are finer than a pixel. */
const marks = (set: 'lenticels' | 'patches', seed: number) => {
  const u = (field: string) => uniformName('bark', [set, field]);
  return /* glsl */ `${u('depth')}
    * surfaceFine(barkPixel, min(${u('across')} * ${u('cellAcross')}, ${u('along')} * ${u('cellAlong')}), barkFadeFrom, barkFadeTo)
    * barkMarks(barkAt, vec2(${u('cellAcross')}, ${u('cellAlong')}), vec2(${u('across')}, ${u('along')}), ${u('density')}, ${seed}u)`;
};

// After the colour is read: the plane the pattern lies in, picked by the face's normal against the grain, and the
// pattern's lightness on the diffuse colour. A face along the grain has furrows down it; an end face, whose normal runs
// with the grain, has no grain direction, so it takes plates as long as they are wide. The mottle is one field through
// the wood, faded by the footprint's narrow side, so it outlasts the rest and a stepped surface does not band.
const COLOUR = /* glsl */ `
vec3 barkGrain = normalize(barkAxis);
vec3 barkSide = normalize(cross(barkGrain, abs(barkGrain.x) < 0.9 ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 1.0, 0.0)));
vec3 barkOtherSide = cross(barkGrain, barkSide);
float barkFacingSide = abs(dot(vBarkNormal, barkSide));
float barkFacingOther = abs(dot(vBarkNormal, barkOtherSide));
bool barkEnd = abs(dot(vBarkNormal, barkGrain)) >= max(barkFacingSide, barkFacingOther);
vec3 barkAcross = barkEnd || barkFacingSide < barkFacingOther ? barkSide : barkOtherSide;
vec3 barkAlong = barkEnd ? barkOtherSide : barkGrain;
float barkLength = barkEnd ? barkFurrowSpacing : barkPlateLength;
vec2 barkAt = vec2(dot(vBarkPosition, barkAcross), dot(vBarkPosition, barkAlong));
float barkPixel = length(fwidth(vBarkPosition));
float barkFineFurrow = surfaceFine(barkPixel, 2.0 * barkFurrowWidth * barkFurrowSpacing, barkFadeFrom, barkFadeTo);
float barkFineCrack = surfaceFine(barkPixel, 2.0 * barkPlateCrack * barkLength, barkFadeFrom, barkFadeTo);
float barkMottleFine = surfaceFine(surfaceNarrowSide(vBarkPosition), barkMottleSpan, barkFadeFrom, barkFadeTo);
vec2 barkHere = barkPattern(barkAt, barkLength, barkFineFurrow, barkFineCrack);
float barkMarked = barkEnd ? 0.0 : ${marks('lenticels', 4)}
  + ${marks('patches', 5)};
float barkMottle = barkMottleAmount * barkMottleFine * (surfaceNoise(vBarkPosition / barkMottleSpan, 6u) * 2.0 - 1.0);
diffuseColor.rgb *= max(1.0 + barkHere.y - barkMarked + barkMottle, 0.0);
`;

// After the normal is set up: the pattern's slope tilts it, read a step either way across and along the grain.
const NORMAL = /* glsl */ `
{
  vec2 barkStep = vec2(0.25 * barkFurrowWidth * barkFurrowSpacing, 0.25 * barkPlateCrack * barkLength);
  vec2 barkSlope = vec2(
    barkPattern(barkAt + vec2(barkStep.x, 0.0), barkLength, barkFineFurrow, barkFineCrack).x
      - barkPattern(barkAt - vec2(barkStep.x, 0.0), barkLength, barkFineFurrow, barkFineCrack).x,
    barkPattern(barkAt + vec2(0.0, barkStep.y), barkLength, barkFineFurrow, barkFineCrack).x
      - barkPattern(barkAt - vec2(0.0, barkStep.y), barkLength, barkFineFurrow, barkFineCrack).x
  ) / (2.0 * barkStep);
  vec3 barkAcrossView = normalize(vBarkToView * barkAcross);
  vec3 barkAlongView = normalize(vBarkToView * barkAlong);
  normal = normalize(normal - faceDirection * (barkSlope.x * barkAcrossView + barkSlope.y * barkAlongView));
}
`;

/** Bark draws only on the lit surface; it cuts nothing, so its shadows are the plain ones. */
export const bark: SurfaceKindCode<BarkSurface> = {
  edits: {
    colour: [
      { stage: 'vertex', anchor: ANCHORS.common, code: VERTEX_HEAD },
      { stage: 'vertex', anchor: ANCHORS.project, code: VERTEX_BODY },
      { stage: 'fragment', anchor: ANCHORS.common, code: FRAGMENT_HEAD },
      { stage: 'fragment', anchor: ANCHORS.colour, code: COLOUR },
      { stage: 'fragment', anchor: ANCHORS.normal, code: NORMAL },
    ],
  },
  inputs: [],
  uniforms: (look: BarkSurface, model: SurfaceModel) => ({
    ...uniformValues('bark', FIELDS, look),
    barkAxis: { value: [...grainAxis(look, model.size)] },
  }),
};
