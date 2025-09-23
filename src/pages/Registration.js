// src/pages/Registration.js - Fixed version with no double password icons
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Grid,
  FormControlLabel,
  Checkbox,
  Link,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  InputAdornment,
  CircularProgress,
  Chip,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  AccountCircle,
  Email,
  Lock,
  Nature,
  Security,
  Business,
  CheckCircle,
  Warning,
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

const Registration = () => {
  const navigate = useNavigate();
  const { 
    register, 
    validateEmail, 
    loading: authLoading, 
    error: authError, 
    setError: clearAuthError,
    user 
  } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  // Email validation states
  const [emailValidation, setEmailValidation] = useState({
    isValidating: false,
    isValid: null,
    isDisposable: false,
    emailExists: false,
    suggestion: null
  });

  // Redirect if user is already logged in
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Clear auth errors when component mounts
  useEffect(() => {
    clearAuthError();
  }, [clearAuthError]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear field errors
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }

    // Real-time email validation
    if (name === 'email' && value.trim()) {
      debounceEmailValidation(value.trim());
    }
  };

  // Debounce email validation
  const debounceEmailValidation = (() => {
    let timeoutId;
    return (email) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        validateEmailReal(email);
      }, 500);
    };
  })();

  const validateEmailReal = async (email) => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setEmailValidation({ 
        isValidating: false, 
        isValid: false, 
        isDisposable: false, 
        emailExists: false,
        suggestion: null 
      });
      return;
    }

    setEmailValidation(prev => ({ ...prev, isValidating: true }));

    try {
      const validation = await validateEmail(email);
      setEmailValidation({
        isValidating: false,
        isValid: validation.isValid,
        isDisposable: validation.isDisposable,
        emailExists: validation.emailExists,
        suggestion: validation.suggestion
      });
    } catch (error) {
      console.error('Email validation error:', error);
      setEmailValidation({
        isValidating: false,
        isValid: null,
        isDisposable: false,
        emailExists: false,
        suggestion: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    } else if (emailValidation.emailExists) {
      newErrors.email = 'This email is already registered';
    } else if (emailValidation.isDisposable) {
      newErrors.email = 'Please use a permanent email address';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      newErrors.password = 'Password must contain uppercase, lowercase, and number';
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = 'Please select a role';
    }

    // Terms validation
    if (!acceptedTerms) {
      newErrors.terms = 'You must accept the terms and conditions';
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Clear previous auth errors
    clearAuthError();
    
    // Wait for email validation to complete
    if (emailValidation.isValidating) {
      setErrors({ email: 'Please wait for email validation to complete' });
      return;
    }

    const validationErrors = validateForm();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length === 0) {
      try {
        const result = await register(formData);
        
        if (result.success) {
          setSubmitted(true);
          // Reset form
          setFormData({ name: '', email: '', password: '', confirmPassword: '', role: '' });
          setAcceptedTerms(false);
        } else {
          // Error will be handled by AuthContext and displayed via authError
        }
      } catch (error) {
        console.error('Registration error:', error);
      }
    }
  };

  const roleOptions = [
    { 
      value: 'planter', 
      label: 'Planter', 
      description: 'Plant trees and track progress', 
      icon: <Nature sx={{ fontSize: 20, color: '#2e7d32' }} /> 
    },
    { 
      value: 'officer', 
      label: 'DENR Officer', 
      description: 'Monitor and verify plantations', 
      icon: <Security sx={{ fontSize: 20, color: '#2e7d32' }} /> 
    },
    { 
      value: 'stakeholder', 
      label: 'Stakeholder', 
      description: 'Support and fund initiatives', 
      icon: <Business sx={{ fontSize: 20, color: '#2e7d32' }} /> 
    }
  ];

  // Success state - show email verification message
  if (submitted) {
    return (
      <Box sx={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        bgcolor: '#f8f9fa', 
        p: 3 
      }}>
        <Paper elevation={3} sx={{ maxWidth: 500, p: 4, textAlign: 'center', borderRadius: 3 }}>
          <CheckCircle sx={{ fontSize: 80, color: '#2e7d32', mb: 2 }} />
          <Typography variant="h4" fontWeight="600" gutterBottom>
            Check Your Email
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, lineHeight: 1.6 }}>
            We've sent a verification link to <strong>{formData.email}</strong>.
            Please click the link in your email to activate your account.
          </Typography>
          <Alert severity="info" sx={{ mb: 3 }}>
            You must verify your email before you can log in. Check your spam folder if you don't see the email.
          </Alert>
          <Button
            variant="contained"
            onClick={() => navigate('/login')}
            sx={{
              backgroundColor: '#2e7d32',
              '&:hover': { backgroundColor: '#1b5e20' },
              px: 4,
              py: 1.5,
              borderRadius: 1.5,
              textTransform: 'none',
            }}
          >
            Go to Login
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', width: '100%', m: 0, p: 0, overflow: 'hidden' }}>
      <Grid container sx={{ flex: 1, minHeight: '100vh', m: 0, width: '100%' }}>
        {/* Left Panel - Background Image */}
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
              top: 0, left: 0, right: 0, bottom: 0,
              backgroundImage: 'url(/images/loginImage.png)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.4)',
                zIndex: 1,
              }
            }}
          />
          <Box sx={{ position: 'relative', zIndex: 2, color: '#fff', textAlign: 'center', p: 4 }}>
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
              Start your journey to restore our planet
            </Typography>
          </Box>
        </Grid>

        {/* Right Panel - Registration Form */}
        <Grid
          item
          xs={12}
          md={6}
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            bgcolor: '#f8f9fa',
            p: { xs: 2, md: 3 },
            minHeight: '100vh',
          }}
        >
          <Paper
            elevation={3}
            sx={{
              width: '100%',
              maxWidth: 450,
              p: { xs: 2.5, md: 3 },
              borderRadius: 3,
              bgcolor: '#ffffff',
              mx: 'auto',
            }}
          >
            <Typography 
              variant="h4" 
              fontWeight="600" 
              align="center" 
              gutterBottom
              sx={{ color: '#1a1a1a', mb: 1 }}
            >
              Join ReForest
            </Typography>
            <Typography
              variant="body1"
              align="center"
              color="text.secondary"
              sx={{ mb: 3 }}
            >
              Create your account to start making a difference
            </Typography>

            {/* Error Alert */}
            {authError && (
              <Alert severity="error" sx={{ mb: 2, width: '100%', borderRadius: 1 }}>
                {authError}
              </Alert>
            )}

            {/* Registration Form */}
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
              {/* Name Field */}
              <TextField
                fullWidth
                required
                id="name"
                label="Full Name"
                name="name"
                autoComplete="name"
                value={formData.name}
                onChange={handleChange}
                error={!!errors.name}
                helperText={errors.name}
                disabled={authLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AccountCircle fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />

              {/* Email Field with Real-time Validation */}
              <TextField
                fullWidth
                required
                id="email"
                label="Email Address"
                name="email"
                type="email"
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                error={!!errors.email || emailValidation.isDisposable || emailValidation.emailExists}
                helperText={
                  errors.email || 
                  (emailValidation.isDisposable && 'Please use a permanent email address') ||
                  (emailValidation.emailExists && 'This email is already registered') ||
                  (emailValidation.suggestion && emailValidation.suggestion)
                }
                disabled={authLoading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      {emailValidation.isValidating && <CircularProgress size={20} />}
                      {emailValidation.isValid === true && <CheckCircle fontSize="small" color="success" />}
                      {(emailValidation.isDisposable || emailValidation.emailExists) && 
                        <Warning fontSize="small" color="error" />}
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />

              {/* Email Validation Chips */}
              {formData.email && (
                <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {emailValidation.isDisposable && (
                    <Chip 
                      label="Disposable Email Detected" 
                      color="error" 
                      size="small" 
                      variant="outlined" 
                    />
                  )}
                  {emailValidation.emailExists && (
                    <Chip 
                      label="Email Already Registered" 
                      color="error" 
                      size="small" 
                      variant="outlined" 
                    />
                  )}
                  {emailValidation.isValid === true && (
                    <Chip 
                      label="Valid Email" 
                      color="success" 
                      size="small" 
                      variant="outlined" 
                    />
                  )}
                </Box>
              )}

              {/* Password Field - FIXED: No more double eye icons */}
              <TextField
                fullWidth
                required
                name="password"
                label="Password"
                type={showPassword ? 'text' : 'password'}
                id="password"
                autoComplete="new-password"
                value={formData.password}
                onChange={handleChange}
                error={!!errors.password}
                helperText={errors.password || 'Must contain uppercase, lowercase, and number'}
                disabled={authLoading}
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
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                        disabled={authLoading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  mb: 2, 
                  '& .MuiOutlinedInput-root': { borderRadius: 1.5 },
                  // Hide browser's native password toggles
                  '& input[type="password"]::-ms-reveal': {
                    display: 'none',
                  },
                  '& input[type="password"]::-webkit-credentials-auto-fill-button': {
                    display: 'none',
                  },
                  '& input[type="password"]::-webkit-strong-password-auto-fill-button': {
                    display: 'none',
                  }
                }}
              />

              {/* Confirm Password Field - FIXED: No more double eye icons */}
              <TextField
                fullWidth
                required
                name="confirmPassword"
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                error={!!errors.confirmPassword}
                helperText={errors.confirmPassword}
                disabled={authLoading}
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
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                        disabled={authLoading}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ 
                  mb: 2, 
                  '& .MuiOutlinedInput-root': { borderRadius: 1.5 },
                  // Hide browser's native password toggles
                  '& input[type="password"]::-ms-reveal': {
                    display: 'none',
                  },
                  '& input[type="password"]::-webkit-credentials-auto-fill-button': {
                    display: 'none',
                  },
                  '& input[type="password"]::-webkit-strong-password-auto-fill-button': {
                    display: 'none',
                  }
                }}
              />

              {/* Role Selection */}
              <FormControl fullWidth error={!!errors.role} sx={{ mb: 2 }}>
                <InputLabel id="role-label">Select Your Role</InputLabel>
                <Select
                  labelId="role-label"
                  name="role"
                  value={formData.role}
                  label="Select Your Role"
                  onChange={handleChange}
                  disabled={authLoading}
                >
                  {roleOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                        {option.icon}
                        <Box sx={{ ml: 2 }}>
                          <Typography variant="body2" fontWeight={600}>
                            {option.label}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {option.description}
                          </Typography>
                        </Box>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                {errors.role && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5 }}>
                    {errors.role}
                  </Typography>
                )}
              </FormControl>

              {/* Terms and Conditions */}
              <FormControlLabel
                sx={{ mb: 2, alignItems: 'flex-start' }}
                control={
                  <Checkbox
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    color="primary"
                    disabled={authLoading}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    I agree to the{' '}
                    <Link href="#" sx={{ color: '#2e7d32', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="#" sx={{ color: '#2e7d32', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                      Privacy Policy
                    </Link>
                  </Typography>
                }
              />
              {errors.terms && (
                <Typography variant="caption" color="error" display="block" sx={{ mb: 2 }}>
                  {errors.terms}
                </Typography>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={
                  authLoading || 
                  emailValidation.isValidating || 
                  emailValidation.isDisposable || 
                  emailValidation.emailExists
                }
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
                  '&:hover': { backgroundColor: '#1b5e20', boxShadow: 4 },
                }}
              >
                {authLoading ? (
                  <>
                    <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>

              {/* Sign In Link */}
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Link 
                    component={RouterLink} 
                    to="/login" 
                    sx={{ 
                      color: '#2e7d32', 
                      textDecoration: 'none', 
                      fontWeight: 600, 
                      '&:hover': { textDecoration: 'underline' } 
                    }}
                  >
                    Sign in
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Registration;