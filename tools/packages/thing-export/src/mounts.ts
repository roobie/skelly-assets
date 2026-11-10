// Where each part of a resolved assembly is mounted: the joints the GLB writer records on each part node, so a reader
// can take the model apart into its components and know where each one meets its neighbour. See
// docs/decisions/0009-component-mounts.md for why a joint names ports rather than carrying a transform.

import type { Resolved, ResolvedConnection } from '@skelly/construct/assembly/schema.ts';
import type { ExportMount, PartMounts, PartPortId } from './exportTypes.ts';

const portId = (part: string, port: string): PartPortId => `${part}.${port}`;

/**
 * How far each placed part sits from the root along the connections that placed it. A joint's site is on the part
 * nearer the root, so taking a model apart from the root outward always finds the site already in place.
 */
const depths = (resolved: Resolved): ReadonlyMap<string, number> => {
  const depth = new Map([[resolved.assembly.root, 0]]);
  const tree = resolved.connections.filter(({ role }) => role === 'tree');
  let grown = true;
  while (grown) {
    grown = false;
    for (const { from, to } of tree) {
      const [placed, next] = depth.has(from.part) ? [from.part, to.part] : [to.part, from.part];
      if (depth.has(placed) && !depth.has(next)) {
        depth.set(next, depth.get(placed)! + 1);
        grown = true;
      }
    }
  }
  return depth;
};

/**
 * One connection as a joint of the part farther from the root. A connection's slot and roll belong to its `from`
 * port; the roll turns the meeting part about the shared normal by the same angle seen from either side, so it is
 * recorded as given, and the slot is told apart by which side holds it.
 */
const joint = (connection: ResolvedConnection, outer: string): ExportMount => {
  const { from, to, conn } = connection;
  const [site, part] = from.part === outer ? [to, from] : [from, to];
  const slot = conn.slot === undefined ? {} : site === from ? { slot: conn.slot } : { interfaceSlot: conn.slot };
  return {
    site: portId(site.part, site.port.id),
    interface: portId(part.part, part.port.id),
    ...slot,
    ...(conn.roll ? { roll: conn.roll } : {}),
  };
};

/**
 * Each placed part's mount and its other joints, by part id. A part is mounted where it meets the part nearest the
 * root, so a barrel held by both the receiver and the handguard hangs from the receiver whichever joint the design lists
 * first; a tie keeps the joint that placed it. The root has no mount.
 */
export const partMounts = (resolved: Resolved): ReadonlyMap<string, PartMounts> => {
  const depth = depths(resolved);
  const joints = new Map<string, { joint: ExportMount; near: number; tree: boolean }[]>();
  for (const connection of resolved.connections) {
    const a = depth.get(connection.from.part);
    const b = depth.get(connection.to.part);
    if (a === undefined || b === undefined || connection.role === 'unplaced') {
      continue;
    }
    const outer = a > b ? connection.from.part : connection.to.part;
    const near = Math.min(a, b);
    const entry = joints.get(outer) ?? joints.set(outer, []).get(outer)!;
    entry.push({
      joint: joint(connection, outer),
      near,
      tree: connection.role === 'tree',
    });
  }
  return new Map(
    [...joints].map(([part, found]) => {
      const ordered = [...found].sort((x, y) => x.near - y.near || Number(y.tree) - Number(x.tree));
      const [mount, ...meets] = ordered.map(({ joint: j }) => j);
      return [part, { ...(mount ? { mount } : {}), meets }];
    }),
  );
};
