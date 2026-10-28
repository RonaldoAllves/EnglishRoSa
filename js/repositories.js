import { createEmptyProfile, mergeProfiles } from './domain.js?v=__BUILD_VERSION__';

export class ProfileRepository {
    constructor(storage = window.localStorage, firebaseReady = window.firebaseDatabase) {
        this.storage = storage;
        this.firebaseReady = firebaseReady;
    }

    storageKey(profileId) {
        return `english-rosa-profile-${profileId}`;
    }

    readLocal(profileId) {
        const stored = this.storage.getItem(this.storageKey(profileId));
        if (!stored) return createEmptyProfile(profileId);
        const parsed = JSON.parse(stored);
        if (parsed.version !== 1 || parsed.profileId !== profileId || !parsed.episodes) {
            throw new Error('O backup local deste perfil está inválido.');
        }
        return parsed;
    }

    writeLocal(profile) {
        this.storage.setItem(this.storageKey(profile.profileId), JSON.stringify(profile));
    }

    async load(profileId) {
        const local = this.readLocal(profileId);
        const database = window.firebaseDatabase || this.firebaseReady;
        if (!database) {
            return { profile: local, syncError: window.firebaseError || 'Firebase indisponível; usando o armazenamento local.' };
        }

        try {
            const snapshot = await database.ref(`profiles/${profileId}`).once('value');
            const remote = snapshot.val();
            const profile = mergeProfiles(local, remote, profileId);
            this.writeLocal(profile);
            await database.ref(`profiles/${profileId}`).set(profile);
            return { profile, syncError: null };
        } catch (error) {
            return {
                profile: local,
                syncError: `Progresso salvo neste dispositivo. Sincronização indisponível: ${error.message}`
            };
        }
    }

    async save(profile) {
        this.writeLocal(profile);
        const database = window.firebaseDatabase || this.firebaseReady;
        if (!database) {
            throw new Error(window.firebaseError || 'Firebase indisponível; o progresso foi salvo neste dispositivo.');
        }
        await database.ref(`profiles/${profile.profileId}`).set(profile);
    }

    clearEpisode(profile, episodeId) {
        delete profile.episodes[episodeId];
        profile.updatedAt = Date.now();
        this.writeLocal(profile);
    }

    replace(profile) {
        this.writeLocal(profile);
    }
}
