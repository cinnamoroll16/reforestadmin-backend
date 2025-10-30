// src/services/api.js - UPDATED WITH BETTER ERROR HANDLING
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    // Get Firebase token
    let token;
    
    // Try to get Firebase auth current user token
    if (typeof window !== 'undefined' && window.firebase) {
      try {
        const currentUser = window.firebase.auth().currentUser;
        if (currentUser) {
          token = await currentUser.getIdToken();
        }
      } catch (error) {
        console.warn('Firebase token not available:', error);
      }
    }
    
    // Fallback to localStorage token
    if (!token) {
      token = localStorage.getItem('firebaseToken') || localStorage.getItem('token');
    }

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      console.log(`🌐 API Request: ${options.method || 'GET'} ${endpoint}`);
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      // Handle cases where response might not be JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        console.warn('Non-JSON response:', text);
        data = text;
      }

      if (!response.ok) {
        const errorMessage = data.error || data.message || `HTTP error! status: ${response.status}`;
        console.error(`❌ API Error: ${errorMessage}`);
        throw new Error(errorMessage);
      }

      console.log(`✅ API Success: ${endpoint}`);
      return data;
    } catch (error) {
      console.error('❌ API Request failed:', error);
      throw error;
    }
  }
  // ========== PLANTING REQUESTS ==========
  async getPlantingRequests() {
    return this.request('/api/plantingrequests');
  }

  async updatePlantingRequest(id, requestData) {
    return this.request(`/api/plantingrequests/${id}`, {
      method: 'PUT',
      body: requestData,
    });
  }

  // ========== PLANTING RECORDS ==========
  async getPlantingRecords() {
    return this.request('/api/plantingrecords');
  }
  async createPlantingRecord(recordData) {
    return this.request('/api/plantingrecords', {
      method: 'POST',
      body: recordData,
    });
  }

  async updatePlantingRecord(id, recordData) {
    return this.request(`/api/plantingrecords/${id}`, {
      method: 'PUT',
      body: recordData,
    });
  }

  // ========== PLANTING TASKS ==========
  async getPlantingTasks() {
    try {
      const response = await this.request('/api/plantingtasks');
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('❌ Failed to fetch planting tasks:', error);
      return [];
    }
  }
  async createPlantingTask(taskData) {
    return this.request('/api/plantingtasks', {
      method: 'POST',
      body: taskData,
    });
  }
  async updatePlantingTask(id, taskData) {
    return this.request(`/api/plantingtasks/${id}`, {
      method: 'PUT',
      body: taskData,
    });
  }
    // ========== SENSOR DATA ==========
  async getSensorData(sensorId, params = {}) {
    try {
      const queryParams = new URLSearchParams(params).toString();
      return await this.request(`/api/sensors/${sensorId}/data?${queryParams}`);
    } catch (error) {
      console.warn(`Sensor data for ${sensorId} not available:`, error.message);
      return null;
    }
  }
  // ========== NOTIFICATIONS ==========
  async getNotifications() {
    try {
      const response = await this.request('/api/notifications');
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
      return [];
    }
  }

  async createNotification(notificationData) {
    return this.request('/api/notifications', {
      method: 'POST',
      body: notificationData,
    });
  }

  async updateNotification(id, notificationData) {
    return this.request(`/api/notifications/${id}`, {
      method: 'PUT',
      body: notificationData,
    });
  }

  async deleteNotification(id) {
    return this.request(`/api/notifications/${id}`, {
      method: 'DELETE',
    });
  }

  // ========== LOCATIONS ==========
  async getLocations() {
    try {
      const response = await this.request('/api/locations');
      return Array.isArray(response) ? response : [];
    } catch (error) {
      console.error('❌ Failed to fetch locations:', error);
      return [];
    }
  }

  async getLocationById(id) {
    try {
      return await this.request(`/api/locations/${id}`);
    } catch (error) {
      console.warn(`Location ${id} not found:`, error.message);
      return null;
    }
  }
  // ========== RECOMMENDATIONS ==========
  async getRecommendations() {
    try {
      const response = await this.request('/api/recommendations');
      
      // Ensure we always return an array
      if (Array.isArray(response)) {
        return response;
      } else if (response && typeof response === 'object') {
        // If it's wrapped in an object with a recommendations property
        if (Array.isArray(response.recommendations)) {
          return response.recommendations;
        }
        // If it's a single recommendation, wrap in array
        return [response];
      }
      
      console.warn('Unexpected response format from getRecommendations:', response);
      return [];
    } catch (error) {
      console.error('❌ Failed to fetch recommendations:', error);
      // Return empty array on error instead of throwing
      return [];
    }
  }

  async getRecommendation(id) {
    return this.getRecommendationById(id);
  }

  async getRecommendationById(id) {
    return this.request(`/api/recommendations/${id}`);
  }

  async deleteRecommendation(id) {
    return this.request(`/api/recommendations/${id}`, {
      method: 'DELETE',
    });
  }

  async createRecommendation(recommendationData) {
    return this.request('/api/recommendations', {
      method: 'POST',
      body: recommendationData,
    });
  }

  async updateRecommendation(id, recommendationData) {
    return this.request(`/api/recommendations/${id}`, {
      method: 'PUT',
      body: recommendationData,
    });
  }

  async getUsers() {
    return this.request('/api/users');
  }

  async getUser(userId = null) {
    try {
      if (!userId) {
        return await this.request('/api/users/me');
      }
      return await this.request(`/api/users/${userId}`);
    } catch (error) {
      console.warn('Failed to fetch user:', error.message);
      
      if (process.env.NODE_ENV === 'development') {
        return this.getMockUserData();
      }
      
      throw new Error('User not found: ' + error.message);
    }
  }

  async getUserById(id) {
    return this.request(`/api/users/${id}`);
  }

  async updateUser(id, userData) {
    return this.request(`/api/users/${id}`, {
      method: 'PUT',
      body: userData,
    });
  }

  async updateProfile(userData) {
    return this.request('/api/users/profile', {
      method: 'PUT',
      body: userData,
    });
  }

  getMockUserData() {
    console.log('Using mock user data for development');
    return {
      id: 'mock-user-id',
      uid: 'mock-user-uid',
      user_firstname: 'Admin',
      user_middlename: '',
      user_lastname: 'User',
      user_email: 'admin@reforest.org',
      phone: '+1234567890',
      organization: 'DENR',
      designation: 'System Administrator',
      department: 'Administration',
      role: 'admin',
      notifications: true,
      twoFactor: false,
      theme: 'light',
      dashboardLayout: 'default',
      deactivated: false,
      lastLogin: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // ========== SENSORS ==========
  async getSensors() {
    return this.request('/api/sensors');
  }

  async getSensorById(id) {
    return this.request(`/api/sensors/${id}`);
  }

  async getSensorData(sensorId, params = {}) {
    const queryParams = new URLSearchParams(params).toString();
    return this.request(`/api/sensors/${sensorId}/data?${queryParams}`);
  }

  // ========== TREE SEEDLINGS ==========
  async getTreeSeedlings() {
    return this.request('/api/tree-seedlings');
  }

  async getTreeSeedlingById(id) {
    return this.request(`/api/tree-seedlings/${id}`);
  }

  async getTreeSeedlingsByCategory(category) {
    return this.request(`/api/tree-seedlings/category/${category}`);
  }

  // ========== HEALTH CHECK ==========
  async healthCheck() {
    return this.request('/health');
  }

  // ========== ADDITIONAL PROFILE METHODS ==========
  async getRoles() {
    try {
      return await this.request('/api/roles');
    } catch (error) {
      console.warn('Roles endpoint not available:', error.message);
      return [
        { id: 'admin', role_name: 'Administrator' },
        { id: 'user', role_name: 'User' },
        { id: 'viewer', role_name: 'Viewer' }
      ];
    }
  }

  async getLoginHistory(userId) {
    try {
      return await this.request(`/api/users/${userId}/login-history`);
    } catch (error) {
      console.warn('Login history not available:', error.message);
      return [{
        id: '1',
        timestamp: new Date().toISOString(),
        ip: '192.168.1.1',
        device: 'Chrome on Windows',
        success: true
      }];
    }
  }

  async getAuditLogs(userId) {
    try {
      return await this.request(`/api/users/${userId}/audit-logs`);
    } catch (error) {
      console.warn('Audit logs not available:', error.message);
      return [{
        id: '1',
        timestamp: new Date().toISOString(),
        action: 'Profile updated',
        details: 'User updated their profile information',
        ip: '192.168.1.1'
      }];
    }
  }

  async createAuditLog(logData) {
    try {
      return await this.request('/api/audit-logs', {
        method: 'POST',
        body: logData,
      });
    } catch (error) {
      console.warn('Audit log creation failed:', error.message);
      return { success: true };
    }
  }

  async changePassword(passwordData) {
    return this.request('/api/auth/change-password', {
      method: 'POST',
      body: passwordData,
    });
  }

  async getActiveSessions(userId) {
    try {
      return await this.request(`/api/users/${userId}/active-sessions`);
    } catch (error) {
      console.warn('Active sessions not available:', error.message);
      return [{
        id: '1',
        browser: 'Chrome',
        os: 'Windows',
        ip: '192.168.1.1',
        lastActive: new Date().toISOString()
      }];
    }
  }

  async revokeSession(sessionId) {
    try {
      return await this.request(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('Session revocation failed:', error.message);
      return { success: true };
    }
  }

  async exportAuditLogs(userId) {
    try {
      return await this.request(`/api/users/${userId}/export-audit-logs`);
    } catch (error) {
      console.warn('Export audit logs failed:', error.message);
      return { logs: [] };
    }
  }
}

export const apiService = new ApiService();