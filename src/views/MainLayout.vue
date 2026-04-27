<template>
  <div class="main-layout">
    <TopBar />
    <div class="main-content">
      <SideBar />
      <div class="graph-area">
        <GraphCanvas />
        <PersonDetail />
      </div>
    </div>
    <AddPersonDialog />
    <RelationTypeDialog />
  </div>
</template>

<script setup lang="ts">
import TopBar from '../components/TopBar.vue'
import SideBar from '../components/SideBar.vue'
import GraphCanvas from '../components/GraphCanvas.vue'
import PersonDetail from '../components/PersonDetail.vue'
import AddPersonDialog from '../components/AddPersonDialog.vue'
import RelationTypeDialog from '../components/RelationTypeDialog.vue'
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

.graph-area {
  position: relative;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
</style>
