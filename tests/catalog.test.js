import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { CATEGORIES, createQuestionBank } from '../js/domain.js';

const catalogUrl = new URL('../dados/episodios.json', import.meta.url);

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

test('every filled vocabulary item produces a vocabulary question and an episode sentence question', async () => {
    const catalog = JSON.parse(await readFile(catalogUrl, 'utf8'));

    for (const episode of catalog.episodios) {
        const expectedItems = CATEGORIES.reduce((total, category) =>
            total + (episode[category.key]?.length || 0), 0
        );
        const questions = createQuestionBank(episode);
        const wordQuestions = questions.filter((question) => question.kind === 'word');
        const sentenceQuestions = questions.filter((question) => question.kind === 'sentence');

        assert.equal(wordQuestions.length, expectedItems, episode.episodio);
        assert.equal(sentenceQuestions.length, expectedItems, episode.episodio);
        assert.ok(wordQuestions.every((question) => question.prompt && question.answer), episode.episodio);
        assert.ok(sentenceQuestions.every((question) =>
            question.prompt && question.answer && question.choices.includes(question.answer)
        ), episode.episodio);
    }
});

test('episode-one sentence choices come from examples of the same vocabulary item', async () => {
    const catalog = JSON.parse(await readFile(catalogUrl, 'utf8'));
    const episode = catalog.episodios.find((item) => item.episodio === 's01e01');
    const verbIndex = episode.verbos.findIndex((item) => item.palavra === 'can');
    const canEntry = episode.verbos[verbIndex];
    const canQuestion = createQuestionBank(episode).find((question) =>
        question.id === `s01e01:verbos:${verbIndex}:sentence`
    );
    const sameWordTranslations = [
        canEntry.exemplo_episodio,
        canEntry.exemplo_diferente,
        canEntry.exemplo_adicional
    ].map((example) => example.match(/\((.*)\)$/)?.[1]);

    assert.equal(canQuestion.prompt, canEntry.exemplo_episodio.split(' (')[0]);
    assert.deepEqual(new Set(canQuestion.choices), new Set(sameWordTranslations));
});
