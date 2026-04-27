import request from './request'

export const getRelationships = (): Promise<any[]> => request.get('/relationships')
export const createRelationship = (data: any) => request.post('/relationships', data)
export const deleteRelationship = (id: number) => request.delete(`/relationships/${id}`)
