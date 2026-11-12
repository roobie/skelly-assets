// The visit counter of the Pages deploy: Simple Analytics, which needs no configuration, and its badge. They are added
// to the assembled site rather than to each page's source or each viewer's build, so no page that is published can
// miss them.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const ANALYTICS_SCRIPT = '<script async src="https://scripts.simpleanalyticscdn.com/latest.js"></script>';

// The badge's markup as Simple Analytics supplies it. Its fills are light, made for a dark ground, so the wrapper
// gives it one in every theme; the wrapper's inline style serves pages that share no stylesheet. It floats in a corner
// instead of taking layout space from the app-like viewers.
export const BADGE = readFileSync(new URL('./analytics-badge.html', import.meta.url), 'utf8').trim();
const BADGE_STYLE = 'position:fixed;right:8px;bottom:8px;z-index:1;padding:2px 8px;border-radius:6px;background:#1f2a2c;opacity:.85;line-height:0';
export const BADGE_BLOCK = `<footer class="analytics-badge" style="${BADGE_STYLE}">\n${BADGE}\n</footer>`;

export function withAnalytics(html) {
  if (html.includes(ANALYTICS_SCRIPT)) return html;
  if (!html.includes('</head>') || !html.includes('</body>')) throw new Error('a page needs closing </head> and </body> tags to carry the analytics');
  return html.replace('</head>', `  ${ANALYTICS_SCRIPT}\n</head>`).replace('</body>', `${BADGE_BLOCK}\n</body>`);
}

// Every HTML page under dir, however deep a viewer nests it.
export function pagesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => join(entry.parentPath, entry.name));
}

export function addAnalytics(dir) {
  for (const page of pagesUnder(dir)) writeFileSync(page, withAnalytics(readFileSync(page, 'utf8')));
}
