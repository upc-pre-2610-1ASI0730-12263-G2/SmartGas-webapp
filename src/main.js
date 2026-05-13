import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';

import 'primevue/resources/themes/lara-light-blue/theme.css';
import 'primevue/resources/primevue.min.css';
import 'primeicons/primeicons.css';

import Button from 'primevue/button';
import Card from 'primevue/card';
import Toast from 'primevue/toast';

import './styles.css';
import App from './App.js';
import router from './app/router/index.js';
import i18n from './i18n/index.js';

const app = createApp(App);

app.use(PrimeVue, { ripple: true });
app.use(ToastService);
app.use(router);
app.use(i18n);

app.component('Button', Button);
app.component('Card', Card);
app.component('Toast', Toast);

app.mount('#app');
