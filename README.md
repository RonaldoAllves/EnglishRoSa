# English Learning - The Big Bang Theory

Aplicativo web para praticar inglês com vocabulário e frases dos episódios de *The Big Bang Theory*.

## Executar localmente

O app precisa ser aberto por um servidor HTTP e de conexão com a internet para acessar o Firebase.

1. Execute `START_SERVER.bat` (requer Python instalado) ou, no terminal, rode `python -m http.server 8000`.
2. Acesse <http://localhost:8000>.
3. Escolha um perfil e um episódio.

Não abra `index.html` diretamente como arquivo (`file://`).

## O que o app oferece

- Perfis separados para Ronaldo e Sarah, com progresso salvo no Firebase.
- Modos para continuar, iniciar nova tentativa e revisar erros.
- Filtros de exercícios por categoria.
- Exercícios de palavras seguidos por exercícios de frases; frases fazem parte do jogo.
- Em "Continuar", respostas corretas deixam de aparecer; respostas incorretas voltam para prática.

O app exige conexão com o Firebase para iniciar. O progresso associado a um perfil pode ser acessado em outros dispositivos que usem esse mesmo perfil.

## Arquivos principais

- `index.html`: interface e carregamento dos scripts do Firebase.
- `css/style.css`: estilos.
- `js/app.js`: inicialização, navegação e interação com a interface.
- `js/game.js`: lógica dos exercícios e pontuação.
- `js/firebase-config.js` e `js/firebase-storage.js`: configuração e persistência no Firebase.
- `js/storage.js`: estrutura e operações locais de dados dos perfis.
- `episodios.json`: conteúdo dos episódios.
- `firebase-rules.json`: regras de exemplo para o Realtime Database.

## Firebase

O app está configurado para o projeto Firebase `englishrosa-a3e97`. As regras do banco precisam permitir que o app leia os episódios e grave o progresso dos perfis.

**Atenção:** as regras atuais permitem leitura e gravação dos perfis sem autenticação. Não armazene dados pessoais nesses perfis e revise as regras no console do Firebase antes de disponibilizar o app publicamente.

## Alterar conteúdo

Edite `episodios.json` para modificar episódios, categorias, traduções e exemplos. Valide o JSON antes de publicar para evitar erros ao carregar o conteúdo.
