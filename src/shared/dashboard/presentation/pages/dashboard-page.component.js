import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

export default {
  name: 'DashboardPage',
  setup() {
    const { t } = useI18n();

    const teamCards = computed(() => [
      { role: t('personOne'), task: t('personOneTask'), icon: 'pi pi-sitemap' },
      { role: t('personTwo'), task: t('personTwoTask'), icon: 'pi pi-user' },
      { role: t('personThree'), task: t('personThreeTask'), icon: 'pi pi-wifi' },
      { role: t('personFour'), task: t('personFourTask'), icon: 'pi pi-bell' },
      { role: t('personFive'), task: t('personFiveTask'), icon: 'pi pi-credit-card' }
    ]);

    return { t, teamCards };
  },
  template: `
    <section class="dashboard-page" aria-labelledby="dashboard-title">
      <div class="hero-card">
        <div>
          <span class="eyebrow">{{ t('baseVersion') }}</span>
          <h1 id="dashboard-title">{{ t('dashboardTitle') }}</h1>
          <p>{{ t('dashboardIntro') }}</p>
        </div>
        <img src="/images/bannerinicio.png" alt="SmartGas safety monitoring dashboard" />
      </div>

      <section class="content-card" aria-labelledby="git-ready-title">
        <span class="eyebrow">Git</span>
        <h2 id="git-ready-title">{{ t('gitReady') }}</h2>
        <p>{{ t('gitReadyText') }}</p>
      </section>

      <section class="content-card" aria-labelledby="team-title">
        <span class="eyebrow">TB1</span>
        <h2 id="team-title">{{ t('teamStructure') }}</h2>
        <div class="team-grid">
          <article v-for="card in teamCards" :key="card.role" class="team-card">
            <i :class="card.icon" aria-hidden="true"></i>
            <h3>{{ card.role }}</h3>
            <p>{{ card.task }}</p>
          </article>
        </div>
      </section>
    </section>`
};
