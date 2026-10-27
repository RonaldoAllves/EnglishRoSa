# 🚀 Guia Rápido - Como Usar o App

## 📱 Iniciando

1. Abra o `index.html` em um servidor local
2. Escolha seu perfil (Ronaldo ou Sarah)
3. Clique em um episódio

## 🎮 Ao Clicar em um Episódio

Você verá 4 opções:

### ▶️ Continuar Progresso
- **Use quando:** Quer continuar de onde parou
- **O que faz:** Mostra apenas palavras que você ainda precisa praticar
- **Ideal para:** Aprendizado diário, terminar o episódio

### 🔄 Nova Tentativa  
- **Use quando:** Já completou o episódio e quer melhorar a pontuação
- **O que faz:** Reinicia com TODAS as palavras do episódio
- **Ideal para:** Competir consigo mesmo, treinar para perfeição

### 📖 Revisar Erros
- **Use quando:** Quer focar nas palavras difíceis
- **O que faz:** Mostra apenas as palavras que você mais errou
- **Ideal para:** Revisão focada, fixar conteúdo difícil

### 🗑️ Zerar Este Episódio
- **Use quando:** Quer recomeçar do zero
- **O que faz:** Apaga todo progresso deste episódio
- **Cuidado:** Não tem volta!

## ⚙️ Filtros de Exercícios

Após escolher a opção, você configura:

### Tipo de Exercício:
- **Todos (Aleatório)** ← Recomendado para iniciantes
- **Apenas Verbos** 🎯 ← Para focar em ações
- **Apenas Adjetivos** 🎨 ← Para focar em qualidades
- **Apenas Substantivos** 📦 ← Para focar em coisas/pessoas
- **Apenas Expressões** 💬 ← Para focar em frases feitas

### Incluir Frases:
- ✅ **Marcado:** Inclui exercícios de tradução de frases completas
- ❌ **Desmarcado:** Apenas palavras isoladas

**Dica:** Se você é iniciante, comece SEM as frases (mais fácil)

## 📊 Entendendo o Progresso

### No Card do Episódio:
```
S01E01 ✅          [já completou]
25/40 palavras    [aprendeu 25 de 40]
Tentativas: 3     [jogou 3 vezes]
75% | 280 pts     [precisão e pontos]
```

### Durante o Jogo:
- **Barra verde:** Seu progresso (quanto falta)
- **✅ Acertos:** Quantas você acertou
- **❌ Erros:** Quantas você errou
- **🔥 Sequência:** Quantas seguidas você acerta (bônus de pontos!)

## 🏆 Sistema de Tentativas

Cada vez que você completa um episódio, a tentativa é salva.

**Exemplo de histórico:**
```
📊 Melhores Tentativas
1º - 26/10/2026    85.5% (340 pts)  ← Melhor
2º - 25/10/2026    80.2% (310 pts)
3º - 24/10/2026    75.0% (290 pts)
```

**O sistema guarda apenas as 5 MELHORES** (ordenadas por pontuação)

## 🎯 Dicas para Melhor Pontuação

1. **Mantenha a sequência:** Cada acerto seguido dá +2 pontos de bônus
2. **Complete tudo:** Episódios completos (70%+) desbloqueiam revisão
3. **Use revisar erros:** Foca no que você precisa melhorar
4. **Tente novamente:** Depois de aprender, jogue de novo para pontos extras

## 🗑️ Zerando Progresso

### Zerar Episódio Específico:
1. Clique no episódio
2. Escolha "🗑️ Zerar Este Episódio"
3. Confirme

### Zerar Perfil Inteiro:
1. Na tela de episódios, role até o topo
2. Clique no botão vermelho "🗑️ Zerar Todo o Progresso do Perfil"
3. Confirme (ISSO APAGA TUDO!)

## ❓ Perguntas Frequentes

### Por que meu progresso não aparece no celular?
- O progresso fica salvo no navegador de cada dispositivo
- Use sempre o mesmo dispositivo ou aguarde a funcionalidade de export/import
- Veja `SINCRONIZACAO.md` para mais detalhes

### O que acontece se eu limpar o cache do navegador?
- ⚠️ Você PERDE TODO O PROGRESSO
- Não há como recuperar (ainda)
- Solução futura: sistema de backup

### Quantas questões tem por episódio?
- **Sem frases:** ~40 palavras
- **Com frases:** ~160 questões (40 palavras × 4 - palavra + 3 exemplos)

### Como funciona o sistema de "precisa praticar"?
- Palavras com taxa de erro > 30% aparecem no "Continuar"
- Exemplo: 10 tentativas, 4 erros = 40% de erro = precisa praticar
- Palavras não praticadas também aparecem

### Posso jogar offline?
- ✅ Sim! Depois de carregar a primeira vez
- Mas precisa do servidor local para o episodios.json

## 🎨 Significado dos Ícones

- ✅ - Episódio completado (70%+)
- 🔄 - Episódio em progresso
- 🎯 - Verbo
- 🎨 - Adjetivo
- 📦 - Substantivo
- 💬 - Expressão
- 🔥 - Sequência de acertos

## 🚨 Solução de Problemas

### Não aparecem episódios:
1. Verifique se está usando servidor local (não abra diretamente o arquivo)
2. Execute: `python -m http.server 8000`
3. Acesse: `http://localhost:8000`

### Progresso não salva:
1. Verifique se não está em modo anônimo
2. Verifique se o navegador permite localStorage
3. Veja o console (F12) por erros

### Questões muito fáceis/difíceis:
- Use os filtros de categoria
- Desative as frases se estiver difícil
- Use "Revisar Erros" para focar no que é difícil

---

**Bons estudos! 🚀📚**
