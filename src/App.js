import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, useMediaQuery } from '@mui/material';
import theme from './theme/theme';
import ReForestAppBar from './components/AppBar';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [authView, setAuthView] = useState('login'); // 'login', 'register', 'forgot', 'reset'
  const [resetToken, setResetToken] = useState(null);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogin = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    setAuthView('login');
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

  const switchToResetPassword = (token) => {
    setResetToken(token);
    setAuthView('reset');
  };

  // In a real app, this would be triggered by a link in the email
  // For demo purposes, we'll simulate it
  const simulateEmailLink = () => {
    switchToResetPassword('demo-reset-token-12345');
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
        ) : authView === 'register' ? (
          <Register onRegister={handleLogin} onSwitchToLogin={switchToLogin} />
        ) : authView === 'forgot' ? (
          <ForgotPassword 
            onSwitchToLogin={switchToLogin} 
            onSuccess={simulateEmailLink} 
          />
        ) : authView === 'reset' ? (
          <ResetPassword 
            onSwitchToLogin={switchToLogin} 
            token={resetToken} 
          />
        ) : null}
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
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
        <Dashboard />
      </Box>
    </ThemeProvider>
  );
}

export default App;