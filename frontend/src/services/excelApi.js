import api from './api';

export const excelApi = {
  getActive: () => api.get('/excel/active').then((r) => r.data.data),
  getHistory: () => api.get('/excel/history').then((r) => r.data.data),
  upload: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    return api
      .post('/excel/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 300000,
        onUploadProgress,
      })
      .then((r) => r.data.data);
  },
};

export default excelApi;
