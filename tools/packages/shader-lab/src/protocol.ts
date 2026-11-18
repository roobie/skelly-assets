/** What the dev server pushes when content changes, and what its content endpoint answers. */
export const CONTENT_EVENT = 'shader-lab:content';
export const CONTENT_PATH = '/api/content';

/**
 * The content the lab draws by: the finish table (models/finishes.jsonnet) and the lab's own (models/shader-lab.jsonnet),
 * as compiled JSON the page validates, or why they did not compile.
 */
export type ContentMessage = { readonly finishes: unknown; readonly lab: unknown } | { readonly error: string };
