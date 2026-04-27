import request from './request'

export const getRelationships = (): Promise<any[]> => request.get('/relationships')
export const createRelationship = (data: any) => request.post('/relationships', data)
export const rebuildVirtualRelationships = (selfPersonId: number) => request.post(`/relationships/virtual/${selfPersonId}`)
export const deleteRelationship = (id: number) => request.delete(`/relationships/${id}`)
