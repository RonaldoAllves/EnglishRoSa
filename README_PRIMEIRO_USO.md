# ⚡ LEIA PRIMEIRO - Como Iniciar o App

## 🎯 Solução Rápida do Erro

Você viu o erro "Erro ao carregar dados" porque tentou abrir o `index.html` diretamente. Este app precisa de um **servidor HTTP local**.

---

## 🚀 3 Passos Simples

### 1. Inicie o Servidor

**OPÇÃO A: Clique duas vezes aqui** (mais fácil)
```
📄 START_SERVER.bat
```

**OPÇÃO B: PowerShell**
```powershell
cd D:\English\APP
python -m http.server 8000
```

### 2. Abra o Navegador

Acesse: **http://localhost:8000**

### 3. Pronto! 🎉

Agora sim o app vai funcionar perfeitamente!

---

## ❓ Por Que Isso Acontece?

**Problema:** Navegadores bloqueiam o carregamento de arquivos JSON por razões de segurança quando você abre HTML diretamente (`file://`).

**Solução:** Usar um servidor HTTP local (roda só no seu PC, totalmente seguro).

---

## 📖 Mais Ajuda

- **LEIA-ME.html** - Instruções visuais e coloridas
- **COMO_USAR.txt** - Guia de texto simples
- **test.html** - Testar se funcionou

---

## ✅ Checklist

- [ ] Iniciei o servidor (START_SERVER.bat)
- [ ] Acessei http://localhost:8000
- [ ] O app abriu corretamente
- [ ] Escolhi meu perfil
- [ ] Comecei a jogar!

---

**Tudo funcionando? Ótimo! Agora é só estudar! 📚🚀**
