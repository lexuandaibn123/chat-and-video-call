@echo off

echo Installing server packages...
start cmd /k "cd server && npm i"

echo Installing client packages...
start cmd /k "cd client && npm i"

pause
