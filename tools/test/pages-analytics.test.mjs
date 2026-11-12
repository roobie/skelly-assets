import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { addAnalytics, BADGE, checkAnalytics, optsIntoBadge, pagesUnder, withAnalytics } from '../../site/analytics.mjs';
import { readTools, viewerDir } from '../../site/tools.mjs';

const root = join(import.meta.dirname, '..', '..');
const SCRIPT = /<script async src="https:\/\/scripts\.simpleanalyticscdn\.com\/latest\.js"><\/script>/g;
const count = (html, needle) => html.split(needle).length - 1;
const DOCUMENT = '<!doctype html><html><head></head><body data-analytics-badge></body></html>';
const TOOL = '<!doctype html><html><head></head><body></body></html>';

// The pages the site publishes, as its sources name them: the showcase index, each tool page of site/tools.json, and
// the html entry points of each viewer package, which its vite build turns into the pages it serves.
const sourcePages = () => [
  { path: join(root, 'site/index.html'), viewer: false },
  ...readTools(root).flatMap(({ page, viewer }) => {
    if (page) return [{ path: join(root, 'site', page), viewer: false }];
    const dir = viewerDir(root, viewer);
    return readdirSync(dir).filter((name) => name.endsWith('.html')).map((name) => ({ path: join(dir, name), viewer: true }));
  }),
];

test('every page of the assembled site, nested viewer pages included, carries the script exactly once', () => {
  const out = mkdtempSync(join(tmpdir(), 'pages-analytics-'));
  try {
    mkdirSync(join(out, 'viewer', 'deep'), { recursive: true });
    for (const page of ['index.html', 'viewer/index.html', 'viewer/deep/stress.html']) writeFileSync(join(out, page), TOOL);
    addAnalytics(out);
    addAnalytics(out);
    assert.equal(pagesUnder(out).length, 3);
    for (const page of pagesUnder(out)) assert.equal(readFileSync(page, 'utf8').match(SCRIPT)?.length, 1, page);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('the badge is added once to a page that opts in and never to one that does not', () => {
  const document = withAnalytics(DOCUMENT);
  assert.equal(count(document, BADGE), 1);
  assert.equal(count(withAnalytics(document), BADGE), 1);
  assert.equal(count(withAnalytics(TOOL), BADGE), 0);
});

test('a page that cannot carry what it asked for fails the build rather than going out without it', () => {
  assert.throws(() => withAnalytics('<html><body></body></html>'), /closing <\/head>/);
  assert.throws(() => withAnalytics('<html><head></head><body data-analytics-badge>'), /closing <\/body>/);
  assert.deepEqual(checkAnalytics(DOCUMENT), ['the script', 'the badge it opted into']);
  assert.deepEqual(checkAnalytics(withAnalytics(DOCUMENT)), []);
});

test('each source page gets the script, the document pages get the badge, and the viewers never do', () => {
  const pages = sourcePages();
  assert.ok(pages.some(({ viewer }) => viewer) && pages.some(({ viewer }) => !viewer));
  for (const { path, viewer } of pages) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /simpleanalytics/, path);
    const built = withAnalytics(source);
    assert.deepEqual(checkAnalytics(built), [], path);
    assert.equal(built.match(SCRIPT)?.length, 1, path);
    assert.equal(count(built, BADGE), optsIntoBadge(source) ? 1 : 0, path);
    if (viewer) assert.equal(optsIntoBadge(source), false, `${path}: a viewer's bottom-anchored panels would sit under a footer`);
  }
  assert.ok(optsIntoBadge(readFileSync(join(root, 'site/index.html'), 'utf8')), 'the showcase index is a document page');
});

test('the badge keeps the UTM source Simple Analytics was given', () => {
  assert.match(BADGE, /utm_source=roobie\.github\.io/);
});

test('the Pages workflow builds the site with analytics', () => {
  const workflow = readFileSync(join(root, '.github/workflows/assets.yml'), 'utf8');
  assert.match(workflow, /node site\/build\.mjs [^\n]*--analytics/);
});
