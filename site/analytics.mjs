// The visit counter of the Pages deploy: Simple Analytics, which needs no configuration, and the site footer that
// carries its badge and the rendered version. They are added to the assembled site rather than to each page's source or each viewer's build, so no page that is published can
// miss the script.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const ANALYTICS_SCRIPT = '<script async src="https://scripts.simpleanalyticscdn.com/latest.js"></script>';
// The badge art is white and pale teal, so the footer is dark to work on every page theme. It also names the version
// the page renders, since it is the one footer every document page shares.
const FOOTER_TEMPLATE = readFileSync(new URL('./footer.html', import.meta.url), 'utf8').trimEnd();
export const VERSION_MARK = '<!--build-version-->';
export const footerFor = (versionHtml) => FOOTER_TEMPLATE.replace(VERSION_MARK, versionHtml);
export const FOOTER = footerFor('');

// A page opts into the footer with this attribute on its body. A document page, one that scrolls as a whole, takes the
// footer in flow; a full-viewport tool page or a viewer leaves it off, since a footer there would cover controls that
// are anchored to the bottom of the screen.
export const FOOTER_ATTRIBUTE = 'data-site-footer';
export const optsIntoFooter = (html) => new RegExp(`<body\\b[^>]*\\s${FOOTER_ATTRIBUTE}[\\s>=/]`).test(html);

export function withAnalytics(html, versionHtml = '') {
  if (html.includes(ANALYTICS_SCRIPT)) return html;
  if (!html.includes('</head>')) throw new Error('a page needs a closing </head> tag to carry the analytics script');
  const withScript = html.replace('</head>', `  ${ANALYTICS_SCRIPT}\n</head>`);
  if (!optsIntoFooter(html)) return withScript;
  if (!html.includes('</body>')) throw new Error('a page that opts into the footer needs a closing </body> tag');
  return withScript.replace('</body>', `${footerFor(versionHtml)}\n</body>`);
}

const FOOTER_ANCHOR = 'https://www.simpleanalytics.com?utm_source';

// A built page lacks neither the script nor a footer it opted into, with the version slot filled, so a skipped page
// fails the deploy build.
export function checkAnalytics(html) {
  const lacks = [];
  if (!html.includes(ANALYTICS_SCRIPT)) lacks.push('the script');
  if (optsIntoFooter(html) && !(html.includes(FOOTER_ANCHOR) && !html.includes(VERSION_MARK))) lacks.push('the footer it opted into');
  return lacks;
}

// Every HTML page under dir, however deep a viewer nests it.
export function pagesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => join(entry.parentPath, entry.name));
}

export function addAnalytics(dir, versionHtml = '') {
  for (const page of pagesUnder(dir)) {
    const html = withAnalytics(readFileSync(page, 'utf8'), versionHtml);
    const lacks = checkAnalytics(html);
    if (lacks.length > 0) throw new Error(`${page} lacks ${lacks.join(' and ')}`);
    writeFileSync(page, html);
  }
}
