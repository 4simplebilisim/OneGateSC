# OneGate dev servers "always running" — persistent setup.
# Replaces the fragile pattern (login Run-key + watchdog Start-Process) with
# OS-supervised Scheduled Tasks: runs npm DIRECTLY, Task Scheduler restarts on failure.
# No download / NSSM / admin needed (per-user tasks).
# Run:  powershell -ExecutionPolicy Bypass -File scripts\install-dev-tasks.ps1
$ErrorActionPreference = 'Stop'
$root = 'E:\onegate'
$npm = if (Test-Path 'C:\Program Files\nodejs\npm.cmd') { 'C:\Program Files\nodejs\npm.cmd' } else { 'npm.cmd' }

function New-DevTask($name, $argList) {
  $action  = New-ScheduledTaskAction -Execute $npm -Argument $argList -WorkingDirectory $root
  $trigger = New-ScheduledTaskTrigger -AtLogOn
  $set     = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -RestartCount 999 `
              -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) `
              -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable
  Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
  Register-ScheduledTask -TaskName $name -Action $action -Trigger $trigger -Settings $set -Force | Out-Null
  Write-Output ("  OK '" + $name + "' installed (starts at logon, restart-on-failure 1min, single instance)")
}

Write-Output 'Installing OneGate dev tasks...'
New-DevTask 'OneGateApi' 'run dev'
New-DevTask 'OneGateWeb' '--prefix web run dev'

# Remove old fragile Run-key watchdog (tasks are the supervisor now)
$rk = Get-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'OneGateDevWatchdog' -ErrorAction SilentlyContinue
if ($rk) {
  Remove-ItemProperty -Path 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'OneGateDevWatchdog' -ErrorAction SilentlyContinue
  Write-Output '  OK removed old OneGateDevWatchdog Run-key'
}
Write-Output 'DONE. Tasks activate at next logon (when ports are free).'
