// src/pages/Login.js
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
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

const Login = () => {
  const navigate = useNavigate();
  const { login, user, error, setError } = useAuth();

  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/dashboard');
    setError('');
  }, [user, navigate, setError]);

  const handleChange = (e) => {
    setFormData((s) => ({ ...s, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError(''); // Clear previous errors
  
  const result = await login(formData.email, formData.password);
  
  if (result.success) {
    navigate('/dashboard');
  } else {
    setError(result.error);
  }
  
  setLoading(false);
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
            margin: 0,
            width: '100%',
            flex: 1,
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
              margin: 0,
            }}
          >
            <Typography 
              variant="h4" 
              fontWeight="600" 
              align="center" 
              gutterBottom
              sx={{ color: '#1a1a1a', mb: 1 }}
            >
              Welcome Back
            </Typography>
            <Typography
              variant="body1"
              align="center"
              color="text.secondary"
              sx={{ mb: 4 }}
            >
              Sign in to your account
            </Typography>

            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3, 
                  width: '100%',
                  borderRadius: 1
                }}
              >
                {error}
              </Alert>
            )}

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ width: '100%' }}
            >
              <TextField
                fullWidth
                required
                id="email"
                label="Email Address"
                name="email"
                type="email"
                autoComplete="email"
                autoFocus
                value={formData.email}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  mb: 3,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                  }
                }}
              />

              <TextField
                fullWidth
                required
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="current-password"
                value={formData.password}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowPassword((s) => !s)}
                        edge="end"
                        aria-label="toggle password visibility"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 1.5,
                  }
                }}
              />

              <Box sx={{ textAlign: 'right', mb: 3 }}>
                <Link 
                  component={RouterLink} 
                  to="/forgotpassword" 
                  variant="body2"
                  sx={{ 
                    color: '#2e7d32',
                    textDecoration: 'none',
                    '&:hover': {
                      textDecoration: 'underline'
                    }
                  }}
                >
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
                  '&:hover': { backgroundColor: '#1b5e20' },
                  '&:disabled': { backgroundColor: '#a5d6a7' },
                  py: 1.5,
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  boxShadow: 2,
                  '&:hover': {
                    backgroundColor: '#1b5e20',
                    boxShadow: 4,
                  }
                }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Don't have an account?{' '}
                  <Link 
                    component={RouterLink} 
                    to="/register"
                    sx={{ 
                      color: '#2e7d32',
                      textDecoration: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
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
            width: '500%',
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