<template>
  <div class="top-bar">
    <div class="logo">
      <span class="logo-icon">◈</span>
      <span class="logo-text">关系库</span>
    </div>
    <div class="search-box">
      <el-input
        v-model="searchKeyword"
        placeholder="搜索联系人..."
        prefix-icon="Search"
        clearable
        @keyup.enter="handleSearch"
        @clear="handleClear"
      />
    </div>
    <div class="actions">
      <el-button type="primary" :icon="Plus" @click="handleAdd">添加联系人</el-button>
      <el-button :icon="RefreshLeft" :disabled="!canUndo" @click="handleUndo">撤销</el-button>
      <el-button :icon="RefreshRight" :disabled="!canRedo" @click="handleRedo">重做</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, RefreshLeft, RefreshRight, Search } from '@element-plus/icons-vue'
import { useGraphStore } from '../stores/graphStore'
import { useHistoryStore } from '../stores/historyStore'
import { searchPersons } from '../api/person'

const graphStore = useGraphStore()
const historyStore = useHistoryStore()

const searchKeyword = ref('')

const canUndo = computed(() => historyStore.canUndo())
const canRedo = computed(() => historyStore.canRedo())

const handleSearch = async () => {
  if (!searchKeyword.value.trim()) {
    handleClear()
    return
  }
  const res = await searchPersons(searchKeyword.value)
  // 高亮搜索结果
  if (res && res.length > 0) {
    graphStore.selectNode(String(res[0].id))
  }
}

const handleClear = () => {
  searchKeyword.value = ''
  graphStore.selectNode(null)
}

const handleAdd = () => {
  // 触发全局事件，由 GraphCanvas 处理
  window.dispatchEvent(new CustomEvent('add-person'))
}

const handleUndo = () => {
  window.dispatchEvent(new CustomEvent('undo-action'))
}

const handleRedo = () => {
  window.dispatchEvent(new CustomEvent('redo-action'))
}
</script>

<style scoped lang="scss">
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 20px;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
  backdrop-filter: blur(12px);
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Noto Serif SC', serif;

  .logo-icon {
    font-size: 22px;
    color: #38bdf8;
  }

  .logo-text {
    font-size: 18px;
    font-weight: 700;
    color: #f1f5f9;
    letter-spacing: 2px;
  }
}

.search-box {
  flex: 1;
  max-width: 400px;
  margin: 0 20px;

  :deep(.el-input__wrapper) {
    background: rgba(30, 41, 59, 0.8);
    box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.15);
    border-radius: 8px;

    &.is-focus {
      box-shadow: 0 0 0 1px #38bdf8;
    }
  }

  :deep(.el-input__inner) {
    color: #e2e8f0;

    &::placeholder {
      color: #64748b;
    }
  }
}

.actions {
  display: flex;
  gap: 8px;
}
</style>
