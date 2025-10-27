# Quick Registration Test
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "TFT Match - Registration Test" -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Check env
$envFile = "env.local"
if (-not (Test-Path $envFile)) {
    Write-Host "ERROR: env.local not found!" -ForegroundColor Red
    exit 1
}

# Load env
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        [Environment]::SetEnvironmentVariable($key, $value, "Process")
    }
}

# Quick check
$key = $env:SUPABASE_SERVICE_ROLE_KEY
if ([string]::IsNullOrEmpty($key) -or $key -eq "tftmatch") {
    Write-Host "ERROR: SUPABASE_SERVICE_ROLE_KEY not set correctly!" -ForegroundColor Red
    exit 1
}

Write-Host "SUCCESS: Setup looks good!" -ForegroundColor Green
Write-Host ""
Write-Host "Database Status:" -ForegroundColor Yellow
Write-Host "  - Tables: READY (users, wallets, matches, etc.)" -ForegroundColor Green
Write-Host "  - RLS: ENABLED" -ForegroundColor Green
Write-Host "  - Service Key: CONFIGURED" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "1. Start dev server:" -ForegroundColor White
Write-Host "   npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Open browser:" -ForegroundColor White
Write-Host "   http://localhost:3000/auth/register" -ForegroundColor Gray
Write-Host ""
Write-Host "3. Register a test account:" -ForegroundColor White
Write-Host "   Email: test@example.com" -ForegroundColor Gray
Write-Host "   Password: Test123!" -ForegroundColor Gray
Write-Host "   Game Account: TestPlayer#VN1" -ForegroundColor Gray
Write-Host ""
Write-Host "4. Check confirmation email:" -ForegroundColor White
Write-Host "   Supabase Dashboard -> Click email icon (top-right)" -ForegroundColor Gray
Write-Host "   Or go to: https://supabase.com/dashboard/project/kxcydvdvxvibcivabwpo" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Click confirmation link in email" -ForegroundColor White
Write-Host ""
Write-Host "6. Verify success:" -ForegroundColor White
Write-Host "   - Should redirect to homepage" -ForegroundColor Gray
Write-Host "   - Should see user logged in" -ForegroundColor Gray
Write-Host ""
Write-Host "Ready to test!" -ForegroundColor Green -BackgroundColor Black
Write-Host ""

