import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, useMediaQuery } from '@mui/material';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import theme from './theme/theme';
import ReForestAppBar from './components/AppBar';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Register from './components/Register';
import Login from './components/Login';
import Sensor from './components/Sensor';

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login', 'register', 'forgot'
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
  };

  const switchToRegister = () => {
    setAuthView('register');
  };

  const switchToLogin = () => {
    setAuthView('login');
  };

  const switchToForgotPassword = () => {
    setAuthView('forgot');
  };

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {authView === 'login' ? (
          <Login 
            onLogin={handleLogin} 
            onSwitchToRegister={switchToRegister}
            onSwitchToForgotPassword={switchToForgotPassword}
          />
        ) : (
          <Register onRegister={handleLogin} onSwitchToLogin={switchToLogin} />
        )}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <Router> {/* Wrap everything with Router */}
        <Box sx={{ display: 'flex' }}>
          <CssBaseline />
          <ReForestAppBar 
            handleDrawerToggle={handleDrawerToggle} 
            user={user}
            onLogout={handleLogout}
          />
          <Navigation 
            mobileOpen={mobileOpen} 
            handleDrawerToggle={handleDrawerToggle} 
            isMobile={isMobile}
          />
          <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/Dashboard" replace />} />
              <Route path="/Dashboard" element={<Dashboard />} />
              <Route path="/Sensor" element={<Sensor />} />
              
              {/* Add a catch-all route for undefined paths */}
              <Route path="*" element={<Navigate to="/Dashboard" replace />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;