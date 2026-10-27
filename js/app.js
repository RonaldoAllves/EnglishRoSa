/**
 * Aplicação Principal
 * Gerencia navegação entre telas e interação com o usuário
 */

class App {
    constructor() {
        this.currentProfile = null;
        this.episodesData = null;
        this.currentEpisodeId = null;
        
        this.init();
    }

    /**
     * Inicializa a aplicação
     */
    async init() {
        await this.loadEpisodesData();
        this.setupEventListeners();
        this.updateProfileStats();
        this.showScreen('profile-screen');
    }

    /**
     * Carrega os dados dos episódios
     */
    async loadEpisodesData() {
        try {
            const response = await fetch('episodios.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.episodesData = await response.json();
            console.log('✅ Episódios carregados:', this.episodesData);
        } catch (error) {
            console.error('❌ Erro ao carregar episódios:', error);
            
            // Mostrar erro mais detalhado
            const errorMsg = `
                ❌ Erro ao carregar dados dos episódios!
                
                Erro: ${error.message}
                
                SOLUÇÃO:
                Use um servidor HTTP local ao invés de abrir o arquivo diretamente.
                
                Execute no terminal:
                cd D:\\English\\APP
                python -m http.server 8000
                
                Depois acesse: http://localhost:8000
            `;
            
            alert(errorMsg);
            
            // Mostrar na tela também
            document.body.innerHTML = `
                <div style="padding: 2rem; max-width: 600px; margin: 0 auto; font-family: sans-serif; background: #0f172a; color: #f1f5f9; min-height: 100vh;">
                    <h1 style="color: #ef4444;">❌ Erro ao Carregar Dados</h1>
                    <p style="background: #1e293b; padding: 1rem; border-radius: 0.5rem; border: 2px solid #ef4444;">
                        ${error.message}
                    </p>
                    
                    <h2 style="color: #6366f1; margin-top: 2rem;">🔧 Solução</h2>
                    <p>Você precisa usar um <strong>servidor HTTP local</strong> para o app funcionar.</p>
                    
                    <h3>Opção 1: Python (Recomendado)</h3>
                    <pre style="background: #1e293b; padding: 1rem; border-radius: 0.5rem; overflow-x: auto;">cd D:\\English\\APP
python -m http.server 8000</pre>
                    <p>Depois acesse: <a href="http://localhost:8000" style="color: #6366f1;">http://localhost:8000</a></p>
                    
                    <h3>Opção 2: Node.js</h3>
                    <pre style="background: #1e293b; padding: 1rem; border-radius: 0.5rem; overflow-x: auto;">cd D:\\English\\APP
npx http-server</pre>
                    
                    <h3>Opção 3: VS Code</h3>
                    <p>1. Instale a extensão "Live Server"<br>
                    2. Clique com botão direito em index.html<br>
                    3. Escolha "Open with Live Server"</p>
                    
                    <h3 style="margin-top: 2rem;">📖 Por que preciso disso?</h3>
                    <p style="background: #1e293b; padding: 1rem; border-radius: 0.5rem;">
                        Por segurança, navegadores bloqueiam o carregamento de arquivos JSON quando você abre um HTML diretamente (protocolo file://).
                        Um servidor HTTP local resolve isso.
                    </p>
                    
                    <button onclick="location.reload()" style="background: #6366f1; color: white; border: none; padding: 1rem 2rem; border-radius: 0.5rem; cursor: pointer; font-size: 1rem; margin-top: 2rem;">
                        🔄 Tentar Novamente
                    </button>
                </div>
            `;
        }
    }

    /**
     * Configura os event listeners
     */
    setupEventListeners() {
        // Seleção de perfil
        document.querySelectorAll('.profile-card').forEach(card => {
            card.addEventListener('click', () => {
                const profile = card.dataset.profile;
                this.selectProfile(profile);
            });
        });

        // Botões de voltar
        document.getElementById('btn-back-profile').addEventListener('click', () => {
            this.showScreen('profile-screen');
        });

        document.getElementById('btn-back-episodes').addEventListener('click', () => {
            this.endGame();
        });

        document.getElementById('btn-back-episodes-result').addEventListener('click', () => {
            this.showScreen('episode-screen');
        });

        // Botões de resultado
        document.getElementById('btn-play-again').addEventListener('click', () => {
            this.showEpisodeOptions(this.currentEpisodeId, storage.getEpisodeProgress(this.currentProfile, this.currentEpisodeId));
        });

        document.getElementById('btn-review').addEventListener('click', () => {
            this.startGame(this.currentEpisodeId, { reviewMode: true });
        });
    }

    /**
     * Seleciona um perfil
     */
    selectProfile(profileName) {
        this.currentProfile = profileName;
        console.log('Perfil selecionado:', profileName);
        
        // Atualizar UI
        document.getElementById('current-profile-name').textContent = 
            profileName.charAt(0).toUpperCase() + profileName.slice(1);
        
        // Configurar botão de reset de perfil
        const btnResetProfile = document.getElementById('btn-reset-profile');
        if (btnResetProfile) {
            btnResetProfile.onclick = () => {
                if (confirm(`⚠️ ATENÇÃO!\n\nIsso irá APAGAR TODO O PROGRESSO de ${profileName}!\n\nTodas as palavras aprendidas, pontos e estatísticas serão perdidos.\n\nTem certeza absoluta?`)) {
                    storage.resetProfile(profileName);
                    this.updateEpisodeScreen();
                    alert('✅ Perfil resetado com sucesso!');
                }
            };
        }
        
        this.updateEpisodeScreen();
        this.showScreen('episode-screen');
    }

    /**
     * Atualiza a tela de episódios
     */
    updateEpisodeScreen() {
        const stats = storage.getGlobalStats(this.currentProfile);
        
        // Atualizar estatísticas globais
        document.getElementById('profile-total-points').textContent = stats.totalPoints;
        document.getElementById('total-words').textContent = stats.totalWords;
        document.getElementById('total-correct').textContent = stats.totalCorrect;
        document.getElementById('accuracy').textContent = stats.accuracy + '%';

        // Renderizar lista de episódios
        const episodesList = document.getElementById('episodes-list');
        episodesList.innerHTML = '';

        if (this.episodesData && this.episodesData.episodios) {
            this.episodesData.episodios.forEach(episodeData => {
                const episodeCard = this.createEpisodeCard(episodeData);
                episodesList.appendChild(episodeCard);
            });
        }
    }

    /**
     * Cria um card de episódio
     */
    createEpisodeCard(episodeData) {
        const episodeId = episodeData.episodio;
        const progress = storage.getEpisodeProgress(this.currentProfile, episodeId);
        
        // Calcular total de palavras
        const totalWords = (
            (episodeData.adjetivos?.length || 0) +
            (episodeData.substantivos?.length || 0) +
            (episodeData.verbos?.length || 0) +
            (episodeData.expressoes?.length || 0)
        );

        const wordsLearned = progress.correctAnswers;
        const completion = totalWords > 0 ? Math.round((wordsLearned / totalWords) * 100) : 0;

        const card = document.createElement('div');
        card.className = 'episode-card';
        
        let statusIcon = '';
        if (progress.completed) {
            statusIcon = '✅';
        } else if (wordsLearned > 0) {
            statusIcon = '🔄';
        }

        card.innerHTML = `
            <div class="episode-info">
                <h4>${episodeId.toUpperCase()} ${statusIcon}</h4>
                <div class="episode-progress-text">
                    ${wordsLearned}/${totalWords} palavras
                </div>
                ${progress.attempts > 0 ? `<div class="episode-attempts">Tentativas: ${progress.attempts}</div>` : ''}
            </div>
            <div class="episode-stats">
                <div class="episode-completion">${completion}%</div>
                <div class="episode-points">${progress.points} pts</div>
            </div>
        `;

        card.addEventListener('click', () => {
            this.showEpisodeOptions(episodeId, progress);
        });

        return card;
    }

    /**
     * Mostra opções de jogo para o episódio
     */
    showEpisodeOptions(episodeId, progress) {
        const modal = document.getElementById('game-options-modal');
        const title = document.getElementById('options-episode-title');
        const btnContinue = document.getElementById('btn-continue-episode');
        const btnNewAttempt = document.getElementById('btn-new-attempt');
        const btnReview = document.getElementById('btn-review-episode');
        const btnResetEpisode = document.getElementById('btn-reset-episode');
        const optionsAttemptHistory = document.getElementById('options-attempt-history');

        title.textContent = episodeId.toUpperCase();

        // Mostrar histórico de tentativas
        if (progress.attemptHistory && progress.attemptHistory.length > 0) {
            optionsAttemptHistory.innerHTML = '<h4>📊 Melhores Tentativas</h4>';
            progress.attemptHistory.forEach((attempt, index) => {
                const date = new Date(attempt.date).toLocaleDateString('pt-BR');
                const div = document.createElement('div');
                div.className = 'attempt-item';
                div.innerHTML = `
                    <span>${index + 1}º - ${date}</span>
                    <span>${attempt.accuracy.toFixed(1)}% (${attempt.points} pts)</span>
                `;
                optionsAttemptHistory.appendChild(div);
            });
            optionsAttemptHistory.style.display = 'block';
        } else {
            optionsAttemptHistory.style.display = 'none';
        }

        // Configurar botões
        btnContinue.onclick = () => {
            modal.classList.remove('active');
            this.startGameWithOptions(episodeId, { isNewAttempt: false });
        };

        btnNewAttempt.onclick = () => {
            modal.classList.remove('active');
            this.startGameWithOptions(episodeId, { isNewAttempt: true });
        };

        btnReview.onclick = () => {
            modal.classList.remove('active');
            this.startGameWithOptions(episodeId, { reviewMode: true });
        };
        btnReview.style.display = progress.canReview ? 'block' : 'none';

        btnResetEpisode.onclick = () => {
            if (confirm('Tem certeza que deseja zerar o progresso deste episódio?')) {
                storage.resetEpisode(this.currentProfile, episodeId);
                modal.classList.remove('active');
                this.updateEpisodeScreen();
            }
        };

        modal.classList.add('active');
    }

    /**
     * Inicia o jogo com opções de filtro
     */
    startGameWithOptions(episodeId, initialOptions = {}) {
        const modal = document.getElementById('filter-options-modal');
        const title = document.getElementById('filter-episode-title');
        const btnStartGame = document.getElementById('btn-start-game');
        const btnCancelFilter = document.getElementById('btn-cancel-filter');

        title.textContent = episodeId.toUpperCase();

        btnStartGame.onclick = () => {
            const categoryFilter = document.querySelector('input[name="category-filter"]:checked').value;
            const includeSentences = document.getElementById('include-sentences').checked;

            modal.classList.remove('active');
            
            this.startGame(episodeId, {
                ...initialOptions,
                categoryFilter,
                includeSentences
            });
        };

        btnCancelFilter.onclick = () => {
            modal.classList.remove('active');
        };

        modal.classList.add('active');
    }

    /**
     * Inicia o jogo
     */
    startGame(episodeId, options = {}) {
        this.currentEpisodeId = episodeId;
        
        // Encontrar dados do episódio
        const episodeData = this.episodesData.episodios.find(ep => ep.episodio === episodeId);
        
        if (!episodeData) {
            alert('Episódio não encontrado!');
            return;
        }

        // Iniciar o jogo
        const totalQuestions = game.startGame(this.currentProfile, episodeId, episodeData, options);
        
        if (totalQuestions === 0) {
            alert('Nenhuma palavra disponível para este modo!');
            return;
        }

        // Atualizar UI
        document.getElementById('game-episode').textContent = episodeId.toUpperCase();
        document.getElementById('total-questions').textContent = totalQuestions;
        
        this.resetGameUI();
        this.showScreen('game-screen');
        this.loadNextQuestion();
    }

    /**
     * Reseta a UI do jogo
     */
    resetGameUI() {
        document.getElementById('game-points').textContent = '0';
        document.getElementById('mini-correct').textContent = '0';
        document.getElementById('mini-wrong').textContent = '0';
        document.getElementById('mini-streak').textContent = '0';
    }

    /**
     * Carrega a próxima questão
     */
    loadNextQuestion() {
        const question = game.getNextQuestion();
        
        if (!question) {
            // Fim do jogo
            this.showResults();
            return;
        }

        // Atualizar progresso
        const progress = game.getCurrentProgress();
        document.getElementById('current-question').textContent = progress.current + 1;
        document.getElementById('progress-fill').style.width = progress.percentage + '%';

        // Atualizar categoria
        const categoryMap = {
            adjetivos: '🎨 Adjetivo',
            substantivos: '📦 Substantivo',
            verbos: '🎯 Verbo',
            expressoes: '💬 Expressão'
        };
        document.getElementById('category-badge').textContent = categoryMap[question.category];

        // Mostrar palavra ou frase
        const wordDisplay = document.getElementById('word-text');
        if (question.isSentence) {
            wordDisplay.innerHTML = `<div class="sentence-question">
                <div class="sentence-label">Traduza a frase:</div>
                <div class="sentence-text">${question.sentence}</div>
            </div>`;
        } else {
            wordDisplay.textContent = question.word;
        }

        // Criar opções
        const optionsContainer = document.getElementById('translation-options');
        optionsContainer.innerHTML = '';

        question.options.forEach(option => {
            const button = document.createElement('button');
            button.className = 'option-btn';
            button.textContent = option;
            
            button.addEventListener('click', () => {
                this.handleAnswer(button, option);
            });

            optionsContainer.appendChild(button);
        });
    }

    /**
     * Processa a resposta do usuário
     */
    handleAnswer(button, selectedOption) {
        // Desabilitar todos os botões
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = true;
        });

        // Verificar resposta
        const result = game.checkAnswer(selectedOption);

        // Adicionar classe visual
        if (result.correct) {
            button.classList.add('correct');
            this.showFeedback(true, `+${result.points} pts`);
        } else {
            button.classList.add('wrong');
            this.showFeedback(false, result.correctAnswer);
            
            // Mostrar resposta correta
            document.querySelectorAll('.option-btn').forEach(btn => {
                if (btn.textContent === result.correctAnswer) {
                    btn.classList.add('correct');
                }
            });
        }

        // Atualizar estatísticas mini
        document.getElementById('game-points').textContent = game.score;
        document.getElementById('mini-correct').textContent = game.correctCount;
        document.getElementById('mini-wrong').textContent = game.wrongCount;
        document.getElementById('mini-streak').textContent = game.currentStreak;

        // Próxima questão após delay
        setTimeout(() => {
            this.loadNextQuestion();
        }, 1500);
    }

    /**
     * Mostra feedback visual
     */
    showFeedback(correct, text) {
        const toast = document.getElementById('feedback-toast');
        const textEl = toast.querySelector('.feedback-text');
        
        toast.className = 'feedback-toast show ' + (correct ? 'correct' : 'wrong');
        textEl.textContent = text;

        setTimeout(() => {
            toast.classList.remove('show');
        }, 1200);
    }

    /**
     * Mostra os resultados
     */
    showResults() {
        const result = game.getGameResult();
        
        // Atualizar círculo de progresso
        const circle = document.getElementById('score-circle');
        const circumference = 2 * Math.PI * 90;
        const offset = circumference - (result.accuracy / 100) * circumference;
        circle.style.strokeDashoffset = offset;

        // Atualizar valores
        document.getElementById('result-percentage').textContent = result.accuracy + '%';
        document.getElementById('result-total').textContent = result.total;
        document.getElementById('result-correct').textContent = result.correct;
        document.getElementById('result-wrong').textContent = result.wrong;
        document.getElementById('result-points').textContent = result.points;
        document.getElementById('result-streak').textContent = result.bestStreak;

        // Breakdown por categoria
        const breakdownContainer = document.getElementById('category-breakdown');
        breakdownContainer.innerHTML = '';

        const categoryMap = {
            adjetivos: '🎨 Adjetivos',
            substantivos: '📦 Substantivos',
            verbos: '🎯 Verbos',
            expressoes: '💬 Expressões'
        };

        Object.entries(result.categoryStats).forEach(([category, stats]) => {
            const total = stats.correct + stats.wrong;
            if (total > 0) {
                const accuracy = Math.round((stats.correct / total) * 100);
                
                const item = document.createElement('div');
                item.className = 'category-item';
                item.innerHTML = `
                    <span class="category-name">${categoryMap[category]}</span>
                    <span class="category-score">${stats.correct}/${total} (${accuracy}%)</span>
                `;
                breakdownContainer.appendChild(item);
            }
        });

        this.showScreen('result-screen');
    }

    /**
     * Finaliza o jogo e volta para episódios
     */
    endGame() {
        this.updateEpisodeScreen();
        this.showScreen('episode-screen');
    }

    /**
     * Atualiza estatísticas dos perfis na tela inicial
     */
    updateProfileStats() {
        const ronaldoStats = storage.getGlobalStats('ronaldo');
        const sarahStats = storage.getGlobalStats('sarah');

        document.getElementById('ronaldo-words').textContent = ronaldoStats.totalWords;
        document.getElementById('ronaldo-episodes').textContent = ronaldoStats.completedEpisodes;
        
        document.getElementById('sarah-words').textContent = sarahStats.totalWords;
        document.getElementById('sarah-episodes').textContent = sarahStats.completedEpisodes;
    }

    /**
     * Mostra uma tela específica
     */
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        document.getElementById(screenId).classList.add('active');

        // Scroll para o topo
        window.scrollTo(0, 0);
    }
}

// Iniciar a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    window.app = app; // Tornar acessível globalmente para debug
});
