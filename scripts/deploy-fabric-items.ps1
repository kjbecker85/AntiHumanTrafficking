param(
  [Parameter(Mandatory = $true)]
  [string]$TenantId,

  [Parameter(Mandatory = $true)]
  [string]$DevelopmentWorkspaceId,

  [Parameter(Mandatory = $true)]
  [string]$TestWorkspaceId,

  [Parameter(Mandatory = $true)]
  [string]$ProductionWorkspaceId,

  [string]$WarehouseName = "AntiHumanTraffickingWarehouse",

  [string]$WarehouseDescription = "Kimball warehouse for anti-trafficking investigation analytics."
)

$ErrorActionPreference = "Stop"

function Get-FabricAccessToken {
  $tokenJson = az account get-access-token `
    --tenant $TenantId `
    --resource https://api.fabric.microsoft.com `
    --output json | ConvertFrom-Json

  if (-not $tokenJson.accessToken) {
    throw "Unable to acquire a Fabric access token."
  }

  return $tokenJson.accessToken
}

function Ensure-Warehouse {
  param(
    [string]$WorkspaceId,
    [string]$ItemName,
    [string]$ItemDescription,
    [string]$AccessToken
  )

  $headers = @{
    Authorization = "Bearer $AccessToken"
    "Content-Type" = "application/json"
  }

  $existingItems = Invoke-RestMethod `
    -Method Get `
    -Uri "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/items" `
    -Headers $headers

  $existingWarehouse = $existingItems.value | Where-Object { $_.type -eq "Warehouse" -and $_.displayName -eq $ItemName } | Select-Object -First 1
  if ($existingWarehouse) {
    Write-Host "Warehouse '$ItemName' already exists in workspace $WorkspaceId."
    return $existingWarehouse.id
  }

  $body = @{
    displayName = $ItemName
    description = $ItemDescription
  } | ConvertTo-Json

  $created = Invoke-RestMethod `
    -Method Post `
    -Uri "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/warehouses" `
    -Headers $headers `
    -Body $body

  Write-Host "Created warehouse '$ItemName' in workspace $WorkspaceId."
  if ($created.id) {
    return $created.id
  }

  Start-Sleep -Seconds 2
  $refreshedItems = Invoke-RestMethod `
    -Method Get `
    -Uri "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/items" `
    -Headers $headers

  $refreshedWarehouse = $refreshedItems.value | Where-Object { $_.type -eq "Warehouse" -and $_.displayName -eq $ItemName } | Select-Object -First 1
  if (-not $refreshedWarehouse) {
    throw "Warehouse '$ItemName' was created but could not be reloaded from workspace $WorkspaceId."
  }

  return $refreshedWarehouse.id
}

$accessToken = Get-FabricAccessToken

$workspaces = @(
  @{ Name = "Development"; Id = $DevelopmentWorkspaceId },
  @{ Name = "Test"; Id = $TestWorkspaceId },
  @{ Name = "Production"; Id = $ProductionWorkspaceId }
)

foreach ($workspace in $workspaces) {
  $warehouseId = Ensure-Warehouse `
    -WorkspaceId $workspace.Id `
    -ItemName $WarehouseName `
    -ItemDescription $WarehouseDescription `
    -AccessToken $accessToken

  Write-Host "Workspace $($workspace.Name) warehouse ID: $warehouseId"
}

Write-Host "Fabric warehouse provisioning complete."
Write-Host "Next steps:"
Write-Host "1. Connect each workspace to Git."
Write-Host "2. Publish SQL assets from database/fabric/warehouse."
Write-Host "3. Configure deployment pipelines between Development, Test, and Production."
