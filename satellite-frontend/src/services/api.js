import axios from "axios";

// Strictly use the full API path
const API_BASE_URL = "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
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
  // api.js - fetchData function
  fetchData: async (activeTab) => {
    let endpoint = "/satellites";
    // Mapping tabs to endpoints
    if (activeTab === "Alerts" || activeTab === "Reports") endpoint = "/alerts";

    try {
      const res = await api.get(endpoint);
      const data = res.data;

      // Sanitizing response structure
      let rawData = Array.isArray(data)
        ? data
        : data?.alerts || data?.satellites || data?.data || [];

      // api.js - inside fetchData mapping
      return rawData.map((item) => ({
        ...item,
        severity: item.severity || "STABLE", // Ensure this is preserved!
        name: item.name || "Unknown Satellite",
        norad_id: item.norad_id || "N/A",
        altitude: Number(parseFloat(item.altitude || 0).toFixed(2)),
        days_left: Number(parseFloat(item.days_left || 0).toFixed(2)),
      }));
    } catch (err) {
      console.error("Fetch Error:", err);
      return [];
    }
  },

  analyzeSatellite: async (noradId) => {
    try {
      const res = await api.get(`/analyze/${noradId}`);
      const item = res.data;
      if (item && item.status === "success") {
        return {
          ...item.metadata,
          ground_track: item.map_data?.ground_track || [],
          impact_corridor: item.impact_data?.corridor || [],
          analysis: item.analysis || {},
          days_left: Number(item.analysis?.days_left || 0),
          reentry_window: item.reentry_window || {},
        };
      }
      return item;
    } catch (err) {
      console.error("Analyze Error:", err);
      return null;
    }
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

  // System Stats (live from DB)
  getStats: async () => {
    const res = await api.get("/stats");
    return res.data;
  },

  // Profile
  getProfile: async () => {
    const res = await api.get("/profile");
    return res.data;
  },

  updateProfile: async (profileData) => {
    const res = await api.put("/profile", profileData);
    return res.data;
  },
};

export default api;
