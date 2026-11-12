// Which assets version a built site renders, for the footer: from the build's own git state, never written by hand.
import { execFileSync } from 'node:child_process';

const REPOSITORY = 'https://github.com/roobie/skelly-assets';
const SHORT = 7;
const escape = (text) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

const git = (root, ...args) => {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return undefined;
  }
};

// A tag build renders its tag. Any other build renders a commit, which follows the latest release tag reachable from it,
// so the build needs the tags and history (the Pages job checks out with full depth). The CI variables name the commit
// when set; a local build reads its checkout.
export function readVersion(root, env = process.env) {
  const sha = env.GITHUB_SHA ?? git(root, 'rev-parse', 'HEAD');
  const tagBuild = env.GITHUB_REF_TYPE === 'tag';
  const tag = tagBuild ? env.GITHUB_REF_NAME : git(root, 'describe', '--tags', '--abbrev=0', '--match', 'v*');
  const branch = env.GITHUB_REF_NAME ?? git(root, 'rev-parse', '--abbrev-ref', 'HEAD');
  return { tag, sha, branch: tagBuild ? undefined : branch };
}

export function versionHtml({ tag, sha, branch }) {
  const tagLink = tag && `<a href="${REPOSITORY}/releases/tag/${escape(tag)}">${escape(tag)}</a>`;
  const short = branch && sha?.slice(0, SHORT);
  const commit = short && `${escape(branch)} at <a href="${REPOSITORY}/commit/${escape(sha)}">${escape(short)}</a>`;
  const text = [tagLink, commit].filter(Boolean).join(' + ');
  return text ? `<span style="color:#a4bdc0;font:12px system-ui,sans-serif">Assets ${text}</span>` : '';
}
