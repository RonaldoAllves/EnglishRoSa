import {
    CATEGORIES,
    PROFILES,
    PracticeAttempt,
    createQuestionBank,
    createReviewQuestions,
    getEpisodeSummary,
    getProfileSummary,
    getReviewItems,
    profileMistakeKey
} from './domain.js?v=__BUILD_VERSION__';
import { EpisodeRepository, ProfileRepository } from './repositories.js?v=__BUILD_VERSION__';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
})[character]);

const formatDate = (timestamp) => timestamp
    ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(timestamp)
    : 'Data indisponível';

const episodeNumber = (episodeId) => Number(episodeId.match(/e(\d+)$/i)?.[1] || 0);

class EnglishRoSaApp {
    constructor() {
        this.main = document.querySelector('#app-content');
        this.syncStatusElement = document.querySelector('#sync-status');
        this.profileChip = document.querySelector('#profile-chip');
        this.versionButton = document.querySelector('#version-status');
        this.notice = document.querySelector('#notice');
        this.backupInput = document.querySelector('#backup-file');
        this.episodeRepository = new EpisodeRepository();
        this.profileRepository = new ProfileRepository();
        this.catalog = null;
        this.profile = null;
        this.profileId = null;
        this.currentEpisodeId = null;
        this.focusCategory = 'all';
        this.screen = 'profiles';
        this.session = null;
        this.sessionMode = 'attempt';
        this.feedback = null;
        this.resultAttempt = null;
        this.isReviewResult = false;
        this.syncError = null;
        this.noticeTimer = null;
        this.autoAdvanceTimer = null;
        const buildVersion = document.documentElement.dataset.buildVersion;
        this.buildVersion = buildVersion && !/^__[A-Z_]+__$/.test(buildVersion)
            ? buildVersion
            : 'development';
        this.latestVersion = null;
    }

    async start() {
        this.bindEvents();
        try {
            this.catalog = await this.episodeRepository.load();
            this.render();
            await this.checkVersion();
        } catch (error) {
            console.error('Não foi possível iniciar o English RoSa.', error);
            this.main.innerHTML = `
                <section class="error-panel">
                    <strong>Não foi possível abrir o aplicativo.</strong><br>
                    ${escapeHtml(error.message)}
                </section>`;
        }
    }

    bindEvents() {
        document.body.addEventListener('click', (event) => {
            const button = event.target.closest('[data-action]');
            if (!button || button.disabled) return;
            this.handleAction(button).catch((error) => this.showError(error));
        });

        document.body.addEventListener('change', (event) => {
            if (event.target === this.backupInput) {
                this.importBackup().catch((error) => this.showError(error));
            }
        });
    }

    async handleAction(button) {
        const { action } = button.dataset;
        switch (action) {
            case 'home':
            case 'back':
                this.goBack();
                break;
            case 'select-profile':
                await this.selectProfile(button.dataset.profile);
                break;
            case 'show-profiles':
                this.profile = null;
                this.profileId = null;
                this.screen = 'profiles';
                this.render();
                break;
            case 'select-episode':
                this.currentEpisodeId = button.dataset.episode;
                const activeAttempt = this.profile?.episodes?.[this.currentEpisodeId]?.activeAttempt;
                const savedCategory = activeAttempt?.filterCategory;
                this.focusCategory = savedCategory === 'all' ||
                    CATEGORIES.some((category) => category.key === savedCategory)
                    ? savedCategory
                    : 'all';
                this.screen = 'episode';
                this.render();
                break;
            case 'continue-active':
                await this.continueLatestAttempt();
                break;
            case 'continue-attempt':
                await this.beginAttempt(true);
                break;
            case 'select-category':
                if (button.dataset.category !== 'all' &&
                    !CATEGORIES.some((category) => category.key === button.dataset.category)) {
                    throw new Error('Categoria inicial inválida.');
                }
                this.focusCategory = button.dataset.category;
                this.render();
                break;
            case 'new-attempt':
                await this.beginAttempt(false);
                break;
            case 'answer':
                await this.answerCurrentQuestion(Number(button.dataset.choiceIndex));
                break;
            case 'next':
                await this.advanceSession();
                break;
            case 'show-history':
                this.screen = 'history';
                this.render();
                break;
            case 'show-result':
                this.showSavedResult(button.dataset.attemptId);
                break;
            case 'show-review':
                this.screen = 'review';
                this.session = null;
                this.feedback = null;
                this.render();
                break;
            case 'start-review':
                this.beginReview();
                break;
            case 'reset-episode':
                await this.resetEpisode();
                break;
            case 'export-backup':
                this.exportBackup();
                break;
            case 'import-backup':
                this.backupInput.click();
                break;
            case 'check-version':
                if (this.latestVersion && this.latestVersion !== this.buildVersion) {
                    const refreshUrl = new URL(window.location.href);
                    refreshUrl.searchParams.set('refresh', Date.now().toString());
                    window.location.replace(refreshUrl.href);
                } else {
                    await this.checkVersion();
                }
                break;
            default:
                break;
        }
    }

    async selectProfile(profileId) {
        const profile = PROFILES.find((item) => item.id === profileId);
        if (!profile) throw new Error('Perfil inválido.');
        this.setSyncStatus('loading', 'Carregando progresso...');
        const result = await this.profileRepository.load(profileId);
        this.profileId = profileId;
        this.profile = result.profile;
        this.setSyncStatusFromError(result.syncError);
        this.screen = 'dashboard';
        this.currentEpisodeId = null;
        this.render();
    }

    async continueLatestAttempt() {
        const summary = getProfileSummary(this.profile);
        if (!summary.activeEpisodeId) return;
        this.currentEpisodeId = summary.activeEpisodeId;
        await this.beginAttempt(true);
    }

    async beginAttempt(continueExisting) {
        const episode = this.currentEpisode();
        const state = this.episodeState(episode.episodio);
        if (continueExisting) {
            if (!state.activeAttempt) throw new Error('Não há tentativa pendente para continuar.');
            this.session = new PracticeAttempt(state.activeAttempt);
            const addedQuestions = this.session.reconcile(episode);
            if (this.focusCategory !== 'all' &&
                this.session.isCategoryComplete(this.focusCategory)) {
                if (addedQuestions) {
                    state.activeAttempt = this.session.toJSON();
                    state.updatedAt = Date.now();
                    await this.persistProfile();
                }
                const categoryLabel = CATEGORIES.find((category) =>
                    category.key === this.focusCategory
                )?.label || this.focusCategory;
                this.showNotice(`${categoryLabel} já está concluída nesta tentativa.`);
                return;
            }
            const reorderedQuestions = this.session.prioritizeRemaining(this.focusCategory);
            this.sessionMode = 'attempt';
            state.activeAttempt = this.session.toJSON();
            state.updatedAt = Date.now();
            if (addedQuestions || reorderedQuestions) await this.persistProfile();
        } else {
            if (state.activeAttempt &&
                !window.confirm('Começar uma nova tentativa? O progresso pendente deste episódio será substituído.')) {
                return;
            }
            this.session = PracticeAttempt.create(episode, this.focusCategory);
            this.sessionMode = 'attempt';
            this.feedback = null;
            state.activeAttempt = this.session.toJSON();
            state.updatedAt = Date.now();
            await this.persistProfile();
        }
        this.feedback = null;
        this.screen = 'quiz';
        this.render();
    }

    async answerCurrentQuestion(choiceIndex) {
        if (!this.session || this.feedback) return;
        const question = this.session.currentQuestion;
        const choice = question?.choices[choiceIndex];
        if (choice === undefined) throw new Error('A alternativa selecionada não está disponível.');
        const { answer } = this.session.answer(choice);
        this.feedback = answer;

        if (this.sessionMode === 'attempt') {
            const state = this.episodeState(this.currentEpisodeId);
            state.activeAttempt = this.session.toJSON();
            state.updatedAt = Date.now();
            if (!answer.correct) {
                const key = profileMistakeKey(answer.category, answer.itemId);
                const current = state.mistakes[key];
                state.mistakes[key] = {
                    category: answer.category,
                    itemId: answer.itemId,
                    item: answer.item,
                    errors: (current?.errors || 0) + 1,
                    updatedAt: Date.now()
                };
            }
        }

        this.render();
        if (this.sessionMode === 'attempt') await this.persistProfile();
        if (this.screen === 'quiz' && this.feedback === answer) {
            this.autoAdvanceTimer = window.setTimeout(() => {
                this.autoAdvanceTimer = null;
                this.advanceSession().catch((error) => this.showError(error));
            }, 900);
        }
    }

    async advanceSession() {
        if (!this.session || !this.feedback) return;
        window.clearTimeout(this.autoAdvanceTimer);
        this.autoAdvanceTimer = null;
        if (this.session.isComplete) {
            if (this.sessionMode === 'review') {
                this.resultAttempt = {
                    ...this.session.toJSON(),
                    ...this.session.summary(),
                    completedAt: Date.now()
                };
                this.isReviewResult = true;
                this.screen = 'result';
                this.render();
            } else {
                await this.completeAttempt();
            }
            return;
        }
        if (this.sessionMode === 'attempt' && this.session.isAtFocusedCategoryBoundary) {
            this.feedback = null;
            this.screen = 'episode';
            this.render();
            return;
        }
        this.feedback = null;
        this.render();
    }

    async completeAttempt() {
        const now = Date.now();
        const completedAttempt = {
            ...this.session.toJSON(),
            ...this.session.summary(),
            mode: 'attempt',
            scope: 'episode',
            episodeId: this.currentEpisodeId,
            completedAt: now,
            updatedAt: now
        };
        const state = this.episodeState(this.currentEpisodeId);
        state.attempts = [
            ...state.attempts.filter((attempt) => attempt.id !== completedAttempt.id),
            completedAttempt
        ];
        state.activeAttempt = null;
        state.updatedAt = now;
        this.resultAttempt = completedAttempt;
        this.isReviewResult = false;
        this.session = null;
        this.feedback = null;
        this.screen = 'result';
        this.render();
        await this.persistProfile();
    }

    beginReview() {
        const state = this.episodeState(this.currentEpisodeId);
        if (!state.attempts.some((attempt) => attempt.completedAt)) {
            throw new Error('Conclua uma tentativa do episódio antes de iniciar uma revisão.');
        }
        const questions = createReviewQuestions(this.currentEpisode(), state.mistakes);
        this.session = PracticeAttempt.review(questions);
        this.sessionMode = 'review';
        this.feedback = null;
        if (!questions.length) {
            this.screen = 'review';
            this.render();
            this.showNotice('Nenhuma palavra com erro registrada neste episódio.');
            return;
        }
        this.screen = 'quiz';
        this.render();
    }

    showSavedResult(attemptId) {
        const attempt = this.episodeState(this.currentEpisodeId).attempts
            .find((item) => item.id === attemptId);
        if (!attempt) throw new Error('O resultado selecionado não está mais disponível.');
        this.resultAttempt = attempt;
        this.isReviewResult = false;
        this.screen = 'result';
        this.render();
    }

    async resetEpisode() {
        if (!window.confirm('Apagar o progresso, as tentativas e as palavras com erro deste episódio?')) {
            return;
        }
        delete this.profile.episodes[this.currentEpisodeId];
        this.profile.updatedAt = Date.now();
        const result = await this.profileRepository.save(this.profile);
        this.setSyncStatusFromError(result.syncError);
        this.screen = 'episode';
        this.session = null;
        this.render();
    }

    async persistProfile() {
        this.profile.updatedAt = Date.now();
        const result = await this.profileRepository.save(this.profile);
        this.profile = result.profile;
        this.setSyncStatusFromError(result.syncError);
    }

    async importBackup() {
        const file = this.backupInput.files?.[0];
        if (!file) return;
        try {
            if (!this.profileId) throw new Error('Escolha um perfil antes de importar um backup.');
            const backup = this.profileRepository.parseBackup(
                await file.text(),
                this.profileId
            );
            if (!window.confirm('Substituir todo o progresso deste perfil pelo conteúdo do backup?')) {
                return;
            }
            const result = await this.profileRepository.replaceProfile(backup);
            this.profile = result.profile;
            this.setSyncStatusFromError(result.syncError);
            this.currentEpisodeId = null;
            this.session = null;
            this.screen = 'dashboard';
            this.render();
            this.showNotice('Backup importado.');
        } finally {
            this.backupInput.value = '';
        }
    }

    exportBackup() {
        if (!this.profile) throw new Error('Escolha um perfil antes de exportar o backup.');
        const data = JSON.stringify(this.profile, null, 2);
        const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `english-rosa-${this.profileId}-backup.json`;
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        this.showNotice('Backup exportado.');
    }

    goBack() {
        window.clearTimeout(this.autoAdvanceTimer);
        this.autoAdvanceTimer = null;
        switch (this.screen) {
            case 'dashboard':
                this.profile = null;
                this.profileId = null;
                this.screen = 'profiles';
                break;
            case 'episode':
                this.currentEpisodeId = null;
                this.screen = 'dashboard';
                break;
            case 'quiz':
                this.feedback = null;
                this.session = null;
                this.screen = 'episode';
                break;
            case 'history':
            case 'review':
                this.screen = 'episode';
                break;
            case 'result':
                this.screen = this.isReviewResult ? 'review' : 'episode';
                break;
            default:
                this.screen = 'profiles';
                break;
        }
        this.render();
    }

    currentEpisode() {
        const episode = this.catalog?.episodios.find((item) =>
            item.episodio === this.currentEpisodeId
        );
        if (!episode) throw new Error('O episódio selecionado não está disponível.');
        return episode;
    }

    episodeState(episodeId) {
        this.profile.episodes ||= {};
        this.profile.episodes[episodeId] ||= {
            updatedAt: Date.now(),
            attempts: [],
            activeAttempt: null,
            mistakes: {}
        };
        const state = this.profile.episodes[episodeId];
        state.attempts ||= [];
        state.mistakes ||= {};
        return state;
    }

    render() {
        if (!this.catalog) return;
        const renderers = {
            profiles: () => this.renderProfiles(),
            dashboard: () => this.renderDashboard(),
            episode: () => this.renderEpisode(),
            quiz: () => this.renderQuiz(),
            history: () => this.renderHistory(),
            review: () => this.renderReview(),
            result: () => this.renderResult()
        };
        this.main.classList.toggle('profile-selection', this.screen === 'profiles');
        this.main.innerHTML = renderers[this.screen]();
        this.updateHeader();
    }

    renderProfiles() {
        return `
            <section class="profile-screen">
                <section class="profile-section" aria-labelledby="profile-title">
                    <div class="section-heading">
                        <div>
                            <h2 id="profile-title">Quem vai estudar?</h2>
                        </div>
                    </div>
                    <div class="profile-grid">
                        ${PROFILES.map((profile, index) => `
                            <button class="profile-card ${index ? 'lavender' : ''}" type="button"
                                data-action="select-profile" data-profile="${profile.id}">
                                <span class="profile-avatar" aria-hidden="true">${profile.name[0]}</span>
                                <span class="profile-copy">
                                    <strong>${profile.name}</strong>
                                    <span>Acessar meu progresso</span>
                                </span>
                            </button>`).join('')}
                    </div>
                </section>
            </section>`;
    }

    renderDashboard() {
        const profileName = PROFILES.find((item) => item.id === this.profileId)?.name || '';
        const summary = getProfileSummary(this.profile);
        const activeEpisode = this.catalog.episodios.find((episode) =>
            episode.episodio === summary.activeEpisodeId
        );
        const episodeCards = this.catalog.episodios.map((episode) => {
            const progress = getEpisodeSummary(this.profile, episode.episodio);
            const categories = CATEGORIES.filter((category) =>
                Array.isArray(episode[category.key]) && episode[category.key].length
            );
            const itemCount = categories.reduce((total, category) =>
                total + episode[category.key].length, 0
            );
            const status = progress.active
                ? 'Tentativa em andamento'
                : progress.attempts.length
                    ? `${progress.attempts.length} ${progress.attempts.length === 1 ? 'tentativa' : 'tentativas'} · ${progress.bestAttempt.points || 0} pts`
                    : `${categories.length} categorias · ${itemCount} itens`;
            return `
                <button class="episode-card ${progress.active ? 'has-active' : ''}" type="button"
                    data-action="select-episode" data-episode="${escapeHtml(episode.episodio)}">
                    <span class="episode-number">E${String(episodeNumber(episode.episodio)).padStart(2, '0')}</span>
                    <span class="episode-copy">
                        <span class="episode-title">${escapeHtml(episode.episodio.toUpperCase())}</span>
                        <span class="episode-subtitle">${escapeHtml(status)}</span>
                        <span class="episode-progress" aria-label="${progress.progress}% concluído">
                            <span style="width:${progress.progress}%"></span>
                        </span>
                    </span>
                    <span class="episode-action">${progress.active ? 'Continuar' : 'Abrir'} →</span>
                </button>`;
        }).join('');

        return `
            <section class="dashboard-screen">
                <div class="dashboard-hero">
                    <div class="hero-copy">
                        <span class="eyebrow">The Big Bang Theory · Temporada 1</span>
                        <h1>Olá, ${escapeHtml(profileName)}.</h1>
                        <p>Um pouco de inglês, uma cena de cada vez.</p>
                        ${activeEpisode ? `
                            <button class="button button-light" type="button" data-action="continue-active">
                                Continuar ${escapeHtml(activeEpisode.episodio.toUpperCase())}
                            </button>` : ''}
                    </div>
                    <div class="hero-decoration" aria-hidden="true">
                        <span>learn</span><span>English</span><i>R</i>
                    </div>
                </div>
                <div class="stats-grid" aria-label="Resumo do perfil">
                    <div class="stat-card">
                        <span class="stat-value">${summary.completedEpisodes}/${this.catalog.episodios.length}</span>
                        <span class="stat-label">episódios concluídos</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${summary.attempts}</span>
                        <span class="stat-label">tentativas concluídas</span>
                    </div>
                    <div class="stat-card">
                        <span class="stat-value">${summary.points}</span>
                        <span class="stat-label">pontos acumulados</span>
                    </div>
                </div>
                <section aria-labelledby="episodes-title">
                    <div class="section-heading episode-heading">
                        <div>
                            <h2 id="episodes-title">Episódios disponíveis</h2>
                        </div>
                    </div>
                    <div class="episodes-grid">${episodeCards}</div>
                </section>
                <footer class="dashboard-footer">
                    <div>
                        <button class="text-button" type="button" data-action="export-backup">Exportar backup</button>
                        <button class="text-button" type="button" data-action="import-backup">Importar backup</button>
                    </div>
                </footer>
            </section>`;
    }

    renderEpisode() {
        const episode = this.currentEpisode();
        const summary = getEpisodeSummary(this.profile, episode.episodio);
        const questions = createQuestionBank(episode, () => 0);
        const availableCategories = CATEGORIES.filter((category) =>
            questions.some((question) => question.category === category.key)
        );
        const questionCounts = Object.fromEntries(availableCategories.map((category) => [
            category.key,
            questions.filter((question) => question.category === category.key).length
        ]));
        const activeAttemptSummary = summary.active
            ? new PracticeAttempt(summary.active).summary()
            : null;
        const breakdown = activeAttemptSummary?.breakdown || summary.bestAttempt?.breakdown || {};
        const allSummary = activeAttemptSummary || summary.bestAttempt;
        const allPercentage = allSummary?.total
            ? Math.round(((activeAttemptSummary
                ? allSummary.answered
                : allSummary.correct) / allSummary.total) * 100)
            : 0;
        const allProgressLabel = activeAttemptSummary
            ? `${allSummary.answered}/${allSummary.total} concluídos · ${allSummary.correct} acertos nesta tentativa`
            : summary.bestAttempt
                ? `${allSummary.correct}/${allSummary.total} acertos na melhor tentativa`
                : 'Ainda sem resultado';
        const allCategoryCard = `
            <button class="category-card ${this.focusCategory === 'all' ? 'is-selected' : ''}"
                type="button" data-action="select-category" data-category="all"
                aria-pressed="${this.focusCategory === 'all'}">
                <h3>Todas</h3>
                <p>${questions.length} exercícios · ordem aleatória</p>
                <div class="progress-track" aria-label="${allPercentage}% da tentativa respondidos">
                    <span style="width:${allPercentage}%"></span>
                </div>
                <span class="category-progress-label">${allProgressLabel}</span>
            </button>`;
        const categoryCards = availableCategories.map((category) => {
            const categorySummary = breakdown[category.key];
            const percentage = categorySummary?.total
                ? Math.round(((summary.active ? categorySummary.answered : categorySummary.correct) /
                    categorySummary.total) * 100)
                : 0;
            const progressLabel = categorySummary
                ? summary.active
                    ? `${categorySummary.answered}/${categorySummary.total} concluídos · ${categorySummary.correct} acertos nesta tentativa`
                    : `${categorySummary.correct}/${categorySummary.total} acertos na melhor tentativa`
                : 'Ainda sem resultado';
            return `
                <button class="category-card ${this.focusCategory === category.key ? 'is-selected' : ''}"
                    type="button" data-action="select-category" data-category="${category.key}"
                    aria-pressed="${this.focusCategory === category.key}">
                    <h3>${category.label}</h3>
                    <p>${questionCounts[category.key]} exercícios · ${episode[category.key].length} itens</p>
                    <div class="progress-track" aria-label="${percentage}% ${summary.active ? 'da categoria respondidos' : 'de acerto na melhor tentativa'}">
                        <span style="width:${percentage}%"></span>
                    </div>
                    <span class="category-progress-label">${progressLabel}</span>
                </button>`;
        }).join('');
        const attempts = summary.attempts;
        const incomplete = availableCategories.length < CATEGORIES.length;
        const actions = summary.active
            ? `<button class="button button-primary" type="button" data-action="continue-attempt">Continuar tentativa · ${summary.activeProgress}%</button>
               <button class="button button-secondary" type="button" data-action="new-attempt">Começar nova tentativa</button>`
            : `<button class="button button-primary" type="button" data-action="new-attempt">Iniciar tentativa</button>`;

        return `
            <section>
                <header class="view-header">
                    <div>
                        <h1 class="episode-series-heading">${escapeHtml(this.catalog.serie)} · Temporada ${this.catalog.temporada}</h1>
                    </div>
                    <button class="back-button" type="button" data-action="back">← Episódios</button>
                </header>
                ${incomplete ? `
                    <p class="incomplete-note">Este episódio ainda está sendo preenchido. As categorias sem conteúdo aparecerão aqui quando forem adicionadas.</p>` : ''}
                <section class="section-block" aria-labelledby="categories-title">
                    <div class="section-heading">
                        <div>
                            <h2 id="categories-title">Escolha por onde começar</h2>
                        </div>
                    </div>
                    <div class="category-grid">${allCategoryCard}${categoryCards}</div>
                </section>
                <div class="action-row">
                    ${actions}
                    <button class="button button-quiet" type="button" data-action="show-history" ${attempts.length ? '' : 'disabled'}>
                        Histórico de tentativas
                    </button>
                    <button class="button button-quiet" type="button" data-action="show-review" ${attempts.length ? '' : 'disabled'}>
                        Revisar palavras com erros
                    </button>
                    <button class="button button-quiet button-danger" type="button" data-action="reset-episode"
                        ${this.profile.episodes[episode.episodio] ? '' : 'disabled'}>
                        Zerar episódio
                    </button>
                </div>
            </section>`;
    }

    renderQuiz() {
        if (!this.session) {
            return '<section class="error-panel">Não há uma sessão de exercícios ativa.</section>';
        }
        const answers = this.session.data.answers;
        const shownAnswer = this.feedback;
        const question = shownAnswer
            ? this.session.data.questions.find((item) => item.id === shownAnswer.questionId)
            : this.session.currentQuestion;
        if (!question) {
            return '<section class="error-panel">Não foi possível localizar o exercício atual.</section>';
        }
        const summary = this.session.summary();
        const category = CATEGORIES.find((item) => item.key === question.category);
        const correctChoiceIndex = question.choices.indexOf(question.answer);
        const answeredChoiceIndex = shownAnswer
            ? question.choices.indexOf(shownAnswer.choice)
            : -1;
        const instruction = question.kind === 'sentence'
            ? 'Escolha a tradução em português para esta frase.'
            : 'Escolha a tradução em português.';
        const choices = question.choices.map((choice, index) => {
            let stateClass = '';
            if (shownAnswer && index === correctChoiceIndex) stateClass = 'correct';
            else if (shownAnswer && index === answeredChoiceIndex) stateClass = 'incorrect';
            return `
                <button class="answer-option ${stateClass}" type="button" data-action="answer"
                    data-choice-index="${index}" ${shownAnswer ? 'disabled' : ''}>
                    <span class="answer-letter">${String.fromCharCode(65 + index)}</span>
                    <span>${escapeHtml(choice)}</span>
                </button>`;
        }).join('');
        const feedback = shownAnswer ? `
            <div class="answer-feedback ${shownAnswer.correct ? 'is-correct' : 'is-incorrect'}" role="status">
                ${shownAnswer.correct
                    ? 'Resposta correta.'
                    : `A tradução correta é: <strong>${escapeHtml(question.answer)}</strong>.`}
            </div>
            <div class="practice-next">
                <span role="status">
                    ${this.session.isComplete
                        ? 'Exibindo resultado...'
                        : this.sessionMode === 'attempt' && this.session.isAtFocusedCategoryBoundary
                            ? 'Voltando à escolha de categoria...'
                            : 'Próximo exercício...'}
                </span>
            </div>` : '';
        const modeLabel = this.sessionMode === 'review'
            ? 'Revisão · não contabiliza na tentativa'
            : `Tentativa do episódio · ${category?.label || ''}`;
        const pointsLabel = this.sessionMode === 'review' ? 'Revisão' : `${summary.points} pts`;

        return `
            <section class="practice-screen">
                <div class="practice-topbar">
                    <button class="icon-button" type="button" data-action="back" aria-label="Voltar e salvar progresso">←</button>
                    <div class="practice-progress">
                        <div class="practice-progress-copy">
                            <span>Exercício ${shownAnswer ? answers.length : answers.length + 1} de ${this.session.data.questions.length}</span>
                            <span>${this.session.progress}%</span>
                        </div>
                        <div class="progress-track" role="progressbar"
                            aria-valuenow="${this.session.progress}" aria-valuemin="0" aria-valuemax="100">
                            <span style="width:${this.session.progress}%"></span>
                        </div>
                    </div>
                    <span class="practice-points">${pointsLabel}</span>
                </div>
                <div class="practice-content">
                    <span class="question-badge">${escapeHtml(modeLabel)}</span>
                    <p class="question-instruction">${instruction}</p>
                    <div class="question-card">
                        <span class="question-type">${question.kind === 'sentence' ? 'Frase do episódio' : category?.label || 'Vocabulário'}</span>
                        <h1>${escapeHtml(question.prompt)}</h1>
                        ${question.example ? `<p class="question-example">${escapeHtml(question.example)}</p>` : ''}
                    </div>
                    <div class="answer-options">${choices}</div>
                    ${feedback}
                    <div class="practice-footer">
                        <span>${summary.correct} acertos</span>
                        <span>${summary.incorrect} erros</span>
                    </div>
                </div>
            </section>`;
    }

    renderHistory() {
        const summary = getEpisodeSummary(this.profile, this.currentEpisodeId);
        const history = [...summary.attempts].sort((left, right) =>
            (right.completedAt || 0) - (left.completedAt || 0)
        );
        const rows = history.map((attempt, index) => `
            <article class="history-card">
                <div>
                    <strong>Tentativa ${history.length - index}</strong>
                    <span>${escapeHtml(formatDate(attempt.completedAt))} · ${attempt.correct}/${attempt.total} acertos</span>
                </div>
                <button class="button button-quiet" type="button" data-action="show-result"
                    data-attempt-id="${escapeHtml(attempt.id)}">
                    ${attempt.accuracy || 0}% · ${attempt.points || 0} pts
                </button>
            </article>`).join('');
        return `
            <section>
                <header class="view-header">
                    <div>
                        <span class="eyebrow">${escapeHtml(this.currentEpisodeId.toUpperCase())}</span>
                        <h1>Histórico de tentativas</h1>
                        <p>Compare seus resultados e abra uma tentativa para ver os acertos por categoria.</p>
                    </div>
                    <button class="back-button" type="button" data-action="back">← Episódio</button>
                </header>
                <div class="history-list">${rows || '<div class="empty-state"><p>Nenhuma tentativa concluída ainda.</p></div>'}</div>
            </section>`;
    }

    renderReview() {
        const summary = getEpisodeSummary(this.profile, this.currentEpisodeId);
        const items = getReviewItems(this.profile, this.currentEpisodeId);
        const rows = items.map((item) => `
            <article class="review-card">
                <div>
                    <strong>${escapeHtml(item.item)}</strong>
                    <span>${escapeHtml(CATEGORIES.find((category) => category.key === item.category)?.label || item.category)}</span>
                </div>
                <span class="mistake-count">${item.errors} ${item.errors === 1 ? 'erro' : 'erros'}</span>
            </article>`).join('');
        return `
            <section>
                <header class="view-header">
                    <div>
                        <span class="eyebrow">${escapeHtml(this.currentEpisodeId.toUpperCase())}</span>
                        <h1>Palavras para revisar</h1>
                        <p>Os itens com mais erros aparecem primeiro. A revisão não altera tentativas nem pontuação.</p>
                    </div>
                    <button class="back-button" type="button" data-action="back">← Episódio</button>
                </header>
                ${summary.attempts.length ? `
                    <div class="action-row">
                        <button class="button button-primary" type="button" data-action="start-review" ${items.length ? '' : 'disabled'}>
                            Iniciar revisão
                        </button>
                    </div>` : ''}
                <div class="review-list">
                    ${rows || '<div class="empty-state"><p>Nenhum erro registrado neste episódio. Complete uma tentativa e os itens que precisarem de atenção aparecerão aqui.</p></div>'}
                </div>
            </section>`;
    }

    renderResult() {
        const attempt = this.resultAttempt;
        if (!attempt) return '<section class="error-panel">O resultado solicitado não está disponível.</section>';
        const isReview = this.isReviewResult;
        const breakdown = attempt.breakdown || {};
        const categoryRows = Object.entries(breakdown).map(([key, result]) => `
            <div class="breakdown-row">
                <span>${escapeHtml(CATEGORIES.find((category) => category.key === key)?.label || key)}</span>
                <span>${result.correct} acertos · ${result.incorrect} erros · ${result.answered}/${result.total}</span>
                <strong>${result.answered ? Math.round((result.correct / result.answered) * 100) : 0}%</strong>
            </div>`).join('');

        return `
            <section class="result-panel">
                <header class="result-heading">
                    <div>
                        <span class="eyebrow">${isReview ? 'Sessão de revisão' : escapeHtml(this.currentEpisodeId?.toUpperCase() || '')}</span>
                        <h1>${isReview ? 'Revisão concluída' : 'Tentativa concluída'}</h1>
                        <p>${isReview ? 'Este resultado não foi somado ao seu progresso.' : escapeHtml(formatDate(attempt.completedAt))}</p>
                    </div>
                    ${isReview ? '' : `
                        <div class="result-score">
                            <strong>${attempt.points || 0}</strong>
                            <span>pontos</span>
                        </div>`}
                </header>
                <div class="result-stats">
                    <div class="result-stat positive"><span>Acertos</span><strong>${attempt.correct || 0}</strong></div>
                    <div class="result-stat negative"><span>Erros</span><strong>${attempt.incorrect || 0}</strong></div>
                    <div class="result-stat"><span>Precisão</span><strong>${attempt.accuracy || 0}%</strong></div>
                    <div class="result-stat"><span>Maior sequência</span><strong>${attempt.maxStreak || 0}</strong></div>
                </div>
                <h2 class="breakdown-title">Resultado por categoria</h2>
                <div>${categoryRows || '<div class="empty-state"><p>Não há resultado por categoria para esta revisão.</p></div>'}</div>
                <div class="result-actions">
                    ${isReview
                        ? '<button class="button button-primary" type="button" data-action="show-review">Voltar às palavras</button>'
                        : '<button class="button button-primary" type="button" data-action="back">Voltar ao episódio</button>'}
                    ${isReview ? '' : '<button class="button button-secondary" type="button" data-action="new-attempt">Nova tentativa</button>'}
                </div>
            </section>`;
    }

    updateHeader() {
        const profileName = PROFILES.find((profile) => profile.id === this.profileId)?.name;
        this.profileChip.hidden = !profileName;
        this.profileChip.textContent = profileName ? `${profileName} · trocar perfil` : '';
        this.profileChip.title = profileName ? 'Voltar à seleção de perfil' : '';
        this.syncStatusElement.dataset.state = this.syncError ? 'local' : this.profile ? 'synced' : 'loading';
        this.syncStatusElement.textContent = this.syncError
            ? 'Salvo neste dispositivo · Firebase indisponível'
            : this.profile ? 'Firebase sincronizado' : 'Escolha um perfil';
        this.syncStatusElement.title = this.syncError || 'Os dados são salvos localmente e sincronizados com o Firebase.';
    }

    setSyncStatus(state, message, detail = '') {
        this.syncStatusElement.dataset.state = state;
        this.syncStatusElement.textContent = message;
        this.syncStatusElement.title = detail || message;
    }

    setSyncStatusFromError(error) {
        this.syncError = error || null;
        this.updateHeader();
    }

    async checkVersion() {
        this.versionButton.hidden = true;
        this.versionButton.dataset.state = 'loading';
        try {
            const response = await fetch(`./version.json?check=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) throw new Error(`Resposta ${response.status}`);
            const data = await response.json();
            this.latestVersion = data.version || null;
            if (this.latestVersion && this.latestVersion !== this.buildVersion) {
                this.versionButton.dataset.state = 'update';
                this.versionButton.textContent = 'Atualizar aplicativo';
                this.versionButton.title = `Versão atual: ${this.buildVersion}. Nova versão: ${this.latestVersion}.`;
                this.versionButton.hidden = false;
            } else {
                this.versionButton.dataset.state = 'current';
                this.versionButton.title = 'O aplicativo está atualizado.';
            }
        } catch (error) {
            this.latestVersion = null;
            this.versionButton.dataset.state = 'unknown';
            this.versionButton.title = error.message;
        }
    }

    showNotice(message, state = 'info') {
        window.clearTimeout(this.noticeTimer);
        this.notice.textContent = message;
        this.notice.dataset.state = state;
        this.notice.hidden = false;
        this.noticeTimer = window.setTimeout(() => {
            this.notice.hidden = true;
        }, 5000);
    }

    showError(error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('A operação solicitada falhou.', error);
        this.showNotice(message, 'error');
    }
}

const app = new EnglishRoSaApp();
app.start().catch((error) => {
    console.error('Falha inesperada ao iniciar o English RoSa.', error);
    document.querySelector('#app-content').innerHTML = `
        <section class="error-panel">${escapeHtml(error.message)}</section>`;
});
