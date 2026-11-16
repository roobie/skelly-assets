local id = 'short_military_transport_helicopter';
{
  title: 'Short military transport helicopter',
  sites: (import 'military-helicopter-body.libsonnet').sites(id, import 'short_military_transport_helicopter.spec.libsonnet'),
  tags: { 'vehicle-role': ['military'] },
}
