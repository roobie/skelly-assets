local site = import 'site.libsonnet';
local s = import 'security_walker.spec.libsonnet';
local roof = std.foldl(std.max, [p[1] for p in s.torso.profile], 0);
{
  title: 'Security walker',
  sites: [
    site.one('hull', 'security_walker_hull'),
    site.one('belly', 'security_walker_belly'),
    site.one('face_guard', 'security_walker_face_guard'),
    site.one('sensor_window', 'security_walker_sensor_window'),
    site.one('sensor_array', 'security_walker_sensor_array'),
    site.one('engine', 'engine_i6_diesel', [-0.6, 2.91, 0]),
    site.one('radiator', 'radiator_truck', [-1.2525, 3.1, 0]),
    site.one('fuel_tank', 'fuel_tank_truck', [0.45, 2.9413, 0.55]),
    site.one('hydraulic_pack', 'security_walker_hydraulic_pack'),
    site.one('hatch', 'turret_hatch', [-0.3, roof, 0]),
    site.one('exhaust', 'exhaust_stack_small', [-0.9, roof, 0.65]),
    site.one('beacon', 'beacon_amber', [-0.9, roof, -0.65]),
  ]
  + site.batteryBay('truck_battery_tray', [0.45, 3.5663, 0.55])
  + site.pair('flank_armour', 'security_walker_flank_armour')
  + site.pair('hip_drive', 'security_walker_hip_drive')
  + site.pair('thigh', 'security_walker_thigh')
  + site.pair('shin', 'security_walker_shin')
  + site.pair('tarsus', 'security_walker_tarsus')
  + site.pair('foot', 'security_walker_foot')
  + std.flattenArrays([
    site.pair(joint + '_ram_barrel', 'security_walker_%s_ram_barrel' % joint)
    + site.pair(joint + '_ram_rod', 'security_walker_%s_ram_rod' % joint)
    + site.pair(joint + '_hoses', 'security_walker_%s_hoses' % joint)
    for joint in ['hip', 'knee', 'ankle']
  ])
  + site.pair('pod_mount', 'security_walker_pod_mount')
  + site.pair('weapon_pod', 'security_walker_weapon_pod')
  + site.pair('pod_gun', 'kpvt_heavy_machine_gun', [0.95, 3.73, 1.43])
  + site.pair('smoke_launcher', 'smoke_launcher_81mm', [0.45, roof, 0.85])
  + site.pair('work_lamp', 'work_lamp', [0.75, roof, 0.55]),
}
