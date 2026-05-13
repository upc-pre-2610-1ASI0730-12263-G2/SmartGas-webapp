import { createRouter, createWebHistory } from 'vue-router';

import LayoutComponent from '../../shared/presentation/components/layout.component.js';
import DashboardPage from '../../shared/dashboard/presentation/pages/dashboard-page.component.js';
import ComingSoonPage from '../../shared/presentation/pages/coming-soon-page.component.js';
import NotFoundPage from '../../shared/presentation/pages/not-found-page.component.js';

const routes = [
  { path: '/', redirect: '/app/dashboard' },
  {
    path: '/app',
    component: LayoutComponent,
    children: [
      { path: '', redirect: '/app/dashboard' },
      { path: 'dashboard', component: DashboardPage },
      { path: 'monitoring', component: ComingSoonPage, meta: { sectionKey: 'monitoring' } },
      { path: 'devices', component: ComingSoonPage, meta: { sectionKey: 'devices' } },
      { path: 'incidents', component: ComingSoonPage, meta: { sectionKey: 'incidents' } },
      { path: 'reports', component: ComingSoonPage, meta: { sectionKey: 'reports' } },
      { path: 'subscription', component: ComingSoonPage, meta: { sectionKey: 'subscription' } },
      { path: 'profile', component: ComingSoonPage, meta: { sectionKey: 'profile' } },
      { path: 'settings', component: ComingSoonPage, meta: { sectionKey: 'settings' } }
    ]
  },
  { path: '/:pathMatch(.*)*', component: NotFoundPage }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
