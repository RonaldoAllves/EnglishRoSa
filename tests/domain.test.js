import assert from 'node:assert/strict';
import test from 'node:test';
import {
    CATEGORIES,
    PracticeAttempt,
    createQuestionBank,
    createReviewQuestions,
    getEpisodeSummary,
    getReviewItems,
    isCompletedAttempt,
    mergeProfiles
} from '../js/domain.js';

function entry(word, translation) {
    return {
        palavra: word,
        traducao: translation,
        exemplo_episodio: `${word} appears (A tradução de ${word})`,
        exemplo_diferente: `${word} works (Uma tradução alternativa de ${word})`,
        exemplo_adicional: `${word} helps (Outra tradução de ${word})`
    };
}

function sampleEpisode() {
    return {
        episodio: 's01e01',
        adjetivos: [entry('bright', 'brilhante'), entry('kind', 'gentil')],
        expressoes: [entry('hang on', 'espere'), entry('come in', 'entre')]
    };
}

test('question bank includes vocabulary and one sentence for every available item', () => {
    const episode = sampleEpisode();
    const questions = createQuestionBank(episode, () => 0);

    assert.equal(questions.filter((question) => question.kind === 'word').length, 4);
    assert.equal(questions.filter((question) => question.kind === 'sentence').length, 4);
    assert.ok(questions.filter((question) => question.kind === 'sentence')
        .every((question) => question.choices.length === 3));
    assert.deepEqual(
        [...new Set(questions.map((question) => question.category))].sort(),
        ['adjetivos', 'expressoes']
    );
    assert.equal(CATEGORIES.length, 6);
});

test('new-format exercise arrays produce separate stable sentence questions', () => {
    const episode = {
        episodio: 's01e08',
        adjetivos: [{
            palavra: 'calm',
            traducao: 'calmo',
            exercicios: [
                {
                    id: 'adj_001_ex1',
                    frase: 'Stay calm',
                    eh_exemplo_episodio: true,
                    alternativas: [
                        { id: 'a', texto: 'Fique calmo' },
                        { id: 'b', texto: 'Fique bravo' }
                    ],
                    resposta_correta: 'a'
                },
                {
                    id: 'adj_001_ex2',
                    frase: 'She stayed calm',
                    alternativas: [
                        { id: 'a', texto: 'Ela permaneceu calma' },
                        { id: 'b', texto: 'Ela ficou nervosa' }
                    ],
                    resposta_correta: 'a'
                }
            ]
        }]
    };
    const attempt = PracticeAttempt.create(episode, 'all', () => 0, 650);
    const exerciseQuestions = attempt.data.questions.filter((question) => question.exerciseId);

    assert.equal(attempt.data.questions.filter((question) => question.kind === 'word').length, 1);
    assert.equal(exerciseQuestions.length, 2);
    assert.deepEqual(exerciseQuestions.map((question) => question.exerciseId).sort(), [
        'adj_001_ex1',
        'adj_001_ex2'
    ]);
    assert.equal(exerciseQuestions.find((question) => question.exerciseId === 'adj_001_ex1').answer, 'Fique calmo');
    assert.ok(exerciseQuestions.every((question) =>
        question.choices.length >= 2 && question.choices.includes(question.answer)
    ));

    const firstQuestion = attempt.currentQuestion;
    attempt.answer(firstQuestion.answer, 651);
    episode.adjetivos[0].exercicios.push({
        id: 'adj_001_ex3',
        frase: 'He remained calm',
        traducao_correta: 'Ele permaneceu calmo',
        alternativas: []
    });

    assert.equal(attempt.reconcile(episode, () => 0), 1);
    assert.equal(attempt.reconcile(episode, () => 0), 0);
    assert.equal(attempt.data.answers.length, 1);
    assert.equal(attempt.data.questions.filter((question) => question.exerciseId).length, 3);
});

test('attempt orders randomized vocabulary before sentences within each category', () => {
    const attempt = PracticeAttempt.create(sampleEpisode(), 'all', () => 0, 675);
    const categories = [...new Set(attempt.data.questions.map((question) => question.category))];

    assert.deepEqual(categories.sort(), ['adjetivos', 'expressoes']);
    for (const category of categories) {
        const categoryQuestions = attempt.data.questions.filter((question) =>
            question.category === category
        );
        const firstSentenceIndex = categoryQuestions.findIndex((question) =>
            question.kind !== 'word'
        );
        const lastVocabularyIndex = categoryQuestions.findLastIndex((question) =>
            question.kind === 'word'
        );

        assert.ok(firstSentenceIndex > lastVocabularyIndex);
    }
});

test('expression answers only offer alternatives from the expression category', () => {
    const questions = createQuestionBank(sampleEpisode(), () => 0);
    const expressionQuestion = questions.find((question) =>
        question.category === 'expressoes' && question.kind === 'word'
    );
    const expressionTranslations = new Set(['espere', 'entre']);

    assert.ok(expressionQuestion.choices.includes(expressionQuestion.answer));
    assert.ok(expressionQuestion.choices.every((choice) => expressionTranslations.has(choice)));
});

test('episode attempt records category scores, points, and the longest correct streak', () => {
    const attempt = PracticeAttempt.create(sampleEpisode(), 'all', () => 0, 100);
    const first = attempt.currentQuestion;
    attempt.answer(first.answer, 101);
    const second = attempt.currentQuestion;
    const wrongChoice = second.choices.find((choice) => choice !== second.answer);
    attempt.answer(wrongChoice, 102);

    const summary = attempt.summary();
    assert.equal(summary.answered, 2);
    assert.equal(summary.correct, 1);
    assert.equal(summary.incorrect, 1);
    assert.equal(summary.points, 10);
    assert.equal(summary.maxStreak, 1);
    assert.equal(summary.breakdown[first.category].correct, 1);
    assert.equal(summary.breakdown[second.category].incorrect, 1);
    assert.equal(attempt.isComplete, false);
});

test('resuming an attempt adds newly filled vocabulary without discarding answers', () => {
    const episode = sampleEpisode();
    const attempt = PracticeAttempt.create(episode, 'all', () => 0, 200);
    const answered = attempt.currentQuestion;
    attempt.answer(answered.answer, 201);
    const previousQuestionCount = attempt.data.questions.length;

    episode.adjetivos.push(entry('patient', 'paciente'));
    const additions = attempt.reconcile(episode, () => 0);

    assert.equal(additions, 2);
    assert.equal(attempt.data.questions.length, previousQuestionCount + 2);
    assert.equal(attempt.data.answers[0].questionId, answered.id);
    assert.equal(attempt.data.questions.filter((question) =>
        question.kind === 'sentence' && question.category === 'adjetivos'
    ).length, 3);
});

test('reconciling an older attempt adds per-item sentence questions without duplicating saved ones', () => {
    const episode = sampleEpisode();
    const attempt = PracticeAttempt.create(episode, 'all', () => 0, 250);
    const oldSentenceQuestions = new Map();
    for (const question of attempt.data.questions.filter((item) => item.kind === 'sentence')) {
        if (!oldSentenceQuestions.has(question.category)) {
            oldSentenceQuestions.set(question.category, question);
        }
    }
    attempt.data.questions = attempt.data.questions.filter((question) =>
        question.kind !== 'sentence' || oldSentenceQuestions.get(question.category) === question
    );
    const previousCount = attempt.data.questions.length;

    const additions = attempt.reconcile(episode, () => 0);

    assert.equal(additions, 2);
    assert.equal(attempt.data.questions.length, previousCount + 2);
    assert.equal(attempt.data.questions.filter((question) =>
        question.kind === 'sentence'
    ).length, 4);
});

test('resuming an attempt prioritizes the selected category among unanswered questions', () => {
    const attempt = PracticeAttempt.create(sampleEpisode(), 'all', () => 0, 300);
    const answeredQuestion = attempt.currentQuestion;
    attempt.answer(answeredQuestion.answer, 301);
    const answeredQuestionIds = attempt.data.answers.map((answer) => answer.questionId);
    const selectedCategory = answeredQuestion.category === 'adjetivos'
        ? 'expressoes'
        : 'adjetivos';

    assert.equal(attempt.prioritizeRemaining(selectedCategory), true);

    assert.deepEqual(
        attempt.data.answers.map((answer) => answer.questionId),
        answeredQuestionIds
    );
    assert.equal(attempt.currentQuestion.category, selectedCategory);
    assert.equal(attempt.data.filterCategory, selectedCategory);
    assert.equal(attempt.data.questions.length, 8);
});

test('selecting all normalizes legacy question order without moving processed questions', () => {
    const attempt = PracticeAttempt.create(sampleEpisode(), 'all', () => 0, 350);
    const processed = attempt.currentQuestion;
    attempt.answer(processed.answer, 351);
    attempt.data.questions = [
        ...attempt.data.questions.slice(0, 1),
        ...attempt.data.questions.slice(1).reverse()
    ];

    assert.equal(attempt.prioritizeRemaining('all', () => 0), true);

    assert.equal(attempt.data.questions[0].id, processed.id);
    for (const category of ['adjetivos', 'expressoes']) {
        const remainingInCategory = attempt.data.questions
            .slice(attempt.processedCount)
            .filter((question) => question.category === category);
        const firstSentenceIndex = remainingInCategory.findIndex((question) =>
            question.kind !== 'word'
        );
        const lastVocabularyIndex = remainingInCategory.findLastIndex((question) =>
            question.kind === 'word'
        );
        if (firstSentenceIndex !== -1 && lastVocabularyIndex !== -1) {
            assert.ok(firstSentenceIndex > lastVocabularyIndex);
        }
    }
});

test('switching a resumed attempt back to all randomizes the remaining categories', () => {
    const attempt = PracticeAttempt.create(sampleEpisode(), 'all', () => 0, 400);
    const answeredQuestion = attempt.currentQuestion;
    attempt.answer(answeredQuestion.answer, 401);
    const selectedCategory = answeredQuestion.category === 'adjetivos'
        ? 'expressoes'
        : 'adjetivos';

    attempt.prioritizeRemaining(selectedCategory);
    assert.equal(attempt.currentQuestion.category, selectedCategory);
    const categoryFirstOrder = attempt.data.questions.map((question) => question.id);

    assert.equal(attempt.prioritizeRemaining('all', () => 0), true);

    assert.equal(attempt.data.filterCategory, 'all');
    assert.notDeepEqual(
        attempt.data.questions.map((question) => question.id),
        categoryFirstOrder
    );
    assert.equal(new Set(attempt.data.questions.slice(1).map((question) =>
        question.category
    )).size, 2);
});

test('focused category completion stops at its boundary without completing the episode attempt', () => {
    const category = 'adjetivos';
    const attempt = PracticeAttempt.create(sampleEpisode(), category, () => 0, 500);
    const focusedQuestions = attempt.data.questions.filter((question) =>
        question.category === category
    );

    for (let index = 0; index < focusedQuestions.length; index += 1) {
        const question = attempt.currentQuestion;
        assert.equal(question.category, category);
        attempt.answer(question.answer, 501 + index);
        assert.equal(attempt.isAtFocusedCategoryBoundary, index === focusedQuestions.length - 1);
    }

    assert.equal(attempt.isComplete, false);
    assert.notEqual(attempt.currentQuestion.category, category);
});

test('learning skips progress without creating scored answers and survive serialization', () => {
    const attempt = PracticeAttempt.create(sampleEpisode(), 'all', () => 0, 550);
    const skippedQuestion = attempt.currentQuestion;

    attempt.skipCurrentQuestion(551);

    assert.equal(attempt.processedCount, 1);
    assert.equal(attempt.currentQuestion.id === skippedQuestion.id, false);
    assert.equal(attempt.data.answers.length, 0);
    assert.deepEqual(attempt.data.skippedQuestionIds, [skippedQuestion.id]);
    assert.equal(attempt.progress, 13);
    assert.equal(attempt.summary().total, attempt.data.questions.length - 1);
    assert.equal(attempt.summary().answered, 0);
    assert.equal(attempt.summary().skipped, 1);
    assert.equal(attempt.summary().breakdown[skippedQuestion.category].total, 3);

    const resumed = new PracticeAttempt(attempt.toJSON());
    assert.equal(resumed.processedCount, 1);
    assert.equal(resumed.currentQuestion.id, attempt.currentQuestion.id);
    assert.deepEqual(resumed.data.skippedQuestionIds, [skippedQuestion.id]);
    assert.equal(getEpisodeSummary({
        episodes: {
            s01e01: { activeAttempt: resumed.toJSON() }
        }
    }, 's01e01').activeProgress, 13);
});

test('a focused category can end at its boundary after its last question is learned', () => {
    const category = 'adjetivos';
    const attempt = PracticeAttempt.create(sampleEpisode(), category, () => 0, 575);

    while (attempt.currentQuestion.category === category) {
        attempt.skipCurrentQuestion();
    }

    assert.equal(attempt.isAtFocusedCategoryBoundary, true);
    assert.equal(attempt.isComplete, false);
    assert.equal(attempt.isCategoryComplete(category), true);
});

test('an attempt completed with learned skips is completed but scores only answered questions', () => {
    const attempt = PracticeAttempt.create(sampleEpisode(), 'all', () => 0, 590);
    while (!attempt.isComplete) {
        if (attempt.processedCount === 0) {
            const question = attempt.currentQuestion;
            attempt.answer(question.answer, 591);
        } else {
            attempt.skipCurrentQuestion(592 + attempt.processedCount);
        }
    }
    const completed = {
        ...attempt.toJSON(),
        ...attempt.summary(),
        completedAt: 600
    };

    assert.equal(isCompletedAttempt(completed), true);
    assert.equal(completed.answered, 1);
    assert.equal(completed.total, 1);
    assert.equal(completed.skipped, 7);
    assert.equal(completed.points, 10);
});

test('a category is complete only when it has no unanswered questions', () => {
    const category = 'adjetivos';
    const attempt = PracticeAttempt.create(sampleEpisode(), category, () => 0, 600);

    assert.equal(attempt.isCategoryComplete(category), false);

    while (!attempt.isCategoryComplete(category)) {
        const question = attempt.currentQuestion;
        attempt.answer(question.answer, 601 + attempt.data.answers.length);
    }

    assert.equal(attempt.isCategoryComplete(category), true);
    assert.equal(attempt.isComplete, false);
    assert.throws(() => attempt.isCategoryComplete('invalid'), /Categoria inválida/);
});

test('episode reset tombstones prevent stale device progress from being restored', () => {
    const oldAttempt = {
        id: 'old-attempt',
        updatedAt: 100,
        completedAt: 100,
        questions: [{ id: 'q1' }],
        answers: [{ questionId: 'q1', correct: true }]
    };
    const local = {
        version: 1,
        profileId: 'ronaldo',
        updatedAt: 100,
        episodes: {
            s01e01: {
                updatedAt: 100,
                attempts: [oldAttempt],
                activeAttempt: { id: 'old-active', updatedAt: 100, questions: [], answers: [] },
                mistakes: {
                    'verbos:verbos:0': {
                        itemId: 'verbos:0',
                        errors: 2,
                        updatedAt: 100
                    }
                }
            }
        }
    };
    const remote = {
        version: 1,
        profileId: 'ronaldo',
        updatedAt: 200,
        episodes: {
            s01e01: {
                updatedAt: 200,
                resetAt: 200,
                attempts: [],
                activeAttempt: null,
                mistakes: {}
            }
        }
    };

    const merged = mergeProfiles(local, remote, 'ronaldo');
    const episode = merged.episodes.s01e01;

    assert.equal(episode.resetAt, 200);
    assert.deepEqual(episode.attempts, []);
    assert.equal(episode.activeAttempt, null);
    assert.deepEqual(episode.mistakes, {});
    assert.equal(getEpisodeSummary(merged, 's01e01').progress, 0);
});

test('progress created after an episode reset remains mergeable across devices', () => {
    const resetProfile = {
        version: 1,
        profileId: 'sarah',
        updatedAt: 200,
        episodes: {
            s01e01: {
                updatedAt: 200,
                resetAt: 200,
                attempts: [],
                activeAttempt: null,
                mistakes: {}
            }
        }
    };
    const newerAttempt = {
        id: 'new-attempt',
        updatedAt: 250,
        completedAt: 250,
        questions: [{ id: 'q1' }],
        answers: [{ questionId: 'q1', correct: true }]
    };
    const otherDevice = {
        version: 1,
        profileId: 'sarah',
        updatedAt: 250,
        episodes: {
            s01e01: {
                updatedAt: 250,
                attempts: [newerAttempt],
                activeAttempt: null,
                mistakes: {}
            }
        }
    };

    const merged = mergeProfiles(resetProfile, otherDevice, 'sarah');

    assert.deepEqual(merged.episodes.s01e01.attempts.map((attempt) => attempt.id), [
        'new-attempt'
    ]);
    assert.equal(merged.episodes.s01e01.resetAt, 200);
});

test('review questions are available only for recorded mistakes and episode progress honors completion', () => {
    const episode = sampleEpisode();
    const mistakes = {
        'adjetivos:adjetivos:0': {
            category: 'adjetivos',
            itemId: 'adjetivos:0',
            errors: 2,
            item: 'bright'
        }
    };
    const review = createReviewQuestions(episode, mistakes, () => 0);
    const profile = {
        episodes: {
            s01e01: {
                attempts: [],
                activeAttempt: { questions: [1, 2], answers: [1] },
                mistakes
            }
        }
    };

    assert.equal(review.length, 1);
    assert.equal(review[0].item, 'bright');
    assert.equal(getReviewItems(profile, 's01e01')[0].errors, 2);
    assert.equal(getEpisodeSummary(profile, 's01e01').progress, 50);
});
