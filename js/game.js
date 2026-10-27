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
    }

    /**
     * Inicia um novo jogo
     */
    startGame(profile, episodeId, episodeData, reviewMode = false) {
        this.currentProfile = profile;
        this.currentEpisode = episodeId;
        this.episodeData = episodeData;
        this.isReviewMode = reviewMode;
        
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

        // Preparar palavras
        if (reviewMode) {
            this.prepareReviewWords();
        } else {
            this.prepareAllWords();
        }

        // Embaralhar
        this.shuffleArray(this.allWords);

        return this.allWords.length;
    }

    /**
     * Prepara todas as palavras do episódio
     */
    prepareAllWords() {
        this.allWords = [];

        const categories = ['adjetivos', 'substantivos', 'verbos', 'expressoes'];
        
        categories.forEach(category => {
            if (this.episodeData[category] && Array.isArray(this.episodeData[category])) {
                this.episodeData[category].forEach(item => {
                    this.allWords.push({
                        word: item.palavra,
                        translation: item.traducao,
                        exampleDiff: item.exemplo_diferente,
                        exampleEpisode: item.exemplo_episodio,
                        exampleAdditional: item.exemplo_adicional,
                        category: category
                    });
                });
            }
        });
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
        
        // Gerar opções de resposta
        const options = this.generateOptions(wordData);

        this.currentQuestion = {
            word: wordData.word,
            correctTranslation: wordData.translation,
            category: wordData.category,
            options: options,
            exampleDiff: wordData.exampleDiff,
            exampleEpisode: wordData.exampleEpisode,
            exampleAdditional: wordData.exampleAdditional
        };

        return this.currentQuestion;
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
    checkAnswer(selectedOption) {
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

        // Salvar progresso imediatamente
        storage.saveQuestionProgress(this.currentProfile, this.currentEpisode, {
            word: this.currentQuestion.word,
            category: this.currentQuestion.category,
            correct: isCorrect,
            points: points
        });

        this.currentQuestionIndex++;

        return {
            correct: isCorrect,
            points: points,
            correctAnswer: this.currentQuestion.correctTranslation
        };
    }

    /**
     * Obtém o resultado final do jogo
     */
    getGameResult() {
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
        storage.saveGameResult(this.currentProfile, this.currentEpisode, result);

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
        return {
            current: this.currentQuestionIndex,
            total: this.allWords.length,
            percentage: (this.currentQuestionIndex / this.allWords.length * 100).toFixed(1)
        };
    }
}

// Instanciar o gerenciador do jogo
const game = new GameManager();
