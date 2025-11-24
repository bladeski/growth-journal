param(
  [int]$Port = 3000,
  [int]$TimeoutSeconds = 60
)

function Wait-For-Url {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 60
  )
  $end = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $end) {
    try {
      $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
      if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) {
        return $true
      }
    } catch {
      # ignore and retry
    }
    Start-Sleep -Seconds 1
  }
  return $false
}

$appUrl = "http://localhost:$Port/"

Write-Host "Checking if $appUrl is already responding..."
$isUp = Wait-For-Url -Url $appUrl -TimeoutSeconds 3
$startedServer = $false
$proc = $null
if (-not $isUp) {
  Write-Host "Starting dev server (npm run dev)..."
  # Use cmd.exe to run npm on Windows reliably
  $proc = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm run dev" -NoNewWindow -PassThru
  $startedServer = $true
  Write-Host "Waiting for server to respond on $appUrl (timeout $TimeoutSeconds s)..."
  $up = Wait-For-Url -Url $appUrl -TimeoutSeconds $TimeoutSeconds
  if (-not $up) {
    Write-Host "Timed out waiting for dev server to become ready." -ForegroundColor Red
    if ($startedServer -and $proc) { Stop-Process -Id $proc.Id -ErrorAction SilentlyContinue }
    exit 1
  }
} else {
  Write-Host "Server already running at $appUrl - skipping start."
}

Write-Host "Running Playwright tests..."
$cmd = "npx"
$args = @("playwright","test","tests/playwright","-c","playwright.config.ts")
& $cmd @args
$exitCode = $LASTEXITCODE

Write-Host "Playwright finished with exit code $exitCode"
if ($startedServer -and $proc) {
  Write-Host "Stopping dev server (pid $($proc.Id))..."
  Stop-Process -Id $proc.Id -ErrorAction SilentlyContinue
}

exit $exitCode
