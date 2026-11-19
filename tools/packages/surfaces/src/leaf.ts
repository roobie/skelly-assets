import { ANCHORS, COMMON, declarations, retune, type SurfaceKindCode, type Uniforms, uniformValues } from './glsl.ts';
import {
  LEAF_SHAPES,
  type LeafInputs,
  LeafInputsSchema,
  LeafSchema,
  type LeafSurface,
  uniformFields,
} from './schema.ts';

const FIELDS = uniformFields(LeafSchema);
const INPUT_FIELDS = uniformFields(LeafInputsSchema);

/** The inputs that leave every leaf as its look has it: no see-through anywhere. */
const NO_SEE_THROUGH: LeafInputs = { eye: [0, 0, 0], player: [0, 0, 0], nearCoverage: 1, seeRadius: 0, seeEdge: 0 };

/**
 * The game's inputs to the leaf kind as uniforms, at values that open no leaves. One record serves every leaf
 * material, so the caller sets it once a frame with `setLeafInputs`.
 */
export const leafInputs = (): Uniforms => uniformValues('leaf', INPUT_FIELDS, NO_SEE_THROUGH);

/** Sets the game's inputs in place, so every program holding them draws the new frame's values. */
export const setLeafInputs = (uniforms: Uniforms, inputs: LeafInputs) =>
  retune(uniforms, uniformValues('leaf', INPUT_FIELDS, inputs));

const VERTEX_HEAD = /* glsl */ `
varying vec3 vLeafWorld;
`;

// The cut is in world space, so the holes stay still as a model moves and match across the copies one place shows.
// three's own world position exists only under some defines, so the leaf takes its own, the way project_vertex places
// the vertex.
const VERTEX_BODY = /* glsl */ `
vec4 leafWorld = vec4(transformed, 1.0);
#ifdef USE_BATCHING
  leafWorld = batchingMatrix * leafWorld;
#endif
#ifdef USE_INSTANCING
  leafWorld = instanceMatrix * leafWorld;
#endif
vLeafWorld = (modelMatrix * leafWorld).xyz;
`;

const CELLS = /* glsl */ `
${VERTEX_HEAD}
uniform int leafShape;
const int LEAF_NEEDLE = ${LEAF_SHAPES.indexOf('needle')};
${declarations('leaf', FIELDS)}
${COMMON}
// The leaf cell nearest \`p\`, of a jittered lattice of \`leafCell\` metres: its lattice id, its centre in world metres
// and the distances, in cells, to the nearest and second-nearest centres, whose difference is how far p is from the
// cell's edge.
struct LeafCell { ivec3 id; vec3 centre; float nearest; float second; };
LeafCell leafCellAt(vec3 p) {
  vec3 q = p / leafCell;
  vec3 base = floor(q);
  LeafCell found = LeafCell(ivec3(0), vec3(0.0), 8.0, 8.0);
  for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) {
    ivec3 id = ivec3(base) + ivec3(i, j, k);
    vec3 centre = vec3(id) + 0.5 + leafJitter * (surfaceHash(id, 1u) - 0.5);
    float d = distance(centre, q);
    if (d < found.nearest) {
      found.second = found.nearest;
      found.nearest = d;
      found.id = id;
      found.centre = centre * leafCell;
    } else if (d < found.second) {
      found.second = d;
    }
  }
  return found;
}
// A cell's fixed rank in [0, 1): it is kept while its rank is below the coverage in force, so the kept share is the
// coverage and a lower coverage only adds holes.
float leafRank(LeafCell cell) { return surfaceHash(cell.id, 2u).x; }
`;

// How far into the game's see-through capsule, from the eye to the local player, \`p\` lies: 1 within the radius,
// falling to 0 over the edge beyond it.
const SEE_THROUGH = /* glsl */ `
${declarations('leaf', INPUT_FIELDS)}
float leafSeeThrough(vec3 p) {
  vec3 span = leafPlayer - leafEye;
  float t = clamp(dot(p - leafEye, span) / max(dot(span, span), 1e-8), 0.0, 1.0);
  float d = distance(p, leafEye + t * span);
  return 1.0 - clamp((d - leafSeeRadius) / max(leafSeeEdge, 1e-4), 0.0, 1.0);
}
`;

// The cut, before any lighting is spent on a cut fragment. Inside the capsule the coverage falls to the game's near
// coverage, never above the look's own, so the local view only ever opens leaves. A whole cell goes or stays, by where
// its centre lies, so the capsule's edge thins leaves rather than slicing them. The footprint is taken before the
// discard, while every fragment still runs.
const CUT_LIT = /* glsl */ `
float leafFine = surfaceFine(length(fwidth(vLeafWorld)), leafCell, leafFadeFrom, leafFadeTo);
LeafCell leafHere = leafCellAt(vLeafWorld);
float leafCoverageHere = mix(leafCoverage, min(leafCoverage, leafNearCoverage), leafSeeThrough(leafHere.centre));
if (leafRank(leafHere) >= leafCoverageHere) discard;
`;

// Shadows cut at the look's own coverage only, so the local view's opening never moves a shadow that others see.
const CUT_SHADOW = /* glsl */ `
if (leafRank(leafCellAt(vLeafWorld)) >= leafCoverage) discard;
`;

// After the colour is read: each kept leaf's own lightness, and its margin, or for needles the gaps between them,
// darker. The cut does not look at any of this, so the shading never changes which cells are kept.
const COLOUR = /* glsl */ `
vec3 leafOwn = surfaceHash(leafHere.id, 3u);
float leafGap;
if (leafShape == LEAF_NEEDLE) {
  vec3 leafRun = normalize(leafOwn * 2.0 - 1.0 + vec3(0.0, 1e-3, 0.0));
  float leafAcross = dot(vLeafWorld - leafHere.centre, leafRun) / leafCell * leafNeedles;
  leafGap = smoothstep(1.0 - leafEdgeWidth, 1.0, 2.0 * abs(leafAcross - floor(leafAcross) - 0.5));
} else {
  leafGap = 1.0 - smoothstep(0.0, leafEdgeWidth, leafHere.second - leafHere.nearest);
}
float leafShade = 1.0 + leafFine * (leafSpread * (leafOwn.x * 2.0 - 1.0) - leafEdgeDepth * leafGap);
diffuseColor.rgb *= max(leafShade, 0.0);
`;

// After the normal is set up: each leaf leans its normal its own way, within the surface's plane.
const NORMAL = /* glsl */ `
{
  vec3 leafLean = (viewMatrix * vec4(surfaceHash(leafHere.id, 4u) * 2.0 - 1.0, 0.0)).xyz;
  normal = normalize(normal + leafTilt * leafFine * (leafLean - normal * dot(leafLean, normal)));
}
`;

const SHADOW_EDITS = [
  { stage: 'vertex', anchor: ANCHORS.common, code: VERTEX_HEAD },
  { stage: 'vertex', anchor: ANCHORS.project, code: VERTEX_BODY },
  { stage: 'fragment', anchor: ANCHORS.common, code: CELLS },
  { stage: 'fragment', anchor: ANCHORS.clipping, code: CUT_SHADOW },
] as const;

/** Leaves cut every pass, the lit one by the game's inputs too, and the shadow passes by the look alone. */
export const leaf: SurfaceKindCode<LeafSurface> = {
  edits: {
    colour: [
      { stage: 'vertex', anchor: ANCHORS.common, code: VERTEX_HEAD },
      { stage: 'vertex', anchor: ANCHORS.project, code: VERTEX_BODY },
      { stage: 'fragment', anchor: ANCHORS.common, code: `${CELLS}${SEE_THROUGH}` },
      { stage: 'fragment', anchor: ANCHORS.clipping, code: CUT_LIT },
      { stage: 'fragment', anchor: ANCHORS.colour, code: COLOUR },
      { stage: 'fragment', anchor: ANCHORS.normal, code: NORMAL },
    ],
    depth: SHADOW_EDITS,
    distance: SHADOW_EDITS,
  },
  inputs: ['colour'],
  uniforms: (look: LeafSurface) => ({
    ...uniformValues('leaf', FIELDS, look),
    leafShape: { value: LEAF_SHAPES.indexOf(look.shape) },
  }),
};
