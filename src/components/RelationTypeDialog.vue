<template>
  <el-dialog v-model="visible" title="选择关系类型" width="400px" :close-on-click-modal="false">
    <el-checkbox-group v-model="selectedTypes">
      <el-checkbox
        v-for="type in graphStore.relationTypes"
        :key="type"
        :label="type"
      >
        {{ type }}
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

const handleOpen = (e: Event) => {
  const detail = (e as CustomEvent).detail
  callback = detail.callback
  selectedTypes.value = []
  newType.value = ''
  visible.value = true
}

const handleAddType = async () => {
  if (!newType.value.trim()) return
  if (graphStore.relationTypes.includes(newType.value.trim())) {
    ElMessage.warning('该类型已存在')
    return
  }
  try {
    await createRelationType({ typeName: newType.value.trim() })
    const types = await getRelationTypes()
    graphStore.setRelationTypes(types.map((t: any) => t.typeName))
    selectedTypes.value.push(newType.value.trim())
    newType.value = ''
    ElMessage.success('添加成功')
  } catch (err) {
    ElMessage.error('添加失败')
  }
}

const handleConfirm = () => {
  if (selectedTypes.value.length === 0) {
    ElMessage.warning('请至少选择一种关系类型')
    return
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
