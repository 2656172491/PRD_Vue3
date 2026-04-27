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
import { getPersons, deletePerson, batchUpdatePositions } from '../api/person'
import { getRelationships, createRelationship } from '../api/relationship'
import { getGroups } from '../api/group'
import { getRelationTypes } from '../api/relationType'
import { ElMessage, ElMessageBox } from 'element-plus'

const containerRef = ref<HTMLDivElement>()
const graphStore = useGraphStore()
let graph: any = null
let positionTimer: any = null

const getGroupColor = (groupId: number | null) => {
  if (!groupId) return '#38bdf8'
  const group = graphStore.groupMap[groupId]
  return group?.color || '#38bdf8'
}

const buildGraphData = () => {
  const nodes = graphStore.persons.map((p) => ({
    id: String(p.id),
    type: 'circle',
    x: p.positionX || Math.random() * 800,
    y: p.positionY || Math.random() * 600,
    size: 48,
    label: p.name,
    style: {
      fill: getGroupColor(p.groupId),
      stroke: '#0f172a',
      lineWidth: 3,
      shadowColor: 'rgba(56, 189, 248, 0.4)',
      shadowBlur: 12,
    },
    labelCfg: {
      position: 'bottom',
      style: {
        fill: '#e2e8f0',
        fontSize: 12,
        fontFamily: 'Noto Sans SC, sans-serif',
      },
    },
    anchorPoints: [
      [0, 0.5],
      [1, 0.5],
      [0.5, 0],
      [0.5, 1],
    ],
  }))

  const edges = graphStore.relationships.map((r) => ({
    id: String(r.id),
    source: String(r.fromPersonId),
    target: String(r.toPersonId),
    label: r.relationTypes?.join(' / ') || '',
    style: {
      stroke: 'rgba(148, 163, 184, 0.4)',
      lineWidth: 1.5,
      endArrow: {
        path: G6.Arrow.triangle(6, 8, 0),
        fill: 'rgba(148, 163, 184, 0.4)',
      },
    },
    labelCfg: {
      autoRotate: true,
      style: {
        fill: '#94a3b8',
        fontSize: 10,
        background: {
          fill: '#0f172a',
          padding: [2, 4],
          radius: 4,
        },
      },
    },
  }))

  return { nodes, edges }
}

const initGraph = () => {
  if (!containerRef.value) return

  const width = containerRef.value.clientWidth
  const height = containerRef.value.clientHeight

  graph = new G6.Graph({
    container: containerRef.value,
    width,
    height,
    modes: {
      default: [
        'drag-canvas',
        'zoom-canvas',
        'drag-node',
        {
          type: 'create-edge',
          trigger: 'drag',
          edgeConfig: {
            style: {
              stroke: '#38bdf8',
              lineDash: [4, 4],
              lineWidth: 2,
            },
          },
        },
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
    layout: {
      type: 'force',
      preventOverlap: true,
      linkDistance: 150,
      nodeStrength: -200,
      edgeStrength: 0.5,
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

  // 拖拽结束保存坐标
  graph.on('node:dragend', () => {
    savePositions()
  })

  // 连线完成
  graph.on('aftercreateedge', async (evt: any) => {
    const edge = evt.edge
    const source = edge.getSource().get('id')
    const target = edge.getTarget().get('id')

    // 弹出关系类型选择
    window.dispatchEvent(new CustomEvent('select-relation-type', {
      detail: {
        source,
        target,
        callback: async (types: string[]) => {
          try {
            const res = await createRelationship({
              fromPersonId: parseInt(source),
              toPersonId: parseInt(target),
              relationTypes: types,
            })
            graphStore.addRelationship({
              id: res,
              fromPersonId: parseInt(source),
              toPersonId: parseInt(target),
              relationTypes: types,
            })
            ElMessage.success('关系建立成功')
            refreshGraph()
          } catch (err) {
            ElMessage.error('建立关系失败')
          }
        },
      },
    }))

    // 移除临时边
    graph.removeItem(edge)
  })

  // 右键菜单
  graph.on('node:contextmenu', (evt: any) => {
    evt.evt.preventDefault()
    const nodeId = evt.item.get('id')
    showNodeContextMenu(nodeId)
  })

  graph.on('edge:contextmenu', (evt: any) => {
    evt.evt.preventDefault()
    const edgeId = evt.item.get('id')
    showEdgeContextMenu(edgeId)
  })

  graph.on('canvas:contextmenu', (evt: any) => {
    evt.evt.preventDefault()
    showCanvasContextMenu()
  })

  // 键盘事件
  const handleKeydown = (e: KeyboardEvent) => {
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
  document.addEventListener('keydown', handleKeydown)

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

  refreshGraph()

  return () => {
    document.removeEventListener('keydown', handleKeydown)
  }
}

const refreshGraph = () => {
  if (!graph || graph.destroyed) return
  const data = buildGraphData()
  graph.changeData(data)
  graph.refresh()
}

const savePositions = () => {
  if (positionTimer) clearTimeout(positionTimer)
  positionTimer = setTimeout(async () => {
    if (!graph || graph.destroyed) return
    const nodes = graph.getNodes()
    const positions = nodes.map((node: any) => {
      const model = node.getModel()
      return {
        id: parseInt(model.id),
        positionX: model.x,
        positionY: model.y,
      }
    })
    await batchUpdatePositions({ positions })
  }, 300)
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
    })
  })
})

onUnmounted(() => {
  if (graph && !graph.destroyed) {
    graph.destroy()
  }
  if (positionTimer) clearTimeout(positionTimer)
})
</script>

<style scoped lang="scss">
.graph-canvas {
  flex: 1;
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
