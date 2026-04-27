<template>
  <div class="app-container">
    <MainLayout />
  </div>
</template>

<script setup lang="ts">
import MainLayout from './views/MainLayout.vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app, .app-container {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
