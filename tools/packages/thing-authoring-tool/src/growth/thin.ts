// Thins a grown skeleton toward a sparser look after it has grown, so one species and seed draws thick or sparse
// without growing a different tree: the same trunk and limbs stand in both, and only fine branching goes. Growing at a
// lower density instead would let light and resource redistribute, and a sparse tree would no longer be that tree.
import { seededRng } from '@skelly/construct/foundation/random.ts';
import type { Skeleton } from './grow.ts';

/**
 * The order of the axes thinning keeps or cuts, each with all it bears. The trunk and first limbs below it are the
 * silhouette a species is known by; drawing again at each finer order would compound, leaving a tree far sparser than
 * its density says.
 */
const THINNED_ORDER = 2;
/** Keeps thinning's draws apart from growth's, so a seed's thinning does not echo its growth. */
const THINNING_STREAM = 0x7f_4a_7c_15;

/**
 * The internodes cut at `density` (0 to 1, 1 keeping all): each axis of the thinned order is kept, with everything it
 * bears, by chance `density`. Every such axis draws once, in growth order, whatever the density, so a sparser density
 * cuts a superset of what a thicker one cuts and nothing sparser ever draws more.
 */
export const thinned = ({ internodes }: Skeleton, density: number, seed: number): ReadonlySet<number> => {
  const draw = seededRng(seed ^ THINNING_STREAM);
  const cut = new Set<number>();
  internodes.forEach((node, index) => {
    const startsThinned = node.order === THINNED_ORDER && internodes[node.parent]!.order < node.order;
    if (cut.has(node.parent) || (startsThinned && draw() >= density)) cut.add(index);
  });
  return cut;
};
