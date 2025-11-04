# PowerShell script để test SSE endpoint
# Usage: .\scripts\test-sse.ps1 -TxRef "TFT_123_abc123" [-CookieHeader "sb-xxx-auth-token=..."]

param(
    [Parameter(Mandatory=$true)]
    [string]$TxRef,
    
    [Parameter(Mandatory=$false)]
    [string]$CookieHeader = "",
    
    [Parameter(Mandatory=$false)]
    [string]$TestUrl = "http://localhost:3000"
)

# Validate tx_ref format
if ($TxRef -notmatch "^TFT_\d+_[a-zA-Z0-9]+$") {
    Write-Host "Error: Invalid tx_ref format. Expected: TFT_[timestamp]_[random]" -ForegroundColor Red
    exit 1
}

$url = "$TestUrl/api/topup/stream?tx_ref=$([System.Web.HttpUtility]::UrlEncode($TxRef))"

Write-Host "`n🔌 Connecting to SSE endpoint..." -ForegroundColor Cyan
Write-Host "URL: $url"
Write-Host "tx_ref: $TxRef"
Write-Host "`n📡 Listening for events...`n" -ForegroundColor Cyan

$headers = @{
    "Accept" = "text/event-stream"
    "Cache-Control" = "no-cache"
}

if ($CookieHeader) {
    $headers["Cookie"] = $CookieHeader
}

try {
    $response = Invoke-WebRequest -Uri $url -Method Get -Headers $headers -UseBasicParsing
    
    if ($response.StatusCode -ne 200) {
        Write-Host "❌ Connection failed. Status: $($response.StatusCode)" -ForegroundColor Red
        Write-Host $response.Content
        exit 1
    }
    
    Write-Host "✅ Connected successfully!`n" -ForegroundColor Green
    
    # Note: PowerShell's Invoke-WebRequest doesn't support streaming SSE well
    # For better testing, use the test page at /test-sse or the Node.js script
    Write-Host "Note: For better SSE testing, use:" -ForegroundColor Yellow
    Write-Host "  1. Test page: $TestUrl/test-sse" -ForegroundColor Yellow
    Write-Host "  2. Node.js script: node scripts/test-sse.js $TxRef" -ForegroundColor Yellow
    
} catch {
    Write-Host "`n❌ Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "`nMake sure:" -ForegroundColor Yellow
    Write-Host "  1. You are authenticated (provide -CookieHeader)" -ForegroundColor Yellow
    Write-Host "  2. tx_ref exists and you own it" -ForegroundColor Yellow
    Write-Host "  3. Server is running at $TestUrl" -ForegroundColor Yellow
    exit 1
}

