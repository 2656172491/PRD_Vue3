<template>
  <div class="person-detail" :class="{ open: !!graphStore.selectedNodeId }">
    <div v-if="person" class="detail-content">
      <div class="detail-header">
        <div class="avatar" :style="{ background: avatarGradient }">
          {{ person.name?.charAt(0) }}
        </div>
        <div class="header-info">
          <h2 class="name">{{ person.name }}</h2>
          <span v-if="group" class="group-tag" :style="{ background: group.color + '20', color: group.color, borderColor: group.color + '40' }">
            {{ group.name }}
          </span>
        </div>
        <el-button class="close-btn" text :icon="Close" @click="graphStore.selectNode(null)" />
      </div>

      <div class="detail-body">
        <!-- 姓名始终可编辑 -->
        <div class="field-item">
          <label>姓名</label>
          <el-input v-model="editName" @blur="handleSave" />
        </div>

        <!-- 动态渲染 data 中的所有字段 -->
        <div v-for="(_value, key) in editData" :key="key" class="field-item">
          <label>
            {{ key }}
            <el-icon class="delete-icon" @click="removeField(key)"><Delete /></el-icon>
          </label>
          <el-input
            v-model="editData[key]"
            :placeholder="key"
            @blur="handleSave"
          />
        </div>

        <!-- 添加新字段 -->
        <div class="add-field-row">
          <el-input v-model="newFieldKey" placeholder="新字段名称" size="small" style="width: 120px" />
          <el-input v-model="newFieldValue" placeholder="值" size="small" @keyup.enter="addField" />
          <el-button :icon="Plus" size="small" @click="addField" />
        </div>

        <!-- 关联关系 -->
        <div class="relations-section">
          <h3>关联关系</h3>
          <div class="relation-list">
            <div
              v-for="rel in relatedRelations"
              :key="rel.id"
              class="relation-item"
              @click="jumpToPerson(getOtherPersonId(rel))"
            >
              <span class="relation-person">{{ getOtherPersonName(rel) }}</span>
              <span class="relation-types">{{ rel.relationTypes?.join(' / ') }}</span>
            </div>
            <div v-if="relatedRelations.length === 0" class="empty-relations">
              暂无关联关系
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Close, Plus, Delete } from '@element-plus/icons-vue'
import { useGraphStore } from '../stores/graphStore'
import { updatePerson } from '../api/person'
import { ElMessage } from 'element-plus'

const graphStore = useGraphStore()

const person = computed(() => {
  if (!graphStore.selectedNodeId) return null
  return graphStore.personMap[graphStore.selectedNodeId]
})

const group = computed(() => {
  if (!person.value?.groupId) return null
  return graphStore.groupMap[person.value.groupId]
})

const avatarGradient = computed(() => {
  const colors = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185']
  const idx = person.value?.name?.charCodeAt(0) % colors.length || 0
  const c1 = colors[idx]
  const c2 = colors[(idx + 1) % colors.length]
  return `linear-gradient(135deg, ${c1}, ${c2})`
})

const relatedRelations = computed(() => {
  if (!person.value) return []
  const pid = parseInt(person.value.id)
  return graphStore.relationships.filter(
    (r) => r.fromPersonId === pid || r.toPersonId === pid
  )
})

const getOtherPersonId = (rel: any) => {
  const pid = parseInt(person.value?.id)
  return rel.fromPersonId === pid ? rel.toPersonId : rel.fromPersonId
}

const getOtherPersonName = (rel: any) => {
  const otherId = getOtherPersonId(rel)
  return graphStore.personMap[otherId]?.name || '未知'
}

const jumpToPerson = (id: number) => {
  graphStore.selectNode(String(id))
}

// 编辑状态
const editName = ref('')
const editData = ref<Record<string, string>>({})
const newFieldKey = ref('')
const newFieldValue = ref('')

watch(() => person.value, (p) => {
  if (p) {
    editName.value = p.name || ''
    editData.value = {}
    if (p.data) {
      Object.entries(p.data).forEach(([k, v]) => {
        editData.value[k] = v != null ? String(v) : ''
      })
    }
  }
}, { immediate: true })

const addField = () => {
  if (!newFieldKey.value.trim()) {
    ElMessage.warning('请输入字段名称')
    return
  }
  const key = newFieldKey.value.trim()
  editData.value[key] = newFieldValue.value
  newFieldKey.value = ''
  newFieldValue.value = ''
  handleSave()
}

const removeField = (key: string) => {
  delete editData.value[key]
  handleSave()
}

const handleSave = async () => {
  if (!person.value) return
  const data: Record<string, any> = {}
  Object.entries(editData.value).forEach(([k, v]) => {
    if (v !== '' && v !== null && v !== undefined) {
      data[k] = v
    }
  })
  await updatePerson(person.value.id, {
    name: editName.value,
    data,
  })
  graphStore.updatePerson({
    id: person.value.id,
    name: editName.value,
    data,
  })
  ElMessage.success('保存成功')
}
</script>

<style scoped lang="scss">
.person-detail {
  width: 0;
  height: 100%;
  background: rgba(15, 23, 42, 0.95);
  border-left: 1px solid rgba(148, 163, 184, 0.1);
  overflow: hidden;
  transition: width 0.3s ease;

  &.open {
    width: 320px;
  }
}

.detail-content {
  width: 320px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);

  .avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 700;
    color: #fff;
    flex-shrink: 0;
  }

  .header-info {
    flex: 1;
    min-width: 0;

    .name {
      font-size: 18px;
      font-weight: 600;
      color: #f1f5f9;
      margin-bottom: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .group-tag {
      display: inline-block;
      font-size: 11px;
      padding: 2px 10px;
      border-radius: 12px;
      border: 1px solid;
    }
  }

  .close-btn {
    color: #64748b;

    &:hover {
      color: #e2e8f0;
    }
  }
}

.detail-body {
  flex: 1;
  padding: 16px 20px;
  overflow-y: auto;
}

.field-item {
  margin-bottom: 12px;

  label {
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 12px;
    color: #94a3b8;
    margin-bottom: 4px;
    text-transform: capitalize;

    .delete-icon {
      font-size: 12px;
      color: #64748b;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.2s;

      &:hover {
        color: #ef4444;
      }
    }

    &:hover .delete-icon {
      opacity: 1;
    }
  }

  :deep(.el-input__wrapper) {
    background: rgba(30, 41, 59, 0.6);
    box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.15);

    &.is-focus {
      box-shadow: 0 0 0 1px #38bdf8;
    }
  }

  :deep(.el-input__inner) {
    color: #e2e8f0;

    &::placeholder {
      color: #475569;
    }
  }
}

.add-field-row {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);

  :deep(.el-input__wrapper) {
    background: rgba(30, 41, 59, 0.6);
    box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.15);
  }

  :deep(.el-input__inner) {
    color: #e2e8f0;
  }
}

.relations-section {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(148, 163, 184, 0.1);

  h3 {
    font-size: 13px;
    font-weight: 600;
    color: #94a3b8;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
}

.relation-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.relation-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  background: rgba(30, 41, 59, 0.5);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(30, 41, 59, 0.8);
  }

  .relation-person {
    font-size: 13px;
    color: #e2e8f0;
  }

  .relation-types {
    font-size: 11px;
    color: #64748b;
    background: rgba(15, 23, 42, 0.6);
    padding: 2px 8px;
    border-radius: 10px;
  }
}

.empty-relations {
  text-align: center;
  padding: 20px;
  color: #475569;
  font-size: 13px;
}
</style>
