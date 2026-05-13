import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';

export default {
  name: 'ComingSoonPage',
  setup() {
    const route = useRoute();
    const { t } = useI18n();
    const sectionTitle = computed(() => t(route.meta.sectionKey || 'dashboard'));
    return { t, sectionTitle };
  },
  template: `
    <section class="content-card reserved-card" aria-labelledby="reserved-title">
      <span class="eyebrow">{{ sectionTitle }}</span>
      <h1 id="reserved-title">{{ t('comingSoonTitle') }}</h1>
      <p>{{ t('comingSoonText') }}</p>
    </section>`
};
