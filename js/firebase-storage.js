/**
 * Sistema de Armazenamento com Firebase
 * Gerencia o progresso dos usuários usando Firebase Realtime Database
 */
const { Profile, SentenceExercise } = window.DomainModels;

class FirebaseStorageManager {
    constructor() {
        this.database = window.firebaseDatabase;
        this.isOnline = false;
        this.syncQueue = new Map();
        
        // Verificar se Firebase foi inicializado
        if (!this.database) {
            console.error('❌ Firebase não inicializado!');
            this.isOnline = false;
        } else {
            console.log('✅ Firebase Storage inicializado');
        }

        this.ready = this.initializeProfiles();
        this.setupConnectionMonitoring();
    }

    /**
     * Monitora conexão com Firebase
     */
    setupConnectionMonitoring() {
        if (!this.database) return;

        const connectedRef = firebase.database().ref('.info/connected');
        connectedRef.on('value', (snapshot) => {
            this.isOnline = snapshot.val() === true;
            console.log(this.isOnline ? '🟢 Firebase Online' : '🔴 Firebase Offline');
            
            // Processar fila quando voltar online
            if (this.isOnline && this.syncQueue.size > 0) {
                this.processSyncQueue();
            }
        });
    }

    /**
     * Processa operações pendentes quando voltar online
     */
    async processSyncQueue() {
        console.log(`📤 Sincronizando ${this.syncQueue.size} perfis pendentes...`);

        const pendingProfiles = Array.from(this.syncQueue.entries());
        this.syncQueue.clear();
        for (const [profileName, profileData] of pendingProfiles) {
            try {
                const profileRef = firebase.database().ref(`profiles/${profileName}`);
                await profileRef.set(profileData);
            } catch (error) {
                console.error('Erro ao sincronizar:', error);
                if (!this.syncQueue.has(profileName)) {
                    this.syncQueue.set(profileName, profileData);
                }
            }
        }
        
        if (this.syncQueue.size === 0) {
            console.log('✅ Sincronização completa!');
        } else {
            console.warn(`⚠️ ${this.syncQueue.size} perfis continuam pendentes`);
        }
    }

    /**
     * Inicializa os perfis se não existirem
     */
    async initializeProfiles() {
        const profiles = ['ronaldo', 'sarah'];
        
        for (const profileName of profiles) {
            const profile = await this.getProfile(profileName);
            if (!profile || Object.keys(profile).length === 0) {
                const defaultProfile = this.createDefaultProfile(profileName);
                await this.saveProfile(profileName, defaultProfile);
                console.log(`✅ Perfil ${profileName} criado no Firebase`);
            }
        }
    }

    /**
     * Cria um perfil padrão
     */
    createDefaultProfile(name) {
        return Profile.create(name);
    }

    /**
     * Obtém os dados de um perfil do Firebase
     */
    async getProfile(profileName) {
        if (!this.database) {
            throw new Error('Firebase não está disponível');
        }

        try {
            const profileRef = firebase.database().ref(`profiles/${profileName}`);
            const snapshot = await profileRef.once('value');
            
            if (snapshot.exists()) {
                return new Profile(snapshot.val());
            } else {
                return this.createDefaultProfile(profileName);
            }
        } catch (error) {
            console.error('Erro ao obter perfil do Firebase:', error);
            throw error; // Propagar erro ao invés de usar fallback
        }
    }

    /**
     * Salva os dados de um perfil no Firebase
     */
    async saveProfile(profileName, profileData) {
        const serializedProfile = profileData instanceof Profile
            ? profileData.toJSON()
            : new Profile(profileData).toJSON();
        this.normalizeSentenceKeys(serializedProfile);

        // Sempre salvar no localStorage como backup
        localStorage.setItem(profileName, JSON.stringify(serializedProfile));

        if (!this.database) {
            throw new Error('Firebase não está disponível');
        }

        this.syncQueue.delete(profileName);

        try {
            const profileRef = firebase.database().ref(`profiles/${profileName}`);
            await profileRef.set(serializedProfile);
            console.log(`💾 Perfil ${profileName} salvo no Firebase`);
        } catch (error) {
            console.error('Erro ao salvar perfil no Firebase:', error);
            this.syncQueue.set(profileName, serializedProfile);
            throw error;
        }
    }

    getSentenceProgressKey(word, sentence) {
        return SentenceExercise.progressKey(word, sentence);
    }

    normalizeSentenceKeys(profile) {
        for (const episode of Object.values(profile.episodes || {})) {
            if (!episode.sentences) {
                continue;
            }

            const normalizedSentences = {};
            for (const [key, sentenceProgress] of Object.entries(episode.sentences)) {
                let normalizedKey = key;
                if (!/^sentence_[0-9a-f]+$/i.test(key)) {
                    const separatorIndex = key.indexOf('_');
                    if (separatorIndex > 0) {
                        const word = key.slice(0, separatorIndex);
                        const sentence = key.slice(separatorIndex + 1)
                            .replace(/\s*\([^()]*\)\s*$/, '')
                            .trim();
                        normalizedKey = this.getSentenceProgressKey(word, sentence);
                    } else {
                        normalizedKey = this.getSentenceProgressKey('', key);
                    }
                }

                if (normalizedSentences[normalizedKey]) {
                    const existing = normalizedSentences[normalizedKey];
                    existing.attempts = (Number(existing.attempts) || 0) + (Number(sentenceProgress.attempts) || 0);
                    existing.correct = (Number(existing.correct) || 0) + (Number(sentenceProgress.correct) || 0);
                    existing.wrong = (Number(existing.wrong) || 0) + (Number(sentenceProgress.wrong) || 0);
                    if (sentenceProgress.lastAttempt > existing.lastAttempt) {
                        existing.lastAttempt = sentenceProgress.lastAttempt;
                        existing.lastCorrect = sentenceProgress.lastCorrect;
                    }
                } else {
                    normalizedSentences[normalizedKey] = { ...sentenceProgress };
                }
            }

            episode.sentences = normalizedSentences;
        }
    }

    /**
     * Obtém o progresso de um episódio específico (síncrono, usa cache)
     * IMPORTANTE: Deve chamar syncProfileFromFirebase() antes para garantir dados atualizados
     */
    getEpisodeProgress(profileName, episodeId) {
        // Usar cache local (deve estar sincronizado com Firebase)
        const profile = new Profile(JSON.parse(localStorage.getItem(profileName) || '{}'));
        const hasEpisode = Boolean(profile.episodes[episodeId]);
        const episode = profile.getEpisodeProgress(episodeId);
        if (!hasEpisode) {
            localStorage.setItem(profileName, JSON.stringify(profile.toJSON()));
        }
        return episode;
    }

    /**
     * Sincroniza perfil do Firebase para localStorage (async)
     * DEVE ser chamado antes de getEpisodeProgress()
     */
    async syncProfileFromFirebase(profileName) {
        if (!this.database) {
            console.warn('⚠️ Firebase não disponível, usando dados locais');
            return;
        }

        try {
            console.log(`📥 Sincronizando perfil ${profileName} do Firebase...`);
            const profile = await this.getProfile(profileName);
            
            // Atualizar localStorage com dados do Firebase
            localStorage.setItem(profileName, JSON.stringify(profile.toJSON()));
            console.log(`✅ Perfil ${profileName} sincronizado do Firebase`);
            
            return profile;
        } catch (error) {
            console.error(`❌ Erro ao sincronizar perfil ${profileName}:`, error);
            // Manter dados locais se houver erro
        }
    }

    /**
     * Salva o progresso de uma questão (palavra ou frase)
     */
    async saveQuestionProgress(profileName, episodeId, questionData) {
        const profileStr = localStorage.getItem(profileName);
        const profile = profileStr
            ? new Profile(JSON.parse(profileStr))
            : this.createDefaultProfile(profileName);
        profile.recordAnswer(episodeId, questionData);

        // Save serialized model in the existing Firebase/JSON schema.
        await this.saveProfile(profileName, profile);

        return profile;
    }

    /**
     * Salva o resultado final de uma sessão de jogo
     */
    async saveGameResult(profileName, episodeId, result) {
        const profileStr = localStorage.getItem(profileName);
        const profile = profileStr
            ? new Profile(JSON.parse(profileStr))
            : this.createDefaultProfile(profileName);
        profile.addAttempt(episodeId, result);
        await this.saveProfile(profileName, profile);

        return profile;
    }

    /**
     * Obtém palavras que ainda não foram dominadas (precisa praticar)
     */
    getWordsNeedingPractice(profileName, episodeId) {
        const episode = this.getEpisodeProgress(profileName, episodeId);
        
        if (!episode.words || Object.keys(episode.words).length === 0) {
            // Se não tem histórico, todas as palavras precisam de prática
            return [];
        }
        
        const wordsList = Object.values(episode.words);
        
        // Palavras que precisam de prática:
        // - Nunca tentadas (attempts === 0) - não deveriam estar aqui
        // - Taxa de erro > 30%
        // - Tentativas insuficientes (< 2)
        const needsPractice = wordsList.filter(word => {
            if (word.attempts === 0) return false; // Já foi filtrada antes
            if (word.attempts < 2) return true; // Precisa praticar mais
            const errorRate = word.wrong / word.attempts;
            return errorRate > 0.3; // Taxa de erro alta
        });

        // Retornar apenas os nomes das palavras que precisam praticar
        return needsPractice.map(w => w.word);
    }

    /**
     * Obtém palavras que já foram dominadas (não precisa praticar mais)
     */
    getWordsMastered(profileName, episodeId) {
        const episode = this.getEpisodeProgress(profileName, episodeId);
        
        if (!episode.words || Object.keys(episode.words).length === 0) {
            return [];
        }
        
        const wordsList = Object.values(episode.words);
        
        // Palavras dominadas:
        // - Pelo menos 2 tentativas
        // - Taxa de erro <= 30%
        const mastered = wordsList.filter(word => {
            if (word.attempts < 2) return false;
            const errorRate = word.wrong / word.attempts;
            return errorRate <= 0.3;
        });

        return mastered.map(w => w.word);
    }

    /**
     * Obtém frases que ainda não foram dominadas
     */
    getSentencesNeedingPractice(profileName, episodeId) {
        const episode = this.getEpisodeProgress(profileName, episodeId);
        
        if (!episode.sentences || Object.keys(episode.sentences).length === 0) {
            return [];
        }
        
        const sentencesList = Object.values(episode.sentences);
        
        const needsPractice = sentencesList.filter(sentence => {
            if (sentence.attempts === 0) return false;
            if (sentence.attempts < 2) return true;
            const errorRate = sentence.wrong / sentence.attempts;
            return errorRate > 0.3;
        });

        return needsPractice.map(s => s.word);
    }

    /**
     * Obtém palavras com mais erros para revisão
     */
    getWordsForReview(profileName, episodeId, limit = 10) {
        const episode = this.getEpisodeProgress(profileName, episodeId);
        return episode.getItemsForReview(limit);
    }

    /**
     * Obtém estatísticas globais de um perfil
     */
    getGlobalStats(profileName) {
        const profileStr = localStorage.getItem(profileName);
        const profile = profileStr
            ? new Profile(JSON.parse(profileStr))
            : this.createDefaultProfile(profileName);
        return profile.getGlobalStats();
    }

    /**
     * Reseta o progresso de um episódio
     */
    async resetEpisode(profileName, episodeId) {
        const profileStr = localStorage.getItem(profileName);
        const profile = profileStr
            ? new Profile(JSON.parse(profileStr))
            : this.createDefaultProfile(profileName);

        if (profile.resetEpisode(episodeId)) {
            await this.saveProfile(profileName, profile);
        }
    }

    /**
     * Reseta todo o perfil
     */
    async resetProfile(profileName) {
        await this.saveProfile(profileName, this.createDefaultProfile(profileName));
    }

    /**
     * Sincroniza dados do localStorage com Firebase (migração)
     */
    async syncLocalToFirebase(profileName) {
        await this.ready;

        const localData = localStorage.getItem(profileName);
        if (!localData) {
            console.log(`Nenhum dado local encontrado para ${profileName}`);
            return;
        }

        const localProfile = new Profile(JSON.parse(localData));
        const remoteProfile = await this.getProfile(profileName);
        const remoteEpisodes = Object.values(remoteProfile.episodes || {});
        const remoteHasProgress = (remoteProfile.totalCorrect || 0) > 0 ||
            (remoteProfile.totalWrong || 0) > 0 ||
            remoteEpisodes.some(episode =>
                (episode.totalQuestions || 0) > 0 ||
                Object.keys(episode.words || {}).length > 0 ||
                Object.keys(episode.sentences || {}).length > 0
            );

        if (remoteHasProgress) {
            localStorage.setItem(profileName, JSON.stringify(remoteProfile.toJSON()));
            console.log(`☁️ Perfil ${profileName} já tem progresso no Firebase; dados locais substituídos pelos dados sincronizados`);
            return;
        }

        if (!localProfile.totalWords && !(localProfile.totalCorrect || localProfile.totalWrong)) {
            return;
        }

        console.log(`📤 Sincronizando dados locais de ${profileName} para Firebase...`);
        
        await this.saveProfile(profileName, localProfile);
        console.log(`✅ Dados de ${profileName} sincronizados com sucesso!`);
    }

    /**
     * Carrega dados do Firebase para o localStorage (primeira vez em novo dispositivo)
     */
    async loadFromFirebase(profileName) {
        await this.ready;
        console.log(`📥 Carregando dados de ${profileName} do Firebase...`);
        
        const profile = await this.getProfile(profileName);
        localStorage.setItem(profileName, JSON.stringify(profile.toJSON()));
        
        console.log(`✅ Dados de ${profileName} carregados do Firebase!`);
        return profile;
    }

    /**
     * Exporta os dados do perfil para backup
     */
    exportProfile(profileName) {
        const profileStr = localStorage.getItem(profileName);
        const profile = profileStr
            ? new Profile(JSON.parse(profileStr))
            : this.createDefaultProfile(profileName);
        
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
    async importProfile(profileName, jsonData) {
        try {
            const profileData = new Profile(JSON.parse(jsonData));
            await this.saveProfile(profileName, profileData);
            return true;
        } catch (error) {
            console.error('Erro ao importar perfil:', error);
            return false;
        }
    }
}

// Instanciar o gerenciador de armazenamento com Firebase
const storage = new FirebaseStorageManager();

// Exportar para uso global
window.firebaseStorage = storage;
