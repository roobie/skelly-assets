local catalogue = import 'models/catalogue/packs.libsonnet';
catalogue.recipe('skelly.wearables') + catalogue.items(catalogue.rows(catalogue.worn('skelly.wearables')))
