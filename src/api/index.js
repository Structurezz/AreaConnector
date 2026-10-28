import api from './axios';

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
  updateProfile: (data) => api.patch('/auth/me', data),
  switchEstate: (estateId) => api.post('/auth/switch-estate', { estateId }),

  // Password management
  changePassword: (data) => api.post('/auth/change-password', data),
  // Estate manager — view + act on resident/security reset requests
  listPasswordResets:   (params) => api.get('/auth/password-resets', { params }),
  approvePasswordReset: (id)     => api.post(`/auth/password-resets/${id}/approve`),
  denyPasswordReset:    (id, data) => api.post(`/auth/password-resets/${id}/deny`, data),
};

// Estates
export const estateAPI = {
  create: (data) => api.post('/estates', data),
  getAll: () => api.get('/estates'),
  getMine: () => api.get('/estates/mine'),
  addEstate: (data) => api.post('/estates/add', data),
  getOne: (id) => api.get(`/estates/${id}`),
  update: (id, data) => api.patch(`/estates/${id}`, data),
  getStats: () => api.get('/estates/stats'),
  // Constitution
  getConstitutionMeta: (id) => api.get(`/estates/${id}/constitution/meta`),
  uploadConstitution:  (id, file) => {
    const fd = new FormData();
    fd.append('file', file);
    return api.post(`/estates/${id}/constitution`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteConstitution: (id) => api.delete(`/estates/${id}/constitution`),
  constitutionFileUrl: (id) => `/estates/${id}/constitution/file`,
  // The file route needs the auth header, so fetch it as a blob (a plain link can't send it)
  downloadConstitution: (id) => api.get(`/estates/${id}/constitution/file`, { responseType: 'blob' }),
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
  cancel: (id) => api.patch(`/visitors/${id}/cancel`),
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
  stories:       () => api.get('/posts/stories'),
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
  suggest: (data) => api.post('/lounge/suggest', data),
  remove: (suggestionId) => api.delete(`/lounge/suggest/${suggestionId}`),
  resetDefaults: () => api.post('/lounge/reset-defaults'),
};

// Live DJ host + mixtapes
export const djAPI = {
  getActive:     () => api.get('/dj/active'),
  start:         (data) => api.post('/dj/start', data),
  updateTrack:   (id, data) => api.patch(`/dj/${id}/track`, data),
  end:           (id) => api.post(`/dj/${id}/end`),
  listMixtapes:  () => api.get('/dj/mixtapes'),
  saveMixtape:   (data) => api.post('/dj/mixtapes', data),
  deleteMixtape: (id) => api.delete(`/dj/mixtapes/${id}`),
  recordPlay:    (id) => api.post(`/dj/mixtapes/${id}/play`),
};

// Admin podcast — listener side (manager can also listen)
export const podcastAPI = {
  getLive:      () => api.get('/podcast/live'),
  getUpcoming:  () => api.get('/podcast/upcoming'),
  listEpisodes: () => api.get('/podcast/episodes'),
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
  getInvoice: (paymentId) => api.get(`/payments/${paymentId}/invoice`),
  recordManual: (paymentId, data) => api.patch(`/payments/${paymentId}/manual`, data),
  waive: (paymentId, data) => api.patch(`/payments/${paymentId}/waive`, data),
  // Force-sync a stuck Paystack reference against the gateway.
  reconcile: (reference) => api.post(`/payments/reconcile/${reference}`),
  // Paystack ledger — direct gateway view, surfaces unmatched captures
  paystackLedger: (params) => api.get('/payments/paystack/recent', { params }),
  paystackAttach: (data)   => api.post('/payments/paystack/attach', data),
  // Wallet
  getWallet: () => api.get('/payments/wallet'),
  getBanks: () => api.get('/payments/wallet/banks'),
  resolveAccount: (data) => api.post('/payments/wallet/resolve', data),
  saveBankAccount: (data) => api.post('/payments/wallet/bank', data),
  withdraw: (data) => api.post('/payments/wallet/withdraw', data),
};

// Estate manager team (co-managers with limited access)
export const teamAPI = {
  options:      ()         => api.get('/team/options'),
  list:         ()         => api.get('/team'),
  invite:       (data)     => api.post('/team', data),
  update:       (id, data) => api.patch(`/team/${id}`, data),
  resendInvite: (id)       => api.post(`/team/${id}/resend-invite`),
  remove:       (id)       => api.delete(`/team/${id}`),
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

// Courtroom
export const courtAPI = {
  listCases:         (params) => api.get('/court', { params }),
  getCase:           (id) => api.get(`/court/${id}`),
  getStats:          () => api.get('/court/stats'),
  getMembers:        () => api.get('/court/members'),
  fileCase:          (data) => api.post('/court', data),
  openCase:          (id) => api.patch(`/court/${id}/open`),
  hireLawyer:        (id, data) => api.post(`/court/${id}/lawyer`, data),
  submitArgument:    (id, data) => api.post(`/court/${id}/argument`, data),
  submitEvidence:    (id, data) => api.post(`/court/${id}/evidence`, data),
  castJuryVote:      (id, data) => api.post(`/court/${id}/jury-vote`, data),
  deliverVerdict:    (id) => api.post(`/court/${id}/verdict`),
  proposeSettlement: (id, data) => api.post(`/court/${id}/settle`, data),
  fileAppeal:        (id, data) => api.post(`/court/${id}/appeal`, data),
  payFine:           (id) => api.post(`/court/${id}/pay-fine`),
  chatWithLawyer:    (id, message) => api.post(`/court/${id}/chat`, { message }),
  requestAdjournment:(id, reason) => api.post(`/court/${id}/adjourn`, { reason }),
  // Manager-as-judge controls
  setMode:           (id, data) => api.patch(`/court/${id}/mode`, data),
  managerVerdict:    (id, data) => api.post(`/court/${id}/manager-verdict`, data),
  overrideVerdict:   (id, data) => api.post(`/court/${id}/override-verdict`, data),
};

// Calls (staff receive free emergency calls from residents and can call back)
export const callAPI = {
  ringing:     () => api.get('/calls/ringing'),
  config:   () => api.get('/calls/config'),
  directory: () => api.get('/calls/directory'),
  history:  () => api.get('/calls/history'),
  start:    (calleeId) => api.post('/calls', { calleeId }),
  answer:   (id) => api.post(`/calls/${id}/answer`),
  decline:  (id) => api.post(`/calls/${id}/decline`),
  cancel:   (id) => api.post(`/calls/${id}/cancel`),
  end:      (id) => api.post(`/calls/${id}/end`),
  // Check up on a resident: in-app notification + email with your profile
  buzz:     (toUserId, kind, message) => api.post('/calls/buzz', { toUserId, kind, message }),
};

// Personal safety: residents sharing live location with staff
export const safetyAPI = {
  activeLocations: () => api.get('/safety/location/active'),
};

// Marketplace control: moderation, consumer protection, price rules
export const marketAdminAPI = {
  stats:     () => api.get('/marketplace/admin/stats'),
  listings:  (params) => api.get('/marketplace/admin/listings', { params }),
  approve:   (id) => api.post(`/marketplace/admin/listings/${id}/approve`),
  reject:    (id, reason) => api.post(`/marketplace/admin/listings/${id}/reject`, { reason }),
  remove:    (id, reason) => api.post(`/marketplace/admin/listings/${id}/remove`, { reason }),
  restore:   (id) => api.post(`/marketplace/admin/listings/${id}/restore`),
  reports:   (status = 'open') => api.get('/marketplace/admin/reports', { params: { status } }),
  resolve:   (id, data) => api.post(`/marketplace/admin/reports/${id}/resolve`, data),
  sellers:   () => api.get('/marketplace/admin/sellers'),
  suspend:   (id, reason, days) => api.post(`/marketplace/admin/sellers/${id}/suspend`, { reason, days }),
  unsuspend: (id) => api.post(`/marketplace/admin/sellers/${id}/unsuspend`),
  orders:    (status) => api.get('/marketplace/admin/orders', { params: { status } }),
  resolveOrder: (id, action, note) => api.post(`/marketplace/admin/orders/${id}/resolve`, { action, note }),
  settings:  () => api.get('/marketplace/admin/settings'),
  saveSettings: (data) => api.put('/marketplace/admin/settings', data),
};

// Platform campaigns (in-app modal / dashboard banner)
export const campaignAPI = {
  getActive: (placement) => api.get('/campaigns/active', { params: { placement } }),
  markSeen:  (id) => api.post(`/campaigns/${id}/seen`),
  dismiss:   (id) => api.post(`/campaigns/${id}/dismiss`),
  click:     (id) => api.post(`/campaigns/${id}/click`),
};
