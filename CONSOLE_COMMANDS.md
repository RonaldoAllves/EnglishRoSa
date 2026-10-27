# 🔧 Comandos de Console para Debug

Abra o Console do navegador (F12) e use estes comandos para debug e manutenção.

## 📊 Ver Estatísticas

```javascript
// Ver estatísticas globais do Ronaldo
storage.getGlobalStats('ronaldo');

// Ver estatísticas globais da Sarah
storage.getGlobalStats('sarah');

// Ver progresso de um episódio específico
storage.getEpisodeProgress('ronaldo', 's01e01');
```

## 📖 Ver Perfil Completo

```javascript
// Ver todos os dados do Ronaldo
storage.getProfile('ronaldo');

// Ver todos os dados da Sarah
storage.getProfile('sarah');
```

## 📝 Ver Palavras para Revisão

```javascript
// Ver as 10 palavras com mais erros do episódio s01e01
storage.getWordsForReview('ronaldo', 's01e01', 10);

// Ver as 20 palavras com mais erros
storage.getWordsForReview('ronaldo', 's01e01', 20);
```

## 💾 Backup e Restauração

### Exportar Progresso

```javascript
// Exportar dados do Ronaldo (baixa um arquivo JSON)
storage.exportProfile('ronaldo');

// Exportar dados da Sarah
storage.exportProfile('sarah');
```

### Importar Progresso

```javascript
// Cole os dados JSON aqui
const backupData = {
  "name": "ronaldo",
  "totalPoints": 500,
  // ... resto dos dados
};

// Importar
storage.importProfile('ronaldo', JSON.stringify(backupData));
```

## 🗑️ Limpeza de Dados

### Resetar um Episódio

```javascript
// Resetar apenas o episódio s01e01 do Ronaldo
storage.resetEpisode('ronaldo', 's01e01');

// Resetar episódio da Sarah
storage.resetEpisode('sarah', 's01e02');
```

### Resetar Perfil Completo

```javascript
// ⚠️ CUIDADO: Isso apaga TODOS os dados do Ronaldo
storage.resetProfile('ronaldo');

// ⚠️ CUIDADO: Isso apaga TODOS os dados da Sarah
storage.resetProfile('sarah');
```

### Limpar localStorage Completamente

```javascript
// ⚠️ CUIDADO: Remove TODOS os dados de TODOS os perfis
localStorage.clear();
```

## 🎮 Manipular Pontos (para testes)

```javascript
// Adicionar pontos manualmente
const profile = storage.getProfile('ronaldo');
profile.totalPoints += 1000;
storage.saveProfile('ronaldo', profile);
```

## 📊 Estatísticas Avançadas

```javascript
// Ver todas as palavras já estudadas de um episódio
const ep = storage.getEpisodeProgress('ronaldo', 's01e01');
Object.keys(ep.words).length; // Total de palavras estudadas

// Ver palavra com mais erros
const words = Object.values(ep.words);
words.sort((a, b) => b.wrong - a.wrong);
console.table(words.slice(0, 10)); // Top 10 palavras com mais erros

// Ver palavra com mais acertos
words.sort((a, b) => b.correct - a.correct);
console.table(words.slice(0, 10)); // Top 10 palavras com mais acertos
```

## 🔍 Verificar Dados dos Episódios

```javascript
// Ver dados carregados dos episódios
app.episodesData;

// Contar total de palavras
const total = app.episodesData.episodios.reduce((sum, ep) => {
  return sum + 
    (ep.adjetivos?.length || 0) +
    (ep.substantivos?.length || 0) +
    (ep.verbos?.length || 0) +
    (ep.expressoes?.length || 0);
}, 0);
console.log('Total de palavras:', total);

// Ver episódio específico
const s01e01 = app.episodesData.episodios.find(ep => ep.episodio === 's01e01');
console.log(s01e01);
```

## 🎯 Testar Jogo

```javascript
// Ver estado atual do jogo
game.currentProfile;
game.currentEpisode;
game.score;
game.correctCount;
game.wrongCount;
game.currentStreak;

// Ver questão atual
game.currentQuestion;

// Ver todas as palavras do jogo atual
game.allWords;
```

## 📈 Comparar Perfis

```javascript
// Comparar estatísticas dos dois perfis
const ronaldo = storage.getGlobalStats('ronaldo');
const sarah = storage.getGlobalStats('sarah');

console.table([
  { perfil: 'Ronaldo', ...ronaldo },
  { perfil: 'Sarah', ...sarah }
]);
```

## 🔄 Transferir Progresso

```javascript
// Copiar progresso do Ronaldo para Sarah
const ronaldoData = storage.getProfile('ronaldo');
const sarahData = { ...ronaldoData, name: 'sarah' };
storage.saveProfile('sarah', sarahData);
```

## 🧪 Simular Progresso (para testes)

```javascript
// Simular 100 respostas corretas no s01e01
for (let i = 0; i < 100; i++) {
  storage.saveQuestionProgress('ronaldo', 's01e01', {
    word: 'test' + i,
    category: 'verbos',
    correct: true,
    points: 10
  });
}
```

## 📱 Informações do Navegador

```javascript
// Ver tamanho usado no localStorage
const used = new Blob([localStorage.getItem('ronaldo') + localStorage.getItem('sarah')]).size;
console.log('Espaço usado:', (used / 1024).toFixed(2), 'KB');

// Verificar se é PWA
console.log('Display mode:', window.matchMedia('(display-mode: standalone)').matches ? 'PWA' : 'Browser');

// Verificar se está online
console.log('Online:', navigator.onLine);
```

## 🐛 Debug de Problemas

```javascript
// Verificar se os perfis existem
console.log('Ronaldo exists:', !!localStorage.getItem('ronaldo'));
console.log('Sarah exists:', !!localStorage.getItem('sarah'));

// Ver todos os items no localStorage
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  console.log(key, ':', localStorage.getItem(key).length, 'chars');
}

// Verificar estrutura dos dados
const profile = storage.getProfile('ronaldo');
console.log('Keys:', Object.keys(profile));
console.log('Episodes:', Object.keys(profile.episodes || {}));
```

## 🎨 Mudar Tema (experimental)

```javascript
// Trocar cores (temporário, não salva)
document.documentElement.style.setProperty('--primary', '#ef4444');
document.documentElement.style.setProperty('--secondary', '#f59e0b');
```

---

**Dica**: Use `console.table()` para ver dados em formato de tabela!

```javascript
// Exemplo
const stats = storage.getGlobalStats('ronaldo');
console.table(stats);
```
