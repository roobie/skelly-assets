---
read_if:
  - you export or change shotshell or cartridge models for Deadvox
  - you change a shotshell's visual proxies or Deadvox's shell and hull item masses
  - you interpret the closure proxy or the drawn primer proxy
---

# Shotshell export

Metallic cartridges and shotshells share an exporter so model identity, units and Deadvox metadata do not drift by cartridge kind. See `src/gun/cartridgeExport.ts`, `exportCartridgeModels`.

Sourced cartridge values remain separate from visual proxies so a readable presentation cannot become a false manufacturer claim. An unspecified closure uses a conservative roll-crimp proxy at the sourced loaded envelope, leaving the source unknown. The primer is drawn to a trade-size proxy, as every metallic round's already was, so a shell's head reads beside theirs; the proxy lives in the drawn shapes, not in the cartridge record, whose primer stays unknown. See `src/gun/shotshellGeometry.ts`, `UNKNOWN_CLOSURE_PROXY` and `shotshellGeometry`, `models/guns/tables/roundShapes.jsonnet`, "shotshellPrimer", and `models/guns/cartridges/README.md`, "Cartridge data".

Deadvox's shell and spent-hull masses are gameplay values rather than sourced cartridge dimensions, so they belong to the inventory items, not to the exporter's sourced data; see https://github.com/roobie/skelly, `packages/deadvox/src/content/base/items-other.libsonnet`, `shell_12_gauge_00_buck`.
