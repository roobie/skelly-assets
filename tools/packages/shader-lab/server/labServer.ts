// The lab's dev-server side, in Node: the built tree and its models.json, and the content compiled from Jsonnet.
// The content goes to the page as data, pushed on change, never as modules, so a compile can never make vite reload.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import type { ServerResponse } from 'node:http';
import { join, resolve } from 'node:path';
import { BUILD_ROOT } from '../../../buildDir.mjs';
import { buildSite, sendFile, siteFiles } from '../../../reviewSite.mjs';
import { refreshJsonnetSources } from '../../../sources.mjs';
import { CONTENT_PATH, type ContentMessage } from '../src/protocol.ts';

const repo = resolve(import.meta.dirname, '../../../..');
const TWINS = { finishes: 'models/finishes.json', lab: 'models/shader-lab.json' } as const;

const readTwin = (path: string): unknown => JSON.parse(readFileSync(join(repo, path), 'utf8'));
const message = (error: unknown) => (error instanceof Error ? error.message : String(error));

export interface LabServer {
  /**
   * Answers a request for `pathname` when it is the lab's: the content, models.json from the site built over the
   * tree, or a file of the tree. False leaves it to vite.
   */
  readonly answer: (pathname: string, response: ServerResponse) => Promise<boolean>;
  /** Sends the content to `send` once whatever changed has compiled; edits arriving meanwhile compile once after. */
  readonly push: (send: (content: ContentMessage) => void) => void;
}

export const labServer = ({ built }: { built: string }): LabServer => {
  const tree = resolve(built);
  // One site per tree, so two labs on two trees never build over each other.
  const site = join(BUILD_ROOT, `shader-lab-site-${createHash('sha256').update(tree).digest('hex').slice(0, 12)}`);
  const manifest = join(tree, 'manifest.json');
  let siteOf: { stamp: number; fileOf: (pathname: string) => string | undefined } | undefined;
  // The site is built when first asked for and again when the tree's manifest changes, since a rebuilt tree may list
  // other models.
  const files = () => {
    if (!existsSync(manifest))
      throw new Error(
        `${tree} has no manifest.json; build the whole tree (node tools/build.mjs --out <dir>, then tools/mobs.mjs and tools/sounds.mjs with the same --out), since a build of chosen ids writes none`,
      );
    const stamp = statSync(manifest).mtimeMs;
    if (siteOf?.stamp !== stamp) {
      buildSite(tree, site);
      siteOf = { stamp, fileOf: siteFiles(site, tree) };
    }
    return siteOf.fileOf;
  };

  const content = async (): Promise<ContentMessage> => {
    try {
      await refreshJsonnetSources();
      return { finishes: readTwin(TWINS.finishes), lab: readTwin(TWINS.lab) };
    } catch (error) {
      return { error: message(error) };
    }
  };

  let running: Promise<void> | undefined;
  let again = false;
  const push = (send: (content: ContentMessage) => void) => {
    if (running !== undefined) {
      again = true;
      return;
    }
    running = (async () => {
      do {
        again = false;
        send(await content());
      } while (again);
    })().finally(() => {
      running = undefined;
    });
  };

  const answer = async (pathname: string, response: ServerResponse) => {
    if (pathname === CONTENT_PATH) {
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify(await content()));
      return true;
    }
    if (pathname !== '/models.json' && !pathname.startsWith('/built/')) return false;
    try {
      sendFile(response, files()(pathname));
    } catch (error) {
      response.statusCode = 500;
      response.end(message(error));
    }
    return true;
  };

  return { answer, push };
};
