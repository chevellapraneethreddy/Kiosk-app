# Auto-reconnecting SSH tunnel with .env synchronization
$envFile = Join-Path $PSScriptRoot "..\.env"

while ($true) {
    Write-Host "[TUNNEL] Starting SSH tunnel to localhost.run..."
    $processInfo = New-Object System.Diagnostics.ProcessStartInfo
    $processInfo.FileName = "ssh"
    $processInfo.Arguments = "-R 80:127.0.0.1:5173 -o StrictHostKeyChecking=no -o PubkeyAuthentication=no -o ServerAliveInterval=15 -o ServerAliveCountMax=999 nokey@localhost.run"
    $processInfo.RedirectStandardOutput = $true
    $processInfo.RedirectStandardError = $true
    $processInfo.UseShellExecute = $false
    $processInfo.CreateNoWindow = $true

    $process = New-Object System.Diagnostics.Process
    $process.StartInfo = $processInfo
    $process.Start() | Out-Null

    while (-not $process.HasExited) {
        $line = $process.StandardOutput.ReadLine()
        if ($line) {
            Write-Host $line
            if ($line -match "https://[a-zA-Z0-9\.\-]+\.lhr\.life") {
                $tunnelUrl = $matches[0]
                Write-Host "[TUNNEL] Detected active tunnel: $tunnelUrl"
                if (Test-Path $envFile) {
                    $content = Get-Content $envFile -Raw
                    if ($content -match "PUBLIC_BASE_URL=.*") {
                        $content = $content -replace "PUBLIC_BASE_URL=.*", "PUBLIC_BASE_URL=$tunnelUrl"
                        Set-Content -Path $envFile -Value $content -NoNewline
                        Write-Host "[TUNNEL] Updated .env with PUBLIC_BASE_URL=$tunnelUrl"
                    }
                }
            }
        }
    }
    Write-Host "[TUNNEL] Connection dropped. Reconnecting in 3 seconds..."
    Start-Sleep -Seconds 3
}
