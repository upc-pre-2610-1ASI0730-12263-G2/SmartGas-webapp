import { http } from '../../shared/infrastructure/http/api-client.js';
import { SessionService } from '../../shared/infrastructure/session.service.js';

const sessionService = new SessionService();
const todayISO = () => new Date().toISOString();
const todayDate = () => new Date().toISOString().split('T')[0];
const oneYearDate = () => new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

export class AccountService {
  async login(email, password) {
    const response = await http.get('/accounts', { params: { email, password } });
    const account = response.data[0] || null;
    if (account) {
      sessionService.save(account);
      await http.post('/accountActivities', {
        accountId: account.id,
        type: 'login',
        title: 'activityLogin',
        detail: 'Web browser · Lima, PE',
        createdAt: todayISO()
      });
    }
    return account;
  }

  async register(email, password, profileData = {}) {
    const check = await http.get('/accounts', { params: { email } });
    if (check.data.length > 0) throw new Error('EMAIL_EXISTS');

    const fullName = profileData.fullName || email.split('@')[0];
    const accountType = profileData.accountType || 'commercial';
    const businessName = profileData.businessName || 'SmartGas monitored facility';

    const account = await http.post('/accounts', {
      email,
      password,
      name: fullName,
      role: accountType === 'commercial' ? 'Restaurant Administrator' : 'Home Owner',
      accountType,
      planId: 1
    });

    await http.post('/profiles', {
      accountId: account.data.id,
      fullName,
      email,
      role: accountType === 'commercial' ? 'Restaurant Administrator' : 'Home Owner',
      accountType,
      businessName,
      phone: profileData.phone || '',
      district: profileData.district || '',
      planId: 1,
      memberSince: todayDate(),
      verified: true
    });

    await http.post('/subscriptions', {
      accountId: account.data.id,
      planId: 1,
      status: 'Active',
      startDate: todayDate(),
      renewalDate: oneYearDate()
    });

    await http.post('/settings', {
      accountId: account.data.id,
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
      autoResolveSafeReadings: false,
      offlineSensorAlerts: true,
      lowBatteryAlerts: true,
      criticalOnly: false,
      dailySummary: false,
      soundAlerts: true,
      notifyEmergencyContact: true,
      smokeSensitivity: 'Medium',
      coWarningLimit: 35,
      sessionDurationHours: 8,
      autoLogout: true,
      suspiciousLoginAlerts: true,
      twoFactorEnabled: false,
      dateFormat: 'DD/MM/YYYY',
      darkMode: false,
      compactView: false
    });

    await http.post('/emergencyContacts', {
      accountId: account.data.id,
      emergencyName: '',
      emergencyPhone: '',
      emergencyEmail: ''
    });

    await http.post('/accountActivities', {
      accountId: account.data.id,
      type: 'account',
      title: 'accountVerified',
      detail: 'SmartGas Basic',
      createdAt: todayISO()
    });

    sessionService.save(account.data);
    return account.data;
  }
}
