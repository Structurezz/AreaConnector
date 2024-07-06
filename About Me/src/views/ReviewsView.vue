<template>
    <div>
      <h1>Reviews</h1>
      <div class="review-popup" v-if="showReview">
        <p>{{ currentReview }}</p>
        <button @click="closeReview">Close</button>
      </div>
      <button @click="showRandomReview">Show Review</button>
    </div>
  </template>
  
  <script>
  export default {
    name: "Reviews",
    data() {
      return {
        reviews: [
          "Review 1: Excellent work!",
          "Review 2: Highly recommended!",
          "Review 3: Very professional!",
          // Add more reviews as needed
        ],
        currentReview: "",
        showReview: false,
      };
    },
    methods: {
      showRandomReview() {
        const randomIndex = Math.floor(Math.random() * this.reviews.length);
        this.currentReview = this.reviews[randomIndex];
        this.showReview = true;
      },
      closeReview() {
        this.showReview = false;
      },
    },
  };
  </script>
  
  <style scoped>
  /* Add scoped styles for Reviews.vue */
  </style>
  