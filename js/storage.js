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
        return window.DomainModels.Profile.create(name);
    }

    /**
     * Obtém os dados de um perfil
     */
    getProfile(profileName) {
        const data = localStorage.getItem(profileName);
        return data
            ? new window.DomainModels.Profile(JSON.parse(data))
            : this.createDefaultProfile(profileName);
    }

    /**
     * Salva os dados de um perfil
     */
    saveProfile(profileName, profileData) {
        const profile = profileData instanceof window.DomainModels.Profile
            ? profileData
            : new window.DomainModels.Profile(profileData);
        localStorage.setItem(profileName, JSON.stringify(profile.toJSON()));
    }

    /**
     * Obtém o progresso de um episódio específico
     */
    getEpisodeProgress(profileName, episodeId) {
        const profile = this.getProfile(profileName);
        const isNewEpisode = !profile.episodes[episodeId];
        const episode = profile.getEpisodeProgress(episodeId);
        if (isNewEpisode) {
            this.saveProfile(profileName, profile);
        }
        return episode;
    }

    /**
     * Salva o progresso de uma questão (palavra ou frase)
     */
    saveQuestionProgress(profileName, episodeId, questionData) {
        const profile = this.getProfile(profileName);
        profile.recordAnswer(episodeId, questionData);
        this.saveProfile(profileName, profile);

        return profile;
    }

    startAttempt(profileName, episodeId, forceNew = false) {
        const profile = this.getProfile(profileName);
        const attempt = profile.startAttempt(episodeId, forceNew);
        this.saveProfile(profileName, profile);
        return attempt;
    }

    /**
     * Salva o resultado final de uma sessão de jogo
     */
    saveGameResult(profileName, episodeId, result) {
        const profile = this.getProfile(profileName);
        profile.addAttempt(episodeId, result, result.attemptId);
        this.saveProfile(profileName, profile);

        return profile;
    }

    /**
     * Obtém palavras que ainda não foram aprendidas ou com mais erros
     */
    getWordsForPractice(profileName, episodeId) {
        const episode = this.getEpisodeProgress(profileName, episodeId);
        const wordsList = Object.values(episode.words);
        
        // Palavras não praticadas ou com taxa de erro > 30%
        const needsPractice = wordsList.filter(word => {
            if (word.attempts === 0) return true;
            const errorRate = word.wrong / word.attempts;
            return errorRate > 0.3;
        });

        return needsPractice.map(w => w.word);
    }

    /**
     * Obtém palavras com mais erros para revisão
     */
    getWordsForReview(profileName, episodeId, limit = 10) {
        const episode = this.getEpisodeProgress(profileName, episodeId);
        return episode.getItemsForReview(limit);
    }

    /**
     * Obtém frases que ainda não foram praticadas ou com mais erros
     */
    getSentencesForPractice(profileName, episodeId) {
        const episode = this.getEpisodeProgress(profileName, episodeId);
        
        if (!episode.sentences) {
            episode.sentences = {};
        }
        
        const sentencesList = Object.values(episode.sentences);
        
        // Frases não praticadas ou com taxa de erro > 30%
        const needsPractice = sentencesList.filter(sentence => {
            if (sentence.attempts === 0) return true;
            const errorRate = sentence.wrong / sentence.attempts;
            return errorRate > 0.3;
        });

        return needsPractice.map(s => s.word);
    }

    /**
     * Obtém estatísticas globais de um perfil
     */
    getGlobalStats(profileName) {
        const profile = this.getProfile(profileName);
        return profile.getGlobalStats();
    }

    /**
     * Reseta o progresso de um episódio
     */
    resetEpisode(profileName, episodeId) {
        const profile = this.getProfile(profileName);
        if (profile.resetEpisode(episodeId)) {
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
        const dataStr = JSON.stringify(profile.toJSON(), null, 2);
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
            const profileData = new window.DomainModels.Profile(JSON.parse(jsonData));
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
