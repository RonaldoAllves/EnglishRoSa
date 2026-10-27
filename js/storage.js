/**
 * Sistema de Armazenamento Local
 * Gerencia o progresso dos usuários usando localStorage
 */

class StorageManager {
    constructor() {
        this.initializeProfiles();
    }

    /**
     * Inicializa os perfis se não existirem
     */
    initializeProfiles() {
        if (!localStorage.getItem('ronaldo')) {
            const defaultProfile = this.createDefaultProfile('ronaldo');
            localStorage.setItem('ronaldo', JSON.stringify(defaultProfile));
        }

        if (!localStorage.getItem('sarah')) {
            const defaultProfile = this.createDefaultProfile('sarah');
            localStorage.setItem('sarah', JSON.stringify(defaultProfile));
        }
    }

    /**
     * Cria um perfil padrão
     */
    createDefaultProfile(name) {
        return {
            name: name,
            totalPoints: 0,
            totalWords: 0,
            totalCorrect: 0,
            totalWrong: 0,
            episodes: {},
            lastPlayed: null,
            createdAt: new Date().toISOString()
        };
    }

    /**
     * Obtém os dados de um perfil
     */
    getProfile(profileName) {
        const data = localStorage.getItem(profileName);
        return data ? JSON.parse(data) : this.createDefaultProfile(profileName);
    }

    /**
     * Salva os dados de um perfil
     */
    saveProfile(profileName, profileData) {
        localStorage.setItem(profileName, JSON.stringify(profileData));
    }

    /**
     * Obtém o progresso de um episódio específico
     */
    getEpisodeProgress(profileName, episodeId) {
        const profile = this.getProfile(profileName);
        
        if (!profile.episodes[episodeId]) {
            profile.episodes[episodeId] = {
                episodeId: episodeId,
                completed: false,
                totalQuestions: 0,
                correctAnswers: 0,
                wrongAnswers: 0,
                points: 0,
                bestStreak: 0,
                attempts: 0,
                categories: {
                    adjetivos: { correct: 0, wrong: 0, total: 0 },
                    substantivos: { correct: 0, wrong: 0, total: 0 },
                    verbos: { correct: 0, wrong: 0, total: 0 },
                    expressoes: { correct: 0, wrong: 0, total: 0 }
                },
                words: {}, // Armazena histórico de cada palavra
                lastPlayed: null
            };
            this.saveProfile(profileName, profile);
        }

        return profile.episodes[episodeId];
    }

    /**
     * Salva o progresso de uma questão
     */
    saveQuestionProgress(profileName, episodeId, questionData) {
        const profile = this.getProfile(profileName);
        const episode = this.getEpisodeProgress(profileName, episodeId);

        const { word, category, correct, points } = questionData;

        // Atualizar estatísticas do episódio
        episode.totalQuestions++;
        if (correct) {
            episode.correctAnswers++;
            episode.categories[category].correct++;
        } else {
            episode.wrongAnswers++;
            episode.categories[category].wrong++;
        }
        episode.categories[category].total++;
        episode.points += points;
        episode.lastPlayed = new Date().toISOString();

        // Atualizar histórico da palavra
        if (!episode.words[word]) {
            episode.words[word] = {
                word: word,
                category: category,
                attempts: 0,
                correct: 0,
                wrong: 0,
                lastAttempt: null
            };
        }
        
        const wordData = episode.words[word];
        wordData.attempts++;
        if (correct) {
            wordData.correct++;
        } else {
            wordData.wrong++;
        }
        wordData.lastAttempt = new Date().toISOString();

        // Atualizar estatísticas globais do perfil
        profile.totalWords++;
        if (correct) {
            profile.totalCorrect++;
        } else {
            profile.totalWrong++;
        }
        profile.totalPoints += points;
        profile.lastPlayed = new Date().toISOString();

        // Salvar
        profile.episodes[episodeId] = episode;
        this.saveProfile(profileName, profile);

        return profile;
    }

    /**
     * Salva o resultado final de uma sessão de jogo
     */
    saveGameResult(profileName, episodeId, result) {
        const profile = this.getProfile(profileName);
        const episode = this.getEpisodeProgress(profileName, episodeId);

        // Atualizar melhor sequência
        if (result.bestStreak > episode.bestStreak) {
            episode.bestStreak = result.bestStreak;
        }

        // Incrementar tentativas
        episode.attempts++;

        // Marcar como completo se passou de 70%
        const accuracy = (result.correct / result.total) * 100;
        if (accuracy >= 70) {
            episode.completed = true;
        }

        profile.episodes[episodeId] = episode;
        this.saveProfile(profileName, profile);

        return profile;
    }

    /**
     * Obtém palavras com mais erros para revisão
     */
    getWordsForReview(profileName, episodeId, limit = 10) {
        const episode = this.getEpisodeProgress(profileName, episodeId);
        
        const wordsList = Object.values(episode.words);
        
        // Ordenar por taxa de erro (mais erros primeiro)
        wordsList.sort((a, b) => {
            const errorRateA = a.attempts > 0 ? a.wrong / a.attempts : 0;
            const errorRateB = b.attempts > 0 ? b.wrong / b.attempts : 0;
            return errorRateB - errorRateA;
        });

        return wordsList.slice(0, limit);
    }

    /**
     * Obtém estatísticas globais de um perfil
     */
    getGlobalStats(profileName) {
        const profile = this.getProfile(profileName);
        
        const totalAttempts = profile.totalCorrect + profile.totalWrong;
        const accuracy = totalAttempts > 0 ? (profile.totalCorrect / totalAttempts * 100).toFixed(1) : 0;
        
        const completedEpisodes = Object.values(profile.episodes).filter(ep => ep.completed).length;
        
        return {
            totalPoints: profile.totalPoints,
            totalWords: profile.totalWords,
            totalCorrect: profile.totalCorrect,
            totalWrong: profile.totalWrong,
            accuracy: accuracy,
            completedEpisodes: completedEpisodes,
            totalEpisodes: Object.keys(profile.episodes).length
        };
    }

    /**
     * Reseta o progresso de um episódio
     */
    resetEpisode(profileName, episodeId) {
        const profile = this.getProfile(profileName);
        
        if (profile.episodes[episodeId]) {
            delete profile.episodes[episodeId];
            this.saveProfile(profileName, profile);
        }
    }

    /**
     * Reseta todo o perfil (cuidado!)
     */
    resetProfile(profileName) {
        const newProfile = this.createDefaultProfile(profileName);
        this.saveProfile(profileName, newProfile);
    }

    /**
     * Exporta os dados do perfil para backup
     */
    exportProfile(profileName) {
        const profile = this.getProfile(profileName);
        const dataStr = JSON.stringify(profile, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${profileName}_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        URL.revokeObjectURL(url);
    }

    /**
     * Importa dados do perfil de um backup
     */
    importProfile(profileName, jsonData) {
        try {
            const profileData = JSON.parse(jsonData);
            this.saveProfile(profileName, profileData);
            return true;
        } catch (error) {
            console.error('Erro ao importar perfil:', error);
            return false;
        }
    }
}

// Instanciar o gerenciador de armazenamento
const storage = new StorageManager();
