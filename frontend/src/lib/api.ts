import axios from 'axios';
import Cookies from 'js-cookie';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = Cookies.get('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        const refresh_token = Cookies.get('refresh_token');
        const { data } = await axios.post(`${BASE_URL}/api/users/refresh`, {}, {
          headers: { Authorization: `Bearer ${refresh_token}` },
        });
        Cookies.set('access_token', data.data.access_token);
        original.headers.Authorization = `Bearer ${data.data.access_token}`;
        return api(original);
      } catch {
        Cookies.remove('access_token');
        Cookies.remove('refresh_token');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  register: (data: { name: string; email: string; password: string }) =>
    api.post('/api/users/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/api/users/login', data),
  refresh: () => api.post('/api/users/refresh'),
  logout: () => api.post('/api/users/logout'),
};

// Files
export const filesApi = {
  list: (params: { page?: number; limit?: number; mime_type?: string }) =>
    api.get('/api/s3/files', { params }),
  getVersions: (file_id: string) =>
    api.get(`/api/s3/files/${file_id}/versions`),
  getDownloadUrl: (file_id: string) =>
    api.get(`/api/s3/files/${file_id}/download`),
  restoreVersion: (file_id: string, version_id: string) =>
    api.post(`/api/s3/files/${file_id}/versions/${version_id}/restore`),
  delete: (file_id: string) =>
    api.delete(`/api/s3/files/${file_id}`),
};

// Uploads
export const uploadsApi = {
  initiate: (data: { file_name: string; mime_type: string; size: number }) =>
    api.post('/api/s3/uploads/initiate', data),
  confirm: (upload_id: string, data: { etag: string }) =>
    api.post(`/api/s3/uploads/${upload_id}/confirm`, data),
  getStatus: (upload_id: string) =>
    api.get(`/api/s3/uploads/${upload_id}/status`),
};
