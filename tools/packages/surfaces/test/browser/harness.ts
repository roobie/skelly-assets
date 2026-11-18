// Serves the test page with vite and opens it in headless Chromium on SwiftShader, the one browser a driver uses.
import { after } from 'node:test';
import { createServer } from 'vite';
import { launchBrowser, openPage } from '../../../../reviewSite.mjs';
import type { SurfaceTestApi } from './page/main.ts';

const root = new URL('../..', import.meta.url).pathname;

type Call = <Method extends keyof SurfaceTestApi>(
  method: Method,
  ...args: Parameters<SurfaceTestApi[Method]>
) => Promise<ReturnType<SurfaceTestApi[Method]>>;

/** Opens the page for the driver's tests and closes it, its browser and its server once they are done. */
export const openSurfaceTest = async (): Promise<Call> => {
  const server = await createServer({ root, logLevel: 'warn', server: { host: '127.0.0.1', port: 0 } });
  await server.listen();
  after(() => server.close());
  const browser = await launchBrowser();
  after(() => browser.close());
  const address = server.httpServer?.address();
  if (address === null || typeof address !== 'object') throw new Error('vite is not listening on a port');
  const { page, errors } = await openPage(
    browser,
    `http://127.0.0.1:${address.port}`,
    'test/browser/page/index.html',
    'surfaceTest',
  );
  return async (method, ...args) => {
    const answer = await page.evaluate(
      ([name, given]: readonly [typeof method, typeof args]) => window.surfaceTest(name, ...given),
      [method, args] as const,
    );
    if (errors.length > 0) throw new Error(`the page failed: ${errors.join('; ')}`);
    return answer as ReturnType<SurfaceTestApi[typeof method]>;
  };
};
