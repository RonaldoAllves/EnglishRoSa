# Script PowerShell para iniciar o servidor

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   English Learning - TBBT" -ForegroundColor Green
Write-Host "   Iniciando servidor local..." -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Ir para o diretório do script
Set-Location $PSScriptRoot

# Verificar se Python está instalado
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✓ Python encontrado: $pythonVersion" -ForegroundColor Green
    Write-Host ""
    Write-Host "Servidor iniciando na porta 8000..." -ForegroundColor Yellow
    Write-Host "Acesse: http://localhost:8000" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Pressione Ctrl+C para parar o servidor" -ForegroundColor Yellow
    Write-Host "========================================" -ForegroundColor Cyan
    Write-Host ""
    
    # Iniciar servidor
    python -m http.server 8000
}
catch {
    Write-Host "✗ Python NÃO encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Por favor, instale o Python primeiro:" -ForegroundColor Yellow
    Write-Host "https://www.python.org/downloads/" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "OU use outro método:" -ForegroundColor Yellow
    Write-Host "- Node.js: npx http-server" -ForegroundColor White
    Write-Host "- VS Code: Live Server extension" -ForegroundColor White
    Write-Host ""
    
    Read-Host "Pressione Enter para sair"
}
