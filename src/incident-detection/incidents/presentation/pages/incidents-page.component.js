import { onMounted, onUnmounted, ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { incidentStore } from '../../application/incident.store.js';
import { SessionService } from '../../../../shared/infrastructure/session.service.js';
import { formatDate } from '../../../../shared/utils/date-format.js';
import { trZone, trStatus, trSeverity, trIncidentType, formatIncidentNotification } from '../../../../shared/utils/domain-translations.js';

export default {
  name: 'IncidentsPage',
  setup() {
    const { t } = useI18n();
    const route = useRoute();
    const toast = useToast();
    const session = new SessionService().getCurrentUser();

    const activeTab = ref('active');
    const incidents = ref([]);
    const alerts = ref([]);
    const notifications = ref([]);
    const loading = ref(true);
    const errorMsg = ref('');

    const showDetailDialog = ref(false);
    const selectedIncident = ref(null);
    const showNoteDialog = ref(false);
    const noteText = ref('');
    const noteLoading = ref(false);
    const actionLoading = ref({});

    const activeIncidents = computed(() => incidents.value.filter(i => i.status === 'Detected' || i.status === 'Reviewed'));
    const historyIncidents = computed(() => incidents.value.filter(i => i.status === 'Resolved' || i.status === 'False Alarm'));
    const unreadCount = computed(() => notifications.value.filter(n => !n.read || !n.confirmed).length);

    const sevSeverity = (s) => ({ Warning: 'warning', Critical: 'danger', Low: 'info', Medium: 'warning' }[s] || 'info');
    const statusSeverity = (s) => ({
      Detected: 'warning', Reviewed: 'info', Resolved: 'success', 'False Alarm': 'secondary'
    }[s] || 'info');

    const loadData = async () => {
      loading.value = true;
      errorMsg.value = '';
      try {
        [incidents.value, alerts.value, notifications.value] = await Promise.all([
          incidentStore.getIncidents(session.id),
          incidentStore.getAlerts(session.id),
          incidentStore.getNotifications(session.id)
        ]);
      } catch {
        errorMsg.value = t('apiError');
      } finally {
        loading.value = false;
      }
    };

    const openDetail = (inc) => {
      selectedIncident.value = inc;
      showDetailDialog.value = true;
    };

    const openNote = (inc) => {
      selectedIncident.value = inc;
      noteText.value = inc.note || '';
      showNoteDialog.value = true;
    };

    const setAction = (id, val) => { actionLoading.value = { ...actionLoading.value, [id]: val }; };

    const markReviewed = async (inc) => {
      setAction(inc.id, true);
      try {
        await incidentStore.markReviewed(inc.id);
        await loadData();
        toast.add({ severity: 'info', summary: t('incidentSaved'), life: 3000 });
      } catch { toast.add({ severity: 'error', summary: t('errorSaving'), life: 3000 }); }
      finally { setAction(inc.id, false); }
    };

    const markResolved = async (inc) => {
      setAction(inc.id, true);
      try {
        await incidentStore.markResolved(inc.id);
        await loadData();
        toast.add({ severity: 'success', summary: t('incidentSaved'), life: 3000 });
      } catch { toast.add({ severity: 'error', summary: t('errorSaving'), life: 3000 }); }
      finally { setAction(inc.id, false); }
    };

    const markFalseAlarm = async (inc) => {
      setAction(inc.id, true);
      try {
        await incidentStore.markFalseAlarm(inc.id);
        await loadData();
        toast.add({ severity: 'secondary', summary: t('incidentSaved'), life: 3000 });
      } catch { toast.add({ severity: 'error', summary: t('errorSaving'), life: 3000 }); }
      finally { setAction(inc.id, false); }
    };

    const saveNote = async () => {
      noteLoading.value = true;
      try {
        await incidentStore.addNote(selectedIncident.value.id, noteText.value);
        showNoteDialog.value = false;
        await loadData();
        toast.add({ severity: 'success', summary: t('incidentSaved'), life: 3000 });
      } catch { toast.add({ severity: 'error', summary: t('errorSaving'), life: 3000 }); }
      finally { noteLoading.value = false; }
    };

    const markRead = async (notif) => {
      try {
        await incidentStore.markNotificationRead(notif.id);
        notifications.value = notifications.value.map(n => n.id === notif.id ? { ...n, read: true } : n);
        await loadData();
        toast.add({ severity: 'info', summary: t('notifRead'), life: 2000 });
      } catch { toast.add({ severity: 'error', summary: t('errorSaving'), life: 2000 }); }
    };

    const confirmReception = async (notif) => {
      try {
        await incidentStore.confirmNotification(notif.id);
        notifications.value = notifications.value.map(n => n.id === notif.id ? { ...n, read: true, confirmed: true } : n);
        await loadData();
        toast.add({ severity: 'success', summary: t('notifConfirmed'), life: 2000 });
      } catch { toast.add({ severity: 'error', summary: t('errorSaving'), life: 2000 }); }
    };

    const syncTabFromRoute = () => {
      const storedTab = sessionStorage.getItem('smartgas-incidents-tab');
      const tab = route.query.tab || storedTab;
      if (['active', 'history', 'notifications'].includes(tab)) {
        activeTab.value = tab;
        if (storedTab) sessionStorage.removeItem('smartgas-incidents-tab');
      }
    };

    const openNotificationsFromGlobal = () => { activeTab.value = 'notifications'; };

    onMounted(async () => {
      window.addEventListener('smartgas-open-notifications', openNotificationsFromGlobal);
      syncTabFromRoute();
      await loadData();
    });
    onUnmounted(() => window.removeEventListener('smartgas-open-notifications', openNotificationsFromGlobal));
    watch(() => route.fullPath, syncTabFromRoute);

    return {
      t, trZone, trStatus, trSeverity, trIncidentType, formatIncidentNotification, activeTab, incidents, alerts, notifications, loading, errorMsg,
      showDetailDialog, selectedIncident, showNoteDialog, noteText, noteLoading, actionLoading,
      activeIncidents, historyIncidents, unreadCount,
      sevSeverity, statusSeverity, loadData, openDetail, openNote,
      markReviewed, markResolved, markFalseAlarm, saveNote, markRead, confirmReception, formatDate
    };
  },
  template: `
    <section class="content-page" aria-label="Incidents">
      <div class="page-header">
        <div>
          <h1>{{ t('incidentsTitle') }}</h1>
          <p>{{ t('incidentsSubtitle') }}</p>
        </div>
        <Button :label="t('refreshAction')" icon="pi pi-refresh" severity="secondary" @click="loadData" :loading="loading" />
      </div>

      <div v-if="errorMsg" class="alert-banner" role="alert">
        <i class="pi pi-exclamation-triangle" aria-hidden="true"></i> {{ errorMsg }}
      </div>

      <!-- Tab Bar -->
      <div class="tab-bar" role="tablist">
        <button class="tab-btn" :class="{ active: activeTab === 'active' }" role="tab" :aria-selected="activeTab === 'active'" @click="activeTab = 'active'">
          {{ t('activeIncidentsTab') }}
          <span v-if="activeIncidents.length" class="tab-badge">{{ activeIncidents.length }}</span>
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'history' }" role="tab" :aria-selected="activeTab === 'history'" @click="activeTab = 'history'">
          {{ t('incidentHistoryTab') }}
        </button>
        <button class="tab-btn" :class="{ active: activeTab === 'notifications' }" role="tab" :aria-selected="activeTab === 'notifications'" @click="activeTab = 'notifications'">
          {{ t('notificationsTab') }}
          <span v-if="unreadCount" class="tab-badge unread">{{ unreadCount }}</span>
        </button>
      </div>

      <div v-if="loading" class="loading-state" aria-live="polite">
        <i class="pi pi-spin pi-spinner" aria-hidden="true"></i> {{ t('loading') }}
      </div>

      <!-- Active Incidents Tab -->
      <div v-if="!loading && activeTab === 'active'" role="tabpanel" :aria-label="t('activeIncidentsTab')">
        <div class="panel-card">
          <DataTable :value="activeIncidents" stripedRows responsiveLayout="scroll" :aria-label="t('activeIncidentsTab')">
            <Column :header="t('incidentCode')" field="code" sortable />
            <Column :header="t('incidentType')" sortable><template #body="{ data }">{{ trIncidentType(t, data.type) }}</template></Column><Column v-if="false" field="type"  />
            <Column :header="t('incidentZone')" sortable><template #body="{ data }">{{ trZone(t, data.zoneName) }}</template></Column><Column v-if="false" field="zoneName"  />
            <Column :header="t('incidentSensor')" field="sensorCode" />
            <Column :header="t('detectedValue')" field="detectedValue" />
            <Column :header="t('severity')">
              <template #body="{ data }"><Tag :value="trSeverity(t, data.severity)" :severity="sevSeverity(data.severity)" /></template>
            </Column>
            <Column :header="t('incidentStatus')">
              <template #body="{ data }"><Tag :value="trStatus(t, data.status)" :severity="statusSeverity(data.status)" /></template>
            </Column>
            <Column :header="t('detectedAt')">
              <template #body="{ data }">{{ formatDate(data.detectedAt) }}</template>
            </Column>
            <Column header="">
              <template #body="{ data }">
                <div class="row-actions">
                  <Button icon="pi pi-info-circle" severity="secondary" size="small" :title="t('viewDetails')" @click="openDetail(data)" />
                  <Button v-if="data.status === 'Detected'" icon="pi pi-eye" severity="info" size="small" :title="t('markReviewed')" :loading="actionLoading[data.id]" @click="markReviewed(data)" />
                  <Button v-if="data.status !== 'Resolved'" icon="pi pi-check" severity="success" size="small" :title="t('markResolved')" :loading="actionLoading[data.id]" @click="markResolved(data)" />
                  <Button v-if="data.status !== 'False Alarm'" icon="pi pi-times" severity="secondary" size="small" :title="t('markFalseAlarm')" @click="markFalseAlarm(data)" />
                  <Button icon="pi pi-comment" severity="secondary" size="small" :title="t('addNote')" @click="openNote(data)" />
                </div>
              </template>
            </Column>
          </DataTable>
          <p v-if="!activeIncidents.length" class="empty-msg padded safe-msg">
            <i class="pi pi-check-circle" aria-hidden="true"></i> {{ t('noData') }}
          </p>
        </div>
      </div>

      <!-- History Tab -->
      <div v-if="!loading && activeTab === 'history'" role="tabpanel" :aria-label="t('incidentHistoryTab')">
        <div class="panel-card">
          <DataTable :value="historyIncidents" stripedRows responsiveLayout="scroll">
            <Column :header="t('incidentCode')" field="code" sortable />
            <Column :header="t('incidentType')" sortable><template #body="{ data }">{{ trIncidentType(t, data.type) }}</template></Column><Column v-if="false" field="type"  />
            <Column :header="t('incidentZone')" sortable><template #body="{ data }">{{ trZone(t, data.zoneName) }}</template></Column><Column v-if="false" field="zoneName"  />
            <Column :header="t('severity')">
              <template #body="{ data }"><Tag :value="trSeverity(t, data.severity)" :severity="sevSeverity(data.severity)" /></template>
            </Column>
            <Column :header="t('incidentStatus')">
              <template #body="{ data }"><Tag :value="trStatus(t, data.status)" :severity="statusSeverity(data.status)" /></template>
            </Column>
            <Column :header="t('detectedAt')">
              <template #body="{ data }">{{ formatDate(data.detectedAt) }}</template>
            </Column>
            <Column :header="t('resolvedAt')">
              <template #body="{ data }">{{ formatDate(data.resolvedAt) }}</template>
            </Column>
            <Column :header="t('note')" field="note" />
            <Column header="">
              <template #body="{ data }">
                <Button icon="pi pi-info-circle" severity="secondary" size="small" :title="t('viewDetails')" @click="openDetail(data)" />
              </template>
            </Column>
          </DataTable>
          <p v-if="!historyIncidents.length" class="empty-msg padded">{{ t('noData') }}</p>
        </div>
      </div>

      <!-- Notifications Tab -->
      <div v-if="!loading && activeTab === 'notifications'" role="tabpanel" :aria-label="t('notificationsTab')" data-smartgas-notifications-tab="true">
        <div class="panel-card">
          <DataTable :value="notifications" stripedRows responsiveLayout="scroll">
            <Column :header="t('notificationMessage')"><template #body="{ data }">{{ formatIncidentNotification(t, data) }}</template></Column>
            <Column :header="t('channel')" field="channel" />
            <Column :header="t('readStatus')">
              <template #body="{ data }">
                <Tag :value="data.read ? t('yes') : t('no')" :severity="data.read ? 'success' : 'warning'" />
              </template>
            </Column>
            <Column :header="t('confirmedStatus')">
              <template #body="{ data }">
                <Tag :value="data.confirmed ? t('yes') : t('no')" :severity="data.confirmed ? 'success' : 'secondary'" />
              </template>
            </Column>
            <Column :header="t('detectedAt')">
              <template #body="{ data }">{{ formatDate(data.createdAt) }}</template>
            </Column>
            <Column header="">
              <template #body="{ data }">
                <div class="row-actions">
                  <Button v-if="!data.read" :label="t('markRead')" severity="secondary" size="small" @click="markRead(data)" />
                  <Button v-if="!data.confirmed" :label="t('confirmReception')" severity="success" size="small" @click="confirmReception(data)" />
                </div>
              </template>
            </Column>
          </DataTable>
          <p v-if="!notifications.length" class="empty-msg padded">{{ t('noData') }}</p>
        </div>
      </div>

      <!-- Detail Dialog -->
      <Dialog v-model:visible="showDetailDialog" :header="selectedIncident ? selectedIncident.code : ''" modal :style="{ width: '480px' }">
        <div v-if="selectedIncident" class="detail-grid">
          <div class="detail-row"><span>{{ t('incidentType') }}</span><strong>{{ trIncidentType(t, selectedIncident.type) }}</strong></div>
          <div class="detail-row"><span>{{ t('incidentZone') }}</span><strong>{{ trZone(t, selectedIncident.zoneName) }}</strong></div>
          <div class="detail-row"><span>{{ t('incidentSensor') }}</span><strong>{{ selectedIncident.sensorCode }}</strong></div>
          <div class="detail-row"><span>{{ t('detectedValue') }}</span><strong>{{ selectedIncident.detectedValue }}</strong></div>
          <div class="detail-row"><span>{{ t('severity') }}</span><Tag :value="trSeverity(t, selectedIncident.severity)" :severity="sevSeverity(selectedIncident.severity)" /></div>
          <div class="detail-row"><span>{{ t('incidentStatus') }}</span><Tag :value="trStatus(t, selectedIncident.status)" :severity="statusSeverity(selectedIncident.status)" /></div>
          <div class="detail-row"><span>{{ t('detectedAt') }}</span><strong>{{ formatDate(selectedIncident.detectedAt) }}</strong></div>
          <div class="detail-row"><span>{{ t('reviewedAt') }}</span><strong>{{ formatDate(selectedIncident.reviewedAt) }}</strong></div>
          <div class="detail-row"><span>{{ t('resolvedAt') }}</span><strong>{{ formatDate(selectedIncident.resolvedAt) }}</strong></div>
          <div class="detail-row"><span>{{ t('note') }}</span><strong>{{ selectedIncident.note || '—' }}</strong></div>
        </div>
        <template #footer>
          <Button :label="t('closeAction')" severity="secondary" @click="showDetailDialog = false" />
        </template>
      </Dialog>

      <!-- Note Dialog -->
      <Dialog v-model:visible="showNoteDialog" :header="t('addNote')" modal :style="{ width: '400px' }">
        <div class="field-group">
          <label for="note-text">{{ t('note') }}</label>
          <Textarea id="note-text" v-model="noteText" rows="4" class="w-full" :aria-label="t('note')" />
        </div>
        <template #footer>
          <Button :label="t('cancelAction')" severity="secondary" @click="showNoteDialog = false" />
          <Button :label="t('saveAction')" icon="pi pi-check" :loading="noteLoading" @click="saveNote" />
        </template>
      </Dialog>
    </section>`
};
