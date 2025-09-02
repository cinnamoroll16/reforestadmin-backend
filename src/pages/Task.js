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
  AppBar,
  Toolbar,
  useMediaQuery,
  useTheme,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';
import { auth } from '../firebase.js';


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
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
    
  const user = auth.currentUser;
  const handleLogout = () => auth.signOut();
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
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

  return (
    <Box sx={{ display: 'flex' }}>
              {/* App Bar */}
              <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
        
              {/* Side Navigation */}
              <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
        
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Alert */}
      {alert.open && (
        <Alert
          severity={alert.severity}
          onClose={() => setAlert({ ...alert, open: false })}
          sx={{ mb: 2 }}
        >
          {alert.message}
        </Alert>
      )}
    
      <AppBar position="static" color="default" elevation={1} sx={{ mb: 3 }}>
        <Toolbar>
          <AssignmentIcon sx={{ mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Planting Request Management
          </Typography>
          <IconButton color="inherit" onClick={handleRefresh} disabled={loading}>
            <RefreshIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom color="primary">
              Pending Planting Requests ({pendingTasks.length})
            </Typography>
            
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
                    <TableRow>
                      <TableCell>Task ID</TableCell>
                      <TableCell>Planter Name</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Tree Species</TableCell>
                      <TableCell>Schedule</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pendingTasks.map((task) => (
                      <TableRow key={task.task_id}>
                        <TableCell>{task.task_id}</TableCell>
                        <TableCell>{task.planter_name}</TableCell>
                        <TableCell>{task.task_location}</TableCell>
                        <TableCell>{task.tree_species}</TableCell>
                        <TableCell>{new Date(task.schedule).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Chip
                            label={task.task_status}
                            color={getStatusColor(task.task_status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
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
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom color="primary">
              All Tasks ({tasks.length})
            </Typography>
            {!loading && tasks.length > 0 && (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Task ID</TableCell>
                      <TableCell>Assigned To</TableCell>
                      <TableCell>Location</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Task Date</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tasks.map((task) => (
                      <TableRow key={task.task_id}>
                        <TableCell>{task.task_id}</TableCell>
                        <TableCell>
                          <Chip
                            label={task.task_assignedTo}
                            variant={task.task_assignedTo === 'Unassigned' ? 'outlined' : 'filled'}
                            color={task.task_assignedTo === 'Unassigned' ? 'default' : 'primary'}
                          />
                        </TableCell>
                        <TableCell>{task.task_location}</TableCell>
                        <TableCell>
                          <Chip
                            label={task.task_status}
                            color={getStatusColor(task.task_status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>{new Date(task.task_date).toLocaleDateString()}</TableCell>
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
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          Review Planting Request - {selectedTask?.task_id}
        </DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Planter Name
                </Typography>
                <Typography variant="body1">{selectedTask.planter_name}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Proposed Location
                </Typography>
                <Typography variant="body1">{selectedTask.task_location}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
                  Tree Species
                </Typography>
                <Typography variant="body1">{selectedTask.tree_species}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2" color="text.secondary">
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
        <DialogActions>
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
  );
};

export default Task;