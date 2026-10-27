/**
 * Lógica do Jogo
 * Gerencia as questões, respostas e pontuação
 */

class GameManager {
    constructor() {
        this.currentProfile = null;
        this.currentEpisode = null;
        this.episodeData = null;
        this.allWords = [];
        this.currentQuestionIndex = 0;
        this.progressOffset = 0;
        this.progressTotal = 0;
        this.currentQuestion = null;
        this.score = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.categoryStats = {
            adjetivos: { correct: 0, wrong: 0 },
            substantivos: { correct: 0, wrong: 0 },
            verbos: { correct: 0, wrong: 0 },
            expressoes: { correct: 0, wrong: 0 }
        };
        this.isReviewMode = false;
        this.categoryFilter = 'all'; // 'all', 'adjetivos', 'substantivos', 'verbos', 'expressoes'
        this.isNewAttempt = false; // Se é uma nova tentativa (reiniciar progresso)
        // includeSentences removido - sempre será true
    }

    /**
     * Inicia um novo jogo
     */
    async startGame(profile, episodeId, episodeData, options = {}) {
        this.currentProfile = profile;
        this.currentEpisode = episodeId;
        this.episodeData = episodeData;
        this.isReviewMode = options.reviewMode || false;
        this.categoryFilter = options.categoryFilter || 'all';
        this.isNewAttempt = options.isNewAttempt || false;
        
        // Reset das estatísticas
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.correctCount = 0;
        this.wrongCount = 0;
        this.currentStreak = 0;
        this.bestStreak = 0;
        this.categoryStats = {
            adjetivos: { correct: 0, wrong: 0 },
            substantivos: { correct: 0, wrong: 0 },
            verbos: { correct: 0, wrong: 0 },
            expressoes: { correct: 0, wrong: 0 }
        };

        // ✅ CRÍTICO: Sincronizar perfil do Firebase ANTES de preparar palavras
        await storage.syncProfileFromFirebase(profile);
        console.log('✅ Perfil sincronizado, preparando palavras...');

        // Preparar palavras
        if (this.isReviewMode) {
            this.prepareReviewWords();
        } else if (this.isNewAttempt) {
            this.prepareAllWords(); // Nova tentativa = todas as palavras
        } else {
            this.prepareUnlearnedWords(); // Continuar do progresso
        }

        if (!this.isReviewMode && !this.isNewAttempt) {
            const progress = storage.getEpisodeProgress(profile, episodeId);
            const progressStats = this.getCompletedProgressStats(progress);
            this.progressOffset = progressStats.completed;
            this.progressTotal = progressStats.total;
        } else {
            this.progressOffset = 0;
            this.progressTotal = this.allWords.length;
        }

        return this.allWords.length;
    }

    getCompletedProgressStats(progress) {
        let total = 0;
        let completed = 0;

        const isCompleted = itemProgress => typeof itemProgress?.lastCorrect === 'boolean'
            ? itemProgress.lastCorrect
            : Boolean(itemProgress?.correct);

        this.getCategoriesForFilter().forEach(category => {
            (this.episodeData[category] || []).forEach(item => {
                total++;
                if (isCompleted(progress.words?.[item.palavra])) {
                    completed++;
                }

                [
                    item.exemplo_diferente,
                    item.exemplo_episodio,
                    item.exemplo_adicional
                ].filter(sentence => sentence && sentence.trim()).forEach(sentence => {
                    total++;
                    const sentenceKey = this.getSentenceProgressKey(item.palavra, sentence);
                    const sentenceProgress = progress.sentences?.[sentenceKey] ||
                        progress.sentences?.[`${item.palavra}_${sentence}`];

                    if (isCompleted(sentenceProgress)) {
                        completed++;
                    }
                });
            });
        });

        return { completed, total };
    }

    /**
     * Prepara todas as palavras do episódio
     */
    prepareAllWords() {
        const words = [];
        const sentences = [];

        const categories = this.getCategoriesForFilter();
        
        categories.forEach(category => {
            if (this.episodeData[category] && Array.isArray(this.episodeData[category])) {
                this.episodeData[category].forEach(item => {
                    // Adicionar exercício de palavra
                    words.push({
                        word: item.palavra,
                        translation: item.traducao,
                        exampleDiff: item.exemplo_diferente,
                        exampleEpisode: item.exemplo_episodio,
                        exampleAdditional: item.exemplo_adicional,
                        category: category,
                        isSentence: false
                    });

                    // Adicionar exercícios de frases (sempre, mas em array separado)
                    const exampleSentences = [
                        item.exemplo_diferente,
                        item.exemplo_episodio,
                        item.exemplo_adicional
                    ].filter(s => s && s.trim());

                    exampleSentences.forEach(sentence => {
                        sentences.push({
                            word: item.palavra,
                            sentence: sentence,
                            translation: item.traducao,
                            category: category,
                            isSentence: true
                        });
                    });
                });
            }
        });

        // Embaralhar palavras e frases separadamente
        this.shuffleArray(words);
        this.shuffleArray(sentences);

        // Concatenar: palavras primeiro, frases depois
        this.allWords = [...words, ...sentences];
    }

    /**
     * Prepara apenas palavras não aprendidas (continuar progresso)
     */
    prepareUnlearnedWords() {
        const words = [];
        const sentences = [];
        const progress = storage.getEpisodeProgress(this.currentProfile, this.currentEpisode);
        const shouldPractice = itemProgress => {
            if (!itemProgress || itemProgress.attempts === 0) {
                return true;
            }

            if (typeof itemProgress.lastCorrect === 'boolean') {
                return !itemProgress.lastCorrect;
            }

            // Older progress records do not contain the result of the last attempt.
            return !itemProgress.correct;
        };
        
        const categories = this.getCategoriesForFilter();
        
        categories.forEach(category => {
            if (this.episodeData[category] && Array.isArray(this.episodeData[category])) {
                this.episodeData[category].forEach(item => {
                    if (shouldPractice(progress.words?.[item.palavra])) {
                        words.push({
                            word: item.palavra,
                            translation: item.traducao,
                            exampleDiff: item.exemplo_diferente,
                            exampleEpisode: item.exemplo_episodio,
                            exampleAdditional: item.exemplo_adicional,
                            category: category,
                            isSentence: false
                        });
                    }

                    const exampleSentences = [
                        item.exemplo_diferente,
                        item.exemplo_episodio,
                        item.exemplo_adicional
                    ].filter(s => s && s.trim());

                    exampleSentences.forEach(sentence => {
                        const sentenceKey = this.getSentenceProgressKey(item.palavra, sentence);
                        if (shouldPractice(progress.sentences?.[sentenceKey])) {
                            sentences.push({
                                word: item.palavra,
                                sentence: sentence,
                                translation: item.traducao,
                                category: category,
                                isSentence: true
                            });
                        }
                    });
                });
            }
        });

        console.log(`📝 Continuar: ${words.length} palavras + ${sentences.length} frases para praticar`);

        // Embaralhar palavras e frases separadamente
        this.shuffleArray(words);
        this.shuffleArray(sentences);

        // Concatenar: palavras primeiro, frases depois
        this.allWords = [...words, ...sentences];
    }

    /**
     * Retorna as categorias baseado no filtro
     */
    getCategoriesForFilter() {
        if (this.categoryFilter === 'all') {
            return ['adjetivos', 'substantivos', 'verbos', 'expressoes'];
        }
        return [this.categoryFilter];
    }

    getSentenceProgressKey(word, sentence) {
        const match = sentence.match(/^(.*?)\s*\((.*?)\)\s*$/);
        const englishSentence = match ? match[1].trim() : sentence.trim();
        return `${word}_${englishSentence}`;
    }

    /**
     * Prepara palavras para revisão (palavras com mais erros)
     */
    prepareReviewWords() {
        const wordsToReview = storage.getWordsForReview(this.currentProfile, this.currentEpisode, 20);
        
        this.allWords = [];
        const categories = ['adjetivos', 'substantivos', 'verbos', 'expressoes'];
        
        wordsToReview.forEach(wordData => {
            const category = wordData.category;
            const categoryWords = this.episodeData[category] || [];
            
            const fullWord = categoryWords.find(w => w.palavra === wordData.word);
            
            if (fullWord) {
                this.allWords.push({
                    word: fullWord.palavra,
                    translation: fullWord.traducao,
                    exampleDiff: fullWord.exemplo_diferente,
                    exampleEpisode: fullWord.exemplo_episodio,
                    exampleAdditional: fullWord.exemplo_adicional,
                    category: category
                });
            }
        });

        // Se não houver palavras para revisar, usar todas
        if (this.allWords.length === 0) {
            this.prepareAllWords();
        }
    }

    /**
     * Obtém a próxima questão
     */
    getNextQuestion() {
        if (this.currentQuestionIndex >= this.allWords.length) {
            return null; // Fim do jogo
        }

        const wordData = this.allWords[this.currentQuestionIndex];
        
        // Se é uma frase, criar questão de frase
        if (wordData.isSentence) {
            return this.createSentenceQuestion(wordData);
        }
        
        // Senão, criar questão de palavra
        return this.createWordQuestion(wordData);
    }

    /**
     * Cria questão de tradução de palavra
     */
    createWordQuestion(wordData) {
        const options = this.generateOptions(wordData);

        this.currentQuestion = {
            word: wordData.word,
            correctTranslation: wordData.translation,
            category: wordData.category,
            options: options,
            exampleDiff: wordData.exampleDiff,
            exampleEpisode: wordData.exampleEpisode,
            exampleAdditional: wordData.exampleAdditional,
            isSentence: false
        };

        return this.currentQuestion;
    }

    /**
     * Cria questão de tradução de frase
     */
    createSentenceQuestion(wordData) {
        // Extrair a frase em inglês e português
        const sentence = wordData.sentence;
        const parts = sentence.match(/^(.*?)\s*\((.*?)\)\s*$/);
        
        let englishSentence = sentence;
        let portugueseSentence = wordData.translation;
        
        if (parts) {
            englishSentence = parts[1].trim();
            portugueseSentence = parts[2].trim();
        }

        // Gerar opções de tradução de frases
        const options = this.generateSentenceOptions(portugueseSentence, wordData.category);

        this.currentQuestion = {
            word: wordData.word, // palavra relacionada
            sentence: englishSentence,
            correctTranslation: portugueseSentence,
            category: wordData.category,
            options: options,
            isSentence: true
        };

        return this.currentQuestion;
    }

    /**
     * Gera opções de resposta para frases
     */
    generateSentenceOptions(correctSentence, category) {
        const options = [correctSentence];
        
        // Coletar traduções de frases do episódio
        const allSentences = [];
        const categories = ['adjetivos', 'substantivos', 'verbos', 'expressoes'];
        
        categories.forEach(cat => {
            if (this.episodeData[cat]) {
                this.episodeData[cat].forEach(item => {
                    const sentences = [
                        item.exemplo_diferente,
                        item.exemplo_episodio,
                        item.exemplo_adicional
                    ].filter(s => s && s.trim());

                    sentences.forEach(sent => {
                        const parts = sent.match(/^(.*?)\s*\((.*?)\)\s*$/);
                        if (parts) {
                            const translation = parts[2].trim();
                            if (translation !== correctSentence) {
                                allSentences.push(translation);
                            }
                        }
                    });
                });
            }
        });

        // Embaralhar e pegar 3 incorretas
        this.shuffleArray(allSentences);
        for (let i = 0; i < 3 && i < allSentences.length; i++) {
            options.push(allSentences[i]);
        }

        // Completar com frases genéricas se necessário
        const genericSentences = [
            'Eu vou ao mercado',
            'Ele gosta de café',
            'Nós estamos cansados',
            'Eles foram embora',
            'Ela é muito legal'
        ];

        while (options.length < 4) {
            const random = genericSentences[Math.floor(Math.random() * genericSentences.length)];
            if (!options.includes(random)) {
                options.push(random);
            }
        }

        // Embaralhar opções
        this.shuffleArray(options);

        return options;
    }

    /**
     * Gera opções de resposta (1 correta + 3 incorretas)
     */
    generateOptions(wordData) {
        const options = [wordData.translation];
        
        // Coletar todas as traduções do episódio
        const allTranslations = [];
        const categories = ['adjetivos', 'substantivos', 'verbos', 'expressoes'];
        
        categories.forEach(category => {
            if (this.episodeData[category]) {
                this.episodeData[category].forEach(item => {
                    if (item.traducao !== wordData.translation) {
                        allTranslations.push(item.traducao);
                    }
                });
            }
        });

        // Embaralhar traduções
        this.shuffleArray(allTranslations);

        // Pegar 3 traduções incorretas
        for (let i = 0; i < 3 && i < allTranslations.length; i++) {
            options.push(allTranslations[i]);
        }

        // Se não tiver opções suficientes, adicionar traduções genéricas
        const genericOptions = [
            'fazer', 'ter', 'ser', 'estar', 'ir', 'ver', 'dar', 'poder',
            'dizer', 'saber', 'querer', 'vir', 'pensar', 'olhar', 'falar'
        ];

        while (options.length < 4) {
            const random = genericOptions[Math.floor(Math.random() * genericOptions.length)];
            if (!options.includes(random)) {
                options.push(random);
            }
        }

        // Embaralhar opções
        this.shuffleArray(options);

        return options;
    }

    /**
     * Verifica a resposta do usuário
     */
    async checkAnswer(selectedOption) {
        const isCorrect = selectedOption === this.currentQuestion.correctTranslation;
        
        // Calcular pontos
        let points = 0;
        if (isCorrect) {
            points = 10 + (this.currentStreak * 2); // Bonus por streak
            this.correctCount++;
            this.currentStreak++;
            this.categoryStats[this.currentQuestion.category].correct++;
            
            if (this.currentStreak > this.bestStreak) {
                this.bestStreak = this.currentStreak;
            }
        } else {
            this.wrongCount++;
            this.currentStreak = 0;
            this.categoryStats[this.currentQuestion.category].wrong++;
        }

        this.score += points;

        // Preparar dados para salvar
        const wordKey = this.currentQuestion.isSentence 
            ? this.getSentenceProgressKey(this.currentQuestion.word, this.currentQuestion.sentence)
            : this.currentQuestion.word;

        // Salvar progresso imediatamente
        this.currentQuestionIndex++;

        let persistenceError = null;
        try {
            await storage.saveQuestionProgress(this.currentProfile, this.currentEpisode, {
                word: wordKey,
                category: this.currentQuestion.category,
                correct: isCorrect,
                points: points,
                isSentence: this.currentQuestion.isSentence || false
            });
        } catch (error) {
            persistenceError = error;
            console.error('Erro ao sincronizar o progresso da resposta:', error);
        }

        return {
            correct: isCorrect,
            points: points,
            correctAnswer: this.currentQuestion.correctTranslation,
            persistenceError: persistenceError
        };
    }

    /**
     * Obtém o resultado final do jogo
     */
    async getGameResult() {
        const total = this.correctCount + this.wrongCount;
        const accuracy = total > 0 ? (this.correctCount / total * 100).toFixed(1) : 0;

        const result = {
            total: total,
            correct: this.correctCount,
            wrong: this.wrongCount,
            accuracy: accuracy,
            points: this.score,
            bestStreak: this.bestStreak,
            categoryStats: this.categoryStats
        };

        // Salvar resultado final
        await storage.saveGameResult(this.currentProfile, this.currentEpisode, result);

        return result;
    }

    /**
     * Embaralha um array (Fisher-Yates)
     */
    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /**
     * Obtém o progresso atual
     */
    getCurrentProgress() {
        const current = this.progressOffset + this.currentQuestionIndex;
        const total = this.progressTotal || this.allWords.length;

        return {
            current,
            total,
            percentage: (current / total * 100).toFixed(1)
        };
    }
}

// Instanciar o gerenciador do jogo
const game = new GameManager();

// Exportar para uso global
window.game = game;
