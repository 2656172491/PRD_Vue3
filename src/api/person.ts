import request from './request'

export const getPersons = () => request.get('/persons')
export const searchPersons = (keyword: string) => request.get('/persons/search', { params: { keyword } })
export const getPerson = (id: number) => request.get(`/persons/${id}`)
export const createPerson = (data: any) => request.post('/persons', data)
export const updatePerson = (id: number, data: any) => request.put(`/persons/${id}`, data)
export const deletePerson = (id: number) => request.delete(`/persons/${id}`)
export const batchUpdatePositions = (data: any) => request.put('/persons/batch/positions', data)
export const batchMoveToGroup = (data: any) => request.put('/persons/batch/group', data)
