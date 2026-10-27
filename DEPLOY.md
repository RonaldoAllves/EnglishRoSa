# 🚀 Guia de Deploy - GitHub Pages

## Passo a Passo para Hospedar no GitHub

### 1️⃣ Criar Repositório no GitHub

1. Acesse https://github.com
2. Clique em "New repository"
3. Nome: `english-learning-tbbt` (ou outro nome)
4. Marque como **Public**
5. NÃO adicione README, .gitignore ou licença (já temos)
6. Clique em "Create repository"

### 2️⃣ Inicializar Git Localmente

Abra o PowerShell na pasta `D:\English\APP` e execute:

```powershell
# Inicializar repositório
git init

# Adicionar arquivos
git add .

# Primeiro commit
git commit -m "Initial commit - English Learning App"

# Adicionar repositório remoto (substitua YOUR-USERNAME e YOUR-REPO)
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git

# Enviar para o GitHub
git branch -M main
git push -u origin main
```

### 3️⃣ Ativar GitHub Pages

1. No GitHub, vá ao seu repositório
2. Clique em **Settings** (Configurações)
3. No menu lateral, clique em **Pages**
4. Em "Source":
   - Branch: `main`
   - Folder: `/ (root)`
5. Clique em **Save**
6. Aguarde 1-2 minutos

### 4️⃣ Acessar o App

Seu app estará disponível em:
```
https://YOUR-USERNAME.github.io/YOUR-REPO/
```

Exemplo:
```
https://ronaldodev.github.io/english-learning-tbbt/
```

## 📝 Atualizações Futuras

Sempre que fizer mudanças:

```powershell
# Adicionar mudanças
git add .

# Criar commit
git commit -m "Descrição da mudança"

# Enviar para GitHub
git push
```

O GitHub Pages atualizará automaticamente em 1-2 minutos!

## 🔧 Configurações Opcionais

### Domínio Customizado

1. Compre um domínio (ex: GoDaddy, Namecheap)
2. No GitHub Pages settings, adicione seu domínio customizado
3. Configure DNS:
   ```
   Type: CNAME
   Host: www
   Value: YOUR-USERNAME.github.io
   ```

### HTTPS

- GitHub Pages fornece HTTPS automaticamente
- Marque "Enforce HTTPS" nas configurações

## 🎨 Customizar App

### Mudar Título e Cores

1. Edite `index.html` para mudar títulos
2. Edite `css/style.css` para mudar cores
3. Faça commit e push das mudanças

### Adicionar Mais Episódios

1. Use o script `csv_to_json.py` para gerar novo JSON
2. Substitua `episodios.json`
3. Faça commit e push

## 📱 Testar Localmente

Antes de fazer deploy, teste localmente:

```powershell
# Com Python
python -m http.server 8000

# Acesse: http://localhost:8000
```

## ⚠️ Troubleshooting

### App não carrega no GitHub Pages

1. Verifique se o caminho dos arquivos está correto
2. Veja o console do navegador (F12) para erros
3. Certifique-se que `episodios.json` está na raiz

### Mudanças não aparecem

1. Limpe o cache do navegador (Ctrl + Shift + R)
2. Aguarde alguns minutos para o GitHub Pages atualizar
3. Verifique se o commit foi enviado: `git log`

### Erro 404

- Verifique se todos os arquivos foram enviados: `git status`
- Confirme que o GitHub Pages está ativado
- URL deve ser: `username.github.io/repo-name/`

## 🔐 Privacidade

Como o repositório é público, **NÃO** adicione:
- Informações pessoais sensíveis
- Senhas ou tokens
- Dados privados

Os dados de progresso (localStorage) ficam apenas no navegador do usuário!

## 📊 Analytics (Opcional)

Para ver quantas pessoas acessam:

1. Crie uma conta no Google Analytics
2. Adicione o código de rastreamento no `<head>` do `index.html`
3. Commit e push

## 🎯 Checklist de Deploy

- [ ] Todos os arquivos estão na pasta
- [ ] `episodios.json` está presente e válido
- [ ] Testado localmente
- [ ] Git inicializado e commitado
- [ ] Enviado para GitHub
- [ ] GitHub Pages ativado
- [ ] Testado no celular
- [ ] Compartilhado com Sarah 😊

---

**Pronto! Seu app está no ar! 🎉**
