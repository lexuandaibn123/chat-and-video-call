// src/api/axiosClient.js
import axios from 'axios';

// Sử dụng biến môi trường của Vite. Đặt VITE_API_BASE_URL trong .env
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Tạo instance axios với cấu hình chung
const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Interceptor request: tự động gắn token JWT
axiosClient.interceptors.request.use(
  config => {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  error => Promise.reject(error)
);

export default axiosClient;