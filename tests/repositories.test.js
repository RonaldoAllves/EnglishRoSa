import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyProfile } from '../js/domain.js';
import { EpisodeRepository, ProfileRepository } from '../js/repositories.js';

class MemoryStorage {
    values = new Map();

    getItem(key) {
        return this.values.get(key) || null;
    }

    setItem(key, value) {
        this.values.set(key, value);
    }
}

test('episode repository loads the exercise-based catalog', async () => {
    let requestedUrl;
    const repository = new EpisodeRepository({
        fetcher: async (url) => {
            requestedUrl = url;
            return { ok: true, json: async () => ({ episodios: [{ episodio: 's01e01' }] }) };
        }
    });

    await repository.load();

    assert.equal(requestedUrl, './dados/episodios_2026-10-30.json');
});

test('profile saves locally even when Firebase synchronization fails', async () => {
    const storage = new MemoryStorage();
    const database = {
        ref: () => ({
            set: async () => {
                throw new Error('offline');
            }
        })
    };
    const repository = new ProfileRepository({ storage, database });
    const profile = createEmptyProfile('ronaldo');
    profile.episodes.s01e01 = { attempts: [], activeAttempt: null, mistakes: {} };

    const result = await repository.save(profile);

    assert.match(result.syncError, /offline/);
    assert.deepEqual(
        JSON.parse(storage.getItem('english-rosa-profile-ronaldo')),
        profile
    );
});

test('profile load merges local progress and Firebase history without duplicates', async () => {
    const storage = new MemoryStorage();
    const local = createEmptyProfile('sarah');
    local.updatedAt = 20;
    local.episodes.s01e01 = {
        updatedAt: 20,
        attempts: [],
        activeAttempt: {
            id: 'active',
            updatedAt: 20,
            questions: [],
            answers: []
        },
        mistakes: {}
    };
    storage.setItem('english-rosa-profile-sarah', JSON.stringify(local));

    const completed = {
        id: 'done',
        episodeId: 's01e01',
        scope: 'episode',
        updatedAt: 10,
        completedAt: 10,
        questions: [{ id: 'q1' }],
        answers: [{ questionId: 'q1', correct: true }]
    };
    const remote = createEmptyProfile('sarah');
    remote.updatedAt = 10;
    remote.episodes.s01e01 = {
        updatedAt: 10,
        attempts: [completed],
        activeAttempt: null,
        mistakes: {}
    };
    let writtenRemote;
    const database = {
        ref: () => ({
            once: async () => ({ val: () => remote }),
            set: async (value) => {
                writtenRemote = value;
            }
        })
    };
    const repository = new ProfileRepository({ storage, database });

    const result = await repository.load('sarah');

    assert.equal(result.syncError, null);
    assert.equal(result.profile.episodes.s01e01.activeAttempt.id, 'active');
    assert.deepEqual(result.profile.episodes.s01e01.attempts.map((attempt) => attempt.id), ['done']);
    assert.equal(writtenRemote.episodes.s01e01.activeAttempt.id, 'active');
    assert.equal(
        JSON.parse(storage.getItem('english-rosa-profile-sarah')).episodes.s01e01.attempts[0].id,
        'done'
    );
});

test('profile load normalizes Firebase numeric-key objects used for saved arrays', async () => {
    const storage = new MemoryStorage();
    const remote = createEmptyProfile('ronaldo');
    remote.episodes.s01e01 = {
        updatedAt: 30,
        attempts: {
            0: {
                id: 'completed',
                scope: 'episode',
                completedAt: 20,
                questions: {
                    0: { id: 'q1', choices: { 0: 'yes', 1: 'no' } }
                },
                answers: {
                    0: { questionId: 'q1', correct: true }
                }
            }
        },
        activeAttempt: {
            id: 'active',
            updatedAt: 30,
            questions: {
                0: { id: 'q2', choices: { 0: 'one', 1: 'two' } }
            },
            answers: null
        },
        mistakes: {}
    };
    let writtenRemote;
    const database = {
        ref: () => ({
            once: async () => ({ val: () => remote }),
            set: async (value) => {
                writtenRemote = value;
            }
        })
    };
    const repository = new ProfileRepository({ storage, database });

    const result = await repository.load('ronaldo');

    assert.equal(result.syncError, null);
    assert.ok(Array.isArray(result.profile.episodes.s01e01.attempts));
    assert.ok(Array.isArray(result.profile.episodes.s01e01.attempts[0].questions));
    assert.deepEqual(result.profile.episodes.s01e01.attempts[0].questions[0].choices, [
        'yes',
        'no'
    ]);
    assert.deepEqual(result.profile.episodes.s01e01.activeAttempt.answers, []);
    assert.ok(Array.isArray(writtenRemote.episodes.s01e01.attempts));
    assert.ok(Array.isArray(
        writtenRemote.episodes.s01e01.activeAttempt.questions
    ));
});

test('profile load reports malformed stored attempt arrays clearly', async () => {
    const storage = new MemoryStorage();
    const remote = createEmptyProfile('sarah');
    remote.episodes.s01e01 = {
        attempts: [],
        activeAttempt: {
            id: 'invalid',
            questions: 'not-an-array',
            answers: []
        },
        mistakes: {}
    };
    const repository = new ProfileRepository({
        storage,
        database: {
            ref: () => ({
                once: async () => ({ val: () => remote }),
                set: async () => {}
            })
        }
    });

    await assert.rejects(
        repository.load('sarah'),
        /questões da tentativa do episódio s01e01 possui formato inválido/
    );
});
