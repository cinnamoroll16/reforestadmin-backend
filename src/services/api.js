// src/services/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Generic API call function
const apiCall = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('token');
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Authentication API
export const authAPI = {
  login: async (credentials) => {
    return apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  register: async (userData) => {
    return apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  verifyToken: async (token) => {
    return apiCall('/auth/verify', {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
  },

  forgotPassword: async (email) => {
    return apiCall('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(email),
    });
  },

  resetPassword: async (resetData) => {
    return apiCall('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(resetData),
    });
  },

  updateProfile: async (profileData) => {
    return apiCall('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  changePassword: async (passwordData) => {
    return apiCall('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    });
  },
};

// Projects API
export const projectsAPI = {
  getAll: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return apiCall(`/projects${queryParams ? `?${queryParams}` : ''}`);
  },

  getById: async (id) => {
    return apiCall(`/projects/${id}`);
  },

  create: async (projectData) => {
    return apiCall('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  },

  update: async (id, projectData) => {
    return apiCall(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });
  },

  delete: async (id) => {
    return apiCall(`/projects/${id}`, {
      method: 'DELETE',
    });
  },

  updateStatus: async (id, status) => {
    return apiCall(`/projects/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },
};

// Trees API
export const treesAPI = {
  getAll: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return apiCall(`/trees${queryParams ? `?${queryParams}` : ''}`);
  },

  getById: async (id) => {
    return apiCall(`/trees/${id}`);
  },

  create: async (treeData) => {
    return apiCall('/trees', {
      method: 'POST',
      body: JSON.stringify(treeData),
    });
  },

  update: async (id, treeData) => {
    return apiCall(`/trees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(treeData),
    });
  },

  delete: async (id) => {
    return apiCall(`/trees/${id}`, {
      method: 'DELETE',
    });
  },

  bulkCreate: async (treesData) => {
    return apiCall('/trees/bulk', {
      method: 'POST',
      body: JSON.stringify(treesData),
    });
  },

  getStatistics: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return apiCall(`/trees/statistics${queryParams ? `?${queryParams}` : ''}`);
  },
};

// Reports API
export const reportsAPI = {
  getDashboardStats: async () => {
    return apiCall('/reports/dashboard');
  },

  getProjectReport: async (projectId, dateRange) => {
    return apiCall(`/reports/projects/${projectId}`, {
      method: 'POST',
      body: JSON.stringify(dateRange),
    });
  },

  getTreeGrowthReport: async (filters) => {
    return apiCall('/reports/tree-growth', {
      method: 'POST',
      body: JSON.stringify(filters),
    });
  },

  getLocationReport: async (location) => {
    return apiCall(`/reports/location/${location}`);
  },

  exportReport: async (reportType, filters) => {
    return apiCall('/reports/export', {
      method: 'POST',
      body: JSON.stringify({ reportType, filters }),
    });
  },
};

// Notifications API
export const notificationsAPI = {
  getAll: async () => {
    return apiCall('/notifications');
  },

  markAsRead: async (id) => {
    return apiCall(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
  },

  markAllAsRead: async () => {
    return apiCall('/notifications/read-all', {
      method: 'PATCH',
    });
  },

  delete: async (id) => {
    return apiCall(`/notifications/${id}`, {
      method: 'DELETE',
    });
  },
};

// Users API (for admin functions)
export const usersAPI = {
  getAll: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    return apiCall(`/users${queryParams ? `?${queryParams}` : ''}`);
  },

  getById: async (id) => {
    return apiCall(`/users/${id}`);
  },

  update: async (id, userData) => {
    return apiCall(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  delete: async (id) => {
    return apiCall(`/users/${id}`, {
      method: 'DELETE',
    });
  },

  updateRole: async (id, role) => {
    return apiCall(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },
};

// File Upload API
export const uploadAPI = {
  uploadImage: async (file, type = 'general') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    return apiCall('/upload/image', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  },

  uploadDocument: async (file, projectId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('projectId', projectId);

    return apiCall('/upload/document', {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  },
};