<template>
  <div class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="toggle-btn" @click="isCollapsed = !isCollapsed">
      <el-icon><ArrowLeft v-if="!isCollapsed" /><ArrowRight v-else /></el-icon>
    </div>
    <div v-if="!isCollapsed" class="sidebar-content">
      <div class="section">
        <h3>分组</h3>
        <div class="group-list">
          <div
            v-for="group in graphStore.groups"
            :key="group.id"
            class="group-item"
            :style="{ borderLeftColor: group.color || '#38bdf8' }"
          >
            <span class="group-name">{{ group.name }}</span>
            <span class="group-count">{{ getGroupCount(group.id) }}</span>
          </div>
        </div>
        <el-button text :icon="Plus" @click="showAddGroup = true">新建分组</el-button>
      </div>
      <div class="section">
        <h3>数据</h3>
        <el-button text :icon="Download" @click="handleExport">导出 JSON</el-button>
        <el-button text :icon="Upload" @click="showImport = true">导入 JSON</el-button>
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

    <!-- 导入弹窗 -->
    <el-dialog v-model="showImport" title="导入数据" width="500px">
      <el-upload
        drag
        action="#"
        :auto-upload="false"
        :on-change="handleFileChange"
        accept=".json"
      >
        <el-icon class="el-icon--upload"><Upload /></el-icon>
        <div class="el-upload__text">拖拽文件到此处或 <em>点击上传</em></div>
      </el-upload>
      <div v-if="importPreview" class="import-preview">
        <p>新增: {{ importPreview.newCount }} 人</p>
        <p>更新: {{ importPreview.updateCount }} 人</p>
        <p>无效: {{ importPreview.invalidCount }} 人</p>
      </div>
      <template #footer>
        <el-button @click="showImport = false">取消</el-button>
        <el-button type="primary" @click="handleImport">导入</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ArrowLeft, ArrowRight, Plus, Download, Upload } from '@element-plus/icons-vue'
import { useGraphStore } from '../stores/graphStore'
import { createGroup, getGroups } from '../api/group'
import { exportJson, previewImport, importJson } from '../api/exportImport'
import { getPersons } from '../api/person'
import { getRelationships } from '../api/relationship'
import { ElMessage } from 'element-plus'

const graphStore = useGraphStore()
const isCollapsed = ref(false)
const showAddGroup = ref(false)
const showImport = ref(false)
const groupForm = ref({ name: '', color: '#38bdf8' })
const importData = ref<any>(null)
const importPreview = ref<any>(null)

const getGroupCount = (groupId: number) => {
  return graphStore.persons.filter((p) => p.groupId === groupId).length
}

const handleCreateGroup = async () => {
  if (!groupForm.value.name.trim()) return
  await createGroup(groupForm.value)
  const groups = await getGroups()
  graphStore.setGroups(groups)
  showAddGroup.value = false
  groupForm.value = { name: '', color: '#38bdf8' }
  ElMessage.success('分组创建成功')
}

const handleExport = async () => {
  const data = await exportJson()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `relationship_backup_${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

const handleFileChange = async (file: any) => {
  const reader = new FileReader()
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target?.result as string)
      importData.value = data
      importPreview.value = await previewImport(data)
    } catch (err) {
      ElMessage.error('文件解析失败')
    }
  }
  reader.readAsText(file.raw)
}

const handleImport = async () => {
  if (!importData.value) return
  await importJson({ mode: 'merge', data: importData.value })
  const [persons, relationships, groups] = await Promise.all([
    getPersons(),
    getRelationships(),
    getGroups(),
  ])
  graphStore.setPersons(persons)
  graphStore.setRelationships(relationships)
  graphStore.setGroups(groups)
  showImport.value = false
  importData.value = null
  importPreview.value = null
  ElMessage.success('导入成功')
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

  h3 {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 12px;
  }
}

.group-list {
  margin-bottom: 8px;
}

.group-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  margin-bottom: 4px;
  background: rgba(30, 41, 59, 0.5);
  border-left: 3px solid;
  border-radius: 0 6px 6px 0;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(30, 41, 59, 0.8);
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

.import-preview {
  margin-top: 16px;
  padding: 12px;
  background: rgba(30, 41, 59, 0.5);
  border-radius: 8px;

  p {
    font-size: 13px;
    color: #cbd5e1;
    margin: 4px 0;
  }
}
</style>
