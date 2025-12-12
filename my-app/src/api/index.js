import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터: JWT 토큰 자동 추가
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  getGoogleLoginUrl: () => api.get('/auth/google/login'),
};

// Users API
export const usersAPI = {
  getUserByEmail: (email) => api.get(`/users/by_email/${email}`),
  addCredit: (userId, amount) => api.post(`/users/credit/add/${userId}?amount=${amount}`),
  getCredit: (userId) => api.get(`/users/credit/get/${userId}`),
  updateAddress: (userId, address, lat, lng, detailedAddress = null) =>
    api.put(`/users/${userId}/address?address=${encodeURIComponent(address)}&lat=${lat}&lng=${lng}${detailedAddress ? `&detailed_address=${encodeURIComponent(detailedAddress)}` : ''}`),
};

// Stores API
export const storesAPI = {
  getStoresByCategory: (category) => api.get(`/stores/?category=${category}`),
  getStoreById: (storeId) => api.get(`/stores/?store_id=${storeId}`),
  getMenus: (storeId) => api.get(`/stores/${storeId}/menus`),
};

// Cart API (query parameters)
export const cartAPI = {
  addItem: (userId, storeId, menuId) => api.post(`/cart/add?user_id=${userId}&store_id=${storeId}&menu_id=${menuId}`),
  getCart: (userId) => api.get(`/cart/${userId}`),
  removeItem: (userId, menuId) => api.delete(`/cart/remove?user_id=${userId}&menu_id=${menuId}`),
};

// Orders API
export const ordersAPI = {
  createOrder: (creatorId, deliveryLocation, splitType, lat = null, lng = null) =>
    api.post('/orders/', {
      creator_id: creatorId,
      delivery_location: deliveryLocation,
      split_type: splitType,
      delivery_lat: lat,
      delivery_lng: lng
    }),
  getOrdersByCategory: (category) => api.get(`/orders/?category=${category}`),
  getOrderDetail: (orderId) => api.get(`/orders/${orderId}`),
  deleteOrder: (orderId, userId) => api.delete(`/orders/${orderId}?user_id=${userId}`),
  getMyOrders: (userId) => api.get(`/orders/my/${userId}`),
};

// Match API
export const matchAPI = {
  matchOrder: (orderId, userId) => api.post('/match/', { order_id: orderId, matched_user_id: userId }),
};

// Notifications API
export const notificationsAPI = {
  getNotifications: (userId) => api.get(`/notifier/notifications/${userId}`),
  markAsRead: (notificationId) => api.post(`/notifier/notifications/${notificationId}/read`),
};

export default api;
