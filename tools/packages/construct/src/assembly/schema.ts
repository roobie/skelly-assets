// Domain-agnostic data model: parts, ports, keep-out volumes, assemblies.
// Everything domain-specific (which parts and mount types exist) is data
// supplied through a Domain.

import type { Motion, StageMove } from '@skelly/motion/motion';
import type { Issue } from '../foundation/issue.ts';
import type { ExtrusionAxis, Transform, Vec3 } from '../foundation/math.ts';
import type { Box, DomainUnits, Solid, Vec2 } from '../shapes/solid.ts';

export type Gender = 'male' | 'female';

/** How the part met at a port comes off and goes on: in a slot by hand, or as a job of a kind the domain names. */
export type SwapPath = { readonly path: 'slot' } | { readonly path: 'job'; readonly job: string };

/**
 * A connection point. Its frame is: origin `pos`, local X = `normal`
 * (pointing out of the part), local Y = `up` (the roll reference, which must
 * be perpendicular to `normal`), local Z = normal × up.
 */
export interface PortDef {
  readonly id: string;
  readonly mount: string;
  readonly gender: Gender;
  /** The interface's own size, which its builder derives from its params. When both sides have one, they must match. */
  readonly size?: string;
  /**
   * The interchange class domain content gives the port, so a part of one design can be matched to a site of another.
   * When both sides have one, they must match.
   */
  readonly sizeClass?: string;
  readonly swap?: SwapPath;
  /**
   * What the interface is built for within its mount type, such as a thread cut. Both sides of a connection declare
   * the same standard or neither does, so fit is a property of both parts rather than of whichever side declares it.
   */
  readonly standard?: string;
  /**
   * The standards a port that holds whatever is put in it takes, rather than one it shares with its mate: a stowage
   * slot takes any item whose stowage port declares one of them.
   */
  readonly accepts?: readonly string[];
  /** The space, in this port's frame, that whatever is met at the port must stay inside. */
  readonly envelope?: { readonly min: Vec3; readonly max: Vec3 };
  readonly pos: Vec3;
  readonly normal: Vec3;
  readonly up: Vec3;
  readonly required?: boolean;
  /** One-to-many ports (e.g. a rail). Slot k sits at pos + up * k * pitch. */
  readonly slots?: { readonly count: number; readonly pitch: number };
}

/** Exact convex profiles tighten conservative broad-phase bounds for keep-outs. */
export interface KeepOut {
  readonly id: string;
  readonly kind: string;
  /** Conservative local bounds; also retained for callers that inspect simple keep-outs. */
  readonly box: Box;
  /** Optional exact convex keep-out profile, using the same axis plane ordering as ExtrudedPolygonSolid. */
  readonly profile?: readonly Vec2[];
  /** Extrusion direction; omission keeps existing keep-outs on local Z. */
  readonly axis?: ExtrusionAxis;
  /** Bounds along `axis` (legacy name `z` retained for existing keep-outs). */
  readonly z?: readonly [number, number];
  /** The part attached at this port of the owner may occupy the volume. */
  readonly allowPort?: string;
  /** Parts from these families may occupy the volume (e.g. an attached part inside a designated clearance volume). */
  readonly allowFamilies?: readonly string[];
  /** Any part's solids in these slots may occupy the volume (e.g. see-through glass on a sightline). */
  readonly allowSlots?: readonly string[];
}

/** A named axis on a part for domain-defined rules. */
export interface Axis {
  readonly kind: string;
  /** What the axis is to its domain among axes of the same kind, for rules that treat them differently. */
  readonly role?: string;
  readonly origin: Vec3;
  readonly dir: Vec3;
  readonly referenceDistanceU?: number;
}

/** A slide's travel taken from a keep-out of the part met at one of its ports: twice the keep-out's reach along the slide. */
export interface KeepOutTravel {
  readonly port: string;
  readonly keepOut: string;
}

/** A stage as a part authors it: in the part's units, and a slide may leave its travel to a keep-out. */
export type PartStage =
  | Extract<StageMove, { readonly kind: 'hinge' }>
  | (Omit<Extract<StageMove, { readonly kind: 'slide' }>, 'travel'> & { readonly travel: number | KeepOutTravel });

/**
 * A named place on a part's clock, given as how far one stage has moved: in the stage's own measure, so a slide's
 * offset is in the part's units whatever travel its keep-out turns out to give it, and a hinge's is in degrees.
 */
export interface PartStop {
  readonly name: string;
  /** The stage the stop lies on. */
  readonly stage: number;
  /** How far that stage has moved there, signed as the stage's own travel or angle; omitted, the stage's end. */
  readonly at?: number;
}

/**
 * How a part moves, in its own frame and units, before the assembly has given every slide its travel. `resolve` turns
 * it into the part's `Motion`.
 */
export interface PartMotion {
  /** The stages in the order they run; every stage is given in the part's rest frame and the first carries the rest. */
  readonly stages: readonly PartStage[];
  /**
   * The stops in the order the clock reaches them, the first at the rest (`at: 0` on the first stage) and the last at
   * the end of the last stage. Omitted, they are `rest` and `open`.
   */
  readonly stops?: readonly PartStop[];
}

/**
 * What a part does with a feature too thin for the export grain; the reason of an exaggeration is the part's to give.
 * A smooth feature is drawn by the smooth pieces of the part (`SolidDisplayHints.smooth`) named after it, by its name
 * alone or its name and a dashed suffix, which no grain reaches.
 */
export type FeatureDisposition =
  | { readonly kind: 'exaggerated'; readonly reason: string }
  | { readonly kind: 'detail' | 'omitted' | 'smooth' };

/** A thin feature a part authors at its real size; `disposition` says how the export carries it, if it must. */
export interface PartFeature {
  readonly name: string;
  /** The feature's thickness, in domain units. */
  readonly size: number;
  readonly disposition?: FeatureDisposition;
}

export interface PartDef {
  readonly family: string;
  /** Optional finish override for attachments or aftermarket parts. */
  readonly material?: string;
  /** Optional material slot override; otherwise selected from the part role. */
  readonly slot?: string;
  readonly ports: readonly PortDef[];
  readonly solids: readonly Solid[];
  /** Optional higher-resolution scene tessellation; never used for collision checks. */
  readonly displaySolids?: readonly Solid[];
  readonly keepOuts: readonly KeepOut[];
  readonly axes: readonly Axis[];
  /** How the part moves, if it does; `Resolved.motions` holds it once resolved. */
  readonly motion?: PartMotion;
  /** Free-form labels that domain rules can look for. */
  readonly tags?: readonly string[];
  /** The part's thin features, for domain rules that judge them against an export grain. */
  readonly features?: readonly PartFeature[];
}

/** Where a param can read its value from: the part on one of our ports. */
interface ParamSource {
  /** Our port; the part connected there is the neighbour. */
  readonly port: string;
  /** The neighbour's param to copy. */
  readonly param: string;
}

export interface ParamSpec {
  readonly values: readonly string[];
  readonly default: string;
  /** Values that exist only for broken fixtures, which a design must not choose. */
  readonly fault?: readonly string[];
  /**
   * When the assembly doesn't set this param, take it from a neighbour: the
   * first source whose port is connected wins. Otherwise use the default.
   */
  readonly from?: readonly ParamSource[];
}

export interface PartFamily {
  readonly name: string;
  readonly params: Readonly<Record<string, ParamSpec>>;
  /** Returns a structure-issue message when resolved params cannot form this family. */
  readonly validateParams?: (params: Readonly<Record<string, string>>) => string | undefined;
  readonly build: (params: Readonly<Record<string, string>>) => PartDef;
}

interface AxisRule {
  readonly kind: string;
  /** collinear: on the main axis. parallel: same direction as the main axis. */
  readonly mode: 'collinear' | 'parallel';
}

export interface Rule {
  readonly id: string;
  readonly title: string;
  readonly check: (r: Resolved) => Issue[];
}

export interface Domain {
  readonly name: string;
  readonly units: DomainUnits;
  readonly families: Readonly<Record<string, PartFamily>>;
  /** Mount-specific maximum nesting allowances; unspecified mounts use `TOLERANCE.interface`. */
  readonly mountAllowances?: Readonly<Record<string, number>>;
  readonly axisRules: readonly AxisRule[];
  /** Domain-specific rules, run after the core rules. */
  readonly rules?: readonly Rule[];
}

// ---- Assembly file format (JSON) ----

export interface PrefabReference {
  readonly id: string;
  /** Positive integer catalogue revision; the design loader/catalogue check this at runtime. */
  readonly version: number;
}

export interface PartAppearance {
  /** Per-instance finish by material slot, independent of the host assembly's finish. */
  readonly finish?: Readonly<Record<string, string>>;
  /** Finish slots that take a paint the host sets on this copy; every other slot keeps its authored material. */
  readonly paintable?: readonly string[];
}

export interface PartInstance {
  readonly family: string;
  readonly params?: Readonly<Record<string, string>>;
  /** Appearance belongs to this part instance, not to the assembly it is fitted to. */
  readonly appearance?: PartAppearance;
  /** Present on curated designs; legacy assemblies need no prefab reference. */
  readonly prefab?: PrefabReference;
}

export interface Connection {
  /** "partId.portId" */
  readonly from: string;
  /** "partId.portId" */
  readonly to: string;
  /**
   * Slot on the `from` port, for slotted ports. A negative slot counts from the port's far end, -1 its last, so a seat
   * at a rail's end holds whatever the rail's length.
   */
  readonly slot?: number;
  /** Roll about the `from` port's normal, in degrees; a multiple of 90. */
  readonly roll?: number;
}

export interface Assembly {
  readonly name: string;
  readonly description?: string;
  readonly root: string;
  /** Where the root part sits in the assembly frame, so a part laid out in another frame is turned once; the identity when absent. */
  readonly rootPlacement?: Transform;
  readonly parts: Readonly<Record<string, PartInstance>>;
  readonly connections: readonly Connection[];
  /** For fixtures: the rule ids this assembly is expected to fail. */
  readonly expect?: readonly string[];
}

// ---- Resolved assembly ----
// Defined here, not in resolve.ts, because a Rule checks a Resolved and a Resolved holds its Domain:
// the three refer to each other, so they share one module.

/** A param's final value and where it came from. */
export interface ResolvedParam {
  readonly value: string;
  readonly source: 'set' | 'inherited' | 'default';
  /** For inherited values: the neighbour's param, as "part.param". */
  readonly from?: string;
}

export interface PortRef {
  readonly part: string;
  readonly port: PortDef;
}

export interface ResolvedConnection {
  readonly index: number;
  readonly conn: Connection;
  readonly from: PortRef;
  readonly to: PortRef;
  /** tree: placed a part. loop: both parts were already placed. */
  readonly role: 'tree' | 'loop' | 'unplaced';
}

export interface Resolved {
  readonly assembly: Assembly;
  readonly domain: Domain;
  /** Built definitions of every valid part instance; their `motion` has moved to `motions`. */
  readonly defs: ReadonlyMap<string, Omit<PartDef, 'motion'>>;
  /** The motion of each part that moves, in its own frame and units. */
  readonly motions: ReadonlyMap<string, Motion>;
  /** The params each valid part was built with. */
  readonly params: ReadonlyMap<string, Readonly<Record<string, ResolvedParam>>>;
  /** Transforms of the parts that could be placed. */
  readonly placed: ReadonlyMap<string, Transform>;
  /** Connections that are structurally valid. */
  readonly connections: readonly ResolvedConnection[];
  /** Structure issues. */
  readonly issues: readonly Issue[];
}
