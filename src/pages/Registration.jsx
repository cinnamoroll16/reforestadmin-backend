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

// ✅ Import LegalDocumentsCard
import LegalDocumentsCard from '../components/LegalDocumentsCard';

// ✅ Firebase imports
import { auth, firestore } from '../firebase.js';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

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

  // ✅ State for legal documents modal
  const [legalDocOpen, setLegalDocOpen] = useState(false);
  const [docType, setDocType] = useState(''); // 'terms' or 'privacy'

  // ✅ Handlers for opening legal documents
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
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.firstName.trim()) errors.firstName = 'First name is required';
    if (!formData.lastName.trim()) errors.lastName = 'Last name is required';
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
    }
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.role) errors.role = 'Please select a role';
    if (!acceptedTerms) errors.terms = 'You must accept the terms and conditions';
    return errors;
  };

  const getRoleRef = (roleValue) => {
    const roleMapping = {
      'admin': '/roles/admin',
      'officer': '/roles/officer', 
      'stakeholder': '/roles/stakeholder'
    };
    return roleMapping[roleValue] || `/roles/${roleValue}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    const validationErrors = validateForm();

    if (Object.keys(validationErrors).length === 0) {
      setLoading(true);

      try {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          formData.email,
          formData.password
        );
        const user = userCredential.user;

        const fullName = `${formData.firstName} ${formData.lastName}`;
        await updateProfile(user, {
          displayName: fullName,
        });

        await setDoc(doc(firestore, 'users', user.uid), {
          user_lastname: formData.lastName.trim(),
          user_firstname: formData.firstName.trim(),
          user_email: formData.email.toLowerCase().trim(),
          roleRef: getRoleRef(formData.role),
          user_password: "hashed_password",
          createdAt: new Date(),
          status: 'active',
          uid: user.uid
        });

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

        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } catch (err) {
        console.error('Registration error:', err);
        setServerError(err.message);
      }

      setLoading(false);
    } else {
      setErrors(validationErrors);
    }
  };

  const roleOptions = [
    { value: 'admin', label: 'Admin', description: 'Handles system management, user monitoring, and data operations', icon: <Nature sx={{ fontSize: 20, color: '#2e7d32' }} /> },
    { value: 'officer', label: 'DENR Officer', description: 'Monitor and verify plantations', icon: <Security sx={{ fontSize: 20, color: '#2e7d32' }} /> },
    { value: 'stakeholder', label: 'Stakeholder', description: 'Support and fund initiatives', icon: <Business sx={{ fontSize: 20, color: '#2e7d32' }} /> }
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
                Account created successfully! You can now log in.
              </Alert>
            )}

            {serverError && (
              <Alert severity="error" sx={{ mb: 2, width: '100%', borderRadius: 1 }}>
                {serverError}
              </Alert>
            )}

            {/* Form */}
            <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
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

              {/* ✅ Updated Terms section with click handlers */}
              <FormControlLabel
                sx={{ mb: 2, alignItems: 'flex-start' }}
                control={
                  <Checkbox
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    color="primary"
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
                <Typography variant="caption" color="error" display="block" sx={{ mb: 2 }}>
                  {errors.terms}
                </Typography>
              )}

              {/* Submit */}
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
                }}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Already have an account?{' '}
                  <Link component={RouterLink} to="/login" sx={{ color: '#2e7d32', textDecoration: 'none', fontWeight: 600, '&:hover': { textDecoration: 'underline' } }}>
                    Sign in
                  </Link>
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ✅ Add LegalDocumentsCard component */}
      <LegalDocumentsCard 
        open={legalDocOpen}
        onClose={handleCloseLegalDoc}
        documentType={docType}
      />
    </Box>
  );
};

export default Registration;