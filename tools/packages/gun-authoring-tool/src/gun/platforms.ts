import type { PortDef, Resolved, SwapPath } from '@skelly/construct/assembly/schema.ts';
import {
  array,
  gtValue,
  type InferOutput,
  literal,
  nonEmpty,
  number,
  optional,
  parse,
  pipe,
  record,
  regex,
  strictObject,
  string,
  variant,
} from 'valibot';
import content from '../../../../../models/guns/tables/platforms.json' with { type: 'json' };

const Id = pipe(string(), nonEmpty());
const SwapSchema = variant('path', [
  strictObject({ path: literal('slot') }),
  strictObject({ path: literal('job'), job: Id }),
]);
const SOURCE_KIND = /^(traced|sourced|derived): \S/;
const DimensionSchema = strictObject({
  mm: pipe(number(), gtValue(0)),
  source: pipe(
    string(),
    regex(SOURCE_KIND, "a source reads 'traced: <trace key>', 'sourced: <URL>' or 'derived: <reason>'"),
  ),
});
const StandardSchema = strictObject({ dimensions: record(Id, DimensionSchema) });
const MountSchema = strictObject({ swap: SwapSchema, standards: optional(record(Id, StandardSchema)) });
const PlatformSchema = strictObject({ sizeClasses: pipe(array(Id), nonEmpty()), shared: optional(record(Id, Id)) });
const PlatformsSchema = strictObject({
  jobs: array(Id),
  mounts: record(Id, MountSchema),
  platforms: record(Id, PlatformSchema),
});

interface Platform {
  readonly sizeClasses: readonly string[];
  /** The class of each mount type its frames share, in place of the frame's own. */
  readonly shared: Readonly<Record<string, string>>;
}

/** A port standard of a mount type and the dimensions, in millimetres, that define it, each with its source. */
type PortStandard = InferOutput<typeof StandardSchema>;

export interface GunPlatforms {
  /** The standards each mount type lists; its ports may declare no others, and a mount type absent here lists none. */
  readonly standards: ReadonlyMap<string, ReadonlyMap<string, PortStandard>>;
  readonly swaps: ReadonlyMap<string, SwapPath>;
  readonly platforms: ReadonlyMap<string, Platform>;
}

/** The platform a design belongs to and the frame size class it is built on. */
export interface PlatformChoice {
  readonly id: string;
  readonly sizeClass: string;
}

/** Checks the authored table against itself; a bad table is a build error, not a design issue. */
const loadGunPlatforms = (raw: unknown): GunPlatforms => {
  const parsed = parse(PlatformsSchema, raw);
  const jobs = new Set(parsed.jobs);
  const problems = [
    ...Object.entries(parsed.mounts).flatMap(([mount, { swap }]) =>
      swap.path === 'job' && !jobs.has(swap.job) ? [`mount ${mount} waits for unknown job ${swap.job}`] : [],
    ),
    ...Object.entries(parsed.platforms).flatMap(([id, { sizeClasses, shared = {} }]) => [
      ...(new Set(sizeClasses).size === sizeClasses.length ? [] : [`platform ${id} repeats a size class`]),
      ...Object.keys(shared)
        .filter((mount) => !Object.hasOwn(parsed.mounts, mount))
        .map((mount) => `platform ${id} shares unknown mount ${mount}`),
    ]),
  ];
  if (problems.length > 0) {
    throw new Error(problems.join('; '));
  }
  return {
    standards: new Map(
      Object.entries(parsed.mounts).flatMap(([mount, { standards }]) =>
        standards === undefined ? [] : [[mount, new Map(Object.entries(standards))] as const],
      ),
    ),
    swaps: new Map(Object.entries(parsed.mounts).map(([mount, { swap }]) => [mount, swap])),
    platforms: new Map(
      Object.entries(parsed.platforms).map(([id, { sizeClasses, shared = {} }]) => [id, { sizeClasses, shared }]),
    ),
  };
};

export const GUN_PLATFORMS = loadGunPlatforms(content);

/** Why a design cannot name this platform choice; undefined when the table holds it. */
export const platformChoiceProblem = (choice: PlatformChoice, table: GunPlatforms = GUN_PLATFORMS) => {
  const platform = table.platforms.get(choice.id);
  if (platform === undefined) {
    return `unknown gun platform ${JSON.stringify(choice.id)}`;
  }
  return platform.sizeClasses.includes(choice.sizeClass)
    ? undefined
    : `platform ${choice.id} has no size class ${JSON.stringify(choice.sizeClass)}`;
};

/** The mount types of a resolved gun that the table gives no swap path. */
export const unswappableMounts = (resolved: Resolved, table: GunPlatforms = GUN_PLATFORMS): string[] => {
  const mounts = [...resolved.defs.values()].flatMap(({ ports }) => ports.map(({ mount }) => mount));
  return [...new Set(mounts)].filter((mount) => !table.swaps.has(mount)).sort();
};

/** Why ports of a resolved gun declare or accept a standard their mount type does not list; empty when all are. */
export const unlistedStandards = (resolved: Resolved, table: GunPlatforms = GUN_PLATFORMS): string[] =>
  [...resolved.defs].flatMap(([part, { ports }]) =>
    ports.flatMap(({ id, mount, standard, accepts = [] }) =>
      [
        ...(standard === undefined ? [] : [{ name: standard, verb: 'declares' }]),
        ...accepts.map((name) => ({ name, verb: 'accepts' })),
      ]
        .filter(({ name }) => !table.standards.get(mount)?.has(name))
        .map(({ name, verb }) => `${part}.${id} ${verb} standard ${name}, which ${mount} mounts do not list`),
    ),
  );

/** Gives every port of a resolved gun the size class and swap path its design's platform assigns its mount type. */
export const withPlatformPorts = (
  resolved: Resolved,
  choice: PlatformChoice,
  table: GunPlatforms = GUN_PLATFORMS,
): Resolved => {
  const platform = table.platforms.get(choice.id);
  if (platform === undefined) {
    throw new Error(platformChoiceProblem(choice, table));
  }
  const stamped = new Map<PortDef, PortDef>();
  const stamp = (port: PortDef): PortDef => {
    let result = stamped.get(port);
    if (result === undefined) {
      const swap = table.swaps.get(port.mount);
      result = {
        ...port,
        sizeClass: platform.shared[port.mount] ?? choice.sizeClass,
        ...(swap === undefined ? {} : { swap }),
      };
      stamped.set(port, result);
    }
    return result;
  };
  return {
    ...resolved,
    defs: new Map([...resolved.defs].map(([id, def]) => [id, { ...def, ports: def.ports.map(stamp) }])),
    connections: resolved.connections.map((connection) => ({
      ...connection,
      from: { ...connection.from, port: stamp(connection.from.port) },
      to: { ...connection.to, port: stamp(connection.to.port) },
    })),
  };
};
