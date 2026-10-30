import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { CATEGORIES, createQuestionBank } from '../js/domain.js';

const catalogUrl = new URL('../dados/episodios_2026-10-30.json', import.meta.url);

test('catalog keeps episodes 1-5 complete and exposes only filled categories for 6-7', async () => {
    const catalog = JSON.parse(await readFile(catalogUrl, 'utf8'));
    assert.equal(catalog.episodios.length, 7);

    for (const episode of catalog.episodios.slice(0, 5)) {
        for (const category of CATEGORIES) {
            assert.ok(Array.isArray(episode[category.key]) && episode[category.key].length > 0);
        }
    }
    for (const episode of catalog.episodios.slice(5)) {
        assert.deepEqual(
            CATEGORIES.filter((category) => Array.isArray(episode[category.key]) && episode[category.key].length)
                .map((category) => category.key),
            ['adjetivos', 'substantivos', 'verbos', 'expressoes']
        );
    }
});

test('every vocabulary item and catalog exercise produces an attempt question', async () => {
    const catalog = JSON.parse(await readFile(catalogUrl, 'utf8'));

    for (const episode of catalog.episodios) {
        const expectedItems = CATEGORIES.reduce((total, category) =>
            total + (episode[category.key]?.length || 0), 0
        );
        const expectedExercises = CATEGORIES.reduce((total, category) =>
            total + (episode[category.key] || []).reduce((count, item) =>
                count + (item.exercicios?.length || 0), 0
            ), 0
        );
        const questions = createQuestionBank(episode);
        const wordQuestions = questions.filter((question) => question.kind === 'word');
        const exerciseQuestions = questions.filter((question) => question.exerciseId);

        assert.equal(wordQuestions.length, expectedItems, episode.episodio);
        assert.equal(exerciseQuestions.length, expectedExercises, episode.episodio);
        assert.ok(wordQuestions.every((question) => question.prompt && question.answer), episode.episodio);
        assert.ok(exerciseQuestions.every((question) =>
            question.prompt && question.answer && question.choices.includes(question.answer)
        ), episode.episodio);
        assert.ok(exerciseQuestions.every((question) =>
            question.choices.length > 1 && question.choices.every(Boolean)
        ), episode.episodio);
    }
});

test('exercise questions keep catalog alternatives and fill empty alternatives from the category', async () => {
    const catalog = JSON.parse(await readFile(catalogUrl, 'utf8'));
    const episode = catalog.episodios.find((item) => item.episodio === 's01e01');
    const wordIndex = episode.adjetivos.findIndex((item) => item.palavra === 'good');
    const entry = episode.adjetivos[wordIndex];
    const question = createQuestionBank(episode).find((item) =>
        item.exerciseId === entry.exercicios[0].id &&
        item.itemId === `adjetivos:${wordIndex}`
    );
    const correctChoice = entry.exercicios[0].alternativas.find((item) =>
        item.id === entry.exercicios[0].resposta_correta
    ).texto;

    assert.equal(question.prompt, entry.exercicios[0].frase);
    assert.equal(question.answer, correctChoice);
    assert.ok(entry.exercicios[0].alternativas.every((item) =>
        !item.texto || question.choices.includes(item.texto)
    ));

    const episodeWithoutOptions = catalog.episodios.find((item) => item.episodio === 's01e02');
    const emptyOptionItem = episodeWithoutOptions.adjetivos.find((item) =>
        item.exercicios?.some((exercise) =>
            exercise.alternativas?.every((alternative) => !alternative.texto)
        )
    );
    const emptyOptionIndex = episodeWithoutOptions.adjetivos.indexOf(emptyOptionItem);
    const fallbackQuestion = createQuestionBank(episodeWithoutOptions).find((item) =>
        item.exerciseId === emptyOptionItem.exercicios[0].id &&
        item.itemId === `adjetivos:${emptyOptionIndex}`
    );

    assert.ok(fallbackQuestion.choices.includes(emptyOptionItem.exercicios[0].traducao_correta));
    assert.ok(fallbackQuestion.choices.length > 1);
});
