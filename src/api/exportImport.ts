import request from './request'

export const exportJson = () => request.get('/export/json')
export const previewImport = (data: any) => request.post('/import/json/preview', data)
export const importJson = (data: any) => request.post('/import/json', data)
