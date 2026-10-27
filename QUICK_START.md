# ⚡ Quick Start - English Learning App

## 🎯 Para Começar AGORA

### Opção 1: Testar Localmente (mais rápido)

**⚠️ IMPORTANTE:** Este app precisa rodar em um servidor HTTP local!

#### Método Mais Fácil:
1. **Dê duplo clique em:**
   ```
   START_SERVER.bat
   ```
   ou
   ```
   START_SERVER.ps1
   ```

2. **Acesse no navegador:**
   ```
   http://localhost:8000
   ```

#### Método Manual:
1. **Abra PowerShell na pasta** `D:\English\APP`
2. **Execute:**
   ```powershell
   python -m http.server 8000
   ```
3. **Acesse:** `http://localhost:8000`

#### Alternativa (VS Code):
1. Instale extensão "Live Server"
2. Clique direito em `index.html` → "Open with Live Server"

3. **Pronto!** 🎉
   - Escolha seu perfil (Ronaldo ou Sarah)
   - Selecione um episódio
   - Comece a jogar!

### Opção 2: Hospedar no GitHub (acessar de qualquer lugar)

Veja o arquivo **[DEPLOY.md](DEPLOY.md)** para instruções detalhadas.

Resumo rápido:
```powershell
cd D:\English\APP
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
git push -u origin main
```

Depois ative o GitHub Pages nas configurações do repositório.

---

## 📱 Como Usar

### 1. Escolha o Perfil
- **Ronaldo** 👨‍💻
- **Sarah** 👩‍💼

Cada perfil tem progresso separado!

### 2. Selecione o Episódio
- Veja seu progresso em cada episódio
- Episódios disponíveis: S01E01 a S01E07

### 3. Jogue!
- Veja a palavra em inglês
- Escolha a tradução correta
- Ganhe pontos!
- **Sequência (streak)** dá pontos bônus

### 4. Revise
- Após completar, clique em "Revisar Erros"
- Foque nas palavras que você mais erra

---

## 🎮 Controles

- **Toque/Clique** na resposta
- **← Voltar** para voltar à tela anterior
- **Progresso salva automaticamente!**

---

## 📊 Sistema de Pontos

| Ação | Pontos |
|------|--------|
| Acerto | 10 pts |
| + Streak 2x | +2 pts |
| + Streak 3x | +4 pts |
| + Streak 4x | +6 pts |
| Erro | 0 pts (reseta streak) |

**Exemplo:** 5º acerto seguido = 10 + (5 × 2) = 20 pontos! 🔥

---

## 🧪 Testar se Está Funcionando

1. Abra `test.html` no navegador
2. Deve mostrar:
   - ✅ Status de sucesso
   - Estatísticas dos episódios
   - Preview dos dados

Se aparecer erro:
- Certifique-se que `episodios.json` está na pasta
- Use um servidor local em vez de abrir direto

---

## 🔧 Personalizar

### Mudar Cores

Edite `css/style.css`:
```css
:root {
    --primary: #6366f1;     /* Cor principal */
    --secondary: #8b5cf6;   /* Cor secundária */
    --success: #10b981;     /* Cor de acerto */
    --error: #ef4444;       /* Cor de erro */
}
```

### Adicionar Mais Episódios

1. Adicione os dados no `episodios.json`
2. Recarregue o app
3. Pronto!

---

## 🆘 Problemas Comuns

### "Erro ao carregar episodios.json"
- ✅ Use um servidor local (`python -m http.server`)
- ✅ Verifique se o arquivo existe na pasta

### "Progresso não salva"
- ✅ Não use modo anônimo/privado
- ✅ Habilite localStorage no navegador

### "Layout quebrado no celular"
- ✅ Limpe o cache (Ctrl + Shift + R)
- ✅ Use um navegador moderno (Chrome, Safari, Firefox)

---

## 📱 Instalar como App

### Android/iOS
1. Abra no navegador mobile
2. Menu → "Adicionar à tela inicial"
3. Use como app nativo!

### Windows
1. Abra no Chrome
2. Clique no ⋮ → "Instalar app"
3. Pronto!

---

## 💾 Backup do Progresso

### Via Console (F12)
```javascript
// Exportar
storage.exportProfile('ronaldo');

// Importar
const data = '...'; // Cole o JSON do backup
storage.importProfile('ronaldo', data);
```

Veja mais em **[CONSOLE_COMMANDS.md](CONSOLE_COMMANDS.md)**

---

## 📚 Documentação

- **[README.md](README.md)** - Documentação completa
- **[DEPLOY.md](DEPLOY.md)** - Como hospedar
- **[CONSOLE_COMMANDS.md](CONSOLE_COMMANDS.md)** - Comandos de debug

---

## 🎯 Checklist Primeira Vez

- [ ] Abrir `index.html` no navegador
- [ ] Escolher perfil (Ronaldo ou Sarah)
- [ ] Selecionar episódio S01E01
- [ ] Jogar pelo menos 5 questões
- [ ] Ver os resultados
- [ ] Testar modo revisão
- [ ] Verificar que o progresso salvou (recarregue a página)
- [ ] Compartilhar com Sarah! 😊

---

## 🚀 Próximos Passos

1. ✅ Teste o app localmente
2. ✅ Jogue alguns episódios
3. ✅ Faça deploy no GitHub Pages
4. ✅ Adicione à tela inicial do celular
5. ✅ Estude 10 minutos por dia!

---

**Bons estudos! 📚🚀**

*Dúvidas? Veja a documentação completa ou abra o console (F12) para debug.*
