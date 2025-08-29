import { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  IconButton,
  Divider
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Person as PersonIcon,
  Email as EmailIcon,
  Lock as LockIcon,
  Nature as NatureIcon  // Changed from EcoIcon to NatureIcon
} from '@mui/icons-material';

function Register({ onSwitchToLogin }) {
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const roles = [
    { value: 'planter', label: 'Planter' },
    { value: 'denr_officer', label: 'DENR Officer' },
    { value: 'nursery_manager', label: 'Nursery Manager' },
    { value: 'researcher', label: 'Researcher' },
    { value: 'volunteer', label: 'Volunteer' }
  ];

  const handleChange = (e) => {
    setUserData({
      ...userData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const validateForm = () => {
    if (!userData.name || !userData.email || !userData.password || !userData.role) {
      setError('All fields are required');
      return false;
    }

    if (userData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(userData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      console.log('Registration data:', userData);
      // In real app, this would register the user
    } catch (err) {
      setError('Registration failed. Please try again.');
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
        <Box sx={{ textAlign: 'center', mb: 3 }}>
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
              mb: 3
            }}
          >
            Create new Account
          </Typography>

          {/* Switch to Login */}
          <Typography 
            variant="body2" 
            align="center" 
            sx={{ 
              mb: 3,
              color: 'text.secondary'
            }}
          >
            Already Registered?{' '}
            <Button 
              variant="text" 
              size="small"
              onClick={onSwitchToLogin}
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
              Login
            </Button>
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            {/* Name Field */}
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="NAME"
              name="name"
              autoComplete="name"
              autoFocus
              value={userData.name}
              onChange={handleChange}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon color="action" />
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

            {/* Email Field */}
            <TextField
              required
              fullWidth
              id="email"
              label="EMAIL"
              name="email"
              autoComplete="email"
              value={userData.email}
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
              autoComplete="new-password"
              value={userData.password}
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
                mb: 2,
                '& .MuiInputLabel-root': {
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }
              }}
            />

            {/* Role Selection */}
            <FormControl fullWidth required sx={{ mb: 3 }}>
              <InputLabel 
                id="role-label"
                sx={{
                  textTransform: 'uppercase',
                  fontSize: '0.75rem',
                  fontWeight: 600
                }}
              >
                ROLE
              </InputLabel>
              <Select
                labelId="role-label"
                id="role"
                name="role"
                value={userData.role}
                label="ROLE"
                onChange={handleChange}
                disabled={loading}
              >
                <MenuItem value="">
                  <em>Select your role</em>
                </MenuItem>
                {roles.map((role) => (
                  <MenuItem key={role.value} value={role.value}>
                    {role.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Sign Up Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading}
              sx={{
                mt: 2,
                mb: 2,
                py: 1.5,
                backgroundColor: '#2e7d32',
                '&:hover': {
                  backgroundColor: '#1b5e20'
                },
                fontWeight: 600,
                fontSize: '1rem'
              }}
            >
              Sign up
            </Button>

            <Divider sx={{ my: 2 }}>or</Divider>

            {/* Alternative Sign Up Options */}
            <Typography 
              variant="body2" 
              align="center" 
              sx={{ 
                color: 'text.secondary',
                mt: 2
              }}
            >
              By signing up, you agree to our Terms of Service and Privacy Policy
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Register;