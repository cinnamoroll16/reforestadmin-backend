import { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  Divider
} from '@mui/material';
import {
  Email as EmailIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  Nature as NatureIcon  // Changed from EcoIcon to NatureIcon
} from '@mui/icons-material';

function Login({ onLogin, onSwitchToRegister, onSwitchToForgotPassword }) {
  const [credentials, setCredentials] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (!credentials.email || !credentials.password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(credentials.email)) {
      setError('Please enter a valid email address');
      setLoading(false);
      return;
    }

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      if (credentials.password.length >= 6) {
        onLogin({
          email: credentials.email,
          name: 'Admin User'
        });
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          py: 4
        }}
      >
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <NatureIcon sx={{ fontSize: 40, color: '#2e7d32', mb: 1 }} /> {/* Changed to NatureIcon */}
          <Typography 
            component="h1" 
            variant="h4" 
            sx={{ 
              fontWeight: 'bold',
              color: '#2e7d32',
              letterSpacing: 1
            }}
          >
            REFOREST
          </Typography>
        </Box>

        <Paper elevation={0} sx={{ 
          padding: 4, 
          width: '100%',
          border: '1px solid #e0e0e0',
          borderRadius: 2
        }}>
          {/* Title */}
          <Typography 
            component="h2" 
            variant="h5" 
            align="center" 
            gutterBottom
            sx={{ 
              fontWeight: 600,
              mb: 1
            }}
          >
            Login
          </Typography>

          {/* Subtitle */}
          <Typography 
            variant="body2" 
            align="center" 
            sx={{ 
              mb: 3,
              color: 'text.secondary'
            }}
          >
            Sign in to continue
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            {/* Email Field */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="EMAIL"
              name="email"
              autoComplete="email"
              autoFocus
              value={credentials.email}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 2,
                '& .MuiInputLabel-root': {
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }
              }}
            />

            {/* Password Field */}
            <TextField
              required
              fullWidth
              name="password"
              label="PASSWORD"
              type={showPassword ? 'text' : 'password'}
              id="password"
              autoComplete="current-password"
              value={credentials.password}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{
                mb: 1,
                '& .MuiInputLabel-root': {
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }
              }}
            />

            {/* Forgot Password Link */}
            <Box sx={{ textAlign: 'right', mb: 2 }}>
              <Button 
                variant="text" 
                size="small"
                onClick={onSwitchToForgotPassword}
                sx={{ 
                  color: 'text.secondary',
                  fontWeight: 500,
                  textTransform: 'none',
                  fontSize: '0.875rem',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    textDecoration: 'underline'
                  }
                }}
              >
                Forgot Password?
              </Button>
            </Box>

            {/* Login Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 1,
                mb: 3,
                py: 1.5,
                backgroundColor: '#2e7d32',
                '&:hover': {
                  backgroundColor: '#1b5e20'
                },
                fontWeight: 600,
                fontSize: '1rem'
              }}
            >
              Login
            </Button>

            <Divider sx={{ mb: 3 }}>or</Divider>

            {/* Register Link */}
            <Typography 
              variant="body2" 
              align="center" 
              sx={{ 
                color: 'text.secondary'
              }}
            >
              Don't have an account?{' '}
              <Button 
                variant="text" 
                size="small"
                onClick={onSwitchToRegister}
                sx={{ 
                  color: '#2e7d32',
                  fontWeight: 500,
                  textTransform: 'none',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    textDecoration: 'underline'
                  }
                }}
              >
                Create new Account
              </Button>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Login;