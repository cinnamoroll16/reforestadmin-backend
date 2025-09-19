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
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Fade,
  Zoom,
  InputAdornment,
  Tabs,
  Tab,
  alpha
} from "@mui/material";
import {
  Save as SaveIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Dashboard as DashboardIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Language as LanguageIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  Build as BuildIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ArrowBack as ArrowBackIcon
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
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('sm'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
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
        updatedAt: new Date().toISOString(), // FIXED: Changed newDate() to new Date()
      }, { merge: true });
      
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      setError("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    // Reload original data
    const docRef = doc(firestore, "admins", user.uid);
    getDoc(docRef).then(docSnap => {
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      }
    });
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - 280px)` } }}>
          <Toolbar />
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
            <Box textAlign="center">
              <CircularProgress size={50} thickness={4} sx={{ mb: 2, color: "primary.main" }} />
              <Typography variant="h6" color="text.secondary" fontWeight="500">
                Loading your profile...
              </Typography>
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - 280px)` } }}>
          <Toolbar />
          <Alert severity="warning" sx={{ maxWidth: 500, mx: 'auto', mt: 4 }}>
            Please log in to access admin profile.
          </Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", bgcolor: "background.default", minHeight: "100vh" }}>
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />

      <Box component="main" sx={{ 
        flexGrow: 1, 
        p: { xs: 2, md: 3 }, 
        width: { md: `calc(100% - 280px)` },
        transition: 'all 0.3s ease'
      }}>
        <Toolbar />
        
        <Container maxWidth="lg" sx={{ px: { xs: 0, sm: 2 } }}>
          {/* Back Button for Mobile */}
          {isMobile && (
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={() => window.history.back()}
              sx={{ mb: 2, color: 'text.secondary' }}
              size="small"
            >
              Back
            </Button>
          )}

          {/* Profile Header */}
          <Card sx={{ 
            mb: 3, 
            borderRadius: 2,
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
            border: 'none'
          }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
                <Avatar 
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    bgcolor: 'primary.main',
                    fontSize: '2rem',
                    fontWeight: 600,
                    boxShadow: theme.shadows[4]
                  }}
                >
                  {profile.firstName?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || 'A'}
                </Avatar>
                
                <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
                  <Typography variant="h4" fontWeight="700" sx={{ mb: 1 }}>
                    {profile.firstName && profile.lastName 
                      ? `${profile.firstName} ${profile.lastName}`
                      : profile.email || 'Administrator'
                    }
                  </Typography>
                  
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: { xs: 'center', sm: 'flex-start' }, flexWrap: 'wrap' }}>
                    <Chip
                      icon={<AdminIcon />}
                      label="System Administrator"
                      color="primary"
                      size="medium"
                      sx={{ 
                        fontWeight: 600,
                        px: 1,
                        '& .MuiChip-icon': { fontSize: '1.2rem' }
                      }}
                    />
                    {profile.department && (
                      <Chip 
                        label={profile.department} 
                        variant="outlined" 
                        size="medium" 
                        sx={{ fontWeight: 500 }}
                      />
                    )}
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Last updated: {new Date().toLocaleDateString()}
                  </Typography>
                </Box>
                
                {!isEditing && (
                  <Button
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => setIsEditing(true)}
                    sx={{ 
                      borderRadius: 2,
                      px: 3,
                      py: 1
                    }}
                  >
                    Edit Profile
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

          {error && (
            <Zoom in={!!error}>
              <Alert 
                severity="error" 
                sx={{ mb: 3, borderRadius: 2 }}
                onClose={() => setError(null)}
                icon={<WarningIcon />}
              >
                {error}
              </Alert>
            </Zoom>
          )}

          {/* Tabs for better organization */}
          <Card sx={{ mb: 3, borderRadius: 2 }}>
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              sx={{
                px: 2,
                '& .MuiTab-root': {
                  minHeight: 60,
                  fontWeight: 600,
                  textTransform: 'none',
                  fontSize: '1rem'
                }
              }}
              indicatorColor="primary"
              textColor="primary"
              variant={isMobile ? "scrollable" : "standard"}
              scrollButtons="auto"
            >
              <Tab icon={<PersonIcon />} label="Personal Info" />
              <Tab icon={<SettingsIcon />} label="Account Settings" />
              <Tab icon={<SecurityIcon />} label="System Controls" />
            </Tabs>
            
            <Divider />
          </Card>

          {/* Main Content */}
          <Grid container spacing={3}>
            {/* Personal Information Tab */}
            {activeTab === 0 && (
              <Grid item xs={12} lg={8}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardHeader
                    title="Personal Information"
                    titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
                    sx={{ pb: 1 }}
                  />
                  <CardContent>
                    <Stack spacing={3}>
                      <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
                        <TextField
                          label="First Name"
                          value={profile.firstName}
                          onChange={(e) => handleChange("firstName", e.target.value)}
                          size="medium"
                          sx={{ flex: 1 }}
                          disabled={!isEditing}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PersonIcon color="action" />
                              </InputAdornment>
                            ),
                          }}
                        />
                        <TextField
                          label="Last Name"
                          value={profile.lastName}
                          onChange={(e) => handleChange("lastName", e.target.value)}
                          size="medium"
                          sx={{ flex: 1 }}
                          disabled={!isEditing}
                        />
                      </Box>
                      
                      <TextField
                        label="Email Address"
                        type="email"
                        value={profile.email}
                        onChange={(e) => handleChange("email", e.target.value)}
                        size="medium"
                        helperText="Primary admin email for system access"
                        disabled={!isEditing}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <EmailIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                      
                      <TextField
                        label="Phone Number"
                        value={profile.phone}
                        onChange={(e) => handleChange("phone", e.target.value)}
                        placeholder="(555) 123-4567"
                        size="medium"
                        disabled={!isEditing}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <PhoneIcon color="action" />
                            </InputAdornment>
                          ),
                        }}
                      />
                      
                      <FormControl size="medium" disabled={!isEditing}>
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
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Account Settings Tab */}
            {activeTab === 1 && (
              <Grid item xs={12} lg={8}>
                <Card sx={{ borderRadius: 2, mb: 3 }}>
                  <CardHeader
                    title="Account Preferences"
                    titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
                    sx={{ pb: 1 }}
                  />
                  <CardContent>
                    <Stack spacing={3}>
                      <FormControl size="medium" disabled={!isEditing}>
                        <InputLabel>Language</InputLabel>
                        <Select
                          value={profile.language}
                          label="Language"
                          onChange={(e) => handleChange('language', e.target.value)}
                          startAdornment={
                            <InputAdornment position="start">
                              <LanguageIcon color="action" sx={{ mr: 1 }} />
                            </InputAdornment>
                          }
                        >
                          <MenuItem value="english">English</MenuItem>
                          <MenuItem value="spanish">Spanish</MenuItem>
                          <MenuItem value="french">French</MenuItem>
                          <MenuItem value="german">German</MenuItem>
                        </Select>
                      </FormControl>
                      
                      <FormControl size="medium" disabled={!isEditing}>
                        <InputLabel>Timezone</InputLabel>
                        <Select
                          value={profile.timezone}
                          label="Timezone"
                          onChange={(e) => handleChange('timezone', e.target.value)}
                          startAdornment={
                            <InputAdornment position="start">
                              <ScheduleIcon color="action" sx={{ mr: 1 }} />
                            </InputAdornment>
                          }
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
                            size="medium"
                            disabled={!isEditing}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <NotificationsIcon color="action" fontSize="small" />
                            <span>Email alerts and notifications</span>
                          </Box>
                        }
                        sx={{ mt: 1 }}
                      />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* System Controls Tab */}
            {activeTab === 2 && (
              <Grid item xs={12} lg={8}>
                <Card sx={{ borderRadius: 2 }}>
                  <CardHeader
                    title="System Administration"
                    titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
                    sx={{ pb: 1 }}
                  />
                  <CardContent>
                    <Alert 
                      severity="warning" 
                      sx={{ mb: 3, borderRadius: 2 }}
                      icon={<WarningIcon />}
                    >
                      These settings affect all system users. Use with caution.
                    </Alert>
                    
                    <FormControlLabel
                      control={
                        <Switch
                          checked={profile.systemMaintenance}
                          onChange={(e) => handleChange('systemMaintenance', e.target.checked)}
                          color="warning"
                          size="medium"
                          disabled={!isEditing}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BuildIcon color="action" fontSize="small" />
                          <span>Enable maintenance mode</span>
                        </Box>
                      }
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ ml: 4, mt: 1 }}>
                      Displays maintenance notice to all users and restricts certain functionality
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Quick Actions Sidebar */}
            <Grid item xs={12} lg={4}>
              <Card sx={{ borderRadius: 2, mb: 3 }}>
                <CardHeader
                  title="Quick Actions"
                  titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
                />
                <CardContent>
                  <Stack spacing={2}>
                    <Button 
                      variant="outlined" 
                      startIcon={<DashboardIcon />} 
                      fullWidth
                      sx={{ justifyContent: 'flex-start', py: 1.5 }}
                    >
                      View Dashboard
                    </Button>
                    <Button 
                      variant="outlined" 
                      startIcon={<PersonIcon />} 
                      fullWidth
                      sx={{ justifyContent: 'flex-start', py: 1.5 }}
                    >
                      Manage Users
                    </Button>
                    <Button 
                      variant="outlined" 
                      startIcon={<SecurityIcon />} 
                      fullWidth
                      sx={{ justifyContent: 'flex-start', py: 1.5 }}
                    >
                      Security Logs
                    </Button>
                    <Button 
                      variant="outlined" 
                      startIcon={<SettingsIcon />} 
                      fullWidth
                      sx={{ justifyContent: 'flex-start', py: 1.5 }}
                    >
                      System Settings
                    </Button>
                  </Stack>
                </CardContent>
              </Card>

              {/* Status Card */}
              <Card sx={{ borderRadius: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
                <CardContent sx={{ textAlign: 'center', py: 3 }}>
                  <CheckCircleIcon sx={{ fontSize: 48, mb: 1 }} />
                  <Typography variant="h6" fontWeight={600}>
                    System Online
                  </Typography>
                  <Typography variant="body2">
                    All services are running smoothly
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Action Buttons */}
          {isEditing && (
            <Fade in={isEditing}>
              <Box sx={{ 
                display: "flex", 
                justifyContent: "flex-end", 
                gap: 2, 
                mt: 3,
                p: 2,
                bgcolor: 'background.paper',
                borderRadius: 2,
                boxShadow: theme.shadows[1]
              }}>
                <Button
                  variant="outlined"
                  onClick={handleCancelEdit}
                  disabled={saving}
                  sx={{ px: 4, py: 1, borderRadius: 2 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={saving}
                  sx={{ px: 4, py: 1, borderRadius: 2 }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </Box>
            </Fade>
          )}

          {/* Success Notification */}
          <Snackbar
            open={success}
            autoHideDuration={3000}
            onClose={() => setSuccess(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            TransitionComponent={Zoom}
          >
            <Alert 
              severity="success" 
              onClose={() => setSuccess(false)}
              icon={<CheckCircleIcon />}
              sx={{ 
                borderRadius: 2,
                boxShadow: theme.shadows[3]
              }}
            >
              Profile updated successfully!
            </Alert>
          </Snackbar>
        </Container>
      </Box>
    </Box>
  );
};

export default AdminProfile;