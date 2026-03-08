targetScope = 'subscription'

@description('Environment short name such as dev, test, or prod.')
param environmentName string

@description('Primary Azure region for all resources.')
param location string

@description('Resource group name to create for the data platform.')
param resourceGroupName string

@description('Short naming prefix for all resources.')
param namePrefix string

@description('Azure SQL administrator login used for bootstrap.')
param sqlAdminLogin string

@secure()
@description('Azure SQL administrator password used for bootstrap.')
param sqlAdminPassword string

@description('Optional override for the Azure SQL logical server name. Useful when retrying after a failed regional provisioning attempt left the original name reserved.')
param sqlServerNameOverride string = ''

@description('Entra administrator display name for Azure SQL.')
param entraAdminLoginName string

@description('Entra administrator object ID for Azure SQL.')
param entraAdminObjectId string

@description('SQL database name for the operational application store.')
param sqlDatabaseName string = '${namePrefix}-${environmentName}-appdb'

@description('Azure region for Azure SQL resources. Defaults to the primary deployment region, but can differ when SQL capacity is constrained in that region.')
param sqlLocation string = location

@description('Azure SQL SKU name.')
param sqlSkuName string = 'GP_S_Gen5_2'

@description('Azure SQL max size in bytes.')
param sqlMaxSizeBytes int = 34359738368

@description('Fabric capacity name.')
param fabricCapacityName string = '${namePrefix}-${environmentName}-fabric'

@description('Fabric capacity SKU name such as F2, F4, or F8.')
param fabricSkuName string = 'F2'

@description('Members who should administer the Fabric capacity.')
param fabricAdminMembers array = []

@description('Whether to create a new Fabric capacity in Azure. Set to false when using an existing trial or shared capacity.')
param deployFabricCapacity bool = true

@description('Virtual network CIDR blocks.')
param vnetAddressPrefixes array = [
  '10.20.0.0/16'
]

@description('Application subnet prefix.')
param appSubnetPrefix string = '10.20.1.0/24'

@description('Private endpoint subnet prefix.')
param privateEndpointSubnetPrefix string = '10.20.2.0/24'

var sqlServerName = empty(sqlServerNameOverride) ? toLower('${namePrefix}-${environmentName}-sql') : toLower(sqlServerNameOverride)
var keyVaultBaseName = toLower('${namePrefix}${environmentName}')
var keyVaultName = '${take(keyVaultBaseName, 21)}kv'
var userAssignedIdentityName = '${namePrefix}-${environmentName}-uami'
var logAnalyticsWorkspaceName = '${namePrefix}-${environmentName}-log'
var applicationInsightsName = '${namePrefix}-${environmentName}-appi'

resource resourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
}

module network './modules/network.bicep' = {
  name: 'network-${environmentName}'
  scope: resourceGroup
  params: {
    location: location
    namePrefix: namePrefix
    environmentName: environmentName
    vnetAddressPrefixes: vnetAddressPrefixes
    appSubnetPrefix: appSubnetPrefix
    privateEndpointSubnetPrefix: privateEndpointSubnetPrefix
  }
}

module observability './modules/observability.bicep' = {
  name: 'observability-${environmentName}'
  scope: resourceGroup
  params: {
    location: location
    logAnalyticsWorkspaceName: logAnalyticsWorkspaceName
    applicationInsightsName: applicationInsightsName
  }
}

module security './modules/security.bicep' = {
  name: 'security-${environmentName}'
  scope: resourceGroup
  params: {
    location: location
    keyVaultName: keyVaultName
    userAssignedIdentityName: userAssignedIdentityName
    privateEndpointSubnetId: network.outputs.privateEndpointSubnetId
    keyVaultPrivateDnsZoneId: network.outputs.keyVaultPrivateDnsZoneId
  }
}

module sql './modules/sql.bicep' = {
  name: 'sql-${environmentName}'
  scope: resourceGroup
  params: {
    location: sqlLocation
    sqlServerName: sqlServerName
    sqlDatabaseName: sqlDatabaseName
    sqlAdminLogin: sqlAdminLogin
    sqlAdminPassword: sqlAdminPassword
    entraAdminLoginName: entraAdminLoginName
    entraAdminObjectId: entraAdminObjectId
    sqlSkuName: sqlSkuName
    sqlMaxSizeBytes: sqlMaxSizeBytes
    privateEndpointSubnetId: network.outputs.privateEndpointSubnetId
    privateEndpointLocation: location
    sqlPrivateDnsZoneId: network.outputs.sqlPrivateDnsZoneId
    userAssignedIdentityId: security.outputs.userAssignedIdentityId
    logAnalyticsWorkspaceId: observability.outputs.logAnalyticsWorkspaceId
  }
}

module fabricCapacity './modules/fabric-capacity.bicep' = if (deployFabricCapacity) {
  name: 'fabric-capacity-${environmentName}'
  scope: resourceGroup
  params: {
    location: location
    fabricCapacityName: fabricCapacityName
    fabricSkuName: fabricSkuName
    adminMembers: fabricAdminMembers
  }
}

output resourceGroupId string = resourceGroup.id
output sqlServerName string = sql.outputs.sqlServerName
output sqlDatabaseName string = sql.outputs.sqlDatabaseName
output keyVaultUri string = security.outputs.keyVaultUri
output userAssignedIdentityClientId string = security.outputs.userAssignedIdentityClientId
output fabricCapacityResourceId string = deployFabricCapacity ? fabricCapacity!.outputs.fabricCapacityResourceId : ''
