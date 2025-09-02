// src/pages/Profile.js
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
  Card,
  CardContent,
  IconButton,
} from "@mui/material";
import { 
  Save as SaveIcon,
  Language as LanguageIcon,
  Schedule as ScheduleIcon,
  Description as DescriptionIcon,
  Share as ShareIcon,
  Star as StarIcon,
  Help as HelpIcon,
} from "@mui/icons-material";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebase.js";
import ReForestAppBar from "./AppBar.js";
import Navigation from "./Navigation.js";
import { useAuth } from '../context/AuthContext.js';

const Profile = () => {
  const { user, logout } = useAuth();
  const [personalInfo, setPersonalInfo] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [accountSettings, setAccountSettings] = useState({
    language: "english",
    timezone: "eastern",
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

  // Fetch user profile data with real-time updates
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const docRef = doc(db, "users", user.uid);
    
    // Using onSnapshot for real-time updates
    const unsubscribe = onSnapshot(
      docRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          
          // Set personal info with fallbacks to auth data
          setPersonalInfo({
            firstName: data.personalInfo?.firstName || user.name || "",
            lastName: data.personalInfo?.lastName || "",
            email: data.personalInfo?.email || user.email || "",
            phone: data.personalInfo?.phone || "",
          });
          
          // Set account settings with defaults
          setAccountSettings({
            language: data.accountSettings?.language || "english",
            timezone: data.accountSettings?.timezone || "eastern",
          });
        } else {
          // If document doesn't exist, create it with basic info
          const initialData = {
            personalInfo: {
              firstName: user.name || "",
              lastName: "",
              email: user.email || "",
              phone: "",
            },
            accountSettings: {
              language: "english",
              timezone: "eastern",
            },
            createdAt: new Date().toISOString(),
          };
          
          setPersonalInfo(initialData.personalInfo);
          setAccountSettings(initialData.accountSettings);
          
          // Create the document
          setDoc(docRef, initialData, { merge: true }).catch((error) => {
            console.error("Error creating initial profile:", error);
            setError("Failed to initialize profile");
          });
        }
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching profile:", error);
        setError("Failed to load profile data");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handlePersonalInfoChange = (field, value) => {
    setPersonalInfo({ ...personalInfo, [field]: value });
  };

  const handleAccountSettingsChange = (field, value) => {
    setAccountSettings({ ...accountSettings, [field]: value });
  };

  const handleUpdateSettings = async () => {
    if (!user) {
      setError("You must be logged in to update settings");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const docRef = doc(db, "users", user.uid);
      const dataToSave = {
        accountSettings: {
          ...accountSettings,
          updatedAt: new Date().toISOString(),
        },
      };

      await setDoc(docRef, dataToSave, { merge: true });
      setSuccess(true);
    } catch (error) {
      console.error("Error updating settings:", error);
      setError("Failed to update settings. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!user) {
      setError("You must be logged in to save changes");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const docRef = doc(db, "users", user.uid);
      const dataToSave = {
        personalInfo: {
          ...personalInfo,
          updatedAt: new Date().toISOString(),
        },
        accountSettings: {
          ...accountSettings,
          updatedAt: new Date().toISOString(),
        },
      };

      await setDoc(docRef, dataToSave, { merge: true });
      setSuccess(true);
    } catch (error) {
      console.error("Error saving profile:", error);
      setError("Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess(false);
    setError(null);
  };

  return (
    <Box sx={{ display: "flex" }}>
      {/* Top App Bar */}
      <ReForestAppBar
        handleDrawerToggle={handleDrawerToggle}
        user={user}
        onLogout={handleLogout}
      />

      {/* Side Navigation */}
      <Navigation
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        isMobile={isMobile}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - 240px)` },
        }}
      >
        <Toolbar /> {/* Push content below AppBar */}
        
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress />
            <Typography variant="h6" sx={{ ml: 2 }}>
              Loading profile...
            </Typography>
          </Box>
        ) : !user ? (
          <Alert severity="warning">
            Please log in to view your profile.
          </Alert>
        ) : (
          <Container maxWidth="lg">
            <Paper elevation={2} sx={{ p: 3, borderRadius: 2 }}>
              {/* Profile Header */}
              <Box sx={{ display: "flex", alignItems: "center", mb: 3 }}>
                <Avatar 
                  sx={{ 
                    width: 64, 
                    height: 64, 
                    mr: 2,
                    bgcolor: 'primary.main',
                    fontSize: '1.5rem'
                  }}
                  src={user?.photoURL}
                >
                  {personalInfo.firstName?.charAt(0)?.toUpperCase() || 
                   user.email?.charAt(0)?.toUpperCase() || 'U'}
                </Avatar>
                <Box>
                  <Typography variant="h5" fontWeight="bold">
                    {personalInfo.firstName || personalInfo.lastName 
                      ? `${personalInfo.firstName} ${personalInfo.lastName}`.trim()
                      : user.email || 'User'
                    }
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", mt: 0.5 }}>
                    <Chip
                      label="User"
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ mr: 1 }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      ● Member since: {user.metadata?.creationTime 
                        ? new Date(user.metadata.creationTime).toLocaleDateString()
                        : 'Unknown'
                      }
                    </Typography>
                  </Box>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Error Alert */}
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {/* Forms */}
              <Grid container spacing={4}>
                {/* Personal Information */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Personal Information
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="First Name"
                        value={personalInfo.firstName}
                        onChange={(e) =>
                          handlePersonalInfoChange("firstName", e.target.value)
                        }
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Last Name"
                        value={personalInfo.lastName}
                        onChange={(e) =>
                          handlePersonalInfoChange("lastName", e.target.value)
                        }
                        variant="outlined"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Email"
                        type="email"
                        value={personalInfo.email}
                        onChange={(e) =>
                          handlePersonalInfoChange("email", e.target.value)
                        }
                        variant="outlined"
                        helperText="This is your login email"
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        label="Phone"
                        value={personalInfo.phone}
                        onChange={(e) =>
                          handlePersonalInfoChange("phone", e.target.value)
                        }
                        variant="outlined"
                        placeholder="+1 (555) 123-4567"
                      />
                    </Grid>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 4 }} />
 
                {/* Account Settings Section */}
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    Account Settings
                  </Typography>
                  <Grid container spacing={2} sx={{ mb: 3 }}>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Language Preference</InputLabel>
                        <Select
                          value={accountSettings.language}
                          label="Language Preference"
                          onChange={(e) =>
                            handleAccountSettingsChange('language', e.target.value)
                          }
                          startAdornment={
                            <LanguageIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          }
                        >
                          <MenuItem value="english">English</MenuItem>
                          <MenuItem value="spanish">Spanish</MenuItem>
                          <MenuItem value="french">French</MenuItem>
                          <MenuItem value="german">German</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <InputLabel>Timezone</InputLabel>
                        <Select
                          value={accountSettings.timezone}
                          label="Timezone"
                          onChange={(e) =>
                            handleAccountSettingsChange('timezone', e.target.value)
                          }
                          startAdornment={
                            <ScheduleIcon sx={{ mr: 1, color: 'text.secondary' }} />
                          }
                        >
                          <MenuItem value="eastern">Eastern Time (ET)</MenuItem>
                          <MenuItem value="central">Central Time (CT)</MenuItem>
                          <MenuItem value="mountain">Mountain Time (MT)</MenuItem>
                          <MenuItem value="pacific">Pacific Time (PT)</MenuItem>
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                  <Button
                    variant="outlined"
                    onClick={handleUpdateSettings}
                    sx={{ borderRadius: 2 }}
                  >
                    Update Settings
                  </Button>
                </Grid>
              </Grid>

              <Divider sx={{ my: 4 }} />

              {/* Quick Actions Section */}
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Card
                    variant="outlined"
                    sx={{
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderRadius: 2,
                    }}
                  >
                    <CardContent>
                      <IconButton color="primary">
                        <DescriptionIcon />
                      </IconButton>
                      <Typography variant="body2">Terms & Policies</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card
                    variant="outlined"
                    sx={{
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderRadius: 2,
                    }}
                  >
                    <CardContent>
                      <IconButton color="primary">
                        <ShareIcon />
                      </IconButton>
                      <Typography variant="body2">Share App</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card
                    variant="outlined"
                    sx={{
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderRadius: 2,
                    }}
                  >
                    <CardContent>
                      <IconButton color="primary">
                        <StarIcon />
                      </IconButton>
                      <Typography variant="body2">Rate Us</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card
                    variant="outlined"
                    sx={{
                      textAlign: 'center',
                      cursor: 'pointer',
                      borderRadius: 2,
                    }}
                  >
                    <CardContent>
                      <IconButton color="primary">
                        <HelpIcon />
                      </IconButton>
                      <Typography variant="body2">Help Center</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Divider sx={{ my: 4 }} />

              {/* Save Button */}
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  onClick={handleSaveChanges}
                  disabled={saving}
                  sx={{ 
                    borderRadius: 2,
                    px: 3,
                    py: 1.5,
                  }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </Box>
            </Paper>

            {/* Success/Error Snackbar */}
            <Snackbar
              open={success}
              autoHideDuration={4000}
              onClose={handleCloseSnackbar}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
              <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
                Profile saved successfully!
              </Alert>
            </Snackbar>

            <Snackbar
              open={!!error}
              autoHideDuration={6000}
              onClose={handleCloseSnackbar}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
              <Alert onClose={handleCloseSnackbar} severity="error" sx={{ width: '100%' }}>
                {error}
              </Alert>
            </Snackbar>
          </Container>
        )}
      </Box>
    </Box>
  );
};

export default Profile;