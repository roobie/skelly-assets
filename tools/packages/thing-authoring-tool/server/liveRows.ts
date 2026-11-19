// Which rows the open pages view, and the evaluating of them: a viewed row is evaluated when it is first asked for and
// again after every saved source, never two at once, and each page is told what its row evaluated to.
import type { RowResult, RowView } from '../src/live.ts';

// One save can touch several files, and an editor may write twice, so a burst evaluates once.
const QUIET_MS = 150;

const keyOf = ({ item, row }: RowView) => JSON.stringify([item, row]);

export const liveRows = <Page>(
  evaluate: (view: RowView) => Promise<RowResult>,
  deliver: (page: Page, view: RowView, result: RowResult) => void,
) => {
  const views = new Map<Page, RowView>();
  // Waiting views, by key, so a row asked for twice while another evaluates is evaluated once after it.
  const waiting = new Map<string, RowView>();
  let timer: NodeJS.Timeout | undefined;
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;
    try {
      // A map's iteration reaches what is added during it, so a row wanted again meanwhile comes round once more.
      for (const [key, view] of waiting) {
        waiting.delete(key);
        const result = await evaluate(view);
        for (const [page, viewed] of views) if (keyOf(viewed) === key) deliver(page, view, result);
      }
    } finally {
      running = false;
    }
  };

  const want = (view: RowView) => {
    waiting.set(keyOf(view), view);
    void run();
  };

  return {
    /** The page now views `view`; it is evaluated at once, since the page has nothing true to draw until then. */
    view: (page: Page, view: RowView) => {
      views.set(page, view);
      want(view);
    },
    forget: (page: Page) => views.delete(page),
    /** A source changed: every viewed row is evaluated again once the changes go quiet. */
    changed: () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        for (const view of views.values()) want(view);
      }, QUIET_MS);
    },
  };
};
