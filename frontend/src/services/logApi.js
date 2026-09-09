import api from './api';

export const logApi = {
  list: (params) => api.get('/email-logs', { params }).then((r) => r.data.data),
  getById: (id) => api.get(`/email-logs/${id}`).then((r) => r.data.data.log),
};

export default logApi;
