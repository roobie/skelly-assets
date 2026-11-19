/** What the dev server tells the page about the Jsonnet compile behind it, and how the page asks for the latest. */
export const LIVE_EVENT = 'tat:jsonnet';
export const LIVE_READY = 'tat:ready';

export type LiveStatus = { readonly error?: undefined } | { readonly error: string };
