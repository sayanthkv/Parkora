import axios from 'axios';

const API = axios.create({
  // Use VITE_API_BASE_URL if configured; fallback to local dev proxy
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT bearer token if available
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('parkora_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default API;