@echo off
echo Deploying Firestore Rules...
firebase deploy --only firestore:rules
echo Firestore rules deployed successfully!
pause
