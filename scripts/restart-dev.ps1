# Restart Next.js dev server (Windows)
# Usage:
#   .\scripts\restart-dev.ps1
#   .\scripts\restart-dev.ps1 -Port 4000
#   npm run dev:restart

param(
  [int]$Port = 3000
)

$ErrorActionPreference = "Continue"
$Root = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $Root

function Stop-ListeningPort {
  param([int]$ListenPort)

  $stopped = @()

  if (Get-Command Get-NetTCPConnection -ErrorAction SilentlyContinue) {
    $pids = Get-NetTCPConnection -LocalPort $ListenPort -State Listen -ErrorAction SilentlyContinue |
      Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($procId in $pids) {
      if ($procId -and $procId -ne 0) {
        Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        $stopped += $procId
      }
    }
    return $stopped
  }

  $matches = netstat -ano | Select-String ":\s*$ListenPort\s+.*LISTENING"
  foreach ($line in $matches) {
    $procId = ($line.ToString().Trim() -split '\s+')[-1]
    if ($procId -match '^\d+$') {
      Stop-Process -Id ([int]$procId) -Force -ErrorAction SilentlyContinue
      $stopped += [int]$procId
    }
  }

  return $stopped
}

Write-Host "[restart-dev] project: $Root"
Write-Host "[restart-dev] stopping port $Port ..."

$killed = Stop-ListeningPort -ListenPort $Port
if ($killed.Count -gt 0) {
  Write-Host "[restart-dev] stopped PID(s): $($killed -join ', ')"
} else {
  Write-Host "[restart-dev] no listener on port $Port"
}

Start-Sleep -Seconds 1

$runner = if (Test-Path "$Root\pnpm-lock.yaml") { "pnpm" } else { "npm" }
Write-Host "[restart-dev] starting: $runner dev (http://localhost:$Port)"
Write-Host ""

if ($runner -eq "pnpm") {
  & pnpm dev -- -p $Port
} else {
  & npm run dev -- -p $Port
}
