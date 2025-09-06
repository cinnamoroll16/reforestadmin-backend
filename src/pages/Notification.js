import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Badge,
  Grid,
  useMediaQuery,
  useTheme,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Alert,
  CircularProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  alpha,
  Toolbar
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Person as PersonIcon,
  Park as TreeIcon
} from '@mui/icons-material';
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';
import { auth } from '../firebase.js';

const drawerWidth = 240;

// Mock data for demonstration
const mockNotifications = [
  {
    notif_id: 'N001',
    user_id: 'user123',
    notif_message: 'New planting request from John Doe for North Forest Reserve',
    notif_timestamp: '2024-03-15T10:30:00',
    notification_type: 'planting_request',
    status: 'unread',
    location: 'North Forest Reserve',
    proposed_date: '2024-03-25',
    tree_species: 'Oak',
    planter_name: 'John Doe'
  },
  {
    notif_id: 'N002',
    user_id: 'admin001',
    notif_message: 'System maintenance scheduled for tomorrow at 2:00 AM',
    notif_timestamp: '2024-03-15T09:15:00',
    notification_type: 'system_update',
    status: 'read'
  },
  {
    notif_id: 'N003',
    user_id: 'officer456',
    notif_message: 'Reminder: Your planting task at South Park is due in 3 days',
    notif_timestamp: '2024-03-15T08:45:00',
    notification_type: 'reminder',
    status: 'unread',
    task_id: 'T002',
    due_date: '2024-03-18'
  },
  {
    notif_id: 'N004',
    user_id: 'user789',
    notif_message: 'Weather alert: Heavy rain expected in East Region tomorrow',
    notif_timestamp: '2024-03-14T16:20:00',
    notification_type: 'alert',
    status: 'read',
    severity: 'high',
    affected_area: 'East Region'
  },
  {
    notif_id: 'N005',
    user_id: 'user123',
    notif_message: 'Your planting request has been approved and assigned to Officer Brown',
    notif_timestamp: '2024-03-14T14:30:00',
    notification_type: 'approval',
    status: 'read',
    task_id: 'T001',
    assigned_officer: 'Officer Brown'
  }
];

const Notification = () => {
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [mobileOpen, setMobileOpen] = useState(false);
  
  const user = auth.currentUser;
  const handleLogout = () => auth.signOut();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setNotifications(mockNotifications);
      setFilteredNotifications(mockNotifications);
      setLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [tabValue, notifications]);

  const filterNotifications = () => {
    let filtered = notifications;
    
    switch (tabValue) {
      case 1: // Unread
        filtered = notifications.filter(notif => notif.status === 'unread');
        break;
      case 2: // Planting Requests
        filtered = notifications.filter(notif => notif.notification_type === 'planting_request');
        break;
      case 3: // Alerts
        filtered = notifications.filter(notif => 
          notif.notification_type === 'alert' || notif.notification_type === 'reminder'
        );
        break;
      default: // All
        filtered = notifications;
    }
    
    setFilteredNotifications(filtered);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleMarkAsRead = (notifId) => {
    const updatedNotifications = notifications.map(notif =>
      notif.notif_id === notifId ? { ...notif, status: 'read' } : notif
    );
    setNotifications(updatedNotifications);
    setAlert({
      open: true,
      message: 'Notification marked as read',
      severity: 'success'
    });
  };

  const handleDeleteNotification = (notifId) => {
    const updatedNotifications = notifications.filter(notif => notif.notif_id !== notifId);
    setNotifications(updatedNotifications);
    setAlert({
      open: true,
      message: 'Notification deleted',
      severity: 'info'
    });
  };

  const handleViewDetails = (notification) => {
    setSelectedNotification(notification);
    setOpenDialog(true);
    // Mark as read when viewing details
    if (notification.status === 'unread') {
      handleMarkAsRead(notification.notif_id);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setNotifications(mockNotifications);
      setLoading(false);
      setAlert({
        open: true,
        message: 'Notifications refreshed',
        severity: 'info'
      });
    }, 800);
  };

  const handleApproveRequest = () => {
    if (selectedNotification) {
      const updatedNotifications = notifications.map(notif =>
        notif.notif_id === selectedNotification.notif_id
          ? { ...notif, status: 'read' }
          : notif
      );
      setNotifications(updatedNotifications);
      setOpenDialog(false);
      setAlert({
        open: true,
        message: 'Planting request approved successfully',
        severity: 'success'
      });
    }
  };

  const handleRejectRequest = () => {
    if (selectedNotification) {
      const updatedNotifications = notifications.map(notif =>
        notif.notif_id === selectedNotification.notif_id
          ? { ...notif, status: 'read' }
          : notif
      );
      setNotifications(updatedNotifications);
      setOpenDialog(false);
      setAlert({
        open: true,
        message: 'Planting request rejected',
        severity: 'warning'
      });
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'alert':
        return <WarningIcon color="error" />;
      case 'reminder':
        return <InfoIcon color="warning" />;
      case 'planting_request':
        return <AssignmentIcon color="primary" />;
      case 'system_update':
        return <InfoIcon color="info" />;
      case 'approval':
        return <CheckCircleIcon color="success" />;
      default:
        return <NotificationsIcon />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'alert':
        return 'error';
      case 'reminder':
        return 'warning';
      case 'planting_request':
        return 'primary';
      case 'system_update':
        return 'info';
      case 'approval':
        return 'success';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const unreadCount = notifications.filter(notif => notif.status === 'unread').length;

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* App Bar */}
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />

      {/* Side Navigation */}
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` }, minWidth: 0 }}>
        <Toolbar /> {/* Spacing for app bar */}
        
        <Box sx={{ width: '100%' }}>
          {/* Alert */}
          {alert.open && (
            <Alert
              severity={alert.severity}
              onClose={() => setAlert({ ...alert, open: false })}
              sx={{ mb: 3, borderRadius: 2 }}
            >
              {alert.message}
            </Alert>
          )}

          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600 }}>
              Notification Center
            </Typography>
            <Button 
              variant="outlined" 
              startIcon={<RefreshIcon />} 
              onClick={handleRefresh}
              disabled={loading}
              size="small"
            >
              Refresh
            </Button>
          </Box>

          {/* Tabs */}
          <Paper sx={{ mb: 3, borderRadius: 2, boxShadow: 2 }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{
                '& .MuiTab-root': {
                  minHeight: 60,
                }
              }}
            >
              <Tab label="All Notifications" />
              <Tab label={
                <Badge badgeContent={unreadCount} color="error">
                  Unread
                </Badge>
              } />
              <Tab label="Planting Requests" />
              <Tab label="Alerts & Reminders" />
            </Tabs>
          </Paper>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : filteredNotifications.length === 0 ? (
            <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2 }}>
              <Typography color="text.secondary">
                No notifications found
              </Typography>
            </Paper>
          ) : (
            <Grid container spacing={3}>
              <Grid item xs={12} md={9}>
                <Paper sx={{ borderRadius: 2, boxShadow: 2, overflow: 'hidden' }}>
                  <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 2 }}>
                    <Typography variant="h6">
                      Notifications List
                    </Typography>
                  </Box>
                  <List sx={{ maxHeight: 600, overflow: 'auto' }}>
                    {filteredNotifications.map((notification, index) => (
                      <React.Fragment key={notification.notif_id}>
                        <ListItem 
                          button 
                          onClick={() => handleViewDetails(notification)}
                          sx={{
                            bgcolor: notification.status === 'unread' ? alpha(theme.palette.info.main, 0.1) : 'transparent',
                            '&:hover': { bgcolor: 'action.selected' },
                            py: 2
                          }}
                        >
                          <ListItemIcon>
                            {getNotificationIcon(notification.notification_type)}
                          </ListItemIcon>
                          <ListItemText
                            primary={notification.notif_message}
                            secondary={formatDate(notification.notif_timestamp)}
                            primaryTypographyProps={{
                              fontWeight: notification.status === 'unread' ? 'bold' : 'normal',
                              color: notification.status === 'unread' ? 'text.primary' : 'text.secondary'
                            }}
                            secondaryTypographyProps={{
                              sx: { mt: 0.5 }
                            }}
                          />
                          <ListItemSecondaryAction>
                            <IconButton
                              edge="end"
                              onClick={() => handleMarkAsRead(notification.notif_id)}
                              disabled={notification.status === 'read'}
                              size="small"
                              sx={{ mr: 1 }}
                            >
                              <CheckCircleIcon />
                            </IconButton>
                            <IconButton
                              edge="end"
                              onClick={() => handleDeleteNotification(notification.notif_id)}
                              size="small"
                            >
                              <DeleteIcon />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                        {index < filteredNotifications.length - 1 && <Divider />}
                      </React.Fragment>
                    ))}
                  </List>
                </Paper>
              </Grid>

              <Grid item xs={12} md={3}>
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
                  <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', mb: 3 }}>
                    Notification Statistics
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6} md={12}>
                      <Card sx={{ borderRadius: 2, mb: 2 }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="primary" fontWeight="bold">
                            {notifications.length}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">Total Notifications</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={12}>
                      <Card sx={{ borderRadius: 2, mb: 2 }}>
                        <CardContent sx={{ textAlign: 'center' }}>
                          <Typography variant="h4" color="error" fontWeight="bold">
                            {unreadCount}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">Unread</Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12}>
                      <Card sx={{ borderRadius: 2 }}>
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                            By Type
                          </Typography>
                          {Object.entries(
                            notifications.reduce((acc, notif) => {
                              acc[notif.notification_type] = (acc[notif.notification_type] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([type, count]) => (
                            <Box key={type} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                              <Chip
                                label={type.replace('_', ' ')}
                                size="small"
                                color={getNotificationColor(type)}
                                variant="outlined"
                                sx={{ textTransform: 'capitalize' }}
                              />
                              <Typography variant="body2" fontWeight="bold">
                                {count}
                              </Typography>
                            </Box>
                          ))}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Notification Details Dialog */}
          <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <NotificationsIcon />
                Notification Details
                {selectedNotification && (
                  <Chip
                    label={selectedNotification.notification_type.replace('_', ' ')}
                    color={getNotificationColor(selectedNotification.notification_type)}
                    size="small"
                    sx={{ ml: 2, textTransform: 'capitalize', color: 'white' }}
                  />
                )}
              </Box>
            </DialogTitle>
            <DialogContent>
              {selectedNotification && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                      Message
                    </Typography>
                    <Typography variant="body1" paragraph sx={{ p: 1.5, bgcolor: 'grey.50', borderRadius: 1 }}>
                      {selectedNotification.notif_message}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <PersonIcon color="action" fontSize="small" />
                      <Typography variant="subtitle2" color="text.secondary">
                        User ID:
                      </Typography>
                    </Box>
                    <Typography variant="body1">{selectedNotification.user_id}</Typography>
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <CalendarIcon color="action" fontSize="small" />
                      <Typography variant="subtitle2" color="text.secondary">
                        Timestamp:
                      </Typography>
                    </Box>
                    <Typography variant="body1">
                      {formatDate(selectedNotification.notif_timestamp)}
                    </Typography>
                  </Grid>

                  {selectedNotification.location && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LocationIcon color="action" fontSize="small" />
                        <Typography variant="subtitle2" color="text.secondary">
                          Location:
                        </Typography>
                      </Box>
                      <Typography variant="body1">{selectedNotification.location}</Typography>
                    </Grid>
                  )}

                  {selectedNotification.proposed_date && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <CalendarIcon color="action" fontSize="small" />
                        <Typography variant="subtitle2" color="text.secondary">
                          Proposed Date:
                        </Typography>
                      </Box>
                      <Typography variant="body1">
                        {new Date(selectedNotification.proposed_date).toLocaleDateString()}
                      </Typography>
                    </Grid>
                  )}

                  {selectedNotification.tree_species && (
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <TreeIcon color="action" fontSize="small" />
                        <Typography variant="subtitle2" color="text.secondary">
                          Tree Species:
                        </Typography>
                      </Box>
                      <Typography variant="body1">{selectedNotification.tree_species}</Typography>
                    </Grid>
                  )}

                  {selectedNotification.planter_name && (
                    <Grid item xs={12}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <PersonIcon color="action" fontSize="small" />
                        <Typography variant="subtitle2" color="text.secondary">
                          Planter Name:
                        </Typography>
                      </Box>
                      <Typography variant="body1">{selectedNotification.planter_name}</Typography>
                    </Grid>
                  )}
                </Grid>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setOpenDialog(false)} color="inherit">
                Close
              </Button>
              {selectedNotification?.notification_type === 'planting_request' && (
                <>
                  <Button onClick={handleRejectRequest} color="error">
                Reject
                  </Button>
                  <Button onClick={handleApproveRequest} variant="contained" sx={{ bgcolor: '#2e7d32' }}>
                Approve Request
                  </Button>
                </>
              )}
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
};

export default Notification;