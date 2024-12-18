import About from '@/views/AboutView.vue';
import Contact from '@/views/ContactView.vue';
import Home from '@/views/HomeView.vue';
import Projects from '@/views/ProjectsView.vue';
import Reviews from '@/views/ReviewsView.vue';

// Example route configuration
const routes = [
  { path: '/about', component: About },
  { path: '/contact', component: Contact },
  { path: '/home', component: Home },
  { path: '/projects', component: Projects },
  { path: '/reviews', component: Reviews },
];

export default routes;
