import axios from 'axios';

// 로컬 테스트용
// const API_BASE_URL = 'http://localhost:8000';
// AWS 배포용
const API_BASE_URL = 'https://d23dn2tm74qiqa.cloudfront.net';

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
  getStoresByCity: (userAddress) => api.get(`/stores/by-city?user_address=${encodeURIComponent(userAddress)}`),
};

// Cart API (query parameters)
export const cartAPI = {
  addItem: (userId, storeId, menuId) => api.post(`/cart/add?user_id=${userId}&store_id=${storeId}&menu_id=${menuId}`),
  getCart: (userId) => api.get(`/cart/${userId}`),
  removeItem: (userId, menuId) => api.delete(`/cart/remove?user_id=${userId}&menu_id=${menuId}`),
};

// Orders API
export const ordersAPI = {
  createOrder: (creatorId, deliveryLocation, splitType, lat = null, lng = null, detailedLocation = null) =>
    api.post('/orders/', {
      creator_id: creatorId,
      delivery_location: deliveryLocation,
      detailed_location: detailedLocation,
      split_type: splitType,
      delivery_lat: lat,
      delivery_lng: lng
    }),
  getOrdersByCategory: (category, lat = null, lon = null) => {
    let url = `/orders/?category=${category}`;
    if (lat !== null && lon !== null) {
      url += `&lat=${lat}&lon=${lon}`;
    }
    return api.get(url);
  },
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
