import { createI18n } from 'vue-i18n';
import en from '../locales/en.json';
import es from '../locales/es.json';

const savedLocale = localStorage.getItem('smartgas-locale') || 'en';

export default createI18n({
  legacy: false,
  locale: savedLocale,
  fallbackLocale: 'en',
  messages: { en, es }
});
