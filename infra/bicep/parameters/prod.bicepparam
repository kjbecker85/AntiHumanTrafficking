using '../main.bicep'

param environmentName = 'prod'
param location = 'eastus2'
param resourceGroupName = 'rg-aht-prod'
param namePrefix = 'aht'
param sqlAdminLogin = 'sqlbootstrapadmin'
param sqlAdminPassword = ''
param sqlLocation = 'centralus'
param entraAdminLoginName = 'aht-fabric-admins'
param entraAdminObjectId = '0495d4f1-489e-4cdb-a917-af1db9986a8a'
param fabricAdminMembers = [
  'Kyle.becker@engagequalia.com'
  'aritstotle@engagequalia.com'
]
param deployFabricCapacity = false
