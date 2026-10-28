export const CATEGORIES = [
    { key: 'adjetivos', label: 'Adjetivos', icon: '◈' },
    { key: 'substantivos', label: 'Substantivos', icon: '▧' },
    { key: 'verbos', label: 'Verbos', icon: '↗' },
    { key: 'expressoes', label: 'Expressões', icon: '“ ”' },
    { key: 'adverbios', label: 'Advérbios', icon: '◌' },
    { key: 'preposicoes', label: 'Preposições', icon: '↔' }
];

export const EPISODE_TITLES = [
    'Pilot',
    'The Big Bran Hypothesis',
    'The Fuzzy Boots Corollary',
    'The Luminous Fish Effect',
    'The Hamburger Postulate',
    'The Middle-Earth Paradigm',
    'The Dumpling Paradox'
];

export function createEmptyProfile(profileId) {
    return { version: 1, profileId, updatedAt: 0, episodes: {} };
}

export function getEpisodeId(episode, index) {
    return episode.episodio || `s01e${String(index + 1).padStart(2, '0')}`;
}

function parseExample(example) {
    const match = example?.match(/^(.*?)\s*\((.*)\)\s*$/);
    if (!match) return { english: example || '', portuguese: '' };
    return { english: match[1].trim(), portuguese: match[2].trim() };
}

function shuffle(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
}

function makeChoices(answer, pool) {
    const uniqueChoices = [...new Set(pool.filter((choice) => choice && choice !== answer))];
    return shuffle([answer, ...shuffle(uniqueChoices).slice(0, 3)]);
}

function createQuestions(episode, episodeId, selectedCategory) {
    const categories = CATEGORIES.filter((category) =>
        (selectedCategory === 'all' || selectedCategory === category.key) &&
        Array.isArray(episode[category.key]) &&
        episode[category.key].length
    );
    const vocabQuestions = [];
    const sentenceQuestions = [];

    for (const category of categories) {
        const entries = episode[category.key];
        const translations = entries.map((entry) => entry.traducao);
        const sentences = entries.map((entry) => parseExample(entry.exemplo_episodio));
        const sentencePool = sentences.map((sentence) => sentence.english).filter(Boolean);

        entries.forEach((entry, index) => {
            vocabQuestions.push({
                id: `${episodeId}:${category.key}:${index}:word`,
                kind: 'word',
                category: category.key,
                prompt: entry.palavra,
                example: parseExample(entry.exemplo_episodio).english,
                answer: entry.traducao,
                choices: makeChoices(entry.traducao, translations),
                item: entry.palavra,
                explanation: entry.traducao
            });
        });

        const sentenceIndices = sentences.reduce((indices, sentence, index) => {
            if (sentence.english && sentence.portuguese) indices.push(index);
            return indices;
        }, []);
        if (sentenceIndices.length) {
            const sentenceIndex = sentenceIndices[Math.floor(Math.random() * sentenceIndices.length)];
            const sentence = sentences[sentenceIndex];
            sentenceQuestions.push({
                id: `${episodeId}:${category.key}:${sentenceIndex}:sentence`,
                kind: 'sentence',
                category: category.key,
                prompt: sentence.portuguese,
                example: '',
                answer: sentence.english,
                choices: makeChoices(sentence.english, sentencePool),
                item: entries[sentenceIndex].palavra,
                explanation: sentence.english
            });
        }
    }

    return shuffle([...vocabQuestions, ...sentenceQuestions]);
}

export class PracticeSession {
    constructor(data) {
        this.data = data;
    }

    static create(episode, episodeId, category) {
        if (category !== 'all' && !CATEGORIES.some((item) => item.key === category)) {
            throw new Error('A categoria selecionada não é válida.');
        }
        const questions = createQuestions(episode, episodeId, 'all');
        if (questions.length === 0) {
            throw new Error('Não há exercícios disponíveis para esta categoria neste episódio.');
        }
        const session = new PracticeSession({
            id: `attempt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            episodeId,
            filterCategory: 'all',
            questions,
            answers: [],
            startedAt: Date.now(),
            updatedAt: Date.now()
        });
        if (category !== 'all') session.setFilter(episode, category);
        return session;
    }

    static restore(data) {
        return new PracticeSession(data);
    }

    setFilter(episode, category) {
        if (category !== 'all' && !CATEGORIES.some((item) => item.key === category)) {
            throw new Error('A categoria selecionada não é válida.');
        }
        const answeredQuestionIds = new Set(this.data.answers.map((answer) => answer.questionId));
        const questionKey = (question) => question.kind === 'sentence'
            ? `${question.category}:sentence`
            : question.id;
        const completeQuestions = [];
        const seenQuestionKeys = new Set();
        for (const question of [...this.data.questions, ...createQuestions(episode, this.data.episodeId, 'all')]) {
            const key = questionKey(question);
            if (seenQuestionKeys.has(key)) continue;
            seenQuestionKeys.add(key);
            completeQuestions.push(question);
        }

        const questionsById = new Map(completeQuestions.map((question) => [question.id, question]));
        const answeredQuestions = this.data.answers.map((answer) => questionsById.get(answer.questionId));
        if (answeredQuestions.some((question) => !question)) {
            throw new Error('Não foi possível preservar as respostas desta tentativa.');
        }

        if (!completeQuestions.length) {
            throw new Error('Não há exercícios disponíveis para esta categoria neste episódio.');
        }

        const remainingQuestions = completeQuestions.filter((question) => !answeredQuestionIds.has(question.id));
        if (category !== 'all') {
            remainingQuestions.sort((left, right) =>
                Number(right.category === category) - Number(left.category === category)
            );
        }
        const questions = [...answeredQuestions, ...remainingQuestions];
        const changed = this.data.filterCategory !== category ||
            questions.some((question, index) => question.id !== this.data.questions[index]?.id) ||
            questions.length !== this.data.questions.length;
        this.data.questions = questions;
        this.data.filterCategory = category;
        if (changed) this.data.updatedAt = Date.now();
        return changed;
    }

    get currentQuestion() {
        return this.data.questions[this.data.answers.length] || null;
    }

    get isComplete() {
        return this.data.answers.length >= this.data.questions.length;
    }

    answer(choice) {
        const question = this.currentQuestion;
        if (!question) throw new Error('Esta tentativa já foi concluída.');
        const correct = choice === question.answer;
        this.data.answers.push({
            questionId: question.id,
            category: question.category,
            kind: question.kind,
            item: question.item,
            choice,
            answer: question.answer,
            correct,
            answeredAt: Date.now()
        });
        this.data.updatedAt = Date.now();
        return { question, correct };
    }

    get summary() {
        const answers = this.data.answers;
        const correct = answers.filter((answer) => answer.correct).length;
        const byCategory = {};
        let streak = 0;
        let bestStreak = 0;

        for (const answer of answers) {
            if (!byCategory[answer.category]) byCategory[answer.category] = { correct: 0, wrong: 0 };
            byCategory[answer.category][answer.correct ? 'correct' : 'wrong'] += 1;
            streak = answer.correct ? streak + 1 : 0;
            bestStreak = Math.max(bestStreak, streak);
        }

        return {
            correct,
            wrong: answers.length - correct,
            total: answers.length,
            accuracy: answers.length ? Math.round((correct / answers.length) * 100) : 0,
            points: correct * 10,
            bestStreak,
            byCategory
        };
    }

    toJSON() {
        return this.data;
    }
}

export function mergeProfiles(local, remote, profileId) {
    const merged = createEmptyProfile(profileId);
    const episodeIds = new Set([
        ...Object.keys(local?.episodes || {}),
        ...Object.keys(remote?.episodes || {})
    ]);

    for (const episodeId of episodeIds) {
        const localEpisode = local?.episodes?.[episodeId];
        const remoteEpisode = remote?.episodes?.[episodeId];
        const mergedEpisode = {
            updatedAt: Math.max(localEpisode?.updatedAt || 0, remoteEpisode?.updatedAt || 0),
            attempts: [],
            mistakes: {}
        };

        const attempts = new Map();
        for (const attempt of [...(localEpisode?.attempts || []), ...(remoteEpisode?.attempts || [])]) {
            const existing = attempts.get(attempt.id);
            if (!existing || (attempt.updatedAt || 0) > (existing.updatedAt || 0)) attempts.set(attempt.id, attempt);
        }
        mergedEpisode.attempts = [...attempts.values()];

        const activeAttempts = [localEpisode?.activeAttempt, remoteEpisode?.activeAttempt].filter(Boolean);
        mergedEpisode.activeAttempt = activeAttempts.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0] || null;

        for (const source of [localEpisode?.mistakes || {}, remoteEpisode?.mistakes || {}]) {
            for (const [wordId, mistake] of Object.entries(source)) {
                if (!mergedEpisode.mistakes[wordId] || mistake.count > mergedEpisode.mistakes[wordId].count) {
                    mergedEpisode.mistakes[wordId] = mistake;
                }
            }
        }

        merged.episodes[episodeId] = mergedEpisode;
    }

    merged.updatedAt = Math.max(local?.updatedAt || 0, remote?.updatedAt || 0);
    return merged;
}

export function getEpisodeSummary(profile, episodeId) {
    const state = profile?.episodes?.[episodeId];
    const attempts = (state?.attempts || []).filter(isFullEpisodeAttempt);
    const bestAttempt = [...attempts].sort((a, b) =>
        (b.accuracy || 0) - (a.accuracy || 0) ||
        (b.points || 0) - (a.points || 0) ||
        (b.completedAt || 0) - (a.completedAt || 0)
    )[0];
    const latestAttempt = [...attempts].sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))[0];
    const active = state?.activeAttempt;
    const completedProgress = bestAttempt?.total ? Math.round((bestAttempt.answered / bestAttempt.total) * 100) : 0;
    const activeProgress = active?.questions?.length ? Math.round((active.answers.length / active.questions.length) * 100) : 0;

    return {
        attempts,
        bestAttempt,
        latestAttempt,
        active,
        progress: active ? activeProgress : completedProgress,
        practiced: attempts.length > 0 || Boolean(active)
    };
}

export function getProfileSummary(profile) {
    const attempts = Object.values(profile?.episodes || {}).flatMap((episode) =>
        (episode.attempts || []).filter(isFullEpisodeAttempt)
    );
    const points = attempts.reduce((total, attempt) => total + (attempt.points || 0), 0);
    const accuracy = attempts.length
        ? Math.max(...attempts.map((attempt) => attempt.accuracy || 0))
        : null;
    const activeAttempt = Object.values(profile?.episodes || {})
        .map((episode) => episode.activeAttempt)
        .filter(Boolean)
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))[0] || null;
    return { attempts: attempts.length, points, accuracy, activeAttempt };
}

function isFullEpisodeAttempt(attempt) {
    if (attempt.scope === 'episode') return true;
    return attempt.scope == null && (attempt.filterCategory || attempt.category || 'all') === 'all';
}
