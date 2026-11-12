local site = import 'site.libsonnet';
{
  title: 'Cement mixer',
  // The drum and its frames take the place of the tipper's tub.
  sites: site.adjust(
    (import 'tipper_truck.placements.libsonnet').sites,
    drop=['subframe', 'tub_floor', 'tub_front', 'tailgate', 'tip_ram', 'tub_side_near', 'tub_side_far'],
    add=[
      site.one('subframe', 'cement_mixer_subframe'),
      site.one('drive', 'cement_mixer_drive'),
      site.one('rear_frame', 'cement_mixer_rear_frame'),
      site.one('drum', 'cement_mixer_drum'),
      site.one('hopper', 'cement_mixer_hopper'),
      site.one('chute', 'cement_mixer_chute'),
      site.one('platform', 'cement_mixer_platform'),
      site.one('water_tank', 'cement_mixer_water_tank'),
    ] + site.pair('roller_stand', 'cement_mixer_roller_stand'),
  ),
  overlaps: [
    site.overlap('drive', 'drum', 0.238,
      'The drum\'s head band turns on the drive pedestal, which is drawn up into it.'),
    site.overlap('drum', 'hopper', 0.058,
      'The rear ring of the drum rises into the foot of the front wall of the hopper.'),
    site.overlap('drum', 'water_tank', 0.035,
      'The top end of the upright water tank runs into a ring of the drum beside it.'),
    site.overlap('subframe', 'drive', 0.12,
      'The drive\'s foot is bolted down into the runner of the subframe.'),
  ],
  unjudged: [
    site.unjudged('dashboard', 'radiator', 0.06,
      'The lower piece of tipper_truck_dashboard runs into the core piece of radiator_truck.'),
    site.unjudged('gearbox', 'drive', 0.09,
      'The case piece of gearbox_heavy runs into the foot piece of cement_mixer_drive.'),
    site.unjudged('gearbox', 'exhaust', 0.06,
      'The case piece of gearbox_heavy runs into the pipe piece of exhaust_long.'),
  ],
}
