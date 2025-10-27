// src/pages/Registration.js
import React, { useState } from 'react';
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
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  AccountCircle,
  Email,
  Lock,
  Nature,
  Security,
  Business
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';
import LegalDocumentsCard from '../components/LegalDocumentsCard';

// Backend API URL - update this to match your backend
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const Registration = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
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
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  // State for legal documents modal
  const [legalDocOpen, setLegalDocOpen] = useState(false);
  const [docType, setDocType] = useState('');

  // Handlers for opening legal documents
  const handleOpenTerms = (e) => {
    e.preventDefault();
    setDocType('terms');
    setLegalDocOpen(true);
  };

  const handleOpenPrivacy = (e) => {
    e.preventDefault();
    setDocType('privacy');
    setLegalDocOpen(true);
  };

  const handleCloseLegalDoc = () => {
    setLegalDocOpen(false);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((s) => ({ ...s, [name]: value }));
    if (errors[name]) setErrors((s) => ({ ...s, [name]: '' }));
    if (serverError) setServerError('');
  };

  const validateForm = () => {
    const errors = {};
    
    // First name validation
    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    } else if (formData.firstName.trim().length < 2) {
      errors.firstName = 'First name must be at least 2 characters';
    }
    
    // Last name validation
    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    } else if (formData.lastName.trim().length < 2) {
      errors.lastName = 'Last name must be at least 2 characters';
    }
    
    // Email validation
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    // Password validation
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    } else if (!/(?=.*[a-z])/.test(formData.password)) {
      errors.password = 'Password must contain at least one lowercase letter';
    } else if (!/(?=.*[A-Z])/.test(formData.password)) {
      errors.password = 'Password must contain at least one uppercase letter';
    } else if (!/(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain at least one number';
    }
    
    // Confirm password validation
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    // Role validation
    if (!formData.role) {
      errors.role = 'Please select a role';
    }
    
    // Terms validation
    if (!acceptedTerms) {
      errors.terms = 'You must accept the terms and conditions to continue';
    }
    
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    
    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length === 0) {
      setLoading(true);

      try {
        // Call backend API for registration - UPDATED TO MATCH BACKEND
        const response = await fetch(`${API_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: formData.email.toLowerCase().trim(),
            password: formData.password,
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            role: formData.role,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Handle error from backend
          throw new Error(data.error || data.message || 'Registration failed');
        }

        // Registration successful
        console.log('Registration successful:', data);
        
        setSubmitted(true);
        setFormData({ 
          firstName: '', 
          lastName: '', 
          email: '', 
          password: '', 
          confirmPassword: '', 
          role: '' 
        });
        setAcceptedTerms(false);

        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login', { 
            state: { 
              message: 'Registration successful! Please log in with your credentials.',
              email: formData.email 
            } 
          });
        }, 2000);

      } catch (err) {
        console.error('Registration error:', err);
        
        // Handle specific error messages from your backend
        let errorMessage = err.message;
        
        if (errorMessage.includes('email-already-exists') || errorMessage.includes('already exists')) {
          errorMessage = 'An account with this email already exists. Please use a different email or try logging in.';
        } else if (errorMessage.includes('invalid-email')) {
          errorMessage = 'The email address is invalid. Please check and try again.';
        } else if (errorMessage.includes('weak-password')) {
          errorMessage = 'The password is too weak. Please use a stronger password.';
        } else if (errorMessage.includes('network') || errorMessage.includes('Failed to fetch')) {
          errorMessage = 'Cannot connect to server. Please check your internet connection and try again.';
        } else if (errorMessage.includes('Firebase configuration')) {
          errorMessage = 'Server configuration error. Please contact support.';
        } else if (!errorMessage || errorMessage === 'Registration failed') {
          errorMessage = 'Registration failed. Please try again later.';
        }
        
        setServerError(errorMessage);
      } finally {
        setLoading(false);
      }
    } else {
      setErrors(validationErrors);
    }
  };

  // UPDATED ROLE OPTIONS TO MATCH BACKEND EXPECTATIONS
  const roleOptions = [
    { 
      value: 'admin', 
      label: 'Admin', 
      description: 'System management and operations', 
      icon: <Nature sx={{ fontSize: 20, color: '#2e7d32' }} /> 
    },
    { 
      value: 'officer', 
      label: 'Officer', 
      description: 'Monitor and verify plantation activities', 
      icon: <Security sx={{ fontSize: 20, color: '#2e7d32' }} /> 
    },
    { 
      value: 'user', 
      label: 'User', 
      description: 'Regular user access', 
      icon: <Business sx={{ fontSize: 20, color: '#2e7d32' }} /> 
    },
  ];

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', width: '100%', m: 0, p: 0 }}>
      <Grid container sx={{ flex: 1, minHeight: '100vh', m: 0 }}>
        {/* Left Panel */}
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
            width: '100%',
            flex: 1,
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

        {/* Right Panel */}
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
            width: '100%',
            flex: 1,
          }}
        >
          <Paper
            elevation={3}
            sx={{
              width: '100%',
              maxWidth: 450,
              p: { xs: 2.5, md: 3 },
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

            {submitted && (
              <Alert severity="success" sx={{ mb: 2, width: '100%', borderRadius: 1 }}>
                Account created successfully! Redirecting to login...
              </Alert>
            )}

            {serverError && (
              <Alert severity="error" sx={{ mb: 2, width: '100%', borderRadius: 1 }}>
                {serverError}
              </Alert>
            )}

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }} noValidate>
              {/* First Name and Last Name Row */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    required
                    id="firstName"
                    label="First Name"
                    name="firstName"
                    autoComplete="given-name"
                    value={formData.firstName}
                    onChange={handleChange}
                    error={!!errors.firstName}
                    helperText={errors.firstName}
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccountCircle fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    required
                    id="lastName"
                    label="Last Name"
                    name="lastName"
                    autoComplete="family-name"
                    value={formData.lastName}
                    onChange={handleChange}
                    error={!!errors.lastName}
                    helperText={errors.lastName}
                    disabled={loading}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <AccountCircle fontSize="small" color="action" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
                  />
                </Grid>
              </Grid>

              {/* Email */}
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
                error={!!errors.email}
                helperText={errors.email}
                disabled={loading}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email fontSize="small" color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />

              {/* Password */}
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
                helperText={errors.password}
                disabled={loading}
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
                        disabled={loading}
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
              />

              {/* Confirm Password */}
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
                disabled={loading}
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
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        edge="end"
                        aria-label="toggle confirm password visibility"
                        disabled={loading}
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 1.5 } }}
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
                  disabled={loading}
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
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
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
                    onChange={(e) => {
                      setAcceptedTerms(e.target.checked);
                      if (errors.terms) {
                        setErrors(prev => ({ ...prev, terms: '' }));
                      }
                    }}
                    color="primary"
                    disabled={loading}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    I agree to the{' '}
                    <Link 
                      href="#" 
                      onClick={handleOpenTerms}
                      sx={{ 
                        color: '#2e7d32', 
                        textDecoration: 'none', 
                        fontWeight: 600,
                        '&:hover': { textDecoration: 'underline' } 
                      }}
                    >
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link 
                      href="#" 
                      onClick={handleOpenPrivacy}
                      sx={{ 
                        color: '#2e7d32', 
                        textDecoration: 'none', 
                        fontWeight: 600,
                        '&:hover': { textDecoration: 'underline' } 
                      }}
                    >
                      Privacy Policy
                    </Link>
                  </Typography>
                }
              />
              {errors.terms && (
                <Typography variant="caption" color="error" display="block" sx={{ mb: 2, ml: 1.5 }}>
                  {errors.terms}
                </Typography>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                sx={{
                  backgroundColor: '#2e7d32',
                  '&:hover': { backgroundColor: '#1b5e20' },
                  '&:disabled': { backgroundColor: '#a5d6a7', color: '#fff' },
                  py: 1.5,
                  borderRadius: 1.5,
                  textTransform: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  boxShadow: 2,
                }}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>

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

      {/* Legal Documents Modal */}
      <LegalDocumentsCard 
        open={legalDocOpen}
        onClose={handleCloseLegalDoc}
        documentType={docType}
      />
    </Box>
  );
};

export default Registration;