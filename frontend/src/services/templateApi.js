import api from './api';

export const templateApi = {
  getAll: () => api.get('/templates').then((r) => r.data.data),
  get: (type, day) => api.get(`/templates/${type}/${day}`).then((r) => r.data.data.template),
  update: (type, day, payload) =>
    api.put(`/templates/${type}/${day}`, payload).then((r) => r.data.data.template),
};

export default templateApi;
