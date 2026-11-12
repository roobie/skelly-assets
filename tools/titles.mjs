// Every model is called by an authored title, never by a name derived from its id. This holds each model's title to that:
// present, text, and plain (no surrounding blanks). Why titles are authored is in README.md, "Titles".

// One model's title problems. model: { pack, id, title }.
export function titleProblems({ pack, id, title }) {
  const at = `${pack}/${id}`;
  if (title === undefined) return [{ pack, id, problem: 'untitled', message: `${at}: no title` }];
  if (typeof title !== 'string' || title.trim() === '') return [{ pack, id, problem: 'bad-title', message: `${at}: title must be text` }];
  if (title !== title.trim()) return [{ pack, id, problem: 'bad-title', message: `${at}: title has surrounding blanks` }];
  return [];
}

// The title problems of every model, ordered by pack and id.
export const titleReport = (models) => models.flatMap(titleProblems)
  .sort((a, b) => (a.pack < b.pack ? -1 : a.pack > b.pack ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
