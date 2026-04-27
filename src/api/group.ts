import request from './request'

export const getGroups = () => request.get('/groups')
export const createGroup = (data: any) => request.post('/groups', data)
export const updateGroup = (id: number, data: any) => request.put(`/groups/${id}`, data)
export const deleteGroup = (id: number) => request.delete(`/groups/${id}`)
