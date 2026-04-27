<template>
  <div class="main-layout">
    <TopBar />
    <div class="main-content">
      <SideBar />
      <GraphCanvas />
      <PersonDetail />
    </div>
  </div>
</template>

<script setup lang="ts">
import TopBar from '../components/TopBar.vue'
import SideBar from '../components/SideBar.vue'
import GraphCanvas from '../components/GraphCanvas.vue'
import PersonDetail from '../components/PersonDetail.vue'
</script>

<style scoped lang="scss">
.main-layout {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: #0f172a;
}

.main-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}
</style>
