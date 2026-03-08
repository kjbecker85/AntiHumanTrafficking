param(
  [string]$TenantId = "dd05e198-794e-4f9f-a7c9-b7a16d3d5946",

  [string]$SubscriptionId = "f7c16820-d87c-4f06-9ff9-228db7f03343",

  [string]$WorkspaceId = "d1ec479c-b425-4418-a844-3df6cf3ad61e",

  [string]$CapacityId = "B40DD9AA-A345-4F01-8A63-2D7DA9A15724",

  [string]$ResourceGroupName = "rg-aht-dev",

  [string]$VnetName = "aht-dev-vnet",

  [string]$GatewaySubnetName = "fabric-gateway",

  [string]$GatewayDisplayName = "aht-dev-vnet-gateway",

  [string]$SqlServerName = "aht-dev-sql-cu",

  [string]$SqlDatabaseName = "aht-dev-appdb",

  [string]$MirrorConnectionName = "aht-dev-sql-mirror",

  [string]$MirrorDatabaseName = "AHTOperationalMirrorDev",

  [string]$MirrorLoginName = "fabric_mirror_login",

  [Parameter(Mandatory = $true)]
  [string]$MirrorLoginPassword
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found."
  }
}

function Get-FabricAccessToken {
  az account get-access-token `
    --tenant $TenantId `
    --resource https://api.fabric.microsoft.com `
    --query accessToken `
    --output tsv
}

function Invoke-FabricRequest {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Method,

    [Parameter(Mandatory = $true)]
    [string]$Uri,

    [object]$Body
  )

  $headers = @{
    Authorization = "Bearer $(Get-FabricAccessToken)"
    "Content-Type" = "application/json"
  }

  if ($PSBoundParameters.ContainsKey('Body')) {
    return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers -Body ($Body | ConvertTo-Json -Depth 20 -Compress)
  }

  return Invoke-RestMethod -Method $Method -Uri $Uri -Headers $headers
}

function Ensure-GatewaySubnet {
  $subnet = az network vnet subnet show `
    --resource-group $ResourceGroupName `
    --vnet-name $VnetName `
    --name $GatewaySubnetName `
    --only-show-errors `
    --output json 2>$null

  if ($LASTEXITCODE -eq 0 -and $subnet) {
    return
  }

  az provider register --namespace Microsoft.PowerPlatform --wait | Out-Null

  az network vnet subnet create `
    --resource-group $ResourceGroupName `
    --vnet-name $VnetName `
    --name $GatewaySubnetName `
    --address-prefixes 10.20.3.0/24 `
    --delegations Microsoft.PowerPlatform/vnetaccesslinks `
    --only-show-errors `
    --output none
}

function Ensure-SqlServerIdentity {
  az sql server update `
    --resource-group $ResourceGroupName `
    --name $SqlServerName `
    --assign_identity `
    --identity-type SystemAssigned `
    --only-show-errors `
    --output none

  $server = az sql server show `
    --resource-group $ResourceGroupName `
    --name $SqlServerName `
    --query identity.principalId `
    --output tsv

  if (-not $server) {
    throw "Unable to resolve the SQL server system-assigned managed identity."
  }

  return $server
}

function Ensure-WorkspaceRoleAssignment {
  param([string]$PrincipalId)

  $assignments = Invoke-FabricRequest `
    -Method Get `
    -Uri "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/roleAssignments"

  $existing = $assignments.value | Where-Object { $_.principal.id -eq $PrincipalId }
  if ($existing) {
    return
  }

  Invoke-FabricRequest `
    -Method Post `
    -Uri "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/roleAssignments" `
    -Body @{
      principal = @{
        id = $PrincipalId
        type = 'ServicePrincipal'
      }
      role = 'Contributor'
    } | Out-Null
}

function Ensure-Gateway {
  $gateways = Invoke-FabricRequest -Method Get -Uri "https://api.fabric.microsoft.com/v1/gateways"
  $existing = $gateways.value | Where-Object { $_.displayName -eq $GatewayDisplayName } | Select-Object -First 1
  if ($existing) {
    return $existing.id
  }

  $created = Invoke-FabricRequest `
    -Method Post `
    -Uri "https://api.fabric.microsoft.com/v1/gateways" `
    -Body @{
      type = 'VirtualNetwork'
      displayName = $GatewayDisplayName
      capacityId = $CapacityId
      inactivityMinutesBeforeSleep = 30
      numberOfMemberGateways = 1
      virtualNetworkAzureResource = @{
        subscriptionId = $SubscriptionId
        resourceGroupName = $ResourceGroupName
        virtualNetworkName = $VnetName
        subnetName = $GatewaySubnetName
      }
    }

  return $created.id
}

function Ensure-Connection {
  param([string]$GatewayId)

  $connections = Invoke-FabricRequest -Method Get -Uri "https://api.fabric.microsoft.com/v1/connections"
  $existing = $connections.value | Where-Object { $_.displayName -eq $MirrorConnectionName } | Select-Object -First 1
  if ($existing) {
    return $existing.id
  }

  $created = Invoke-FabricRequest `
    -Method Post `
    -Uri "https://api.fabric.microsoft.com/v1/connections" `
    -Body @{
      connectivityType = 'VirtualNetworkGateway'
      gatewayId = $GatewayId
      displayName = $MirrorConnectionName
      connectionDetails = @{
        type = 'SQL'
        creationMethod = 'Sql'
        parameters = @(
          @{
            name = 'server'
            dataType = 'Text'
            value = "$SqlServerName.database.windows.net"
          },
          @{
            name = 'database'
            dataType = 'Text'
            value = $SqlDatabaseName
          }
        )
      }
      privacyLevel = 'Private'
      credentialDetails = @{
        singleSignOnType = 'None'
        connectionEncryption = 'Encrypted'
        skipTestConnection = $false
        credentials = @{
          credentialType = 'Basic'
          username = $MirrorLoginName
          password = $MirrorLoginPassword
        }
      }
    }

  return $created.id
}

function Ensure-MirroredDatabase {
  param([string]$ConnectionId)

  $items = Invoke-FabricRequest -Method Get -Uri "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/items"
  $existing = $items.value | Where-Object { $_.type -eq 'MirroredDatabase' -and $_.displayName -eq $MirrorDatabaseName } | Select-Object -First 1
  if ($existing) {
    return $existing.id
  }

  $definition = @{
    properties = @{
      source = @{
        type = 'AzureSqlDatabase'
        typeProperties = @{
          connection = $ConnectionId
        }
      }
      target = @{
        type = 'MountedRelationalDatabase'
        typeProperties = @{
          defaultSchema = 'dbo'
          format = 'Delta'
        }
      }
    }
  }

  $created = Invoke-FabricRequest `
    -Method Post `
    -Uri "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/mirroredDatabases" `
    -Body @{
      displayName = $MirrorDatabaseName
      description = 'Mirrored Azure SQL operational store for the anti-trafficking platform.'
      definition = @{
        parts = @(
          @{
            path = 'mirroring.json'
            payload = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes(($definition | ConvertTo-Json -Depth 20 -Compress)))
            payloadType = 'InlineBase64'
          }
        )
      }
    }

  return $created.id
}

function Start-Mirroring {
  param([string]$MirrorId)

  Invoke-FabricRequest `
    -Method Post `
    -Uri "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/mirroredDatabases/$MirrorId/startMirroring" `
    -Body '' | Out-Null
}

Require-Command -Name az

Ensure-GatewaySubnet
$sqlServerPrincipalId = Ensure-SqlServerIdentity
Ensure-WorkspaceRoleAssignment -PrincipalId $sqlServerPrincipalId
$gatewayId = Ensure-Gateway
$connectionId = Ensure-Connection -GatewayId $gatewayId
$mirrorId = Ensure-MirroredDatabase -ConnectionId $connectionId
Start-Mirroring -MirrorId $mirrorId

Write-Host "Gateway ID: $gatewayId"
Write-Host "Connection ID: $connectionId"
Write-Host "Mirrored database ID: $mirrorId"
