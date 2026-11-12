import { check, pipe, string } from 'valibot';

// What is wrong with a model's title, or null. One rule for the schemas that carry a title and for the build's title
// report, so a title that one accepts the other accepts too. Why titles are authored is in README.md, "Titles".
export function titleFlaw(title: unknown): string | null {
  if (typeof title !== 'string' || title.trim() === '') return 'title must be text';
  if (title !== title.trim()) return 'title has surrounding blanks';
  return null;
}

export const TitleSchema = pipe(string(), check((title) => titleFlaw(title) === null, 'title must be plain text without surrounding blanks'));
