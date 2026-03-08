param(
  [string]$TenantId = "dd05e198-794e-4f9f-a7c9-b7a16d3d5946",

  [string]$WorkspaceConfigPath = "infra/fabric/workspaces.json",

  [string]$WarehouseName = "AntiHumanTraffickingWarehouse",

  [string]$SchemaFile = "database/fabric/warehouse/001_star_schema.sql",

  [string]$SecurityFile = "database/fabric/warehouse/002_security.sql",

  [string]$LoadFrameworkFile = "database/fabric/warehouse/003_load_framework.sql",

  [string]$LoadProceduresFile = "database/fabric/warehouse/004_load_procedures.sql",

  [string]$DevelopmentOperationalMirrorDatabaseName = "",

  [string]$TestOperationalMirrorDatabaseName = "",

  [string]$ProductionOperationalMirrorDatabaseName = "",

  [switch]$RunRefreshProcedure
)

$ErrorActionPreference = "Stop"

function Require-Command {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Name
  )

  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Required command '$Name' was not found in PATH."
  }
}

function Ensure-InvokeSqlcmd {
  if (Get-Command Invoke-Sqlcmd -ErrorAction SilentlyContinue) {
    return
  }

  Install-Module SqlServer -Scope CurrentUser -Force -AllowClobber
  Import-Module SqlServer -ErrorAction Stop
}

function Get-AzAccessToken {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Resource
  )

  $token = az account get-access-token `
    --tenant $TenantId `
    --resource $Resource `
    --query accessToken `
    --output tsv

  if (-not $token) {
    throw "Unable to acquire an access token for resource '$Resource'."
  }

  return $token
}

function Get-FabricHeaders {
  $fabricToken = Get-AzAccessToken -Resource "https://api.fabric.microsoft.com"
  return @{
    Authorization = "Bearer $fabricToken"
    "Content-Type" = "application/json"
  }
}

function Get-WarehouseDetails {
  param(
    [Parameter(Mandatory = $true)]
    [string]$WorkspaceId,

    [Parameter(Mandatory = $true)]
    [string]$ItemName,

    [Parameter(Mandatory = $true)]
    [hashtable]$Headers
  )

  $items = Invoke-RestMethod `
    -Method Get `
    -Uri "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/items" `
    -Headers $Headers

  $warehouse = $items.value | Where-Object { $_.type -eq "Warehouse" -and $_.displayName -eq $ItemName } | Select-Object -First 1
  if (-not $warehouse) {
    throw "Warehouse '$ItemName' was not found in workspace '$WorkspaceId'."
  }

  return Invoke-RestMethod `
    -Method Get `
    -Uri "https://api.fabric.microsoft.com/v1/workspaces/$WorkspaceId/warehouses/$($warehouse.id)" `
    -Headers $Headers
}

Require-Command -Name az
Ensure-InvokeSqlcmd

if (-not (Test-Path -Path $WorkspaceConfigPath -PathType Leaf)) {
  throw "Workspace config '$WorkspaceConfigPath' was not found."
}

if (-not (Test-Path -Path $SchemaFile -PathType Leaf)) {
  throw "Schema file '$SchemaFile' was not found."
}

if (-not (Test-Path -Path $SecurityFile -PathType Leaf)) {
  throw "Security file '$SecurityFile' was not found."
}

$loadFiles = @($LoadFrameworkFile, $LoadProceduresFile)
foreach ($loadFile in $loadFiles) {
  if (-not (Test-Path -Path $loadFile -PathType Leaf)) {
    throw "Load file '$loadFile' was not found."
  }
}

$workspaceConfig = Get-Content -Path $WorkspaceConfigPath -Raw | ConvertFrom-Json
$fabricHeaders = Get-FabricHeaders
$sqlToken = Get-AzAccessToken -Resource "https://database.windows.net/"

$targets = @(
  [PSCustomObject]@{
    Name = "Development"
    WorkspaceId = $workspaceConfig.workspaces.development.id
    OperationalMirrorDatabaseName = $DevelopmentOperationalMirrorDatabaseName
  },
  [PSCustomObject]@{
    Name = "Test"
    WorkspaceId = $workspaceConfig.workspaces.test.id
    OperationalMirrorDatabaseName = $TestOperationalMirrorDatabaseName
  },
  [PSCustomObject]@{
    Name = "Production"
    WorkspaceId = $workspaceConfig.workspaces.production.id
    OperationalMirrorDatabaseName = $ProductionOperationalMirrorDatabaseName
  }
)

foreach ($target in $targets) {
  Write-Host "Publishing warehouse schema to $($target.Name)..."

  $warehouse = Get-WarehouseDetails `
    -WorkspaceId $target.WorkspaceId `
    -ItemName $WarehouseName `
    -Headers $fabricHeaders

  $server = $warehouse.properties.connectionString
  if (-not $server) {
    throw "Warehouse '$WarehouseName' in workspace '$($target.WorkspaceId)' did not return a SQL endpoint."
  }

  Invoke-Sqlcmd `
    -ServerInstance $server `
    -Database $WarehouseName `
    -AccessToken $sqlToken `
    -InputFile $SchemaFile

  Invoke-Sqlcmd `
    -ServerInstance $server `
    -Database $WarehouseName `
    -AccessToken $sqlToken `
    -InputFile $SecurityFile

  if (-not [string]::IsNullOrWhiteSpace($target.OperationalMirrorDatabaseName)) {
    Invoke-Sqlcmd `
      -ServerInstance $server `
      -Database $WarehouseName `
      -AccessToken $sqlToken `
      -InputFile $LoadFrameworkFile

    Invoke-Sqlcmd `
      -ServerInstance $server `
      -Database $WarehouseName `
      -AccessToken $sqlToken `
      -InputFile $LoadProceduresFile `
      -Variable "OperationalMirrorDatabaseName=$($target.OperationalMirrorDatabaseName)"

    if ($RunRefreshProcedure.IsPresent) {
      Invoke-Sqlcmd `
        -ServerInstance $server `
        -Database $WarehouseName `
        -AccessToken $sqlToken `
        -Query "EXEC etl.usp_refresh_warehouse;"
    }
  }

  $summary = Invoke-Sqlcmd `
    -ServerInstance $server `
    -Database $WarehouseName `
    -AccessToken $sqlToken `
    -Query @"
SELECT
  DB_NAME() AS db_name,
  (SELECT COUNT(*) FROM sys.tables) AS table_count,
  (SELECT COUNT(*) FROM sys.security_policies) AS security_policy_count,
  (SELECT COUNT(*) FROM sys.procedures WHERE schema_id = SCHEMA_ID('etl')) AS etl_procedure_count
"@

  $summary | Format-Table -AutoSize
}
