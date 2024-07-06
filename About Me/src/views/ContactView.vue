<template>
    <div>
      <h1>Contact Me</h1>
      <form @submit.prevent="submitForm">
        <label for="name">Name:</label>
        <input type="text" v-model="name" required />
        <label for="email">Email:</label>
        <input type="email" v-model="email" required />
        <label for="message">Message:</label>
        <textarea v-model="message" required></textarea>
        <button type="submit">Submit</button>
      </form>
    </div>
  </template>
  
  <script>
  export default {
    name: "Contact",
    data() {
      return {
        name: "",
        email: "",
        message: "",
      };
    },
    methods: {
      submitForm() {
        // Add form submission logic here
        alert(`Message sent by ${this.name}`);
      },
    },
  };
  </script>
  
  <style scoped>
  /* Add scoped styles for Contact.vue */
  </style>
  