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
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Badge,
  Link,
  CardActions,
  ListItemIcon,
} from "@mui/material";
import {
  Save as SaveIcon,
  AdminPanelSettings as AdminIcon,
  Person as PersonIcon,
  Settings as SettingsIcon,
  Security as SecurityIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  People as PeopleIcon,
  Warning as WarningIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Business as BusinessIcon,
  Notifications as NotificationsIcon,
  Lock as LockIcon,
  Refresh as RefreshIcon,
  History as HistoryIcon,
  Download as DownloadIcon,
  Logout as LogoutIcon,
  Help as HelpIcon,
  BugReport as BugReportIcon,
  SensorOccupied as SensorIcon,
  Grass as EcoIcon,
  Assessment as ReportIcon,
  Build as ConfigIcon,
  DarkMode as DarkModeIcon,
  LightMode as LightModeIcon,
  Login as LoginIcon,
  Computer as ComputerIcon,
  Public as PublicIcon,
} from "@mui/icons-material";
import { 
  doc, getDoc, setDoc, onSnapshot, collection, 
  query, updateDoc, getDocs, serverTimestamp,
  where, orderBy, limit
} from "firebase/firestore";
import { auth, firestore } from "../firebase.js";
import ReForestAppBar from "./AppBar.js";
import Navigation from "./Navigation.js";
import { useAuth } from '../context/AuthContext.js';

function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`admin-tabpanel-${index}`}
      aria-labelledby={`admin-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const AdminProfile = () => {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState({
    user_firstname: "",
    user_lastname: "",
    user_email: "",
    phone: "",
    organization: "",
    designation: "",
    department: "",
    notifications: true,
    twoFactor: false,
    theme: "light",
    dashboardLayout: "default",
  });
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loginHistory, setLoginHistory] = useState([]);
  const [activeSessions, setActiveSessions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [adminDeactivateDialogOpen, setAdminDeactivateDialogOpen] = useState(false);
  const [changePasswordDialogOpen, setChangePasswordDialogOpen] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  // Load admin profile and user data
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        // Load admin profile from users collection
        const userDocRef = doc(firestore, "users", user.uid);
        const userUnsubscribe = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              setProfile({
                user_firstname: data.user_firstname || "",
                user_lastname: data.user_lastname || "",
                user_email: data.user_email || user.email || "",
                phone: data.phone || "",
                organization: data.organization || "DENR",
                designation: data.designation || "System Administrator",
                department: data.department || "Administration",
                notifications: data.notifications ?? true,
                twoFactor: data.twoFactor ?? false,
                theme: data.theme || "light",
                dashboardLayout: data.dashboardLayout || "default",
                deactivated: data.deactivated || false,
                lastLogin: data.lastLogin || null,
              });
            }
          },
          (error) => {
            console.error("Error loading admin profile:", error);
          }
        );

        // Load roles
        const rolesSnapshot = await getDocs(collection(firestore, "roles"));
        const rolesData = rolesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRoles(rolesData);

        // Load all users
        const usersQuery = query(collection(firestore, "users"));
        const usersUnsubscribe = onSnapshot(usersQuery, (snapshot) => {
          const usersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setUsers(usersData);
        });

        // Load login history
        const loginHistoryQuery = query(
          collection(firestore, "loginHistory"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc"),
          limit(10)
        );
        const loginHistoryUnsubscribe = onSnapshot(loginHistoryQuery, (snapshot) => {
          const historyData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setLoginHistory(historyData);
        });

        // Load audit logs for current user
        const auditLogsQuery = query(
          collection(firestore, "auditLogs"),
          where("userId", "==", user.uid),
          orderBy("timestamp", "desc"),
          limit(20)
        );
        const auditLogsUnsubscribe = onSnapshot(auditLogsQuery, (snapshot) => {
          const logsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setAuditLogs(logsData);
        });

        setLoading(false);

        return () => {
          userUnsubscribe();
          usersUnsubscribe();
          loginHistoryUnsubscribe();
          auditLogsUnsubscribe();
        };
      } catch (error) {
        setError("Failed to load data");
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Get role name from roleRef
  const getRoleName = (roleRef) => {
    if (!roleRef) return "Unknown";
    const roleId = roleRef.split('/').pop();
    const role = roles.find(r => r.id === roleId);
    return role ? role.role_name : "Unknown";
  };

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  // Save admin profile
  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);

    try {
      const userDocRef = doc(firestore, "users", user.uid);
      await updateDoc(userDocRef, {
        user_firstname: profile.user_firstname,
        user_lastname: profile.user_lastname,
        user_email: profile.user_email,
        phone: profile.phone,
        organization: profile.organization,
        designation: profile.designation,
        department: profile.department,
        notifications: profile.notifications,
        twoFactor: profile.twoFactor,
        theme: profile.theme,
        dashboardLayout: profile.dashboardLayout,
        lastUpdated: serverTimestamp(),
      });
      
      setSuccess("Profile updated successfully");
    } catch (error) {
      setError("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    // Implement password change logic here
    setSuccess("Password changed successfully");
    setChangePasswordDialogOpen(false);
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  };

  // Deactivate/Reactivate user account
  const handleDeactivateUser = async (userId, deactivate = true) => {
    try {
      const userDocRef = doc(firestore, "users", userId);
      await updateDoc(userDocRef, {
        deactivated: deactivate,
        deactivatedAt: deactivate ? serverTimestamp() : null,
        deactivatedBy: deactivate ? user.uid : null,
        lastUpdated: serverTimestamp()
      });

      setSuccess(`User ${deactivate ? 'deactivated' : 'reactivated'} successfully`);
      setDeactivateDialogOpen(false);
      setSelectedUser(null);
    } catch (error) {
      setError(`Failed to ${deactivate ? 'deactivate' : 'reactivate'} user`);
    }
  };

  // Deactivate admin account (current user)
  const handleDeactivateAdmin = async () => {
    try {
      const userDocRef = doc(firestore, "users", user.uid);
      await updateDoc(userDocRef, {
        deactivated: true,
        deactivatedAt: serverTimestamp(),
        deactivatedBy: user.uid,
        lastUpdated: serverTimestamp()
      });

      setSuccess("Your admin account has been deactivated");
      setAdminDeactivateDialogOpen(false);
      // Logout after deactivation
      setTimeout(() => logout(), 2000);
    } catch (error) {
      setError("Failed to deactivate admin account");
    }
  };

  // Revoke active session
  const handleRevokeSession = async (sessionId) => {
    // Implement session revocation logic
    setSuccess("Session revoked successfully");
  };

  // Download activity logs
  const handleDownloadLogs = () => {
    const logsData = JSON.stringify(auditLogs, null, 2);
    const blob = new Blob([logsData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const openDeactivateDialog = (user, deactivate = true) => {
    setSelectedUser(user);
    setDeactivateDialogOpen(true);
  };

  // Admin Tools Quick Links
  const adminTools = [
    { icon: <SensorIcon />, label: "Manage Sensors", path: "/sensors" },
    { icon: <EcoIcon />, label: "Manage Planting Requests", path: "/planting-requests" },
    { icon: <ReportIcon />, label: "View Reports", path: "/reports" },
    { icon: <ConfigIcon />, label: "System Configurations", path: "/config" },
  ];

  if (loading) {
    return (
      <Box sx={{ display: "flex", minHeight: "100vh" }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - 240px)` } }}>
          <Toolbar />
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
            <CircularProgress size={40} />
            <Typography variant="h6" sx={{ ml: 2 }}>Loading Administrator Profile...</Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  if (!user) {
    return (
      <Box sx={{ display: "flex" }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - 240px)` } }}>
          <Toolbar />
          <Alert severity="warning">Please log in to access administrator features.</Alert>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", bgcolor: "grey.50", minHeight: "100vh" }}>
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} />
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - 240px)` } }}>
        <Toolbar />
        
        <Container maxWidth="lg" sx={{ py: 2 }}>
          {/* Header Section */}
          <Paper sx={{ p: 4, mb: 4, borderRadius: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: 'wrap', gap: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                <Avatar 
                  sx={{ 
                    width: 80, 
                    height: 80, 
                    mr: 3,
                    bgcolor: 'primary.main',
                    fontSize: '2rem',
                    fontWeight: 600
                  }}
                >
                  <AdminIcon fontSize="large" />
                </Avatar>
                <Box>
                  <Typography variant="h4" fontWeight="600" gutterBottom>
                    {profile.user_firstname} {profile.user_lastname}
                  </Typography>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: 'wrap', mb: 1 }}>
                    <Chip
                      icon={<AdminIcon />}
                      label="System Administrator"
                      color="primary"
                      variant="filled"
                    />
                    <Chip 
                      label={profile.department} 
                      variant="outlined"
                      icon={<BusinessIcon />}
                    />
                    {profile.deactivated && (
                      <Chip 
                        icon={<BlockIcon />}
                        label="Account Deactivated"
                        color="error"
                      />
                    )}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    <EmailIcon sx={{ fontSize: 16, mr: 0.5 }} />
                    {profile.user_email} • 
                    <PhoneIcon sx={{ fontSize: 16, mx: 0.5 }} />
                    {profile.phone || 'Not provided'} • 
                    <BusinessIcon sx={{ fontSize: 16, mx: 0.5 }} />
                    {profile.organization}
                  </Typography>
                  {profile.lastLogin && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      <LoginIcon sx={{ fontSize: 16, mr: 0.5 }} />
                      Last login: {new Date(profile.lastLogin.toDate()).toLocaleString()}
                    </Typography>
                  )}
                </Box>
              </Box>
              
              <Button 
                variant="outlined" 
                color="error"
                startIcon={<BlockIcon />}
                onClick={() => setAdminDeactivateDialogOpen(true)}
                disabled={profile.deactivated}
              >
                Deactivate Account
              </Button>
            </Box>
          </Paper>

          {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

          {/* Admin Tools Quick Links */}
          <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="600" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <SettingsIcon sx={{ mr: 1 }} />
              Admin Tools
            </Typography>
            <Grid container spacing={2}>
              {adminTools.map((tool, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer', 
                      transition: 'all 0.2s',
                      '&:hover': { 
                        transform: 'translateY(-2px)',
                        boxShadow: 4
                      }
                    }}
                    onClick={() => window.location.href = tool.path}
                  >
                    <CardContent sx={{ textAlign: 'center', py: 3 }}>
                      <Box sx={{ color: 'primary.main', mb: 1 }}>
                        {tool.icon}
                      </Box>
                      <Typography variant="body2" fontWeight="500">
                        {tool.label}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>

          {/* Main Content Tabs */}
          <Paper sx={{
            borderRadius: 2,
            p: 3,
            width: "100%",        // take full width of parent
            maxWidth: "1400px",   // widen the content area (adjust value as needed)
            mx: "auto"            // center horizontally
          }}>
            <Tabs 
              value={tabValue} 
              onChange={(e, newValue) => setTabValue(newValue)}
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                '& .MuiTab-root': { fontWeight: 600 }
              }}
            >
              <Tab icon={<PersonIcon />} label="Profile Settings" />
              <Tab icon={<PeopleIcon />} label="User Management" />
              <Tab icon={<SecurityIcon />} label="Security & Audit" />
              <Tab icon={<SettingsIcon />} label="Preferences" />
              <Tab icon={<HelpIcon />} label="Support" />
            </Tabs>

            {/* Profile Settings Tab */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={2} justifyContent="center" alignItems="flex-start">
                <Grid item xs={12} md={9}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent
                    sx={{
                      width: "100%",        // let it expand fully
                      maxWidth: "1200px",    // control how wide the form should be (adjust as needed)
                      mx: "auto"            // center horizontally inside parent
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <PersonIcon color="primary" sx={{ mr: 2 }} />
                        <Typography variant="h6" fontWeight="600">Personal Information</Typography>
                      </Box>
                      
                      <Stack spacing={3}>
                        <TextField
                          fullWidth
                          label="First Name"
                          value={profile.user_firstname}
                          onChange={(e) => handleChange("user_firstname", e.target.value)}
                        />
                        
                        <TextField
                          fullWidth
                          label="Last Name"
                          value={profile.user_lastname}
                          onChange={(e) => handleChange("user_lastname", e.target.value)}
                        />
                        
                        <TextField
                          fullWidth
                          label="Email Address"
                          type="email"
                          value={profile.user_email}
                          onChange={(e) => handleChange("user_email", e.target.value)}
                          InputProps={{
                            startAdornment: (
                              <EmailIcon color="action" sx={{ mr: 1 }} />
                            ),
                          }}
                        />
                        
                        <TextField
                          fullWidth
                          label="Phone Number"
                          value={profile.phone}
                          onChange={(e) => handleChange("phone", e.target.value)}
                          InputProps={{
                            startAdornment: (
                              <PhoneIcon color="action" sx={{ mr: 1 }} />
                            ),
                          }}
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                  <Stack spacing={3}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                          <BusinessIcon color="primary" sx={{ mr: 2 }} />
                          <Typography variant="h6" fontWeight="600">Organization Details</Typography>
                        </Box>
                        
                        <Stack spacing={2}>
                          <TextField
                            fullWidth
                            label="Organization"
                            value={profile.organization}
                            onChange={(e) => handleChange('organization', e.target.value)}
                          />
                          
                          <TextField
                            fullWidth
                            label="Designation"
                            value={profile.designation}
                            onChange={(e) => handleChange('designation', e.target.value)}
                          />
                          
                          <FormControl fullWidth>
                            <InputLabel>Department</InputLabel>
                            <Select
                              value={profile.department}
                              label="Department"
                              onChange={(e) => handleChange('department', e.target.value)}
                            >
                              <MenuItem value="Administration">Administration</MenuItem>
                              <MenuItem value="IT Management">IT Management</MenuItem>
                              <MenuItem value="System Administration">System Administration</MenuItem>
                              <MenuItem value="User Management">User Management</MenuItem>
                              <MenuItem value="Security">Security</MenuItem>
                              <MenuItem value="DENR Operations">DENR Operations</MenuItem>
                            </Select>
                          </FormControl>
                        </Stack>
                      </CardContent>
                    </Card>
                  </Stack>
                </Grid>
              </Grid>

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={saving || profile.deactivated}
                  sx={{ px: 4 }}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </Box>
            </TabPanel>

            {/* User Management Tab */}
            <TabPanel value={tabValue} index={1}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PeopleIcon color="primary" sx={{ mr: 2 }} />
                      <Typography variant="h6" fontWeight="600">System Users</Typography>
                    </Box>
                    <Typography color="text.secondary">
                      Total Users: {users.length}
                    </Typography>
                  </Box>

                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>User</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Role</TableCell>
                          <TableCell>Organization</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell align="center">Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {users.map((userItem) => (
                          <TableRow key={userItem.id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar sx={{ mr: 2, width: 40, height: 40 }}>
                                  {userItem.user_firstname?.[0]}{userItem.user_lastname?.[0]}
                                </Avatar>
                                <Box>
                                  <Typography fontWeight="500">
                                    {userItem.user_firstname} {userItem.user_lastname}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {userItem.designation}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>{userItem.user_email}</TableCell>
                            <TableCell>
                              <Chip 
                                label={getRoleName(userItem.roleRef)} 
                                size="small" 
                                color={
                                  userItem.roleRef?.includes('admin') ? 'primary' : 
                                  userItem.roleRef?.includes('denr') ? 'secondary' : 'default'
                                }
                              />
                            </TableCell>
                            <TableCell>{userItem.organization}</TableCell>
                            <TableCell>
                              <Chip 
                                label={userItem.deactivated ? "Deactivated" : "Active"} 
                                color={userItem.deactivated ? "error" : "success"}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              {userItem.id !== user.uid && ( // Cannot deactivate self
                                <Tooltip title={userItem.deactivated ? "Reactivate User" : "Deactivate User"}>
                                  <IconButton
                                    color={userItem.deactivated ? "success" : "error"}
                                    onClick={() => userItem.deactivated ? 
                                      handleDeactivateUser(userItem.id, false) : 
                                      openDeactivateDialog(userItem, true)
                                    }
                                  >
                                    {userItem.deactivated ? <CheckCircleIcon /> : <BlockIcon />}
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  {users.length === 0 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                      <PeopleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                      <Typography variant="h6" color="text.secondary">
                        No users found
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </TabPanel>

            {/* Security & Audit Tab */}
            <TabPanel value={tabValue} index={2}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <SecurityIcon color="primary" sx={{ mr: 2 }} />
                        <Typography variant="h6" fontWeight="600">Security Settings</Typography>
                      </Box>
                      
                      <Stack spacing={2}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={profile.twoFactor}
                              onChange={(e) => handleChange('twoFactor', e.target.checked)}
                              disabled={profile.deactivated}
                            />
                          }
                          label="Two-Factor Authentication"
                        />
                        
                        <Button 
                          variant="outlined" 
                          startIcon={<LockIcon />}
                          onClick={() => setChangePasswordDialogOpen(true)}
                          disabled={profile.deactivated}
                        >
                          Change Password
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>

                  {/* Active Sessions */}
                  <Card sx={{ mt: 3 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <ComputerIcon color="primary" sx={{ mr: 2 }} />
                          <Typography variant="h6" fontWeight="600">Active Sessions</Typography>
                        </Box>
                        <Badge badgeContent={activeSessions.length} color="primary">
                          <RefreshIcon color="action" />
                        </Badge>
                      </Box>
                      
                      <List>
                        {activeSessions.map((session, index) => (
                          <ListItem key={index} divider>
                            <ListItemIcon>
                              <PublicIcon color="action" />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${session.browser} on ${session.os}`}
                              secondary={`IP: ${session.ip} • Last active: ${session.lastActive}`}
                            />
                            <ListItemSecondaryAction>
                              <Tooltip title="Revoke Session">
                                <IconButton 
                                  edge="end" 
                                  onClick={() => handleRevokeSession(session.id)}
                                  color="error"
                                >
                                  <BlockIcon />
                                </IconButton>
                              </Tooltip>
                            </ListItemSecondaryAction>
                          </ListItem>
                        ))}
                      </List>
                      
                      {activeSessions.length === 0 && (
                        <Typography color="text.secondary" textAlign="center" py={2}>
                          No active sessions
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  {/* Login History */}
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <HistoryIcon color="primary" sx={{ mr: 2 }} />
                          <Typography variant="h6" fontWeight="600">Login History</Typography>
                        </Box>
                        <Badge badgeContent={loginHistory.length} color="primary">
                          <HistoryIcon color="action" />
                        </Badge>
                      </Box>
                      
                      <List>
                        {loginHistory.map((login, index) => (
                          <ListItem key={login.id} divider>
                            <ListItemIcon>
                              <LoginIcon color={login.success ? "success" : "error"} />
                            </ListItemIcon>
                            <ListItemText
                              primary={`${login.ip} • ${login.device}`}
                              secondary={`${new Date(login.timestamp?.toDate()).toLocaleString()} • ${login.success ? 'Success' : 'Failed'}`}
                            />
                            {!login.success && (
                              <Chip label="Suspicious" color="warning" size="small" />
                            )}
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>

                  {/* Audit Logs */}
                  <Card sx={{ mt: 3 }}>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <WarningIcon color="primary" sx={{ mr: 2 }} />
                          <Typography variant="h6" fontWeight="600">Recent Activity</Typography>
                        </Box>
                        <Button 
                          startIcon={<DownloadIcon />}
                          onClick={handleDownloadLogs}
                          size="small"
                        >
                          Export
                        </Button>
                      </Box>
                      
                      <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                        {auditLogs.map((log, index) => (
                          <ListItem key={log.id} divider>
                            <ListItemText
                              primary={log.action}
                              secondary={`${new Date(log.timestamp?.toDate()).toLocaleString()} • IP: ${log.ip}`}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Preferences Tab */}
            <TabPanel value={tabValue} index={3}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <NotificationsIcon color="primary" sx={{ mr: 2 }} />
                        <Typography variant="h6" fontWeight="600">Notification Preferences</Typography>
                      </Box>
                      
                      <Stack spacing={2}>
                        <FormControlLabel
                          control={
                            <Switch
                              checked={profile.notifications}
                              onChange={(e) => handleChange('notifications', e.target.checked)}
                            />
                          }
                          label="Email Notifications"
                        />
                        <FormControlLabel
                          control={<Switch defaultChecked />}
                          label="Planting Request Alerts"
                        />
                        <FormControlLabel
                          control={<Switch defaultChecked />}
                          label="Sensor Updates"
                        />
                        <FormControlLabel
                          control={<Switch defaultChecked />}
                          label="System Maintenance Alerts"
                        />
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        {profile.theme === 'dark' ? <DarkModeIcon color="primary" /> : <LightModeIcon color="primary" />}
                        <Typography variant="h6" fontWeight="600" sx={{ ml: 2 }}>
                          Theme & Appearance
                        </Typography>
                      </Box>
                      
                      <Stack spacing={2}>
                        <FormControl fullWidth>
                          <InputLabel>Theme</InputLabel>
                          <Select
                            value={profile.theme}
                            label="Theme"
                            onChange={(e) => handleChange('theme', e.target.value)}
                          >
                            <MenuItem value="light">Light Mode</MenuItem>
                            <MenuItem value="dark">Dark Mode</MenuItem>
                            <MenuItem value="auto">Auto (System)</MenuItem>
                          </Select>
                        </FormControl>
                        
                        <FormControl fullWidth>
                          <InputLabel>Dashboard Layout</InputLabel>
                          <Select
                            value={profile.dashboardLayout}
                            label="Dashboard Layout"
                            onChange={(e) => handleChange('dashboardLayout', e.target.value)}
                          >
                            <MenuItem value="default">Default</MenuItem>
                            <MenuItem value="compact">Compact</MenuItem>
                            <MenuItem value="detailed">Detailed</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            {/* Support Tab */}
            <TabPanel value={tabValue} index={4}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <HelpIcon color="primary" sx={{ mr: 2 }} />
                        <Typography variant="h6" fontWeight="600">Help & Support</Typography>
                      </Box>
                      
                      <Stack spacing={2}>
                        <Button 
                          variant="outlined" 
                          startIcon={<HelpIcon />}
                          fullWidth
                          sx={{ justifyContent: 'flex-start' }}
                        >
                          User Documentation
                        </Button>
                        
                        <Button 
                          variant="outlined" 
                          startIcon={<BugReportIcon />}
                          fullWidth
                          sx={{ justifyContent: 'flex-start' }}
                        >
                          Report a Bug
                        </Button>
                        
                        <Button 
                          variant="outlined" 
                          startIcon={<EmailIcon />}
                          fullWidth
                          sx={{ justifyContent: 'flex-start' }}
                        >
                          Contact Support Team
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                        <WarningIcon color="warning" sx={{ mr: 2 }} />
                        <Typography variant="h6" fontWeight="600">Danger Zone</Typography>
                      </Box>
                      
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        These actions are irreversible. Proceed with caution.
                      </Alert>
                      
                      <Stack spacing={1}>
                        <Button 
                          variant="contained" 
                          color="error"
                          startIcon={<BlockIcon />}
                          onClick={() => setAdminDeactivateDialogOpen(true)}
                          disabled={profile.deactivated}
                          fullWidth
                        >
                          Deactivate My Account
                        </Button>
                        
                        <Button 
                          variant="outlined"
                          startIcon={<LogoutIcon />}
                          onClick={logout}
                          fullWidth
                        >
                          Log Out
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
          </Paper>
        </Container>

        {/* Change Password Dialog */}
        <Dialog open={changePasswordDialogOpen} onClose={() => setChangePasswordDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Change Password</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                fullWidth
                type="password"
                label="Current Password"
                value={passwordData.currentPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              />
              <TextField
                fullWidth
                type="password"
                label="New Password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
              />
              <TextField
                fullWidth
                type="password"
                label="Confirm New Password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setChangePasswordDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleChangePassword}
              variant="contained"
              disabled={!passwordData.currentPassword || !passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword}
            >
              Change Password
            </Button>
          </DialogActions>
        </Dialog>

        {/* User Deactivation Dialog */}
        <Dialog open={deactivateDialogOpen} onClose={() => setDeactivateDialogOpen(false)}>
          <DialogTitle>Confirm User Deactivation</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to deactivate {selectedUser?.user_firstname} {selectedUser?.user_lastname}?
            </Typography>
            <Alert severity="warning" sx={{ mt: 2 }}>
              This user will no longer be able to access the system. Their data will be preserved.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeactivateDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => handleDeactivateUser(selectedUser?.id, true)} 
              color="error"
              variant="contained"
            >
              Deactivate User
            </Button>
          </DialogActions>
        </Dialog>

        {/* Admin Self-Deactivation Dialog */}
        <Dialog open={adminDeactivateDialogOpen} onClose={() => setAdminDeactivateDialogOpen(false)}>
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <WarningIcon color="error" sx={{ mr: 2 }} />
              Deactivate Administrator Account
            </Box>
          </DialogTitle>
          <DialogContent>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="h6" gutterBottom>
                Critical Action
              </Typography>
              <Typography>
                You are about to deactivate your own administrator account. This action will:
              </Typography>
              <ul>
                <li>Immediately log you out of the system</li>
                <li>Prevent future login attempts</li>
                <li>Preserve all your data and activities</li>
                <li>Require another administrator to reactivate your account</li>
              </ul>
            </Alert>
            <Typography>
              Are you absolutely sure you want to proceed?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setAdminDeactivateDialogOpen(false)} variant="outlined">
              Cancel
            </Button>
            <Button 
              onClick={handleDeactivateAdmin} 
              color="error"
              variant="contained"
              startIcon={<BlockIcon />}
            >
              Yes, Deactivate My Account
            </Button>
          </DialogActions>
        </Dialog>

        {/* Notifications */}
        <Snackbar
          open={success}
          autoHideDuration={4000}
          onClose={() => setSuccess(false)}
        >
          <Alert severity="success" onClose={() => setSuccess(false)}>
            {success}
          </Alert>
        </Snackbar>

        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
        >
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default AdminProfile;