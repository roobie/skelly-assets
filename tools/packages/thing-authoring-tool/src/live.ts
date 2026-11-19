import { type InferOutput, optional, parse, strictObject, string } from 'valibot';

/**
 * The page tells the dev server which row it views, and the server answers with that row evaluated from its Jsonnet,
 * now and after every saved source.
 */
export const LIVE_VIEW = 'tat:view';
export const LIVE_ROW = 'tat:row';

const RowViewSchema = strictObject({ item: string(), row: optional(string()) });

/** The catalogue item a page draws, and the recipe row that exports it where one does. */
export type RowView = InferOutput<typeof RowViewSchema>;

/** A view as a page sent it, which the server must not trust to be one. */
export const parseView = (value: unknown): RowView => parse(RowViewSchema, value);

/** What names a view, so the page and the server agree on which of them a result answers. */
export const viewKey = ({ item, row }: RowView) => JSON.stringify([item, row]);

/** A view's evaluated data, still to be validated by the page, or why it did not evaluate. */
export type RowResult = { readonly item: unknown; readonly row?: unknown } | { readonly error: string };

export interface RowMessage {
  readonly view: RowView;
  readonly result: RowResult;
}
