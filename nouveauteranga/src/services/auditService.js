import api from '../api/axios';

const auditService = {
  getAll: (params) => api.get('/audit-logs', { params }),
  getOne: (id) => api.get(`/audit-logs/${id}`),
};

export default auditService;
