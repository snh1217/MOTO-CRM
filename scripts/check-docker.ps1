$ErrorActionPreference = "Continue"

$docker = "C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe"
if (-not (Test-Path $docker)) {
  Write-Host "Docker CLI not found at: $docker"
  exit 1
}

Write-Host "Docker CLI:" -ForegroundColor Cyan
& $docker version

Write-Host "`nDocker service:" -ForegroundColor Cyan
Get-Service -Name com.docker.service -ErrorAction SilentlyContinue | Select-Object Status,StartType,Name,DisplayName | Format-Table -AutoSize

