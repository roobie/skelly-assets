import * as patchModule from '@skelly/surfaces/patch';
import * as schemaModule from '@skelly/surfaces/schema';

// The one module of the lab that imports the surfaces package's code. An edit to a kind's GLSL, or to its schema,
// reaches the page as a hot update of the package accepted here, and the lab recompiles its materials under the new
// code with the model still loaded. Any other module importing the package's values would take the update past this
// seam and reload the page.

export interface Kinds {
  readonly patch: typeof patchModule;
  readonly schema: typeof schemaModule;
  /** Counts the code updates, so a program compiled from older code is never taken from three's cache. */
  readonly revision: number;
}

let current: Kinds = { patch: patchModule, schema: schemaModule, revision: 0 };
const listeners = new Set<(kinds: Kinds) => void>();

/** The surfaces package as it stands now. */
export const kinds = () => current;

/** Calls `listener` with the new code on every hot update of the package. */
export const onKindsUpdate = (listener: (kinds: Kinds) => void) => listeners.add(listener);

if (import.meta.hot)
  import.meta.hot.accept(['@skelly/surfaces/patch', '@skelly/surfaces/schema'], ([patch, schema]) => {
    current = {
      patch: (patch as typeof patchModule | undefined) ?? current.patch,
      schema: (schema as typeof schemaModule | undefined) ?? current.schema,
      revision: current.revision + 1,
    };
    for (const listener of listeners) listener(current);
  });
