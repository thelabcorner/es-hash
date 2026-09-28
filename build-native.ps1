param([string]$Name = "")
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$esabiRoot = Join-Path $root 'deps\esabi'
$include = Join-Path $esabiRoot 'include'
$expectedEsabiCommit = '65c9c3ce627a26a89d6bf90547678841df0cf981'
if (-not (Test-Path -LiteralPath (Join-Path $include 'esabi\esabi.h'))) { throw 'Vendored ESABI headers not found at deps/esabi/include.' }
$pin = Get-Content -LiteralPath (Join-Path $esabiRoot 'ESABI_PIN')
$actualEsabiCommit = (($pin | Where-Object { $_ -like 'commit=*' }) -replace '^commit=', '').Trim()
if ($actualEsabiCommit -ne $expectedEsabiCommit) { throw "ESABI pin mismatch: expected $expectedEsabiCommit, found $actualEsabiCommit" }
function PinValue([string]$name) {
  return (($pin | Where-Object { $_ -like ($name + '=*') }) -replace ('^' + [regex]::Escape($name) + '='), '').Trim().ToLowerInvariant()
}
$pinnedFiles = @(
  @('esabi_h_sha256', (Join-Path $include 'esabi\esabi.h')),
  @('externalobject_h_sha256', (Join-Path $include 'esabi\externalobject.h')),
  @('value_h_sha256', (Join-Path $include 'esabi\value.h')),
  @('license_sha256', (Join-Path $esabiRoot 'LICENSE'))
)
foreach ($entry in $pinnedFiles) {
  $expectedHash = PinValue $entry[0]
  if (-not $expectedHash) { throw "ESABI pin is missing $($entry[0])" }
  $actualHash = (Get-FileHash -LiteralPath $entry[1] -Algorithm SHA256).Hash.ToLowerInvariant()
  if ($actualHash -ne $expectedHash) { throw "Vendored ESABI file hash mismatch for $($entry[1]): expected $expectedHash, found $actualHash" }
}
$vswhere = 'C:\Program Files (x86)\Microsoft Visual Studio\Installer\vswhere.exe'
if (-not (Test-Path -LiteralPath $vswhere)) { throw 'vswhere.exe not found; install Visual Studio C++ Build Tools.' }
$install = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $install) { throw 'MSVC x64 C++ tools not found.' }
$devcmd = Join-Path $install 'Common7\Tools\VsDevCmd.bat'
$envBlock = cmd /c "`"$devcmd`" -arch=x64 -host_arch=x64 >nul 2>&1 && set"
foreach ($line in $envBlock) { if ($line -match '^(.*?)=(.*)$') { [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process') } }
$outDir = Join-Path $root 'dist\native'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$source = Join-Path $root 'native\eshash_native.c'
$compilerPath = (Get-Command cl.exe -ErrorAction Stop).Source
$compilerVersion = (Get-Item -LiteralPath $compilerPath).VersionInfo.FileVersion
$compileProfile = 'x64|O2|W4|WX|MT|LD|LONG32|WINDOWS|bcrypt'
$parts = @(
  (Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash,
  (Get-FileHash -LiteralPath $MyInvocation.MyCommand.Path -Algorithm SHA256).Hash,
  (Get-FileHash -LiteralPath (Join-Path $include 'esabi\esabi.h') -Algorithm SHA256).Hash,
  (Get-FileHash -LiteralPath (Join-Path $include 'esabi\externalobject.h') -Algorithm SHA256).Hash,
  (Get-FileHash -LiteralPath (Join-Path $include 'esabi\value.h') -Algorithm SHA256).Hash,
  $actualEsabiCommit,
  $compilerVersion,
  $compileProfile
)
$sha256 = [Security.Cryptography.SHA256]::Create()
try {
  $fingerprint = ([BitConverter]::ToString($sha256.ComputeHash([Text.Encoding]::UTF8.GetBytes(($parts -join ':'))))).Replace('-', '').ToLowerInvariant().Substring(0,16)
} finally { $sha256.Dispose() }
if (-not $Name) { $Name = "ESHASHNative_$fingerprint.dll" }
$out = Join-Path $outDir $Name
$obj = Join-Path $outDir "eshash_native_$fingerprint.obj"
$implib = Join-Path $outDir "ESHASHNative_$fingerprint.lib"
if (-not (Test-Path -LiteralPath $out)) {
  $compileArgs = @('/nologo', '/O2', '/W4', '/WX', '/MT', '/LD', '/D', 'ESABI_ABI_PROFILE=ESABI_ABI_PROFILE_LONG32', '/I', $include, $source, 'bcrypt.lib', ('/Fo' + $obj), '/link', '/MACHINE:X64', '/SUBSYSTEM:WINDOWS', ('/OUT:' + $out), ('/IMPLIB:' + $implib))
  & cl @compileArgs
  if ($LASTEXITCODE -ne 0) { throw "cl failed: $LASTEXITCODE" }
}
$releaseDir = Join-Path $outDir 'release'
New-Item -ItemType Directory -Force -Path $releaseDir | Out-Null
$releaseOut = Join-Path $releaseDir 'ESHASHNative.dll'
Copy-Item -LiteralPath $out -Destination $releaseOut -Force
Set-Content -LiteralPath (Join-Path $outDir 'ESHASHNative.current') -Value $Name -Encoding ascii -NoNewline
Write-Output "Built/reused x64 ESABI 0.3.1 DLL: $out; release copy: $releaseOut"
& dumpbin /headers $out
& dumpbin /exports $out
