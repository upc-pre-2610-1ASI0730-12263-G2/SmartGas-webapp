import { onMounted } from 'vue';

export default {
  name: 'App',
  setup() {
    onMounted(() => {
      document.body.classList.add('smartgas-theme');
    });
  },
  template: '<router-view />'
};
