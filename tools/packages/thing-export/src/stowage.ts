// A model entry's stowage, taken from the port metadata the GLB writer gives its port nodes, so a consumer reading the
// sidecar sees the slots and seats the file holds; see `docs/decisions/0017-stowage-slots.md`.

import type { Vec3 } from '@skelly/construct/foundation/math.ts';
import type { Stowage } from '@skelly/thing-core/schema';
import type { ExportPortMetadata } from './exportTypes.ts';

/** The mount of every stowage port; see `models/stowage.libsonnet`, `mount`. */
export const STOWAGE_MOUNT = 'stowage';

/**
 * The model entry's stowage from the file's port metadata (`GlbExportResult`, `ports`), in metres, or undefined for a
 * model without stowage ports. A slot is named by its port id alone, which the writer joins to its part id.
 */
export const modelStowage = (ports: readonly ExportPortMetadata[], metresPerUnit: number): Stowage | undefined => {
  const metres = (v: Vec3): Vec3 => [v[0] * metresPerUnit, v[1] * metresPerUnit, v[2] * metresPerUnit];
  const frameOf = ({ frame: { position, normal, up } }: ExportPortMetadata) => ({
    position: metres(position),
    normal,
    up,
  });
  const stowage = ports.filter(({ mount }) => mount === STOWAGE_MOUNT);
  const slots = stowage
    .filter(({ gender }) => gender === 'female')
    .map((port) => {
      const { id, accepts, envelope } = port;
      if (accepts === undefined || envelope === undefined) {
        throw new Error(`stowage slot ${id} has no accepts or envelope`);
      }
      return {
        id: id.slice(id.indexOf('.') + 1),
        accepts,
        envelope: { min: metres(envelope.min), max: metres(envelope.max) },
        frame: frameOf(port),
      };
    });
  const seats = stowage
    .filter(({ gender }) => gender === 'male')
    .map((port) => {
      if (port.standard === undefined) {
        throw new Error(`stowage seat ${port.id} has no standard`);
      }
      return { standard: port.standard, frame: frameOf(port) };
    });
  if (slots.length === 0 && seats.length === 0) {
    return undefined;
  }
  return { ...(slots.length > 0 ? { slots } : {}), ...(seats.length > 0 ? { seats } : {}) };
};
