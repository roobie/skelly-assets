// Dismemberment: which bones a "cut" at some part hides. Pure bone-topology logic only; the crowd
// texture's severed mask (crowd.ts) and deadvox's own sim/renderer wiring are separate layers built on
// top of this. What may be cut comes from each bone's disposition, so no skeleton's names are listed here.

import type { BodyRegion, Bone } from '../core/body.ts';

/** Bones a cut may start at, parents first. Cutting one also takes everything below it; see severedBoneSet. */
export const severableParts = (bones: readonly Bone[]): readonly string[] =>
  bones.filter((bone) => bone.disposition === 'sever').map((bone) => bone.id);

/** Bones whose flesh bursts on death: removed without leaving a severed part. */
export const burstBones = (bones: readonly Bone[]): readonly string[] =>
  bones.filter((bone) => bone.disposition === 'burst').map((bone) => bone.id);

/** Per hit region, the parts a cut there may start at, parents first, from the plan's region bones. */
export const regionSeverableParts = <Region extends string = BodyRegion>(
  bones: readonly Bone[],
  regionBones: Readonly<Record<Region, readonly string[]>>,
): Readonly<Record<Region, readonly string[]>> => {
  const severable = severableParts(bones);
  return Object.fromEntries(
    Object.entries<readonly string[]>(regionBones).map(([region, members]) => [
      region,
      severable.filter((id) => members.includes(id)),
    ]),
  ) as unknown as Record<Region, readonly string[]>;
};

/**
 * The full set of bone ids hidden by cutting at each bone id in `cuts`: the cut bone itself plus every
 * descendant (a cut at an upper arm takes the forearm and hand with it). Generic over any parent-linked
 * bone list; a duplicate or already-covered cut is harmless, just redundant.
 */
export const severedBoneSet = (bones: readonly Bone[], cuts: readonly string[]): ReadonlySet<string> => {
  const childrenOf = new Map<string, string[]>();
  for (const bone of bones) {
    if (bone.parent !== null) {
      const siblings = childrenOf.get(bone.parent);
      if (siblings) {
        siblings.push(bone.id);
      } else {
        childrenOf.set(bone.parent, [bone.id]);
      }
    }
  }
  const hidden = new Set<string>();
  const visit = (id: string): void => {
    if (hidden.has(id)) {
      return;
    }
    hidden.add(id);
    for (const child of childrenOf.get(id) ?? []) {
      visit(child);
    }
  };
  for (const cut of cuts) {
    visit(cut);
  }
  return hidden;
};

/**
 * Every set of cut points below `part` that a cut there may find already gone, each given by its top-most cut
 * points, the empty set first: what a cut leaves is the part less those, since each already left as a part of
 * its own. Generic over any parent-linked bone list.
 */
export const remnantCuts = (bones: readonly Bone[], part: string): readonly (readonly string[])[] => {
  const cuts = new Set(severableParts(bones));
  const parentOf = new Map(bones.map((bone) => [bone.id, bone.parent]));
  // The nearest cut point above each cut point, so the cut points form their own tree.
  const cutAbove = (id: string): string | null => {
    let parent = parentOf.get(id) ?? null;
    while (parent !== null && !cuts.has(parent)) parent = parentOf.get(parent) ?? null;
    return parent;
  };
  const below = (id: string): readonly (readonly string[])[] =>
    [...cuts]
      .filter((child) => cutAbove(child) === id)
      .reduce<readonly (readonly string[])[]>(
        (sets, child) => sets.flatMap((set) => [...below(child), [child]].map((gone) => [...set, ...gone])),
        [[]],
      );
  return below(part);
};
