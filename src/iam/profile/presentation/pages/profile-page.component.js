import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useToast } from 'primevue/usetoast';
import { profileStore } from '../../application/profile.store.js';
import { SessionService } from '../../../../shared/infrastructure/session.service.js';
import { formatDate } from '../../../../shared/utils/date-format.js';
import { trPlanName, trPlanDescription, trAccountType, trZone, trActivityDetail } from '../../../../shared/utils/domain-translations.js';

export default {
  name: 'ProfilePage',
  setup() {
    const { t } = useI18n();
    const router = useRouter();
    const toast = useToast();
    const session = new SessionService().getCurrentUser();

    const profile = ref(null);
    const plan = ref(null);
    const subscription = ref(null);
    const activity = ref([]);
    const stats = ref({ sensors: [], zones: [], activeIncidents: [] });
    const editing = ref(false);
    const loading = ref(true);
    const saveLoading = ref(false);
    const errorMsg = ref('');
    const showPasswordDialog = ref(false);
    const newPassword = ref('');
    const passwordLoading = ref(false);

    const form = ref({ fullName: '', email: '', role: '', accountType: '', businessName: '', phone: '', district: '' });
    const initials = computed(() => (form.value.fullName || 'SG').split(' ').filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase());

    const loadData = async () => {
      loading.value = true;
      errorMsg.value = '';
      try {
        profile.value = await profileStore.getProfile(session.id);
        if (profile.value) {
          form.value = {
            fullName: profile.value.fullName || '',
            email: profile.value.email || '',
            role: profile.value.role || '',
            accountType: profile.value.accountType || '',
            businessName: profile.value.businessName || '',
            phone: profile.value.phone || '',
            district: profile.value.district || ''
          };
          plan.value = await profileStore.getPlan(profile.value.planId);
        }
        [subscription.value, activity.value, stats.value] = await Promise.all([
          profileStore.getSubscription(session.id),
          profileStore.getActivity(session.id),
          profileStore.getStats(session.id)
        ]);
      } catch {
        errorMsg.value = t('apiError');
      } finally {
        loading.value = false;
      }
    };

    const startEdit = () => { editing.value = true; };
    const cancelEdit = () => {
      editing.value = false;
      if (profile.value) {
        form.value = { fullName: profile.value.fullName || '', email: profile.value.email || '', role: profile.value.role || '', accountType: profile.value.accountType || '', businessName: profile.value.businessName || '', phone: profile.value.phone || '', district: profile.value.district || '' };
      }
    };
    const saveProfile = async () => {
      if (!form.value.fullName || !form.value.email) {
        toast.add({ severity: 'warning', summary: t('emptyFields'), life: 3000 });
        return;
      }
      saveLoading.value = true;
      try {
        await profileStore.updateProfile(profile.value.id, { ...form.value });
        editing.value = false;
        await loadData();
        toast.add({ severity: 'success', summary: t('profileSaved'), life: 3000 });
      } catch {
        toast.add({ severity: 'error', summary: t('errorSaving'), life: 3000 });
      } finally { saveLoading.value = false; }
    };

    const changePassword = async () => {
      if (!newPassword.value || newPassword.value.length < 6) {
        toast.add({ severity: 'warning', summary: t('passwordMin'), life: 3000 });
        return;
      }
      passwordLoading.value = true;
      try {
        await profileStore.changePassword(session.id, newPassword.value);
        showPasswordDialog.value = false;
        newPassword.value = '';
        await loadData();
        toast.add({ severity: 'success', summary: t('saved'), life: 3000 });
      } catch {
        toast.add({ severity: 'error', summary: t('errorSaving'), life: 3000 });
      } finally { passwordLoading.value = false; }
    };

    onMounted(loadData);
    return { t, router, profile, plan, subscription, activity, stats, editing, loading, saveLoading, errorMsg, form, initials, showPasswordDialog, newPassword, passwordLoading, trPlanName, trPlanDescription, trAccountType, trZone, trActivityDetail, formatDate, startEdit, cancelEdit, saveProfile, changePassword };
  },
  template: `
    <section class="content-page profile-page" aria-label="Profile">
      <div class="page-header profile-heading">
        <div><h1>{{ t('profileTitle') }}</h1><p>{{ t('profileSubtitle') }}</p></div>
        <div class="header-actions">
          <Button :label="t('changePassword')" icon="pi pi-lock" severity="secondary" @click="showPasswordDialog = true" />
          <Button v-if="!editing" :label="t('editAction')" icon="pi pi-pencil" @click="startEdit" />
          <Button v-if="editing" :label="t('saveAction')" icon="pi pi-check" :loading="saveLoading" @click="saveProfile" />
          <Button v-if="editing" :label="t('cancelAction')" severity="secondary" @click="cancelEdit" />
        </div>
      </div>
      <div v-if="errorMsg" class="alert-banner" role="alert"><i class="pi pi-exclamation-triangle"></i> {{ errorMsg }}</div>
      <div v-if="loading" class="loading-state"><i class="pi pi-spin pi-spinner"></i> {{ t('loading') }}</div>

      <template v-if="!loading && profile">
        <article class="profile-hero-card profile-hero-clean">
          <div class="profile-initials">{{ initials }}</div>
          <div class="profile-hero-info">
            <h2>{{ profile.fullName }}</h2>
            <p>{{ profile.role }} · {{ trPlanName(t, plan) }}</p>
            <div class="hero-tags"><Tag :value="t('activeAccount')" severity="success" /><span>{{ t('memberSince') }} {{ profile.memberSince || '2026' }}</span></div>
          </div>
          <div class="profile-hero-metrics profile-metrics-clean">
            <div><strong>{{ stats.sensors.length }}</strong><span>{{ t('devices') }}</span></div>
            <div><strong>{{ stats.zones.length }}</strong><span>{{ t('monitoredZones') }}</span></div>
            <div><strong>{{ stats.activeIncidents.length }}</strong><span>{{ t('activeIncidents') }}</span></div>
          </div>
        </article>

        <div class="profile-main-grid">
          <div class="profile-left-column">
            <article class="panel-card profile-info-card">
              <header><h2>{{ t('personalInformation') }}</h2><Button v-if="!editing" :label="t('editAction')" icon="pi pi-pencil" severity="secondary" size="small" @click="startEdit" /></header>
              <div class="profile-info-list profile-info-compact">
                <div class="profile-info-row"><span class="info-icon"><i class="pi pi-user"></i></span><div><small>{{ t('fullName') }}</small><InputText v-if="editing" v-model="form.fullName" class="w-full" /><strong v-else>{{ form.fullName }}</strong></div></div>
                <div class="profile-info-row"><span class="info-icon"><i class="pi pi-envelope"></i></span><div><small>{{ t('email') }}</small><InputText v-if="editing" v-model="form.email" class="w-full" /><strong v-else>{{ form.email }}</strong><Tag :value="t('verified')" severity="success" /></div></div>
                <div class="profile-info-row"><span class="info-icon"><i class="pi pi-briefcase"></i></span><div><small>{{ t('accountType') }}</small><Dropdown v-if="editing" v-model="form.accountType" :options="[{label:t('commercialAccount'), value:'commercial'}, {label:t('domesticAccount'), value:'domestic'}]" optionLabel="label" optionValue="value" class="w-full" /><strong v-else>{{ trAccountType(t, form.accountType) }}</strong></div></div>
                <div class="profile-info-row"><span class="info-icon"><i class="pi pi-building"></i></span><div><small>{{ t('businessName') }}</small><InputText v-if="editing" v-model="form.businessName" class="w-full" /><strong v-else>{{ form.businessName }}</strong></div></div>
                <div class="profile-info-row"><span class="info-icon"><i class="pi pi-phone"></i></span><div><small>{{ t('phone') }}</small><InputText v-if="editing" v-model="form.phone" class="w-full" /><strong v-else>{{ form.phone || '—' }}</strong></div></div>
                <div class="profile-info-row"><span class="info-icon"><i class="pi pi-map-marker"></i></span><div><small>{{ t('district') }}</small><InputText v-if="editing" v-model="form.district" class="w-full" /><strong v-else>{{ form.district || '—' }}</strong></div></div>
              </div>
            </article>

            <article class="panel-card security-card security-card-clean">
              <header><h2>{{ t('accountSecurity') }}</h2></header>
              <div class="security-row security-row-info"><span class="info-icon"><i class="pi pi-lock"></i></span><div><strong>{{ t('password') }}</strong><small>{{ t('passwordUpdated') }}</small></div><Tag :value="t('verified')" severity="success" /></div>
              <div class="security-row security-row-info"><span class="info-icon"><i class="pi pi-desktop"></i></span><div><strong>{{ t('sessionDevices') }}</strong><small>Web browser · Lima, PE</small></div><Tag :value="t('active')" severity="success" /></div>
            </article>
          </div>

          <div class="profile-right-column">
            <article class="plan-profile-card plan-profile-card-clean">
              <div class="plan-card-icon"><i class="pi pi-credit-card"></i></div>
              <div><h3>{{ trPlanName(t, plan) }}</h3><p>{{ trPlanDescription(t, plan) }}</p><small v-if="subscription">{{ t('renewalDate') }}: {{ formatDate(subscription.renewalDate) }}</small></div>
              <Button :label="t('viewPlanDetails')" severity="secondary" class="w-full" @click="router.push('/app/subscription')" />
            </article>

            <article class="panel-card activity-card activity-card-clean">
              <header><h2>{{ t('recentActivity') }}</h2></header>
              <div class="activity-list"><div v-for="item in activity.slice(0,5)" :key="item.id" class="activity-row"><span class="activity-dot"></span><div><strong>{{ t(item.title) }}</strong><small>{{ trActivityDetail(t, item.detail) }}</small></div><time>{{ formatDate(item.createdAt) }}</time></div></div>
            </article>
          </div>
        </div>
      </template>

      <Dialog v-model:visible="showPasswordDialog" :header="t('changePassword')" modal :style="{width:'420px'}">
        <div class="field-group"><label for="new-password">{{ t('password') }}</label><InputText id="new-password" v-model="newPassword" type="password" class="w-full" /></div>
        <template #footer><Button :label="t('cancelAction')" severity="secondary" @click="showPasswordDialog=false" /><Button :label="t('saveAction')" icon="pi pi-check" :loading="passwordLoading" @click="changePassword" /></template>
      </Dialog>
    </section>`
};
