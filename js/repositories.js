import { createEmptyProfile, mergeProfiles } from './domain.js?v=__BUILD_VERSION__';

const PROFILE_IDS = new Set(['ronaldo', 'sarah']);

function normalizeStoredArray(value, label) {
    if (value == null) return [];
    if (Array.isArray(value)) return value;
    if (typeof value !== 'object') {
        throw new Error(`${label} possui formato inválido.`);
    }

    const keys = Object.keys(value);
    if (keys.some((key) => !/^(0|[1-9]\d*)$/.test(key))) {
        throw new Error(`${label} possui formato inválido.`);
    }
    return keys.sort((left, right) => Number(left) - Number(right)).map((key) => value[key]);
}

function normalizeAttempt(attempt, episodeId) {
    if (!attempt || typeof attempt !== 'object' || Array.isArray(attempt)) {
        throw new Error(`Uma tentativa do episódio ${episodeId} está inválida.`);
    }
    if (attempt.questions == null) {
        throw new Error(`Uma tentativa do episódio ${episodeId} está sem questões.`);
    }

    const questions = normalizeStoredArray(
        attempt.questions,
        `As questões da tentativa do episódio ${episodeId}`
    ).map((question) => {
        if (!question || typeof question !== 'object' || Array.isArray(question)) {
            throw new Error(`Uma questão da tentativa do episódio ${episodeId} está inválida.`);
        }
        return {
            ...question,
            choices: normalizeStoredArray(
                question.choices,
                `As alternativas da tentativa do episódio ${episodeId}`
            )
        };
    });
    const answers = normalizeStoredArray(
        attempt.answers,
        `As respostas da tentativa do episódio ${episodeId}`
    );
    const skippedQuestionIds = normalizeStoredArray(
        attempt.skippedQuestionIds,
        `Os exercícios estudados da tentativa do episódio ${episodeId}`
    );
    return { ...attempt, questions, answers, skippedQuestionIds };
}

export class EpisodeRepository {
    constructor({
        url = './dados/episodios_2026-10-30.json',
        fetcher = (...args) => globalThis.fetch(...args)
    } = {}) {
        this.url = url;
        this.fetcher = fetcher;
    }

    async load() {
        const response = await this.fetcher(this.url);
        if (!response.ok) {
            throw new Error(`Não foi possível carregar os episódios (${response.status}).`);
        }
        const catalog = await response.json();
        if (!Array.isArray(catalog.episodios) || !catalog.episodios.length) {
            throw new Error('O arquivo de episódios não contém episódios disponíveis.');
        }
        return catalog;
    }
}

export class ProfileRepository {
    constructor({
        storage = globalThis.localStorage,
        database = globalThis.firebaseDatabase,
        firebaseError = globalThis.firebaseError
    } = {}) {
        this.storage = storage;
        this.database = database;
        this.firebaseError = firebaseError;
    }

    storageKey(profileId) {
        return `english-rosa-profile-${profileId}`;
    }

    readLocal(profileId) {
        this.assertProfileId(profileId);
        const stored = this.storage.getItem(this.storageKey(profileId));
        if (!stored) return createEmptyProfile(profileId);
        let profile;
        try {
            profile = JSON.parse(stored);
        } catch (error) {
            throw new Error(`Os dados locais do perfil estão inválidos: ${error.message}`);
        }
        return this.validateProfile(profile, profileId, 'armazenamento local');
    }

    writeLocal(profile) {
        this.storage.setItem(this.storageKey(profile.profileId), JSON.stringify(profile));
    }

    async load(profileId) {
        const local = this.readLocal(profileId);
        if (!this.database) {
            return {
                profile: local,
                syncError: this.firebaseError || 'Firebase indisponível; usando o armazenamento deste dispositivo.'
            };
        }

        let remote = null;
        let syncError = null;
        try {
            const snapshot = await this.database.ref(`profiles/${profileId}`).once('value');
            remote = snapshot.val();
        } catch (error) {
            syncError = error.message || 'Não foi possível carregar os dados do Firebase.';
        }

        const remoteProfile = remote
            ? this.validateProfile({
                ...remote,
                version: remote.version == null ? 1 : Number(remote.version),
                profileId: remote.profileId || profileId,
                episodes: remote.episodes ?? {}
            }, profileId, 'Firebase')
            : null;
        const profile = mergeProfiles(local, remoteProfile, profileId);
        this.writeLocal(profile);
        if (!syncError) {
            try {
                await this.database.ref(`profiles/${profileId}`).set(profile);
            } catch (error) {
                syncError = error.message || 'Não foi possível sincronizar os dados com o Firebase.';
            }
        }
        return { profile, syncError };
    }

    async save(profile) {
        const validated = this.validateProfile(profile, profile.profileId);
        this.writeLocal(validated);
        if (!this.database) {
            return {
                profile: validated,
                syncError: this.firebaseError || 'Firebase indisponível; progresso salvo neste dispositivo.'
            };
        }
        try {
            await this.database.ref(`profiles/${validated.profileId}`).set(validated);
            return { profile: validated, syncError: null };
        } catch (error) {
            return {
                profile: validated,
                syncError: error.message || 'Não foi possível sincronizar os dados com o Firebase.'
            };
        }
    }

    parseBackup(text, expectedProfileId) {
        let profile;
        try {
            profile = JSON.parse(text);
        } catch (error) {
            throw new Error(`O arquivo de backup não contém JSON válido: ${error.message}`);
        }
        return this.validateProfile(profile, expectedProfileId);
    }

    async replaceProfile(profile) {
        return this.save(profile);
    }

    validateProfile(profile, expectedProfileId, source = 'backup') {
        this.assertProfileId(expectedProfileId);
        if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
            if (source === 'Firebase') {
                throw new Error(`O registro do perfil ${expectedProfileId} no Firebase não é um objeto válido.`);
            }
            if (source === 'armazenamento local') {
                throw new Error(`Os dados locais do perfil ${expectedProfileId} estão inválidos.`);
            }
            throw new Error('O backup não corresponde a um perfil válido para esta conta.');
        }
        if (profile.profileId !== expectedProfileId) {
            if (source === 'Firebase') {
                throw new Error(`O registro do perfil ${expectedProfileId} no Firebase contém o perfil "${profile.profileId || 'sem identificação'}".`);
            }
            if (source === 'armazenamento local') {
                throw new Error(`Os dados locais do perfil ${expectedProfileId} não correspondem a esta conta.`);
            }
            throw new Error('O backup não corresponde a um perfil válido para esta conta.');
        }
        if (profile.version !== 1 || typeof profile.episodes !== 'object' ||
            Array.isArray(profile.episodes)) {
            if (source === 'Firebase') {
                throw new Error(`Os dados do perfil ${expectedProfileId} no Firebase possuem estrutura inválida.`);
            }
            if (source === 'armazenamento local') {
                throw new Error(`Os dados locais do perfil ${expectedProfileId} estão inválidos.`);
            }
            throw new Error('O backup não corresponde a um perfil válido para esta conta.');
        }

        for (const [episodeId, state] of Object.entries(profile.episodes)) {
            if (!/^s\d{2}e\d{2}$/i.test(episodeId) || !state ||
                typeof state !== 'object' || Array.isArray(state) ||
                (state.mistakes != null &&
                    (typeof state.mistakes !== 'object' || Array.isArray(state.mistakes)))) {
                throw new Error(`Os dados do episódio ${episodeId} estão inválidos.`);
            }
            const attempts = normalizeStoredArray(
                state.attempts,
                `As tentativas do episódio ${episodeId}`
            ).filter(Boolean).map((attempt) => normalizeAttempt(attempt, episodeId));
            const activeAttempt = state.activeAttempt
                ? normalizeAttempt(state.activeAttempt, episodeId)
                : null;
            profile.episodes[episodeId] = {
                ...state,
                attempts,
                activeAttempt,
                mistakes: state.mistakes || {}
            };
        }

        return {
            version: 1,
            profileId: expectedProfileId,
            updatedAt: Number(profile.updatedAt) || Date.now(),
            episodes: profile.episodes
        };
    }

    assertProfileId(profileId) {
        if (!PROFILE_IDS.has(profileId)) {
            throw new Error('Perfil inválido.');
        }
    }
}
