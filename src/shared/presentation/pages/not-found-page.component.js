import { useI18n } from 'vue-i18n';

export default {
  name: 'NotFoundPage',
  setup() {
    const { t } = useI18n();
    return { t };
  },
  template: `
    <main class="not-found-page">
      <section class="content-card">
        <span class="eyebrow">404</span>
        <h1>{{ t('notFoundTitle') }}</h1>
        <p>{{ t('notFoundText') }}</p>
        <router-link class="primary-link" to="/app/dashboard">{{ t('goDashboard') }}</router-link>
      </section>
    </main>`
};
