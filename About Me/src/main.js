
// Import Vue and router from the correct file paths

import { createApp } from 'vue';  // Updated import statement
import App from './App.vue';
import routes from '@/router/routes.js'; 
import { createRouter, createWebHistory } from 'vue-router'; // Ensure the correct file name and extension are used

const app = createApp(App);

app.use(router);

app.mount('#app');
