---
name: release
description: >-
  Cut a skelly-assets release: gather the change notes into CHANGELOG.md on a release branch, merge its PR, tag the
  merge commit and check what CI publishes. Use when asked to release, cut, tag or publish a version of the assets,
  to prepare or update a release branch or release PR, to regather a changelog section after merging main, to tag a
  v* version, or to check a release's run and assets; also when a release build fails on missing notes or a missing
  model-history.json.
---

# Releasing skelly-assets

Every agent releases the same way, so a release reads the same whoever cut it and no step depends on one agent's
habits. The steps and their reasons are below; the commands live in the scripts they cite, and those win over this
text.

## Who may do what

- An agent may prepare a release: the branch, its changelog section and a draft PR.
- BR, the repository owner, picks the version and decides when to release.
- Merging the release PR needs BR's go-ahead.
- Tagging publishes to every consumer and cannot be taken back, so an agent tags only on BR's word for that version.

## Before the release

1. Every PR has added its change note, or carries the `no-changelog` label; see `changes/README.md`. A release's
   notes come only from those files.
2. Merge the PRs meant for this version before cutting, so the section and the tag see the same main.
3. The previous release must carry `model-history.json`, because the tag build extends it and fails without it. If it
   is missing, give that release its file first; see `README.md`, "Releases", and `tools/model-history.mjs`,
   `backfillCommand`.

## Cut it

4. Branch `release/v<version>` from the latest main and run the release step of `tools/changelog.mjs`, which writes
   the version's section of `CHANGELOG.md` and deletes the notes it gathered. A tag build cannot push to main, so the
   section lands before the tag; see `changes/README.md`, "A release".
5. Commit, push and open a draft PR labelled `no-changelog`: the section is the notes already reviewed, not a change
   of its own. Mark it ready once its CI is green, since a draft cannot merge.
6. If main moves on before the merge, merge main into the branch, then restore `CHANGELOG.md` and `changes/` from
   origin/main and run the release step again. It refuses a version that already has a section (`tools/changelog.mjs`,
   `addSection`), and the regathered section is the only way main's new notes get in. Never hand-edit the section:
   every line in it was reviewed as a note, and a hand edit is not.

## Publish it

7. When CI is green and BR says go, merge the PR with a merge commit, the way every PR here lands.
8. On BR's word, tag that merge commit with an annotated `v<version>` tag whose message is the tag name, and push the
   tag. The release body carries the notes, so the message adds nothing a consumer reads. The tag build reads the
   section from the tagged tree and refuses a tag without one; see `.github/workflows/assets.yml`, `release`. It
   builds the tree twice, clean, and publishes only when the builds agree; see `README.md`, "Releases".
9. Watch the tag's run to the end. Then check the release: its body is the section, and it carries one archive per
   pack, the files `tools/pack-release.mjs`, `packRelease`, writes beside them, and `model-history.json`. A failed run
   publishes nothing. Rerun it if the cause was transient. If the previous release lacks `model-history.json`, give it
   the file (step 3) and rerun. Otherwise report to BR before touching the tag, because consumers pin tags.

## After it

10. Each consumer moves its pin in its own PR, apart from the release, with the changes the new assets need. Skelly's
    rules are in https://github.com/roobie/skelly, `docs/git-workflow.md`, "Shared asset pin bumps".
