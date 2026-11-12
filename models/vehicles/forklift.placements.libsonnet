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
  overlaps: [
    site.overlap('chassis', 'counterweight',
      'The chassis draws its own lower block where the counterweight part is also placed, so that volume is drawn twice; the owner decides which to drop or shrink.'),
    site.overlap('counterweight', 'steer_axle',
      'The counterweight draws its own lower block where the steer_axle part is also placed, so that volume is drawn twice; the owner decides which to drop or shrink.'),
    site.overlap('chassis', 'steer_axle',
      'The chassis draws its own steer_mount block where the steer_axle part is also placed, so that volume is drawn twice; the owner decides which to drop or shrink.'),
    site.overlap('chassis', 'gearbox',
      'The chassis draws its own spine block where the gearbox part is also placed, so that volume is drawn twice; the owner decides which to drop or shrink.'),
    site.overlap('chassis', 'drive_axle',
      'The chassis draws its own spine block where the drive_axle part is also placed, so that volume is drawn twice; the owner decides which to drop or shrink.'),
  ],
}
