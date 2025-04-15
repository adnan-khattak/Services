@echo off
echo Starting React Native development server...
start cmd /k npm start

echo Starting Android app...
timeout /t 5
start cmd /k npx react-native run-android

echo Done! Your app should start shortly. 