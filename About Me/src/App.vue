<template>
  <div id="app">
    <header>
      <div class="menu-toggle" @click="toggleMenu">
        <div class="line"></div>
        <div class="line"></div>
        <div class="line"></div>
      </div>
      <nav :class="{ active: isMenuOpen }">
        <ul>
          <li><router-link to="/">Home</router-link></li>
          <li><router-link to="/about">About</router-link></li>
          <li><router-link to="/projects">Projects</router-link></li>
          <li><router-link to="/contact">Contact</router-link></li>
          <li><router-link to="/reviews">Reviews</router-link></li>
        </ul>
      </nav>
    </header>
    <router-view />
  </div>
</template>

<script>

export default {
  name: "App",
  data() {
    return {
      isMenuOpen: false,
    };
  },
  methods: {
    toggleMenu() {
      this.isMenuOpen = !this.isMenuOpen;
    },
  },
};
</script>

<style>
/* Add global styles */
body {
  font-family: Arial, sans-serif;
  margin: 0;
  padding: 0;
  background-color: #f0f0f0;
}

header {
  background-color: #333;
  color: #fff;
  padding: 10px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: fixed;
  width: 100%;
  z-index: 1000;
}

.menu-toggle {
  cursor: pointer;
}

.menu-toggle .line {
  width: 25px;
  height: 3px;
  background-color: #fff;
  margin: 5px 0;
}

nav {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}

nav ul {
  list-style-type: none;
  display: flex;
  padding: 0;
}

nav ul li {
  margin: 0 10px;
}

nav ul li a {
  color: #fff;
  text-decoration: none;
  padding: 10px;
  transition: all 0.3s ease;
}

nav ul li a:hover {
  background-color: #555;
}

nav.active {
  display: block;
}

@media (max-width: 768px) {
  .menu-toggle {
    display: block;
  }

  nav {
    display: none;
    position: absolute;
    top: 60px;
    left: 0;
    background-color: #333;
    width: 100%;
    text-align: center;
  }

  nav.active {
    display: block;
  }

  nav ul {
    flex-direction: column;
  }

  nav ul li {
    margin: 10px 0;
  }
}
</style>
