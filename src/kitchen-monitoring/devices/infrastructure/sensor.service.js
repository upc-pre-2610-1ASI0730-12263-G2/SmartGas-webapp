import { http } from '../../../shared/infrastructure/http/api-client.js';
import { nowISO } from '../../../shared/utils/date-format.js';

export class SensorService {
  async getSensors(accountId) {
    const response = await http.get('/sensors', { params: { accountId } });
    return response.data;
  }

  async getZones(accountId) {
    const response = await http.get('/zones', { params: { accountId } });
    return response.data;
  }

  async getPlanForAccount(accountId) {
    const subscriptions = (await http.get('/subscriptions', { params: { accountId } })).data;
    const accounts = (await http.get('/accounts', { params: { id: accountId } })).data;
    const planId = subscriptions[0]?.planId || accounts[0]?.planId || 1;
    const planResponse = await http.get(`/plans/${planId}`);
    return planResponse.data;
  }

  async createSensor(data) {
    const existing = await http.get('/sensors', { params: { accountId: data.accountId, code: data.code } });
    if (existing.data.length > 0) throw new Error('CODE_EXISTS');

    const plan = await this.getPlanForAccount(data.accountId);
    const currentSensors = (await http.get('/sensors', { params: { accountId: data.accountId } })).data;
    const maxSensors = plan?.maxSensors;
    if (maxSensors !== 'Unlimited' && currentSensors.length >= Number(maxSensors || 0)) {
      const error = new Error('SENSOR_LIMIT_REACHED');
      error.code = 'SENSOR_LIMIT_REACHED';
      throw error;
    }

    const response = await http.post('/sensors', {
      ...data,
      status: 'Online',
      battery: 100,
      lastReading: data.type === 'Temperature' ? '—' : '—',
      lastConnected: nowISO()
    });

    const zoneRes = await http.get(`/zones/${data.zoneId}`);
    await http.patch(`/zones/${data.zoneId}`, {
      sensorCount: Number(zoneRes.data.sensorCount || 0) + 1
    });

    return response.data;
  }

  async updateSensor(id, data) {
    const response = await http.patch(`/sensors/${id}`, data);
    return response.data;
  }

  async deactivateSensor(id) {
    const response = await http.patch(`/sensors/${id}`, { status: 'Offline' });
    return response.data;
  }

  async reactivateSensor(id) {
    const response = await http.patch(`/sensors/${id}`, { status: 'Online', lastConnected: nowISO() });
    return response.data;
  }
}
