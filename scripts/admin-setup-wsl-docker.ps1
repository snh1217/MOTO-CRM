$ErrorActionPreference = "Stop"

Write-Host "== Enable WSL2 + VirtualMachinePlatform (requires reboot) ==" -ForegroundColor Cyan
Write-Host "If this script fails with 'requires elevation', re-run from an elevated PowerShell." -ForegroundColor Yellow

# Enable Windows features for WSL2
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart

Write-Host "`n== Install/Update WSL ==" -ForegroundColor Cyan
try {
  wsl.exe --update
} catch {
  # On older builds, update may not exist yet; install covers it.
}

# Install WSL without picking a distro automatically; user can install Ubuntu afterwards.
wsl.exe --install --no-distribution

Write-Host "`n== Set WSL2 as default ==" -ForegroundColor Cyan
wsl.exe --set-default-version 2

Write-Host "`nReboot required. After reboot, install a distro (e.g. Ubuntu) and then start Docker Desktop." -ForegroundColor Yellow
Write-Host "Suggested (after reboot): wsl.exe --install -d Ubuntu" -ForegroundColor Yellow

