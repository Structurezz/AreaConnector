import api from './axios';

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
};

// Estates
export const estateAPI = {
  create: (data) => api.post('/estates', data),
  getAll: () => api.get('/estates'),
  getOne: (id) => api.get(`/estates/${id}`),
  update: (id, data) => api.patch(`/estates/${id}`, data),
  getStats: () => api.get('/estates/stats'),
};

// Visitors
export const visitorAPI = {
  getAll: (params) => api.get('/visitors', { params }),
  getOne: (id) => api.get(`/visitors/${id}`),
  preRegister: (data) => api.post('/visitors', data),
  verify: (code) => api.get(`/visitors/verify/${code}`),
  checkIn: (id) => api.patch(`/visitors/${id}/checkin`),
  checkOut: (id) => api.patch(`/visitors/${id}/checkout`),
  blacklist: (id) => api.patch(`/visitors/${id}/blacklist`),
};

// Residents
export const residentAPI = {
  getAll: (params) => api.get('/residents', { params }),
  getOne: (id) => api.get(`/residents/${id}`),
  invite: (data) => api.post('/residents/invite', data),
  bulkInvite: (residents) => api.post('/residents/bulk-invite', { residents }),
  add: (data) => api.post('/residents', data),
  suspend: (id) => api.patch(`/residents/${id}/suspend`),
  activate: (id) => api.patch(`/residents/${id}/activate`),
  assignUnit: (id, unitId) => api.patch(`/residents/${id}/assign-unit`, { unitId }),
};

// Units
export const unitAPI = {
  getAll: (params) => api.get('/units', { params }),
  create: (data) => api.post('/units', data),
  update: (id, data) => api.patch(`/units/${id}`, data),
  delete: (id) => api.delete(`/units/${id}`),
};

// Announcements
export const announcementAPI = {
  getAll: (params) => api.get('/announcements', { params }),
  create: (formData) => api.post('/announcements', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.patch(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`),
  markRead: (id) => api.post(`/announcements/${id}/read`),
};

// Marketplace
export const marketplaceAPI = {
  getAll: (params) => api.get('/marketplace', { params }),
  getOne: (id) => api.get(`/marketplace/${id}`),
  create: (formData) => api.post('/marketplace', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, data) => api.patch(`/marketplace/${id}`, data),
  delete: (id) => api.delete(`/marketplace/${id}`),
};

// Messages
export const messageAPI = {
  getGroup: (params) => api.get('/messages/group', { params }),
  getDM: (userId) => api.get(`/messages/dm/${userId}`),
  getConversations: () => api.get('/messages/conversations'),
  getUnread: () => api.get('/messages/unread'),
  getEstateUsers: (params) => api.get('/messages/users', { params }),
  send: (data) => api.post('/messages', data),
};

// Alerts
export const alertAPI = {
  getAll: (params) => api.get('/alerts', { params }),
  create: (data) => api.post('/alerts', data),
  acknowledge: (id) => api.patch(`/alerts/${id}/acknowledge`),
  resolve: (id) => api.patch(`/alerts/${id}/resolve`),
  broadcast: (data) => api.post('/alerts/broadcast', data),
};

// Events
export const eventAPI = {
  getAll: () => api.get('/events'),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  rsvp: (id) => api.patch(`/events/${id}/rsvp`),
};

// Polls
export const pollAPI = {
  getAll: () => api.get('/polls'),
  create: (data) => api.post('/polls', data),
  vote: (id, optionIndex) => api.post(`/polls/${id}/vote`, { optionIndex }),
  close: (id) => api.patch(`/polls/${id}/close`),
};

// Social posts (Lounge feed)
export const postAPI = {
  getAll:        (page = 1) => api.get(`/posts?page=${page}&limit=20`),
  create:        (formData) => api.post('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete:        (id) => api.delete(`/posts/${id}`),
  like:          (id) => api.post(`/posts/${id}/like`),
  addComment:    (id, text) => api.post(`/posts/${id}/comments`, { text }),
  deleteComment: (id, commentId) => api.delete(`/posts/${id}/comments/${commentId}`),
};

// Lounge
export const loungeAPI = {
  getSession: () => api.get('/lounge'),
  updateMood: (data) => api.patch('/lounge/mood', data),
  remove: (suggestionId) => api.delete(`/lounge/suggest/${suggestionId}`),
  resetDefaults: () => api.post('/lounge/reset-defaults'),
};

// Plan / subscription
export const planAPI = {
  getMySubscription: () => api.get('/plans/my-subscription'),
  getPublicPlans: () => api.get('/plans/public'),
  initializeUpgrade: (data) => api.post('/plans/upgrade/initialize', data),
  verifyUpgrade: (reference) => api.get(`/plans/upgrade/verify/${reference}`),
};

// Payments
export const paymentAPI = {
  getStats: () => api.get('/payments/stats'),
  getSchedules: () => api.get('/payments/schedules'),
  createSchedule: (data) => api.post('/payments/schedules', data),
  deleteSchedule: (id) => api.delete(`/payments/schedules/${id}`),
  getSchedulePayments: (scheduleId) => api.get(`/payments/schedules/${scheduleId}/payments`),
  recordManual: (paymentId, data) => api.patch(`/payments/${paymentId}/manual`, data),
  waive: (paymentId, data) => api.patch(`/payments/${paymentId}/waive`, data),
  // Wallet
  getWallet: () => api.get('/payments/wallet'),
  getBanks: () => api.get('/payments/wallet/banks'),
  saveBankAccount: (data) => api.post('/payments/wallet/bank', data),
  withdraw: (data) => api.post('/payments/wallet/withdraw', data),
};

// Guards (security staff)
export const guardAPI = {
  getAll: (params) => api.get('/guards', { params }),
  getOne: (id) => api.get(`/guards/${id}`),
  invite: (data) => api.post('/guards/invite', data),
  suspend: (id) => api.patch(`/guards/${id}/suspend`),
  activate: (id) => api.patch(`/guards/${id}/activate`),
  remove: (id) => api.delete(`/guards/${id}`),
};
