# OneGate DB self-heal — Docker daemon + onegate-db container garanti eder.
# Zamanlanmış görev her 5 dk çağırır; Docker zaten ayaktaysa no-op.
$ErrorActionPreference = 'SilentlyContinue'
$log = 'E:\onegate\scripts\db-heal.log'
function Log($m) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $m" | Out-File -Append -Encoding utf8 $log }

# 1) Docker daemon ayakta mı?
docker info *> $null
if ($LASTEXITCODE -ne 0) {
  Log 'Docker daemon kapalı — Docker Desktop baslatiliyor'
  Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe'
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Seconds 5
    docker info *> $null
    if ($LASTEXITCODE -eq 0) { Log "daemon hazir (~$($i*5)s)"; break }
  }
}

docker info *> $null
if ($LASTEXITCODE -ne 0) { Log 'daemon hala kapali — vazgecildi'; exit 1 }

# 2) Container ayakta mı? Degilse compose up
$running = docker ps --filter 'name=onegate-db' --filter 'status=running' --format '{{.Names}}'
if ($running -ne 'onegate-db') {
  Log 'onegate-db ayakta degil — compose up -d'
  docker compose -f 'E:\onegate\docker-compose.yml' up -d *> $null
}
# Sessiz basari: log sismesin diye sadece eylem oldugunda yazilir
