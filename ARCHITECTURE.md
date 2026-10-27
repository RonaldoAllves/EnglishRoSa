# 🏗️ Arquitetura do App

Documentação técnica da estrutura e funcionamento do English Learning App.

## 📁 Estrutura de Arquivos

```
D:\English\APP\
│
├── 📄 index.html              # Página principal (4 telas em uma)
├── 📄 manifest.json           # PWA manifest
├── 📄 episodios.json          # Dados dos episódios (gerado pelo csv_to_json.py)
├── 📄 .gitignore             # Arquivos ignorados pelo Git
│
├── 📂 css/
│   └── style.css             # Estilos completos (mobile-first)
│
├── 📂 js/
│   ├── storage.js            # Sistema de localStorage
│   ├── game.js               # Lógica do jogo
│   └── app.js                # Aplicação principal (navegação)
│
└── 📂 docs/
    ├── README.md             # Documentação geral
    ├── QUICK_START.md        # Início rápido
    ├── DEPLOY.md             # Deploy no GitHub
    ├── CONSOLE_COMMANDS.md   # Comandos de debug
    └── ARCHITECTURE.md       # Este arquivo
```

## 🎯 Fluxo da Aplicação

```
┌─────────────────┐
│  Profile Screen │  ← Escolhe Ronaldo ou Sarah
└────────┬────────┘
         ↓
┌─────────────────┐
│ Episode Screen  │  ← Lista episódios e progresso
└────────┬────────┘
         ↓
┌─────────────────┐
│   Game Screen   │  ← Jogo de perguntas/respostas
└────────┬────────┘
         ↓
┌─────────────────┐
│  Result Screen  │  ← Estatísticas e opções
└─────────────────┘
```

## 🔧 Componentes Principais

### 1. App (app.js)
**Responsabilidade:** Navegação e UI

```javascript
class App {
  init()                    // Inicializa app
  selectProfile(name)       // Seleciona perfil
  updateEpisodeScreen()     // Atualiza lista de episódios
  startGame(id, review)     // Inicia jogo
  loadNextQuestion()        // Carrega próxima questão
  handleAnswer(btn, opt)    // Processa resposta
  showResults()             // Mostra resultados
  showScreen(id)            // Navegação entre telas
}
```

### 2. GameManager (game.js)
**Responsabilidade:** Lógica do jogo

```javascript
class GameManager {
  startGame(profile, ep, data, review)  // Inicia sessão
  prepareAllWords()                     // Prepara palavras
  prepareReviewWords()                  // Palavras para revisão
  getNextQuestion()                     // Próxima questão
  generateOptions(word)                 // Gera opções de resposta
  checkAnswer(option)                   // Verifica resposta
  getGameResult()                       // Resultado final
  shuffleArray(arr)                     // Embaralha array
}
```

### 3. StorageManager (storage.js)
**Responsabilidade:** Persistência de dados

```javascript
class StorageManager {
  initializeProfiles()                          // Cria perfis padrão
  getProfile(name)                              // Obtém perfil
  saveProfile(name, data)                       // Salva perfil
  getEpisodeProgress(profile, ep)               // Progresso do episódio
  saveQuestionProgress(profile, ep, question)   // Salva progresso da questão
  saveGameResult(profile, ep, result)           // Salva resultado final
  getWordsForReview(profile, ep, limit)         // Palavras para revisar
  getGlobalStats(profile)                       // Estatísticas globais
  resetEpisode(profile, ep)                     // Reseta episódio
  resetProfile(profile)                         // Reseta perfil
  exportProfile(profile)                        // Exporta backup
  importProfile(profile, json)                  // Importa backup
}
```

## 💾 Estrutura de Dados

### Profile (localStorage)

```javascript
{
  "name": "ronaldo",
  "totalPoints": 1250,           // Pontos totais acumulados
  "totalWords": 120,             // Total de palavras estudadas
  "totalCorrect": 95,            // Total de acertos
  "totalWrong": 25,              // Total de erros
  "lastPlayed": "2024-03-20",    // Última vez que jogou
  "createdAt": "2024-03-01",     // Data de criação
  "episodes": {
    "s01e01": {
      "episodeId": "s01e01",
      "completed": true,          // Completou (>70% acerto)
      "totalQuestions": 40,       // Total de questões
      "correctAnswers": 32,       // Respostas corretas
      "wrongAnswers": 8,          // Respostas erradas
      "points": 450,              // Pontos ganhos
      "bestStreak": 8,            // Melhor sequência
      "attempts": 3,              // Quantas vezes jogou
      "lastPlayed": "2024-03-20",
      
      "categories": {
        "adjetivos": {
          "correct": 8,
          "wrong": 2,
          "total": 10
        },
        // ... outras categorias
      },
      
      "words": {
        "think": {
          "word": "think",
          "category": "verbos",
          "attempts": 3,          // Quantas vezes viu
          "correct": 2,           // Quantas acertou
          "wrong": 1,             // Quantas errou
          "lastAttempt": "2024-03-20"
        },
        // ... outras palavras
      }
    },
    // ... outros episódios
  }
}
```

### Episode Data (episodios.json)

```javascript
{
  "serie": "The Big Bang Theory",
  "temporada": 1,
  "total_episodios": 7,
  "episodios": [
    {
      "episodio": "s01e01",
      "adjetivos": [
        {
          "palavra": "good",
          "traducao": "bom",
          "exemplo_diferente": "This is good (Isto é bom)",
          "exemplo_episodio": "Good idea (Boa ideia)",
          "exemplo_adicional": "Good morning (Bom dia)"
        },
        // ... mais palavras
      ],
      "substantivos": [ /* ... */ ],
      "verbos": [ /* ... */ ],
      "expressoes": [ /* ... */ ]
    },
    // ... mais episódios
  ]
}
```

## 🎮 Lógica do Jogo

### Preparação das Questões

1. **Carregar episódio** → `startGame()`
2. **Coletar palavras** → `prepareAllWords()` ou `prepareReviewWords()`
3. **Embaralhar** → `shuffleArray()`
4. **Iniciar contador** → `currentQuestionIndex = 0`

### Geração de Opções

1. **Resposta correta** → Tradução da palavra
2. **3 respostas erradas** → Traduções aleatórias de outras palavras
3. **Embaralhar opções** → `shuffleArray()`
4. **Renderizar botões** → UI

### Sistema de Pontuação

```javascript
// Fórmula de pontos
pontos = 10 + (streak × 2)

// Exemplos:
1º acerto: 10 pts
2º acerto seguido: 10 + (2 × 2) = 14 pts
3º acerto seguido: 10 + (3 × 2) = 16 pts
5º acerto seguido: 10 + (5 × 2) = 20 pts

// Erro reseta o streak para 0
```

### Salvamento Automático

```javascript
// Após cada resposta:
checkAnswer() → {
  // 1. Calcular pontos
  // 2. Atualizar estatísticas
  // 3. Salvar no localStorage ← IMEDIATO
  storage.saveQuestionProgress()
}
```

## 🔄 Fluxo de Dados

```
┌──────────┐
│ episodios│
│   .json  │  ← Carregado uma vez no início
└────┬─────┘
     ↓
┌────────────┐
│ GameManager│  ← Gerencia questões e respostas
└────┬───────┘
     ↓
┌─────────────┐
│  Storage    │  ← Salva após cada resposta
│ (localStorage)
└─────────────┘
     ↓
┌─────────────┐
│     App     │  ← Atualiza UI
└─────────────┘
```

## 🎨 CSS Architecture

### Mobile-First Approach

```css
/* Base (mobile) */
.element { width: 100%; }

/* Desktop */
@media (min-width: 768px) {
  .element { width: 50%; }
}
```

### Variáveis CSS

```css
:root {
  --primary: #6366f1;
  --bg-main: #0f172a;
  --text-primary: #f1f5f9;
  /* ... */
}
```

### Classes Principais

- `.screen` → Telas completas
- `.container` → Container de conteúdo (max-width: 600px)
- `.card` → Cards genéricos
- `.btn` → Botões
- `.stat` → Estatísticas

## 🚀 Performance

### Otimizações

1. **Single Page App** → Sem recarregamentos
2. **localStorage** → Acesso instantâneo
3. **CSS Puro** → Sem frameworks pesados
4. **Vanilla JS** → Sem dependências
5. **Async Loading** → JSON carrega assíncrono
6. **Event Delegation** → Menos listeners

### Métricas Esperadas

- **FCP** (First Contentful Paint): < 1s
- **LCP** (Largest Contentful Paint): < 2.5s
- **FID** (First Input Delay): < 100ms
- **CLS** (Cumulative Layout Shift): < 0.1

## 🔐 Segurança

### Dados Locais
- Tudo armazenado no **localStorage** do navegador
- Nenhum dado enviado para servidores
- Dados persistem até limpar o cache

### Limitações
- localStorage ≈ 5-10 MB por origem
- Dados não criptografados
- Acessíveis por JavaScript no mesmo domínio

### Boas Práticas
- ✅ Não armazene senhas ou dados sensíveis
- ✅ Faça backup regularmente
- ✅ Use HTTPS em produção

## 🧪 Testing

### Manual Testing

1. **Profile Selection** → Clique em cada perfil
2. **Episode Navigation** → Abra cada episódio
3. **Game Flow** → Jogue 10 questões
4. **Storage Persistence** → Recarregue e verifique progresso
5. **Review Mode** → Teste revisão
6. **Result Screen** → Verifique estatísticas

### Debug Tools

```javascript
// Console commands
storage.getProfile('ronaldo')
game.allWords
app.currentProfile
```

Veja **[CONSOLE_COMMANDS.md](CONSOLE_COMMANDS.md)** para mais.

## 🔮 Extensibilidade

### Adicionar Nova Funcionalidade

1. **Storage**: Adicione campos no perfil
2. **Game**: Adicione lógica em `game.js`
3. **UI**: Adicione HTML/CSS
4. **App**: Conecte com event listeners

### Exemplo: Adicionar Timer

```javascript
// 1. storage.js - Adicionar ao perfil
profile.bestTime = null;

// 2. game.js - Rastrear tempo
this.startTime = Date.now();
this.endTime = null;

// 3. app.js - Mostrar na UI
const time = game.endTime - game.startTime;
document.getElementById('time').textContent = time;
```

## 📚 Referências

- **localStorage API**: [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage)
- **PWA**: [web.dev](https://web.dev/progressive-web-apps/)
- **CSS Grid**: [CSS-Tricks](https://css-tricks.com/snippets/css/complete-guide-grid/)
- **ES6 Classes**: [MDN](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Classes)

---

**Documentação mantida por:** Ronaldo  
**Última atualização:** 2026-10-25  
**Versão:** 1.0.0
