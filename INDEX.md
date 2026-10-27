# 📚 Índice da Documentação

Bem-vindo ao English Learning - The Big Bang Theory!

## 🚀 Começar Agora

**Primeira vez?** Comece aqui:

→ **[QUICK_START.md](QUICK_START.md)** - Guia de início rápido (5 minutos)

## 📖 Documentação Principal

### Para Usuários

- **[README.md](README.md)** - Visão geral completa do app
  - O que é o app
  - Funcionalidades
  - Como jogar
  - Sistema de pontuação
  - FAQ

- **[QUICK_START.md](QUICK_START.md)** - Começar rapidamente
  - Testar localmente
  - Primeiro jogo
  - Problemas comuns
  - Checklist

### Para Desenvolvedores

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Arquitetura técnica
  - Estrutura do código
  - Fluxo de dados
  - Classes e métodos
  - Performance
  - Extensibilidade

- **[CONSOLE_COMMANDS.md](CONSOLE_COMMANDS.md)** - Comandos de debug
  - Ver estatísticas
  - Manipular dados
  - Backup/restauração
  - Debugging

### Deploy e Hospedagem

- **[DEPLOY.md](DEPLOY.md)** - Hospedar no GitHub Pages
  - Passo a passo completo
  - Configurar Git
  - Ativar GitHub Pages
  - Domínio customizado
  - Troubleshooting

## 🎯 Por Tipo de Tarefa

### Quero começar a usar

1. [QUICK_START.md](QUICK_START.md) → Como começar
2. Abra `index.html` no navegador
3. Escolha seu perfil e jogue!

### Quero hospedar online

1. [DEPLOY.md](DEPLOY.md) → Guia de deploy
2. Configure Git
3. Envie para GitHub
4. Ative GitHub Pages

### Quero entender o código

1. [ARCHITECTURE.md](ARCHITECTURE.md) → Arquitetura
2. Veja os arquivos em `js/`
3. Leia comentários no código

### Quero fazer debug

1. [CONSOLE_COMMANDS.md](CONSOLE_COMMANDS.md) → Comandos
2. Abra o console (F12)
3. Use os comandos de debug

### Quero personalizar

1. [README.md](README.md) → Seção "Personalização"
2. [ARCHITECTURE.md](ARCHITECTURE.md) → Seção "Extensibilidade"
3. Edite CSS e JS conforme necessário

## 🔧 Arquivos Técnicos

### Código Principal

```
📂 js/
├── app.js       → Aplicação principal (navegação, UI)
├── game.js      → Lógica do jogo (questões, pontos)
└── storage.js   → Armazenamento (localStorage)

📂 css/
└── style.css    → Todos os estilos (mobile-first)

📄 index.html    → Página principal (4 telas)
```

### Dados

```
📄 episodios.json    → Dados dos episódios (gerado do CSV)
📄 manifest.json     → PWA manifest
```

### Testes

```
📄 test.html         → Página de teste/debug
```

## 📊 Estatísticas do Projeto

- **Linguagens**: HTML, CSS, JavaScript (Vanilla)
- **Dependências**: Nenhuma! 🎉
- **Tamanho**: ~100 KB (código + CSS)
- **Episódios**: 7 (S01E01 a S01E07)
- **Palavras**: ~280 palavras únicas
- **Mobile-First**: Sim ✅
- **PWA**: Sim ✅
- **Offline**: Sim ✅

## 🎓 Conceitos Utilizados

### Frontend
- Single Page Application (SPA)
- Mobile-First Design
- CSS Variables
- CSS Grid & Flexbox
- Progressive Web App (PWA)
- LocalStorage API

### JavaScript
- ES6 Classes
- Async/Await
- Event Delegation
- Module Pattern
- Fisher-Yates Shuffle

### Arquitetura
- MVC-like pattern
- Separation of Concerns
- Data Persistence
- State Management

## 🗂️ Estrutura Completa

```
D:\English\APP\
│
├── 📄 index.html              # App principal
├── 📄 test.html               # Página de teste
├── 📄 manifest.json           # PWA config
├── 📄 episodios.json          # Dados
├── 📄 .gitignore             # Git ignore
│
├── 📂 css/
│   └── style.css             # Estilos
│
├── 📂 js/
│   ├── app.js                # App principal
│   ├── game.js               # Lógica do jogo
│   └── storage.js            # Storage
│
└── 📂 docs/ (estas documentações)
    ├── INDEX.md              # Este arquivo
    ├── README.md             # Documentação geral
    ├── QUICK_START.md        # Início rápido
    ├── DEPLOY.md             # Deploy
    ├── ARCHITECTURE.md       # Arquitetura
    └── CONSOLE_COMMANDS.md   # Debug commands
```

## 🔗 Links Úteis

### Desenvolvimento
- [MDN Web Docs](https://developer.mozilla.org/)
- [CSS-Tricks](https://css-tricks.com/)
- [web.dev](https://web.dev/)

### Git & GitHub
- [Git Documentation](https://git-scm.com/doc)
- [GitHub Pages](https://pages.github.com/)
- [GitHub Guides](https://guides.github.com/)

### Aprendizado
- [JavaScript.info](https://javascript.info/)
- [Eloquent JavaScript](https://eloquentjavascript.net/)
- [You Don't Know JS](https://github.com/getify/You-Dont-Know-JS)

## ❓ Perguntas Frequentes

### Como adicionar mais episódios?
Veja [README.md](README.md) → Seção "Personalização"

### Como fazer backup do progresso?
Veja [CONSOLE_COMMANDS.md](CONSOLE_COMMANDS.md) → Seção "Backup"

### Como resetar meu progresso?
Veja [CONSOLE_COMMANDS.md](CONSOLE_COMMANDS.md) → Seção "Limpeza"

### Como personalizar cores?
Veja [README.md](README.md) → Seção "Personalização"

### Posso usar offline?
Sim! Após carregar uma vez, funciona sem internet.

## 🎯 Roadmap

### Implementado ✅
- [x] Sistema de perfis
- [x] Jogo de perguntas/respostas
- [x] Sistema de pontuação
- [x] Modo revisão
- [x] Salvamento automático
- [x] Estatísticas detalhadas
- [x] Mobile-first design
- [x] PWA

### Futuro 🔮
- [ ] Conquistas/Badges
- [ ] Gráficos de progresso
- [ ] Sons e animações
- [ ] Modo escuro/claro
- [ ] Comparação entre perfis
- [ ] Timer para desafios
- [ ] Mais episódios

## 💡 Dicas

1. **Estude 10 min por dia** → Consistência é a chave
2. **Use o modo revisão** → Foque nas dificuldades
3. **Anote exemplos** → Contexto ajuda a memorizar
4. **Pratique fora do app** → Use as palavras no dia a dia
5. **Compartilhe progresso** → Compete com Sarah! 😊

## 🤝 Contribuindo

Encontrou um bug ou tem uma sugestão?

1. Abra uma issue no GitHub
2. Descreva o problema/sugestão
3. Se possível, inclua screenshots
4. Aguarde feedback!

## 📞 Contato

- **GitHub**: (seu usuário aqui)
- **Email**: (seu email aqui)

## 📄 Licença

Projeto pessoal para uso educacional.

---

## 🎓 Aprenda Mais

- **Inglês**: [Duolingo](https://duolingo.com)
- **TBBT**: [IMDb](https://www.imdb.com/title/tt0898266/)
- **Web Dev**: [freeCodeCamp](https://www.freecodecamp.org/)

---

**Última atualização:** 2026-10-25  
**Versão:** 1.0.0  
**Criado por:** Ronaldo & Kiro AI

---

**Happy Learning! 🚀📚🎬**
