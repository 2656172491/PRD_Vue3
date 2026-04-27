import request from './request'

export const getRelationTypes = () => request.get('/relation-types')
export const createRelationType = (data: any) => request.post('/relation-types', data)
