import api from '../api/axios';

const notificationService = {
  getAll:        (params = {}) => api.get('/notifications', { params }),
  getUnreadCount: ()           => api.get('/notifications/unread-count'),
  getHistory:    ()            => api.get('/notifications/history'),
  markAsRead:    (id)          => api.put(`/notifications/${id}/read`),
  markAllAsRead: ()            => api.put('/notifications/read-all'),
  send:          (data)        => api.post('/notifications/send', data),
  getZoneData:   ()            => api.get('/notifications/zone-data'),
};

export default notificationService;
