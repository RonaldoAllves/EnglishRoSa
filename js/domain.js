export const CATEGORIES = Object.freeze([
    { key: 'adjetivos', label: 'Adjetivos' },
    { key: 'substantivos', label: 'Substantivos' },
    { key: 'verbos', label: 'Verbos' },
    { key: 'expressoes', label: 'Expressões' },
    { key: 'adverbios', label: 'Advérbios' },
    { key: 'preposicoes', label: 'Preposições' }
]);

export const PROFILES = Object.freeze([
    { id: 'ronaldo', name: 'Ronaldo' },
    { id: 'sarah', name: 'Sarah' }
]);

export function parseExample(example = '') {
    const text = String(example || '').trim();
    const match = text.match(/^(.*?)\s*\((.*)\)\s*$/);
    if (!match) return { english: text, portuguese: '' };
    return { english: match[1].trim(), portuguese: match[2].trim() };
}

export function shuffle(items, random = Math.random) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(random() * (index + 1));
        [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
}

function makeChoices(answer, pool, random) {
    const alternatives = [...new Set(pool.filter((value) => value && value !== answer))];
    return shuffle([answer, ...shuffle(alternatives, random).slice(0, 3)], random);
}

function makeExerciseChoices(answer, authoredAlternatives, fallbackPool, random) {
    const alternatives = [...new Set(
        authoredAlternatives.filter((value) => value && value !== answer)
    )];
    if (alternatives.length < 3) {
        const fallbackAlternatives = shuffle(
            [...new Set(fallbackPool.filter((value) => value && value !== answer &&
                !alternatives.includes(value)))],
            random
        );
        alternatives.push(...fallbackAlternatives.slice(0, 3 - alternatives.length));
    }
    return shuffle([answer, ...alternatives.slice(0, 3)], random);
}

function mistakeKey(category, itemId) {
    return `${category}:${itemId}`;
}

function questionKey(question) {
    if (question.exerciseId) return question.id;
    return question.kind === 'sentence'
        ? `sentence:${question.category}:${question.itemId || question.id}`
        : question.id;
}

export function getExerciseTranslation(exercise) {
    const correctId = String(exercise?.resposta_correta || '').trim();
    const correctAlternative = exercise?.alternativas?.find((alternative) =>
        String(alternative.id || '').trim() === correctId
    );
    return String(exercise?.traducao_correta || '').trim() ||
        String(correctAlternative?.texto || '').trim();
}

export function createQuestionBank(episode, random = Math.random) {
    const questions = [];
    const episodeId = episode.episodio;

    for (const category of CATEGORIES) {
        const entries = Array.isArray(episode[category.key]) ? episode[category.key] : [];
        const usableEntries = entries
            .map((entry, index) => ({
                entry,
                index,
                translation: String(entry.traducao || '').trim(),
                example: parseExample(entry.exemplo_episodio),
                exercises: Array.isArray(entry.exercicios) ? entry.exercicios : []
            }))
            .filter(({ translation, example, exercises }) =>
                translation && (example.english || exercises.length)
            );
        const translations = usableEntries.map(({ translation }) => translation);
        const exerciseTranslations = usableEntries.flatMap(({ exercises }) =>
            exercises.map(getExerciseTranslation).filter(Boolean)
        );
        const exerciseAlternatives = usableEntries.flatMap(({ exercises }) =>
            exercises.flatMap((exercise) => (Array.isArray(exercise.alternativas)
                ? exercise.alternativas
                : []).map((alternative) => String(alternative.texto || '').trim()))
                .filter(Boolean)
        );

        usableEntries.forEach(({ entry, index, translation, example, exercises }) => {
            const word = String(entry.palavra || '').trim();
            const prompt = word || example.english ||
                String(exercises[0]?.foco || exercises[0]?.frase || '').trim();
            const itemId = `${category.key}:${index}`;
            questions.push({
                id: `${episodeId}:${category.key}:${index}:word`,
                kind: 'word',
                category: category.key,
                itemId,
                item: prompt,
                prompt,
                example: word
                    ? example.english || String(exercises.find((exercise) =>
                        exercise.eh_exemplo_episodio
                    )?.frase || exercises[0]?.frase || '')
                    : '',
                answer: translation,
                choices: makeChoices(translation, translations, random),
                explanation: translation
            });

            if (exercises.length) {
                exercises.forEach((exercise, exerciseIndex) => {
                    const sentence = String(exercise.frase || '').trim();
                    const sentenceAnswer = getExerciseTranslation(exercise);
                    if (!sentence || !sentenceAnswer) {
                        throw new Error(
                            `Exercício ${exercise.id || exerciseIndex + 1} sem frase ou tradução correta em ${episodeId}/${category.key}/${word}.`
                        );
                    }

                    const authoredAlternatives = (Array.isArray(exercise.alternativas)
                        ? exercise.alternativas
                        : []).map((alternative) => String(alternative.texto || '').trim());
                    const relatedTranslations = exercises
                        .map(getExerciseTranslation)
                        .filter((value) => value && value !== sentenceAnswer);
                    questions.push({
                        id: `${episodeId}:${category.key}:${index}:exercise:${exercise.id || exerciseIndex}`,
                        exerciseId: String(exercise.id || exerciseIndex),
                        kind: 'sentence',
                        category: category.key,
                        itemId,
                        item: sentence,
                        prompt: sentence,
                        example: '',
                        isEpisodeExample: Boolean(exercise.eh_exemplo_episodio),
                        exampleLabel: exercise.eh_exemplo_episodio
                            ? 'Frase do episódio'
                            : exercise.origem_exemplo === 'adicional'
                                ? 'Exemplo adicional'
                                : exercise.origem_exemplo === 'diferente'
                                    ? 'Outro exemplo'
                                    : 'Frase de exemplo',
                        answer: sentenceAnswer,
                        choices: makeExerciseChoices(sentenceAnswer, authoredAlternatives, [
                            ...relatedTranslations,
                            ...exerciseAlternatives,
                            ...exerciseTranslations,
                            ...translations
                        ], random),
                        explanation: sentenceAnswer
                    });
                });
            } else {
                const sentenceDistractors = [
                    entry.exemplo_diferente,
                    entry.exemplo_adicional
                ].map((text) => parseExample(text).portuguese);
                const sentenceAnswer = example.portuguese || translation;
                questions.push({
                    id: `${episodeId}:${category.key}:${index}:sentence`,
                    kind: 'sentence',
                    category: category.key,
                    itemId,
                    item: example.english,
                    prompt: example.english,
                    example: '',
                    answer: sentenceAnswer,
                    choices: makeChoices(sentenceAnswer, sentenceDistractors, random),
                    explanation: sentenceAnswer
                });
            }
        });
    }

    return questions;
}

export class PracticeAttempt {
    constructor(data) {
        if (!data || !Array.isArray(data.questions) || !Array.isArray(data.answers)) {
            throw new Error('Os dados da tentativa estão incompletos.');
        }
        this.data = {
            ...data,
            questions: data.questions.map((question) => ({ ...question, choices: [...question.choices] })),
            answers: data.answers.map((answer) => ({ ...answer })),
            skippedQuestionIds: Array.isArray(data.skippedQuestionIds)
                ? [...data.skippedQuestionIds]
                : []
        };
    }

    static create(episode, focusCategory = 'all', random = Math.random, now = Date.now()) {
        const bank = createQuestionBank(episode, random);
        if (!bank.length) {
            throw new Error('Este episódio ainda não tem exercícios disponíveis.');
        }
        const focused = focusCategory === 'all'
            ? bank
            : bank.filter((question) => question.category === focusCategory);
        const remaining = focusCategory === 'all'
            ? []
            : bank.filter((question) => question.category !== focusCategory);
        const questions = focusCategory === 'all'
            ? shuffle(focused, random)
            : [...shuffle(focused, random), ...shuffle(remaining, random)];

        return new PracticeAttempt({
            id: `attempt-${now}-${Math.floor(random() * 1_000_000)}`,
            mode: 'attempt',
            scope: 'episode',
            episodeId: episode.episodio,
            filterCategory: focusCategory,
            questions,
            answers: [],
            startedAt: now,
            updatedAt: now
        });
    }

    static review(questions, random = Math.random, now = Date.now()) {
        return new PracticeAttempt({
            id: `review-${now}-${Math.floor(random() * 1_000_000)}`,
            mode: 'review',
            scope: 'review',
            questions: shuffle(questions, random),
            answers: [],
            startedAt: now,
            updatedAt: now
        });
    }

    get currentQuestion() {
        return this.data.questions[this.processedCount] || null;
    }

    get processedCount() {
        return this.data.answers.length + this.data.skippedQuestionIds.length;
    }

    get isComplete() {
        return this.data.questions.length > 0 &&
            this.processedCount === this.data.questions.length;
    }

    get progress() {
        return this.data.questions.length
            ? Math.round((this.processedCount / this.data.questions.length) * 100)
            : 0;
    }

    get isAtFocusedCategoryBoundary() {
        const nextQuestion = this.currentQuestion;
        const remainingQuestions = this.data.questions.slice(this.processedCount);
        const processedQuestions = this.data.questions.slice(0, this.processedCount);
        return this.data.filterCategory !== 'all' &&
            nextQuestion !== null &&
            nextQuestion.category !== this.data.filterCategory &&
            processedQuestions.some((question) => question.category === this.data.filterCategory) &&
            !remainingQuestions.some((question) => question.category === this.data.filterCategory);
    }

    isCategoryComplete(category) {
        if (!CATEGORIES.some((item) => item.key === category)) {
            throw new Error('Categoria inválida.');
        }
        return !this.data.questions
            .slice(this.processedCount)
            .some((question) => question.category === category);
    }

    skipCurrentQuestion(skippedAt = Date.now()) {
        const question = this.currentQuestion;
        if (!question) throw new Error('Esta sessão já foi concluída.');
        this.data.skippedQuestionIds.push(question.id);
        this.data.updatedAt = skippedAt;
        return question;
    }

    answer(choice, answeredAt = Date.now()) {
        const question = this.currentQuestion;
        if (!question) throw new Error('Esta sessão já foi concluída.');
        if (!question.choices.includes(choice)) {
            throw new Error('A resposta selecionada não é uma alternativa válida.');
        }

        const answer = {
            questionId: question.id,
            category: question.category,
            itemId: question.itemId,
            item: question.item,
            kind: question.kind,
            choice,
            answer: question.answer,
            correct: choice === question.answer,
            answeredAt
        };
        this.data.answers.push(answer);
        this.data.updatedAt = answeredAt;
        return { question, answer };
    }

    reconcile(episode, random = Math.random) {
        const bank = createQuestionBank(episode, random);
        const knownKeys = new Set(this.data.questions.map(questionKey));
        const additions = bank.filter((question) => !knownKeys.has(questionKey(question)));
        this.data.questions.push(...additions);
        this.data.updatedAt = Date.now();
        return additions.length;
    }

    prioritizeRemaining(category, random = Math.random) {
        if (category !== 'all' && !CATEGORIES.some((item) => item.key === category)) {
            throw new Error('Categoria inicial inválida.');
        }

        const processedCount = this.processedCount;
        const processedQuestions = this.data.questions.slice(0, processedCount);
        const remainingQuestions = this.data.questions.slice(processedCount);
        const orderedRemaining = category === 'all'
            ? this.data.filterCategory === 'all'
                ? remainingQuestions
                : shuffle(remainingQuestions, random)
            : [
                ...remainingQuestions.filter((question) => question.category === category),
                ...remainingQuestions.filter((question) => question.category !== category)
            ];
        const reordered = [...processedQuestions, ...orderedRemaining];
        const changed = this.data.filterCategory !== category ||
            reordered.some((question, index) => question.id !== this.data.questions[index]?.id);

        if (changed) {
            this.data.filterCategory = category;
            this.data.questions = reordered;
            this.data.updatedAt = Date.now();
        }
        return changed;
    }

    summary() {
        const breakdown = {};
        const skipped = new Set(this.data.skippedQuestionIds);
        for (const question of this.data.questions) {
            if (skipped.has(question.id)) continue;
            breakdown[question.category] ||= { total: 0, answered: 0, correct: 0, incorrect: 0 };
            breakdown[question.category].total += 1;
        }

        for (const answer of this.data.answers) {
            breakdown[answer.category] ||= { total: 0, answered: 0, correct: 0, incorrect: 0 };
            breakdown[answer.category].answered += 1;
            breakdown[answer.category][answer.correct ? 'correct' : 'incorrect'] += 1;
        }

        const correct = this.data.answers.filter((answer) => answer.correct).length;
        const incorrect = this.data.answers.length - correct;
        let streak = 0;
        let maxStreak = 0;
        for (const answer of this.data.answers) {
            streak = answer.correct ? streak + 1 : 0;
            maxStreak = Math.max(maxStreak, streak);
        }

        return {
            total: this.data.questions.length - skipped.size,
            answered: this.data.answers.length,
            skipped: skipped.size,
            correct,
            incorrect,
            accuracy: this.data.answers.length
                ? Math.round((correct / this.data.answers.length) * 100)
                : 0,
            points: correct * 10,
            maxStreak,
            breakdown
        };
    }

    toJSON() {
        return {
            ...this.data,
            questions: this.data.questions.map((question) => ({ ...question, choices: [...question.choices] })),
            answers: this.data.answers.map((answer) => ({ ...answer })),
            skippedQuestionIds: [...this.data.skippedQuestionIds]
        };
    }
}

export function createReviewQuestions(episode, mistakes, random = Math.random) {
    const missedItems = new Set(
        Object.values(mistakes || {}).map((mistake) => mistake.itemId).filter(Boolean)
    );
    return createQuestionBank(episode, random).filter((question) =>
        question.kind === 'word' && missedItems.has(question.itemId)
    );
}

export function createEmptyProfile(profileId) {
    return { version: 1, profileId, updatedAt: Date.now(), episodes: {} };
}

export function isCompletedAttempt(attempt) {
    if (!attempt || !attempt.completedAt || !Array.isArray(attempt.questions) ||
        !Array.isArray(attempt.answers) || !attempt.questions.length) {
        return false;
    }
    const skippedCount = Array.isArray(attempt.skippedQuestionIds)
        ? attempt.skippedQuestionIds.length
        : 0;
    if (attempt.answers.length + skippedCount !== attempt.questions.length) return false;
    return attempt.scope === 'episode' ||
        (attempt.scope == null && (attempt.filterCategory || 'all') === 'all');
}

export function getEpisodeSummary(profile, episodeId) {
    const state = profile?.episodes?.[episodeId];
    const attempts = (state?.attempts || []).filter(isCompletedAttempt);
    const bestAttempt = [...attempts].sort((left, right) =>
        (right.accuracy || 0) - (left.accuracy || 0) ||
        (right.points || 0) - (left.points || 0) ||
        (right.maxStreak || 0) - (left.maxStreak || 0)
    )[0] || null;
    const active = state?.activeAttempt || null;
    const activeProgress = active?.questions?.length
        ? Math.round(((active.answers.length + (active.skippedQuestionIds?.length || 0)) /
            active.questions.length) * 100)
        : 0;

    return {
        attempts,
        bestAttempt,
        latestAttempt: [...attempts].sort((left, right) =>
            (right.completedAt || 0) - (left.completedAt || 0)
        )[0] || null,
        active,
        activeProgress,
        progress: active ? activeProgress : (attempts.length ? 100 : 0),
        mistakes: state?.mistakes || {}
    };
}

export function getProfileSummary(profile) {
    const episodes = Object.entries(profile?.episodes || {});
    const attempts = episodes.flatMap(([, state]) =>
        (state.attempts || []).filter(isCompletedAttempt)
    );
    const activeEntry = episodes
        .filter(([, state]) => state.activeAttempt)
        .sort((left, right) =>
            (right[1].activeAttempt.updatedAt || 0) - (left[1].activeAttempt.updatedAt || 0)
        )[0];

    return {
        attempts: attempts.length,
        points: attempts.reduce((total, attempt) => total + (attempt.points || 0), 0),
        completedEpisodes: new Set(attempts.map((attempt) => attempt.episodeId)).size,
        activeAttempt: activeEntry?.[1].activeAttempt || null,
        activeEpisodeId: activeEntry?.[0] || null
    };
}

export function getReviewItems(profile, episodeId) {
    return Object.values(profile?.episodes?.[episodeId]?.mistakes || {})
        .filter((mistake) => mistake.errors > 0)
        .sort((left, right) =>
            right.errors - left.errors || (right.updatedAt || 0) - (left.updatedAt || 0)
        );
}

export function mergeProfiles(local, remote, profileId) {
    const left = local?.profileId === profileId ? local : createEmptyProfile(profileId);
    const right = remote?.profileId === profileId ? remote : createEmptyProfile(profileId);
    const episodeIds = new Set([
        ...Object.keys(left.episodes || {}),
        ...Object.keys(right.episodes || {})
    ]);
    const episodes = {};

    for (const episodeId of episodeIds) {
        const localEpisode = left.episodes?.[episodeId] || {};
        const remoteEpisode = right.episodes?.[episodeId] || {};
        const attempts = new Map();
        for (const attempt of [...(localEpisode.attempts || []), ...(remoteEpisode.attempts || [])]) {
            const current = attempts.get(attempt.id);
            if (!current || (attempt.updatedAt || 0) > (current.updatedAt || 0)) {
                attempts.set(attempt.id, attempt);
            }
        }

        const activeAttempts = [localEpisode.activeAttempt, remoteEpisode.activeAttempt].filter(Boolean);
        const activeAttempt = activeAttempts.sort((a, b) =>
            (b.updatedAt || 0) - (a.updatedAt || 0)
        )[0] || null;
        const mistakes = {};
        for (const source of [localEpisode.mistakes || {}, remoteEpisode.mistakes || {}]) {
            for (const [key, mistake] of Object.entries(source)) {
                const current = mistakes[key];
                if (!current || (mistake.errors || 0) > (current.errors || 0) ||
                    ((mistake.errors || 0) === (current.errors || 0) &&
                        (mistake.updatedAt || 0) > (current.updatedAt || 0))) {
                    mistakes[key] = mistake;
                }
            }
        }

        episodes[episodeId] = {
            updatedAt: Math.max(localEpisode.updatedAt || 0, remoteEpisode.updatedAt || 0),
            attempts: [...attempts.values()],
            activeAttempt,
            mistakes
        };
    }

    return {
        version: 1,
        profileId,
        updatedAt: Math.max(left.updatedAt || 0, right.updatedAt || 0),
        episodes
    };
}

export function profileMistakeKey(category, itemId) {
    return mistakeKey(category, itemId);
}
