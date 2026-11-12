// Writes a design's (or fixture's) voxelized .glb, at the gun class, and the matching deadvox model entry.
//
//   npm run export:glb -- ../../../models/guns/designs/archetype-ar.json --out "$XDG_RUNTIME_DIR/export" [--entry-out "$XDG_RUNTIME_DIR/entries"] [--id rifle_test]
//
// Writes <out>/<id>.glb and <entry-out>/<id>.model.json (entry-out defaults to out). The entry's `file` is `assets/models/<id>.glb`, where
// deadvox expects the model; `--id` defaults to the input's file name with dashes turned to underscores.

import process from 'node:process';
import { runExport } from './runExport.ts';

process.exitCode = runExport(process.argv.slice(2));
