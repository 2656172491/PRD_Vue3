<template>
  <el-dialog v-model="visible" title="添加联系人" width="480px" :close-on-click-modal="false">
    <el-form label-width="80px">
      <el-form-item label="姓名" required>
        <el-input v-model="form.name" placeholder="请输入姓名" />
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

      <!-- 预设常用字段 -->
      <el-form-item label="电话">
        <el-input v-model="presetData.phone" placeholder="电话号码" />
      </el-form-item>
      <el-form-item label="邮箱">
        <el-input v-model="presetData.email" placeholder="邮箱地址" />
      </el-form-item>

      <!-- 自定义字段 -->
      <div v-for="(field, idx) in extraFields" :key="idx" class="extra-field">
        <el-input v-model="field.key" placeholder="字段名" style="width: 120px" />
        <el-input v-model="field.value" placeholder="值" />
        <el-button text :icon="Delete" @click="removeExtraField(idx)" />
      </div>

      <el-button text :icon="Plus" @click="addExtraField">添加字段</el-button>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { useGraphStore } from '../stores/graphStore'
import { createPerson, getPersons } from '../api/person'
import { ElMessage } from 'element-plus'

const graphStore = useGraphStore()
const visible = ref(false)
const form = ref<any>({
  name: '',
  groupId: null,
  positionX: 0,
  positionY: 0,
})
const presetData = ref<Record<string, string>>({
  phone: '',
  email: '',
})
const extraFields = ref<{ key: string; value: string }[]>([])

const handleOpen = (e: Event) => {
  const detail = (e as CustomEvent).detail
  form.value = {
    name: '',
    groupId: null,
    positionX: detail?.x || Math.random() * 600,
    positionY: detail?.y || Math.random() * 400,
  }
  presetData.value = { phone: '', email: '' }
  extraFields.value = []
  visible.value = true
}

const addExtraField = () => {
  extraFields.value.push({ key: '', value: '' })
}

const removeExtraField = (idx: number) => {
  extraFields.value.splice(idx, 1)
}

const handleSubmit = async () => {
  if (!form.value.name.trim()) {
    ElMessage.warning('请输入姓名')
    return
  }

  // 组装 data JSON
  const data: Record<string, string> = {}
  Object.entries(presetData.value).forEach(([k, v]) => {
    if (v && v.trim()) data[k] = v.trim()
  })
  extraFields.value.forEach((f) => {
    if (f.key.trim() && f.value.trim()) {
      data[f.key.trim()] = f.value.trim()
    }
  })

  try {
    const res = await createPerson({
      ...form.value,
      data,
    })
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

<style scoped lang="scss">
.extra-field {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}
</style>
