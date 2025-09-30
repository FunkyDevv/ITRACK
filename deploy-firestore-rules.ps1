Write-Host "Deploying Firestore Rules..." -ForegroundColor Green
firebase deploy --only firestore:rules
Write-Host "Firestore rules deployed successfully!" -ForegroundColor Green
Read-Host "Press Enter to exit"
