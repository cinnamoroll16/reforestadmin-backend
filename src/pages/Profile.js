// src/pages/AdminProfile.js
import React, { useState, useEffect } from "react";
import {
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Box,
  Avatar,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Alert,
  CircularProgress,
  Snackbar,
  Toolbar,
  useMediaQuery,
  useTheme,
  Switch,
  FormControlLabel,
  Stack,
} from "@mui/material";
import {
  Save as SaveIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Dashboard as DashboardIcon,
} from "@mui/icons-material";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { auth, firestore } from "../firebase.js";
import ReForestAppBar from "./AppBar.js";
import Navigation from "./Navigation.js";
import { useAuth } from '../context/AuthContext.js';

const AdminProfile = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department: "",
    language: "english",
    timezone: "eastern",
    emailAlerts: true,
    systemMaintenance: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
  };

  // Load admin profile
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const docRef = doc(firestore, "admins", user.uid);
    
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setProfile({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || user.email || "",
            phone: data.phone || "",
            department: data.department || "",
            language: data.language || "english",
            timezone: data.timezone || "eastern",
            emailAlerts: data.emailAlerts ?? true,
            systemMaintenance: data.systemMaintenance ?? false,
          });
        } else {
          // Initialize new admin profile
          const newProfile = {
            firstName: user.displayName?.split(' ')[0] || "",
            lastName: user.displayName?.split(' ')[1] || "",
            email: user.email || "",
            phone: "",
            department: "",
            language: "english",
            timezone: "eastern",
            emailAlerts: true,
            systemMaintenance: false,
            role: "admin",
            createdAt: new Date().toISOString(),
          };
          
          setProfile(newProfile);
          setDoc(docRef, newProfile, { merge: true }).catch(console.error);
        }
        setLoading(false);
      },
      (error) => {
        setError("Failed to load admin profile");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const docRef = doc(firestore, "admins", user.uid);
      await setDoc(docRef, {
        ...profile,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
      
      setSuccess(true);
    } catch (error) {
      setError("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex" }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - 240px)` } }}>
          <Toolbar />
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress size={40} />
            <Typography variant="h6" sx={{ ml: 2 }}>Loading...</Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ display: "flex" }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - 240px)` } }}>
          <Toolbar />
          <Alert severity="warning">Please log in to access admin profile.</Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", bgcolor: "#fafafa", minHeight: "100vh" }}>
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - 240px)` } }}>
        <Toolbar />
        
        <Container maxWidth="lg">
          {/* Profile Header */}
          <Paper sx={{ p: 3, mb: 3, borderRadius: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center" }}>
              <Avatar 
                sx={{ 
                  width: 60, 
                  height: 60, 
                  mr: 3,
                  bgcolor: 'primary.main',
                  fontSize: '1.25rem',
                  fontWeight: 600
                }}
              >
                {profile.firstName?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || 'A'}
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight="600" sx={{ mb: 0.5 }}>
                  {profile.firstName && profile.lastName 
                    ? `${profile.firstName} ${profile.lastName}`
                    : profile.email || 'Administrator'
                  }
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Chip
                    icon={<AdminIcon />}
                    label="System Administrator"
                    color="primary"
                    size="small"
                    sx={{ fontWeight: 500 }}
                  />
                  {profile.department && (
                    <Chip label={profile.department} variant="outlined" size="small" />
                  )}
                </Box>
              </Box>
            </Box>
          </Paper>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          {/* Main Content */}
          <Grid container spacing={3}>
            {/* Personal Information */}
            <Grid item xs={12} lg={6}>
              <Paper sx={{ p: 3, height: "fit-content" }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <PersonIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="600">Personal Information</Typography>
                </Box>
                
                <Stack spacing={2.5}>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                      label="First Name"
                      value={profile.firstName}
                      onChange={(e) => handleChange("firstName", e.target.value)}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                    <TextField
                      label="Last Name"
                      value={profile.lastName}
                      onChange={(e) => handleChange("lastName", e.target.value)}
                      size="small"
                      sx={{ flex: 1 }}
                    />
                  </Box>
                  
                  <TextField
                    label="Email Address"
                    type="email"
                    value={profile.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    size="small"
                    helperText="Primary admin email for system access"
                  />
                  
                  <TextField
                    label="Phone Number"
                    value={profile.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="(555) 123-4567"
                    size="small"
                  />
                  
                  <FormControl size="small">
                    <InputLabel>Department</InputLabel>
                    <Select
                      value={profile.department}
                      label="Department"
                      onChange={(e) => handleChange('department', e.target.value)}
                    >
                      <MenuItem value="">Select Department</MenuItem>
                      <MenuItem value="Information Technology">Information Technology</MenuItem>
                      <MenuItem value="Human Resources">Human Resources</MenuItem>
                      <MenuItem value="Finance">Finance</MenuItem>
                      <MenuItem value="Operations">Operations</MenuItem>
                      <MenuItem value="Management">Management</MenuItem>
                    </Select>
                  </FormControl>
                </Stack>
              </Paper>
            </Grid>

            {/* System Settings */}
            <Grid item xs={12} lg={6}>
              <Paper sx={{ p: 3, height: "fit-content", mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <SettingsIcon sx={{ mr: 1.5, color: 'primary.main' }} />
                  <Typography variant="h6" fontWeight="600">Account Settings</Typography>
                </Box>
                
                <Stack spacing={2.5}>
                  <FormControl size="small">
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={profile.language}
                      label="Language"
                      onChange={(e) => handleChange('language', e.target.value)}
                    >
                      <MenuItem value="english">English</MenuItem>
                      <MenuItem value="spanish">Spanish</MenuItem>
                      <MenuItem value="french">French</MenuItem>
                      <MenuItem value="german">German</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControl size="small">
                    <InputLabel>Timezone</InputLabel>
                    <Select
                      value={profile.timezone}
                      label="Timezone"
                      onChange={(e) => handleChange('timezone', e.target.value)}
                    >
                      <MenuItem value="eastern">Eastern Time (ET)</MenuItem>
                      <MenuItem value="central">Central Time (CT)</MenuItem>
                      <MenuItem value="mountain">Mountain Time (MT)</MenuItem>
                      <MenuItem value="pacific">Pacific Time (PT)</MenuItem>
                      <MenuItem value="utc">Coordinated Universal Time (UTC)</MenuItem>
                    </Select>
                  </FormControl>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={profile.emailAlerts}
                        onChange={(e) => handleChange('emailAlerts', e.target.checked)}
                        size="small"
                      />
                    }
                    label="Email alerts and notifications"
                  />
                </Stack>
              </Paper>

              {/* Admin Controls */}
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <SecurityIcon sx={{ mr: 1.5, color: 'warning.main' }} />
                  <Typography variant="h6" fontWeight="600">System Controls</Typography>
                </Box>
                
                <Alert severity="warning" sx={{ mb: 2, fontSize: '0.875rem' }}>
                  These settings affect all system users
                </Alert>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={profile.systemMaintenance}
                      onChange={(e) => handleChange('systemMaintenance', e.target.checked)}
                      color="warning"
                    />
                  }
                  label="Enable maintenance mode"
                />
                <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 0.5 }}>
                  Displays maintenance notice to all users
                </Typography>
              </Paper>
            </Grid>

            {/* Quick Actions */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>Quick Actions</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button variant="outlined" startIcon={<DashboardIcon />} size="small">
                    View Dashboard
                  </Button>
                  <Button variant="outlined" startIcon={<PersonIcon />} size="small">
                    Manage Users
                  </Button>
                  <Button variant="outlined" startIcon={<SecurityIcon />} size="small">
                    Security Logs
                  </Button>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Save Button */}
          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 3 }}>
            <Button
              variant="contained"
              startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              sx={{ px: 3, py: 1 }}
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </Box>

          {/* Notifications */}
          <Snackbar
            open={success}
            autoHideDuration={3000}
            onClose={() => setSuccess(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert severity="success" onClose={() => setSuccess(false)}>
              Profile updated successfully
            </Alert>
          </Snackbar>

          <Snackbar
            open={!!error}
            autoHideDuration={5000}
            onClose={() => setError(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
          >
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </Box>
  );
};

export default AdminProfile;