import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { addAnalytics, FOOTER, VERSION_MARK, checkAnalytics, optsIntoFooter, pagesUnder, withAnalytics } from '../../site/analytics.mjs';
import { readTools, viewerDir } from '../../site/tools.mjs';
import { readVersion, versionHtml } from '../../site/version.mjs';

// Git exports its repository bindings to hooks, and a fixture repository run inside one would rewrite the pushing one.
const gitEnvironment = () => Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith('GIT_')));
const root = join(import.meta.dirname, '..', '..');
const SCRIPT = /<script async src="https:\/\/scripts\.simpleanalyticscdn\.com\/latest\.js"><\/script>/g;
const count = (html, needle) => html.split(needle).length - 1;
const DOCUMENT = '<!doctype html><html><head></head><body data-site-footer></body></html>';
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

test('the footer is added once to a page that opts in and never to one that does not', () => {
  const document = withAnalytics(DOCUMENT);
  assert.equal(count(document, FOOTER), 1);
  assert.equal(count(withAnalytics(document), FOOTER), 1);
  assert.equal(count(withAnalytics(TOOL), FOOTER), 0);
});

test('a page that cannot carry what it asked for fails the build rather than going out without it', () => {
  assert.throws(() => withAnalytics('<html><body></body></html>'), /closing <\/head>/);
  assert.throws(() => withAnalytics('<html><head></head><body data-site-footer>'), /closing <\/body>/);
  assert.deepEqual(checkAnalytics(DOCUMENT), ['the script', 'the footer it opted into']);
  assert.deepEqual(checkAnalytics(withAnalytics(DOCUMENT)), []);
});

test('each source page gets the script, the document pages get the footer, and the viewers never do', () => {
  const pages = sourcePages();
  assert.ok(pages.some(({ viewer }) => viewer) && pages.some(({ viewer }) => !viewer));
  for (const { path, viewer } of pages) {
    const source = readFileSync(path, 'utf8');
    assert.doesNotMatch(source, /simpleanalytics/, path);
    const built = withAnalytics(source);
    assert.deepEqual(checkAnalytics(built), [], path);
    assert.equal(built.match(SCRIPT)?.length, 1, path);
    assert.equal(count(built, FOOTER), optsIntoFooter(source) ? 1 : 0, path);
    if (viewer) assert.equal(optsIntoFooter(source), false, `${path}: a viewer's bottom-anchored panels would sit under a footer`);
  }
  assert.ok(optsIntoFooter(readFileSync(join(root, 'site/index.html'), 'utf8')), 'the showcase index is a document page');
});

test('the footer keeps the UTM source Simple Analytics was given', () => {
  assert.match(FOOTER, /utm_source=roobie\.github\.io/);
});

test('the Pages workflow builds the site with analytics', () => {
  const workflow = readFileSync(join(root, '.github/workflows/assets.yml'), 'utf8');
  assert.match(workflow, /node site\/build\.mjs [^\n]*--analytics/);
});

test('the footer links the tag alone on a tagged commit, and the latest tag plus the short commit on main past it', () => {
  const sha = 'abcdef0123456789';
  const tagged = versionHtml({ tag: 'v1.2.3', sha, exact: true });
  assert.match(tagged, /href="[^"]*\/releases\/tag\/v1\.2\.3">v1\.2\.3<\/a>/);
  assert.doesNotMatch(tagged, /abcdef0|commit/);
  const past = versionHtml({ tag: 'v1.2.3', sha, exact: false });
  assert.match(past, />v1\.2\.3<\/a> \+ main at <a [^>]*href="[^"]*\/commit\/abcdef0123456789">abcdef0<\/a>/);
  assert.equal(versionHtml({ sha: undefined, exact: false }), '');
});

test('readVersion tells a build at a release tag from one past it', () => {
  const repo = mkdtempSync(join(tmpdir(), 'pages-version-'));
  const run = (...args) => execFileSync('git', ['-C', repo, '-c', 'user.name=t', '-c', 'user.email=t@example.test', ...args], { env: gitEnvironment(), stdio: 'ignore' });
  try {
    run('init', '-q');
    run('commit', '-q', '--allow-empty', '-m', 'one');
    run('tag', 'v1.2.3');
    assert.deepEqual({ ...readVersion(repo, {}), sha: undefined }, { tag: 'v1.2.3', sha: undefined, exact: true });
    run('commit', '-q', '--allow-empty', '-m', 'two');
    const past = readVersion(repo, {});
    assert.equal(past.tag, 'v1.2.3');
    assert.equal(past.exact, false);
  } finally {
    rmSync(repo, { recursive: true, force: true });
  }
});

test('a page that opts into the footer carries the version in it, and a footer left without it fails the check', () => {
  const html = withAnalytics(DOCUMENT, versionHtml({ tag: 'v1.2.3', sha: 'abcdef0123', exact: true }));
  assert.match(html, /<footer[^>]*>\s*<span[^>]*><a [^>]*>v1\.2\.3/);
  assert.deepEqual(checkAnalytics(html), []);
  assert.deepEqual(checkAnalytics(html.replace(/<span.*<\/span>/, VERSION_MARK)), ['the footer it opted into']);
});
