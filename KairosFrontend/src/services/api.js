// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: `http://${window.location.hostname}:7299/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 🔹 Interceptor de REQUEST: añade Authorization si hay token guardado
api.interceptors.request.use(
  (config) => {
    try {
      const stored = localStorage.getItem('kairos_auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.token) {
          config.headers.Authorization = `Bearer ${parsed.token}`;
        }
      }
    } catch {
      // Si algo falla leyendo el localStorage, seguimos sin token
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de RESPONSE (ya lo tenías)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('Error en la petición:', error);
    return Promise.reject(error);
  }
);

export default api;
