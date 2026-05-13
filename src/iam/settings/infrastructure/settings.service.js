import { http } from '../../../shared/infrastructure/http/api-client.js';
import i18n from '../../../i18n/index.js';

export class SettingsService {
  async getSettings(accountId) {
    const response = await http.get('/settings', { params: { accountId } });
    return response.data[0] || null;
  }

  async getEmergencyContact(accountId) {
    const response = await http.get('/emergencyContacts', { params: { accountId } });
    return response.data[0] || null;
  }

  async getZones(accountId) {
    const response = await http.get('/zones', { params: { accountId } });
    return response.data;
  }

  async getSensors(accountId) {
    const response = await http.get('/sensors', { params: { accountId } });
    return response.data;
  }

  async saveSettings(settingsId, data) {
    const response = await http.patch(`/settings/${settingsId}`, data);
    if (data.language) i18n.global.locale.value = data.language;
    await http.post('/accountActivities', {
      accountId: data.accountId,
      type: 'settings',
      title: 'activitySettingsUpdated',
      detail: 'Safety preferences',
      createdAt: new Date().toISOString()
    }).catch(() => null);
    return response.data;
  }

  async saveEmergencyContact(contactId, accountId, data) {
    if (contactId) {
      const response = await http.patch(`/emergencyContacts/${contactId}`, data);
      return response.data;
    }
    const response = await http.post('/emergencyContacts', { ...data, accountId });
    return response.data;
  }
}
