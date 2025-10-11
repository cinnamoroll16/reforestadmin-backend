// src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext.js';
import ProtectedRoute from './components/ProtectedRoute.js';
import PublicRoute from './components/PublicRoute.js';

// Import pages
import Login from './pages/Login.js';
import Registration from './pages/Registration.js';
import Dashboard from './pages/Dashboard.js';
import Profile from './pages/Profile.js';
import Sensors from './pages/Sensor.js'; // Your actual file
import Recommendations from './pages/Recommendations.js';
import Tasks from './pages/Task.js';
import Notification from './pages/Notification.js';
import ForgotPassword from './pages/ForgotPassword.js';;

// Temporary placeholder components
const ResetPassword = () => <div>Reset Password Page - Under Construction</div>;
const NotFound = () => <div>404 - Page Not Found</div>;

// MUI Theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#2e7d32',
      light: '#66bb6a',
      dark: '#1b5e20',
    },
    secondary: {
      main: '#4caf50',
    },
    background: {
      default: '#f8f9fa',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 500,
    },
    button: {
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '10px 24px',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
          },
        },
      },
    },
  },
});

// 🔠 Lowercase Redirect Wrapper
function LowercaseRedirect({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const lowerPath = location.pathname.toLowerCase();
    if (location.pathname !== lowerPath) {
      navigate(lowerPath + location.search, { replace: true });
    }
  }, [location.pathname, location.search, navigate]);

  return children;
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <LowercaseRedirect>
            <Routes>
              {/* Public Routes */}
              <Route
                path="/login"
                element={
                  <PublicRoute>
                    <Login />
                  </PublicRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <PublicRoute>
                    <Registration />
                  </PublicRoute>
                }
              />
              <Route
                path="/forgotpassword"
                element={
                  <PublicRoute>
                    <ForgotPassword />
                  </PublicRoute>
                }
              />
              <Route
                path="/reset-password/:token"
                element={
                  <PublicRoute>
                    <ResetPassword />
                  </PublicRoute>
                }
              />

              {/* Protected Routes - ✅ FIXED TO MATCH NAVIGATION.JS */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/dashboard"
                element={<Navigate to="/" replace />}
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sensors"
                element={
                  <ProtectedRoute>
                    <Sensors />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sensor"
                element={<Navigate to="/sensors" replace />}
              />
              <Route
                path="/recommendations"
                element={
                  <ProtectedRoute>
                    <Recommendations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks/:id"
                element={
                  <ProtectedRoute>
                    <Tasks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/tasks"
                element={
                  <ProtectedRoute>
                    <Tasks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Notification />
                  </ProtectedRoute>
                }
              />
              {/* 404 Fallback */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </LowercaseRedirect>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;