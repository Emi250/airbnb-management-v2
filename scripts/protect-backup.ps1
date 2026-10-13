param([Parameter(Mandatory=$true)][string]$Path)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Security
$resolved = (Resolve-Path -LiteralPath $Path).Path
$bytes = [IO.File]::ReadAllBytes($resolved)
$encrypted = [Security.Cryptography.ProtectedData]::Protect($bytes, $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
$destination = $resolved + '.dpapi'
if (Test-Path -LiteralPath $destination) { throw 'El respaldo cifrado ya existe' }
[IO.File]::WriteAllBytes($destination, $encrypted)
$verified = [Security.Cryptography.ProtectedData]::Unprotect([IO.File]::ReadAllBytes($destination), $null, [Security.Cryptography.DataProtectionScope]::CurrentUser)
if ([Convert]::ToBase64String($verified) -cne [Convert]::ToBase64String($bytes)) { throw 'Falló la verificación del cifrado' }
Remove-Item -LiteralPath $resolved
Write-Output 'Respaldo cifrado y verificado para el usuario actual de Windows.'
