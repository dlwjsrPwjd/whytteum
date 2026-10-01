@echo off
cd /d "%~dp0"
npm run collect >> collect.log 2>&1
