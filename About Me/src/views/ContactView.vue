<template>
  <div>
    <h1>Contact Me</h1>
    <form @submit.prevent="submitForm">
      <label for="name">Name:</label>
      <input type="text" id="name" v-model="name" required />
      <label for="email">Email:</label>
      <input type="email" id="email" v-model="email" required />
      <label for="message">Message:</label>
      <textarea id="message" v-model="message" required></textarea>
      <button type="submit">Submit</button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const name = ref('');
const email = ref('');
const message = ref('');

const submitForm = () => {
  alert(`Message sent by ${name.value}`);
};
</script>

<style scoped>
/* Scoped styles for ContactView.vue */

/* Example styles */
form {
  margin-top: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
}

input,
textarea {
  width: 100%;
  padding: 10px;
  margin-bottom: 16px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

button {
  background-color: #4caf50;
  color: white;
  padding: 12px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button:hover {
  background-color: #45a049;
}
</style>
