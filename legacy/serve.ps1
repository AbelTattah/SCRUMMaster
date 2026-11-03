<#
.SYNOPSIS
    Starts the Scrum Master todo app with the correct document root.

.DESCRIPTION
    The app's web root is the public/ folder (that is where index.php lives).
    Running "php -S localhost:8000" from the project root causes 404s because
    the front controller is public/index.php, not a file at the project root.

    This script:
      1. Finds a PHP executable (PATH, then the usual Windows locations).
      2. Checks the required extensions (pdo_sqlite, session).
      3. Picks a free port (8000 by default, or the next one free).
      4. Starts the built-in server with -t public and waits for Ctrl+C.

.EXAMPLE
    .\serve.ps1              # http://127.0.0.1:8000
    .\serve.ps1 -Port 8080   # http://127.0.0.1:8080
    .\serve.ps1 -NoBrowser   # don't auto-open the browser
#>

[CmdletBinding()]
param(
    [int]$Port = 8000,
    [switch]$NoBrowser,
    [switch]$NoCheck
)

$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot
$webRoot = Join-Path $projectRoot 'public'

if (-not (Test-Path (Join-Path $webRoot 'index.php'))) {
    Write-Error "public\index.php not found - run this script from the project root."
}

# --- 1. Locate PHP ---------------------------------------------------------
function Find-Php {
    $cmd = Get-Command php -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    foreach ($candidate in @(
        'C:\php\php.exe',
        "$env:LOCALAPPDATA\php\php.exe",
        "$env:ProgramFiles\php\php.exe",
        "${env:ProgramFiles(x86)}\php\php.exe"
    )) {
        if ($candidate -and (Test-Path $candidate)) { return $candidate }
    }
    return $null
}

$php = Find-Php
if (-not $php) {
    Write-Error "PHP was not found. Install PHP 8.x or add php.exe to your PATH."
}

# --- 2. Check required extensions -----------------------------------------
if (-not $NoCheck) {
    $extensions = (& $php -m) -join "`n"
    foreach ($required in @('PDO', 'pdo_sqlite', 'session')) {
        if ($extensions -notmatch "(?im)^\s*$([regex]::Escape($required))\s*$") {
            Write-Warning "PHP extension '$required' is missing - the app may not work. ($php -m)"
        }
    }
}

# --- 3. Find a free port ---------------------------------------------------
function Test-PortFree([int]$p) {
    $conn = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue
    return -not $conn
}

while (-not (Test-PortFree $Port)) {
    if ($Port -ge 8100) { Write-Error "No free port found between 8000 and 8100." }
    Write-Warning "Port $Port is in use - trying $($Port + 1)."
    $Port++
}

$url = "http://127.0.0.1:$Port"
$storage = Join-Path $projectRoot 'storage'
$dbFile = Join-Path $storage 'database.sqlite'

Write-Host ""
Write-Host "  Scrum Master" -ForegroundColor Magenta
Write-Host "  PHP    : $php"
Write-Host "  Web root: $webRoot"
Write-Host "  URL     : $url"
if (Test-Path $dbFile) {
    Write-Host "  Database: $dbFile"
} else {
    Write-Host "  Database: will be created on first visit (you'll be asked to sign up)" -ForegroundColor Yellow
}
Write-Host ""
Write-Host "  Stop the server with Ctrl+C." -ForegroundColor DarkGray
Write-Host ""

# --- 4. Open the browser (unless told not to) ------------------------------
if (-not $NoBrowser) {
    Start-Process $url
}

# --- 5. Run the built-in server --------------------------------------------
# Ctrl+C stops the server and returns you to the prompt.
try {
    & $php -S "127.0.0.1:$Port" -t $webRoot
} finally {
    Write-Host ""
    Write-Host "  Server stopped." -ForegroundColor DarkGray
}
