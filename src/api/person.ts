import request from './request'

export const getPersons = (): Promise<any[]> => request.get('/persons')
export const searchPersons = (keyword: string): Promise<any[]> => request.get('/persons/search', { params: { keyword } })
export const getPerson = (id: number) => request.get(`/persons/${id}`)
export const createPerson = (data: any) => request.post('/persons', data)
export const updatePerson = (id: number, data: any) => request.put(`/persons/${id}`, data)
export const deletePerson = (id: number) => request.delete(`/persons/${id}`)
export const batchUpdatePositions = (data: any) => request.put('/persons/batch/positions', data)
export const batchMoveToGroup = (data: any) => {
  const payload = { ...data }
  if (payload.groupId !== undefined && payload.groupsId === undefined) {
    payload.groupsId = payload.groupId
    delete payload.groupId
  }
  return request.put('/persons/batch/group', payload)
}
