import { SettingsService } from '../infrastructure/settings.service.js';

const service = new SettingsService();

export const settingsStore = {
  getSettings: (accountId) => service.getSettings(accountId),
  getEmergencyContact: (accountId) => service.getEmergencyContact(accountId),
  getZones: (accountId) => service.getZones(accountId),
  getSensors: (accountId) => service.getSensors(accountId),
  saveSettings: (settingsId, data) => service.saveSettings(settingsId, data),
  saveEmergencyContact: (contactId, accountId, data) => service.saveEmergencyContact(contactId, accountId, data)
};
