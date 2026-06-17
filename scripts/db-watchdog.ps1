# OneGate DB watchdog — login'de başlar, sonsuz döngüde her 60 sn DB'yi garanti eder.
# Docker daemon kapanırsa Docker Desktop'ı başlatır; container düşerse compose up yapar.
$ErrorActionPreference = 'SilentlyContinue'
$log = 'E:\onegate\scripts\db-heal.log'
function Log($m) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $m" | Out-File -Append -Encoding utf8 $log }
Log 'watchdog basladi'

while ($true) {
  docker info *> $null
  if ($LASTEXITCODE -ne 0) {
    Log 'daemon kapali — Docker Desktop baslatiliyor'
    Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
    for ($i = 0; $i -lt 40; $i++) { Start-Sleep -Seconds 5; docker info *> $null; if ($LASTEXITCODE -eq 0) { break } }
  }
  docker info *> $null
  if ($LASTEXITCODE -eq 0) {
    $running = docker ps --filter 'name=onegate-db' --filter 'status=running' --format '{{.Names}}'
    if ($running -ne 'onegate-db') {
      Log 'container ayakta degil — compose up -d'
      docker compose -f 'E:\onegate\docker-compose.yml' up -d *> $null
    }
  }
  Start-Sleep -Seconds 60
}
