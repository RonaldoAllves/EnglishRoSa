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
        try {
            // Mostrar loading
            this.showFirebaseLoading();
            
            // Aguardar e verificar conexão Firebase (timeout de 15 segundos)
            const connected = await this.waitForFirebaseConnection(15000);
            
            if (!connected) {
                this.showFirebaseError();
                return; // Não continua sem Firebase
            }
            
            // Firebase conectado!
            this.hideFirebaseLoading();
            this.showProfileContent();
            
            // Carregar dados dos episódios
            await this.loadEpisodesData();
            
            // Verificar se há dados locais antigos para migrar
            await this.checkAndMigrateLocalData();
            
            // Configurar listeners
            this.setupEventListeners();
            
            // Atualizar estatísticas dos perfis
            this.updateProfileStats();
            
        } catch (error) {
            console.error('❌ Erro ao inicializar app:', error);
            this.showFirebaseError();
        }
    }

    /**
     * Aguarda conexão com Firebase
     */
    async waitForFirebaseConnection(timeout = 15000) {
        return new Promise((resolve) => {
            let elapsed = 0;
            const checkInterval = 500;
            
            const checkConnection = setInterval(() => {
                elapsed += checkInterval;
                
                // Verificar se Firebase está inicializado e online
                if (window.firebaseDatabase && window.firebaseStorage) {
                    // Verificar se está realmente conectado
                    if (window.firebaseStorage.isOnline) {
                        clearInterval(checkConnection);
                        console.log('✅ Firebase conectado com sucesso!');
                        resolve(true);
                        return;
                    }
                }
                
                // Timeout
                if (elapsed >= timeout) {
                    clearInterval(checkConnection);
                    console.error('❌ Timeout: Firebase não conectou');
                    resolve(false);
                }
            }, checkInterval);
        });
    }

    /**
     * Mostra loading do Firebase
     */
    showFirebaseLoading() {
        const loading = document.getElementById('firebase-loading');
        const error = document.getElementById('firebase-error');
        const content = document.getElementById('profile-content');
        
        if (loading) loading.style.display = 'block';
        if (error) error.style.display = 'none';
        if (content) content.style.display = 'none';
    }

    /**
     * Esconde loading do Firebase
     */
    hideFirebaseLoading() {
        const loading = document.getElementById('firebase-loading');
        if (loading) loading.style.display = 'none';
    }

    /**
     * Mostra erro de conexão
     */
    showFirebaseError() {
        const loading = document.getElementById('firebase-loading');
        const error = document.getElementById('firebase-error');
        const content = document.getElementById('profile-content');
        
        if (loading) loading.style.display = 'none';
        if (error) error.style.display = 'block';
        if (content) content.style.display = 'none';
    }

    /**
     * Mostra conteúdo dos perfis
     */
    showProfileContent() {
        const loading = document.getElementById('firebase-loading');
        const error = document.getElementById('firebase-error');
        const content = document.getElementById('profile-content');
        
        if (loading) loading.style.display = 'none';
        if (error) error.style.display = 'none';
        if (content) content.style.display = 'block';
    }

    /**
     * Verifica se há dados locais antigos e oferece migração
     */
    async checkAndMigrateLocalData() {
        const profiles = ['ronaldo', 'sarah'];
        
        for (const profileName of profiles) {
            const localData = localStorage.getItem(profileName);
            
            if (localData) {
                try {
                    const profile = JSON.parse(localData);
                    
                    // Verificar se tem progresso significativo
                    if (profile.totalWords > 0) {
                        console.log(`📦 Dados locais encontrados para ${profileName} (${profile.totalWords} palavras)`);
                        
                        // Sincronizar automaticamente com Firebase
                        await window.firebaseStorage.syncLocalToFirebase(profileName);
                        console.log(`✅ Dados de ${profileName} migrados para Firebase`);
                    }
                } catch (error) {
                    console.error(`Erro ao migrar dados de ${profileName}:`, error);
                }
            }
        }
    }

    /**
     * Carrega os dados dos episódios
     */
    async loadEpisodesData() {
        try {
            // Tentar carregar do Firebase primeiro
            if (window.firebaseDatabase) {
                try {
                    console.log('📥 Tentando carregar episódios do Firebase...');
                    const episodiosRef = firebase.database().ref('episodios');
                    const snapshot = await episodiosRef.once('value');
                    
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        
                        // Verificar se é array ou objeto
                        if (Array.isArray(data)) {
                            // Se for array, converter para o formato esperado
                            this.episodesData = {
                                serie: "The Big Bang Theory",
                                temporada: 1,
                                total_episodios: data.length,
                                episodios: data
                            };
                            console.log('✅ Episódios carregados do Firebase (array):', this.episodesData);
                        } else if (data.episodios) {
                            // Já está no formato correto
                            this.episodesData = data;
                            console.log('✅ Episódios carregados do Firebase (objeto):', this.episodesData);
                        } else {
                            // Formato desconhecido, tentar do arquivo local
                            console.log('⚠️ Formato inesperado no Firebase, carregando do arquivo local...');
                            throw new Error('Formato inesperado');
                        }
                        
                        // Se conseguiu carregar, retornar
                        if (this.episodesData && this.episodesData.episodios && this.episodesData.episodios.length > 0) {
                            return;
                        }
                    } else {
                        console.log('⚠️ Nenhum dado de episódios no Firebase, carregando do arquivo local...');
                    }
                } catch (firebaseError) {
                    console.log('⚠️ Erro ao carregar do Firebase, tentando arquivo local...', firebaseError);
                }
            }

            // Fallback: carregar do arquivo local
            console.log('📥 Carregando episódios do arquivo local...');
            const response = await fetch('episodios.json');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            this.episodesData = await response.json();
            console.log('✅ Episódios carregados do arquivo local:', this.episodesData);

            // Opcional: Salvar no Firebase para próxima vez (formato correto)
            if (window.firebaseDatabase && window.firebaseStorage && window.firebaseStorage.isOnline) {
                try {
                    const episodiosRef = firebase.database().ref('episodios');
                    await episodiosRef.set(this.episodesData);
                    console.log('💾 Episódios salvos no Firebase no formato correto');
                } catch (error) {
                    console.log('⚠️ Não foi possível salvar episódios no Firebase (não é crítico)', error);
                }
            }

        } catch (error) {
            console.error('❌ Erro ao carregar episódios:', error);
            
            const errorMsg = `
                ❌ Erro ao carregar dados dos episódios!
                
                Erro: ${error.message}
                
                SOLUÇÃO:
                Use um servidor HTTP local ao invés de abrir o arquivo diretamente.
                
                Execute no terminal:
                python -m http.server 8000
                
                Depois acesse: http://localhost:8000
            `;
            
            alert(errorMsg);
            
            document.body.innerHTML = `
                <div style="padding: 2rem; max-width: 600px; margin: 0 auto; font-family: sans-serif; background: #0f172a; color: #f1f5f9; min-height: 100vh;">
                    <h1 style="color: #ef4444;">❌ Erro ao Carregar Dados</h1>
                    <p style="background: #1e293b; padding: 1rem; border-radius: 0.5rem; border: 2px solid #ef4444;">
                        ${error.message}
                    </p>
                    
                    <h2 style="color: #6366f1; margin-top: 2rem;">🔧 Solução</h2>
                    <p>Você precisa usar um <strong>servidor HTTP local</strong> para o app funcionar.</p>
                    
                    <h3>Opção 1: Python (Recomendado)</h3>
                    <pre style="background: #1e293b; padding: 1rem; border-radius: 0.5rem; overflow-x: auto;">python -m http.server 8000</pre>
                    <p>Depois acesse: <a href="http://localhost:8000" style="color: #6366f1;">http://localhost:8000</a></p>
                    
                    <h3>Opção 2: Usar Firebase Hosting</h3>
                    <p>1. Instale Firebase CLI: <code>npm install -g firebase-tools</code><br>
                    2. Execute: <code>firebase init hosting</code><br>
                    3. Execute: <code>firebase deploy</code></p>
                    
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
    async selectProfile(profileName) {
        this.currentProfile = profileName;
        console.log('Perfil selecionado:', profileName);
        
        // Mostrar loading
        const loadingMsg = this.showLoading('Carregando dados do Firebase...');
        
        try {
            // Carregar dados do Firebase
            await window.firebaseStorage.loadFromFirebase(profileName);
            
            // Atualizar UI
            document.getElementById('current-profile-name').textContent = 
                profileName.charAt(0).toUpperCase() + profileName.slice(1);
            
            // Configurar botão de reset de perfil
            const btnResetProfile = document.getElementById('btn-reset-profile');
            if (btnResetProfile) {
                btnResetProfile.onclick = async () => {
                    if (confirm(`⚠️ ATENÇÃO!\n\nIsso irá APAGAR TODO O PROGRESSO de ${profileName}!\n\nTodas as palavras aprendidas, pontos e estatísticas serão perdidos.\n\nTem certeza absoluta?`)) {
                        try {
                            await storage.resetProfile(profileName);
                            this.updateEpisodeScreen();
                            alert('✅ Perfil resetado com sucesso!');
                        } catch (error) {
                            console.error('Erro ao resetar perfil:', error);
                            alert('Não foi possível sincronizar o reset do perfil com o Firebase. Verifique sua conexão.');
                        }
                    }
                };
            }
            
            this.updateEpisodeScreen();
            this.showScreen('episode-screen');
            
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            alert('Erro ao carregar dados. Usando dados locais.');
            
            document.getElementById('current-profile-name').textContent = 
                profileName.charAt(0).toUpperCase() + profileName.slice(1);
            
            this.updateEpisodeScreen();
            this.showScreen('episode-screen');
        } finally {
            this.hideLoading(loadingMsg);
        }
    }

    /**
     * Mostra mensagem de loading
     */
    showLoading(message) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div class="loading-content">
                <div class="loading-spinner"></div>
                <p>${message}</p>
            </div>
        `;
        document.body.appendChild(loadingDiv);
        return loadingDiv;
    }

    /**
     * Remove mensagem de loading
     */
    hideLoading(loadingDiv) {
        if (loadingDiv && loadingDiv.parentNode) {
            loadingDiv.parentNode.removeChild(loadingDiv);
        }
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
        const exerciseProgress = this.getExerciseProgress(episodeData, progress).all;
        const completion = exerciseProgress.total > 0
            ? Math.round((exerciseProgress.completed / exerciseProgress.total) * 100)
            : 0;

        const card = document.createElement('div');
        card.className = 'episode-card';
        
        let statusIcon = '';
        if (progress.completed) {
            statusIcon = '✅';
        } else if (exerciseProgress.completed > 0) {
            statusIcon = '🔄';
        }

        card.innerHTML = `
            <div class="episode-info">
                <h4>${episodeId.toUpperCase()} ${statusIcon}</h4>
                <div class="episode-progress-text">
                    ${exerciseProgress.completed}/${exerciseProgress.total} exercícios
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

    getExerciseProgress(episodeData, progress, categories = ['adjetivos', 'substantivos', 'verbos', 'expressoes']) {
        const categoryProgress = {
            all: { completed: 0, total: 0 },
            adjetivos: { completed: 0, total: 0 },
            substantivos: { completed: 0, total: 0 },
            verbos: { completed: 0, total: 0 },
            expressoes: { completed: 0, total: 0 }
        };

        const recordCompletion = (category, itemProgress) => {
            const completed = typeof itemProgress?.lastCorrect === 'boolean'
                ? itemProgress.lastCorrect
                : Boolean(itemProgress?.correct);

            categoryProgress[category].total++;
            categoryProgress.all.total++;

            if (completed) {
                categoryProgress[category].completed++;
                categoryProgress.all.completed++;
            }
        };

        for (const category of categories) {
            for (const item of episodeData[category] || []) {
                recordCompletion(category, progress.words?.[item.palavra]);

                const examples = [
                    item.exemplo_diferente,
                    item.exemplo_episodio,
                    item.exemplo_adicional
                ].filter(sentence => sentence && sentence.trim());

                for (const sentence of examples) {
                    const match = sentence.match(/^(.*?)\s*\((.*?)\)\s*$/);
                    const englishSentence = match ? match[1].trim() : sentence.trim();
                    const sentenceKey = storage.getSentenceProgressKey(item.palavra, englishSentence);
                    const sentenceProgress = progress.sentences?.[sentenceKey] ||
                        progress.sentences?.[`${item.palavra}_${englishSentence}`] ||
                        progress.sentences?.[`${item.palavra}_${sentence}`];
                    recordCompletion(category, sentenceProgress);
                }
            }
        }

        return categoryProgress;
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

        btnResetEpisode.onclick = async () => {
            if (confirm('Tem certeza que deseja zerar o progresso deste episódio?')) {
                try {
                    await storage.resetEpisode(this.currentProfile, episodeId);
                    modal.classList.remove('active');
                    this.updateEpisodeScreen();
                } catch (error) {
                    console.error('Erro ao resetar progresso do episódio:', error);
                    alert('Não foi possível sincronizar o reset do episódio com o Firebase. Verifique sua conexão.');
                }
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
        this.updateCategoryProgress(episodeId);

        btnStartGame.onclick = () => {
            const categoryFilter = document.querySelector('input[name="category-filter"]:checked').value;

            modal.classList.remove('active');
            
            this.startGame(episodeId, {
                ...initialOptions,
                categoryFilter,
                includeSentences: true // Sempre incluir frases
            });
        };

        btnCancelFilter.onclick = () => {
            modal.classList.remove('active');
        };

        modal.classList.add('active');
    }

    updateCategoryProgress(episodeId) {
        const episodeData = this.episodesData.episodios.find(ep => ep.episodio === episodeId);
        if (!episodeData) {
            return;
        }

        const progress = storage.getEpisodeProgress(this.currentProfile, episodeId);
        const categoryProgress = this.getExerciseProgress(episodeData, progress);

        for (const [category, stats] of Object.entries(categoryProgress)) {
            const percentage = stats.total > 0
                ? Math.round((stats.completed / stats.total) * 100)
                : 0;
            const count = document.querySelector(`[data-progress-count="${category}"]`);
            const bar = document.querySelector(`[data-progress-bar="${category}"]`);

            if (count) {
                count.textContent = `Concluídos: ${stats.completed}/${stats.total} (${percentage}%)`;
            }

            if (bar) {
                bar.value = percentage;
                bar.setAttribute('aria-valuetext', `${percentage}% concluído`);
            }
        }
    }

    /**
     * Inicia o jogo
     */
    async startGame(episodeId, options = {}) {
        this.currentEpisodeId = episodeId;
        
        // Encontrar dados do episódio
        const episodeData = this.episodesData.episodios.find(ep => ep.episodio === episodeId);
        
        if (!episodeData) {
            alert('Episódio não encontrado!');
            return;
        }

        // Mostrar loading
        const loading = this.showLoading('Preparando exercícios...');

        try {
            // ✅ Iniciar o jogo (agora é async e sincroniza Firebase)
            const totalQuestions = await game.startGame(this.currentProfile, episodeId, episodeData, options);
            
            if (totalQuestions === 0) {
                this.hideLoading(loading);
                alert('Não há exercícios pendentes neste modo. Escolha "Nova Tentativa" para praticar tudo novamente.');
                return;
            }

            // Atualizar UI
            document.getElementById('game-episode').textContent = episodeId.toUpperCase();
            document.getElementById('total-questions').textContent = game.getCurrentProgress().total;
            
            this.resetGameUI();
            this.hideLoading(loading);
            this.showScreen('game-screen');
            this.loadNextQuestion();
        } catch (error) {
            this.hideLoading(loading);
            console.error('Erro ao iniciar jogo:', error);
            alert('Erro ao carregar o jogo. Tente novamente.');
        }
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
    async handleAnswer(button, selectedOption) {
        // Desabilitar todos os botões
        document.querySelectorAll('.option-btn').forEach(btn => {
            btn.disabled = true;
        });

        // Verificar resposta
        const result = await game.checkAnswer(selectedOption);

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

        if (result.persistenceError) {
            alert('A resposta foi salva neste dispositivo, mas não foi confirmada pelo Firebase. Mantenha o app aberto e verifique sua conexão para sincronizar o progresso.');
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
    async showResults() {
        let result;
        try {
            result = await game.getGameResult();
        } catch (error) {
            console.error('Erro ao salvar o resultado do jogo:', error);
            alert('O resultado foi salvo neste dispositivo, mas não foi confirmado pelo Firebase. Verifique sua conexão.');
            return;
        }
        
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
        if (screenId === 'profile-screen') {
            this.updateProfileStats();
        }

        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        document.getElementById(screenId).classList.add('active');

        // Scroll para o topo
        window.scrollTo(0, 0);
    }
}

// Iniciar a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📱 DOM carregado, iniciando app...');
    
    // Aguardar Firebase Storage carregar (máximo 10 segundos)
    let attempts = 0;
    const firebaseReady = await new Promise(resolve => {
        const checkFirebase = setInterval(() => {
            attempts++;
            if (window.firebaseStorage) {
                clearInterval(checkFirebase);
                console.log('✅ Firebase Storage disponível');
                resolve(true);
            } else if (attempts > 100) { // 10 segundos
                clearInterval(checkFirebase);
                console.error('❌ Firebase Storage não carregou');
                resolve(false);
            }
        }, 100);
    });

    if (!firebaseReady) {
        console.error('❌ Não foi possível inicializar Firebase Storage');
        // App.init() vai mostrar erro de conexão
    }

    // Definir storage global (obrigatório agora)
    window.storage = window.firebaseStorage;
    
    const app = new App();
    window.app = app; // Tornar acessível globalmente para debug
    
    console.log('✅ App inicializado');
});
