local site = import 'site.libsonnet';
{
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
}
