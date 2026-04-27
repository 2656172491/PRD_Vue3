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
        <el-form label-position="top" size="small">
          <el-form-item label="电话">
            <el-input v-model="form.phone" placeholder="电话号码" @blur="handleSave" />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="form.email" placeholder="邮箱地址" @blur="handleSave" />
          </el-form-item>
          <el-form-item label="地址">
            <el-input v-model="form.address" placeholder="居住地址" @blur="handleSave" />
          </el-form-item>
          <el-form-item label="爱好">
            <el-input v-model="form.hobby" placeholder="兴趣爱好" @blur="handleSave" />
          </el-form-item>
          <el-form-item label="初识时间">
            <el-date-picker v-model="form.firstMetDate" type="date" placeholder="选择日期" style="width: 100%" @change="handleSave" />
          </el-form-item>
          <el-form-item label="初识地点">
            <el-input v-model="form.firstMetPlace" placeholder="初识地点" @blur="handleSave" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="备注信息" @blur="handleSave" />
          </el-form-item>

          <!-- 自定义字段 -->
          <div v-if="customFields.length > 0" class="custom-fields">
            <el-form-item v-for="(field, idx) in customFields" :key="idx" :label="field.key">
              <el-input v-model="field.value" @blur="handleSave" />
            </el-form-item>
          </div>

          <el-button text :icon="Plus" @click="showAddField = true">添加自定义字段</el-button>
        </el-form>

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
          </div>
        </div>
      </div>
    </div>

    <!-- 添加自定义字段弹窗 -->
    <el-dialog v-model="showAddField" title="添加自定义字段" width="360px">
      <el-form label-width="60px">
        <el-form-item label="名称">
          <el-input v-model="newFieldKey" placeholder="如：公司、生日" />
        </el-form-item>
        <el-form-item label="值">
          <el-input v-model="newFieldValue" placeholder="字段值" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddField = false">取消</el-button>
        <el-button type="primary" @click="handleAddField">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Close, Plus } from '@element-plus/icons-vue'
import { useGraphStore } from '../stores/graphStore'
import { updatePerson } from '../api/person'
import { ElMessage } from 'element-plus'

const graphStore = useGraphStore()
const showAddField = ref(false)
const newFieldKey = ref('')
const newFieldValue = ref('')

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

const form = ref<any>({})
const customFields = ref<{ key: string; value: any }[]>([])

watch(() => person.value, (p) => {
  if (p) {
    form.value = { ...p }
    const cf = p.customFields || {}
    customFields.value = Object.entries(cf).map(([key, value]) => ({ key, value }))
  }
}, { immediate: true })

const handleSave = async () => {
  if (!person.value) return
  const data: any = { ...form.value }
  // 转换自定义字段
  const cf: Record<string, any> = {}
  customFields.value.forEach((f) => {
    if (f.key) cf[f.key] = f.value
  })
  data.customFields = cf
  await updatePerson(person.value.id, data)
  graphStore.updatePerson(data)
  ElMessage.success('保存成功')
}

const handleAddField = () => {
  if (!newFieldKey.value.trim()) return
  customFields.value.push({
    key: newFieldKey.value,
    value: newFieldValue.value,
  })
  showAddField.value = false
  newFieldKey.value = ''
  newFieldValue.value = ''
  handleSave()
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

  :deep(.el-form-item__label) {
    color: #94a3b8;
    font-size: 12px;
    padding-bottom: 4px;
  }

  :deep(.el-input__wrapper),
  :deep(.el-textarea__inner) {
    background: rgba(30, 41, 59, 0.6);
    box-shadow: 0 0 0 1px rgba(148, 163, 184, 0.15);

    &.is-focus {
      box-shadow: 0 0 0 1px #38bdf8;
    }
  }

  :deep(.el-input__inner),
  :deep(.el-textarea__inner) {
    color: #e2e8f0;

    &::placeholder {
      color: #475569;
    }
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
</style>
