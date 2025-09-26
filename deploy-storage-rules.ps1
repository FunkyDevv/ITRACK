#!/usr/bin/env pwsh

# Deploy Firebase Storage Rules
Write-Host "🚀 Deploying Firebase Storage rules..." -ForegroundColor Cyan

try {
    # Deploy storage rules only
    firebase deploy --only storage
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Firebase Storage rules deployed successfully!" -ForegroundColor Green
        Write-Host "📸 Photo uploads should now work properly" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Failed to deploy Firebase Storage rules" -ForegroundColor Red
        exit 1
    }
}
catch {
    Write-Host "❌ Error deploying storage rules: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}