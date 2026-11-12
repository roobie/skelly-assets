import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { addAnalytics, ANALYTICS_SCRIPT, pagesUnder, withAnalytics } from '../../site/analytics.mjs';

const root = join(import.meta.dirname, '..', '..');
const PAGE = '<!doctype html><html><head><title>t</title></head><body></body></html>';
const SIMPLE_ANALYTICS = /<script async src="https:\/\/scripts\.simpleanalyticscdn\.com\/latest\.js"><\/script>/g;

test('every page of the assembled site, nested viewer pages included, carries the script exactly once', () => {
  const out = mkdtempSync(join(tmpdir(), 'pages-analytics-'));
  try {
    const pages = ['index.html', 'pose.html', 'viewer/index.html', 'viewer/deep/stress.html'];
    mkdirSync(join(out, 'viewer', 'deep'), { recursive: true });
    for (const page of pages) writeFileSync(join(out, page), PAGE);
    addAnalytics(out);
    addAnalytics(out);
    assert.equal(pagesUnder(out).length, pages.length);
    for (const page of pagesUnder(out)) {
      assert.equal(readFileSync(page, 'utf8').match(SIMPLE_ANALYTICS)?.length, 1, page);
    }
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('a page without a closing head tag fails the deploy build rather than going out uncounted', () => {
  assert.throws(() => withAnalytics('<html><body></body></html>'), /closing <\/head>/);
  assert.match(withAnalytics(PAGE), /<script async src=".*"><\/script>\n<\/head>/);
  assert.ok(ANALYTICS_SCRIPT.includes('scripts.simpleanalyticscdn.com/latest.js'));
});

test('the Pages workflow builds the site with analytics, and no source page carries it', () => {
  const workflow = readFileSync(join(root, '.github/workflows/assets.yml'), 'utf8');
  assert.match(workflow, /node site\/build\.mjs [^\n]*--analytics[^\n]*\n(?:\s*- uses: actions\/configure-pages)/);
  for (const page of ['site/index.html', 'site/look.html', 'site/pose.html']) {
    assert.doesNotMatch(readFileSync(join(root, page), 'utf8'), /simpleanalyticscdn/, page);
  }
});
