import { http } from '../../../shared/infrastructure/http/api-client.js';

export class ProfileService {
  async getProfile(accountId) {
    const response = await http.get('/profiles', { params: { accountId } });
    return response.data[0] || null;
  }

  async updateProfile(profileId, data) {
    const response = await http.patch(`/profiles/${profileId}`, data);
    return response.data;
  }

  async getPlan(planId) {
    if (!planId) return null;
    const response = await http.get(`/plans/${planId}`);
    return response.data;
  }

  async getSubscription(accountId) {
    const response = await http.get('/subscriptions', { params: { accountId } });
    return response.data[0] || null;
  }

  async getActivity(accountId) {
    const response = await http.get('/accountActivities', { params: { accountId } });
    return response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  async getStats(accountId) {
    const [sensors, zones, incidents] = await Promise.all([
      http.get('/sensors', { params: { accountId } }),
      http.get('/zones', { params: { accountId } }),
      http.get('/incidents', { params: { accountId } })
    ]);
    return {
      sensors: sensors.data,
      zones: zones.data,
      activeIncidents: incidents.data.filter(i => i.status === 'Detected' || i.status === 'Reviewed')
    };
  }

  async changePassword(accountId, password) {
    const response = await http.patch(`/accounts/${accountId}`, { password });
    await http.post('/accountActivities', {
      accountId,
      type: 'security',
      title: 'changePassword',
      detail: 'Password updated',
      createdAt: new Date().toISOString()
    });
    return response.data;
  }
}
