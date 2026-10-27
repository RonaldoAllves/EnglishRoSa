# 📺 English Learning - The Big Bang Theory

App mobile-first para aprender inglês assistindo The Big Bang Theory!

## 🎯 Funcionalidades

### ✨ Principais Features

- **Perfis Individuais**: Ronaldo e Sarah com progresso separado
- **Sistema de Pontuação**: Ganhe pontos e desbloqueie conquistas
- **Modo Revisão**: Foque nas palavras que você mais erra
- **Progresso Automático**: Salva automaticamente a cada resposta
- **Estatísticas Detalhadas**: Acompanhe seu progresso por episódio e categoria
- **Mobile First**: Interface otimizada para celular
- **Offline**: Funciona sem internet após carregar os dados

### 📊 Estatísticas Rastreadas

- Total de palavras aprendidas
- Taxa de acertos/erros
- Pontuação total
- Melhor sequência de acertos (streak)
- Progresso por categoria (verbos, substantivos, adjetivos, expressões)
- Progresso por episódio
- Histórico de cada palavra

## 🚀 Como Usar

### Acesso Local

1. Abra o arquivo `index.html` em um navegador
2. Ou use um servidor local:
   ```bash
   # Python
   python -m http.server 8000
   
   # Node.js
   npx http-server
   ```
3. Acesse `http://localhost:8000`

### GitHub Pages

1. Faça upload dos arquivos para um repositório GitHub
2. Vá em Settings → Pages
3. Escolha a branch main e pasta raiz
4. Acesse via `https://seu-usuario.github.io/seu-repo`

## 📁 Estrutura do Projeto

```
D:\English\APP\
├── index.html              # Página principal
├── manifest.json           # PWA manifest
├── episodios.json          # Dados dos episódios
├── css/
│   └── style.css          # Estilos
├── js/
│   ├── app.js             # Lógica principal
│   ├── game.js            # Gerenciamento do jogo
│   └── storage.js         # Sistema de armazenamento
└── README.md
```

## 🎮 Como Jogar

### 1. Seleção de Perfil
- Escolha entre Ronaldo ou Sarah
- Veja suas estatísticas acumuladas

### 2. Seleção de Episódio
- Escolha qual episódio quer estudar
- Veja seu progresso em cada episódio

### 3. Jogo
- Veja uma palavra em inglês
- Escolha a tradução correta entre 4 opções
- Ganhe pontos por acerto (com bônus por streak!)
- Aprenda com os exemplos

### 4. Resultado
- Veja seu desempenho
- Analise estatísticas por categoria
- Jogue novamente ou revise seus erros

## 📈 Sistema de Pontuação

- **Acerto simples**: 10 pontos
- **Bônus por streak**: +2 pontos por acerto consecutivo
  - Exemplo: 3º acerto seguido = 10 + (3 × 2) = 16 pontos
- **Erro**: 0 pontos e reseta o streak

## 🔄 Modo Revisão

O modo revisão prioriza as palavras que você mais errou:

1. Clique em "📖 Revisar Erros" após completar um episódio
2. O app mostra até 20 palavras com maior taxa de erro
3. Foque no que precisa melhorar!

## 💾 Armazenamento de Dados

### localStorage
- Todos os dados são salvos localmente no navegador
- Não precisa de servidor ou banco de dados
- Progresso é salvo automaticamente após cada resposta

### Estrutura de Dados

```javascript
{
  "name": "ronaldo",
  "totalPoints": 1250,
  "totalWords": 120,
  "totalCorrect": 95,
  "totalWrong": 25,
  "episodes": {
    "s01e01": {
      "completed": true,
      "points": 350,
      "correctAnswers": 30,
      "wrongAnswers": 10,
      "categories": { ... },
      "words": { ... }
    }
  }
}
```

## 🎨 Categorias

- 🎨 **Adjetivos**: Palavras descritivas
- 📦 **Substantivos**: Pessoas, lugares, coisas
- 🎯 **Verbos**: Ações
- 💬 **Expressões**: Frases idiomáticas

## 🔧 Personalização

### Adicionar Novos Episódios

1. Edite `episodios.json`
2. Adicione um novo objeto no array `episodios`:

```json
{
  "episodio": "s01e08",
  "adjetivos": [...],
  "substantivos": [...],
  "verbos": [...],
  "expressoes": [...]
}
```

### Modificar Cores

Edite as variáveis CSS em `css/style.css`:

```css
:root {
    --primary: #6366f1;
    --secondary: #8b5cf6;
    --success: #10b981;
    --error: #ef4444;
    ...
}
```

## 📱 PWA (Progressive Web App)

O app pode ser instalado no celular como um aplicativo:

1. Abra no navegador mobile
2. No menu, escolha "Adicionar à tela inicial"
3. Use como um app nativo!

## 🐛 Resolução de Problemas

### Dados não salvam
- Verifique se o localStorage está habilitado
- Não use modo anônimo/privado

### Episódios não carregam
- Verifique se `episodios.json` está na pasta raiz
- Verifique o console do navegador (F12)

### Layout quebrado
- Limpe o cache do navegador
- Verifique se todos os arquivos CSS foram carregados

## 🔄 Backup e Restauração

### Exportar Progresso

```javascript
// No console do navegador
storage.exportProfile('ronaldo');
```

### Importar Progresso

```javascript
// No console do navegador
const jsonData = '...'; // Cole os dados JSON
storage.importProfile('ronaldo', jsonData);
```

## 🚀 Melhorias Futuras

- [ ] Sistema de conquistas/badges
- [ ] Gráficos de progresso
- [ ] Comparação entre perfis
- [ ] Ranking de palavras mais difíceis
- [ ] Timer para desafios
- [ ] Sons e animações
- [ ] Modo escuro/claro
- [ ] Mais episódios e séries

## 💡 Dicas de Estudo

1. **Consistência**: Jogue um pouco todo dia
2. **Revisão**: Use o modo revisão regularmente
3. **Variedade**: Alterne entre episódios
4. **Contexto**: Preste atenção nos exemplos
5. **Prática**: Tente usar as palavras no dia a dia

## 📞 Suporte

Se encontrar bugs ou tiver sugestões:
- Abra uma issue no GitHub
- Ou me mande um email

## 📄 Licença

Projeto pessoal para uso educacional.

---

**Bons estudos! 🚀📚**
