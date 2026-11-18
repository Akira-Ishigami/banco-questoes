@echo off
rem Inicia o Banco de Questoes (duplo clique). Feche esta janela para parar o servidor.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js nao encontrado. Instale em https://nodejs.org & pause & exit /b 1)
start "" /min cmd /c "timeout /t 2 >nul & start http://localhost:3000"
node server.js
pause
