param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$bytes = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $Path).Path), $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
[Convert]::ToBase64String($bytes) | node "$PSScriptRoot/verify-business-backup.cjs"
if ($LASTEXITCODE -ne 0) { throw 'Falló la restauración de prueba' }
