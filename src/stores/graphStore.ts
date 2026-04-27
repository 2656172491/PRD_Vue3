import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface RelationType {
  id: number
  typeName: string
  color: string
}

export const useGraphStore = defineStore('graph', () => {
  const persons = ref<any[]>([])
  const relationships = ref<any[]>([])
  const groups = ref<any[]>([])
  const relationTypes = ref<RelationType[]>([])
  const selectedNodeId = ref<string | null>(null)

  const personMap = computed(() => {
    const map: Record<string, any> = {}
    persons.value.forEach((p) => {
      map[p.id] = p
    })
    return map
  })

  const groupMap = computed(() => {
    const map: Record<string, any> = {}
    groups.value.forEach((g) => {
      map[g.id] = g
    })
    return map
  })

  // 关系类型颜色映射
  const relationTypeColorMap = computed(() => {
    const map: Record<string, string> = {}
    relationTypes.value.forEach((t) => {
      map[t.typeName] = t.color || '#94a3b8'
    })
    return map
  })

  // 获取关系类型的颜色
  const getRelationTypeColor = (typeName: string | null | undefined): string => {
    if (!typeName) return '#94a3b8'
    return relationTypeColorMap.value[typeName] || '#94a3b8'
  }

  // 获取关系边的主颜色（取第一个关系类型的颜色）
  const getEdgeColor = (relationTypes: string[] | null | undefined): string => {
    if (!relationTypes || relationTypes.length === 0) {
      return getRelationTypeColor('默认')
    }
    return getRelationTypeColor(relationTypes[0])
  }

  // 获取未分组的分组ID
  const ungroupedId = computed(() => {
    const ungrouped = groups.value.find((g) => g.name === '未分组')
    return ungrouped?.id || null
  })

  function setPersons(data: any[]) {
    persons.value = data
  }

  function setRelationships(data: any[]) {
    relationships.value = data
  }

  function setGroups(data: any[]) {
    groups.value = data
  }

  function setRelationTypes(data: RelationType[]) {
    relationTypes.value = data
  }

  function addPerson(person: any) {
    persons.value.push(person)
  }

  function updatePerson(person: any) {
    const idx = persons.value.findIndex((p) => p.id === person.id)
    if (idx >= 0) {
      persons.value[idx] = { ...persons.value[idx], ...person }
    }
  }

  function removePerson(id: string | number) {
    persons.value = persons.value.filter((p) => p.id !== id)
    relationships.value = relationships.value.filter(
      (r) => r.fromPersonId !== id && r.toPersonId !== id
    )
  }

  function addRelationship(rel: any) {
    relationships.value.push(rel)
  }

  function removeRelationship(id: string | number) {
    relationships.value = relationships.value.filter((r) => r.id !== id)
  }

  function selectNode(id: string | null) {
    selectedNodeId.value = id
  }

  return {
    persons,
    relationships,
    groups,
    relationTypes,
    selectedNodeId,
    personMap,
    groupMap,
    relationTypeColorMap,
    ungroupedId,
    getRelationTypeColor,
    getEdgeColor,
    setPersons,
    setRelationships,
    setGroups,
    setRelationTypes,
    addPerson,
    updatePerson,
    removePerson,
    addRelationship,
    removeRelationship,
    selectNode,
  }
})
