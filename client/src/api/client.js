const BASE_URL = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(endpoint, options = {}) {
  const headers = {
    ...getAuthHeader(),
    ...options.headers,
  };

  // Don't set Content-Type for FormData
  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error || `Request failed with status ${res.status}`;
    const err = new Error(errorMsg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  register: (email, password) => request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  getMe: () => request('/auth/me'),

  // Datasets
  uploadDataset: (formData) => request('/datasets/upload', {
    method: 'POST',
    body: formData,
  }),
  listDatasets: () => request('/datasets'),
  getDataset: (id) => request(`/datasets/${id}`),
  deleteDataset: (id) => request(`/datasets/${id}`, { method: 'DELETE' }),

  // Reports
  createReport: (datasetId, title) => request('/reports', {
    method: 'POST',
    body: JSON.stringify({ datasetId, title }),
  }),
  listReports: () => request('/reports'),
  getReport: (id) => request(`/reports/${id}`),
  updateReport: (id, updates) => request(`/reports/${id}`, {
    method: 'PUT',
    body: JSON.stringify(updates),
  }),
  deleteReport: (id) => request(`/reports/${id}`, { method: 'DELETE' }),

  // Share
  createShareLink: (reportId, expiresInHours) => request('/share', {
    method: 'POST',
    body: JSON.stringify({ reportId, expiresInHours }),
  }),
  listShareLinks: (reportId) => request(`/share/links/${reportId}`),
  revokeShareLink: (token) => request(`/share/revoke/${token}`, {
    method: 'POST',
  }),
  getSharedReport: (token) => request(`/share/${token}`),
};
