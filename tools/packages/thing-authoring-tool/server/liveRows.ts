// Which rows the open pages view, and the evaluating of them: a viewed row is evaluated when it is first asked for and
// again after every saved source, and each page is told what each half of its row evaluated to. Each half evaluates in
// a lane of its own, one at a time, so an item never waits on a recipe row, which takes seconds where an item takes a
// fraction of one; a page copes with either half arriving first.
import { type Half, type HalfResult, halves, type RowMessage, type RowView, viewKey } from '../src/live.ts';

// One save can touch several files, and an editor may write twice, so a burst evaluates once.
const QUIET_MS = 150;

export const liveRows = <Page>(
  evaluate: (half: Half, id: string) => Promise<HalfResult>,
  deliver: (page: Page, message: RowMessage) => void,
) => {
  const views = new Map<Page, RowView>();
  let timer: NodeJS.Timeout | undefined;

  const viewers = (key: string) => [...views].filter(([, viewed]) => viewKey(viewed) === key).map(([page]) => page);

  const lane = (half: Half) => {
    // Waiting views, by key, so a row asked for twice while another evaluates is evaluated once after it.
    const waiting = new Map<string, readonly [RowView, string]>();
    let running = false;
    const run = async () => {
      if (running) return;
      running = true;
      try {
        // A map's iteration reaches what is added during it, so a row wanted again meanwhile comes round once more.
        for (const [key, [view, id]] of waiting) {
          waiting.delete(key);
          // A page that moved on wants it no longer, and would keep the next view waiting.
          if (viewers(key).length === 0) continue;
          const result = await evaluate(half, id);
          for (const page of viewers(key)) deliver(page, { view, half, result });
        }
      } finally {
        running = false;
      }
    };
    return (view: RowView, id: string) => {
      waiting.set(viewKey(view), [view, id]);
      void run();
    };
  };
  const lanes: Readonly<Record<Half, (view: RowView, id: string) => void>> = { item: lane('item'), row: lane('row') };

  const want = (view: RowView) => {
    for (const [half, id] of halves(view)) lanes[half](view, id);
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
