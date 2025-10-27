// src/pages/ForgotPassword.jsx - Updated to use Backend API
import React, { useState } from 'react';
import {
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  Link,
  Alert,
  InputAdornment,
  CircularProgress,
  Fade,
  alpha,
} from '@mui/material';
import { Email, CheckCircle, ArrowBack } from '@mui/icons-material';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();
  
  const [formData, setFormData] = useState({ email: '' });
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');

  // Email validation function
  const validateEmailFormat = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear errors when user types
    if (error) setError('');
    if (fieldError) setFieldError('');
  };

  const validateForm = () => {
    // Check if email is provided
    if (!formData.email.trim()) {
      setFieldError('Email address is required');
      return false;
    }

    // Check email format
    if (!validateEmailFormat(formData.email)) {
      setFieldError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous errors
    setError('');
    setFieldError('');
    
    // Validate form
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      console.log('📧 Sending password reset email to:', formData.email);
      
      // Call API using the auth context
      const result = await forgotPassword(formData.email);
      
      if (result.success) {
        console.log('✅ Password reset email sent successfully');
        setSuccess(true);
        
        // Auto redirect after 8 seconds
        setTimeout(() => {
          navigate('/login');
        }, 8000);
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('❌ Forgot password error:', err);
      
      let errorMessage = 'Failed to send reset email. Please try again.';
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      // Check for specific errors
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    navigate('/login');
  };

  const handleResendEmail = async () => {
    // Clear errors
    setError('');
    setFieldError('');
    
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Resending password reset email to:', formData.email);
      
      const result = await forgotPassword(formData.email);
      
      if (result.success) {
        console.log('✅ Password reset email resent successfully');
        setError(''); // Clear any errors
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      console.error('❌ Resend error:', err);
      
      let errorMessage = 'Failed to resend email. Please try again.';
      
      if (err.message) {
        errorMessage = err.message;
      }
      
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
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
            <Fade in={success}>
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
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: '50%',
                    bgcolor: '#e8f5e9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                  }}
                >
                  <CheckCircle sx={{ fontSize: 40, color: '#2e7d32' }} />
                </Box>

                <Typography 
                  variant="h4" 
                  fontWeight="600" 
                  align="center" 
                  gutterBottom
                  sx={{ color: '#1a1a1a', mb: 2 }}
                >
                  Check Your Email
                </Typography>

                <Typography
                  variant="body1"
                  align="center"
                  color="text.secondary"
                  sx={{ mb: 3, lineHeight: 1.6 }}
                >
                  We've sent password reset instructions to{' '}
                  <strong>{formData.email}</strong>
                </Typography>

                <Alert 
                  severity="info" 
                  sx={{ 
                    mb: 3, 
                    width: '100%',
                    borderRadius: 2,
                  }}
                >
                  If you don't see the email, check your spam folder.
                </Alert>

                {/* Error Alert for Resend */}
                {error && (
                  <Alert 
                    severity="error" 
                    sx={{ 
                      mb: 3, 
                      width: '100%',
                      borderRadius: 2
                    }}
                  >
                    {error}
                  </Alert>
                )}

                {/* Resend Email Button */}
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleResendEmail}
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    mb: 2,
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontSize: '16px',
                    fontWeight: 600,
                    borderColor: '#2e7d32',
                    color: '#2e7d32',
                    '&:hover': {
                      borderColor: '#1b5e20',
                      bgcolor: alpha('#2e7d32', 0.04),
                    },
                    '&:disabled': {
                      borderColor: '#a5d6a7',
                      color: '#a5d6a7',
                    }
                  }}
                >
                  {loading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    'Resend Email'
                  )}
                </Button>

                {/* Back to Login Button */}
                <Button
                  fullWidth
                  variant="text"
                  startIcon={<ArrowBack />}
                  onClick={handleBackToLogin}
                  sx={{
                    py: 1.5,
                    borderRadius: 1.5,
                    textTransform: 'none',
                    fontSize: '16px',
                    fontWeight: 600,
                    color: '#666',
                    '&:hover': {
                      bgcolor: alpha('#2e7d32', 0.04),
                    }
                  }}
                >
                  Back to Sign In
                </Button>

                <Typography 
                  variant="caption" 
                  color="text.secondary" 
                  align="center"
                  sx={{ mt: 2 }}
                >
                  Redirecting to login in 8 seconds...
                </Typography>
              </Paper>
            </Fade>
          </Grid>

          {/* Right Panel */}
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
  }

  // Form state
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
            <Typography 
              variant="h4" 
              fontWeight="600" 
              align="center" 
              gutterBottom
              sx={{ color: '#1a1a1a', mb: 1 }}
            >
              Reset Password
            </Typography>
            <Typography
              variant="body1"
              align="center"
              color="text.secondary"
              sx={{ mb: 4 }}
            >
              Enter your email address and we'll send you instructions to reset your password.
            </Typography>

            {/* Error Alerts */}
            {error && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3, 
                  width: '100%',
                  borderRadius: 2
                }}
              >
                {error}
              </Alert>
            )}

            {fieldError && (
              <Alert 
                severity="error" 
                sx={{ 
                  mb: 3, 
                  width: '100%',
                  borderRadius: 2
                }}
              >
                {fieldError}
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
                disabled={loading}
                error={!!fieldError || !!error}
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

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading || !formData.email.trim()}
                sx={{
                  backgroundColor: '#2e7d32',
                  '&:hover': { 
                    backgroundColor: '#1b5e20',
                    boxShadow: 4,
                  },
                  '&:disabled': { backgroundColor: '#a5d6a7' },
                  py: 1.5,
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  boxShadow: 2,
                }}
              >
                {loading ? (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                    Sending Reset Email...
                  </Box>
                ) : (
                  'Send Reset Email'
                )}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Remember your password?{' '}
                  <Link 
                    component={RouterLink} 
                    to="/login"
                    sx={{ 
                      color: '#2e7d32',
                      textDecoration: 'none',
                      fontWeight: 600,
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    Back to Sign In
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>

        {/* Right Panel */}
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

export default ForgotPassword;