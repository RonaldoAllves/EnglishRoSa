# 📱 Sincronização de Progresso

## ⚠️ Por que meu progresso não sincroniza entre dispositivos?

O aplicativo utiliza **localStorage**, que é um armazenamento LOCAL do navegador. Isso significa que:

- ✅ Seus dados ficam salvos no seu dispositivo
- ✅ Funciona offline
- ✅ É rápido e privado
- ❌ **NÃO sincroniza** entre dispositivos diferentes
- ❌ **NÃO sincroniza** entre navegadores diferentes
- ❌ Pode ser perdido se você limpar o cache do navegador

## 💡 Soluções para sincronizar

### Opção 1: Usar apenas um dispositivo
A mais simples - escolha um dispositivo principal para estudar.

### Opção 2: Exportar/Importar manualmente (FUTURA)
Planejamos adicionar um botão de:
- **Exportar progresso** (salva um arquivo JSON)
- **Importar progresso** (carrega o arquivo em outro dispositivo)

### Opção 3: Hospedar com Backend (Avançado)
Para sincronização automática, seria necessário:
1. Criar um servidor backend (Node.js, Firebase, etc.)
2. Criar sistema de login
3. Salvar dados na nuvem
4. Modificar o código para usar API ao invés de localStorage

**Isso aumentaria a complexidade do projeto significativamente.**

## 🔧 Solução Temporária: GitHub Pages

Como você está usando GitHub Pages, o progresso fica específico do navegador no dispositivo que você usa.

**Recomendação atual:** Use sempre o mesmo dispositivo e navegador para estudar.

## 📋 Status das Melhorias

### ✅ Implementado
- Sistema de tentativas (mantém as 5 melhores)
- Continuar de onde parou
- Exercícios com frases
- Filtros por categoria
- Opção de revisar erros
- Botão de zerar perfil/episódio

### 🔜 Planejado
- Sistema de export/import de progresso
- Backup automático em arquivo

### 💭 Considerando
- Backend com Firebase (sincronização real)
- Sistema de login
