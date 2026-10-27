# 📺 English Learning - The Big Bang Theory

Aplicativo web para aprender inglês assistindo The Big Bang Theory! 🎓✨

## 🔥 **NOVO: Sincronização com Firebase!**

Seu progresso agora é salvo na nuvem e sincroniza automaticamente entre dispositivos! 🚀☁️

## ✨ Funcionalidades

### 🎮 Sistema de Aprendizado
- ✅ Exercícios interativos de vocabulário
- ✅ Tradução de palavras e frases completas
- ✅ 4 categorias: Verbos, Adjetivos, Substantivos e Expressões
- ✅ Exemplos reais das séries de TV

### 📊 Sistema de Progresso
- ✅ **Sincronização em nuvem** - Progresso salvo no Firebase
- ✅ **Multi-dispositivo** - Acesse de qualquer lugar
- ✅ Sistema de tentativas (salva as 5 melhores)
- ✅ Continuar de onde parou
- ✅ Modo de revisão de erros
- ✅ Estatísticas detalhadas por categoria
- ✅ Sistema de pontuação com bônus de streak

### 🎯 Modos de Jogo
- **Continuar Progresso**: Apenas palavras que você precisa praticar
- **Nova Tentativa**: Todas as palavras para melhorar pontuação
- **Revisar Erros**: Foco nas palavras mais difíceis
- **Filtros**: Escolha tipo de exercício (verbos, adjetivos, etc.)
- **Com/Sem Frases**: Inclua ou exclua exercícios de frases

### 👥 Multi-perfil
- Dois perfis independentes (Ronaldo e Sarah)
- Estatísticas separadas
- Progresso individual sincronizado

## 🚀 Como Usar

### Opção 1: Servidor Local (Desenvolvimento)

```bash
# Python
python -m http.server 8000

# Ou Node.js
npx http-server

# Depois acesse
http://localhost:8000
```

### Opção 2: Firebase Hosting (Produção)

```bash
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

## 🔥 Configuração do Firebase

O app usa Firebase Realtime Database para sincronização. Já está configurado!

### Verificar Dados no Firebase Console
1. Acesse: https://console.firebase.google.com/
2. Projeto: `englishrosa-a3e97`
3. Realtime Database → Ver dados em tempo real

### Configurar Regras de Segurança
No Firebase Console → Realtime Database → Regras:
```json
{
  "rules": {
    "profiles": {
      "$profileId": {
        ".read": true,
        ".write": true
      }
    },
    "episodios": {
      ".read": true,
      ".write": false
    }
  }
}
```

Ver `firebase-rules.json` para regras mais detalhadas.

## 📁 Estrutura do Projeto

```
EnglishRoSa/
├── index.html              # Interface principal
├── episodios.json          # Dados dos episódios
├── css/
│   └── style.css          # Estilos
├── js/
│   ├── firebase-config.js      # 🔥 Configuração Firebase
│   ├── firebase-storage.js     # 🔥 Sistema de sincronização
│   ├── game.js                 # Lógica do jogo
│   └── app.js                  # Controle da aplicação
├── FIREBASE_SETUP.md           # 🔥 Documentação Firebase
├── firebase-rules.json         # 🔥 Regras de segurança
├── GUIA_RAPIDO.md             # Como usar o app
├── SINCRONIZACAO.md           # Info sobre sincronização
└── README.md                  # Este arquivo
```

## 💡 Recursos Técnicos

### Firebase Realtime Database
- Sincronização automática em tempo real
- Funciona offline com fila de sincronização
- Migração automática de dados locais
- Fallback para localStorage se Firebase falhar

### Progressive Web App (PWA)
- Funciona como app nativo
- Instalável no celular/desktop
- Funciona offline (após primeira carga)

### Design Responsivo
- Interface otimizada para mobile e desktop
- Dark mode elegante
- Animações suaves

## 🎮 Como Jogar

1. **Escolha seu perfil** (Ronaldo ou Sarah)
2. **Selecione um episódio** da lista
3. **Configure suas opções**:
   - Continuar progresso ou nova tentativa
   - Filtrar por categoria
   - Incluir/excluir exercícios de frases
4. **Responda as questões** clicando nas opções
5. **Veja seus resultados** e estatísticas ao final

## 📊 Sistema de Pontuação

- **Acerto**: 10 pontos
- **Bônus de Streak**: +2 pontos por acerto consecutivo
- **Completar episódio**: 70% ou mais para marcar como completo
- **Top 5 Tentativas**: As 5 melhores tentativas são salvas

## 🔄 Sincronização Entre Dispositivos

### Como funciona:
1. **Primeiro dispositivo**: Jogue normalmente
2. **Segundo dispositivo**: Abra o site, escolha o mesmo perfil
3. **Automático**: Seu progresso já está lá! 🎉

### Indicadores:
- 🟢 **Verde**: Conectado e sincronizando
- 🔴 **Vermelho**: Offline (sincroniza quando voltar online)

## 🐛 Solução de Problemas

### Firebase não conecta
1. Verifique sua internet
2. Veja o console do navegador (F12) para erros
3. App funciona offline usando cache local

### Progresso não sincroniza
1. Verifique status de conexão (verde = ok)
2. Veja logs no console (F12)
3. Dados locais são backup automático

### Dados antigos não aparecem
- Migração é automática na primeira vez
- Pode exportar/importar manualmente se necessário

## 📚 Documentação

- **GUIA_RAPIDO.md**: Como usar todas as funcionalidades
- **FIREBASE_SETUP.md**: Detalhes técnicos do Firebase
- **SINCRONIZACAO.md**: Como funciona a sincronização
- **firebase-rules.json**: Regras de segurança do Firebase

## 🔮 Próximas Funcionalidades

- [ ] Sistema de autenticação (login individual)
- [ ] Mais episódios e temporadas
- [ ] Modo de desafio com cronômetro
- [ ] Ranking entre usuários
- [ ] Estatísticas avançadas
- [ ] Exportar relatório de progresso

## 🛠️ Tecnologias Utilizadas

- HTML5, CSS3, JavaScript (ES6+)
- Firebase Realtime Database
- Firebase Hosting (opcional)
- LocalStorage (fallback)
- Progressive Web App (PWA)

## 📝 Licença

Projeto pessoal para uso educacional.

## 👥 Autores

- Ronaldo & Sarah

---

**Bons estudos! 🚀📚✨**
