import { http } from '../../../shared/infrastructure/http/api-client.js';
import { nowISO } from '../../../shared/utils/date-format.js';

export class IncidentService {
  async getIncidents(accountId) { const response = await http.get('/incidents', { params: { accountId } }); return response.data; }
  async getAlerts(accountId) { const response = await http.get('/alerts', { params: { accountId } }); return response.data; }
  async getNotifications(accountId) { const response = await http.get('/notifications', { params: { accountId } }); return response.data; }

  async recalculateZone(accountId, zoneId) {
    const incidents = (await http.get('/incidents', { params: { accountId, zoneId } })).data.filter(i => i.status === 'Detected' || i.status === 'Reviewed');
    let status = 'Safe'; let riskLevel = 'Low';
    if (incidents.some(i => i.severity === 'Critical')) { status = 'Critical'; riskLevel = 'Critical'; }
    else if (incidents.length > 0) { status = 'Warning'; riskLevel = 'Medium'; }
    await http.patch(`/zones/${zoneId}`, { status, riskLevel, lastUpdated: nowISO() });
  }

  async markReviewed(incidentId) {
    const response = await http.patch(`/incidents/${incidentId}`, { status: 'Reviewed', reviewedAt: nowISO() });
    return response.data;
  }

  async markResolved(incidentId) {
    const incident = (await http.get(`/incidents/${incidentId}`)).data;
    await http.patch(`/incidents/${incidentId}`, { status: 'Resolved', resolvedAt: nowISO() });
    const alerts = (await http.get('/alerts', { params: { incidentId } })).data;
    for (const alert of alerts) await http.patch(`/alerts/${alert.id}`, { status: 'Resolved', resolvedAt: nowISO() });
    await this.recalculateZone(incident.accountId, incident.zoneId);
    return incident;
  }

  async markFalseAlarm(incidentId) {
    const incident = (await http.get(`/incidents/${incidentId}`)).data;
    const response = await http.patch(`/incidents/${incidentId}`, { status: 'False Alarm', resolvedAt: nowISO() });
    const alerts = (await http.get('/alerts', { params: { incidentId } })).data;
    for (const alert of alerts) await http.patch(`/alerts/${alert.id}`, { status: 'Resolved', resolvedAt: nowISO() });
    await this.recalculateZone(incident.accountId, incident.zoneId);
    return response.data;
  }

  async addNote(incidentId, note) { const response = await http.patch(`/incidents/${incidentId}`, { note }); return response.data; }
  async markNotificationRead(notifId) { const response = await http.patch(`/notifications/${notifId}`, { read: true }); return response.data; }
  async confirmNotification(notifId) { const response = await http.patch(`/notifications/${notifId}`, { confirmed: true, read: true, confirmedAt: nowISO() }); return response.data; }
}
