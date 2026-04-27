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
import { ElMessage, ElMessageBox } from 'element-plus'

const containerRef = ref<HTMLDivElement>()
const graphStore = useGraphStore()
let graph: any = null
let resizeObserver: ResizeObserver | null = null
let keydownHandler: ((e: KeyboardEvent) => void) | null = null
let selfChangeHandler: (() => void) | null = null
const SELF_PERSON_KEY = 'prd-self-person-id'

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

const getSelfPersonId = (): string | null => {
  const persons = graphStore.persons || []
  if (persons.length === 0) return null

  const selfFromStorage = localStorage.getItem(SELF_PERSON_KEY)
  if (selfFromStorage && persons.some((p) => String(p.id) === selfFromStorage)) {
    return selfFromStorage
  }

  const explicitSelf = persons.find((p) => p?.data?.isSelf === true || p?.data?.isSelf === 'true')
  if (explicitSelf) return String(explicitSelf.id)

  if (graphStore.selectedNodeId && persons.some((p) => String(p.id) === graphStore.selectedNodeId)) {
    return String(graphStore.selectedNodeId)
  }

  const byName = persons.find((p) => ['我', '自己', '本人'].includes((p?.name || '').trim()))
  if (byName) return String(byName.id)

  return null
}

const buildGraphData = () => {
  const { width, height } = getCanvasSize()
  const centerX = width / 2
  const centerY = height / 2
  const selfId = getSelfPersonId()
  const others = graphStore.persons.filter((p) => String(p.id) !== selfId)
  const ringRadius = Math.max(160, Math.min(width, height) * 0.32)

  const nodes = graphStore.persons.map((p) => {
    const id = String(p.id)
    const isSelf = id === selfId
    const selfAwareIndex = others.findIndex((item) => String(item.id) === id)
    const angle = (selfAwareIndex / Math.max(others.length, 1)) * Math.PI * 2
    const defaultX = isSelf ? centerX : centerX + ringRadius * Math.cos(angle)
    const defaultY = isSelf ? centerY : centerY + ringRadius * Math.sin(angle)

    return {
      id,
      type: 'circle',
      x: toFiniteNumber(p.positionX, defaultX),
      y: toFiniteNumber(p.positionY, defaultY),
      size: isSelf ? 58 : 48,
      label: isSelf ? `${p.name}（我）` : p.name,
      style: {
        fill: isSelf ? '#fbbf24' : getGroupColor(p.groupId),
        stroke: '#0f172a',
        lineWidth: isSelf ? 4 : 3,
      },
      labelCfg: {
        position: 'bottom',
        style: {
          fill: '#e2e8f0',
          fontSize: isSelf ? 13 : 12,
          fontWeight: isSelf ? 700 : 500,
          fontFamily: 'Noto Sans SC, sans-serif',
        },
      },
      anchorPoints: [
        [0, 0.5],
        [1, 0.5],
        [0.5, 0],
        [0.5, 1],
      ],
    }
  })

  const realEdges = graphStore.relationships.map((r) => {
    const isVirtual = !!r.isVirtual
    return {
      id: String(r.id),
      source: String(r.fromPersonId),
      target: String(r.toPersonId),
      label: undefined,
      style: {
        stroke: isVirtual ? 'rgba(148, 163, 184, 0.2)' : 'rgba(148, 163, 184, 0.4)',
        lineWidth: isVirtual ? 1 : 1.5,
        endArrow: isVirtual
          ? undefined
          : {
              path: G6.Arrow.triangle(6, 8, 0),
              fill: 'rgba(148, 163, 184, 0.4)',
            },
      },
      labelCfg: undefined,
    }
  })

  return { nodes, edges: realEdges }
}

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
      ],
    },
    defaultNode: {
      type: 'circle',
      size: 48,
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
      },
      hover: {
        stroke: '#fbbf24',
        lineWidth: 3,
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
  })

  // 节点点击
  graph.on('node:click', (evt: any) => {
    const nodeId = evt.item.get('id')
    graphStore.selectNode(nodeId)
    graph.getNodes().forEach((node: any) => {
      graph.clearItemStates(node)
    })
    graph.setItemState(evt.item, 'selected', true)
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
    if (!nodeId) return
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
    if (e.ctrlKey && e.key === 'z') {
      e.preventDefault()
      if (e.shiftKey) {
        window.dispatchEvent(new CustomEvent('redo-action'))
      } else {
        window.dispatchEvent(new CustomEvent('undo-action'))
      }
    }
  }
  document.addEventListener('keydown', keydownHandler)

  // 监听数据变化
  watch(() => [graphStore.persons, graphStore.relationships], () => {
    refreshGraph()
  }, { deep: true })

  // 监听选中节点
  watch(() => graphStore.selectedNodeId, (id) => {
    if (!graph || graph.destroyed) return
    graph.getNodes().forEach((node: any) => {
      graph.clearItemStates(node)
    })
    if (id) {
      const node = graph.findById(id)
      if (node) {
        graph.setItemState(node, 'selected', true)
        graph.focusItem(node, true, {
          duration: 300,
          easing: 'easeCubic',
        })
      }
    }
  })

  const data = buildGraphData()
  graph.data(data)
  graph.render()
}

const refreshGraph = () => {
  if (!graph || graph.destroyed) return
  const data = buildGraphData()
  graph.data(data)
  graph.render()
}

const centerOnSelf = () => {
  if (!graph || graph.destroyed) return
  const selfId = getSelfPersonId()
  if (!selfId) return
  const node = graph.findById(selfId)
  if (!node) return
  graph.focusItem(node, true, { duration: 300, easing: 'easeCubic' })
}

const setupResizeObserver = () => {
  if (!containerRef.value || typeof ResizeObserver === 'undefined') return
  resizeObserver = new ResizeObserver(() => {
    if (!graph || graph.destroyed) return
    const { width, height } = getCanvasSize()
    graph.changeSize(width, height)
    refreshGraph()
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
  graphStore.setRelationTypes((types || []).map((t: any) => t.typeName))
}

onMounted(() => {
  loadData().then(() => {
    nextTick(() => {
      initGraph()
      setupResizeObserver()
      centerOnSelf()
    })
  })

  selfChangeHandler = () => {
    refreshGraph()
    centerOnSelf()
  }
  window.addEventListener('self-person-changed', selfChangeHandler)
})

onUnmounted(() => {
  if (keydownHandler) {
    document.removeEventListener('keydown', keydownHandler)
    keydownHandler = null
  }
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
  if (selfChangeHandler) {
    window.removeEventListener('self-person-changed', selfChangeHandler)
    selfChangeHandler = null
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
