<template>
  <div class="graph-canvas">
    <div ref="containerRef" class="g6-container"></div>
    <div v-if="graphStore.persons.length === 0" class="empty-state">
      <div class="empty-content">
        <div class="empty-icon">◈</div>
        <h2>欢迎使用个人关系库</h2>
        <p>点击上方「添加联系人」或双击画布空白处<br>添加第一个联系人</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import G6 from '@antv/g6'
import { useGraphStore } from '../stores/graphStore'
import { getPersons, deletePerson } from '../api/person'
import { getRelationships } from '../api/relationship'
import { getGroups } from '../api/group'
import { getRelationTypes } from '../api/relationType'
import { updateGroup } from '../api/group'
import { ElMessage, ElMessageBox } from 'element-plus'

const containerRef = ref<HTMLDivElement>()
const graphStore = useGraphStore()
let graph: any = null
let resizeObserver: ResizeObserver | null = null
let keydownHandler: ((e: KeyboardEvent) => void) | null = null
const SELF_PERSON_KEY = 'prd-self-person-id'

// ============ 配置常量 ============
const SELF_NODE_SIZE = 64
const PERSON_NODE_SIZE = 44
const GROUP_NODE_SIZE = 56

const getGroupColor = (groupId: number | null) => {
  if (!groupId) return '#38bdf8'
  const group = graphStore.groupMap[groupId]
  return group?.color || '#38bdf8'
}

const getCanvasSize = () => {
  const width = containerRef.value?.clientWidth || 1
  const height = containerRef.value?.clientHeight || 1
  return { width, height }
}

const toFiniteNumber = (value: unknown, fallback: number) => {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

// ============ 中心人物识别 ============
const getSelfPersonId = (): string | null => {
  const persons = graphStore.persons || []
  if (persons.length === 0) return null

  const selfFromStorage = localStorage.getItem(SELF_PERSON_KEY)
  if (selfFromStorage && persons.some((p) => String(p.id) === selfFromStorage)) {
    return selfFromStorage
  }

  const explicitSelf = persons.find((p) => p?.data?.isSelf === true || p?.data?.isSelf === 'true')
  if (explicitSelf) return String(explicitSelf.id)

  const byName = persons.find((p) => ['我', '自己', '本人'].includes((p?.name || '').trim()))
  if (byName) return String(byName.id)

  return null
}

// ============ 获取分组的展开/折叠状态 ============
const isGroupCollapsed = (groupId: number | null): boolean => {
  if (groupId === null || groupId === 0) return false
  const group = graphStore.groupMap[groupId]
  return group?.collapsed === true
}

// ============ 获取分组下联系人数量（含子分组） ============
const getGroupPersonCount = (groupId: number): number => {
  const groups = graphStore.groups
  let count = graphStore.persons.filter((p) => p.groupId === groupId).length
  const children = groups.filter((g) => g.parentId === groupId)
  children.forEach((child) => {
    count += getGroupPersonCount(child.id)
  })
  return count
}

// ============ 判断联系人是否应该显示 ============
const shouldShowPerson = (person: any): boolean => {
  const effectiveGroupId = person.groupId || graphStore.ungroupedId
  if (!effectiveGroupId) return true
  let currentGroupId: number | null = effectiveGroupId
  while (currentGroupId !== null) {
    if (isGroupCollapsed(currentGroupId)) return false
    const group = graphStore.groupMap[currentGroupId]
    currentGroupId = group?.parentId || null
  }
  return true
}

// ============ 判断分组是否应该显示 ============
const shouldShowGroup = (group: any): boolean => {
  if (!group.parentId) return true
  if (isGroupCollapsed(group.parentId)) return false
  return shouldShowGroup(graphStore.groupMap[group.parentId])
}

// ============ 构建图数据（首次加载用） ============
// 首次加载：以"我"为中心，其他节点随机分布
const buildGraphData = () => {
  const { width, height } = getCanvasSize()
  const centerX = width / 2
  const centerY = height / 2
  const selfId = getSelfPersonId()
  const persons = graphStore.persons
  const groups = graphStore.groups

  const nodes: any[] = []
  const edges: any[] = []

  // ---- 中心节点：我（固定在画布中心，不可拖拽） ----
  if (selfId) {
    const selfPerson = persons.find((p) => String(p.id) === selfId)
    if (selfPerson) {
      nodes.push({
        id: selfId,
        type: 'circle',
        x: centerX,
        y: centerY,
        size: SELF_NODE_SIZE,
        label: `${selfPerson.name}`,
        style: {
          fill: '#fbbf24',
          stroke: '#0f172a',
          lineWidth: 4,
          shadowColor: 'rgba(251, 191, 36, 0.5)',
          shadowBlur: 20,
        },
        labelCfg: {
          position: 'bottom',
          style: {
            fill: '#fbbf24',
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'Noto Sans SC, sans-serif',
          },
        },
        _isSelf: true,
      })
    }
  }

  // ---- 分组节点 ----
  groups.forEach((group) => {
    if (!shouldShowGroup(group)) return

    const groupColor = group?.color || '#64748b'
    const groupName = group?.name || '未分组'
    const collapsed = isGroupCollapsed(group.id)
    const personCount = getGroupPersonCount(group.id)

    const defaultX = centerX + (Math.random() - 0.5) * 200
    const defaultY = centerY + (Math.random() - 0.5) * 200

    nodes.push({
      id: `group-${group.id}`,
      type: 'circle',
      x: toFiniteNumber(group.positionX, defaultX),
      y: toFiniteNumber(group.positionY, defaultY),
      size: GROUP_NODE_SIZE,
      label: collapsed && personCount > 0 ? `${groupName} (+${personCount})` : groupName,
      style: {
        fill: groupColor + '30',
        stroke: groupColor,
        lineWidth: 3,
        shadowColor: groupColor + '40',
        shadowBlur: 14,
      },
      labelCfg: {
        position: 'bottom',
        style: {
          fill: '#e2e8f0',
          fontSize: 12,
          fontWeight: 600,
          fontFamily: 'Noto Sans SC, sans-serif',
        },
      },
      _isGroup: true,
      _groupId: group.id,
      _collapsed: collapsed,
    })

    // 分组 → 我（或父分组）
    if (group.parentId && shouldShowGroup(graphStore.groupMap[group.parentId])) {
      edges.push({
        id: `edge-group-${group.id}-to-parent`,
        source: `group-${group.parentId}`,
        target: `group-${group.id}`,
        style: {
          stroke: groupColor + '60',
          lineWidth: 2,
          endArrow: {
            path: G6.Arrow.triangle(6, 8, 0),
            fill: groupColor + '80',
            d: 25
          },
        },
      })
    } else if (selfId) {
      edges.push({
        id: `edge-group-${group.id}-to-self`,
        source: selfId,
        target: `group-${group.id}`,
        style: {
          stroke: groupColor + '60',
          lineWidth: 2,
          endArrow: {
            path: G6.Arrow.triangle(6, 8, 0),
            fill: groupColor + '80',
            d: 25
          },
        },
      })
    }
  })

  // ---- 联系人节点 ----
  persons.forEach((p) => {
    if (String(p.id) === selfId) return
    if (!shouldShowPerson(p)) return

    const groupColor = getGroupColor(p.groupId)
    const defaultX = centerX + (Math.random() - 0.5) * 400
    const defaultY = centerY + (Math.random() - 0.5) * 400

    nodes.push({
      id: String(p.id),
      type: 'circle',
      x: toFiniteNumber(p.positionX, defaultX),
      y: toFiniteNumber(p.positionY, defaultY),
      size: PERSON_NODE_SIZE,
      label: p.name,
      style: {
        fill: groupColor,
        stroke: '#0f172a',
        lineWidth: 3,
        shadowColor: 'rgba(56, 189, 248, 0.3)',
        shadowBlur: 12,
      },
      labelCfg: {
        position: 'bottom',
        style: {
          fill: '#e2e8f0',
          fontSize: 12,
          fontWeight: 500,
          fontFamily: 'Noto Sans SC, sans-serif',
        },
      },
    })

    // 联系人 → 分组
    const effectiveGroupId = p.groupId || graphStore.ungroupedId
    if (effectiveGroupId && shouldShowGroup(graphStore.groupMap[effectiveGroupId])) {
      edges.push({
        id: `edge-person-${p.id}-to-group`,
        source: String(p.id),
        target: `group-${effectiveGroupId}`,
        style: {
          stroke: groupColor + '50',
          lineWidth: 1.5,
          endArrow: {
            path: G6.Arrow.triangle(5, 6, 0),
            fill: groupColor + '70',
          },
        },
      })
    }
  })

  // ---- 真实关系边（颜色跟随关系类型） ----
  graphStore.relationships.forEach((r) => {
    if (r.isVirtual) return
    const edgeColor = graphStore.getEdgeColor(r.relationTypes)
    const label = r.relationTypes?.join(' / ') || '默认'

    edges.push({
      id: String(r.id),
      source: String(r.fromPersonId),
      target: String(r.toPersonId),
      label: label.length > 10 ? label.substring(0, 10) + '...' : label,
      style: {
        stroke: edgeColor + '80',
        lineWidth: 2,
        endArrow: {
          path: G6.Arrow.triangle(6, 8, 0),
          fill: edgeColor + '80',
        },
      },
      labelCfg: {
        style: {
          fill: edgeColor,
          fontSize: 10,
          fontFamily: 'Noto Sans SC, sans-serif',
        },
      },
    })
  })

  return { nodes, edges }
}

// ============ 切换分组展开/折叠状态（只显示/隐藏节点，不重新渲染整个图） ============
const toggleGroupCollapse = async (groupId: number) => {
  const group = graphStore.groupMap[groupId]
  if (!group) return

  const newCollapsed = !group.collapsed

  try {
    await updateGroup(groupId, { ...group, collapsed: newCollapsed })
    const updatedGroups = graphStore.groups.map((g) =>
      g.id === groupId ? { ...g, collapsed: newCollapsed } : g
    )
    graphStore.setGroups(updatedGroups)

    // 使用 G6 API 只显示/隐藏相关节点，不重新渲染整个图
    updateVisibilityByGroup(groupId, newCollapsed)
  } catch (err) {
    ElMessage.error('操作失败')
  }
}

// ============ 根据分组折叠状态更新节点可见性 ============
const updateVisibilityByGroup = (groupId: number, collapsed: boolean) => {
  if (!graph || graph.destroyed) return

  const groupNodeId = `group-${groupId}`
  const groupNode = graph.findById(groupNodeId)
  if (!groupNode) return

  // 更新分组节点标签（只更新文本，不触发重新布局）
  const group = graphStore.groupMap[groupId]
  const personCount = getGroupPersonCount(groupId)
  const newLabel = collapsed && personCount > 0
    ? `${group?.name || '未分组'} (+${personCount})`
    : (group?.name || '未分组')

  // 直接修改 label 图形，避免 updateItem 触发重新布局
  const labelShape = groupNode.getContainer().find((ele: any) => ele.get('type') === 'text')
  if (labelShape) {
    labelShape.attr('text', newLabel)
  }
  // 更新模型数据但不触发布局
  groupNode.getModel().label = newLabel
  groupNode.getModel()._collapsed = collapsed

  // 获取该分组下所有联系人（包括子分组）
  const affectedPersonIds = getPersonIdsByGroup(groupId, collapsed)
  const affectedGroupIds = getChildGroupIds(groupId, collapsed)

  // 显示/隐藏联系人节点
  affectedPersonIds.forEach((pid) => {
    const node = graph.findById(String(pid))
    if (node) {
      if (collapsed) {
        graph.hideItem(node)
      } else {
        graph.showItem(node)
      }
    }
  })

  // 显示/隐藏子分组节点
  affectedGroupIds.forEach((gid) => {
    const nodeId = `group-${gid}`
    const node = graph.findById(nodeId)
    if (node) {
      if (collapsed) {
        graph.hideItem(node)
      } else {
        graph.showItem(node)
        // 递归展开子分组
        const childGroup = graphStore.groupMap[gid]
        if (childGroup && !childGroup.collapsed) {
          updateVisibilityByGroup(gid, false)
        }
      }
    }
  })

  // 显示/隐藏相关边
  // 获取所有被隐藏/显示的节点ID
  const hiddenNodeIds = new Set<string>()
  graph.getNodes().forEach((node: any) => {
    if (node.isVisible && !node.isVisible()) {
      hiddenNodeIds.add(node.get('id'))
    }
  })

  graph.getEdges().forEach((edge: any) => {
    const sourceId = edge.getSource().get('id')
    const targetId = edge.getTarget().get('id')
    const shouldShow = !hiddenNodeIds.has(sourceId) && !hiddenNodeIds.has(targetId)

    if (shouldShow) {
      if (edge.isVisible && !edge.isVisible()) {
        graph.showItem(edge)
      }
    } else {
      if (!edge.isVisible || edge.isVisible()) {
        graph.hideItem(edge)
      }
    }
  })
}

// ============ 获取分组下的所有联系人ID ============
const getPersonIdsByGroup = (groupId: number, _includeAll: boolean): number[] => {
  const ids: number[] = []
  const persons = graphStore.persons

  persons.forEach((p) => {
    const effectiveGroupId = p.groupId || graphStore.ungroupedId
    if (effectiveGroupId === groupId) {
      ids.push(p.id)
    }
  })

  // 递归获取子分组的联系人
  const children = graphStore.groups.filter((g) => g.parentId === groupId)
  children.forEach((child) => {
    ids.push(...getPersonIdsByGroup(child.id, _includeAll))
  })

  return ids
}

// ============ 获取分组下的所有子分组ID ============
const getChildGroupIds = (groupId: number, _includeAll: boolean): number[] => {
  const ids: number[] = []
  const children = graphStore.groups.filter((g) => g.parentId === groupId)
  children.forEach((child) => {
    ids.push(child.id)
    ids.push(...getChildGroupIds(child.id, _includeAll))
  })
  return ids
}

// ============ 保存节点位置到后端（静默保存，不触发重新渲染） ============
let savePositionTimer: any = null

const savePositions = async () => {
  if (!graph || graph.destroyed) return

  const personPositions: { id: number; positionX: number; positionY: number }[] = []
  const groupPositions: { id: number; positionX: number; positionY: number }[] = []

  graph.getNodes().forEach((node: any) => {
    const model = node.getModel()
    if (model._isSelf) return // 跳过"我"节点
    const bbox = node.getBBox()

    if (model._isGroup) {
      groupPositions.push({
        id: model._groupId,
        positionX: bbox.centerX,
        positionY: bbox.centerY,
      })
    } else {
      const id = parseInt(model.id)
      if (!id || isNaN(id)) return
      personPositions.push({
        id,
        positionX: bbox.centerX,
        positionY: bbox.centerY,
      })
    }
  })

  if (personPositions.length > 0) {
    try {
      await fetch('http://localhost:8080/api/v1/persons/batch/positions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions: personPositions }),
      })
      personPositions.forEach((pos) => {
        const person = graphStore.persons.find((p) => p.id === pos.id)
        if (person) {
          person.positionX = pos.positionX
          person.positionY = pos.positionY
        }
      })
    } catch (err) {
      // 静默失败
    }
  }

  if (groupPositions.length > 0) {
    try {
      await fetch('http://localhost:8080/api/v1/groups/batch/positions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ positions: groupPositions }),
      })
      groupPositions.forEach((pos) => {
        const group = graphStore.groups.find((g) => g.id === pos.id)
        if (group) {
          group.positionX = pos.positionX
          group.positionY = pos.positionY
        }
      })
    } catch (err) {
      // 静默失败
    }
  }

}

const debouncedSavePositions = () => {
  if (savePositionTimer) clearTimeout(savePositionTimer)
  savePositionTimer = setTimeout(savePositions, 500)
}

// ============ 图初始化 ============
const initGraph = () => {
  if (!containerRef.value) return

  const { width, height } = getCanvasSize()

  graph = new G6.Graph({
    container: containerRef.value,
    width,
    height,
    renderer: 'svg',
    modes: {
      default: [
        'zoom-canvas',
        'drag-canvas',
        'drag-node',
      ],
    },
    defaultNode: {
      type: 'circle',
      size: PERSON_NODE_SIZE,
      style: {
        cursor: 'pointer',
      },
    },
    defaultEdge: {
      type: 'line',
      style: {
        cursor: 'pointer',
      },
    },
    nodeStateStyles: {
      selected: {
        stroke: '#f472b6',
        lineWidth: 4,
        shadowColor: 'rgba(244, 114, 182, 0.6)',
        shadowBlur: 20,
      },
      hover: {
        stroke: '#fbbf24',
        lineWidth: 3,
        shadowColor: 'rgba(251, 191, 36, 0.5)',
        shadowBlur: 16,
      },
    },
    edgeStateStyles: {
      selected: {
        stroke: '#f472b6',
        lineWidth: 2.5,
      },
    },
    fitView: false,
    fitViewPadding: 40,
    minZoom: 0.2,
    maxZoom: 3,
  })

  // 拖拽状态跟踪
  let isDragging = false

  // 节点拖拽开始
  graph.on('node:dragstart', (evt: any) => {
    const model = evt.item.getModel()
    // "我"节点不可拖拽
    if (model._isSelf) {
      evt.preventDefault()
      return
    }
    isDragging = true
  })

  // 节点拖拽结束 - 保存位置
  graph.on('node:dragend', () => {
    isDragging = false
    debouncedSavePositions()
  })

  // 节点单击（选中）
  graph.on('node:click', (evt: any) => {
    if (isDragging) {
      isDragging = false
      return
    }

    const model = evt.item.getModel()

    // 分组节点：单击折叠/展开
    if (model._isGroup) {
      toggleGroupCollapse(model._groupId)
      return
    }

    // "我"节点：只选中
    if (model._isSelf) {
      graphStore.selectNode(model.id)
      graph.getNodes().forEach((node: any) => {
        graph.clearItemStates(node)
      })
      graph.setItemState(evt.item, 'selected', true)
      return
    }

    // 普通节点：选中
    const nodeId = evt.item.get('id')
    graphStore.selectNode(nodeId)
    graph.getNodes().forEach((node: any) => {
      graph.clearItemStates(node)
    })
    graph.setItemState(evt.item, 'selected', true)
  })

  // 节点双击（分组折叠/展开）
  graph.on('node:dblclick', (evt: any) => {
    const model = evt.item.getModel()
    if (model._isGroup) {
      toggleGroupCollapse(model._groupId)
    }
  })

  // 节点悬停
  graph.on('node:mouseenter', (evt: any) => {
    graph.setItemState(evt.item, 'hover', true)
  })

  graph.on('node:mouseleave', (evt: any) => {
    graph.clearItemStates(evt.item, 'hover')
  })

  // 画布点击空白处
  graph.on('canvas:click', () => {
    graphStore.selectNode(null)
    graph.getNodes().forEach((node: any) => {
      graph.clearItemStates(node)
    })
  })

  // 双击空白添加节点
  graph.on('canvas:dblclick', (evt: any) => {
    const point = graph.getPointByCanvas(evt.canvasX, evt.canvasY)
    window.dispatchEvent(new CustomEvent('add-person-at', { detail: { x: point.x, y: point.y } }))
  })

  // 右键菜单
  graph.on('node:contextmenu', (evt: any) => {
    evt?.evt?.preventDefault?.()
    const nodeId = evt?.item?.get?.('id')
    const model = evt?.item?.getModel?.()
    if (!nodeId || model?._isGroup || model?._isSelf) return
    showNodeContextMenu(nodeId)
  })

  graph.on('edge:contextmenu', (evt: any) => {
    evt?.evt?.preventDefault?.()
    const edgeId = evt?.item?.get?.('id')
    if (!edgeId) return
    showEdgeContextMenu(edgeId)
  })

  graph.on('canvas:contextmenu', (evt: any) => {
    evt?.evt?.preventDefault?.()
    showCanvasContextMenu()
  })

  // 键盘事件
  keydownHandler = (e: KeyboardEvent) => {
    if (e.key === 'Delete' && graphStore.selectedNodeId) {
      handleDeleteNode(graphStore.selectedNodeId)
    }
  }
  document.addEventListener('keydown', keydownHandler)

  // 监听选中节点（只更新选中状态，不移动画布）
  watch(() => graphStore.selectedNodeId, (id) => {
    if (!graph || graph.destroyed) return
    graph.getNodes().forEach((node: any) => {
      graph.clearItemStates(node)
    })
    if (id) {
      const node = graph.findById(id)
      if (node) {
        graph.setItemState(node, 'selected', true)
      }
    }
  })

  const data = buildGraphData()
  graph.data(data)
  graph.render()
}

const setupResizeObserver = () => {
  if (!containerRef.value || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(() => {
    if (!graph || graph.destroyed) return
    const { width, height } = getCanvasSize()
    graph.changeSize(width, height)
  })
  resizeObserver.observe(containerRef.value)
}

const showNodeContextMenu = (_nodeId: string) => {
  // 右键菜单功能可在此扩展
}

const showEdgeContextMenu = (_edgeId: string) => {
  // 右键菜单功能可在此扩展
}

const showCanvasContextMenu = () => {
  // 右键菜单功能可在此扩展
}

const handleDeleteNode = async (nodeId: string) => {
  try {
    await ElMessageBox.confirm('确定删除该联系人？相关关系也将被删除', '确认删除', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await deletePerson(parseInt(nodeId))
    graphStore.removePerson(nodeId)
    graphStore.selectNode(null)
    ElMessage.success('删除成功')
  } catch (err) {
    // 取消删除
  }
}

// 加载数据
const loadData = async () => {
  const [persons, relationships, groups, types] = await Promise.all([
    getPersons(),
    getRelationships(),
    getGroups(),
    getRelationTypes(),
  ])
  graphStore.setPersons(persons || [])
  graphStore.setRelationships(relationships || [])
  graphStore.setGroups(groups || [])
  graphStore.setRelationTypes(types || [])
}

onMounted(() => {
  loadData().then(() => {
    nextTick(() => {
      initGraph()
      setupResizeObserver()
    })
  })
})

onUnmounted(() => {
  if (savePositionTimer) clearTimeout(savePositionTimer)
  if (keydownHandler) {
    document.removeEventListener('keydown', keydownHandler)
    keydownHandler = null
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (graph && !graph.destroyed) {
    graph.destroy()
  }
})
</script>

<style scoped lang="scss">
.graph-canvas {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
  background: #0f172a;
  user-select: none;
  -webkit-user-select: none;
}

.g6-container {
  width: 100%;
  height: 100%;
}

.empty-state {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.empty-content {
  text-align: center;
  color: #475569;

  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
    opacity: 0.3;
  }

  h2 {
    font-size: 20px;
    font-weight: 500;
    margin-bottom: 8px;
    color: #64748b;
  }

  p {
    font-size: 14px;
    line-height: 1.8;
  }
}
</style>
