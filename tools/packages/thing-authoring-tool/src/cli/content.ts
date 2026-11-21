// The authored catalogue as the refresh wrote it, one row to a file, for the code that runs in Node. A consumer reads the
// rows it names: loading and checking every item costs seconds, and most readers want one. The viewer's browser code
// reads the same files through Vite instead; see `viewerContent.ts`.
import { readFileSync } from 'node:fs';
import { type Catalogue, loadItem, type ToolItem } from '../catalogue.ts';
import { type CatalogueManifest, catalogueIds } from '../catalogueManifest.ts';
import { settings } from '../settings.ts';

const readJson = (path: string): unknown => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));

/** Every row's id, in the catalogue's order. */
export const itemIds = () => catalogueIds(readJson('../../item-ids.json') as CatalogueManifest);

const readRow = (id: string) => {
  try {
    return readJson(`../../items/${id}.json`);
  } catch (error) {
    // A recipe naming a row that is gone should hear which, not a path.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error(`The catalogue has no row ${id}`);
    throw error;
  }
};

export const readItems = (ids: readonly string[]): ToolItem[] => ids.map((id) => loadItem(readRow(id), settings));

/** The settings and the rows `ids` name, every row when none are named. */
export const readCatalogue = (ids: readonly string[] = itemIds()): Catalogue => ({
  ...settings,
  items: readItems(ids),
});
