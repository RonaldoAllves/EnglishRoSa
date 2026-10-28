import assert from 'node:assert/strict';
import test from 'node:test';
import {
    CATEGORIES,
    PracticeAttempt,
    createQuestionBank,
    createReviewQuestions,
    getEpisodeSummary,
    getReviewItems
} from '../js/domain.js';

function entry(word, translation) {
    return {
        palavra: word,
        traducao: translation,
        exemplo_episodio: `${word} appears (A tradução de ${word})`
    };
}

function sampleEpisode() {
    return {
        episodio: 's01e01',
        adjetivos: [entry('bright', 'brilhante'), entry('kind', 'gentil')],
        expressoes: [entry('hang on', 'espere'), entry('come in', 'entre')]
    };
}

test('question bank includes vocabulary and a sentence for each available category', () => {
    const episode = sampleEpisode();
    const questions = createQuestionBank(episode, () => 0);

    assert.equal(questions.filter((question) => question.kind === 'word').length, 4);
    assert.equal(questions.filter((question) => question.kind === 'sentence').length, 2);
    assert.deepEqual(
        [...new Set(questions.map((question) => question.category))].sort(),
        ['adjetivos', 'expressoes']
    );
    assert.equal(CATEGORIES.length, 6);
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

    assert.equal(additions, 1);
    assert.equal(attempt.data.questions.length, previousQuestionCount + 1);
    assert.equal(attempt.data.answers[0].questionId, answered.id);
    assert.equal(attempt.data.questions.filter((question) =>
        question.kind === 'sentence' && question.category === 'adjetivos'
    ).length, 1);
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
