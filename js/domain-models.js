/**
 * Domain models for profiles, episode progress, exercises, and game sessions.
 * Models serialize to the existing JSON shape for backwards compatibility.
 */
(function() {
    const categories = ['adjetivos', 'substantivos', 'verbos', 'expressoes'];

    function createCategoryStats(source = {}, preserveTotal = false) {
        return Object.fromEntries(categories.map(category => {
            const stats = source[category] || {};
            const categoryStats = {
                correct: Number(stats.correct) || 0,
                wrong: Number(stats.wrong) || 0
            };
            if (preserveTotal || Object.prototype.hasOwnProperty.call(stats, 'total')) {
                categoryStats.total = Number(stats.total) || 0;
            }
            return [category, categoryStats];
        }));
    }

    function getAdditionalFields(data, knownFields) {
        return Object.fromEntries(Object.entries(data).filter(([key]) => !knownFields.includes(key)));
    }

    class ExerciseProgress {
        constructor(data = {}) {
            this.additionalFields = getAdditionalFields(data, [
                'word', 'category', 'attempts', 'correct', 'wrong',
                'lastAttempt', 'lastCorrect', 'isSentence'
            ]);
            this.word = data.word || '';
            this.category = data.category || '';
            this.attempts = Number(data.attempts) || 0;
            this.correct = Number(data.correct) || 0;
            this.wrong = Number(data.wrong) || 0;
            this.lastAttempt = data.lastAttempt || null;
            this.lastCorrect = typeof data.lastCorrect === 'boolean' ? data.lastCorrect : null;
            this.isSentence = Boolean(data.isSentence);
        }

        get isCompleted() {
            return this.lastCorrect === true || (this.lastCorrect === null && this.correct > 0);
        }

        needsPractice() {
            return this.attempts === 0 || !this.isCompleted;
        }

        record(correct, attemptedAt = new Date().toISOString()) {
            this.attempts++;
            if (correct) {
                this.correct++;
            } else {
                this.wrong++;
            }
            this.lastAttempt = attemptedAt;
            this.lastCorrect = Boolean(correct);
        }

        toJSON() {
            return {
                ...this.additionalFields,
                word: this.word,
                category: this.category,
                attempts: this.attempts,
                correct: this.correct,
                wrong: this.wrong,
                lastAttempt: this.lastAttempt,
                lastCorrect: this.lastCorrect,
                isSentence: this.isSentence
            };
        }
    }

    class ExerciseAttempt {
        constructor(data = {}) {
            this.additionalFields = getAdditionalFields(data, [
                'id', 'status', 'startedAt', 'completedAt', 'date',
                'accuracy', 'points', 'correct', 'wrong', 'total',
                'bestStreak', 'categoryStats'
            ]);
            this.id = data.id || null;
            this.status = data.status || 'completed';
            this.startedAt = data.startedAt || data.date || new Date().toISOString();
            this.completedAt = data.completedAt || data.date || null;
            this.date = data.date || this.startedAt;
            this.accuracy = Number(data.accuracy) || 0;
            this.points = Number(data.points) || 0;
            this.correct = Number(data.correct) || 0;
            this.wrong = Number(data.wrong) || 0;
            this.total = Number(data.total) || 0;
            this.bestStreak = Number(data.bestStreak) || 0;
            this.categoryStats = createCategoryStats(data.categoryStats);
        }

        static fromResult(result) {
            return new ExerciseAttempt({
                ...result,
                status: 'completed',
                date: new Date().toISOString(),
                accuracy: result.total > 0 ? (result.correct / result.total) * 100 : 0
            });
        }

        static start() {
            const startedAt = new Date().toISOString();
            return new ExerciseAttempt({
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                status: 'in_progress',
                startedAt,
                date: startedAt
            });
        }

        recordAnswer({ category, correct, points, bestStreak = 0 }) {
            this.total++;
            if (correct) {
                this.correct++;
            } else {
                this.wrong++;
            }
            this.points += Number(points) || 0;
            this.bestStreak = Math.max(this.bestStreak, Number(bestStreak) || 0);

            if (!this.categoryStats[category]) {
                this.categoryStats[category] = { correct: 0, wrong: 0 };
            }
            if (correct) {
                this.categoryStats[category].correct++;
            } else {
                this.categoryStats[category].wrong++;
            }
            this.accuracy = this.total > 0 ? (this.correct / this.total) * 100 : 0;
        }

        complete(result) {
            this.status = 'completed';
            this.completedAt = new Date().toISOString();
            this.date = this.completedAt;
            this.bestStreak = Math.max(this.bestStreak, Number(result.bestStreak) || 0);
            this.accuracy = this.total > 0 ? (this.correct / this.total) * 100 : 0;
        }

        toJSON() {
            return {
                ...this.additionalFields,
                id: this.id,
                status: this.status,
                startedAt: this.startedAt,
                completedAt: this.completedAt,
                date: this.date,
                accuracy: this.accuracy,
                points: this.points,
                correct: this.correct,
                wrong: this.wrong,
                total: this.total,
                bestStreak: this.bestStreak,
                categoryStats: this.categoryStats
            };
        }
    }

    class EpisodeProgress {
        constructor(data = {}, episodeId = data.episodeId || '') {
            this.additionalFields = getAdditionalFields(data, [
                'episodeId', 'completed', 'totalQuestions', 'correctAnswers',
                'wrongAnswers', 'points', 'bestStreak', 'attempts',
                'attemptHistory', 'activeAttempt', 'categories', 'words', 'sentences',
                'lastPlayed', 'canReview'
            ]);
            this.episodeId = episodeId;
            this.completed = Boolean(data.completed);
            this.totalQuestions = Number(data.totalQuestions) || 0;
            this.correctAnswers = Number(data.correctAnswers) || 0;
            this.wrongAnswers = Number(data.wrongAnswers) || 0;
            this.points = Number(data.points) || 0;
            this.bestStreak = Number(data.bestStreak) || 0;
            this.attempts = Number(data.attempts) || 0;
            this.attemptHistory = (data.attemptHistory || []).map(attempt =>
                new ExerciseAttempt(attempt)
            );
            this.activeAttempt = data.activeAttempt
                ? new ExerciseAttempt(data.activeAttempt)
                : null;
            this.categories = createCategoryStats(data.categories, true);
            this.words = this.hydrateExerciseProgress(data.words);
            this.sentences = this.hydrateExerciseProgress(data.sentences);
            this.lastPlayed = data.lastPlayed || null;
            this.canReview = Boolean(data.canReview);
        }

        hydrateExerciseProgress(source = {}) {
            return Object.fromEntries(Object.entries(source).map(([key, data]) =>
                [key, new ExerciseProgress(data)]
            ));
        }

        getExerciseProgress(key, isSentence = false) {
            const progressMap = isSentence ? this.sentences : this.words;
            return progressMap[key] || null;
        }

        getItemsForReview(limit = 10, isSentence = false) {
            const progressMap = isSentence ? this.sentences : this.words;
            return Object.values(progressMap)
                .sort((left, right) => {
                    const leftErrorRate = left.attempts > 0 ? left.wrong / left.attempts : 0;
                    const rightErrorRate = right.attempts > 0 ? right.wrong / right.attempts : 0;
                    return rightErrorRate - leftErrorRate;
                })
                .slice(0, limit);
        }

        startAttempt(forceNew = false) {
            if (forceNew || !this.activeAttempt || this.activeAttempt.status !== 'in_progress') {
                this.activeAttempt = ExerciseAttempt.start();
            }
            return this.activeAttempt;
        }

        recordAnswer(questionData) {
            const { word, category, correct, points, isSentence } = questionData;
            const attemptedAt = new Date().toISOString();
            const progressMap = isSentence ? this.sentences : this.words;

            if (!progressMap[word]) {
                progressMap[word] = new ExerciseProgress({
                    word,
                    category,
                    isSentence
                });
            }
            progressMap[word].record(correct, attemptedAt);

            this.totalQuestions++;
            this.categories[category].total++;
            if (correct) {
                this.correctAnswers++;
                this.categories[category].correct++;
            } else {
                this.wrongAnswers++;
                this.categories[category].wrong++;
            }
            this.points += Number(points) || 0;
            this.lastPlayed = attemptedAt;

            if (questionData.attemptId &&
                this.activeAttempt?.id === questionData.attemptId &&
                this.activeAttempt.status === 'in_progress') {
                this.activeAttempt.recordAnswer(questionData);
            }
        }

        addAttempt(result, attemptId = null) {
            const attempt = this.activeAttempt?.id === attemptId
                ? this.activeAttempt
                : ExerciseAttempt.fromResult(result);
            attempt.complete(result);
            this.attempts++;
            this.bestStreak = Math.max(this.bestStreak, attempt.bestStreak);
            if (attempt.accuracy >= 70) {
                this.completed = true;
                this.canReview = true;
            }

            this.attemptHistory.push(attempt);
            this.attemptHistory.sort((left, right) => right.points - left.points);
            this.attemptHistory = this.attemptHistory.slice(0, 5);
            if (this.activeAttempt?.id === attempt.id) {
                this.activeAttempt = null;
            }
            return attempt;
        }

        toJSON() {
            return {
                ...this.additionalFields,
                episodeId: this.episodeId,
                completed: this.completed,
                totalQuestions: this.totalQuestions,
                correctAnswers: this.correctAnswers,
                wrongAnswers: this.wrongAnswers,
                points: this.points,
                bestStreak: this.bestStreak,
                attempts: this.attempts,
                attemptHistory: this.attemptHistory.map(attempt => attempt.toJSON()),
                activeAttempt: this.activeAttempt ? this.activeAttempt.toJSON() : null,
                categories: this.categories,
                words: Object.fromEntries(Object.entries(this.words).map(([key, progress]) =>
                    [key, progress.toJSON()]
                )),
                sentences: Object.fromEntries(Object.entries(this.sentences).map(([key, progress]) =>
                    [key, progress.toJSON()]
                )),
                lastPlayed: this.lastPlayed,
                canReview: this.canReview
            };
        }
    }

    class Profile {
        constructor(data = {}) {
            this.additionalFields = getAdditionalFields(data, [
                'name', 'totalPoints', 'totalWords', 'totalCorrect',
                'totalWrong', 'episodes', 'lastPlayed', 'createdAt'
            ]);
            this.name = data.name || '';
            this.totalPoints = Number(data.totalPoints) || 0;
            this.totalWords = Number(data.totalWords) || 0;
            this.totalCorrect = Number(data.totalCorrect) || 0;
            this.totalWrong = Number(data.totalWrong) || 0;
            this.episodes = Object.fromEntries(Object.entries(data.episodes || {}).map(([id, episode]) =>
                [id, episode instanceof EpisodeProgress ? episode : new EpisodeProgress(episode, id)]
            ));
            this.lastPlayed = data.lastPlayed || null;
            this.createdAt = data.createdAt || new Date().toISOString();
        }

        static create(name) {
            return new Profile({ name });
        }

        getEpisodeProgress(episodeId) {
            if (!this.episodes[episodeId]) {
                this.episodes[episodeId] = new EpisodeProgress({}, episodeId);
            }
            return this.episodes[episodeId];
        }

        startAttempt(episodeId, forceNew = false) {
            return this.getEpisodeProgress(episodeId).startAttempt(forceNew);
        }

        recordAnswer(episodeId, questionData) {
            this.getEpisodeProgress(episodeId).recordAnswer(questionData);
            if (!questionData.isSentence) {
                this.totalWords++;
            }
            if (questionData.correct) {
                this.totalCorrect++;
            } else {
                this.totalWrong++;
            }
            this.totalPoints += Number(questionData.points) || 0;
            this.lastPlayed = new Date().toISOString();
        }

        addAttempt(episodeId, result, attemptId = null) {
            return this.getEpisodeProgress(episodeId).addAttempt(result, attemptId);
        }

        resetEpisode(episodeId) {
            const episode = this.episodes[episodeId];
            if (!episode) {
                return false;
            }

            const wordAttempts = Object.values(episode.words).reduce(
                (total, progress) => total + progress.attempts,
                0
            );
            this.totalWords = Math.max(0, this.totalWords - wordAttempts);
            this.totalCorrect = Math.max(0, this.totalCorrect - episode.correctAnswers);
            this.totalWrong = Math.max(0, this.totalWrong - episode.wrongAnswers);
            this.totalPoints = Math.max(0, this.totalPoints - episode.points);
            delete this.episodes[episodeId];
            return true;
        }

        getGlobalStats() {
            const totalAnswers = this.totalCorrect + this.totalWrong;
            return {
                totalPoints: this.totalPoints,
                totalWords: this.totalWords,
                totalCorrect: this.totalCorrect,
                totalWrong: this.totalWrong,
                accuracy: totalAnswers > 0
                    ? (this.totalCorrect / totalAnswers * 100).toFixed(1)
                    : 0,
                completedEpisodes: Object.values(this.episodes).filter(episode => episode.completed).length,
                totalEpisodes: Object.keys(this.episodes).length
            };
        }

        toJSON() {
            return {
                ...this.additionalFields,
                name: this.name,
                totalPoints: this.totalPoints,
                totalWords: this.totalWords,
                totalCorrect: this.totalCorrect,
                totalWrong: this.totalWrong,
                episodes: Object.fromEntries(Object.entries(this.episodes).map(([id, episode]) =>
                    [id, episode.toJSON()]
                )),
                lastPlayed: this.lastPlayed,
                createdAt: this.createdAt
            };
        }
    }

    class Exercise {
        constructor({ word, translation, category }) {
            this.word = word;
            this.translation = translation;
            this.category = category;
        }
    }

    class WordExercise extends Exercise {
        constructor({ word, translation, category, exampleDiff, exampleEpisode, exampleAdditional }) {
            super({ word, translation, category });
            this.exampleDiff = exampleDiff;
            this.exampleEpisode = exampleEpisode;
            this.exampleAdditional = exampleAdditional;
            this.isSentence = false;
        }

        static fromContent(item, category) {
            return new WordExercise({
                word: item.palavra,
                translation: item.traducao,
                category,
                exampleDiff: item.exemplo_diferente,
                exampleEpisode: item.exemplo_episodio,
                exampleAdditional: item.exemplo_adicional
            });
        }
    }

    class SentenceExercise extends Exercise {
        constructor({ word, translation, category, sourceSentence }) {
            super({ word, translation, category });
            this.sourceSentence = sourceSentence;
            const match = sourceSentence.match(/^(.*?)\s*\((.*?)\)\s*$/);
            this.sentence = match ? match[1].trim() : sourceSentence.trim();
            this.translation = match ? match[2].trim() : translation;
            this.isSentence = true;
        }

        static fromContent(item, category, sourceSentence) {
            return new SentenceExercise({
                word: item.palavra,
                translation: item.traducao,
                category,
                sourceSentence
            });
        }

        static progressKey(word, sentence) {
            const match = sentence.match(/^(.*?)\s*\((.*?)\)\s*$/);
            const englishSentence = match ? match[1].trim() : sentence.trim();
            const rawKey = `${word}_${englishSentence}`;
            const encodedKey = Array.from(rawKey, character =>
                character.codePointAt(0).toString(16).padStart(6, '0')
            ).join('');
            return `sentence_${encodedKey}`;
        }
    }

    class ExerciseQuestion {
        constructor({ word, sentence = null, correctTranslation, category, options, isSentence, examples = {} }) {
            this.word = word;
            this.sentence = sentence;
            this.correctTranslation = correctTranslation;
            this.category = category;
            this.options = options;
            this.isSentence = Boolean(isSentence);
            this.exampleDiff = examples.exampleDiff;
            this.exampleEpisode = examples.exampleEpisode;
            this.exampleAdditional = examples.exampleAdditional;
        }
    }

    class ReviewSession {
        constructor(episodeId, exercises = []) {
            this.episodeId = episodeId;
            this.exercises = exercises;
            this.startedAt = new Date().toISOString();
        }
    }

    window.DomainModels = Object.freeze({
        categories,
        ExerciseProgress,
        ExerciseAttempt,
        EpisodeProgress,
        Profile,
        Exercise,
        WordExercise,
        SentenceExercise,
        ExerciseQuestion,
        ReviewSession
    });
})();
