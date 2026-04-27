import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useGraphStore = defineStore('graph', () => {
  const persons = ref<any[]>([])
  const relationships = ref<any[]>([])
  const groups = ref<any[]>([])
  const relationTypes = ref<string[]>([])
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

  function setPersons(data: any[]) {
    persons.value = data
  }

  function setRelationships(data: any[]) {
    relationships.value = data
  }

  function setGroups(data: any[]) {
    groups.value = data
  }

  function setRelationTypes(data: string[]) {
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
