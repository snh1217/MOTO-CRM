$ErrorActionPreference = "Stop"

Set-ExecutionPolicy -Scope Process Bypass -Force | Out-Null
$env:Path += ";C:\\Program Files\\nodejs"

Write-Host "== Supabase Local Start ==" -ForegroundColor Cyan
Push-Location (Split-Path $PSScriptRoot -Parent)

try {
  npm run supabase:start
  npm run supabase:reset

  Write-Host "`nNext steps:" -ForegroundColor Cyan
  Write-Host "1) Copy .env.local.example -> .env.local and fill keys printed by supabase start."
  Write-Host "2) npm run dev"
} finally {
  Pop-Location
}

