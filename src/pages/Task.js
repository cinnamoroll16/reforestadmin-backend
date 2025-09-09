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
  Toolbar,
  MenuItem,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Visibility as VisibilityIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  CalendarToday as CalendarIcon,
  Park as TreeIcon,
  Schedule as ScheduleIcon
} from '@mui/icons-material';
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';
import { auth, firestore } from "../firebase.js";
import { collection, getDocs, updateDoc, doc, addDoc, query, where } from 'firebase/firestore';

const drawerWidth = 240;

const Task = () => {
  const [tasks, setTasks] = useState([]);
  const [selectedTask, setSelectedTask] = useState(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openScheduleDialog, setOpenScheduleDialog] = useState(false);
  const [assignedOfficer, setAssignedOfficer] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleNotes, setScheduleNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [users, setUsers] = useState([]);
  
  const user = auth.currentUser;
  const handleLogout = () => auth.signOut();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  
  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(firestore, 'PlantingTask'));
      const tasksData = [];
      
      querySnapshot.forEach((doc) => {
        const taskData = doc.data();
        tasksData.push({
          id: doc.id,
          ...taskData,
          // Ensure proper date formatting
          schedule: taskData.schedule?.toDate ? taskData.schedule.toDate().toISOString().split('T')[0] : taskData.schedule,
          task_date: taskData.task_date?.toDate ? taskData.task_date.toDate().toISOString().split('T')[0] : taskData.task_date
        });
      });
      
      setTasks(tasksData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setAlert({
        open: true,
        message: 'Failed to fetch tasks',
        severity: 'error'
      });
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(firestore, 'users'));
      const usersData = [];
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        usersData.push({
          id: doc.id,
          ...userData
        });
      });
      
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleViewDetails = (task) => {
    setSelectedTask(task);
    setAssignedOfficer(task.user_id || '');
    setOpenDialog(true);
  };

  const handleScheduleTask = (task) => {
    setSelectedTask(task);
    setScheduleDate('');
    setScheduleNotes('');
    setOpenScheduleDialog(true);
  };

  const handleCreateSchedule = async () => {
    if (!scheduleDate) {
      setAlert({
        open: true,
        message: 'Please select a schedule date',
        severity: 'error'
      });
      return;
    }

    try {
      // Create a new schedule in Firebase
      const scheduleData = {
        task_id: selectedTask.task_id,
        user_id: selectedTask.user_id,
        schedule_date: new Date(scheduleDate),
        schedule_notes: scheduleNotes,
        created_at: new Date()
      };

      const docRef = await addDoc(collection(firestore, 'Schedule'), scheduleData);
      
      // Update the task status to scheduled
      const taskRef = doc(firestore, 'PlantingTask', selectedTask.id);
      await updateDoc(taskRef, {
        task_status: 'scheduled'
      });

      // Update local state
      const updatedTasks = tasks.map(task =>
        task.id === selectedTask.id
          ? { ...task, task_status: 'scheduled' }
          : task
      );

      setTasks(updatedTasks);
      setOpenScheduleDialog(false);
      setAlert({
        open: true,
        message: `Schedule created successfully with ID: ${docRef.id}`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error creating schedule:', error);
      setAlert({
        open: true,
        message: 'Failed to create schedule',
        severity: 'error'
      });
    }
  };

  const handleApprove = async () => {
    if (!assignedOfficer.trim()) {
      setAlert({
        open: true,
        message: 'Please assign an officer before approving',
        severity: 'error'
      });
      return;
    }

    try {
      // Update the task in Firebase
      const taskRef = doc(firestore, 'PlantingTask', selectedTask.id);
      await updateDoc(taskRef, {
        task_status: 'approved',
        user_id: assignedOfficer
      });

      // Update local state
      const updatedTasks = tasks.map(task =>
        task.id === selectedTask.id
          ? {
              ...task,
              task_status: 'approved',
              user_id: assignedOfficer
            }
          : task
      );

      setTasks(updatedTasks);
      setOpenDialog(false);
      setAlert({
        open: true,
        message: `Task ${selectedTask.task_id} approved and assigned to officer`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error approving task:', error);
      setAlert({
        open: true,
        message: 'Failed to approve task',
        severity: 'error'
      });
    }
  };

  const handleReject = async () => {
    try {
      // Update the task in Firebase
      const taskRef = doc(firestore, 'PlantingTask', selectedTask.id);
      await updateDoc(taskRef, {
        task_status: 'rejected'
      });

      // Update local state
      const updatedTasks = tasks.map(task =>
        task.id === selectedTask.id
          ? { ...task, task_status: 'rejected' }
          : task
      );

      setTasks(updatedTasks);
      setOpenDialog(false);
      setAlert({
        open: true,
        message: `Task ${selectedTask.task_id} has been rejected`,
        severity: 'warning'
      });
    } catch (error) {
      console.error('Error rejecting task:', error);
      setAlert({
        open: true,
        message: 'Failed to reject task',
        severity: 'error'
      });
    }
  };

  const handleRefresh = () => {
    fetchTasks();
    setAlert({
      open: true,
      message: 'Tasks refreshed successfully',
      severity: 'info'
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      case 'scheduled':
        return 'info';
      case 'completed':
        return 'primary';
      default:
        return 'default';
    }
  };

  const pendingTasks = tasks.filter(task => task.task_status === 'pending');
  const approvedTasks = tasks.filter(task => task.task_status === 'approved');
  const rejectedTasks = tasks.filter(task => task.task_status === 'rejected');
  const scheduledTasks = tasks.filter(task => task.task_status === 'scheduled');

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
                      bgcolor: alpha(theme.palette.info.main, 0.2), 
                      p: 1.5, 
                      borderRadius: 2,
                      mr: 2
                    }}>
                      <ScheduleIcon color="info" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">
                        {scheduledTasks.length}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Scheduled Tasks
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
                            <Typography variant="subtitle2" fontWeight="bold">User ID</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Recommendation ID</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Location ID</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Status</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Task Date</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="subtitle2" fontWeight="bold">Actions</Typography>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pendingTasks.map((task) => (
                          <TableRow key={task.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {task.task_id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <PersonIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                                <Typography variant="body2">
                                  {task.user_id}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {task.reco_id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <LocationIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                                <Typography variant="body2">
                                  {task.location_id}
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
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <CalendarIcon sx={{ mr: 1, color: 'text.secondary', fontSize: 20 }} />
                                <Typography variant="body2">
                                  {task.task_date ? new Date(task.task_date).toLocaleDateString() : 'N/A'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                variant="outlined"
                                size="small"
                                startIcon={<VisibilityIcon />}
                                onClick={() => handleViewDetails(task)}
                                sx={{ mr: 1 }}
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
                    Approved Tasks ({approvedTasks.length})
                  </Typography>
                </Box>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : approvedTasks.length === 0 ? (
                  <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No approved tasks
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
                            <Typography variant="subtitle2" fontWeight="bold">User ID</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Recommendation ID</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Location ID</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Status</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Task Date</Typography>
                          </TableCell>
                          <TableCell align="center">
                            <Typography variant="subtitle2" fontWeight="bold">Actions</Typography>
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {approvedTasks.map((task) => (
                          <TableRow key={task.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {task.task_id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {task.user_id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {task.reco_id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {task.location_id}
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
                                  {task.task_date ? new Date(task.task_date).toLocaleDateString() : 'N/A'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell align="center">
                              <Button
                                variant="contained"
                                size="small"
                                startIcon={<ScheduleIcon />}
                                onClick={() => handleScheduleTask(task)}
                              >
                                Schedule
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
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                    <CircularProgress />
                  </Box>
                ) : tasks.length === 0 ? (
                  <Typography color="text.secondary" sx={{ p: 2, textAlign: 'center' }}>
                    No tasks found
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
                            <Typography variant="subtitle2" fontWeight="bold">User ID</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Recommendation ID</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="subtitle2" fontWeight="bold">Location ID</Typography>
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
                          <TableRow key={task.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {task.task_id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {task.user_id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {task.reco_id}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {task.location_id}
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
                                  {task.task_date ? new Date(task.task_date).toLocaleDateString() : 'N/A'}
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
                      Task ID
                    </Typography>
                    <Typography variant="body1">{selectedTask.task_id}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Recommendation ID
                    </Typography>
                    <Typography variant="body1">{selectedTask.reco_id}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Location ID
                    </Typography>
                    <Typography variant="body1">{selectedTask.location_id}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Current Status
                    </Typography>
                    <Chip
                      label={selectedTask.task_status}
                      color={getStatusColor(selectedTask.task_status)}
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                      <InputLabel id="assign-officer-label">Assign to Officer</InputLabel>
                      <Select
                        labelId="assign-officer-label"
                        value={assignedOfficer}
                        label="Assign to Officer"
                        onChange={(e) => setAssignedOfficer(e.target.value)}
                      >
                        {users.map((user) => (
                          <MenuItem key={user.id} value={user.id}>
                            {user.displayName || user.email}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
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

          {/* Schedule Dialog */}
          <Dialog open={openScheduleDialog} onClose={() => setOpenScheduleDialog(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            <DialogTitle sx={{ bgcolor: 'info.main', color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ScheduleIcon />
                Schedule Planting Task - {selectedTask?.task_id}
              </Box>
            </DialogTitle>
            <DialogContent>
              {selectedTask && (
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Task ID
                    </Typography>
                    <Typography variant="body1">{selectedTask.task_id}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                      Assigned User
                    </Typography>
                    <Typography variant="body1">{selectedTask.user_id}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Schedule Date"
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      InputLabelProps={{
                        shrink: true,
                      }}
                    />
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Schedule Notes"
                      value={scheduleNotes}
                      onChange={(e) => setScheduleNotes(e.target.value)}
                      multiline
                      rows={3}
                      variant="outlined"
                      sx={{ mt: 2 }}
                    />
                  </Grid>
                </Grid>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setOpenScheduleDialog(false)} color="inherit">
                Cancel
              </Button>
              <Button
                onClick={handleCreateSchedule}
                variant="contained"
                startIcon={<ScheduleIcon />}
                disabled={!scheduleDate}
              >
                Create Schedule
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
};

export default Task;