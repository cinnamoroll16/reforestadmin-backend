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
  Link
} from '@mui/material';
import { LockReset as LockResetIcon } from '@mui/icons-material';

function ResetPassword({ onSwitchToLogin, token }) {
  const [passwords, setPasswords] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setPasswords({
      ...passwords,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const validateForm = () => {
    if (!passwords.newPassword || !passwords.confirmPassword) {
      setError('Both password fields are required');
      return false;
    }

    if (passwords.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return false;
    }

    if (passwords.newPassword !== passwords.confirmPassword) {
      setError('Passwords do not match');
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
      // Simulate API call to backend
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real application, this would call your Java backend
      // to reset the password using the token
      console.log('Password reset with token:', token);
      console.log('New password:', passwords.newPassword);
      
      setSuccess(true);
      setError('');
    } catch (err) {
      setError('Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

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
        <Paper elevation={3} sx={{ padding: 4, width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <LockResetIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
            <Typography component="h1" variant="h5" gutterBottom>
              Set New Password
            </Typography>
            <Typography variant="body2" color="textSecondary" align="center" sx={{ mb: 3 }}>
              Please enter your new password below.
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              Your password has been successfully reset.
            </Alert>
          ) : null}

          {!success ? (
            <Box component="form" onSubmit={handleSubmit} noValidate>
              <TextField
                margin="normal"
                required
                fullWidth
                name="newPassword"
                label="New Password"
                type="password"
                id="newPassword"
                autoComplete="new-password"
                value={passwords.newPassword}
                onChange={handleChange}
                disabled={loading}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                name="confirmPassword"
                label="Confirm New Password"
                type="password"
                id="confirmPassword"
                value={passwords.confirmPassword}
                onChange={handleChange}
                disabled={loading}
              />
              <Button
                type="submit"
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Reset Password'}
              </Button>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                fullWidth
                variant="contained"
                onClick={onSwitchToLogin}
                sx={{ mt: 2 }}
              >
                Continue to Sign In
              </Button>
            </Box>
          )}

          {!success && (
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2">
                <Link 
                  component="button" 
                  type="button" 
                  onClick={onSwitchToLogin}
                  sx={{ textDecoration: 'underline' }}
                >
                  Back to Sign In
                </Link>
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
}

export default ResetPassword;