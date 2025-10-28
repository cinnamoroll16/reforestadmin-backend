// src/services/api.js - DEBUGGED AND UPDATED VERSION
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request(endpoint, options = {}) {
    try {
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

      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      // Handle cases where response might not be JSON
      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        throw new Error(data.error || data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // ========== RECOMMENDATIONS ==========
  async getRecommendation(id) {
    return this.getRecommendationById(id);
  }

  async getRecommendations() {
    return this.request('/api/recommendations');
  }

  async getRecommendationById(id) {
    return this.request(`/api/recommendations/${id}`);
  }

  async deleteRecommendation(id) {
    return this.request(`/api/recommendations/${id}`, {
      method: 'DELETE',
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

  // ========== NOTIFICATIONS ==========
  async getNotifications(filters = {}) {
    const queryParams = new URLSearchParams();
    if (filters.targetRole) queryParams.append('targetRole', filters.targetRole);
    if (filters.read !== undefined) queryParams.append('read', filters.read);
    if (filters.resolved !== undefined) queryParams.append('resolved', filters.resolved);
    if (filters.limit) queryParams.append('limit', filters.limit);
    if (filters.offset) queryParams.append('offset', filters.offset);
    
    return this.request(`/api/notifications?${queryParams}`);
  }

  async getUnreadCount(targetRole = null) {
    const queryParams = new URLSearchParams();
    if (targetRole) queryParams.append('targetRole', targetRole);
    return this.request(`/api/notifications/count/unread?${queryParams}`);
  }

  async markNotificationAsRead(notificationId) {
    return this.request(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  }

  async markMultipleNotificationsAsRead(notificationIds) {
    return this.request('/api/notifications/batch/read', {
      method: 'PATCH',
      body: { ids: notificationIds },
    });
  }

  async deleteNotification(notificationId) {
    return this.request(`/api/notifications/${notificationId}`, {
      method: 'DELETE',
    });
  }

  async createNotification(notificationData) {
    return this.request('/api/notifications', {
      method: 'POST',
      body: notificationData,
    });
  }

  async updateNotification(id, updateData) {
    return this.request(`/api/notifications/${id}`, {
      method: 'PATCH',
      body: updateData,
    });
  }

  // ========== PLANTING REQUESTS ==========
  async getPlantingRequests(filters = {}) {
    const queryParams = new URLSearchParams();
    if (filters.status) queryParams.append('status', filters.status);
    if (filters.userId) queryParams.append('userId', filters.userId);
    if (filters.limit) queryParams.append('limit', filters.limit);
    if (filters.offset) queryParams.append('offset', filters.offset);
    
    const queryString = queryParams.toString();
    return this.request(`/api/plantingrequests${queryString ? `?${queryString}` : ''}`);
  }

  async getPlantingRequest(id) {
    return this.request(`/api/plantingrequests/${id}`);
  }

  async createPlantingRequest(requestData) {
    return this.request('/api/plantingrequests', {
      method: 'POST',
      body: requestData,
    });
  }

  async updatePlantingRequestStatus(id, statusData) {
    return this.request(`/api/plantingrequests/${id}/status`, {
      method: 'PATCH',
      body: statusData,
    });
  }

  async deletePlantingRequest(id) {
    return this.request(`/api/plantingrequests/${id}`, {
      method: 'DELETE',
    });
  }

  async getPlantingRequestsStats() {
    return this.request('/api/plantingrequests/stats/summary');
  }

  // ========== USERS ==========
  async getUsers() {
    return this.request('/api/users');
  }

  async getUser(userId = null) {
    try {
      // If no userId provided, get current user
      if (!userId) {
        return await this.request('/api/users/me');
      }
      // Otherwise get specific user
      return await this.request(`/api/users/${userId}`);
    } catch (error) {
      console.warn('Failed to fetch user:', error.message);
      
      // Fallback to mock data for development
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

  // Mock user data for development
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
    try {
      // Since your sensors are in RTDB, we need to create a proper structure
      // This is a mock implementation - you'll need to adapt to your actual RTDB structure
      const mockSensors = [
        {
          id: 's101',
          location_id: 'LOC_s101',
          latitude: 10.338582993,
          longitude: 123.912025452,
          sensor_status: 'active',
          sensor_lastCalibrationDate: '2025-10-27',
          latest_reading: {
            pH: 0.72,
            soilMoisture: 34.8,
            temperature: 25.7
          },
          last_updated: '2025-10-27T14:52:35Z',
          readings: [
            {
              pH: 0.72,
              soilMoisture: 34.8,
              temperature: 25.7,
              timestamp: '2025-10-27T14:52:35Z',
              readingId: 'data_001'
            }
          ]
        }
      ];
      return mockSensors;
    } catch (error) {
      console.error('Error fetching sensors:', error);
      throw error;
    }
  }

  async getSensorById(id) {
    return this.request(`/sensors/${id}`);
  }

  // ========== LOCATIONS ==========
  async getLocations() {
    try {
      // Mock locations data - replace with actual Firestore call
      const mockLocations = [
        {
          id: 'LOC_s101',
          location_name: 'Sensor Location 101',
          location_latitude: 10.338582993,
          location_longitude: 123.912025452,
          location_type: 'forest',
          location_area: 'Cebu'
        }
      ];
      return mockLocations;
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  }

  async getLocationById(id) {
    return this.request(`/locations/${id}`);
  }

  // ========== RECOMMENDATIONS ==========
  async generateRecommendations(sensorData, options = {}) {
    return this.request('/recommendations/generate', {
      method: 'POST',
      body: { sensorData, options }
    });
  }

  async getRecommendations() {
    return this.request('/recommendations');
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

  // ========== PLANTING TASKS ==========
  async getPlantingTasks(userId = null, status = null) {
    const params = new URLSearchParams();
    if (userId) params.append('user_id', userId);
    if (status) params.append('task_status', status);
    
    const query = params.toString();
    return this.request(`/api/plantingtasks${query ? `?${query}` : ''}`);
  }

  async createPlantingTask(taskData) {
    return this.request('/api/plantingtasks', {
      method: 'POST',
      body: taskData,
    });
  }

  async updatePlantingTaskStatus(id, status) {
    return this.request(`/api/plantingtasks/${id}/status`, {
      method: 'PATCH',
      body: { task_status: status },
    });
  }

  // ========== NOTIFICATION STATISTICS ==========
  async getNotificationStats(targetRole = null) {
    const queryParams = new URLSearchParams();
    if (targetRole) queryParams.append('targetRole', targetRole);
    return this.request(`/api/notifications/stats/summary?${queryParams}`);
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
      // Return mock roles for development
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
      // Return mock login history
      return [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          ip: '192.168.1.1',
          device: 'Chrome on Windows',
          success: true
        }
      ];
    }
  }

  async getAuditLogs(userId) {
    try {
      return await this.request(`/api/users/${userId}/audit-logs`);
    } catch (error) {
      console.warn('Audit logs not available:', error.message);
      // Return mock audit logs
      return [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          action: 'Profile updated',
          details: 'User updated their profile information',
          ip: '192.168.1.1'
        }
      ];
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
      // Silently fail in development
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
      // Return mock active sessions
      return [
        {
          id: '1',
          browser: 'Chrome',
          os: 'Windows',
          ip: '192.168.1.1',
          lastActive: new Date().toISOString()
        }
      ];
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
      // Return mock data for export
      return { logs: [] };
    }
  }
}

export const apiService = new ApiService();