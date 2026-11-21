// The catalogue's manifest as the refresh writes it (tools/catalogue-rows.mjs): the row files in catalogue order, each
// with its rows' ids. It is read without Node, since the viewer's page lists the ids too.
// biome-ignore lint/correctness/noUnresolvedImports: CatalogueManifest is a JSDoc typedef, which TypeScript exports and Biome does not read.
import type { CatalogueManifest } from '../../../catalogue-rows.mjs';

export type { CatalogueManifest };

/** Every row's id, in the catalogue's order. */
export const catalogueIds = ({ shards }: CatalogueManifest): string[] =>
  Object.values(shards).flatMap(({ ids }) => ids);

/** The row file that holds row `id`, by its path from the repository root, none when no row file does. */
export const rowFileOf = ({ shards }: CatalogueManifest, id: string): string | undefined =>
  Object.entries(shards).find(([, { ids }]) => ids.includes(id))?.[0];
