param(
  [Parameter(Mandatory = $true)]
  [string]$ResourceGroupName,

  [Parameter(Mandatory = $true)]
  [string]$VmName,

  [Parameter(Mandatory = $true)]
  [string]$SqlServerName,

  [Parameter(Mandatory = $true)]
  [string]$SqlDatabaseName,

  [Parameter(Mandatory = $true)]
  [string]$SqlAdminLogin,

  [Parameter(Mandatory = $true)]
  [string]$SqlAdminPassword,

  [string]$MirrorLoginName = 'fabric_mirror_login',

  [string]$MirrorUserName = 'fabric_mirror_user',

  [Parameter(Mandatory = $true)]
  [string]$MirrorLoginPassword
)

$ErrorActionPreference = "Stop"

$remoteScript = @"
set -eu
if ! python3 -c "import pytds, certifi" >/dev/null 2>&1; then
  apt-get update
  apt-get install -y python3-pip ca-certificates
  python3 -m pip install --upgrade pip
  python3 -m pip install python-tds certifi
fi
python3 - <<'PY'
import certifi
import pytds
import re

def split_batches(text: str):
    return [batch.strip() for batch in re.split(r"(?im)^\s*GO\s*$", text) if batch.strip()]

server = "$SqlServerName.database.windows.net"
user = "$SqlAdminLogin"
password = "$SqlAdminPassword"
mirror_login = "$MirrorLoginName"
mirror_user = "$MirrorUserName"
mirror_password = "$MirrorLoginPassword"

master_sql = f"""
IF NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = N'{mirror_login}')
BEGIN
  CREATE LOGIN [{mirror_login}] WITH PASSWORD = N'{mirror_password}';
END
ELSE
BEGIN
  ALTER LOGIN [{mirror_login}] WITH PASSWORD = N'{mirror_password}';
END
GO
"""

app_sql = f"""
IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'{mirror_user}')
BEGIN
  CREATE USER [{mirror_user}] FOR LOGIN [{mirror_login}];
END
GO
GRANT CONTROL TO [{mirror_user}];
GO
"""

for database, script in [('master', master_sql), ('$SqlDatabaseName', app_sql)]:
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
            for batch in split_batches(script):
                cur.execute(batch)
    print(f"Configured mirroring principal in {database}.")
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
