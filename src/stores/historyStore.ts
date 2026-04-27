import { defineStore } from 'pinia'
import { ref } from 'vue'

interface HistoryAction {
  type: string
  data: any
  prevData?: any
}

export const useHistoryStore = defineStore('history', () => {
  const stack = ref<HistoryAction[]>([])
  const index = ref(-1)
  const MAX_SIZE = 50

  function push(action: HistoryAction) {
    // 如果当前不在栈顶，删除后面的记录
    if (index.value < stack.value.length - 1) {
      stack.value = stack.value.slice(0, index.value + 1)
    }
    stack.value.push(action)
    if (stack.value.length > MAX_SIZE) {
      stack.value.shift()
    } else {
      index.value++
    }
  }

  function canUndo() {
    return index.value >= 0
  }

  function canRedo() {
    return index.value < stack.value.length - 1
  }

  function undo(): HistoryAction | null {
    if (!canUndo()) return null
    const action = stack.value[index.value]
    index.value--
    return action
  }

  function redo(): HistoryAction | null {
    if (!canRedo()) return null
    index.value++
    return stack.value[index.value]
  }

  function clear() {
    stack.value = []
    index.value = -1
  }

  return {
    stack,
    index,
    push,
    canUndo,
    canRedo,
    undo,
    redo,
    clear,
  }
})
