param(
  [Parameter(Mandatory = $true)]
  [string]$ResourceGroupName,

  [Parameter(Mandatory = $true)]
  [string]$VmName,

  [Parameter(Mandatory = $true)]
  [string]$SqlServerName,

  [Parameter(Mandatory = $true)]
  [string]$DatabaseName,

  [Parameter(Mandatory = $true)]
  [string]$SqlAdminLogin,

  [Parameter(Mandatory = $true)]
  [string]$SqlAdminPassword,

  [string[]]$MigrationFiles = @(
    "database/azure-sql/migrations/001_initial_schema.sql",
    "database/azure-sql/migrations/002_seed_reference_data.sql"
  )
)

$ErrorActionPreference = "Stop"

function Convert-FileToBase64 {
  param(
    [Parameter(Mandatory = $true)]
    [string]$Path
  )

  if (-not (Test-Path -Path $Path -PathType Leaf)) {
    throw "Migration file '$Path' was not found."
  }

  $content = Get-Content -Path $Path -Raw
  return [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($content))
}

$migrationPayload = @()
foreach ($file in $MigrationFiles) {
  $migrationPayload += [PSCustomObject]@{
    Name = [System.IO.Path]::GetFileName($file)
    Base64 = Convert-FileToBase64 -Path $file
  }
}

$payloadJson = @($migrationPayload) | ConvertTo-Json -Compress -AsArray
$payloadBase64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($payloadJson))

$remoteScript = @"
#!/usr/bin/env bash
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

if ! python3 -c "import pytds, certifi" >/dev/null 2>&1; then
  rm -f /etc/apt/sources.list.d/mssql-release.list
  apt-get update
  apt-get install -y python3-pip python3-venv ca-certificates
  python3 -m pip install --upgrade pip
  python3 -m pip install python-tds certifi
fi

mkdir -p /tmp/aht-migrations

cat <<'JSON' | base64 -d > /tmp/aht-migrations/payload.json
$payloadBase64
JSON

python3 - <<'PY'
import base64
import json
from pathlib import Path

payload = json.loads(Path("/tmp/aht-migrations/payload.json").read_text())
if isinstance(payload, dict):
    payload = [payload]
for item in payload:
    Path("/tmp/aht-migrations", item["Name"]).write_bytes(base64.b64decode(item["Base64"]))
PY

python3 - <<'PY'
import certifi
from pathlib import Path
import pytds
import re
import json

server = "$SqlServerName.database.windows.net"
database = "$DatabaseName"
user = "$SqlAdminLogin"
password = "$SqlAdminPassword"
migration_dir = Path("/tmp/aht-migrations")
payload = json.loads(Path("/tmp/aht-migrations/payload.json").read_text())
if isinstance(payload, dict):
    payload = [payload]

def split_batches(text: str):
    return [batch.strip() for batch in re.split(r"(?im)^\s*GO\s*$", text) if batch.strip()]

with pytds.connect(
    server=server,
    database=database,
    user=user,
    password=password,
    port=1433,
    cafile=certifi.where(),
    validate_host=True,
    enc_login_only=False,
    autocommit=True,
) as conn:
    with conn.cursor() as cur:
        for item in payload:
            sql_file = migration_dir / item["Name"]
            print(f"Applying {sql_file.name}")
            sql_text = sql_file.read_text(encoding="utf-8")
            batches = split_batches(sql_text)
            for index, batch in enumerate(batches, start=1):
                print(f"  Batch {index}/{len(batches)}")
                cur.execute(batch)

print("Azure SQL migrations completed successfully.")
PY
"@

$tempScript = New-TemporaryFile
try {
  Set-Content -Path $tempScript.FullName -Value $remoteScript -NoNewline

  az vm run-command invoke `
    --resource-group $ResourceGroupName `
    --name $VmName `
    --command-id RunShellScript `
    --scripts "@$($tempScript.FullName)" `
    --output json
}
finally {
  Remove-Item -Path $tempScript.FullName -Force -ErrorAction SilentlyContinue
}
