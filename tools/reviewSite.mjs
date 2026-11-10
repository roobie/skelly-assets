// The showcase served to headless Chromium for the review tools (model-sheet.mjs, pose-sheet.mjs): the site built
// without the tree's files (site/build.mjs --no-tree) over the tree itself, and a browser that draws WebGL on
// SwiftShader since headless Chromium has no GPU.
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import process from 'node:process';

const repo = resolve(import.meta.dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary' };
const isFile = (path) => existsSync(path) && statSync(path).isFile();

// Builds the showcase from the tree at `built` into `site`, leaving the tree's unchanged files to the server.
export function buildSite(built, site) {
  execFileSync(process.execPath, [join(repo, 'site/build.mjs'), '--built', built, '--no-tree', site], { stdio: ['ignore', 'ignore', 'inherit'] });
}

// Serves `site` on a free local port; a path under built/ the site does not hold is read from the tree at `built`.
export async function serveSite(site, built) {
  const sitePath = (pathname) => {
    const path = resolve(site, `.${pathname}`);
    if (!path.startsWith(site + sep)) return undefined;
    if (isFile(path) || !pathname.startsWith('/built/')) return path;
    const fromTree = resolve(built, `.${pathname.slice('/built'.length)}`);
    return fromTree.startsWith(built + sep) ? fromTree : undefined;
  };
  const server = createServer((request, response) => {
    const path = sitePath(decodeURIComponent(new URL(request.url, 'http://site').pathname));
    if (!path || !isFile(path)) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
    createReadStream(path).pipe(response);
  });
  await new Promise((done) => server.listen(0, '127.0.0.1', done));
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

// Headless Chromium with WebGL on the software rasteriser.
export async function launchBrowser() {
  const { chromium } = await import('playwright');
  return chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
}

// A page of the served site, open once the function it exposes as `api` on `window` is up, or the page's errors.
export async function openPage(browser, origin, file, api, { viewport } = {}) {
  const page = await browser.newPage(viewport ? { viewport } : {});
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(`${origin}/${file}`);
  await page.waitForFunction((name) => typeof window[name] === 'function', api, { timeout: 30_000 }).catch(() => {
    throw new Error(`${file} did not start: ${errors.join('; ') || 'no error reported'}`);
  });
  return { page, errors };
}
