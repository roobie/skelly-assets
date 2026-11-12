// The visit counter of the Pages deploy: Simple Analytics, which needs no configuration. It is added to the assembled
// site rather than to each page's source or each viewer's build, so no page that is published can miss it.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const ANALYTICS_SCRIPT = '<script async src="https://scripts.simpleanalyticscdn.com/latest.js"></script>';

export function withAnalytics(html) {
  if (html.includes(ANALYTICS_SCRIPT)) return html;
  if (!html.includes('</head>')) throw new Error('a page needs a closing </head> tag to carry the analytics script');
  return html.replace('</head>', `  ${ANALYTICS_SCRIPT}\n</head>`);
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
