# ============================================================
# PHP Windows Diagnostic & Repair Script
# Repairs common PHP + PDO + SQLite configuration problems
# ============================================================

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "       PHP DIAGNOSTIC & REPAIR TOOL" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------
# 1. Find PHP
# ------------------------------------------------------------

Write-Host "[1/8] Locating PHP..." -ForegroundColor Yellow

$phpCommand = Get-Command php.exe -ErrorAction SilentlyContinue

if (-not $phpCommand) {
    Write-Host ""
    Write-Host "ERROR: PHP was not found in PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "Install PHP or add its directory to PATH first."
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

$phpPath = $phpCommand.Source
$phpDir  = Split-Path $phpPath -Parent

Write-Host "PHP executable: $phpPath" -ForegroundColor Green
Write-Host "PHP directory:  $phpDir" -ForegroundColor Green

# ------------------------------------------------------------
# 2. PHP version
# ------------------------------------------------------------

Write-Host ""
Write-Host "[2/8] Checking PHP version..." -ForegroundColor Yellow

& $phpPath -v

# ------------------------------------------------------------
# 3. Find php.ini
# ------------------------------------------------------------

Write-Host ""
Write-Host "[3/8] Finding php.ini..." -ForegroundColor Yellow

$iniOutput = & $phpPath --ini 2>&1

$iniOutput | ForEach-Object {
    Write-Host $_
}

$loadedIni = & $phpPath -r "echo php_ini_loaded_file();" 2>$null

if ([string]::IsNullOrWhiteSpace($loadedIni)) {

    Write-Host ""
    Write-Host "No php.ini is currently loaded." -ForegroundColor Yellow

    $developmentIni = Join-Path $phpDir "php.ini-development"
    $productionIni  = Join-Path $phpDir "php.ini-production"
    $targetIni      = Join-Path $phpDir "php.ini"

    if (Test-Path $developmentIni) {

        Write-Host "Creating php.ini from php.ini-development..." -ForegroundColor Yellow

        Copy-Item $developmentIni $targetIni

        $loadedIni = $targetIni

        Write-Host "Created: $targetIni" -ForegroundColor Green
    }
    else {
        Write-Host ""
        Write-Host "ERROR: No php.ini-development found." -ForegroundColor Red
        Write-Host "Your PHP installation may be incomplete."
        Read-Host "Press Enter to exit"
        exit 1
    }
}

$iniPath = $loadedIni.Trim()

Write-Host "Using php.ini: $iniPath" -ForegroundColor Green

# ------------------------------------------------------------
# 4. Backup php.ini
# ------------------------------------------------------------

Write-Host ""
Write-Host "[4/8] Backing up php.ini..." -ForegroundColor Yellow

$backupPath = "$iniPath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

Copy-Item $iniPath $backupPath -Force

Write-Host "Backup created:" -ForegroundColor Green
Write-Host $backupPath

# ------------------------------------------------------------
# 5. Check extension directory
# ------------------------------------------------------------

Write-Host ""
Write-Host "[5/8] Checking PHP extension directory..." -ForegroundColor Yellow

$extensionDir = & $phpPath -r "echo ini_get('extension_dir');" 2>$null

if ([string]::IsNullOrWhiteSpace($extensionDir)) {
    $extensionDir = Join-Path $phpDir "ext"
}
elseif (-not [System.IO.Path]::IsPathRooted($extensionDir)) {
    $extensionDir = Join-Path $phpDir $extensionDir
}

$extensionDir = [System.IO.Path]::GetFullPath($extensionDir)

Write-Host "Extension directory: $extensionDir"

if (-not (Test-Path $extensionDir)) {
    Write-Host ""
    Write-Host "ERROR: Extension directory does not exist." -ForegroundColor Red
    Write-Host $extensionDir

    Read-Host "Press Enter to exit"
    exit 1
}

# ------------------------------------------------------------
# 6. Check SQLite DLLs
# ------------------------------------------------------------

Write-Host ""
Write-Host "[6/8] Checking SQLite extensions..." -ForegroundColor Yellow

$pdoSqliteDll = Join-Path $extensionDir "php_pdo_sqlite.dll"
$sqliteDll    = Join-Path $extensionDir "php_sqlite3.dll"
$libSqliteDll = Join-Path $phpDir "libsqlite3.dll"

Write-Host ""

if (Test-Path $pdoSqliteDll) {
    Write-Host "FOUND: php_pdo_sqlite.dll" -ForegroundColor Green
}
else {
    Write-Host "MISSING: php_pdo_sqlite.dll" -ForegroundColor Red
}

if (Test-Path $sqliteDll) {
    Write-Host "FOUND: php_sqlite3.dll" -ForegroundColor Green
}
else {
    Write-Host "MISSING: php_sqlite3.dll" -ForegroundColor Red
}

if (Test-Path $libSqliteDll) {
    Write-Host "FOUND: libsqlite3.dll" -ForegroundColor Green
}
else {
    Write-Host "MISSING: libsqlite3.dll" -ForegroundColor Red
}

if (-not (Test-Path $pdoSqliteDll)) {
    Write-Host ""
    Write-Host "SQLite PDO extension is not included in this PHP installation." -ForegroundColor Red
    Write-Host "The script cannot safely download a mismatched DLL automatically."
    Write-Host ""
    Write-Host "You likely need a complete PHP Windows distribution."
    Read-Host "Press Enter to exit"
    exit 1
}

# ------------------------------------------------------------
# 7. Repair php.ini
# ------------------------------------------------------------

Write-Host ""
Write-Host "[7/8] Enabling PDO SQLite..." -ForegroundColor Yellow

$content = Get-Content $iniPath -Raw

# Ensure extension_dir points to the correct directory.
$escapedExtensionDir = $extensionDir.Replace('\', '\\')

if ($content -match '(?m)^\s*;?\s*extension_dir\s*=') {

    $content = [regex]::Replace(
        $content,
        '(?m)^\s*;?\s*extension_dir\s*=.*$',
        "extension_dir = `"$extensionDir`""
    )
}
else {

    $content += "`r`n`r`n; Added by PHP repair script`r`nextension_dir = `"$extensionDir`"`r`n"
}

# Enable pdo_sqlite
if ($content -match '(?m)^\s*;?\s*extension\s*=\s*pdo_sqlite\s*$') {

    $content = [regex]::Replace(
        $content,
        '(?m)^\s*;?\s*extension\s*=\s*pdo_sqlite\s*$',
        'extension=pdo_sqlite'
    )
}
else {

    $content += "`r`nextension=pdo_sqlite`r`n"
}

# Enable sqlite3
if ($content -match '(?m)^\s*;?\s*extension\s*=\s*sqlite3\s*$') {

    $content = [regex]::Replace(
        $content,
        '(?m)^\s*;?\s*extension\s*=\s*sqlite3\s*$',
        'extension=sqlite3'
    )
}
else {

    $content += "`r`next`r`nextension=sqlite3`r`n"
}

Set-Content -Path $iniPath -Value $content -Encoding UTF8

Write-Host "php.ini updated." -ForegroundColor Green

# ------------------------------------------------------------
# 8. Add PHP directory to USER PATH
# ------------------------------------------------------------

Write-Host ""
Write-Host "[8/8] Checking Windows PATH..." -ForegroundColor Yellow

$userPath = [Environment]::GetEnvironmentVariable(
    "Path",
    "User"
)

$pathEntries = @()

if ($userPath) {
    $pathEntries = $userPath -split ';'
}

if ($pathEntries -notcontains $phpDir) {

    Write-Host "PHP directory is not in User PATH." -ForegroundColor Yellow
    Write-Host "Adding: $phpDir"

    if ([string]::IsNullOrWhiteSpace($userPath)) {
        $newUserPath = $phpDir
    }
    else {
        $newUserPath = "$userPath;$phpDir"
    }

    [Environment]::SetEnvironmentVariable(
        "Path",
        $newUserPath,
        "User"
    )

    # Also update the current PowerShell session.
    $env:Path = "$env:Path;$phpDir"

    Write-Host "PHP added to User PATH." -ForegroundColor Green
}
else {
    Write-Host "PHP is already in User PATH." -ForegroundColor Green
}

# ------------------------------------------------------------
# Ensure libsqlite3.dll can be found
# ------------------------------------------------------------

if (Test-Path $libSqliteDll) {

    $currentPathEntries = $env:Path -split ';'

    if ($currentPathEntries -notcontains $phpDir) {
        $env:Path = "$env:Path;$phpDir"
    }

    Write-Host ""
    Write-Host "libsqlite3.dll is available." -ForegroundColor Green
}

# ------------------------------------------------------------
# Final diagnostics
# ------------------------------------------------------------

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "              FINAL DIAGNOSTICS" -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "PHP version:"
& $phpPath -v | Select-Object -First 1

Write-Host ""
Write-Host "Loaded php.ini:"
& $phpPath -r "echo php_ini_loaded_file();"

Write-Host ""
Write-Host ""
Write-Host "PDO available:"
& $phpPath -r "var_dump(class_exists('PDO'));"

Write-Host ""
Write-Host "PDO drivers:"
& $phpPath -r "print_r(PDO::getAvailableDrivers());"

Write-Host ""
Write-Host "SQLite modules:"
& $phpPath -m | Select-String -Pattern "PDO|sqlite"

Write-Host ""

# ------------------------------------------------------------
# Test actual SQLite connection
# ------------------------------------------------------------

Write-Host "Testing SQLite connection..." -ForegroundColor Yellow

$testResult = & $phpPath -r @"
try {
    \$db = new PDO('sqlite::memory:');
    \$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    \$db->exec('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)');
    echo "SQLITE_TEST_SUCCESS";
} catch (Throwable \$e) {
    echo "SQLITE_TEST_FAILED: " . \$e->getMessage();
}
"@

if ($testResult -match "SQLITE_TEST_SUCCESS") {

    Write-Host ""
    Write-Host "SUCCESS: PHP + PDO + SQLite are working." -ForegroundColor Green
}
else {

    Write-Host ""
    Write-Host "SQLite test failed:" -ForegroundColor Red
    Write-Host $testResult

    Write-Host ""
    Write-Host "Possible causes:" -ForegroundColor Yellow
    Write-Host "1. libsqlite3.dll is missing."
    Write-Host "2. PHP architecture/DLL mismatch."
    Write-Host "3. PHP extension dependencies are missing."
    Write-Host "4. Another PHP installation is being used."
}

Write-Host ""
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host "Repair/check complete." -ForegroundColor Cyan
Write-Host "==============================================" -ForegroundColor Cyan
Write-Host ""

Read-Host "Press Enter to close"