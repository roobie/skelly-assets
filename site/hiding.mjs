// @ts-check
// What a worn piece stops being drawn of the doll while it is worn, shared by the showcase, the pose page and the build's
// check that a piece encloses what it hides. A piece's site (tools/dress.mjs, `wornSites`) names in `covers` the doll
// part copy it is drawn on, which hides the whole part, or regions of it, which hide the primitives the export keeps as
// those pieces. Why the body is hidden by region rather than by slot is in docs/decisions/0012-hidden-body.md.

/**
 * What hiding reads of a three.js node, and sets: stated here, since the modules that check this one do not all
 * resolve three's own types.
 * @typedef {object} SceneNode
 * @property {SceneNode | null} parent
 * @property {Record<string, any>} userData
 * @property {boolean} visible
 * @property {boolean} [isMesh]
 * @property {{ userData: Record<string, any> }} [geometry] a mesh's
 * @property {(visit: (node: SceneNode) => void) => void} traverse
 */

/**
 * Whether a piece's `covers` hides a primitive of the doll part `part` that the export marks as `piece`, if any.
 * @param {readonly string[]} covers
 * @param {string} part
 * @param {string | undefined} piece
 */
export const hides = (covers, part, piece) => covers.includes(part) || (piece !== undefined && covers.includes(piece));

// The part a node belongs to: the nearest node up its tree that marks one, as the export marks a part node.
/** @param {SceneNode} node */
const partOf = (node) => {
  /** @type {SceneNode | null} */
  let at = node;
  for (; at; at = at.parent) if (at.userData.part !== undefined) return at.userData.part;
  return undefined;
};

/**
 * Hides each doll primitive a worn site covers, in `groups`, the sites' models in site order, where every worn site's
 * `bodySite` indexes the doll site that draws the part copy it is drawn on.
 * @param {readonly SceneNode[]} groups
 * @param {readonly { covers?: readonly string[] | undefined; bodySite?: number | undefined; part?: string | undefined }[]} sites
 */
export function hideCovered(groups, sites) {
  for (const { covers, bodySite, part } of sites) {
    if (!covers) continue;
    const group = bodySite === undefined ? undefined : groups[bodySite];
    if (group === undefined || part === undefined) throw new Error(`a site that covers names no doll site ${bodySite}`);
    group.traverse((node) => {
      if (node.isMesh && partOf(node) === part && hides(covers, part, node.geometry?.userData.piece))
        node.visible = false;
    });
  }
}
