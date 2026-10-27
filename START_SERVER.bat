@echo off
echo ========================================
echo    English Learning - TBBT
echo    Iniciando servidor local...
echo ========================================
echo.

cd /d "%~dp0"

echo Verificando Python...
python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Python encontrado!
    echo.
    echo Servidor iniciando na porta 8000...
    echo Acesse: http://localhost:8000
    echo.
    echo Pressione Ctrl+C para parar o servidor
    echo ========================================
    echo.
    python -m http.server 8000
) else (
    echo Python NAO encontrado!
    echo.
    echo Por favor, instale o Python primeiro:
    echo https://www.python.org/downloads/
    echo.
    echo OU use outro metodo:
    echo - Node.js: npx http-server
    echo - VS Code: Live Server extension
    echo.
    pause
)
