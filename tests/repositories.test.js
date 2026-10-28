import assert from 'node:assert/strict';
import test from 'node:test';
import { createEmptyProfile } from '../js/domain.js';
import { ProfileRepository } from '../js/repositories.js';

class MemoryStorage {
    values = new Map();

    getItem(key) {
        return this.values.get(key) || null;
    }

    setItem(key, value) {
        this.values.set(key, value);
    }
}

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
