import { http } from '../../../shared/infrastructure/http/api-client.js';
import { nowISO } from '../../../shared/utils/date-format.js';

const todayDate = () => new Date().toISOString().split('T')[0];
const oneYearDate = () => new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];

export class SubscriptionService {
  async getPlans() {
    const response = await http.get('/plans');
    return response.data;
  }

  async ensureBasicSubscription(accountId) {
    const existing = (await http.get('/subscriptions', { params: { accountId } })).data[0] || null;
    if (existing) return existing;

    const response = await http.post('/subscriptions', {
      accountId,
      planId: 1,
      status: 'Active',
      startDate: todayDate(),
      renewalDate: oneYearDate(),
      createdAt: nowISO(),
      updatedAt: nowISO()
    });

    await http.patch(`/accounts/${accountId}`, { planId: 1 }).catch(() => null);
    const profiles = (await http.get('/profiles', { params: { accountId } })).data;
    if (profiles[0]) await http.patch(`/profiles/${profiles[0].id}`, { planId: 1 }).catch(() => null);

    return response.data;
  }

  async getSubscription(accountId) {
    return this.ensureBasicSubscription(accountId);
  }

  async getPendingRequest(accountId) {
    const response = await http.get('/subscriptionRequests', { params: { accountId, status: 'Pending' } });
    return response.data[0] || null;
  }

  async getAllRequests(accountId) {
    const response = await http.get('/subscriptionRequests', { params: { accountId } });
    return response.data;
  }

  async createRequest(accountId, currentPlanId, targetPlanId) {
    const subscription = await this.ensureBasicSubscription(accountId);
    const current = currentPlanId || subscription.planId || 1;
    const response = await http.post('/subscriptionRequests', {
      accountId,
      currentPlanId: current,
      targetPlanId,
      status: 'Pending',
      createdAt: nowISO(),
      updatedAt: nowISO()
    });
    return response.data;
  }

  async cancelRequest(requestId) {
    const response = await http.patch(`/subscriptionRequests/${requestId}`, {
      status: 'Cancelled',
      updatedAt: nowISO()
    });
    return response.data;
  }

  async approveRequest(requestId, subscriptionId, targetPlanId, accountId) {
    const subscription = subscriptionId ? { id: subscriptionId } : await this.ensureBasicSubscription(accountId);

    await http.patch(`/subscriptionRequests/${requestId}`, {
      status: 'Approved',
      updatedAt: nowISO()
    });
    await http.patch(`/subscriptions/${subscription.id}`, {
      planId: targetPlanId,
      updatedAt: nowISO()
    });
    await http.patch(`/accounts/${accountId}`, { planId: targetPlanId });
    const profiles = (await http.get('/profiles', { params: { accountId } })).data;
    if (profiles[0]) await http.patch(`/profiles/${profiles[0].id}`, { planId: targetPlanId });
    return true;
  }
}
