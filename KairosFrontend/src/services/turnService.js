// src/services/turnService.js
import api from './api';

export const turnService = {
  GetAll: async () => {
    const response = await api.get('/turns');
    return response.data;
  },

  GetById: async (id) => {
    const response = await api.get(`/turns/${id}`);
    return response.data;
  },

  Create: async (turnData) => {
    const response = await api.post('/turns', turnData);
    return response.data;
  },

  Update: async (id, turnData) => {
    const response = await api.put(`/turns/${id}`, turnData);
    return response.data;
  },

  Delete: async (id) => {
    const response = await api.delete(`/turns/${id}`);
    return response.data;
  },

  CreatePublic: async (data) => {
    const response = await api.post('/turns/public', data);
    return response.data;
  },

  CancelPublic: async (data) => {
    const response = await api.post('/turns/public/cancel', data);
    return response.data;
  },

  GetServiceSummary: async (serviceId) => {
    const response = await api.get(`/turns/service/${serviceId}/summary`);
    return response.data;
  },

  AdvanceByService: async (serviceId) => {
    const response = await api.post(`/turns/service/${serviceId}/advance`);
    return response.data;
  },

  // 🔹 Estado del turno pendiente de un cliente en un servicio
  GetClientPendingTurn: async (document, serviceId) => {
    const response = await api.get('/turns/public/status', {
      params: { document, serviceId },
    });
    return response.data; // puede ser null o un TurnDTO
  },

  // 🔹 Últimos turnos atendidos (para la pantalla tipo banco)
  GetRecentCalled: async (count = 20) => {
    const response = await api.get('/turns/display/recent', {
      params: { count },
    });
    return response.data;
  },
};
