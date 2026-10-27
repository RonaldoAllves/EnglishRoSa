/**
 * Sistema de Armazenamento com Firebase
 * Gerencia o progresso dos usuários usando Firebase Realtime Database
 */

class FirebaseStorageManager {
    constructor() {
        this.database = window.firebaseDatabase;
        this.isOnline = false;
        this.syncQueue = []; // Fila para operações offline
        
        // Verificar se Firebase foi inicializado
        if (!this.database) {
            console.error('❌ Firebase não inicializado!');
            this.isOnline = false;
        } else {
            console.log('✅ Firebase Storage inicializado');
        }

        this.initializeProfiles();
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
            if (this.isOnline && this.syncQueue.length > 0) {
                this.processSyncQueue();
            }
        });
    }

    /**
     * Processa operações pendentes quando voltar online
     */
    async processSyncQueue() {
        console.log(`📤 Sincronizando ${this.syncQueue.length} operações pendentes...`);
        
        while (this.syncQueue.length > 0) {
            const operation = this.syncQueue.shift();
            try {
                await operation();
            } catch (error) {
                console.error('Erro ao sincronizar:', error);
            }
        }
        
        console.log('✅ Sincronização completa!');
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
                return snapshot.val();
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
        // Sempre salvar no localStorage como backup
        localStorage.setItem(profileName, JSON.stringify(profileData));

        if (!this.database) {
            throw new Error('Firebase não está disponível');
        }

        try {
            const profileRef = firebase.database().ref(`profiles/${profileName}`);
            await profileRef.set(profileData);
            console.log(`💾 Perfil ${profileName} salvo no Firebase`);
        } catch (error) {
            console.error('Erro ao salvar perfil no Firebase:', error);
            // Ainda adiciona à fila para tentar depois
            this.syncQueue.push(() => this.saveProfile(profileName, profileData));
            throw error;
        }
    }

    /**
     * Obtém o progresso de um episódio específico
     */
    getEpisodeProgress(profileName, episodeId) {
        // Nota: Esta função precisa ser síncrona para compatibilidade
        // Vamos usar cache local e sincronizar em background
        const profileData = JSON.parse(localStorage.getItem(profileName) || '{}');
        
        if (!profileData.episodes) {
            profileData.episodes = {};
        }

        if (!profileData.episodes[episodeId]) {
            profileData.episodes[episodeId] = {
                episodeId: episodeId,
                completed: false,
                totalQuestions: 0,
                correctAnswers: 0,
                wrongAnswers: 0,
                points: 0,
                bestStreak: 0,
                attempts: 0,
                attemptHistory: [],
                categories: {
                    adjetivos: { correct: 0, wrong: 0, total: 0 },
                    substantivos: { correct: 0, wrong: 0, total: 0 },
                    verbos: { correct: 0, wrong: 0, total: 0 },
                    expressoes: { correct: 0, wrong: 0, total: 0 }
                },
                words: {},
                sentences: {},
                lastPlayed: null,
                canReview: false
            };
            localStorage.setItem(profileName, JSON.stringify(profileData));
        }

        return profileData.episodes[episodeId];
    }

    /**
     * Salva o progresso de uma questão (palavra ou frase)
     */
    saveQuestionProgress(profileName, episodeId, questionData) {
        // Obter profile do cache local
        const profileStr = localStorage.getItem(profileName);
        const profile = profileStr ? JSON.parse(profileStr) : this.createDefaultProfile(profileName);
        
        if (!profile.episodes) {
            profile.episodes = {};
        }

        const episode = profile.episodes[episodeId] || this.getEpisodeProgress(profileName, episodeId);

        const { word, category, correct, points, isSentence } = questionData;

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

        // Escolher o armazenamento correto (palavra ou frase)
        const storage = isSentence ? episode.sentences : episode.words;
        
        if (!storage[word]) {
            storage[word] = {
                word: word,
                category: category,
                attempts: 0,
                correct: 0,
                wrong: 0,
                lastAttempt: null,
                isSentence: isSentence || false
            };
        }
        
        const itemData = storage[word];
        itemData.attempts++;
        if (correct) {
            itemData.correct++;
        } else {
            itemData.wrong++;
        }
        itemData.lastAttempt = new Date().toISOString();

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
        const profileStr = localStorage.getItem(profileName);
        const profile = profileStr ? JSON.parse(profileStr) : this.createDefaultProfile(profileName);
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
            episode.canReview = true;
        }

        // Salvar no histórico de tentativas (mantém as 5 melhores)
        const attemptData = {
            date: new Date().toISOString(),
            accuracy: accuracy,
            points: result.points,
            correct: result.correct,
            wrong: result.wrong,
            total: result.total,
            bestStreak: result.bestStreak,
            categoryStats: result.categoryStats
        };

        if (!episode.attemptHistory) {
            episode.attemptHistory = [];
        }

        episode.attemptHistory.push(attemptData);
        episode.attemptHistory.sort((a, b) => b.points - a.points);
        episode.attemptHistory = episode.attemptHistory.slice(0, 5);

        profile.episodes[episodeId] = episode;
        this.saveProfile(profileName, profile);

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
        const wordsList = Object.values(episode.words);
        
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
        const profileStr = localStorage.getItem(profileName);
        const profile = profileStr ? JSON.parse(profileStr) : this.createDefaultProfile(profileName);
        
        const totalAttempts = profile.totalCorrect + profile.totalWrong;
        const accuracy = totalAttempts > 0 ? (profile.totalCorrect / totalAttempts * 100).toFixed(1) : 0;
        
        const completedEpisodes = profile.episodes ? 
            Object.values(profile.episodes).filter(ep => ep.completed).length : 0;
        
        return {
            totalPoints: profile.totalPoints || 0,
            totalWords: profile.totalWords || 0,
            totalCorrect: profile.totalCorrect || 0,
            totalWrong: profile.totalWrong || 0,
            accuracy: accuracy,
            completedEpisodes: completedEpisodes,
            totalEpisodes: profile.episodes ? Object.keys(profile.episodes).length : 0
        };
    }

    /**
     * Reseta o progresso de um episódio
     */
    resetEpisode(profileName, episodeId) {
        const profileStr = localStorage.getItem(profileName);
        const profile = profileStr ? JSON.parse(profileStr) : this.createDefaultProfile(profileName);
        
        if (profile.episodes && profile.episodes[episodeId]) {
            delete profile.episodes[episodeId];
            this.saveProfile(profileName, profile);
        }
    }

    /**
     * Reseta todo o perfil
     */
    resetProfile(profileName) {
        const newProfile = this.createDefaultProfile(profileName);
        this.saveProfile(profileName, newProfile);
    }

    /**
     * Sincroniza dados do localStorage com Firebase (migração)
     */
    async syncLocalToFirebase(profileName) {
        const localData = localStorage.getItem(profileName);
        if (!localData) {
            console.log(`Nenhum dado local encontrado para ${profileName}`);
            return;
        }

        const profile = JSON.parse(localData);
        console.log(`📤 Sincronizando dados locais de ${profileName} para Firebase...`);
        
        await this.saveProfile(profileName, profile);
        console.log(`✅ Dados de ${profileName} sincronizados com sucesso!`);
    }

    /**
     * Carrega dados do Firebase para o localStorage (primeira vez em novo dispositivo)
     */
    async loadFromFirebase(profileName) {
        console.log(`📥 Carregando dados de ${profileName} do Firebase...`);
        
        const profile = await this.getProfile(profileName);
        localStorage.setItem(profileName, JSON.stringify(profile));
        
        console.log(`✅ Dados de ${profileName} carregados do Firebase!`);
        return profile;
    }

    /**
     * Exporta os dados do perfil para backup
     */
    exportProfile(profileName) {
        const profileStr = localStorage.getItem(profileName);
        const profile = profileStr ? JSON.parse(profileStr) : this.createDefaultProfile(profileName);
        
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

// Instanciar o gerenciador de armazenamento com Firebase
const storage = new FirebaseStorageManager();

// Exportar para uso global
window.firebaseStorage = storage;
