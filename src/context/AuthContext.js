// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const userData = await authAPI.verifyToken(token);
        setUser(userData);
      }
    } catch (error) {
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      setError('');
      const response = await authAPI.login({ email, password });
      
      if (response.success) {
        localStorage.setItem('token', response.token);
        setUser(response.user);
        return { success: true };
      } else {
        setError(response.message || 'Login failed');
        return { success: false };
      }
    } catch (error) {
      setError(error.message || 'Network error. Please try again.');
      return { success: false };
    }
  };

  const register = async (userData) => {
    try {
      setError('');
      const response = await authAPI.register(userData);
      
      if (response.success) {
        return { success: true, message: 'Account created successfully!' };
      } else {
        setError(response.message || 'Registration failed');
        return { success: false };
      }
    } catch (error) {
      setError(error.message || 'Network error. Please try again.');
      return { success: false };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setError('');
  };

  const forgotPassword = async (email) => {
    try {
      setError('');
      const response = await authAPI.forgotPassword({ email });
      return response;
    } catch (error) {
      setError(error.message || 'Network error. Please try again.');
      return { success: false };
    }
  };

  const resetPassword = async (token, password) => {
    try {
      setError('');
      const response = await authAPI.resetPassword({ token, password });
      return response;
    } catch (error) {
      setError(error.message || 'Network error. Please try again.');
      return { success: false };
    }
  };

  const updateProfile = async (profileData) => {
    try {
      setError('');
      const response = await authAPI.updateProfile(profileData);
      
      if (response.success) {
        setUser(response.user);
        return { success: true };
      } else {
        setError(response.message || 'Profile update failed');
        return { success: false };
      }
    } catch (error) {
      setError(error.message || 'Network error. Please try again.');
      return { success: false };
    }
  };

  const value = {
    user,
    login,
    register,
    logout,
    forgotPassword,
    resetPassword,
    updateProfile,
    loading,
    error,
    setError,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};