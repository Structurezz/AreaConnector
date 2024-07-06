<template>
    <div>
      <h1>Projects</h1>
      <div class="slider">
        <div class="project" v-for="project in projects" :key="project.id">
          <h3>{{ project.title }}</h3>
          <p>{{ project.description }}</p>
        </div>
      </div>
    </div>
  </template>
  
  <script>
  export default {
    name: "Projects",
    data() {
      return {
        projects: [
          { id: 1, title: "Project 1", description: "Description for project 1" },
          { id: 2, title: "Project 2", description: "Description for project 2" },
          // Add more projects as needed
        ],
      };
    },
  };
  </script>
  
  <style scoped>
  /* Add scoped styles for Projects.vue */
  </style>
  