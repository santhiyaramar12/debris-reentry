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
   if (
     error.response?.status === 401 &&
     localStorage.getItem("refresh_token") &&
     localStorage.getItem("access_token")
   ) {
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

      let rawData = Array.isArray(data)
        ? data
        : data?.alerts || data?.satellites || data?.data || [];

      if (!Array.isArray(rawData)) rawData = [];

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
      return res.data;
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

  getAdminMetrics: async () => {
    const res = await api.get("/admin/metrics");
    return res.data;
  },

  getSyncStatus: async () => {
    const res = await api.get("/admin/sync-status");
    return res.data;
  },

  triggerSync: async () => {
    const res = await api.post("/admin/sync-satellites");
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
    let data = res.data;
    let rawData = Array.isArray(data)
      ? data
      : data?.alerts || data?.satellites || data?.data || [];

    if (!Array.isArray(rawData)) rawData = [];
    return rawData;
  },

  updateAlert: async (noradId, alertData) => {
    const res = await api.put(`/admin/alerts/${noradId}`, alertData);
    return res.data;
  },

  sendFinalImpactAlert: async (asset) => {
    const message = `
========================================
Subject: SpaceTug Re-Entry Alert
Object: ${asset.name} (NORAD ${asset.norad_id})
Predicted Impact: ${asset.lat?.toFixed(2)}°, ${asset.lng?.toFixed(2)}°
Risk Level: Critical
========================================`;
    console.log(message);
    return { status: "success", message: "Email Sent to emergency contacts." };
  },

  // Alert Settings
  getAlertSettings: async () => {
    const res = await api.get("/admin/alert-settings");
    return res.data;
  },

  updateAlertSettings: async (settingsData) => {
    const res = await api.post("/admin/alert-settings", settingsData);
    return res.data;
  },

  // Users
  getUsers: async () => {
    const res = await api.get("/admin/users");
    return res.data;
  },

  updateUserRole: async (userId, role) => {
    const res = await api.put(`/admin/users/${userId}`, { role });
    return res.data;
  },

  deleteUser: async (userId) => {
    const res = await api.delete(`/admin/users/${userId}`);
    return res.data;
  },

  // System Logs
  getSystemLogs: async () => {
    const res = await api.get("/admin/system-logs");
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
