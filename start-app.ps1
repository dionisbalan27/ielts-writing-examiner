$port = 3000
$process = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique
if ($process) {
    foreach ($pid in $process) {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
}

Set-Location $PSScriptRoot
node backend/server.js
