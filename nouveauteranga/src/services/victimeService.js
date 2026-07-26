import api from '../api/axios';

const victimeService = {
  getAll: (params, options) => api.get('/victimes', { params, ...options }),
  getOne: (id) => api.get(`/victimes/${id}`),
  create: (data) => api.post('/victimes', data),
  update: (id, data) => api.put(`/victimes/${id}`, data),
  delete: (id) => api.delete(`/victimes/${id}`),
};

export default victimeService;
