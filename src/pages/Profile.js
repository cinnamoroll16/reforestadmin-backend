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
} from "@mui/icons-material";
import { 
  doc, getDoc, setDoc, onSnapshot, collection, 
  query, updateDoc, getDocs, serverTimestamp 
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
    department: "",
    notifications: true,
    twoFactor: false,
  });
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [adminDeactivateDialogOpen, setAdminDeactivateDialogOpen] = useState(false);

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
                department: data.department || "Administration",
                notifications: data.notifications ?? true,
                twoFactor: data.twoFactor ?? false,
                deactivated: data.deactivated || false,
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

        setLoading(false);

        return () => {
          userUnsubscribe();
          usersUnsubscribe();
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
        department: profile.department,
        notifications: profile.notifications,
        twoFactor: profile.twoFactor,
        lastUpdated: serverTimestamp(),
      });
      
      setSuccess("Profile updated successfully");
    } catch (error) {
      setError("Failed to save profile");
    } finally {
      setSaving(false);
    }
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

  const openDeactivateDialog = (user, deactivate = true) => {
    setSelectedUser(user);
    setDeactivateDialogOpen(true);
  };

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
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
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
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: 'wrap' }}>
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

          {/* Main Content Tabs */}
          <Paper sx={{ borderRadius: 2 }}>
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
              <Tab icon={<SecurityIcon />} label="Security" />
            </Tabs>

            {/* Profile Settings Tab */}
            <TabPanel value={tabValue} index={0}>
              <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
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
                          InputProps={{
                            startAdornment: (
                              <PersonIcon color="action" sx={{ mr: 1 }} />
                            ),
                          }}
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

                <Grid item xs={12} md={6}>
                  <Stack spacing={3}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                          <BusinessIcon color="primary" sx={{ mr: 2 }} />
                          <Typography variant="h6" fontWeight="600">Department Information</Typography>
                        </Box>
                        
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
                          </Select>
                        </FormControl>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                          <NotificationsIcon color="primary" sx={{ mr: 2 }} />
                          <Typography variant="h6" fontWeight="600">Notification Preferences</Typography>
                        </Box>
                        
                        <FormControlLabel
                          control={
                            <Switch
                              checked={profile.notifications}
                              onChange={(e) => handleChange('notifications', e.target.checked)}
                            />
                          }
                          label="Receive email notifications"
                        />
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
                                    ID: {userItem.id}
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

            {/* Security Tab */}
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
                          disabled={profile.deactivated}
                        >
                          Change Password
                        </Button>
                        
                        <Button 
                          variant="outlined" 
                          startIcon={<SecurityIcon />}
                          disabled={profile.deactivated}
                        >
                          View Security Logs
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
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>
          </Paper>
        </Container>

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