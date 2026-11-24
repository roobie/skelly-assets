// @ts-check
// The tool pages the showcase serves beside its index, read from site/tools.json: a page of the showcase itself, or a
// viewer, a tool package whose vite build the site serves under the package's name.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { escapeHtml } from './html.mjs';

export const TOOLS = 'site/tools.json';
const PACKAGES = 'tools/packages';
// Where site/build.mjs writes the tool links into the index's header.
export const NAV_MARK = '<!-- tools -->';

// The showcase's own files in site/, which site/build.mjs copies to the served site: its pages and every module they load.
export const SITE_FILES = [
  'index.html',
  'app.js',
  'filter.mjs',
  'combobox.mjs',
  'render.mjs',
  'explode.mjs',
  'modelFrame.mjs',
  'clipFrames.mjs',
  'style.css',
  'look.mjs',
  'lookOptions.mjs',
  'tile.mjs',
  'kinematics.mjs',
  'poseFile.mjs',
  'clearance.mjs',
  'fingers.mjs',
  'heldMotion.mjs',
  'hiding.mjs',
  'motionPose.mjs',
  'skin.mjs',
  'pose.mjs',
  'sounds.mjs',
];
// Modules the site ships from tools/ beside its own. The authoring tools draw the same fabric grain, and its
// declaration types it from their packages, which resolve only under tools/, so the shader lives there.
export const TOOLS_FILES = ['fabric.mjs'];

/**
 * A tool of site/tools.json: its link's label and the page or the viewer it opens.
 * @typedef {{ label: string; page?: string; viewer?: string }} Tool
 */

/**
 * @param {string} root
 * @param {string} viewer
 */
export const viewerDir = (root, viewer) => join(root, PACKAGES, viewer);
/**
 * @param {string} root
 * @param {string} viewer
 */
export const viewerDist = (root, viewer) => join(viewerDir(root, viewer), 'dist');

// Every tool, each held to naming a page of the showcase or a tool package, so a misspelt entry fails rather than
// never being linked.
/** @param {string} root */
export function readTools(root) {
  /** @type {{ tools: Tool[] }} */
  const { tools } = JSON.parse(readFileSync(join(root, TOOLS), 'utf8'));
  for (const tool of tools) {
    const where = tool.page
      ? join(root, 'site', tool.page)
      : tool.viewer
        ? join(viewerDir(root, tool.viewer), 'package.json')
        : undefined;
    if (!tool.label || !where || (tool.page && tool.viewer))
      throw new Error(`${TOOLS}: ${JSON.stringify(tool)} needs a label and one page or viewer`);
    if (!existsSync(where)) throw new Error(`${TOOLS}: ${tool.label} names ${where}, which does not exist`);
  }
  return tools;
}

// Relative, so the links hold under a Pages project path and on any local server.
/** @param {Pick<Tool, 'page' | 'viewer'>} tool */
export const toolHref = ({ page, viewer }) => page ?? `${viewer}/`;

/** @param {readonly Tool[]} tools */
export const toolLinks = (tools) =>
  tools.map((tool) => `<a href="${escapeHtml(toolHref(tool))}">${escapeHtml(tool.label)}</a>`).join('\n      ');

// The tool pages a built site serves that no link names: a page beside the index, or a directory with its own index.
/**
 * @param {string} out
 * @param {readonly Pick<Tool, 'page' | 'viewer'>[]} linked
 */
export function unlinkedTools(out, linked) {
  const hrefs = new Set(linked.map(toolHref));
  return readdirSync(out, { withFileTypes: true })
    .flatMap((entry) => {
      if (entry.isFile() && entry.name.endsWith('.html') && entry.name !== 'index.html') return [entry.name];
      if (entry.isDirectory() && existsSync(join(out, entry.name, 'index.html'))) return [`${entry.name}/`];
      return [];
    })
    .filter((href) => !hrefs.has(href))
    .sort();
}
