import { onMounted, ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { settingsStore } from '../../application/settings.store.js';
import { SessionService } from '../../../../shared/infrastructure/session.service.js';
import { trZone } from '../../../../shared/utils/domain-translations.js';

export default {
  name: 'SettingsPage',
  setup() {
    const { t, locale } = useI18n();
    const router = useRouter();
    const toast = useToast();
    const session = new SessionService().getCurrentUser();

    const DEFAULT_FORM = {
      gasWarningLimit: 30,
      gasCriticalLimit: 50,
      temperatureWarningLimit: 35,
      temperatureCriticalLimit: 55,
      webAlerts: true,
      emailAlerts: true,
      smsAlerts: false,
      language: 'en',
      readingIntervalSeconds: 10,
      autoCreateIncidents: true,
      criticalOnly: false,
      soundAlerts: true,
      notifyEmergencyContact: true,
      darkMode: false
    };
    const DEFAULT_CONTACT = {
      emergencyName: 'Rosa Vargas',
      emergencyPhone: '+51 998 877 665',
      emergencyEmail: 'safety@smartgas.com'
    };

    const settings = ref(null);
    const contact = ref(null);
    const zones = ref([]);
    const sensors = ref([]);
    const loading = ref(true);
    const saveLoading = ref(false);
    const errorMsg = ref('');

    const form = ref({ ...DEFAULT_FORM });
    const contactForm = ref({ ...DEFAULT_CONTACT });
    const originalForm = ref({});
    const originalContact = ref({});

    const zoneRows = computed(() => zones.value.map(z => ({ ...z, sensorCountReal: sensors.value.filter(s => s.zoneId === z.id).length })));

    const applyVisualPreferences = () => {
      document.body.classList.toggle('dark-mode', !!form.value.darkMode);
      document.body.classList.remove('compact-view');
      localStorage.setItem('smartgas-theme', form.value.darkMode ? 'dark' : 'light');
    };

    const loadData = async () => {
      loading.value = true;
      errorMsg.value = '';
      try {
        [settings.value, contact.value, zones.value, sensors.value] = await Promise.all([
          settingsStore.getSettings(session.id),
          settingsStore.getEmergencyContact(session.id),
          settingsStore.getZones(session.id),
          settingsStore.getSensors(session.id)
        ]);
        if (settings.value) {
          form.value = { ...form.value, ...settings.value };
          originalForm.value = { ...form.value };
          locale.value = form.value.language || 'en';
          applyVisualPreferences();
        }
        if (contact.value) {
          contactForm.value = {
            emergencyName: contact.value.emergencyName || '',
            emergencyPhone: contact.value.emergencyPhone || '',
            emergencyEmail: contact.value.emergencyEmail || ''
          };
          originalContact.value = { ...contactForm.value };
        }
      } catch {
        errorMsg.value = t('apiError');
      } finally {
        loading.value = false;
      }
    };

    const saveAll = async () => {
      if (Number(form.value.gasWarningLimit) >= Number(form.value.gasCriticalLimit)) {
        toast.add({ severity: 'warning', summary: t('gasLimitsError'), life: 4000 });
        return;
      }
      if (Number(form.value.temperatureWarningLimit) >= Number(form.value.temperatureCriticalLimit)) {
        toast.add({ severity: 'warning', summary: t('tempLimitsError'), life: 4000 });
        return;
      }
      saveLoading.value = true;
      try {
        await settingsStore.saveSettings(settings.value.id, {
          ...settings.value,
          ...form.value,
          accountId: session.id,
          gasWarningLimit: Number(form.value.gasWarningLimit),
          gasCriticalLimit: Number(form.value.gasCriticalLimit),
          temperatureWarningLimit: Number(form.value.temperatureWarningLimit),
          temperatureCriticalLimit: Number(form.value.temperatureCriticalLimit),
              readingIntervalSeconds: Number(form.value.readingIntervalSeconds)
        });
        await settingsStore.saveEmergencyContact(contact.value?.id || null, session.id, contactForm.value);
        locale.value = form.value.language;
        applyVisualPreferences();
        await loadData();
        toast.add({ severity: 'success', summary: t('settingsSaved'), life: 3000 });
      } catch {
        toast.add({ severity: 'error', summary: t('errorSaving'), life: 3000 });
      } finally {
        saveLoading.value = false;
      }
    };

    const resetAll = () => {
      form.value = { ...DEFAULT_FORM };
      contactForm.value = { ...DEFAULT_CONTACT };
      locale.value = form.value.language;
      applyVisualPreferences();
      toast.add({ severity: 'info', summary: t('resetApplied'), life: 2200 });
    };

    watch(() => form.value.darkMode, applyVisualPreferences);
    watch(() => form.value.language, (value) => { if (value) locale.value = value; });

    onMounted(loadData);

    return { t, router, loading, saveLoading, errorMsg, form, contactForm, zoneRows, saveAll, resetAll, trZone };
  },
  template: `
    <section class="content-page settings-page" aria-label="Settings">
      <div class="page-header settings-header">
        <div>
          <h1>{{ t('settingsTitle') }}</h1>
          <p>{{ t('settingsSubtitle') }}</p>
        </div>
        <div class="header-actions">
          <Button :label="t('saveAction')" icon="pi pi-check" :loading="saveLoading" @click="saveAll" />
          <Button :label="t('resetAction')" icon="pi pi-undo" severity="secondary" @click="resetAll" />
        </div>
      </div>

      <div v-if="errorMsg" class="alert-banner" role="alert"><i class="pi pi-exclamation-triangle"></i> {{ errorMsg }}</div>
      <div v-if="loading" class="loading-state"><i class="pi pi-spin pi-spinner"></i> {{ t('loading') }}</div>

      <div v-if="!loading" class="settings-balanced-grid">
        <div class="settings-column">
          <article class="settings-card detection-card">
            <header>
              <span class="settings-icon"><i class="pi pi-shield"></i></span>
              <div>
                <h2>{{ t('safetyThresholds') }}</h2>
                <p>{{ t('thresholdsHelp') }}</p>
              </div>
            </header>
            <div class="settings-form-grid clean-thresholds">
              <div class="field-group"><label>{{ t('gasWarningLimit') }}</label><InputText v-model.number="form.gasWarningLimit" type="number" class="w-full" /></div>
              <div class="field-group"><label>{{ t('gasCriticalLimit') }}</label><InputText v-model.number="form.gasCriticalLimit" type="number" class="w-full" /></div>
              <div class="field-group"><label>{{ t('temperatureWarningLimit') }}</label><InputText v-model.number="form.temperatureWarningLimit" type="number" class="w-full" /></div>
              <div class="field-group"><label>{{ t('temperatureCriticalLimit') }}</label><InputText v-model.number="form.temperatureCriticalLimit" type="number" class="w-full" /></div>
            </div>
          </article>

          <article class="settings-card">
            <header>
              <span class="settings-icon"><i class="pi pi-microchip"></i></span>
              <div><h2>{{ t('sensorPreferences') }}</h2><p>{{ t('sensorPreferencesHelp') }}</p></div>
            </header>
            <div class="settings-list">
              <label><span>{{ t('readingInterval') }}</span><span class="inline-control"><InputText v-model.number="form.readingIntervalSeconds" type="number" class="short-input" /> <small>{{ t('seconds') }}</small></span></label>
              <label><span>{{ t('autoCreateIncidents') }}</span><input type="checkbox" v-model="form.autoCreateIncidents" role="switch" /></label>
            </div>
          </article>

          <article class="settings-card zones-card-balanced">
            <header>
              <span class="settings-icon"><i class="pi pi-map-marker"></i></span>
              <div><h2>{{ t('zoneConfiguration') }}</h2><p>{{ t('monitoredZones') }}</p></div>
            </header>
            <div class="zone-settings-list">
              <div v-for="z in zoneRows" :key="z.id" class="zone-settings-row">
                <div><strong>{{ trZone(t, z.name) }}</strong><small>{{ t('sensorCountText', { count: z.sensorCountReal }) }} · {{ z.sensitivity || t('mediumSensitivity') }}</small></div>
                <Tag :value="z.status === 'Safe' ? t('activeZone') : t('attentionZone')" :severity="z.status === 'Safe' ? 'success' : 'warning'" />
              </div>
            </div>
            <div class="settings-card-actions"><Button :label="t('openMonitoring')" severity="secondary" @click="router.push('/app/monitoring')" /><Button :label="t('manageDevices')" severity="secondary" @click="router.push('/app/devices')" /></div>
          </article>
        </div>

        <div class="settings-column">
          <article class="settings-card">
            <header>
              <span class="settings-icon"><i class="pi pi-bell"></i></span>
              <div><h2>{{ t('notificationPreferences') }}</h2><p>{{ t('notificationPreferences') }}</p></div>
            </header>
            <div class="settings-list">
              <label><span>{{ t('webAlerts') }}</span><input type="checkbox" v-model="form.webAlerts" role="switch" /></label>
              <label><span>{{ t('emailAlerts') }}</span><input type="checkbox" v-model="form.emailAlerts" role="switch" /></label>
              <label><span>{{ t('smsAlerts') }}</span><input type="checkbox" v-model="form.smsAlerts" role="switch" /></label>
              <label><span>{{ t('criticalOnly') }}</span><input type="checkbox" v-model="form.criticalOnly" role="switch" /></label>
              <label><span>{{ t('soundAlerts') }}</span><input type="checkbox" v-model="form.soundAlerts" role="switch" /></label>
            </div>
          </article>

          <article class="settings-card">
            <header>
              <span class="settings-icon"><i class="pi pi-phone"></i></span>
              <div><h2>{{ t('emergencyContact') }}</h2><p>{{ t('notifyEmergencyContact') }}</p></div>
            </header>
            <div class="settings-form-grid single contact-grid-clean">
              <div class="field-group"><label>{{ t('emergencyName') }}</label><InputText v-model="contactForm.emergencyName" class="w-full" /></div>
              <div class="field-group"><label>{{ t('emergencyPhone') }}</label><InputText v-model="contactForm.emergencyPhone" class="w-full" /></div>
              <div class="field-group"><label>{{ t('emergencyEmail') }}</label><InputText v-model="contactForm.emergencyEmail" type="email" class="w-full" /></div>
              <label class="inline-switch"><span>{{ t('notifyEmergencyContact') }}</span><input type="checkbox" v-model="form.notifyEmergencyContact" role="switch" /></label>
            </div>
          </article>

          <article class="settings-card compact-interface-card">
            <header>
              <span class="settings-icon"><i class="pi pi-globe"></i></span>
              <div><h2>{{ t('interfacePreferences') }}</h2><p>{{ t('languagePreference') }}</p></div>
            </header>
            <div class="settings-list">
              <label><span>{{ t('languagePreference') }}</span><Dropdown v-model="form.language" :options="[{label:'English', value:'en'}, {label:'Español', value:'es'}]" optionLabel="label" optionValue="value" class="medium-input" /></label>
              <label><span>{{ t('darkMode') }}</span><input type="checkbox" v-model="form.darkMode" role="switch" /></label>
            </div>
          </article>
        </div>
      </div>
    </section>`
};
