local site = import 'site.libsonnet';
local s = import 'forklift.spec.libsonnet';
{
  title: 'Forklift',
  sites: [
    site.one('chassis', 'forklift_chassis'),
    site.one('body', 'forklift_body'),
    site.one('counterweight', 'forklift_counterweight'),
    site.one('guard', 'forklift_guard'),
    site.one('mast', 'forklift_mast'),
    site.one('carriage', 'forklift_carriage'),
    site.one('drive_axle', 'forklift_drive_axle', [s.frontAxle, s.frontHub, 0]),
    site.one('steer_axle', 'forklift_steer_axle', [s.rearAxle, s.rearHub, 0]),
    site.one('engine', 'engine_i4_diesel', [-0.22, 0.38, 0]),
    site.one('gearbox', 'gearbox_transaxle', [0.55, 0.2, 0]),
    site.one('radiator', 'radiator_small', [-0.56, 0.62, 0]),
    site.one('fuel_tank', 'fuel_tank_car', [0.0, 0.26, 0]),
    site.one('tail_pipe', 'forklift_tail_pipe', [-1.02, 1.1, -0.42]),
    site.one('seat', 'pan_seat', [-0.18, s.cover, 0]),
    site.one('steering_wheel', 'steering_wheel', [0.44, 1.37, 0]),
    site.one('gear_lever', 'gear_lever', [0.8, 1.3, -0.2]),
    site.one('step', 'forklift_step'),
    site.one('beacon', 'beacon_amber', [-0.5, s.roof, 0]),
  ]
  + site.pair('fork', 'forklift_fork')
  + site.pair('drive_wheel', 'forklift_drive_wheel', [s.frontAxle, s.frontHub, s.frontZ])
  + site.pair('steer_wheel', 'wheel_165_70r13', [s.rearAxle, s.rearHub, s.rearZ])
  + site.pair('tail_lamp', 'tail_lamp_small', [-1.26, 0.82, 0.44])
  + site.pair('work_lamp', 'work_lamp', [0.69, 1.72, 0.42])
  + site.batteryBay('battery_tray', [-0.4, 0.64, 0.46]),
  tags: { 'vehicle-role': ['construction'] },
  unjudged: [
    site.unjudged('body', 'engine', 0.212,
      'The cover piece of forklift_body runs into the block piece of engine_i4_diesel.'),
    site.unjudged('body', 'guard', 0.045,
      'The fender_5_near piece of forklift_body runs into the post_front_near piece of forklift_guard.'),
    site.unjudged('chassis', 'counterweight', 0.206,
      'The tail piece of forklift_chassis runs into the lower piece of forklift_counterweight.'),
    site.unjudged('chassis', 'drive_axle', 0.28,
      'The spine piece of forklift_chassis runs into the diff piece of forklift_drive_axle.'),
    site.unjudged('chassis', 'gearbox', 0.3,
      'The spine piece of forklift_chassis runs into the case piece of gearbox_transaxle.'),
    site.unjudged('chassis', 'steer_axle', 0.124,
      'The steer_mount piece of forklift_chassis runs into the trunnion piece of forklift_steer_axle.'),
    site.unjudged('counterweight', 'steer_axle', 0.121,
      'The lower piece of forklift_counterweight runs into the trunnion piece of forklift_steer_axle.'),
  ],
}
