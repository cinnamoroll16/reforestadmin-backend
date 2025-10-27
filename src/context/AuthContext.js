// src/context/AuthContext.js
import { useState, createContext, useContext, useEffect } from 'react';

const AuthContext = createContext();

// Helper functions
const getErrorMessage = (error) => {
  return error.message || 'An error occurred';
};

const validateEmailFormat = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const AuthProvider = ({ children }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  // Check for existing user session on app start
  useEffect(() => {
    const checkExistingAuth = () => {
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        
        if (storedUser && token) {
          setUser(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error('Error checking existing auth:', err);
        logout();
      }
    };

    checkExistingAuth();
  }, []);

  const login = async (email, password) => {
    try {
      setError("");
      setLoading(true);

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `Login failed: ${response.status}`);
      }

      if (!data.user) {
        throw new Error('Invalid response from server: missing user data');
      }

      // Store user data
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', 'firebase-auth-token'); // Adjust based on your backend

      setUser(data.user);

      return { 
        success: true, 
        user: data.user,
        message: data.message || 'Login successful'
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setError("");
      setLoading(true);

      if (!validateEmailFormat(userData.email)) {
        throw new Error('Please enter a valid email address');
      }

      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email.toLowerCase().trim(),
          password: userData.password,
          firstName: userData.firstName.trim(),
          lastName: userData.lastName.trim(),
          role: userData.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Registration failed');
      }

      return { 
        success: true, 
        message: data.message || 'Registration successful! You can now log in.',
        user: data.user
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setUser(null);
    setError('');
  };

  const forgotPassword = async (email) => {
    try {
      setError("");
      setLoading(true);

      if (!validateEmailFormat(email)) {
        throw new Error('Please enter a valid email address');
      }

      const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Failed to send reset email');
      }

      return { 
        success: true, 
        message: data.message || 'Password reset email sent successfully'
      };
    } catch (error) {
      const errorMessage = getErrorMessage(error);
      setError(errorMessage);
      return { 
        success: false, 
        error: errorMessage 
      };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,
    error,
    loading,
    login,
    register,
    logout,
    forgotPassword,
    setError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;