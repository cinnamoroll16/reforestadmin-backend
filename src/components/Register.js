import { useState } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Link
} from '@mui/material';
import { PersonAdd as PersonAddIcon } from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

function Register({ onRegister, onSwitchToLogin }) {
  const [userData, setUserData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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
    // Clear errors when user starts typing
    if (error) setError('');
  };

  const validateForm = () => {
    if (!userData.name || !userData.email || !userData.password || !userData.confirmPassword || !userData.role) {
      setError('All fields are required');
      return false;
    }

    if (userData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (userData.password !== userData.confirmPassword) {
      setError('Passwords do not match');
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
      // In a real application, you would make an API call to your Java backend here
      // For demo purposes, we'll simulate a registration process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate successful registration
      // In a real app, you would send this data to your backend
      const { confirmPassword, ...userWithoutConfirm } = userData;
      
      console.log('Registration data:', userWithoutConfirm);
      
      // Show success message
      setSuccess(true);
      setError('');
      
      // In a real app, you might automatically log the user in or redirect to login
      // onRegister(userWithoutConfirm);
      
    } catch (err) {
      setError('Registration failed. Please try again.');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Container component="main" maxWidth="sm">
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Paper elevation={3} sx={{ padding: 4, width: '100%', textAlign: 'center' }}>
            <PersonAddIcon sx={{ fontSize: 40, color: 'success.main', mb: 2 }} />
            <Typography component="h1" variant="h5" gutterBottom>
              Registration Successful!
            </Typography>
            <Typography variant="body1" sx={{ mb: 3 }}>
              Your account has been created successfully. You can now sign in to the ReForest system.
            </Typography>
            <Button
              variant="contained"
              onClick={() => onSwitchToLogin()}
              sx={{ mt: 2 }}
            >
              Go to Login
            </Button>
          </Paper>
        </Box>
      </Container>
    );
  }

  return (
    <Container component="main" maxWidth="sm">
      <Box
        sx={{
          marginTop: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <PersonAddIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
            <Typography component="h1" variant="h5" gutterBottom>
              Create ReForest Account
            </Typography>
            <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
              Register as a planter, DENR officer, or other stakeholder
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  autoComplete="name"
                  name="name"
                  required
                  fullWidth
                  id="name"
                  label="Full Name"
                  autoFocus
                  value={userData.name}
                  onChange={handleChange}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  required
                  fullWidth
                  id="email"
                  label="Email Address"
                  name="email"
                  autoComplete="email"
                  value={userData.email}
                  onChange={handleChange}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="password"
                  label="Password"
                  type="password"
                  id="password"
                  autoComplete="new-password"
                  value={userData.password}
                  onChange={handleChange}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  required
                  fullWidth
                  name="confirmPassword"
                  label="Confirm Password"
                  type="password"
                  id="confirmPassword"
                  value={userData.confirmPassword}
                  onChange={handleChange}
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth required>
                  <InputLabel id="role-label">Role</InputLabel>
                  <Select
                    labelId="role-label"
                    id="role"
                    name="role"
                    value={userData.role}
                    label="Role"
                    onChange={handleChange}
                    disabled={loading}
                  >
                    {roles.map((role) => (
                      <MenuItem key={role.value} value={role.value}>
                        {role.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Create Account'}
            </Button>
            
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2">
                Already have an account?{' '}
                <Link 
                  component="button" 
                  type="button" 
                  onClick={onSwitchToLogin}
                  sx={{ textDecoration: 'underline' }}
                >
                  Sign in here
                </Link>
              </Typography>
            </Box>
          </Box>

          <Box sx={{ mt: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="body2" color="textSecondary" align="center">
              <strong>Role Descriptions:</strong>
              <br />
              <strong>Planter:</strong> Individuals involved in planting activities
              <br />
              <strong>DENR Officer:</strong> Government environmental officers
              <br />
              <strong>Nursery Manager:</strong> Manage plant nurseries and inventory
              <br />
              <strong>Researcher:</strong> Conduct environmental research
              <br />
              <strong>Volunteer:</strong> Support reforestation efforts
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}

export default Register;