// The visit counter of the Pages deploy: Simple Analytics, which needs no configuration, and its badge. They are added
// to the assembled site rather than to each page's source or each viewer's build, so no page that is published can
// miss the script.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const ANALYTICS_SCRIPT = '<script async src="https://scripts.simpleanalyticscdn.com/latest.js"></script>';
// The badge art is white and pale teal, so its file wraps it in a dark footer that works on every page theme.
export const BADGE = readFileSync(new URL('./analytics-badge.html', import.meta.url), 'utf8').trimEnd();

// A page opts into the badge with this attribute on its body. A document page, one that scrolls as a whole, takes the
// footer in flow; a full-viewport tool page or a viewer leaves it off, since a footer there would cover controls that
// are anchored to the bottom of the screen.
export const BADGE_ATTRIBUTE = 'data-analytics-badge';
export const optsIntoBadge = (html) => new RegExp(`<body\\b[^>]*\\s${BADGE_ATTRIBUTE}[\\s>=/]`).test(html);

export function withAnalytics(html) {
  if (html.includes(ANALYTICS_SCRIPT)) return html;
  if (!html.includes('</head>')) throw new Error('a page needs a closing </head> tag to carry the analytics script');
  const withScript = html.replace('</head>', `  ${ANALYTICS_SCRIPT}\n</head>`);
  if (!optsIntoBadge(html)) return withScript;
  if (!html.includes('</body>')) throw new Error('a page that opts into the badge needs a closing </body> tag');
  return withScript.replace('</body>', `${BADGE}\n</body>`);
}

// A built page lacks neither the script nor a badge it opted into, so a skipped page fails the deploy build.
export function checkAnalytics(html) {
  const lacks = [];
  if (!html.includes(ANALYTICS_SCRIPT)) lacks.push('the script');
  if (optsIntoBadge(html) && !html.includes(BADGE)) lacks.push('the badge it opted into');
  return lacks;
}

// Every HTML page under dir, however deep a viewer nests it.
export function pagesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => join(entry.parentPath, entry.name));
}

export function addAnalytics(dir) {
  for (const page of pagesUnder(dir)) {
    const html = withAnalytics(readFileSync(page, 'utf8'));
    const lacks = checkAnalytics(html);
    if (lacks.length > 0) throw new Error(`${page} lacks ${lacks.join(' and ')}`);
    writeFileSync(page, html);
  }
}
