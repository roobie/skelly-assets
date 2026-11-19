/** What the dev server pushes when content changes. */
export const CONTENT_EVENT = 'shader-lab:content';

/**
 * Where the page reads its content and the showcase's files, relative to itself, so one set of URLs holds on the dev
 * server and on the site. The site serves the lab in a folder beside its models.json and built/; the dev server serves
 * them at its root, where `..` stays at the root. The content lies beside the page: the dev server compiles it when
 * asked, and the static build writes it once.
 */
export const SITE = '../';
export const CONTENT_FILE = 'content.json';

/**
 * The content the lab draws by: the finish table (models/finishes.jsonnet) and the lab's own (models/shader-lab.jsonnet),
 * as compiled JSON the page validates, or why they did not compile.
 */
export type ContentMessage = { readonly finishes: unknown; readonly lab: unknown } | { readonly error: string };
