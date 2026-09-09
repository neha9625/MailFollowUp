import api from './api';

const BASE = "https://mail-follow-up-mxi5.vercel.app/api" || '/api';

/** Full-page navigation to the Google consent screen (cannot be an XHR). */
export function gmailConnectRedirect() {
  const connectPath = `${BASE.replace(/\/$/, '')}/gmail/connect`;
  if (connectPath.startsWith('/')) {
    window.location.assign(`${window.location.origin}${connectPath}`);
  } else {
    window.location.assign(connectPath);
  }
}

export const gmailApi = {
  getStatus: () => api.get('/gmail/status').then((r) => r.data.data),
  disconnect: () => api.post('/gmail/disconnect').then((r) => r.data.data),
};

export default gmailApi;
