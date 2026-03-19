# Prisma на Windows: EPERM на query_engine-windows.dll.node
#
# Важно: с ключом -KillNode нельзя запускать через `npm run` (npm тоже на Node — процесс оборвётся).
# 1) Закройте Cursor / VS Code (или остановите dev-сервер вручную).
# 2) Откройте PowerShell → cd в корень репозитория → выполните:
#      .\scripts\prisma-generate-windows.ps1 -KillNode
#
# Если dev уже остановлен — достаточно без -KillNode:
#      .\scripts\prisma-generate-windows.ps1

param(
  [switch]$KillNode
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

if ($KillNode) {
  Write-Host "[prisma-win] Останавливаю процессы node.exe..." -ForegroundColor Yellow
  Get-Process -Name "node" -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  Stop PID $($_.Id)"
    Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 2
}

$prismaDir = Join-Path $root "node_modules\.prisma"
if (Test-Path $prismaDir) {
  Write-Host "[prisma-win] Удаляю $prismaDir" -ForegroundColor Yellow
  Remove-Item -Path $prismaDir -Recurse -Force
}

Write-Host "[prisma-win] prisma generate..." -ForegroundColor Cyan
npx prisma generate
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
Write-Host "[prisma-win] Готово." -ForegroundColor Green
