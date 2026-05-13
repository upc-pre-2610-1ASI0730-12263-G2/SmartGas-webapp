import { http } from '../../infrastructure/http/api-client.js';

export class DashboardService {
  async getDashboardData(accountId) {
    const [sensors, zones, incidents, alerts, sensorReadings, subscriptions, plans] = await Promise.all([
      http.get('/sensors', { params: { accountId } }),
      http.get('/zones', { params: { accountId } }),
      http.get('/incidents', { params: { accountId } }),
      http.get('/alerts', { params: { accountId } }),
      http.get('/sensorReadings', { params: { accountId } }),
      http.get('/subscriptions', { params: { accountId } }),
      http.get('/plans')
    ]);

    const activeIncidents = incidents.data.filter(i => i.status === 'Detected' || i.status === 'Reviewed');
    const pendingAlerts = alerts.data.filter(a => a.status === 'Pending');

    let overallStatus = 'Safe';
    if (activeIncidents.some(i => i.severity === 'Critical')) overallStatus = 'Critical';
    else if (activeIncidents.length > 0 || pendingAlerts.length > 0) overallStatus = 'Warning';

    const subscription = subscriptions.data[0] || null;
    const plan = subscription ? plans.data.find(p => p.id === subscription.planId) : null;

    const lastReading = sensorReadings.data.length > 0
      ? sensorReadings.data[sensorReadings.data.length - 1]
      : null;

    const criticalZone = zones.data.find(z => z.status === 'Critical') ||
      zones.data.find(z => z.status === 'Warning') || null;

    return {
      sensors: sensors.data,
      zones: zones.data,
      activeIncidents,
      pendingAlerts,
      overallStatus,
      plan,
      subscription,
      lastReading,
      criticalZone
    };
  }
}
