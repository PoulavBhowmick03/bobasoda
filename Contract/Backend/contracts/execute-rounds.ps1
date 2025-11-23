# Auto-execute rounds for Windows PowerShell
$CONTRACT = "0x93b07e384dA57399AF517C6492840CA8d70BD11A"
$RPC = "https://sepolia.base.org"
$KEY = "0x2812270ffa3e05a6f9a0e136b34f94fad94125652fc06053f09ad83dad293315"

Write-Host "🤖 Auto-executing rounds every 5 minutes (300 seconds)..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow

while ($true) {
    $time = Get-Date -Format "HH:mm:ss"
    Write-Host "[$time] Executing round..." -ForegroundColor Cyan

    $output = cast send $CONTRACT "executeRound()" --rpc-url $RPC --private-key $KEY 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Success!" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Waiting for next interval..." -ForegroundColor Yellow
    }

    Write-Host ""
    Start-Sleep -Seconds 300
}
