// Which assets version a built site renders, for the footer: from the build's own git state, never written by hand.
import { execFileSync } from 'node:child_process';

export const REPOSITORY = 'https://github.com/roobie/skelly-assets';
const SHORT = 7;
const escape = (text) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

const git = (root, ...args) => {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return undefined;
  }
};

// Pages deploys only from main, so a build is either exactly a release tag or main past its latest release. The latest
// tag needs the tags and history, which the Pages job checks out in full.
export function readVersion(root, env = process.env) {
  const sha = env.GITHUB_SHA ?? git(root, 'rev-parse', 'HEAD');
  const exact = git(root, 'describe', '--tags', '--exact-match', '--match', 'v*', 'HEAD');
  return { tag: exact ?? git(root, 'describe', '--tags', '--abbrev=0', '--match', 'v*'), sha, exact: exact !== undefined };
}

export function versionHtml({ tag, sha, exact }) {
  const tagLink = tag && `<a style="color:inherit" href="${REPOSITORY}/releases/tag/${escape(tag)}">${escape(tag)}</a>`;
  const commit = !exact && sha && `main at <a style="color:inherit" href="${REPOSITORY}/commit/${escape(sha)}">${escape(sha.slice(0, SHORT))}</a>`;
  const text = [tagLink, commit].filter(Boolean).join(' + ');
  return text ? `<span style="color:#a4bdc0;font:12px system-ui,sans-serif">${text}</span>` : '';
}
