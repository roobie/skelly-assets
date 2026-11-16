import {
  type AnchorFrame,
  type NamedAnchors,
  type PartAnchorDeclaration,
  type ResolvedAnchors,
  resolveAnchors,
} from '@skelly/construct/assembly/anchors.ts';
import type { Resolved } from '@skelly/construct/assembly/schema.ts';

/** Gun-domain names; core treats these as caller-supplied strings. */
export type GunAnchorName = 'hold' | 'support' | 'butt' | 'muzzle' | 'ejection' | 'magwell' | 'loading_port';

export interface SelectedAnchors {
  readonly hold: AnchorFrame;
  readonly others: Readonly<Record<string, AnchorFrame>>;
  /** The part each of `others` was selected from, so the export can read that part's drawn faces. */
  readonly sourceParts?: Readonly<Partial<Record<GunAnchorName, string>>>;
}

export type AnchorSelectionError =
  | { readonly code: 'missing-required-anchor'; readonly name: string }
  | { readonly code: 'ambiguous-anchor'; readonly name: string; readonly candidates: readonly string[] };

export type GunPartAnchors = NamedAnchors<GunAnchorName>;

/** Domain-specific family declaration; returned frames are local to that part. */
type GunPartAnchorDeclaration = PartAnchorDeclaration<GunAnchorName>;

/** `grip` includes a standalone grip or an integrated firing grip; stock wrists are fallback. */
type GunHoldAnchorRank = 'grip' | 'firing-grip-stock';
type GunHoldAnchorPrecedence = readonly ['grip', 'firing-grip-stock'];

interface GunAnchorDeclaration {
  readonly anchors: GunPartAnchorDeclaration;
  /** Required for a declaration that supplies `hold`; equal-rank candidates are ambiguous. */
  readonly holdRank?: GunHoldAnchorRank;
}

/**
 * Registry key -> named local anchors and optional hold-candidate rank.
 *
 * Keyed by the registry key (the key in `FAMILIES`, e.g. `'ak-receiver'`, the same string an assembly's
 * `PartInstance.family` holds), not by `PartDef.family`. Anchors depend on the geometry and params of the
 * builder recipe (`'frame'` and `'grip'` both build a firing grip, with different local frames), whereas
 * compatibility and rules use the `PartDef.family` role, which several recipes share.
 */
export type GunAnchorDeclarations = Readonly<Record<string, GunAnchorDeclaration>>;

/** Gun policy to be applied after generic core anchor resolution. */
export interface GunAnchorSelectionPolicy {
  readonly holdPrecedence: GunHoldAnchorPrecedence;
  readonly equalRank: 'ambiguous';
}

/** Signature only; gun-domain policy selects the hold before the generic core exporter runs. */
export type SelectGunAnchors = (
  resolved: Resolved,
  declarations: GunAnchorDeclarations,
  policy: GunAnchorSelectionPolicy,
) => SelectedAnchors | AnchorSelectionError;

/** The documented policy: a grip outranks a `FIRING_GRIP` stock; equal ranks are ambiguous. */
export const GUN_ANCHOR_POLICY: GunAnchorSelectionPolicy = {
  holdPrecedence: ['grip', 'firing-grip-stock'],
  equalRank: 'ambiguous',
};

const OTHER_ANCHORS = [
  'support',
  'butt',
  'muzzle',
  'ejection',
  'magwell',
  'loading_port',
] as const satisfies readonly GunAnchorName[];

/**
 * Resolves every declared anchor into assembly space (core), then applies the gun policy. The `hold` comes
 * from the best-ranked candidates; two candidates of that rank are ambiguous and no `hold` is an error.
 * The `muzzle` is the frontmost candidate along its own forward, so a built-in muzzle device threaded on a
 * barrel outranks the barrel. Other names take the candidate on the lowest part id, so the choice is deterministic.
 */
export const selectGunAnchors: SelectGunAnchors = (resolved, declarations, policy) => {
  const frames = resolveAnchors(
    resolved,
    Object.fromEntries(Object.entries(declarations).map(([key, d]) => [key, d.anchors])),
  );
  const ids = Object.keys(frames).sort();
  const candidatesAt = (rank: GunHoldAnchorRank) =>
    ids.filter((id) => {
      const decl = declarations[resolved.assembly.parts[id]!.family]!;
      return frames[id]!.hold && decl.holdRank === rank;
    });
  for (const rank of policy.holdPrecedence) {
    const candidates = candidatesAt(rank);
    if (candidates.length > 1) {
      return { code: 'ambiguous-anchor', name: 'hold', candidates };
    }
    if (candidates.length === 1) {
      return selectOthers(frames, ids, frames[candidates[0]!]!.hold!);
    }
  }
  return { code: 'missing-required-anchor', name: 'hold' };
};

const along = ({ position, forward }: AnchorFrame): number =>
  position[0] * forward[0] + position[1] * forward[1] + position[2] * forward[2];

/** The part whose muzzle lies furthest along its own forward; the first of equals. */
const frontmostMuzzle = (frames: ResolvedAnchors<GunAnchorName>, declaring: readonly string[]): string =>
  declaring.reduce((best, id) => (along(frames[id]!.muzzle!) > along(frames[best]!.muzzle!) ? id : best));

const selectOthers = (
  frames: ResolvedAnchors<GunAnchorName>,
  ids: readonly string[],
  hold: AnchorFrame,
): SelectedAnchors => {
  const others: Partial<Record<GunAnchorName, AnchorFrame>> = {};
  const sourceParts: Partial<Record<GunAnchorName, string>> = {};
  for (const name of OTHER_ANCHORS) {
    const declaring = ids.filter((id) => frames[id]![name]);
    const [first] = declaring;
    if (!first) {
      continue;
    }
    const source = name === 'muzzle' ? frontmostMuzzle(frames, declaring) : first;
    others[name] = frames[source]![name]!;
    sourceParts[name] = source;
  }
  return { hold, others, sourceParts };
};
