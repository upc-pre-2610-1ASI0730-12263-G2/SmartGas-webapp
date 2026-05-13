import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import LanguageSwitcher from './language-switcher.component.js';
import UserMenu from './user-menu.component.js';

export default {
  name: 'ToolbarContent',
  components: { LanguageSwitcher, UserMenu },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const { t } = useI18n();

    const navItems = computed(() => [
      { label: t('dashboard'), icon: 'pi pi-th-large', path: '/app/dashboard' },
      { label: t('monitoring'), icon: 'pi pi-eye', path: '/app/monitoring' },
      { label: t('devices'), icon: 'pi pi-wifi', path: '/app/devices' },
      { label: t('incidents'), icon: 'pi pi-exclamation-triangle', path: '/app/incidents' },
      { label: t('reports'), icon: 'pi pi-chart-bar', path: '/app/reports' },
      { label: t('subscription'), icon: 'pi pi-credit-card', path: '/app/subscription' }
    ]);

    const accountItems = computed(() => [
      { label: t('profile'), icon: 'pi pi-id-card', path: '/app/profile' },
      { label: t('settings'), icon: 'pi pi-cog', path: '/app/settings' }
    ]);

    const isActive = (path) => route.path === path || route.path.startsWith(path + '/');
    const goTo = (path) => router.push(path);

    return { t, navItems, accountItems, isActive, goTo };
  },
  template: `
    <aside class="sidebar" role="navigation" aria-label="Main sidebar navigation">
      <button class="sidebar-brand" type="button" @click="goTo('/app/dashboard')" aria-label="SmartGas dashboard">
        <img src="/images/logo.png" alt="SmartGas logo" class="sidebar-logo" />
        <span>{{ t('appName') }}</span>
      </button>

      <div class="sidebar-section-label">{{ t('mainPanel') }}</div>
      <nav class="sidebar-nav" aria-label="Application modules">
        <button
          v-for="item in navItems"
          :key="item.path"
          type="button"
          class="sidebar-link"
          :class="{ active: isActive(item.path) }"
          :aria-current="isActive(item.path) ? 'page' : undefined"
          @click="goTo(item.path)">
          <i :class="item.icon" aria-hidden="true"></i>
          <span>{{ item.label }}</span>
        </button>
      </nav>

      <div class="sidebar-section-label account-label">Account</div>
      <nav class="sidebar-nav" aria-label="Account modules">
        <button
          v-for="item in accountItems"
          :key="item.path"
          type="button"
          class="sidebar-link"
          :class="{ active: isActive(item.path) }"
          :aria-current="isActive(item.path) ? 'page' : undefined"
          @click="goTo(item.path)">
          <i :class="item.icon" aria-hidden="true"></i>
          <span>{{ item.label }}</span>
        </button>
      </nav>
    </aside>

    <header class="app-topbar" role="banner">
      <div class="top-context">
        <i class="pi pi-shield" aria-hidden="true"></i>
        <span>{{ t('topbarContext') }}</span>
      </div>
      <div class="topbar-right">
        <LanguageSwitcher />
        <UserMenu />
      </div>
    </header>`
};
