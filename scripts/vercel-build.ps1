$ErrorActionPreference = "Stop"

Set-ExecutionPolicy -Scope Process Bypass -Force | Out-Null
$env:Path += ";C:\\Program Files\\nodejs"

if (-not $env:VERCEL_TOKEN) {
  Write-Host "Missing VERCEL_TOKEN env var." -ForegroundColor Red
  Write-Host "Set it for this session, then re-run:" -ForegroundColor Yellow
  Write-Host "  `$env:VERCEL_TOKEN = '<your_vercel_token>'" -ForegroundColor Yellow
  exit 1
}

$vercelVersion = "50.13.2"

Push-Location (Split-Path $PSScriptRoot -Parent)
try {
  # On Windows, `vercel build` can fail with "Unable to find lambda for route" even when
  # the project builds fine on Vercel/Linux. Prefer running inside a Linux container.
  $docker = Get-Command docker -ErrorAction SilentlyContinue
  if ($docker) {
    Write-Host "Using Docker for Vercel build (Linux)..." -ForegroundColor Cyan
    $project = (Get-Location).Path
    # Use a named volume so host node_modules is not modified and repeat builds are faster.
    $bashCmd = ("npm ci && npm i -g vercel@{0} --no-audit --no-fund && " +
      "vercel pull --yes --environment=preview --token `$VERCEL_TOKEN && " +
      "vercel build --yes --token `$VERCEL_TOKEN") -f $vercelVersion
    docker run --rm `
      -e VERCEL_TOKEN=$env:VERCEL_TOKEN `
      -v "${project}:/app" `
      -v "moto-crm_vercel_node_modules:/app/node_modules" `
      -w /app `
      node:24-bullseye `
      bash -lc "$bashCmd"
    exit 0
  }

  # Pull project settings + envs into .vercel/ and .vercel/.env.*.local
  npx vercel@$vercelVersion pull --yes --environment=preview --token $env:VERCEL_TOKEN

  # Reproduce Vercel build output locally into .vercel/output
  npx vercel@$vercelVersion build --yes --token $env:VERCEL_TOKEN

  Write-Host "`nVercel build completed. Output: .vercel/output" -ForegroundColor Cyan
} finally {
  Pop-Location
}
