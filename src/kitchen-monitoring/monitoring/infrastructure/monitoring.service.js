import { http } from '../../../shared/infrastructure/http/api-client.js';
import { nowISO } from '../../../shared/utils/date-format.js';

export class MonitoringService {
  async getZones(accountId) {
    const response = await http.get('/zones', { params: { accountId } });
    return response.data;
  }

  async getSensors(accountId) {
    const response = await http.get('/sensors', { params: { accountId } });
    return response.data;
  }

  async getSensorReadings(accountId) {
    const response = await http.get('/sensorReadings', { params: { accountId } });
    return response.data;
  }

  async getSettings(accountId) {
    const response = await http.get('/settings', { params: { accountId } });
    return response.data[0] || null;
  }

  async processReading(accountId, sensorId, gasValue, temperatureValue) {
    const sensor = (await http.get(`/sensors/${sensorId}`)).data;
    const settings = await this.getSettings(accountId);

    const gasV = Number(gasValue);
    const tempV = Number(temperatureValue);

    const gwl = settings ? settings.gasWarningLimit : 30;
    const gcl = settings ? settings.gasCriticalLimit : 50;
    const twl = settings ? settings.temperatureWarningLimit : 35;
    const tcl = settings ? settings.temperatureCriticalLimit : 55;

    const reading = await http.post('/sensorReadings', {
      accountId,
      sensorId,
      zoneId: sensor.zoneId,
      gasValue: gasV,
      temperatureValue: tempV,
      timestamp: nowISO(),
      triggeredIncident: false
    });

    await http.patch(`/sensors/${sensorId}`, {
      lastReading: sensor.type === 'Temperature' ? `${tempV} C` : `${gasV} ppm`,
      lastConnected: nowISO()
    });

    let incidentCreated = false;
    let severity = null;
    let incidentType = null;

    if (gasV >= gcl || tempV >= tcl) {
      severity = 'Critical';
      incidentType = gasV >= gcl ? 'Gas Leak' : 'High Temperature';
    } else if (gasV >= gwl || tempV >= twl) {
      severity = 'Warning';
      incidentType = gasV >= gwl ? 'Gas Leak' : 'High Temperature';
    }

    if (severity && settings && settings.autoCreateIncidents === false) {
      severity = null;
      incidentType = null;
    }

    if (severity) {
      const zoneRes = await http.get(`/zones/${sensor.zoneId}`);
      const zone = zoneRes.data;

      const incidents = (await http.get('/incidents', { params: { accountId } })).data;
      const incNum = incidents.length + 1;
      const incCode = `INC-${String(incNum).padStart(3, '0')}`;

      const incident = await http.post('/incidents', {
        accountId,
        code: incCode,
        type: incidentType,
        zoneId: sensor.zoneId,
        zoneName: zone.name,
        sensorId,
        sensorCode: sensor.code,
        detectedValue: incidentType === 'Gas Leak' ? `${gasV} ppm` : `${tempV} °C`,
        severity,
        status: 'Detected',
        detectedAt: nowISO(),
        reviewedAt: null,
        resolvedAt: null,
        note: ''
      });

      await http.patch(`/sensorReadings/${reading.data.id}`, { triggeredIncident: true });

      const alerts = (await http.get('/alerts', { params: { accountId } })).data;
      const altNum = alerts.length + 1;
      const altCode = `ALT-${String(altNum).padStart(3, '0')}`;

      const alert = await http.post('/alerts', {
        accountId,
        code: altCode,
        incidentId: incident.data.id,
        zoneId: sensor.zoneId,
        zoneName: zone.name,
        event: incidentType === 'Gas Leak'
          ? `Gas level above ${severity === 'Critical' ? 'critical' : 'warning'} threshold`
          : `Temperature above ${severity === 'Critical' ? 'critical' : 'warning'} threshold`,
        severity,
        status: 'Pending',
        createdAt: nowISO(),
        resolvedAt: null
      });

      const detectedValue = sensor.type === 'Temperature' ? tempV + ' °C' : gasV + ' ppm';
      await http.post('/notifications', {
        accountId,
        alertId: alert.data.id,
        incidentId: incident.data.id,
        message: `${severity}: ${incidentType} in ${zone.name}. Sensor ${sensor.code} detected ${detectedValue}. Incident ${incCode} created.`,
        messageKey: 'messageIncidentCreated',
        messageParams: { severity, type: incidentType, zone: zone.name, sensor: sensor.code, value: detectedValue, code: incCode },
        channel: 'Web',
        read: false,
        confirmed: false,
        confirmedAt: null,
        createdAt: nowISO()
      });

      await http.post('/accountActivities', {
        accountId,
        type: 'incident',
        title: 'activityIncidentUpdated',
        detail: `${incCode} · ${zone.name}`,
        createdAt: nowISO()
      }).catch(() => null);

      const newZoneStatus = severity === 'Critical' ? 'Critical' : 'Warning';
      await http.patch(`/zones/${sensor.zoneId}`, {
        status: newZoneStatus,
        gasLevel: gasV,
        temperature: tempV,
        riskLevel: severity,
        lastUpdated: nowISO()
      });

      incidentCreated = true;
    } else {
      await http.patch(`/zones/${sensor.zoneId}`, {
        gasLevel: gasV,
        temperature: tempV,
        lastUpdated: nowISO()
      });
    }

    return { incidentCreated, severity, incidentType };
  }


  async getPlanForAccount(accountId) {
    let subscriptions = (await http.get('/subscriptions', { params: { accountId } })).data;
    const accounts = (await http.get('/accounts', { params: { id: accountId } })).data;
    if (!subscriptions[0]) {
      const created = await http.post('/subscriptions', {
        accountId,
        planId: accounts[0]?.planId || 1,
        status: 'Active',
        startDate: new Date().toISOString().split('T')[0],
        renewalDate: new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
        createdAt: nowISO(),
        updatedAt: nowISO()
      });
      subscriptions = [created.data];
    }
    const planId = subscriptions[0]?.planId || accounts[0]?.planId || 1;
    const planResponse = await http.get(`/plans/${planId}`);
    return planResponse.data;
  }

  async createZone(accountId, zoneDraft) {
    const plan = await this.getPlanForAccount(accountId);
    const existing = (await http.get('/zones', { params: { accountId } })).data;
    const maxZones = plan?.maxZones;
    if (maxZones !== 'Unlimited' && existing.length >= Number(maxZones || 0)) {
      const error = new Error('ZONE_LIMIT_REACHED');
      error.code = 'ZONE_LIMIT_REACHED';
      throw error;
    }

    const name = String(zoneDraft?.name || '').trim();
    if (!name) {
      const error = new Error('EMPTY_ZONE_NAME');
      error.code = 'EMPTY_ZONE_NAME';
      throw error;
    }

    const response = await http.post('/zones', {
      accountId,
      name,
      description: zoneDraft?.description || '',
      status: 'Safe',
      gasLevel: 0,
      temperature: 0,
      sensorCount: 0,
      riskLevel: 'Low',
      lastUpdated: nowISO(),
      icon: 'home-zone-icon.png',
      sensitivity: zoneDraft?.sensitivity || 'Medium',
      active: true
    });

    return response.data;
  }

  async saveStarterZones(accountId, zonesDraft) {
    const created = [];
    for (const draft of zonesDraft || []) {
      if (String(draft?.name || '').trim()) {
        created.push(await this.createZone(accountId, draft));
      }
    }
    return created;
  }
}
