import api from './api';

export const automationApi = {
  /** Long-running for big lists — no axios timeout on this call. */
  run: () => api.post('/automation/run', {}, { timeout: 0 }).then((r) => r.data.data.summary),
};

export default automationApi;
