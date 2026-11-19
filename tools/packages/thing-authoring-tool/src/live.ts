/**
 * The page tells the dev server which row it views, and the server answers with that row evaluated from its Jsonnet,
 * now and after every saved source.
 */
export const LIVE_VIEW = 'tat:view';
export const LIVE_ROW = 'tat:row';

/** The catalogue item a page draws, and the recipe row that exports it where one does. */
export interface RowView {
  readonly item: string;
  readonly row?: string | undefined;
}

/** A view's evaluated data, still to be validated by the page, or why it did not evaluate. */
export type RowResult = { readonly item: unknown; readonly row?: unknown } | { readonly error: string };

export interface RowMessage {
  readonly view: RowView;
  readonly result: RowResult;
}
