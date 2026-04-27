<template>
  <div class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="toggle-btn" @click="isCollapsed = !isCollapsed">
      <el-icon><ArrowLeft v-if="!isCollapsed" /><ArrowRight v-else /></el-icon>
    </div>

    <div v-if="!isCollapsed" class="sidebar-content">
      <!-- 分组管理 -->
      <div class="section">
        <div class="section-header">
          <h3>分组</h3>
          <el-button text :icon="Plus" size="small" @click="showAddGroup = true">新建</el-button>
        </div>
        <div class="group-list">
          <div
            v-for="group in graphStore.groups"
            :key="group.id"
            class="group-item"
            :style="{ borderLeftColor: group.color || '#38bdf8' }"
            @click="handleSelectGroup(group.id)"
            :class="{ active: selectedGroupId === group.id }"
          >
            <span class="group-name">{{ group.name }}</span>
            <span class="group-count">{{ getGroupCount(group.id) }}</span>
          </div>
          <div v-if="graphStore.groups.length === 0" class="empty-hint">
            暂无分组
          </div>
        </div>
      </div>

      <!-- 关系类型管理 -->
      <div class="section">
        <div class="section-header">
          <h3>关系类型</h3>
          <el-button text :icon="Plus" size="small" @click="showAddRelationType = true">新建</el-button>
        </div>
        <div class="relation-type-list">
          <div
            v-for="type in graphStore.relationTypes"
            :key="type"
            class="relation-type-item"
          >
            <span class="type-dot" :style="{ background: getTypeColor(type) }" />
            <span class="type-name">{{ type }}</span>
          </div>
          <div v-if="graphStore.relationTypes.length === 0" class="empty-hint">
            暂无关系类型
          </div>
        </div>
      </div>
    </div>

    <!-- 新建分组弹窗 -->
    <el-dialog v-model="showAddGroup" title="新建分组" width="360px">
      <el-form :model="groupForm" label-width="60px">
        <el-form-item label="名称">
          <el-input v-model="groupForm.name" placeholder="分组名称" />
        </el-form-item>
        <el-form-item label="颜色">
          <el-color-picker v-model="groupForm.color" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddGroup = false">取消</el-button>
        <el-button type="primary" @click="handleCreateGroup">确定</el-button>
      </template>
    </el-dialog>

    <!-- 新建关系类型弹窗 -->
    <el-dialog v-model="showAddRelationType" title="新建关系类型" width="360px">
      <el-form :model="relationTypeForm" label-width="60px">
        <el-form-item label="名称">
          <el-input v-model="relationTypeForm.name" placeholder="关系类型名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddRelationType = false">取消</el-button>
        <el-button type="primary" @click="handleCreateRelationType">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ArrowLeft, ArrowRight, Plus } from '@element-plus/icons-vue'
import { useGraphStore } from '../stores/graphStore'
import { createGroup, getGroups } from '../api/group'
import { createRelationType, getRelationTypes } from '../api/relationType'
import { ElMessage } from 'element-plus'

const graphStore = useGraphStore()
const isCollapsed = ref(false)
const selectedGroupId = ref<number | null>(null)

// 分组
const showAddGroup = ref(false)
const groupForm = ref({ name: '', color: '#38bdf8' })

// 关系类型
const showAddRelationType = ref(false)
const relationTypeForm = ref({ name: '' })

// 关系类型颜色映射
const typeColorMap: Record<string, string> = {}
const typeColors = ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#fb7185', '#34d399', '#fbbf24', '#a78bfa']

const getTypeColor = (type: string) => {
  if (!typeColorMap[type]) {
    const idx = Object.keys(typeColorMap).length % typeColors.length
    typeColorMap[type] = typeColors[idx]
  }
  return typeColorMap[type]
}

const getGroupCount = (groupId: number) => {
  return graphStore.persons.filter((p) => p.groupId === groupId).length
}

const handleSelectGroup = (groupId: number) => {
  selectedGroupId.value = selectedGroupId.value === groupId ? null : groupId
  // 可选：触发分组筛选逻辑
}

const handleCreateGroup = async () => {
  if (!groupForm.value.name.trim()) {
    ElMessage.warning('请输入分组名称')
    return
  }
  try {
    await createGroup(groupForm.value)
    const groups = await getGroups()
    graphStore.setGroups(groups || [])
    showAddGroup.value = false
    groupForm.value = { name: '', color: '#38bdf8' }
    ElMessage.success('分组创建成功')
  } catch (err) {
    ElMessage.error('创建失败')
  }
}

const handleCreateRelationType = async () => {
  if (!relationTypeForm.value.name.trim()) {
    ElMessage.warning('请输入关系类型名称')
    return
  }
  if (graphStore.relationTypes.includes(relationTypeForm.value.name.trim())) {
    ElMessage.warning('该关系类型已存在')
    return
  }
  try {
    await createRelationType({ typeName: relationTypeForm.value.name.trim() })
    const types = await getRelationTypes()
    graphStore.setRelationTypes(types.map((t: any) => t.typeName))
    showAddRelationType.value = false
    relationTypeForm.value = { name: '' }
    ElMessage.success('关系类型创建成功')
  } catch (err) {
    ElMessage.error('创建失败')
  }
}
</script>

<style scoped lang="scss">
.sidebar {
  position: relative;
  width: 220px;
  height: 100%;
  background: rgba(15, 23, 42, 0.9);
  border-right: 1px solid rgba(148, 163, 184, 0.1);
  transition: width 0.3s ease;
  flex-shrink: 0;

  &.collapsed {
    width: 36px;
  }
}

.toggle-btn {
  position: absolute;
  top: 12px;
  right: -12px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #1e293b;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 50%;
  cursor: pointer;
  color: #94a3b8;
  font-size: 12px;
  z-index: 10;

  &:hover {
    color: #38bdf8;
    border-color: #38bdf8;
  }
}

.sidebar-content {
  padding: 16px;
  height: 100%;
  overflow-y: auto;
}

.section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;

  h3 {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
}

.group-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: rgba(30, 41, 59, 0.5);
  border-left: 3px solid;
  border-radius: 0 6px 6px 0;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(30, 41, 59, 0.8);
  }

  &.active {
    background: rgba(56, 189, 248, 0.1);
  }

  .group-name {
    font-size: 13px;
    color: #e2e8f0;
  }

  .group-count {
    font-size: 11px;
    color: #64748b;
    background: rgba(15, 23, 42, 0.6);
    padding: 2px 8px;
    border-radius: 10px;
  }
}

.relation-type-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.relation-type-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(30, 41, 59, 0.3);
  border-radius: 6px;
  transition: all 0.2s;

  &:hover {
    background: rgba(30, 41, 59, 0.6);
  }

  .type-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .type-name {
    font-size: 13px;
    color: #e2e8f0;
  }
}

.empty-hint {
  text-align: center;
  padding: 12px;
  color: #475569;
  font-size: 12px;
}
</style>
