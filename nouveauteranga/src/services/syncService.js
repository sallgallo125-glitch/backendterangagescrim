import api from '../api/axios';

const syncService = {
  batch: (data) => api.post('/sync/batch', data),
  status: () => api.get('/sync/status'),
};

export default syncService;
