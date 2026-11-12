---
read_if:
  - you add or change a cartridge's data file
  - you change the cartridge format, its sourcing rule or its consistency checks
  - you need a real cartridge dimension and where it was sourced
  - you change which material a cartridge's case is drawn in
  - "you continue the source-first cartridge work tracked by issue #109"
---

# Cartridge data

Cartridge dimensions determine ammunition identity and physical fit, so retain their source and keep unsupported values unknown rather than filling them from memory. When standards disagree, keep the governing source distinct from alternatives instead of averaging them. Vehicle-gun shells have no public standard drawing, so a dimension a source draws but does not print may be scaled from that drawing against a dimension it does print; its note says so, keeping it apart from printed values and open to replacement when a drawing is found. Parsing, source checks and cartridge relations live in `tools/packages/gun-authoring-tool/src/ammo/parseCartridge.ts` and `tools/packages/gun-authoring-tool/src/ammo/rules.ts`, `checkRelations`.

Real dimensions are an exception for ammunition, not a change to Gungen's stylized firearm scale; see `tools/packages/gun-authoring-tool/PROJECT.md`, "Scale and ammunition". The JSON/Jsonnet source contract is shared across the repository; see `tools/README.md`, "Model tools".

Shotshell presentation may use explicit visual proxies where source data is absent, but those proxies do not become cartridge measurements; see `tools/packages/gun-authoring-tool/docs/shotshell-export.md`. The pump-action fit uses the sourced loaded envelope; see `tools/packages/gun-authoring-tool/docs/pump-action-export.md`.

A cartridge's sourced `materials` record which cases exist; the one the game draws is a look, chosen apart from them in `models/guns/tables/appearance.jsonnet`, "cartridgeCases", so a look can change without touching sourced data and one row of sources need not pick a single finish.
