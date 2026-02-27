import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Automatically attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired - try refresh or logout
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken && !error.config._retry) {
        error.config._retry = true;
        return api
          .post("/auth/refresh", { refresh_token: refreshToken })
          .then((res) => {
            localStorage.setItem("access_token", res.data.access_token);
            error.config.headers.Authorization = `Bearer ${res.data.access_token}`;
            return api(error.config);
          })
          .catch(() => {
            localStorage.clear();
            window.location.reload();
          });
      }
    }
    return Promise.reject(error);
  },
);

export const satelliteService = {
  // Existing
  fetchData: async (activeTab) => {
    let endpoint = "/satellites";
    if (activeTab === "Alerts" || activeTab === "Reports") endpoint = "/alerts";

    const res = await api.get(endpoint);
    return res.data.alerts || res.data.satellites || res.data.data || [];
  },

  analyzeSatellite: async (noradId) => {
    const res = await api.get(`/analyze/${noradId}`);
    return res.data;
  },

  // User Reports
  submitReport: async (reportData) => {
    const res = await api.post("/user-reports", reportData);
    return res.data;
  },

  getUserReports: async () => {
    const res = await api.get("/user-reports");
    return res.data;
  },

  // Admin
  getAdminReports: async () => {
    const res = await api.get("/admin/reports");
    return res.data;
  },

  reviewReport: async (reportId, action, notes = "") => {
    const res = await api.put(`/admin/reports/${reportId}/review`, {
      action,
      notes,
    });
    return res.data;
  },

  dispatchReport: async (reportData) => {
    const res = await api.post("/admin/dispatch-report", reportData);
    return res.data;
  },

  getAdminLogs: async () => {
    const res = await api.get("/admin/logs");
    return res.data;
  },

  // CelesTrak Live
  getCelestrakLive: async () => {
    const res = await api.get("/celestrak-live");
    return res.data;
  },

  // Alerts
  getAlerts: async () => {
    const res = await api.get("/alerts");
    return res.data;
  },
};

export default api;
