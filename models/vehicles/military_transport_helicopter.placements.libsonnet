local id = 'military_transport_helicopter';
{
  title: 'Military transport helicopter',
  sites: (import 'military-helicopter-body.libsonnet').sites(id, import 'military_transport_helicopter.spec.libsonnet'),
  tags: { 'vehicle-role': ['military'] },
}
