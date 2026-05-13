import { useI18n } from 'vue-i18n';

export default {
  name: 'LanguageSwitcher',
  setup() {
    const { locale, t } = useI18n();

    const changeLanguage = (value) => {
      locale.value = value;
      localStorage.setItem('smartgas-locale', value);
      document.documentElement.lang = value;
    };

    return { locale, t, changeLanguage };
  },
  template: `
    <div class="language-switcher" :aria-label="t('language')">
      <button type="button" :class="{ active: locale === 'en' }" @click="changeLanguage('en')">EN</button>
      <button type="button" :class="{ active: locale === 'es' }" @click="changeLanguage('es')">ES</button>
    </div>`
};
