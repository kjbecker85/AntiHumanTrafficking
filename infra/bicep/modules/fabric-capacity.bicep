param location string
param fabricCapacityName string
param fabricSkuName string
param adminMembers array

resource fabricCapacity 'Microsoft.Fabric/capacities@2023-11-01-preview' = {
  name: fabricCapacityName
  location: location
  sku: {
    name: fabricSkuName
    tier: 'Fabric'
  }
  properties: {
    administration: {
      members: adminMembers
    }
  }
}

output fabricCapacityResourceId string = fabricCapacity.id
