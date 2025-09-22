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
  alpha,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Badge,
  Tooltip
} from "@mui/material";
import {
  Save as SaveIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  People as PeopleIcon,
  Timeline as TimelineIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Build as BuildIcon,
  Edit as EditIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  ArrowBack as ArrowBackIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Shield as ShieldIcon,
  Computer as ComputerIcon,
  Smartphone as SmartphoneIcon,
  LocationOn as LocationIcon,
  Visibility as VisibilityIcon,
  PhotoCamera as PhotoCameraIcon
} from "@mui/icons-material";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { firestore } from "../firebase.js";
import ReForestAppBar from "./AppBar.js";
import Navigation from "./Navigation.js";
import { useAuth } from '../context/AuthContext.js';

// Constants and utility functions
const PROFILE_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'department'];
const STATUS_COLORS = {
  'online': 'success',
  'away': 'warning',
  'offline': 'error',
  'default': 'default'
};

const ACTIVITY_ICONS = {
  'auth': <SecurityIcon />,
  'planting': <PersonIcon />,
  'system': <SettingsIcon />,
  'user': <PeopleIcon />,
  'report': <TimelineIcon />,
  'default': <TimelineIcon />
};

// Mock data generators
const generateMockUsers = () => [
  { id: 1, name: "John Doe", email: "john@reforest.com", role: "Planter", status: "online", lastSeen: "2 min ago" },
  { id: 2, name: "Jane Smith", email: "jane@reforest.com", role: "Admin", status: "offline", lastSeen: "1 hour ago" },
  { id: 3, name: "Mike Johnson", email: "mike@reforest.com", role: "Planter", status: "online", lastSeen: "5 min ago" },
  { id: 4, name: "Sarah Wilson", email: "sarah@reforest.com", role: "Field Officer", status: "away", lastSeen: "30 min ago" }
];

const generateMockActivities = () => [
  { id: 1, action: "User login", user: "John Doe", time: "2 minutes ago", type: "auth" },
  { id: 2, action: "Tree planting completed", user: "Jane Smith", time: "15 minutes ago", type: "planting" },
  { id: 3, action: "Sensor data updated", user: "System", time: "1 hour ago", type: "system" },
  { id: 4, action: "New user registered", user: "Mike Johnson", time: "2 hours ago", type: "user" },
  { id: 5, action: "Report generated", user: "Admin", time: "3 hours ago", type: "report" }
];

const generateMockSessions = () => [
  { id: 1, device: "Chrome on Windows", location: "Cebu City, PH", ip: "192.168.1.1", lastActive: "Active now", current: true },
  { id: 2, device: "Safari on iPhone", location: "Manila, PH", ip: "192.168.1.2", lastActive: "2 hours ago", current: false },
  { id: 3, device: "Firefox on MacOS", location: "Davao, PH", ip: "192.168.1.3", lastActive: "1 day ago", current: false }
];

// Sub-components for better organization
const ProfileHeader = ({ profile, isEditing, onEdit, onPhotoUpload, theme }) => {
  const profileCompletion = Math.round(
    (PROFILE_FIELDS.filter(field => profile[field] && profile[field].trim() !== '').length / 
     PROFILE_FIELDS.length) * 100
  );

  return (
    <Card sx={{ 
      mb: 3, 
      borderRadius: 2,
      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
      border: 'none'
    }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
          <Box sx={{ position: 'relative' }}>
            <Avatar 
              sx={{ 
                width: 80, 
                height: 80, 
                bgcolor: 'primary.main',
                fontSize: '2rem',
                fontWeight: 600,
                boxShadow: theme.shadows[4]
              }}
              src={profile.profilePicture}
            >
              {profile.firstName?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || 'A'}
            </Avatar>
            {isEditing && (
              <IconButton
                sx={{
                  position: 'absolute',
                  bottom: -4,
                  right: -4,
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': { bgcolor: 'primary.dark' },
                  width: 32,
                  height: 32
                }}
                component="label"
              >
                <PhotoCameraIcon fontSize="small" />
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={onPhotoUpload}
                />
              </IconButton>
            )}
          </Box>
          
          <Box sx={{ flex: 1, textAlign: { xs: 'center', sm: 'left' } }}>
            <Typography variant="h4" fontWeight="700" sx={{ mb: 1 }}>
              {profile.firstName && profile.lastName 
                ? `${profile.firstName} ${profile.lastName}`
                : profile.email || 'Administrator'
              }
            </Typography>
            
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, justifyContent: { xs: 'center', sm: 'flex-start' }, flexWrap: 'wrap', mb: 2 }}>
              <Chip
                icon={<AdminIcon />}
                label="System Administrator"
                color="primary"
                size="medium"
                sx={{ fontWeight: 600, px: 1 }}
              />
              {profile.department && (
                <Chip 
                  label={profile.department} 
                  variant="outlined" 
                  size="medium" 
                  sx={{ fontWeight: 500 }}
                />
              )}
              <Badge color={profile.twoFactorEnabled ? "success" : "warning"} variant="dot">
                <Chip 
                  icon={<ShieldIcon />}
                  label={profile.twoFactorEnabled ? "2FA Enabled" : "2FA Disabled"}
                  size="small"
                  color={profile.twoFactorEnabled ? "success" : "warning"}
                  variant="outlined"
                />
              </Badge>
            </Box>

            <Box sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Profile Completion
                </Typography>
                <Typography variant="body2" fontWeight="600" color="primary.main">
                  {profileCompletion}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={profileCompletion} 
                sx={{ 
                  height: 6, 
                  borderRadius: 3,
                  bgcolor: alpha(theme.palette.primary.main, 0.1)
                }} 
              />
            </Box>
            
            <Typography variant="body2" color="text.secondary">
              Last updated: {new Date().toLocaleDateString()}
            </Typography>
          </Box>
          
          {!isEditing && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={onEdit}
              sx={{ borderRadius: 2, px: 3, py: 1 }}
            >
              Edit Profile
            </Button>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

const PersonalInfoTab = ({ profile, isEditing, onChange }) => (
  <Card sx={{ borderRadius: 2 }}>
    <CardHeader
      title="Personal Information"
      titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
      sx={{ pb: 1 }}
    />
    <CardContent>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <TextField
            label="First Name"
            value={profile.firstName}
            onChange={(e) => onChange("firstName", e.target.value)}
            fullWidth
            size="medium"
            disabled={!isEditing}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon color="action" />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            label="Last Name"
            value={profile.lastName}
            onChange={(e) => onChange("lastName", e.target.value)}
            fullWidth
            size="medium"
            disabled={!isEditing}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            label="Email Address"
            type="email"
            value={profile.email}
            onChange={(e) => onChange("email", e.target.value)}
            fullWidth
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
        </Grid>
        
        <Grid item xs={12} md={6}>
          <TextField
            label="Phone Number"
            value={profile.phone}
            onChange={(e) => onChange("phone", e.target.value)}
            placeholder="(555) 123-4567"
            fullWidth
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
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormControl fullWidth size="medium" disabled={!isEditing}>
            <InputLabel>Department</InputLabel>
            <Select
              value={profile.department}
              label="Department"
              onChange={(e) => onChange('department', e.target.value)}
            >
              <MenuItem value="">Select Department</MenuItem>
              <MenuItem value="Information Technology">Information Technology</MenuItem>
              <MenuItem value="Human Resources">Human Resources</MenuItem>
              <MenuItem value="Finance">Finance</MenuItem>
              <MenuItem value="Operations">Operations</MenuItem>
              <MenuItem value="Management">Management</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </CardContent>
  </Card>
);

const PreferencesTab = ({ profile, isEditing, onChange }) => (
  <Stack spacing={3}>
    <Card sx={{ borderRadius: 2 }}>
      <CardHeader
        title="Appearance & Display"
        titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
      />
      <CardContent>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={profile.darkMode}
                  onChange={(e) => onChange('darkMode', e.target.checked)}
                  disabled={!isEditing}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {profile.darkMode ? <DarkModeIcon /> : <LightModeIcon />}
                  <span>Dark Mode</span>
                </Box>
              }
            />
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="medium" disabled={!isEditing}>
              <InputLabel>Language</InputLabel>
              <Select
                value={profile.language}
                label="Language"
                onChange={(e) => onChange('language', e.target.value)}
              >
                <MenuItem value="english">English</MenuItem>
                <MenuItem value="spanish">Spanish</MenuItem>
                <MenuItem value="french">French</MenuItem>
                <MenuItem value="german">German</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <FormControl fullWidth size="medium" disabled={!isEditing}>
              <InputLabel>Timezone</InputLabel>
              <Select
                value={profile.timezone}
                label="Timezone"
                onChange={(e) => onChange('timezone', e.target.value)}
              >
                <MenuItem value="eastern">Eastern Time (ET)</MenuItem>
                <MenuItem value="central">Central Time (CT)</MenuItem>
                <MenuItem value="mountain">Mountain Time (MT)</MenuItem>
                <MenuItem value="pacific">Pacific Time (PT)</MenuItem>
                <MenuItem value="utc">Coordinated Universal Time (UTC)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </CardContent>
    </Card>

    <Card sx={{ borderRadius: 2 }}>
      <CardHeader
        title="Notifications"
        titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
      />
      <CardContent>
        <Stack spacing={2}>
          <FormControlLabel
            control={
              <Switch
                checked={profile.emailAlerts}
                onChange={(e) => onChange('emailAlerts', e.target.checked)}
                disabled={!isEditing}
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EmailIcon color="action" />
                <span>Email notifications</span>
              </Box>
            }
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={profile.systemMaintenance}
                onChange={(e) => onChange('systemMaintenance', e.target.checked)}
                disabled={!isEditing}
                color="warning"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BuildIcon color="action" />
                <span>Maintenance mode alerts</span>
              </Box>
            }
          />
        </Stack>
      </CardContent>
    </Card>
  </Stack>
);

const SecurityTab = ({ profile, isEditing, onChange, sessions }) => (
  <Stack spacing={3}>
    <Card sx={{ borderRadius: 2 }}>
      <CardHeader
        title="Two-Factor Authentication"
        titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
      />
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box>
            <Typography variant="body1" fontWeight={500}>
              {profile.twoFactorEnabled ? "2FA is enabled" : "2FA is disabled"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Add an extra layer of security to your account
            </Typography>
          </Box>
          <Switch
            checked={profile.twoFactorEnabled}
            onChange={(e) => onChange('twoFactorEnabled', e.target.checked)}
            disabled={!isEditing}
          />
        </Box>
        {profile.twoFactorEnabled && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Your account is protected with two-factor authentication
          </Alert>
        )}
      </CardContent>
    </Card>

    <Card sx={{ borderRadius: 2 }}>
      <CardHeader
        title="Active Sessions"
        titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
      />
      <CardContent>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Device</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Last Active</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {session.device.includes('iPhone') ? <SmartphoneIcon /> : <ComputerIcon />}
                      <span>{session.device}</span>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LocationIcon fontSize="small" />
                      <span>{session.location}</span>
                    </Box>
                  </TableCell>
                  <TableCell>{session.lastActive}</TableCell>
                  <TableCell>
                    <Chip 
                      label={session.current ? "Current" : "Inactive"}
                      color={session.current ? "success" : "default"}
                      size="small"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  </Stack>
);

const UserManagementTab = ({ users }) => {
  const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.default;

  return (
    <Card sx={{ borderRadius: 2 }}>
      <CardHeader
        title="User Management"
        titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
        action={
          <Button variant="outlined" startIcon={<PersonIcon />}>
            Add User
          </Button>
        }
      />
      <CardContent>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Last Seen</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Badge
                        color={getStatusColor(user.status)}
                        variant="dot"
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      >
                        <Avatar sx={{ width: 32, height: 32 }}>
                          {user.name.charAt(0)}
                        </Avatar>
                      </Badge>
                      <Box>
                        <Typography variant="body2" fontWeight={600}>
                          {user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {user.email}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip label={user.role} size="small" />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={user.status} 
                      color={getStatusColor(user.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{user.lastSeen}</TableCell>
                  <TableCell>
                    <IconButton size="small">
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

const ActivityTab = ({ activities }) => {
  const getActivityIcon = (type) => ACTIVITY_ICONS[type] || ACTIVITY_ICONS.default;

  return (
    <Card sx={{ borderRadius: 2 }}>
      <CardHeader
        title="Recent Activity"
        titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
      />
      <CardContent>
        <List>
          {activities.map((activity) => (
            <ListItem key={activity.id} divider>
              <ListItemIcon>
                {getActivityIcon(activity.type)}
              </ListItemIcon>
              <ListItemText
                primary={activity.action}
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption">
                      by {activity.user}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      • {activity.time}
                    </Typography>
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      </CardContent>
    </Card>
  );
};

const TabNavigation = ({ activeTab, onChange, isMobile }) => (
  <Card sx={{ mb: 3, borderRadius: 2 }}>
    <Tabs
      value={activeTab}
      onChange={onChange}
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
      <Tab icon={<SettingsIcon />} label="Preferences" />
      <Tab icon={<SecurityIcon />} label="Security" />
      <Tab icon={<PeopleIcon />} label="User Management" />
      <Tab icon={<TimelineIcon />} label="Activity" />
    </Tabs>
    <Divider />
  </Card>
);

const ActionButtons = ({ isEditing, saving, onCancel, onSave }) => (
  <Fade in={isEditing}>
    <Box sx={{ 
      display: "flex", 
      justifyContent: "flex-end", 
      gap: 2, 
      mt: 3,
      p: 2,
      bgcolor: 'background.paper',
      borderRadius: 2,
      boxShadow: (theme) => theme.shadows[1]
    }}>
      <Button
        variant="outlined"
        onClick={onCancel}
        disabled={saving}
        sx={{ px: 4, py: 1, borderRadius: 2 }}
      >
        Cancel
      </Button>
      <Button
        variant="contained"
        startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
        onClick={onSave}
        disabled={saving}
        sx={{ px: 4, py: 1, borderRadius: 2 }}
      >
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </Box>
  </Fade>
);

const AdminProfile = () => {
  const { user, logout } = useAuth();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
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
    darkMode: false,
    twoFactorEnabled: false,
    profilePicture: null
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [users, setUsers] = useState([]);
  const [activities, setActivities] = useState([]);
  const [sessions, setSessions] = useState([]);

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

    // Load mock data
    setUsers(generateMockUsers());
    setActivities(generateMockActivities());
    setSessions(generateMockSessions());

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
            darkMode: data.darkMode ?? false,
            twoFactorEnabled: data.twoFactorEnabled ?? false,
            profilePicture: data.profilePicture || null
          });
        } else {
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
            darkMode: false,
            twoFactorEnabled: false,
            profilePicture: null,
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
    const docRef = doc(firestore, "admins", user.uid);
    getDoc(docRef).then(docSnap => {
      if (docSnap.exists()) {
        setProfile(docSnap.data());
      }
    });
  };

  const handleProfilePictureUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        handleChange('profilePicture', e.target.result);
      };
      reader.readAsDataURL(file);
    }
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 0:
        return <PersonalInfoTab profile={profile} isEditing={isEditing} onChange={handleChange} />;
      case 1:
        return <PreferencesTab profile={profile} isEditing={isEditing} onChange={handleChange} />;
      case 2:
        return <SecurityTab profile={profile} isEditing={isEditing} onChange={handleChange} sessions={sessions} />;
      case 3:
        return <UserManagementTab users={users} />;
      case 4:
        return <ActivityTab activities={activities} />;
      default:
        return null;
    }
  };

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
        
        <Container maxWidth="xl" sx={{ px: { xs: 0, sm: 2 } }}>
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

          <ProfileHeader 
            profile={profile} 
            isEditing={isEditing} 
            onEdit={() => setIsEditing(true)}
            onPhotoUpload={handleProfilePictureUpload}
            theme={theme}
          />

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

          <TabNavigation 
            activeTab={activeTab} 
            onChange={handleTabChange} 
            isMobile={isMobile} 
          />

          <Grid container spacing={3}>
            <Grid item xs={12}>
              {renderTabContent()}
            </Grid>
          </Grid>

          {isEditing && (
            <ActionButtons 
              isEditing={isEditing}
              saving={saving}
              onCancel={handleCancelEdit}
              onSave={handleSave}
            />
          )}

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
              sx={{ borderRadius: 2, boxShadow: theme.shadows[3] }}
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