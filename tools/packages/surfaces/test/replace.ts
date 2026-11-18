import type { ReplaceHook } from '../src/patch.ts';

/** A replace hook that throws on a missing anchor, naming it, as skelly's own `replaceHook` does. */
export const throwing: ReplaceHook = (source, hook, replacement) => {
  if (!source.includes(hook)) throw new Error(`no ${hook}`);
  return source.replace(hook, () => replacement);
};
