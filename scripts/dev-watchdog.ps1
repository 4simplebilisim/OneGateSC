# OneGate dev-server watchdog — login'de başlar, sonsuz döngüde her 10 sn dev sunucularını garanti eder.
# :3000 (API) veya :5173 (web) düşerse ilgili npm dev sürecini yeniden başlatır. (db-watchdog.ps1 ile aynı desen.)
# Not: Port doluysa hiçbir şey yapmaz — preview MCP'nin yönettiği süreçle çakışmaz; yalnız GERÇEKTEN düşeni kaldırır.
# SAĞLAMLAŞTIRMA: login env'inde PATH farklı olabilir → npm.cmd TAM YOL ile çağrılır; loop try/catch + hata logu + heartbeat.
$ErrorActionPreference = 'SilentlyContinue'
$root = 'E:\onegate'
$log = Join-Path $root 'scripts\dev-heal.log'
function Log($m) { "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $m" | Out-File -Append -Encoding utf8 $log }

# npm.cmd tam yol — login Run key env'inde PATH'te olmayabilir (sessiz "Start-Dev başarısız"ın nedeni buydu)
$npmCmd = if (Test-Path 'C:\Program Files\nodejs\npm.cmd') { 'C:\Program Files\nodejs\npm.cmd' } else { 'npm.cmd' }

function Test-Port($port) {
  # Interface-bağımsız: port'ta DİNLEYEN var mı (IPv4 veya IPv6). vite IPv6/::1 + fastify 0.0.0.0 ikisi için de doğru.
  return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}
function Start-Dev($argList) {
  try { Start-Process -FilePath $npmCmd -ArgumentList $argList -WorkingDirectory $root -WindowStyle Hidden }
  catch { Log ('Start-Dev HATA: ' + $_.Exception.Message) }
}

Log "dev-watchdog basladi (npm: $npmCmd)"
$tick = 0
while ($true) {
  try {
    # API :3000 — iki ardışık kontrolde de düşükse başlat (MCP'nin meşru yeniden başlatmasıyla yarışma)
    if (-not (Test-Port 3000)) {
      Start-Sleep -Seconds 3
      if (-not (Test-Port 3000)) { Log 'API :3000 dustu — npm run dev'; Start-Dev @('run', 'dev') }
    }
    # web :5173
    if (-not (Test-Port 5173)) {
      Start-Sleep -Seconds 3
      if (-not (Test-Port 5173)) { Log 'web :5173 dustu — npm --prefix web run dev'; Start-Dev @('--prefix', 'web', 'run', 'dev') }
    }
  } catch {
    Log ('loop HATA: ' + $_.Exception.Message)
  }
  $tick++
  if ($tick % 30 -eq 0) { Log 'watchdog calisiyor (heartbeat)' } # ~5 dk'da bir kalp atışı (loop yaşıyor mu doğrulama)
  Start-Sleep -Seconds 10
}
