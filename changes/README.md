---
read_if:
  - opening a PR, and writing its change note
  - preparing a release, or wondering where a release's notes come from
---

# Change notes

Each PR adds a note here saying what it changes for those who consume the assets: game developers and the games
that bundle the packs. A release's notes are assembled from these files, so each line is written by whoever knows
the reason and reviewed with the code. One file per change never conflicts with another PR, as a shared changelog
would. Notes generated from PR titles or commits would say how the code changed, not what a consumer notices.

## A note

Name the file `changes/<short-slug>.md`. Its front matter holds only a `type`: `breaking`, `added`, `changed`,
`fixed` or `removed`. The body is one or two lines for a consumer: what changed for them, and for a breaking
change, what they must do.

```md
---
type: fixed
---
The kettle's spout no longer floats beside its body.
```

A PR that changes nothing a consumer or a builder notices, such as a CI or test change, carries the
`no-changelog` label instead. CI checks every note and that a PR without that label adds one; see
`tools/changelog.mjs`.

## A release

A tag build cannot easily push to main, so a release's section is written before tagging rather than by the tag
build. `node tools/changelog.mjs release <version>` moves the pending notes into that version's section of
`CHANGELOG.md` and deletes them; that change lands on main through a PR labelled `no-changelog`, and tagging its
merge commit publishes the section as the release body. The tag build refuses a tag whose section is missing, so
a release never goes out with empty notes. The `edge` pre-release lists the notes still pending.
