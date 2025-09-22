// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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
import Sensor from './pages/Sensor.js';
import Recommendations from './pages/Recommendations.js';
import Tasks from './pages/Task.js';
import Notification from './pages/Notification.js';
import ForgotPassword from './pages/ForgotPassword.js';
// Uncomment these imports when you create these components:
// import ForgotPassword from './pages/ForgotPassword';
// import ResetPassword from './pages/ResetPassword';
// import PlantingProjects from './pages/PlantingProjects';
// import TreeInventory from './pages/TreeInventory';
// import Reports from './pages/Reports';
// import Settings from './pages/Settings';
// import NotFound from './pages/NotFound';

// Create temporary placeholder components for development
const ResetPassword = () => <div>Reset Password Page - Under Construction</div>;
const PlantingProjects = () => <div>Planting Projects Page - Under Construction</div>;
const TreeInventory = () => <div>Tree Inventory Page - Under Construction</div>;
const Reports = () => <div>Reports Page - Under Construction</div>;
const Settings = () => <div>Settings Page - Under Construction</div>;
const NotFound = () => <div>404 - Page Not Found</div>;

// Create theme
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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
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
              path="/forgot-password" 
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

            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
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
              path="/sensor" 
              element={
                <ProtectedRoute>
                  <Sensor />
                </ProtectedRoute>
              } 
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
            {/* Default Redirects */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;