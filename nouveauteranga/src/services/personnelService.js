import api from '../api/axios';

const personnelService = {
  getAll: (params, options) => api.get('/personnels', { params, ...options }),
  getOne: (id) => api.get(`/personnels/${id}`),
  create: (data) => api.post('/personnels', data),
  update: (id, data) => api.put(`/personnels/${id}`, data),
  delete: (id) => api.delete(`/personnels/${id}`),
};

export default personnelService;
