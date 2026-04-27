<template>
  <el-dialog v-model="visible" title="添加联系人" width="480px" :close-on-click-modal="false">
    <el-form :model="form" label-width="80px">
      <el-form-item label="姓名" required>
        <el-input v-model="form.name" placeholder="请输入姓名" />
      </el-form-item>
      <el-form-item label="电话">
        <el-input v-model="form.phone" placeholder="电话号码" />
      </el-form-item>
      <el-form-item label="邮箱">
        <el-input v-model="form.email" placeholder="邮箱地址" />
      </el-form-item>
      <el-form-item label="分组">
        <el-select v-model="form.groupId" placeholder="选择分组" clearable style="width: 100%">
          <el-option
            v-for="group in graphStore.groups"
            :key="group.id"
            :label="group.name"
            :value="group.id"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useGraphStore } from '../stores/graphStore'
import { createPerson, getPersons } from '../api/person'
import { ElMessage } from 'element-plus'

const graphStore = useGraphStore()
const visible = ref(false)
const form = ref<any>({
  name: '',
  phone: '',
  email: '',
  groupId: null,
  positionX: 0,
  positionY: 0,
})

let pendingPosition: { x: number; y: number } | null = null

const handleOpen = (e: Event) => {
  const detail = (e as CustomEvent).detail
  pendingPosition = detail || null
  form.value = {
    name: '',
    phone: '',
    email: '',
    groupId: null,
    positionX: detail?.x || Math.random() * 600,
    positionY: detail?.y || Math.random() * 400,
  }
  visible.value = true
}

const handleSubmit = async () => {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入姓名')
    return
  }
  try {
    const res = await createPerson(form.value)
    const persons = await getPersons()
    graphStore.setPersons(persons)
    graphStore.selectNode(String(res))
    visible.value = false
    ElMessage.success('添加成功')
  } catch (err) {
    ElMessage.error('添加失败')
  }
}

onMounted(() => {
  window.addEventListener('add-person', handleOpen)
  window.addEventListener('add-person-at', handleOpen)
})

onUnmounted(() => {
  window.removeEventListener('add-person', handleOpen)
  window.removeEventListener('add-person-at', handleOpen)
})
</script>
