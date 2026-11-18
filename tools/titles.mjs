// @ts-check
import { titleFlaw } from './packages/thing-export/src/title.ts';

// Every model is called by an authored title, never by a name derived from its id. This holds each model's title to that:
// present and plain, by the rule in thing-export's title.ts. Why titles are authored is in `README.md`, "Titles".

/** @typedef {{ pack: string; id: string; problem: 'untitled' | 'bad-title'; message: string }} TitleProblem */

/**
 * One model's title problems.
 * @param {{ pack: string; id: string; title?: unknown }} model
 * @returns {TitleProblem[]}
 */
export function titleProblems({ pack, id, title }) {
  const at = `${pack}/${id}`;
  if (title === undefined) return [{ pack, id, problem: 'untitled', message: `${at}: no title` }];
  const flaw = titleFlaw(title);
  return flaw === null ? [] : [{ pack, id, problem: 'bad-title', message: `${at}: ${flaw}` }];
}

/**
 * The title problems of every model, ordered by pack and id.
 * @param {readonly { pack: string; id: string; title?: unknown }[]} models
 */
export const titleReport = (models) =>
  models
    .flatMap(titleProblems)
    .sort((a, b) => (a.pack < b.pack ? -1 : a.pack > b.pack ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
