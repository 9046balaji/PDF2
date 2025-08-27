@echo off
echo Building the frontend with webpack...
cd /d %~dp0
npm run build
echo Build completed!
echo To use the production build, rename index.production.html to index.html
pause
