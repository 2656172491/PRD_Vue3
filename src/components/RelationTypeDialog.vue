<template>
  <el-dialog v-model="visible" title="选择关系类型" width="400px" :close-on-click-modal="false">
    <el-checkbox-group v-model="selectedTypes">
      <el-checkbox
        v-for="type in graphStore.relationTypes"
        :key="type.id"
        :label="type.typeName"
      >
        <span class="type-dot" :style="{ background: type.color || '#94a3b8' }"></span>
        {{ type.typeName }}
      </el-checkbox>
    </el-checkbox-group>
    <div class="new-type">
      <el-input v-model="newType" placeholder="输入新关系类型" @keyup.enter="handleAddType">
        <template #append>
          <el-button @click="handleAddType">添加</el-button>
        </template>
      </el-input>
    </div>
    <template #footer>
      <el-button @click="handleCancel">取消</el-button>
      <el-button type="primary" @click="handleConfirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useGraphStore } from '../stores/graphStore'
import { createRelationType, getRelationTypes } from '../api/relationType'
import { ElMessage } from 'element-plus'

const graphStore = useGraphStore()
const visible = ref(false)
const selectedTypes = ref<string[]>([])
const newType = ref('')
let callback: ((types: string[]) => void) | null = null

const typeColors = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185', '#34d399', '#fbbf24', '#a78bfa']

const handleOpen = (e: Event) => {
  const detail = (e as CustomEvent).detail
  callback = detail.callback
  selectedTypes.value = []
  newType.value = ''
  visible.value = true
}

const handleAddType = async () => {
  if (!newType.value.trim()) return
  const trimmedName = newType.value.trim()
  if (graphStore.relationTypes.some((t) => t.typeName === trimmedName)) {
    ElMessage.warning('该类型已存在')
    return
  }
  try {
    const color = typeColors[graphStore.relationTypes.length % typeColors.length]
    await createRelationType({ typeName: trimmedName, color })
    const types = await getRelationTypes()
    graphStore.setRelationTypes(types)
    selectedTypes.value.push(trimmedName)
    newType.value = ''
    ElMessage.success('添加成功')
  } catch (err) {
    ElMessage.error('添加失败')
  }
}

const handleConfirm = () => {
  if (selectedTypes.value.length === 0) {
    // 未选择时默认使用"默认"
    selectedTypes.value = ['默认']
  }
  if (callback) {
    callback(selectedTypes.value)
    callback = null
  }
  visible.value = false
}

const handleCancel = () => {
  callback = null
  visible.value = false
}

onMounted(() => {
  window.addEventListener('select-relation-type', handleOpen)
})

onUnmounted(() => {
  window.removeEventListener('select-relation-type', handleOpen)
})
</script>

<style scoped lang="scss">
.new-type {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);
}

.type-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-right: 6px;
}

:deep(.el-checkbox) {
  margin-right: 16px;
  margin-bottom: 8px;
  color: #e2e8f0;
}

:deep(.el-checkbox__input.is-checked + .el-checkbox__label) {
  color: #38bdf8;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #38bdf8;
  border-color: #38bdf8;
}
</style>
