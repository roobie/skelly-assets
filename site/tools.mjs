// The tool pages the showcase serves beside its index, read from site/tools.json: a page of the showcase itself, or a
// viewer, a tool package whose vite build the site serves under the package's name.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export const TOOLS = 'site/tools.json';
const PACKAGES = 'tools/packages';
// Where site/build.mjs writes the tool links into the index's header.
export const NAV_MARK = '<!-- tools -->';

export const viewerDir = (root, viewer) => join(root, PACKAGES, viewer);
export const viewerDist = (root, viewer) => join(viewerDir(root, viewer), 'dist');

// Every tool, each held to naming a page of the showcase or a tool package, so a misspelt entry fails rather than
// never being linked.
export function readTools(root) {
  const { tools } = JSON.parse(readFileSync(join(root, TOOLS), 'utf8'));
  for (const tool of tools) {
    const where = tool.page ? join(root, 'site', tool.page) : tool.viewer ? join(viewerDir(root, tool.viewer), 'package.json') : undefined;
    if (!tool.label || !where || (tool.page && tool.viewer)) throw new Error(`${TOOLS}: ${JSON.stringify(tool)} needs a label and one page or viewer`);
    if (!existsSync(where)) throw new Error(`${TOOLS}: ${tool.label} names ${where}, which does not exist`);
  }
  return tools;
}

// Relative, so the links hold under a Pages project path and on any local server.
export const toolHref = ({ page, viewer }) => page ?? `${viewer}/`;

const escape = (text) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
export const toolLinks = (tools) => tools.map((tool) => `<a href="${escape(toolHref(tool))}">${escape(tool.label)}</a>`).join('\n      ');

// The tool pages a built site serves that no link names: a page beside the index, or a directory with its own index.
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
