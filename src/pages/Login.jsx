// src/pages/Login.jsx - SIMPLIFIED VERSION
import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  Link,
  Alert,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { Visibility, VisibilityOff, Email, Lock } from '@mui/icons-material';
import { Link as RouterLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, error, loading, setError } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Check for success message from registration
  useEffect(() => {
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
    }
  }, [location.state]);

  useEffect(() => {
    if (user) {
      console.log('✅ User authenticated, redirecting to dashboard');
      navigate('/dashboard');
    }
    setError('');
  }, [user, navigate, setError]);

  const handleChange = (e) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
    if (error) setError('');
    if (successMessage) setSuccessMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // ✅ Use the AuthContext login function directly
    const result = await login(formData.email, formData.password);
    
    if (result.success) {
      console.log('✅ Login successful via AuthContext');
      // The useEffect above will handle navigation when user state updates
    } else {
      console.error('❌ Login failed:', result.error);
    }
  };

  return (
    <Box
      sx={{ 
        minHeight: '100vh', 
        display: 'flex',
        width: '100%',
        margin: 0,
        padding: 0,
      }}
    >
      <Grid container sx={{ flex: 1, minHeight: '100vh', margin: 0 }}>
        {/* Left Panel (Login Form) */}
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: '#f8f9fa',
            p: { xs: 3, md: 6 },
            minHeight: '100vh',
          }}
        >
          <Paper
            elevation={3}
            sx={{
              width: '100%',
              maxWidth: 450,
              p: { xs: 4, md: 5 },
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              borderRadius: 3,
              bgcolor: '#ffffff',
            }}
          >
            <Typography variant="h4" fontWeight="600" align="center" gutterBottom>
              Welcome Back
            </Typography>
            <Typography align="center" color="text.secondary" sx={{ mb: 4 }}>
              Sign in to your account
            </Typography>

            {successMessage && (
              <Alert severity="success" sx={{ mb: 3, width: '100%' }}>
                {successMessage}
              </Alert>
            )}

            {error && (
              <Alert severity="error" sx={{ mb: 3, width: '100%' }}>
                {error}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              <TextField
                fullWidth
                required
                label="Email Address"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Email /></InputAdornment>,
                }}
                sx={{ mb: 3 }}
              />

              <TextField
                fullWidth
                required
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                disabled={loading}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Lock /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
              />

              <Box sx={{ textAlign: 'right', mb: 3 }}>
                <Link component={RouterLink} to="/forgotpassword" variant="body2">
                  Forgot your password?
                </Link>
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  backgroundColor: '#2e7d32',
                  py: 1.5,
                  '&:hover': { backgroundColor: '#1b5e20' },
                }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Don't have an account?{' '}
                  <Link component={RouterLink} to="/register" fontWeight="600">
                    Sign up
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Right Panel (Background Image) */}
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            position: 'relative',
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            overflow: 'hidden',
            width: '100%', // Fixed from '500%' to '100%'
            flex: 1,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: 'url(/images/loginImage.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                zIndex: 1,
              }
            }}
          />
          
          <Box
            sx={{
              position: 'relative',
              zIndex: 2,
              color: '#fff',
              textAlign: 'center',
              p: 4,
            }}
          >
            <Typography
              variant="h2"
              fontWeight="700"
              sx={{ 
                textShadow: '3px 3px 8px rgba(0,0,0,0.7)',
                mb: 2,
                fontSize: { xs: '2.5rem', md: '3.5rem' }
              }}
            >
              REFOREST
            </Typography>
            <Typography
              variant="h5"
              sx={{ 
                textShadow: '2px 2px 6px rgba(0,0,0,0.7)',
                opacity: 0.9,
                fontWeight: 400,
                maxWidth: 400,
                mx: 'auto'
              }}
            >
              Join us in restoring our planet, one tree at a time
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Login;