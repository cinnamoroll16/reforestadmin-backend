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
  doc, 
  setDoc, 
  onSnapshot, 
  collection, 
  query, 
  updateDoc, 
  getDocs, 
  serverTimestamp,
  where, 
  orderBy, 
  limit
} from "firebase/firestore";
import { firestore } from "../firebase.js";
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
    user_middlename: "",
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
    deactivated: false,
    lastLogin: null,
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

    let unsubscribers = []; // Store all unsubscribe functions

    const loadData = async () => {
      try {
        console.log('========== LOADING ADMIN PROFILE ==========');
        console.log('Current user:', user.uid);
        console.log('User email:', user.email);
        
        // Load admin profile
        const userDocRef = doc(firestore, "users", user.uid);
        const userUnsubscribe = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const data = docSnap.data();
              console.log('✓ Admin profile data loaded:', data);
              
              setProfile({
                user_firstname: data.user_Firstname || data.user_firstname || data.firstName || "",
                user_middlename: data.user_Middlename || data.user_middlename || data.middleName || "",
                user_lastname: data.user_Lastname || data.user_lastname || data.lastName || "",
                user_email: data.user_email || data.email || user.email || "",
                phone: data.phone || data.user_phone || "",
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
            } else {
              console.warn('✗ User document does not exist');
              setError('Profile not found');
            }
          },
          (error) => {
            console.error("✗ Error loading admin profile:", error);
            setError("Failed to load profile data");
          }
        );
        unsubscribers.push(userUnsubscribe);

        // Load roles
        console.log('Loading roles...');
        const rolesSnapshot = await getDocs(collection(firestore, "roles"));
        const rolesData = rolesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRoles(rolesData);
        console.log(`✓ Roles loaded: ${rolesData.length}`);

        // Load all users
        console.log('Loading users...');
        const usersQuery = query(collection(firestore, "users"));
        const usersUnsubscribe = onSnapshot(
          usersQuery, 
          (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            setUsers(usersData);
            console.log(`✓ Users loaded: ${usersData.length}`);
          },
          (error) => {
            console.error('✗ Error loading users:', error);
          }
        );
        unsubscribers.push(usersUnsubscribe);

        // Load login history (with error handling)
        console.log('Loading login history...');
        try {
          const loginHistoryQuery = query(
            collection(firestore, "loginHistory"),
            where("userId", "==", user.uid),
            orderBy("timestamp", "desc"),
            limit(10)
          );
          
          const loginHistoryUnsubscribe = onSnapshot(
            loginHistoryQuery, 
            (snapshot) => {
              const historyData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              setLoginHistory(historyData);
              console.log(`✓ Login history loaded: ${historyData.length} records`);
            },
            (error) => {
              console.warn('⚠ Login history error:', error.message);
              setLoginHistory([]);
            }
          );
          unsubscribers.push(loginHistoryUnsubscribe);
        } catch (error) {
          console.warn('⚠ Login history collection does not exist:', error.message);
          setLoginHistory([]);
        }

        // Load audit logs (with error handling)
        console.log('Loading audit logs...');
        try {
          const auditLogsQuery = query(
            collection(firestore, "auditLogs"),
            where("userId", "==", user.uid),
            orderBy("timestamp", "desc"),
            limit(20)
          );
          
          const auditLogsUnsubscribe = onSnapshot(
            auditLogsQuery,
            (snapshot) => {
              const logsData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              }));
              setAuditLogs(logsData);
              console.log(`✓ Audit logs loaded: ${logsData.length} records`);
            },
            (error) => {
              console.warn('⚠ Audit logs error:', error.message);
              setAuditLogs([]);
            }
          );
          unsubscribers.push(auditLogsUnsubscribe);
        } catch (error) {
          console.warn('⚠ Audit logs collection does not exist:', error.message);
          setAuditLogs([]);
        }

        setLoading(false);
        console.log('========== PROFILE LOADED SUCCESSFULLY ==========\n');

      } catch (error) {
        console.error("❌ Fatal error loading data:", error);
        setError("Failed to load data: " + error.message);
        setLoading(false);
      }
    };

    loadData();

    // Cleanup function - unsubscribe from all listeners
    return () => {
      console.log('🧹 Cleaning up subscriptions...');
      unsubscribers.forEach((unsubscribe, index) => {
        if (typeof unsubscribe === 'function') {
          try {
            unsubscribe();
            console.log(`✓ Unsubscribed listener ${index + 1}`);
          } catch (err) {
            console.error(`✗ Error unsubscribing listener ${index + 1}:`, err);
          }
        }
      });
    };
  }, [user]);

  // Get role name from roleRef
  const getRoleName = (roleRef) => {
    if (!roleRef) return "Unknown";
    
    try {
      // Handle both string path and DocumentReference
      const rolePath = typeof roleRef === 'string' ? roleRef : roleRef.path;
      const roleId = rolePath.split('/').filter(p => p).pop();
      
      const role = roles.find(r => r.id === roleId);
      return role ? (role.role_name || role.name || "Unknown") : "Unknown";
    } catch (error) {
      console.error('Error getting role name:', error);
      return "Unknown";
    }
  };

  const handleChange = (field, value) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  // Save admin profile
  const handleSave = async () => {
    if (!user) {
      setError('No user logged in');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const userDocRef = doc(firestore, "users", user.uid);
      
      // Use the correct Firestore field names (with capital letters to match DB schema)
      const updates = {
        user_Firstname: profile.user_firstname,
        user_Middlename: profile.user_middlename,
        user_Lastname: profile.user_lastname,
        user_email: profile.user_email,
        phone: profile.phone,
        department: profile.department,
        organization: profile.organization,
        designation: profile.designation,
        notifications: profile.notifications,
        twoFactor: profile.twoFactor,
        theme: profile.theme,
        dashboardLayout: profile.dashboardLayout,
        lastUpdated: serverTimestamp(),
      };

      console.log('Saving profile updates:', updates);
      
      await updateDoc(userDocRef, updates);
      
      setSuccess("Profile updated successfully");
      console.log('✓ Profile saved successfully');
      
      // Log audit event (optional - only if auditLogs collection exists)
      try {
        await setDoc(doc(collection(firestore, "auditLogs")), {
          userId: user.uid,
          action: "Profile updated",
          timestamp: serverTimestamp(),
          ip: "Unknown",
          details: "Admin profile information updated"
        });
        console.log('✓ Audit log created');
      } catch (auditError) {
        console.warn('⚠ Could not log audit event:', auditError.message);
      }
      
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      setError("Failed to save profile: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // Handle password change
  const handleChangePassword = async () => {
    if (!passwordData.newPassword || passwordData.newPassword !== passwordData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      // TODO: Implement actual Firebase password change
      // This requires Firebase Authentication API
      setSuccess("Password changed successfully");
      setChangePasswordDialogOpen(false);
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      setError("Failed to change password: " + error.message);
    }
  };

  // Deactivate/Reactivate user account
  const handleDeactivateUser = async (userId, deactivate = true) => {
    if (!userId) {
      setError('Invalid user ID');
      return;
    }

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
      
      console.log(`✓ User ${userId} ${deactivate ? 'deactivated' : 'reactivated'}`);
    } catch (error) {
      console.error('❌ Error updating user status:', error);
      setError(`Failed to ${deactivate ? 'deactivate' : 'reactivate'} user: ` + error.message);
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
      
      console.log('✓ Admin account deactivated');
      
      // Logout after deactivation
      setTimeout(() => {
        logout();
      }, 2000);
    } catch (error) {
      console.error('❌ Error deactivating admin:', error);
      setError("Failed to deactivate admin account: " + error.message);
    }
  };

  // Revoke active session
  const handleRevokeSession = async (sessionId) => {
    // TODO: Implement actual session revocation logic
    console.log('Revoking session:', sessionId);
    setSuccess("Session revoked successfully");
  };

  // Download activity logs
  const handleDownloadLogs = () => {
    try {
      const logsData = JSON.stringify(auditLogs, null, 2);
      const blob = new Blob([logsData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `activity-logs-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      console.log('✓ Logs downloaded');
      setSuccess("Activity logs downloaded");
    } catch (error) {
      console.error('❌ Error downloading logs:', error);
      setError("Failed to download logs");
    }
  };

  const openDeactivateDialog = (userToDeactivate) => {
    setSelectedUser(userToDeactivate);
    setDeactivateDialogOpen(true);
  };

  // Loading state
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

  // Not logged in state
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
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={logout} />
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
                    {`${profile.user_firstname} ${profile.user_middlename} ${profile.user_lastname}`.trim() || 'Admin User'}
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
                    <EmailIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    {profile.user_email} •{' '}
                    <PhoneIcon sx={{ fontSize: 16, mx: 0.5, verticalAlign: 'middle' }} />
                    {profile.phone || 'Not provided'} •{' '}
                    <BusinessIcon sx={{ fontSize: 16, mx: 0.5, verticalAlign: 'middle' }} />
                    {profile.organization}
                  </Typography>
                  {profile.lastLogin && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      <LoginIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
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

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {/* Main Content Tabs */}
          <Paper sx={{ borderRadius: 2, p: 3, width: "100%", maxWidth: "1400px", mx: "auto" }}>
            <Tabs 
              value={tabValue} 
              onChange={(e, newValue) => setTabValue(newValue)}
              variant={isMobile ? "scrollable" : "standard"}
              scrollButtons={isMobile ? "auto" : false}
              sx={{ 
                borderBottom: 1, 
                borderColor: 'divider',
                '& .MuiTab-root': { fontWeight: 600 }
              }}
            >
              <Tab icon={<PersonIcon />} label="Profile Settings" iconPosition="start" />
              <Tab icon={<PeopleIcon />} label="User Management" iconPosition="start" />
              <Tab icon={<SecurityIcon />} label="Security & Audit" iconPosition="start" />
              <Tab icon={<SettingsIcon />} label="Preferences" iconPosition="start" />
              <Tab icon={<HelpIcon />} label="Support" iconPosition="start" />
            </Tabs>

            {/* Profile Settings Tab */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                  <Card>
                    <CardContent>
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
                          disabled={profile.deactivated}
                        />

                        <TextField
                          fullWidth
                          label="Middle Name"
                          value={profile.user_middlename}
                          onChange={(e) => handleChange("user_middlename", e.target.value)}
                          disabled={profile.deactivated}
                        />
                        
                        <TextField
                          fullWidth
                          label="Last Name"
                          value={profile.user_lastname}
                          onChange={(e) => handleChange("user_lastname", e.target.value)}
                          disabled={profile.deactivated}
                        />
                        
                        <TextField
                          fullWidth
                          label="Email Address"
                          type="email"
                          value={profile.user_email}
                          onChange={(e) => handleChange("user_email", e.target.value)}
                          disabled={profile.deactivated}
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
                          disabled={profile.deactivated}
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
                          disabled={profile.deactivated}
                        />
                        
                        <TextField
                          fullWidth
                          label="Designation"
                          value={profile.designation}
                          onChange={(e) => handleChange('designation', e.target.value)}
                          disabled={profile.deactivated}
                        />
                        
                        <FormControl fullWidth disabled={profile.deactivated}>
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
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <PeopleIcon color="primary" sx={{ mr: 2 }} />
                      <Typography variant="h6" fontWeight="600">System Users</Typography>
                    </Box>
                    <Chip 
                      label={`Total Users: ${users.length}`} 
                      color="primary" 
                      variant="outlined"
                    />
                  </Box>

                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell><strong>User</strong></TableCell>
                          <TableCell><strong>Email</strong></TableCell>
                          <TableCell><strong>Role</strong></TableCell>
                          <TableCell><strong>Organization</strong></TableCell>
                          <TableCell><strong>Status</strong></TableCell>
                          <TableCell align="center"><strong>Actions</strong></TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {users.map((userItem) => {
                          // Build full name with fallback
                          const firstName = userItem.user_Firstname || userItem.user_firstname || userItem.firstName || "";
                          const middleName = userItem.user_Middlename || userItem.user_middlename || userItem.middleName || "";
                          const lastName = userItem.user_Lastname || userItem.user_lastname || userItem.lastName || "";
                          const fullName = `${firstName} ${middleName} ${lastName}`.trim() || "Unknown User";
                          const initials = `${firstName[0] || ''}${middleName[0] || ''}${lastName[0] || ''}`.toUpperCase() || '?';
                          
                          return (
                            <TableRow key={userItem.id} hover>
                              <TableCell>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <Avatar sx={{ mr: 2, width: 40, height: 40, bgcolor: 'primary.main' }}>
                                    {initials}
                                  </Avatar>
                                  <Box>
                                    <Typography fontWeight="500">{fullName}</Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {userItem.designation || userItem.role || 'N/A'}
                                    </Typography>
                                  </Box>
                                </Box>
                              </TableCell>
                              <TableCell>{userItem.user_email || userItem.email || 'N/A'}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={getRoleName(userItem.roleRef)} 
                                  size="small" 
                                  color={
                                    (userItem.roleRef?.includes('admin') || getRoleName(userItem.roleRef).toLowerCase().includes('admin')) ? 'primary' : 
                                    (userItem.roleRef?.includes('denr') || getRoleName(userItem.roleRef).toLowerCase().includes('denr')) ? 'secondary' : 'default'
                                  }
                                />
                              </TableCell>
                              <TableCell>{userItem.organization || 'N/A'}</TableCell>
                              <TableCell>
                                <Chip 
                                  label={userItem.deactivated ? "Deactivated" : "Active"} 
                                  color={userItem.deactivated ? "error" : "success"}
                                  size="small"
                                />
                              </TableCell>
                              <TableCell align="center">
                                {userItem.id !== user.uid && (
                                  <Tooltip title={userItem.deactivated ? "Reactivate User" : "Deactivate User"}>
                                    <IconButton
                                      color={userItem.deactivated ? "success" : "error"}
                                      onClick={() => userItem.deactivated ? 
                                        handleDeactivateUser(userItem.id, false) : 
                                        openDeactivateDialog(userItem)
                                      }
                                      size="small"
                                    >
                                      {userItem.deactivated ? <CheckCircleIcon /> : <BlockIcon />}
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
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
                <Grid item xs={12} md={6}>
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
                          fullWidth
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
                      
                      {activeSessions.length > 0 ? (
                        <List>
                          {activeSessions.map((session, index) => (
                            <ListItem key={index} divider={index < activeSessions.length - 1}>
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
                                    size="small"
                                  >
                                    <BlockIcon />
                                  </IconButton>
                                </Tooltip>
                              </ListItemSecondaryAction>
                            </ListItem>
                          ))}
                        </List>
                      ) : (
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
                      
                      {loginHistory.length > 0 ? (
                        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                          {loginHistory.map((login) => (
                            <ListItem key={login.id} divider>
                              <ListItemIcon>
                                <LoginIcon color={login.success ? "success" : "error"} />
                              </ListItemIcon>
                              <ListItemText
                                primary={`${login.ip || 'Unknown IP'} • ${login.device || 'Unknown Device'}`}
                                secondary={login.timestamp ? 
                                  `${new Date(login.timestamp.toDate()).toLocaleString()} • ${login.success ? 'Success' : 'Failed'}` :
                                  'Unknown time'
                                }
                              />
                              {!login.success && (
                                <Chip label="Suspicious" color="warning" size="small" />
                              )}
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Typography color="text.secondary" textAlign="center" py={2}>
                          No login history available
                        </Typography>
                      )}
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
                        {auditLogs.length > 0 && (
                          <Button 
                            startIcon={<DownloadIcon />}
                            onClick={handleDownloadLogs}
                            size="small"
                          >
                            Export
                          </Button>
                        )}
                      </Box>
                      
                      {auditLogs.length > 0 ? (
                        <List sx={{ maxHeight: 300, overflow: 'auto' }}>
                          {auditLogs.map((log) => (
                            <ListItem key={log.id} divider>
                              <ListItemText
                                primary={log.action || 'Unknown action'}
                                secondary={log.timestamp ? 
                                  `${new Date(log.timestamp.toDate()).toLocaleString()} • IP: ${log.ip || 'Unknown'}` :
                                  'Unknown time'
                                }
                              />
                            </ListItem>
                          ))}
                        </List>
                      ) : (
                        <Typography color="text.secondary" textAlign="center" py={2}>
                          No activity logs available
                        </Typography>
                      )}
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
                              disabled={profile.deactivated}
                            />
                          }
                          label="Email Notifications"
                        />
                        <FormControlLabel
                          control={<Switch defaultChecked disabled={profile.deactivated} />}
                          label="Planting Request Alerts"
                        />
                        <FormControlLabel
                          control={<Switch defaultChecked disabled={profile.deactivated} />}
                          label="Sensor Updates"
                        />
                        <FormControlLabel
                          control={<Switch defaultChecked disabled={profile.deactivated} />}
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
                        {profile.theme === 'dark' ? 
                          <DarkModeIcon color="primary" sx={{ mr: 2 }} /> : 
                          <LightModeIcon color="primary" sx={{ mr: 2 }} />
                        }
                        <Typography variant="h6" fontWeight="600">
                          Theme & Appearance
                        </Typography>
                      </Box>
                      
                      <Stack spacing={2}>
                        <FormControl fullWidth disabled={profile.deactivated}>
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
                        
                        <FormControl fullWidth disabled={profile.deactivated}>
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

              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 4 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                  onClick={handleSave}
                  disabled={saving || profile.deactivated}
                  sx={{ px: 4 }}
                >
                  {saving ? "Saving..." : "Save Preferences"}
                </Button>
              </Box>
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
                      
                      <Stack spacing={2}>
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
                          color="error"
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
        <Dialog 
          open={changePasswordDialogOpen} 
          onClose={() => setChangePasswordDialogOpen(false)} 
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>Change Password</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 2 }}>
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
                error={passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword}
                helperText={
                  passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword
                    ? "Passwords do not match"
                    : ""
                }
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setChangePasswordDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleChangePassword}
              variant="contained"
              disabled={
                !passwordData.currentPassword || 
                !passwordData.newPassword || 
                passwordData.newPassword !== passwordData.confirmPassword
              }
            >
              Change Password
            </Button>
          </DialogActions>
        </Dialog>

        {/* User Deactivation Dialog */}
        <Dialog open={deactivateDialogOpen} onClose={() => setDeactivateDialogOpen(false)}>
          <DialogTitle>Confirm User Deactivation</DialogTitle>
          <DialogContent>
            <Typography sx={{ mb: 2 }}>
              Are you sure you want to deactivate this user?
            </Typography>
            {selectedUser && (
              <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, mb: 2 }}>
                <Typography variant="body2"><strong>Name:</strong> {
                  `${selectedUser.user_Firstname || ''} ${selectedUser.user_Middlename || ''} ${selectedUser.user_Lastname || ''}`.trim() || 'Unknown User'
                }</Typography>
                <Typography variant="body2"><strong>Email:</strong> {selectedUser.user_email || selectedUser.email || 'N/A'}</Typography>
              </Box>
            )}
            <Alert severity="warning">
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

        {/* Success Snackbar */}
        <Snackbar
          open={!!success}
          autoHideDuration={4000}
          onClose={() => setSuccess(false)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity="success" onClose={() => setSuccess(false)} sx={{ width: '100%' }}>
            {success}
          </Alert>
        </Snackbar>

        {/* Error Snackbar */}
        <Snackbar
          open={!!error}
          autoHideDuration={6000}
          onClose={() => setError(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert severity="error" onClose={() => setError(null)} sx={{ width: '100%' }}>
            {error}
          </Alert>
        </Snackbar>
      </Box>
    </Box>
  );
};

export default AdminProfile;