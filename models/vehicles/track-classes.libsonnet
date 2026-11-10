// The size classes of a track's running gear. Every track of one class takes the same links, sprocket, idler and
// wheels, so one salvaged from a machine fits any other of its class: a sprocket's teeth and a wheel's spacing are set
// by the link's pitch and guide. A class is one entry here; `tracks.libsonnet` names each track's class. Metres and
// kilograms; `track-kit.libsonnet` says each part's frame.
//
// A link is drawn as the shoe the band is laid from, `pitch` long and `width` across. A rubber band is one moulding,
// not links a scavenger can knock apart, so its segment has no `id` and no row. A wheel is a `disc`, or two discs
// either side of a `gap` the links' guide horns run in, each `tyre` thick in rubber at its rim, on a hub that stands
// `stub` inboard toward the hull.
local steel = 'steel-spall-black';
{
  // A compact machine's moulded rubber track, its rollers under a track frame.
  rubber_compact: {
    link: { pitch: 0.1, width: 0.34, thickness: 0.05, lug: { length: 0.04, height: 0.03 }, massKg: 2.5, finish: { shoe: 'rubber-black' } },
    sprocket: { id: 'track_sprocket_compact', massKg: 35, radius: 0.24, width: 0.16, gap: 0, tyre: 0, hub: { radius: 0.1, stub: 0.02 }, finish: { wheel: steel, hub: 'steel-grey' } },
    idler: { id: 'track_idler_compact', massKg: 30, radius: 0.24, width: 0.16, gap: 0, tyre: 0, hub: { radius: 0.1, stub: 0.02 }, finish: { wheel: 'paint-charcoal', hub: 'steel-grey' } },
    roller: { id: 'track_roller_compact', massKg: 8, radius: 0.06, width: 0.2, gap: 0, tyre: 0, hub: { radius: 0.03, stub: 0.02 }, finish: { wheel: 'steel-grey', hub: 'steel-grey' } },
  },
  // A medium crawler excavator's steel grouser shoes on a sealed chain, its rollers under a track frame.
  crawler_medium: {
    link: { id: 'track_shoe_crawler', massKg: 20, pitch: 0.171, width: 0.5, thickness: 0.06, lug: { length: 0.04, height: 0.03 }, finish: { shoe: steel } },
    sprocket: { id: 'track_sprocket_crawler', massKg: 70, radius: 0.32, width: 0.2, gap: 0, tyre: 0, hub: { radius: 0.14, stub: 0.05 }, finish: { wheel: steel, hub: 'steel-grey' } },
    idler: { id: 'track_idler_crawler', massKg: 60, radius: 0.32, width: 0.2, gap: 0, tyre: 0, hub: { radius: 0.14, stub: 0.05 }, finish: { wheel: 'paint-charcoal', hub: 'steel-grey' } },
    roller: { id: 'track_roller_crawler', massKg: 17, radius: 0.08, width: 0.3, gap: 0, tyre: 0, hub: { radius: 0.04, stub: 0.02 }, finish: { wheel: 'steel-grey', hub: 'steel-grey' } },
  },
  // A 20 to 30 t armoured vehicle's: rubber-padded steel links with a centre guide horn, run on twin rubber-tyred road
  // wheels on torsion-bar arms, a toothed drive sprocket and an idler. The wheel and link masses are estimates from
  // their drawn steel and aluminium; no maker publishes them.
  armoured_medium: {
    link: { id: 'track_link_armoured', massKg: 14, pitch: 0.15, width: 0.53, thickness: 0.06, pad: { height: 0.03, inset: 0.04 }, horn: { length: 0.08, height: 0.1, width: 0.06 }, finish: { shoe: steel, pad: 'rubber-black', horn: steel } },
    sprocket: { id: 'track_sprocket_armoured', massKg: 140, radius: 0.3, width: 0.36, gap: 0.12, tyre: 0, hub: { radius: 0.15, stub: 0.12 }, finish: { wheel: steel, hub: 'steel-grey' } },
    idler: { id: 'track_idler_armoured', massKg: 110, radius: 0.29, width: 0.36, gap: 0.12, tyre: 0.04, hub: { radius: 0.13, stub: 0.12 }, finish: { wheel: 'paint-charcoal', tyre: 'rubber-black', hub: 'steel-grey' } },
    roadWheel: { id: 'road_wheel_armoured', massKg: 85, radius: 0.31, width: 0.4, gap: 0.12, tyre: 0.05, hub: { radius: 0.12, stub: 0.12 }, finish: { wheel: 'paint-charcoal', tyre: 'rubber-black', hub: 'steel-grey' } },
  },
}
