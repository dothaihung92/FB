# Tu dong cai dat Node.js LTS neu chua co tren may.
# Duoc goi boi start.bat khi da co quyen Administrator.

$ErrorActionPreference = 'Stop'

function Test-NodeInstalled {
    return $null -ne (Get-Command node -ErrorAction SilentlyContinue)
}

function Refresh-PathFromRegistry {
    $machinePath = [System.Environment]::GetEnvironmentVariable('Path', 'Machine')
    $userPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
    $env:Path = "$machinePath;$userPath"
}

Write-Host "Kiem tra Node.js..."
if (Test-NodeInstalled) {
    Write-Host "Node.js da duoc cai dat san."
    exit 0
}

$installedViaWinget = $false
if (Get-Command winget -ErrorAction SilentlyContinue) {
    Write-Host "Dang cai Node.js LTS bang winget, vui long doi..."
    try {
        winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
        $installedViaWinget = $true
    } catch {
        Write-Host "Winget that bai, se thu cach tai truc tiep. Chi tiet loi: $($_.Exception.Message)"
    }
}

Refresh-PathFromRegistry

if (-not (Test-NodeInstalled)) {
    Write-Host "Dang tai bo cai Node.js truc tiep tu nodejs.org, vui long doi..."
    try {
        $arch = if ([Environment]::Is64BitOperatingSystem) { 'x64' } else { 'x86' }
        $index = Invoke-RestMethod -Uri 'https://nodejs.org/dist/index.json'
        $latestLts = $index | Where-Object { $_.lts } | Select-Object -First 1
        $ver = $latestLts.version
        $url = "https://nodejs.org/dist/$ver/node-$ver-$arch.msi"
        $msiPath = Join-Path $env:TEMP 'node-installer.msi'

        Write-Host "Dang tai: $url"
        Invoke-WebRequest -Uri $url -OutFile $msiPath -UseBasicParsing

        Write-Host "Dang cai dat Node.js $ver, vui long doi..."
        Start-Process 'msiexec.exe' -ArgumentList "/i `"$msiPath`" /quiet /norestart" -Wait

        Remove-Item $msiPath -Force -ErrorAction SilentlyContinue
    } catch {
        Write-Host "Tai/cai dat truc tiep that bai. Chi tiet loi: $($_.Exception.Message)"
    }
}

Refresh-PathFromRegistry

if (Test-NodeInstalled) {
    Write-Host "Cai dat Node.js thanh cong!"
    exit 0
} else {
    Write-Host "Khong the tu dong cai Node.js. Vui long cai thu cong tai https://nodejs.org"
    exit 1
}
