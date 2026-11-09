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
`fixed` or `removed`. The body is one or two lines for a consumer: what changed for them.

A breaking note also says what a consumer must do, after a line `Upgrade:`. A consumer moves its pin over one or
more releases in a single commit, with the changes the new assets need, so each release gathers its notes' steps
into one "Upgrading from" list rather than leaving them to be dug out of the changes. A renamed id needs no step of
its own beyond applying the release's `renames.json`, which maps every retired id to its current one.

```md
---
type: breaking
---
The kettle's spout is a separate model, `kettle_spout`.

Upgrade:
- Place `kettle_spout` wherever you place `kettle`.
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
