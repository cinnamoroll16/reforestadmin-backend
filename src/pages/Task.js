// src/pages/Task.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  useMediaQuery,
  useTheme,
  IconButton,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  alpha,
  Toolbar
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Park as TreeIcon
} from '@mui/icons-material';
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';
import { auth } from '../firebase.js';

const drawerWidth = 240;

// Mock data for demonstration
const mockTasks = [
  {
    task_id: 'T001',
    planter_name: 'John Doe',
    task_location: 'North Forest Reserve',
    tree_species: 'Oak',
    schedule: '2024-03-15',
    task_assignedTo: 'Unassigned',
    task_status: 'pending',
    task_date: '2024-03-10'
  },
  {
    task_id: 'T002',
    planter_name: 'Jane Smith',
    task_location: 'South Park Area',
    tree_species: 'Maple',
    schedule: '2024-03-20',
    task_assignedTo: 'Officer Brown',
    task_status: 'approved',
    task_date: '2024-03-12'
  },
  {
    task_id: 'T003',
    planter_name: 'Mike Johnson',
    task_location: 'East River Bank',
    tree_species: 'Pine',
    schedule: '2024-03-25',
    task_assignedTo: 'Unassigned',
    task_status: 'pending',
    task_date: '2024-03-14'
  }
];

const Task = () => {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [assignedOfficer, setAssignedOfficer] = useState('');
  const [loading, setLoading] = useState(true);
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
      setTasks(mockTasks);
      setLoading(false);
    }, 1000);
  }, []);

  const handleViewDetails = (task) => {
    setSelectedTask(task);
    setAssignedOfficer(task.task_assignedTo);
    setOpenDialog(true);
  };

  const handleApprove = () => {
    if (!assignedOfficer.trim()) {
      setAlert({
        open: true,
        message: 'Please assign an officer before approving',
        severity: 'error'
      });
      return;
    }

    const updatedTasks = tasks.map(task =>
      task.task_id === selectedTask.task_id
        ? {
            ...task,
            task_status: 'approved',
            task_assignedTo: assignedOfficer
          }
        : task
    );

    setTasks(updatedTasks);
    setOpenDialog(false);
    setAlert({
      open: true,
      message: `Task ${selectedTask.task_id} approved and assigned to ${assignedOfficer}`,
      severity: 'success'
    });
  };

  const handleReject = () => {
    const updatedTasks = tasks.map(task =>
      task.task_id === selectedTask.task_id
        ? { ...task, task_status: 'rejected', task_assignedTo: 'Unassigned' }
        : task
    );

    setTasks(updatedTasks);
    setOpenDialog(false);
    setAlert({
      open: true,
      message: `Task ${selectedTask.task_id} has been rejected`,
      severity: 'warning'
    });
  };

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => {
      setTasks(mockTasks);
      setLoading(false);
      setAlert({
        open: true,
        message: 'Tasks refreshed successfully',
        severity: 'info'
      });
    }, 800);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  const pendingTasks = tasks.filter(task => task.task_status === 'pending');
  const approvedTasks = tasks.filter(task => task.task_status === 'approved');
  const rejectedTasks = tasks.filter(task => task.task_status === 'rejected');

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* App Bar */}
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />

      {/* Side Navigation */}
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
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
              Planting Task Management
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

          {/* Stats Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      bgcolor: alpha(theme.palette.warning.main, 0.2), 
                      p: 1.5, 
                      borderRadius: 2,
                      mr: 2
                    }}>
                      <AssignmentIcon color="warning" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {pendingTasks.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Pending Requests
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      bgcolor: alpha(theme.palette.success.main, 0.2), 
                      p: 1.5, 
                      borderRadius: 2,
                      mr: 2
                    }}>
                      <CheckCircleIcon color="success" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {approvedTasks.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Approved Tasks
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      bgcolor: alpha(theme.palette.error.main, 0.2), 
                      p: 1.5, 
                      borderRadius: 2,
                      mr: 2
                    }}>
                      <AssignmentIcon color="error" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {rejectedTasks.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Rejected Tasks
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ 
                      bgcolor: alpha(theme.palette.primary.main, 0.2), 
                      p: 1.5, 
                      borderRadius: 2,
                      mr: 2
                    }}>
                      <PersonIcon color="primary" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {tasks.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Tasks
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" color="primary">
                    Pending Planting Requests ({pendingTasks.length})
                  </Typography>
                </Box>
                
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : pendingTasks.length === 0 ? (
                  <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No pending planting requests
                  </Typography>
                ) : (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Task ID</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Planter Name</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Location</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Tree Species</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Schedule</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Status</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="subtitle2" fontWeight="bold">Actions</Typography>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pendingTasks.map((task) => (
                          <TableRow key={task.task_id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {task.task_id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <PersonIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                                <Typography variant="body2">
                                  {task.planter_name}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <LocationIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                                <Typography variant="body2">
                                  {task.task_location}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <TreeIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                                <Typography variant="body2">
                                  {task.tree_species}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <CalendarIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                                <Typography variant="body2">
                                  {new Date(task.schedule).toLocaleDateString()}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={task.task_status}
                                color={getStatusColor(task.task_status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<VisibilityIcon />}
                                onClick={() => handleViewDetails(task)}
                              >
                                Review
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                  <AssignmentIcon color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6" color="primary">
                    All Tasks ({tasks.length})
                  </Typography>
                </Box>
                {!loading && tasks.length > 0 && (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Task ID</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Assigned To</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Location</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Status</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Task Date</Typography>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {tasks.map((task) => (
                          <TableRow key={task.task_id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {task.task_id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={task.task_assignedTo}
                                variant={task.task_assignedTo === 'Unassigned' ? 'outlined' : 'filled'}
                                color={task.task_assignedTo === 'Unassigned' ? 'default' : 'primary'}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {task.task_location}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={task.task_status}
                                color={getStatusColor(task.task_status)}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <CalendarIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                                <Typography variant="body2">
                                  {new Date(task.task_date).toLocaleDateString()}
                                </Typography>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Review Dialog */}
          <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AssignmentIcon />
                Review Planting Request - {selectedTask?.task_id}
              </Box>
            </DialogTitle>
            <DialogContent>
              {selectedTask && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Planter Name
                    </Typography>
                    <Typography variant="body1">{selectedTask.planter_name}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Proposed Location
                    </Typography>
                    <Typography variant="body1">{selectedTask.task_location}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Tree Species
                    </Typography>
                    <Typography variant="body1">{selectedTask.tree_species}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Planting Schedule
                    </Typography>
                    <Typography variant="body1">
                      {new Date(selectedTask.schedule).toLocaleDateString()}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Assign to Officer"
                      value={assignedOfficer}
                      onChange={(e) => setAssignedOfficer(e.target.value)}
                      placeholder="Enter officer's name"
                      variant="outlined"
                      sx={{ mt: 2 }}
                    />
                  </Grid>
                </Grid>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setOpenDialog(false)} color="inherit">
                Cancel
              </Button>
              <Button onClick={handleReject} color="error">
                Reject
              </Button>
              <Button
                onClick={handleApprove}
                variant="contained"
                startIcon={<CheckCircleIcon />}
                disabled={!assignedOfficer.trim()}
              >
                Approve & Assign
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
};

export default Task;