@echo off

echo Starting server...
start cmd /k "cd server && npm run dev"

echo Starting client...
start cmd /k "cd client && npm run dev"

echo Server and client are running.
pause
