const loadedVersion = new URL(import.meta.url).searchParams.get('v');
const currentVersion = !loadedVersion || loadedVersion === '__BUILD_VERSION__' ? 'development' : loadedVersion;
const [{ CATEGORIES, EPISODE_TITLES, PracticeSession, getEpisodeId, getEpisodeSummary, getProfileSummary, mergeProfiles }, { ProfileRepository }] = await Promise.all([
    import(`./domain.js?v=${encodeURIComponent(currentVersion)}`),
    import(`./repositories.js?v=${encodeURIComponent(currentVersion)}`)
]);

const PROFILES = [
    { id: 'ronaldo', name: 'Ronaldo', icon: 'R', color: 'coral', phrase: 'Seu inglês, do seu jeito.' },
    { id: 'sarah', name: 'Sarah', icon: 'S', color: 'lavender', phrase: 'Um episódio por vez.' }
];
const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((category) => [category.key, category.label]));
const repository = new ProfileRepository();

class EnglishRoSaApp {
    constructor() {
        this.episodes = [];
        this.profile = null;
        this.activeProfile = null;
        this.activeEpisode = null;
        this.session = null;
        this.pendingAnswer = null;
        this.advanceTimer = null;
        this.dialogEpisodeId = null;
        this.siteVersion = {
            version: currentVersion
        };
        this.versionCheckInProgress = false;
    }

    async init() {
        this.bindEvents();
        document.querySelector('#version-status').addEventListener('click', () => this.reloadLatestVersion());
        await this.checkSiteVersion();
        window.setInterval(() => this.checkSiteVersion(), 60_000);
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') this.checkSiteVersion();
        });
        this.renderProfiles();
        try {
            const response = await fetch('dados/episodios.json');
            if (!response.ok) throw new Error(`Não foi possível carregar o catálogo (${response.status}).`);
            const catalog = await response.json();
            if (!Array.isArray(catalog.episodios) || !catalog.episodios.length) {
                throw new Error('O catálogo não contém episódios para praticar.');
            }
            this.episodes = catalog.episodios;
        } catch (error) {
            document.querySelector('#profile-list').innerHTML = `<p class="error-message">${this.escape(error.message)}</p>`;
            return;
        }

        const lastProfile = localStorage.getItem('english-rosa-last-profile');
        if (PROFILES.some((profile) => profile.id === lastProfile)) await this.selectProfile(lastProfile);
    }

    bindEvents() {
        document.querySelector('#profile-list').addEventListener('click', (event) => {
            const button = event.target.closest('[data-profile]');
            if (button) this.selectProfile(button.dataset.profile);
        });
        document.querySelector('#switch-profile').addEventListener('click', () => this.showScreen('profile-screen'));
        document.querySelector('#episodes-list').addEventListener('click', (event) => {
            const card = event.target.closest('[data-episode]');
            if (card) this.openEpisode(card.dataset.episode);
        });
        document.querySelector('#continue-button').addEventListener('click', () => {
            const summary = getProfileSummary(this.profile);
            if (summary.activeAttempt) this.resumeAttempt(summary.activeAttempt.episodeId);
        });
        document.querySelector('#start-button').addEventListener('click', () => this.startNewAttempt());
        document.querySelector('#resume-button').addEventListener('click', () => {
            const category = document.querySelector('input[name="category"]:checked')?.value || 'all';
            this.resumeAttempt(this.dialogEpisodeId, category);
        });
        document.querySelector('#category-options').addEventListener('change', () => this.updateResumeButton(this.dialogEpisodeId));
        document.querySelector('#reset-episode').addEventListener('click', () => this.resetEpisode());
        document.querySelector('#answer-options').addEventListener('click', (event) => {
            const button = event.target.closest('[data-answer]');
            if (button && !this.pendingAnswer) this.submitAnswer(button.dataset.answer);
        });
        document.querySelector('#quit-button').addEventListener('click', () => this.quitPractice());
        document.querySelector('#close-result').addEventListener('click', () => document.querySelector('#result-dialog').close());
        document.querySelector('#result-dialog').addEventListener('close', () => {
            if (this.profile) {
                this.showScreen('dashboard-screen');
                this.renderDashboard();
            }
        });
        document.querySelector('#review-button').addEventListener('click', () => this.openReview());
        document.querySelector('#history-button').addEventListener('click', () => this.openHistory());
        document.querySelector('#export-button').addEventListener('click', () => this.exportBackup());
        document.querySelector('#import-button').addEventListener('click', () => document.querySelector('#import-file').click());
        document.querySelector('#import-file').addEventListener('change', (event) => this.importBackup(event.target.files[0]));
        document.querySelectorAll('[data-close-dialog]').forEach((button) => {
            button.addEventListener('click', () => document.querySelector(`#${button.dataset.closeDialog}`).close());
        });
    }

    renderProfiles() {
        const profiles = PROFILES.map((profile) => {
            let summary = { attempts: 0, points: 0 };
            try {
                summary = getProfileSummary(repository.readLocal(profile.id));
            } catch (error) {
                console.error('Não foi possível ler o progresso local:', error);
            }
            return `<button class="profile-card ${profile.color}" type="button" data-profile="${profile.id}">
                <span class="profile-avatar">${profile.icon}</span>
                <span class="profile-card-copy"><strong>${profile.name}</strong><span>${profile.phrase}</span></span>
                <span class="profile-card-stats"><strong>${summary.points}</strong><span>pontos</span><i aria-hidden="true">→</i></span>
            </button>`;
        }).join('');
        document.querySelector('#profile-list').innerHTML = profiles;
    }

    async selectProfile(profileId) {
        this.activeProfile = PROFILES.find((profile) => profile.id === profileId);
        if (!this.activeProfile) return;
        localStorage.setItem('english-rosa-last-profile', profileId);
        document.querySelector('#profile-screen').hidden = true;
        document.querySelector('#dashboard-screen').hidden = false;
        document.querySelector('#practice-screen').hidden = true;
        document.querySelector('#switch-profile').hidden = false;
        document.querySelector('#switch-profile').textContent = `${this.activeProfile.icon} ${this.activeProfile.name} · trocar`;
        this.setSyncStatus('Conferindo seu progresso salvo…', 'loading');

        const result = await repository.load(profileId);
        this.profile = result.profile;
        this.setSyncStatus(
            result.syncError || 'Progresso salvo e sincronizado.',
            result.syncError ? 'local' : 'synced'
        );
        this.renderDashboard();
    }

    setSyncStatus(message, state) {
        const status = document.querySelector('#sync-status');
        status.textContent = message;
        status.dataset.state = state;
    }

    async checkSiteVersion() {
        if (this.versionCheckInProgress) return;
        this.versionCheckInProgress = true;
        try {
            const versionUrl = new URL('version.json', document.baseURI);
            versionUrl.searchParams.set('check', Date.now().toString());
            const response = await fetch(versionUrl, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Verificação indisponível (${response.status}).`);
            const version = await response.json();
            if (!version.version || (version.version !== 'development' && !version.builtAt)) {
                throw new Error('Informações de versão indisponíveis.');
            }

            const versionButton = document.querySelector('#version-status');
            if (version.version !== this.siteVersion.version) {
                versionButton.textContent = `Atualização disponível · ${version.version} · recarregar`;
                versionButton.title = `Nova versão publicada em ${new Date(version.builtAt).toLocaleString('pt-BR')}. Clique para atualizar.`;
                versionButton.dataset.state = 'update';
                versionButton.dataset.targetVersion = version.version;
                return;
            }

            versionButton.textContent = this.siteVersion.version === 'development'
                ? 'Versão desenvolvimento'
                : `Versão ${this.siteVersion.version}`;
            versionButton.title = version.builtAt
                ? `Versão publicada em ${new Date(version.builtAt).toLocaleString('pt-BR')}`
                : 'Esta cópia está sendo executada em ambiente de desenvolvimento.';
            versionButton.dataset.state = 'current';
            delete versionButton.dataset.targetVersion;
        } catch (error) {
            console.warn('Não foi possível verificar a versão publicada:', error);
            const versionButton = document.querySelector('#version-status');
            if (!this.siteVersion) versionButton.textContent = 'Versão indisponível';
            versionButton.title = 'Não foi possível verificar se há uma atualização publicada.';
        } finally {
            this.versionCheckInProgress = false;
        }
    }

    reloadLatestVersion() {
        const targetVersion = document.querySelector('#version-status').dataset.targetVersion;
        if (!targetVersion) return;
        const refreshUrl = new URL(window.location.href);
        refreshUrl.searchParams.set('refresh', targetVersion);
        refreshUrl.searchParams.set('reload', Date.now().toString());
        window.location.replace(refreshUrl);
    }

    showScreen(id) {
        for (const screen of document.querySelectorAll('.screen')) {
            screen.hidden = screen.id !== id;
        }
        if (id === 'profile-screen') {
            this.renderProfiles();
            document.querySelector('#switch-profile').hidden = true;
        }
    }

    renderDashboard() {
        if (!this.profile || !this.activeProfile) return;
        document.querySelector('#welcome-name').textContent = this.activeProfile.name;
        const summary = getProfileSummary(this.profile);
        document.querySelector('#stat-points').textContent = summary.points.toLocaleString('pt-BR');
        document.querySelector('#stat-attempts').textContent = summary.attempts.toLocaleString('pt-BR');
        document.querySelector('#stat-accuracy').textContent = summary.accuracy === null ? '—' : `${summary.accuracy}%`;

        const continueButton = document.querySelector('#continue-button');
        if (summary.activeAttempt) {
            const episodeIndex = this.episodes.findIndex((episode, index) =>
                getEpisodeId(episode, index) === summary.activeAttempt.episodeId
            );
            const label = episodeIndex >= 0 ? `Episódio ${String(episodeIndex + 1).padStart(2, '0')}` : 'sua prática';
            continueButton.innerHTML = `Continuar ${label} <span aria-hidden="true">→</span>`;
            continueButton.hidden = false;
        } else {
            continueButton.hidden = true;
        }

        document.querySelector('#episodes-list').innerHTML = this.episodes.map((episode, index) => {
            const id = getEpisodeId(episode, index);
            const state = getEpisodeSummary(this.profile, id);
            const episodeNumber = String(index + 1).padStart(2, '0');
            const title = EPISODE_TITLES[index] || `Episódio ${episodeNumber}`;
            const status = state.active
                ? `${state.active.answers.length} de ${state.active.questions.length} exercícios`
                : state.latestAttempt
                    ? `${state.attempts.length} ${state.attempts.length === 1 ? 'tentativa' : 'tentativas'} · melhor ${state.bestAttempt.accuracy}%`
                    : 'Comece sua primeira prática';
            return `<button class="episode-card ${state.active ? 'has-active' : ''}" type="button" data-episode="${this.escape(id)}">
                <span class="episode-number">${episodeNumber}</span>
                <span class="episode-copy"><span class="episode-title">${this.escape(title)}</span><span class="episode-subtitle">${this.escape(status)}</span>
                    <span class="episode-progress"><span style="width:${state.progress}%"></span></span></span>
                <span class="episode-action">${state.active ? 'Continuar' : state.practiced ? `${state.progress}%` : 'Praticar'} <span aria-hidden="true">→</span></span>
            </button>`;
        }).join('');
    }

    openEpisode(episodeId) {
        this.dialogEpisodeId = episodeId;
        const episodeIndex = this.episodes.findIndex((episode, index) => getEpisodeId(episode, index) === episodeId);
        this.activeEpisode = this.episodes[episodeIndex];
        const title = EPISODE_TITLES[episodeIndex] || `Episódio ${String(episodeIndex + 1).padStart(2, '0')}`;
        document.querySelector('#dialog-episode-title').textContent = `Episódio ${String(episodeIndex + 1).padStart(2, '0')} · ${title}`;
        this.renderCategoryOptions(episodeId);
        this.renderAttemptHistory(episodeId);

        const active = this.profile.episodes[episodeId]?.activeAttempt;
        const resumeButton = document.querySelector('#resume-button');
        if (active) {
            resumeButton.hidden = false;
            const activeCategory = active.filterCategory || active.category || 'all';
            const selectedCategory = document.querySelector('input[name="category"]:checked')?.value || activeCategory;
            resumeButton.textContent = selectedCategory === activeCategory
                ? `Continuar tentativa · ${active.answers.length}/${active.questions.length}`
                : `Continuar tentativa · ${CATEGORY_LABELS[selectedCategory] || 'Episódio completo'}`;
        } else {
            resumeButton.hidden = true;
        }
        document.querySelector('#episode-dialog').showModal();
    }

    updateResumeButton(episodeId) {
        const active = this.profile.episodes[episodeId]?.activeAttempt;
        if (!active) return;
        const selectedCategory = document.querySelector('input[name="category"]:checked')?.value || 'all';
        const activeCategory = active.filterCategory || active.category || 'all';
        document.querySelector('#resume-button').textContent = selectedCategory === activeCategory
            ? `Continuar tentativa · ${active.answers.length}/${active.questions.length}`
            : `Continuar tentativa · ${CATEGORY_LABELS[selectedCategory] || 'Episódio completo'}`;
    }

    renderCategoryOptions(episodeId) {
        const episodeIndex = this.episodes.findIndex((episode, index) => getEpisodeId(episode, index) === episodeId);
        const episode = this.episodes[episodeIndex];
        const categories = CATEGORIES.filter((category) => Array.isArray(episode[category.key]) && episode[category.key].length);
        const summary = getEpisodeSummary(this.profile, episodeId);
        const phraseCount = (items) => items.filter((item) => {
            const example = item.exemplo_episodio || '';
            return /\s+\(.+\)\s*$/.test(example);
        }).length ? 1 : 0;
        const totalWords = categories.reduce((total, category) => total + episode[category.key].length, 0);
        const totalPhrases = categories.reduce((total, category) => total + phraseCount(episode[category.key]), 0);
        const inputs = [
            { key: 'all', label: 'Episódio completo', icon: '✳', words: totalWords, phrases: totalPhrases },
            ...categories.map((category) => ({ key: category.key, label: category.label, icon: category.icon, words: episode[category.key].length, phrases: phraseCount(episode[category.key]) }))
        ];
        const activeCategory = this.profile.episodes[episodeId]?.activeAttempt?.filterCategory || 'all';
        document.querySelector('#category-options').innerHTML = `<legend>Conteúdo para praticar</legend>${inputs.map((option, index) => {
            const answered = summary.latestAttempt?.byCategory?.[option.key];
            const result = answered ? ` · ${answered.correct} acertos, ${answered.wrong} erros` : '';
            const exercises = option.words + option.phrases;
            const content = `${exercises} exercícios · ${option.words} ${option.words === 1 ? 'palavra' : 'palavras'} + ${option.phrases} ${option.phrases === 1 ? 'frase' : 'frases'}`;
            const checked = option.key === activeCategory || (!inputs.some((item) => item.key === activeCategory) && index === 0);
            return `<label class="category-option"><input type="radio" name="category" value="${option.key}" ${checked ? 'checked' : ''}><span class="category-option-icon">${option.icon}</span><span class="category-option-copy"><strong>${option.label}</strong><span>${this.escape(content + result)}</span></span><span class="category-option-arrow" aria-hidden="true">→</span></label>`;
        }).join('')}`;
        this.updateResumeButton(episodeId);
    }

    renderAttemptHistory(episodeId) {
        const attempts = [...(this.profile.episodes[episodeId]?.attempts || [])]
            .sort((a, b) => (b.accuracy || 0) - (a.accuracy || 0) || (b.completedAt || 0) - (a.completedAt || 0))
            .slice(0, 3);
        document.querySelector('#episode-history').innerHTML = attempts.length
            ? `<h3>Melhores tentativas</h3>${attempts.map((attempt) => `<div class="attempt-row"><span>${new Date(attempt.completedAt).toLocaleDateString('pt-BR')}</span><strong>${attempt.accuracy}%</strong><span>✦ ${attempt.points} pontos</span></div>`).join('')}`
            : '';
    }

    startNewAttempt() {
        const activeAttempt = this.profile.episodes[this.dialogEpisodeId]?.activeAttempt;
        if (activeAttempt && !window.confirm('Já existe uma tentativa deste episódio em andamento. Se começar uma nova, o progresso desta tentativa será perdido. Deseja continuar?')) {
            return;
        }

        const category = document.querySelector('input[name="category"]:checked')?.value || 'all';
        try {
            this.session = PracticeSession.create(this.activeEpisode, this.dialogEpisodeId, category);
        } catch (error) {
            this.setSyncStatus(error.message, 'local');
            return;
        }
        this.profile.episodes[this.dialogEpisodeId] ||= { updatedAt: 0, attempts: [], mistakes: {} };
        this.profile.episodes[this.dialogEpisodeId].activeAttempt = this.session.toJSON();
        this.profile.episodes[this.dialogEpisodeId].updatedAt = Date.now();
        this.profile.updatedAt = Date.now();
        this.persistProgress();
        document.querySelector('#episode-dialog').close();
        this.showScreen('practice-screen');
        this.renderQuestion();
    }

    resumeAttempt(episodeId, selectedCategory) {
        const active = this.profile.episodes[episodeId]?.activeAttempt;
        if (!active) return;
        const episodeIndex = this.episodes.findIndex((episode, index) => getEpisodeId(episode, index) === episodeId);
        if (episodeIndex < 0) {
            this.setSyncStatus('O episódio desta tentativa não está mais disponível.', 'local');
            return;
        }
        this.dialogEpisodeId = episodeId;
        this.activeEpisode = this.episodes[episodeIndex];
        this.session = PracticeSession.restore(active);
        try {
            if (selectedCategory && this.session.setFilter(this.activeEpisode, selectedCategory)) {
                const episodeState = this.profile.episodes[episodeId];
                episodeState.activeAttempt = this.session.toJSON();
                episodeState.updatedAt = Date.now();
                this.profile.updatedAt = Date.now();
                this.persistProgress();
            }
        } catch (error) {
            this.setSyncStatus(error.message, 'local');
            return;
        }
        document.querySelector('#episode-dialog').close();
        this.showScreen('practice-screen');
        if (this.session.isComplete) this.completeAttempt();
        else this.renderQuestion();
    }

    renderQuestion() {
        const question = this.session?.currentQuestion;
        if (!question) {
            this.completeAttempt();
            return;
        }
        const sessionData = this.session.toJSON();
        const summary = this.session.summary;
        document.querySelector('#practice-progress-label').textContent = `Exercício ${sessionData.answers.length + 1} de ${sessionData.questions.length}`;
        document.querySelector('#practice-progress-fill').style.width = `${(sessionData.answers.length / sessionData.questions.length) * 100}%`;
        document.querySelector('#practice-points').textContent = `✦ ${summary.points}`;
        document.querySelector('#practice-correct').textContent = `✓ ${summary.correct}`;
        document.querySelector('#practice-wrong').textContent = `✕ ${summary.wrong}`;
        document.querySelector('#question-badge').textContent = `${question.kind === 'sentence' ? 'TRADUÇÃO DE FRASES' : 'VOCABULÁRIO'} · ${CATEGORY_LABELS[question.category].toLocaleUpperCase('pt-BR')}`;
        document.querySelector('#question-instruction').textContent = question.kind === 'sentence'
            ? 'Escolha a frase em inglês que corresponde à tradução.'
            : 'Escolha a tradução correta.';
        document.querySelector('#question-type').textContent = question.kind === 'sentence' ? 'COMO SE DIZ EM INGLÊS?' : 'QUAL É O SIGNIFICADO?';
        document.querySelector('#question-prompt').textContent = question.prompt;
        const example = document.querySelector('#question-example');
        example.textContent = question.example;
        example.hidden = !question.example;
        document.querySelector('#answer-feedback').hidden = true;
        window.clearTimeout(this.advanceTimer);
        this.advanceTimer = null;
        this.pendingAnswer = null;
        document.querySelector('#answer-options').innerHTML = question.choices.map((choice, index) =>
            `<button class="answer-option" type="button" data-answer="${this.escape(choice)}"><span class="answer-letter">${String.fromCharCode(65 + index)}</span><span>${this.escape(choice)}</span></button>`
        ).join('');
    }

    submitAnswer(choice) {
        const result = this.session.answer(choice);
        this.pendingAnswer = result;
        const buttons = [...document.querySelectorAll('#answer-options [data-answer]')];
        for (const button of buttons) {
            button.disabled = true;
            if (button.dataset.answer === result.question.answer) button.classList.add('correct');
            else if (button.dataset.answer === choice) button.classList.add('incorrect');
        }
        const feedback = document.querySelector('#answer-feedback');
        feedback.className = `answer-feedback ${result.correct ? 'is-correct' : 'is-incorrect'}`;
        feedback.textContent = result.correct
            ? `Isso mesmo! Você está indo muito bem. ${this.session.isComplete ? 'Seu resultado aparecerá em instantes.' : 'A próxima pergunta vem em instantes.'}`
            : `Quase! A resposta certa é: ${result.question.answer} ${this.session.isComplete ? 'Seu resultado aparecerá em instantes.' : 'A próxima pergunta vem em instantes.'}`;
        feedback.hidden = false;

        const episodeState = this.profile.episodes[this.dialogEpisodeId];
        episodeState.activeAttempt = this.session.toJSON();
        episodeState.updatedAt = Date.now();
        this.profile.updatedAt = Date.now();
        if (!result.correct) {
            const mistakes = episodeState.mistakes;
            const mistakeId = `${result.question.category}:${result.question.item}`;
            const previous = mistakes[mistakeId] || { word: result.question.item, category: result.question.category, count: 0 };
            mistakes[mistakeId] = { ...previous, count: previous.count + 1 };
        }
        const sessionSummary = this.session.summary;
        document.querySelector('#practice-points').textContent = `✦ ${sessionSummary.points}`;
        document.querySelector('#practice-correct').textContent = `✓ ${sessionSummary.correct}`;
        document.querySelector('#practice-wrong').textContent = `✕ ${sessionSummary.wrong}`;
        document.querySelector('#practice-progress-label').textContent = `Exercício ${this.session.toJSON().answers.length} de ${this.session.toJSON().questions.length}`;
        document.querySelector('#practice-progress-fill').style.width = `${(this.session.toJSON().answers.length / this.session.toJSON().questions.length) * 100}%`;
        this.persistProgress();
        this.advanceTimer = window.setTimeout(() => {
            this.advanceTimer = null;
            this.advanceQuestion();
        }, 1200);
    }

    advanceQuestion() {
        if (this.session.isComplete) this.completeAttempt();
        else this.renderQuestion();
    }

    async completeAttempt() {
        if (!this.session || !this.profile) return;
        const episodeState = this.profile.episodes[this.dialogEpisodeId];
        if (!episodeState.attempts.some((attempt) => attempt.id === this.session.toJSON().id)) {
            const summary = this.session.summary;
            const attempt = {
                id: this.session.toJSON().id,
                episodeId: this.dialogEpisodeId,
                scope: 'episode',
                filterCategory: 'all',
                priorityCategory: this.session.toJSON().filterCategory || this.session.toJSON().category || 'all',
                answered: summary.total,
                total: this.session.toJSON().questions.length,
                correct: summary.correct,
                wrong: summary.wrong,
                accuracy: summary.accuracy,
                points: summary.points,
                bestStreak: summary.bestStreak,
                byCategory: summary.byCategory,
                completedAt: Date.now(),
                updatedAt: Date.now()
            };
            episodeState.attempts.push(attempt);
        }
        episodeState.activeAttempt = null;
        episodeState.updatedAt = Date.now();
        this.profile.updatedAt = Date.now();
        await this.persistProgress();
        this.renderResult();
    }

    renderResult() {
        const summary = this.session.summary;
        const episodeIndex = this.episodes.findIndex((episode, index) => getEpisodeId(episode, index) === this.dialogEpisodeId);
        document.querySelector('#result-title').textContent = summary.accuracy >= 80 ? 'Arrasou!' : summary.accuracy >= 50 ? 'Muito bem!' : 'Boa prática!';
        document.querySelector('#result-subtitle').textContent = `Episódio ${String(episodeIndex + 1).padStart(2, '0')} · ${EPISODE_TITLES[episodeIndex] || ''}`;
        document.querySelector('#result-accuracy').textContent = `${summary.accuracy}%`;
        document.querySelector('#result-stats').innerHTML = [
            ['Acertos', summary.correct, 'positive'],
            ['Erros', summary.wrong, 'negative'],
            ['Pontos', `✦ ${summary.points}`, 'points'],
            ['Maior sequência', summary.bestStreak, 'streak']
        ].map(([label, value, style]) => `<div class="result-stat ${style}"><span>${label}</span><strong>${value}</strong></div>`).join('');
        const categoryRows = CATEGORIES.filter((category) => summary.byCategory[category.key]).map((category) => {
            const stats = summary.byCategory[category.key];
            const total = stats.correct + stats.wrong;
            const percentage = total ? Math.round((stats.correct / total) * 100) : 0;
            return `<div class="breakdown-row"><span>${category.label}</span><span>${stats.correct} acertos · ${stats.wrong} erros</span><strong>${percentage}%</strong></div>`;
        });
        document.querySelector('#result-breakdown').innerHTML = categoryRows.join('');
        document.querySelector('#result-dialog').showModal();
    }

    async persistProgress() {
        try {
            await repository.save(this.profile);
            this.setSyncStatus('Progresso salvo e sincronizado.', 'synced');
        } catch (error) {
            this.setSyncStatus(error.message, 'local');
        }
    }

    quitPractice() {
        if (this.session?.data.answers.length && !window.confirm('Sua tentativa será salva para continuar depois. Quer sair?')) return;
        window.clearTimeout(this.advanceTimer);
        this.advanceTimer = null;
        this.pendingAnswer = null;
        this.showScreen('dashboard-screen');
        this.renderDashboard();
    }

    async resetEpisode() {
        if (!window.confirm('Isso vai apagar a tentativa em andamento e o histórico deste episódio. Deseja continuar?')) return;
        repository.clearEpisode(this.profile, this.dialogEpisodeId);
        this.profile.updatedAt = Date.now();
        document.querySelector('#episode-dialog').close();
        await this.persistProgress();
        this.renderDashboard();
    }

    openReview() {
        const mistakes = Object.entries(this.profile.episodes || {}).flatMap(([episodeId, state]) =>
            Object.entries(state.mistakes || {}).map(([id, mistake]) => ({ id, episodeId, ...mistake }))
        ).sort((a, b) => b.count - a.count).slice(0, 25);
        const list = document.querySelector('#review-list');
        list.innerHTML = mistakes.length
            ? mistakes.map((mistake) => `<article class="review-card"><div><strong>${this.escape(mistake.word)}</strong><span>${CATEGORY_LABELS[mistake.category] || 'Vocabulário'} · ${this.episodeLabel(mistake.episodeId)}</span></div><span class="mistake-count">${mistake.count} ${mistake.count === 1 ? 'erro' : 'erros'}</span></article>`).join('')
            : '<p class="empty-state">Ainda não há palavras para revisar. Continue praticando!</p>';
        document.querySelector('#review-dialog').showModal();
    }

    openHistory() {
        const attempts = Object.entries(this.profile.episodes || {}).flatMap(([episodeId, state]) =>
            (state.attempts || [])
                .filter((attempt) => attempt.scope === 'episode' || (attempt.scope == null && (attempt.filterCategory || attempt.category || 'all') === 'all'))
                .map((attempt) => ({ episodeId, ...attempt }))
        ).sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0));
        document.querySelector('#history-list').innerHTML = attempts.length
            ? attempts.map((attempt) => `<article class="history-card"><div><strong>${this.episodeLabel(attempt.episodeId || episodeId)}</strong><span>${CATEGORY_LABELS[attempt.filterCategory || attempt.category] || 'Todas as categorias'} · ${new Date(attempt.completedAt).toLocaleDateString('pt-BR')}</span></div><strong>${attempt.accuracy}% <span>· ✦ ${attempt.points}</span></strong></article>`).join('')
            : '<p class="empty-state">Suas tentativas concluídas vão aparecer aqui.</p>';
        document.querySelector('#history-dialog').showModal();
    }

    episodeLabel(episodeId) {
        const index = this.episodes.findIndex((episode, episodeIndex) => getEpisodeId(episode, episodeIndex) === episodeId);
        return index < 0 ? 'Episódio' : `Episódio ${String(index + 1).padStart(2, '0')} · ${EPISODE_TITLES[index] || ''}`;
    }

    exportBackup() {
        const file = new Blob([JSON.stringify(this.profile, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = `english-rosa-${this.profile.profileId}-backup.json`;
        link.click();
        URL.revokeObjectURL(url);
    }

    async importBackup(file) {
        if (!file) return;
        try {
            const backup = JSON.parse(await file.text());
            if (backup.version !== 1 || backup.profileId !== this.profile.profileId || !backup.episodes || typeof backup.episodes !== 'object') {
                throw new Error(`Este backup não pertence ao perfil ${this.activeProfile.name} ou possui formato inválido.`);
            }
            this.profile = mergeProfiles(this.profile, backup, this.profile.profileId);
            this.profile.updatedAt = Date.now();
            repository.replace(this.profile);
            await this.persistProgress();
            this.renderDashboard();
        } catch (error) {
            this.setSyncStatus(`Não foi possível importar o backup: ${error.message}`, 'local');
        } finally {
            document.querySelector('#import-file').value = '';
        }
    }

    escape(value) {
        return String(value).replace(/[&<>"']/g, (character) => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]);
    }
}

const app = new EnglishRoSaApp();
app.init();
