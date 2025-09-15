// src/pages/Task.js
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Card, CardContent, Alert, 
  useMediaQuery, useTheme, TablePagination, TextField, FormControl,
  InputLabel, Select, MenuItem, LinearProgress, Avatar, alpha,
  Toolbar, IconButton, Tooltip, Divider, List, ListItem,
  ListItemText, ListItemIcon, Stepper, Step, StepLabel, Badge,
  Tabs, Tab, Switch, FormControlLabel
} from '@mui/material';
import {
  Assignment as TaskIcon,
  PlayArrow as ExecuteIcon,
  Visibility as ViewIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as PendingIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Add as AddIcon,
  Park as TreeIcon,
  CalendarToday as CalendarIcon,
  Nature as SeedlingIcon,
  Map as MapIcon,
  GpsFixed as GpsIcon,
  ThumbUp as ApproveIcon,
  ThumbDown as RejectIcon,
  AccessTime as TimeIcon,
  Warning as WarningIcon,
  CheckBox as CheckBoxIcon,
  FilterList as FilterIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { 
  collection, getDocs, doc, updateDoc, addDoc,
  query, where, onSnapshot, orderBy, serverTimestamp
} from 'firebase/firestore';
import { auth, firestore } from "../firebase.js";
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';

const drawerWidth = 240;

const TaskPage = () => {
  const [plantingRecords, setPlantingRecords] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [planters, setPlanters] = useState([]);
  const [locations, setLocations] = useState([]);
  const [seedlings, setSeedlings] = useState([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filter, setFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedSeedling, setSelectedSeedling] = useState('');
  const [tabValue, setTabValue] = useState(0);
  const [bulkSelect, setBulkSelect] = useState([]);
  const [showOnlyPending, setShowOnlyPending] = useState(true);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const user = auth.currentUser;

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleLogout = () => auth.signOut();

  // Enhanced status management
  const getRecordStatus = (record) => {
    if (record.status === 'approved') return 'approved';
    if (record.status === 'rejected') return 'rejected';
    if (record.seedling_id && record.status !== 'pending') return 'assigned';
    return 'pending';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'assigned': return 'info';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'rejected': return 'Rejected';
      case 'assigned': return 'Assigned';
      case 'pending': return 'Pending Review';
      default: return 'Unknown';
    }
  };

  // Fetch all necessary data
  useEffect(() => {
    setLoading(true);
    
    const fetchData = async () => {
      try {
        // Fetch planting records
        const recordsQuery = query(
          collection(firestore, 'PlantingRecord'),
          orderBy('record_datePlanted', 'desc')
        );
        
        const recordsUnsubscribe = onSnapshot(recordsQuery, (snapshot) => {
          const recordsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            record_datePlanted: doc.data().record_datePlanted?.toDate?.() || new Date(),
            status: doc.data().status || 'pending'
          }));
          setPlantingRecords(recordsData);
        });

        // Fetch other collections...
        const recosSnapshot = await getDocs(collection(firestore, 'Recommendation'));
        const recosData = recosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setRecommendations(recosData);

        const usersSnapshot = await getDocs(collection(firestore, 'users'));
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPlanters(usersData);

        const locationsSnapshot = await getDocs(collection(firestore, 'Location'));
        const locationsData = locationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLocations(locationsData);

        const seedlingsSnapshot = await getDocs(collection(firestore, 'TreeSeedling'));
        const seedlingsData = seedlingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSeedlings(seedlingsData);

        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Get planter details
  const getPlanterDetails = (userId) => {
    return planters.find(planter => planter.id === userId) || {};
  };

  // Get location details
  const getLocationDetails = (locationId) => {
    return locations.find(location => location.id === locationId) || {};
  };

  // Get seedling details
  const getSeedlingDetails = (seedlingId) => {
    return seedlings.find(seedling => seedling.id === seedlingId) || {};
  };

  // Get recommended seedlings for location
  const getRecommendedSeedlings = (locationId) => {
    const locationRecommendations = recommendations.filter(reco => 
      reco.location_id === locationId || reco.inventory_Id === locationId
    );
    
    if (locationRecommendations.length === 0) return [];
    
    const recommendedSeedlings = [];
    locationRecommendations.forEach(reco => {
      if (reco.recommendedSeedlings && Array.isArray(reco.recommendedSeedlings)) {
        reco.recommendedSeedlings.forEach(seedling => {
          recommendedSeedlings.push({
            ...seedling,
            confidence: seedling.confidenceScore || seedling.suitabilityScore || 0
          });
        });
      }
    });
    
    return recommendedSeedlings.sort((a, b) => b.confidence - a.confidence).slice(0, 3);
  };

  // Enhanced filtering
  const filteredRecords = plantingRecords.filter(record => {
    const planter = getPlanterDetails(record.user_id);
    const planterName = planter.displayName || planter.email || record.user_id;
    const location = getLocationDetails(record.location_id);
    const locationName = location.location_name || record.location_id;
    const status = getRecordStatus(record);
    
    const matchesSearch = record.record_id?.toLowerCase().includes(filter.toLowerCase()) ||
                         planterName.toLowerCase().includes(filter.toLowerCase()) ||
                         locationName.toLowerCase().includes(filter.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || status === statusFilter;
    const matchesPendingFilter = !showOnlyPending || status === 'pending';
    
    return matchesSearch && matchesStatus && matchesPendingFilter;
  });

  // Statistics
  const stats = {
    total: plantingRecords.length,
    pending: plantingRecords.filter(r => getRecordStatus(r) === 'pending').length,
    approved: plantingRecords.filter(r => getRecordStatus(r) === 'approved').length,
    rejected: plantingRecords.filter(r => getRecordStatus(r) === 'rejected').length,
    assigned: plantingRecords.filter(r => getRecordStatus(r) === 'assigned').length,
    uniquePlanters: new Set(plantingRecords.map(r => r.user_id)).size
  };

  // Pagination handlers
  const handleChangePage = (event, newPage) => setPage(newPage);
  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Record action handlers
  const handleViewRecord = (record) => {
    setSelectedRecord(record);
    setDialogOpen(true);
  };

  const handleApprovalDialog = (record) => {
    setSelectedRecord(record);
    setApprovalDialogOpen(true);
  };

  const handleApproveRequest = async (approved = true) => {
    try {
      const recordRef = doc(firestore, 'PlantingRecord', selectedRecord.id);
      await updateDoc(recordRef, {
        status: approved ? 'approved' : 'rejected',
        approved_by: user.uid,
        approval_date: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      setApprovalDialogOpen(false);
      setSelectedRecord(null);
      alert(`Request ${approved ? 'approved' : 'rejected'} successfully!`);
    } catch (error) {
      console.error('Error updating request:', error);
      alert('Failed to update request');
    }
  };

  const handleAssignSeedling = (record) => {
    setSelectedRecord(record);
    setAssignDialogOpen(true);
    setSelectedSeedling(record.seedling_id || '');
  };

  const handleSaveSeedlingAssignment = async () => {
    try {
      const recordRef = doc(firestore, 'PlantingRecord', selectedRecord.id);
      await updateDoc(recordRef, {
        seedling_id: selectedSeedling,
        status: 'assigned',
        assigned_by: user.uid,
        assignment_date: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      setAssignDialogOpen(false);
      setSelectedRecord(null);
      setSelectedSeedling('');
      alert('Seedling assigned successfully!');
    } catch (error) {
      console.error('Error assigning seedling:', error);
      alert('Failed to assign seedling');
    }
  };

  // Bulk operations
  const handleBulkApprove = async () => {
    try {
      const updates = bulkSelect.map(recordId => {
        const recordRef = doc(firestore, 'PlantingRecord', recordId);
        return updateDoc(recordRef, {
          status: 'approved',
          approved_by: user.uid,
          approval_date: serverTimestamp(),
          updated_at: serverTimestamp()
        });
      });
      
      await Promise.all(updates);
      setBulkSelect([]);
      alert(`${bulkSelect.length} requests approved successfully!`);
    } catch (error) {
      console.error('Error bulk approving:', error);
      alert('Failed to approve requests');
    }
  };

  const handleSelectRecord = (recordId) => {
    setBulkSelect(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedRecord(null);
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  const getPriorityLevel = (record) => {
    const plantDate = new Date(record.record_datePlanted);
    const today = new Date();
    const daysUntilPlanting = Math.ceil((plantDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilPlanting < 7) return { level: 'high', color: 'error', label: 'Urgent' };
    if (daysUntilPlanting < 14) return { level: 'medium', color: 'warning', label: 'Medium' };
    return { level: 'low', color: 'info', label: 'Normal' };
  };

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        
        <Box sx={{ width: '100%' }}>
          {/* Enhanced Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h4" sx={{ color: '#2e7d32', fontWeight: 600 }}>
                Planting Request Management
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Review and approve planting requests from community members
              </Typography>
            </Box>
            
            {bulkSelect.length > 0 && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Badge badgeContent={bulkSelect.length} color="primary">
                  <Button 
                    variant="contained" 
                    color="success"
                    startIcon={<ApproveIcon />}
                    onClick={handleBulkApprove}
                  >
                    Bulk Approve
                  </Button>
                </Badge>
                <Button 
                  variant="outlined" 
                  onClick={() => setBulkSelect([])}
                >
                  Clear Selection
                </Button>
              </Box>
            )}
          </Box>

          {loading && <LinearProgress sx={{ mb: 2 }} />}

          {/* Enhanced Stats Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ borderRadius: 2, boxShadow: 2, cursor: 'pointer' }} onClick={() => setStatusFilter('all')}>
                <CardContent sx={{ pb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ bgcolor: alpha(theme.palette.primary.main, 0.2), p: 1.5, borderRadius: 2, mr: 2 }}>
                      <TaskIcon color="primary" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">{stats.total}</Typography>
                      <Typography variant="body2" color="text.secondary">Total Requests</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ borderRadius: 2, boxShadow: 2, cursor: 'pointer' }} onClick={() => setStatusFilter('pending')}>
                <CardContent sx={{ pb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ bgcolor: alpha(theme.palette.warning.main, 0.2), p: 1.5, borderRadius: 2, mr: 2 }}>
                      <PendingIcon color="warning" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">{stats.pending}</Typography>
                      <Typography variant="body2" color="text.secondary">Pending Review</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ borderRadius: 2, boxShadow: 2, cursor: 'pointer' }} onClick={() => setStatusFilter('approved')}>
                <CardContent sx={{ pb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ bgcolor: alpha(theme.palette.success.main, 0.2), p: 1.5, borderRadius: 2, mr: 2 }}>
                      <CheckCircleIcon color="success" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">{stats.approved}</Typography>
                      <Typography variant="body2" color="text.secondary">Approved</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ borderRadius: 2, boxShadow: 2, cursor: 'pointer' }} onClick={() => setStatusFilter('assigned')}>
                <CardContent sx={{ pb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ bgcolor: alpha(theme.palette.info.main, 0.2), p: 1.5, borderRadius: 2, mr: 2 }}>
                      <TreeIcon color="info" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">{stats.assigned}</Typography>
                      <Typography variant="body2" color="text.secondary">Assigned</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent sx={{ pb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ bgcolor: alpha(theme.palette.error.main, 0.2), p: 1.5, borderRadius: 2, mr: 2 }}>
                      <RejectIcon color="error" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">{stats.rejected}</Typography>
                      <Typography variant="body2" color="text.secondary">Rejected</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} sm={6} md={2}>
              <Card sx={{ borderRadius: 2, boxShadow: 2 }}>
                <CardContent sx={{ pb: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Box sx={{ bgcolor: alpha(theme.palette.secondary.main, 0.2), p: 1.5, borderRadius: 2, mr: 2 }}>
                      <PersonIcon color="secondary" />
                    </Box>
                    <Box>
                      <Typography variant="h5" fontWeight="bold">{stats.uniquePlanters}</Typography>
                      <Typography variant="body2" color="text.secondary">Active Planters</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Enhanced Filters */}
          <Paper sx={{ mb: 2, p: 2, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  label="Search requests"
                  variant="outlined"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search by Record ID, Planter, or Location"
                  InputProps={{
                    startAdornment: <SearchIcon sx={{ color: 'action.active', mr: 1 }} />
                  }}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status Filter</InputLabel>
                  <Select
                    value={statusFilter}
                    label="Status Filter"
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">All Statuses</MenuItem>
                    <MenuItem value="pending">Pending Review</MenuItem>
                    <MenuItem value="approved">Approved</MenuItem>
                    <MenuItem value="rejected">Rejected</MenuItem>
                    <MenuItem value="assigned">Assigned</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showOnlyPending}
                      onChange={(e) => setShowOnlyPending(e.target.checked)}
                    />
                  }
                  label="Show only pending"
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <Typography variant="body2" color="text.secondary">
                  {filteredRecords.length} result{filteredRecords.length !== 1 ? 's' : ''}
                </Typography>
              </Grid>
            </Grid>
          </Paper>

          {/* Enhanced Records Table */}
          <Paper sx={{ width: '100%', mb: 2, borderRadius: 2, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: theme.palette.grey[50] }}>
                    <TableCell padding="checkbox">
                      <Typography variant="subtitle2" fontWeight="bold">Select</Typography>
                    </TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Priority</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Request ID</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Planter</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Location</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Proposed Date</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Status</Typography></TableCell>
                    <TableCell><Typography variant="subtitle2" fontWeight="bold">Seedling</Typography></TableCell>
                    <TableCell align="center"><Typography variant="subtitle2" fontWeight="bold">Actions</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRecords.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((record) => {
                    const planter = getPlanterDetails(record.user_id);
                    const planterName = planter.displayName || planter.email || record.user_id;
                    const location = getLocationDetails(record.location_id);
                    const locationName = location.location_name || record.location_id;
                    const seedling = getSeedlingDetails(record.seedling_id);
                    const status = getRecordStatus(record);
                    const priority = getPriorityLevel(record);

                    return (
                      <TableRow key={record.id} hover sx={{ '&:hover': { bgcolor: 'rgba(46, 125, 50, 0.04)' } }}>
                        <TableCell padding="checkbox">
                          {status === 'pending' && (
                            <IconButton
                              size="small"
                              onClick={() => handleSelectRecord(record.id)}
                              color={bulkSelect.includes(record.id) ? 'primary' : 'default'}
                            >
                              <CheckBoxIcon />
                            </IconButton>
                          )}
                        </TableCell>
                        
                        <TableCell>
                          <Chip 
                            size="small" 
                            label={priority.label}
                            color={priority.color}
                            icon={priority.level === 'high' ? <WarningIcon /> : <TimeIcon />}
                          />
                        </TableCell>
                        
                        <TableCell>
                          <Typography variant="body2" fontWeight="medium">{record.record_id}</Typography>
                        </TableCell>
                        
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ width: 32, height: 32, mr: 1, bgcolor: 'primary.main' }}>
                              <PersonIcon fontSize="small" />
                            </Avatar>
                            <Box>
                              <Typography variant="body2">{planterName}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {planter.role || 'Community Member'}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <LocationIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                            <Box>
                              <Typography variant="body2">{locationName}</Typography>
                              {location.location_coordinates && (
                                <Typography variant="caption" color="text.secondary">
                                  GPS Available
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <CalendarIcon fontSize="small" color="action" sx={{ mr: 0.5 }} />
                            <Typography variant="body2">
                              {formatDate(record.record_datePlanted)}
                            </Typography>
                          </Box>
                        </TableCell>
                        
                        <TableCell>
                          <Chip 
                            label={getStatusLabel(status)} 
                            color={getStatusColor(status)} 
                            size="small"
                            variant="filled"
                          />
                        </TableCell>
                        
                        <TableCell>
                          {seedling.id ? (
                            <Chip 
                              label={seedling.seedling_commonName || seedling.id} 
                              color="success" 
                              size="small"
                              variant="outlined"
                            />
                          ) : (
                            <Typography variant="caption" color="text.secondary">
                              Not assigned
                            </Typography>
                          )}
                        </TableCell>
                        
                        <TableCell align="center">
                          <Tooltip title="View Details">
                            <IconButton onClick={() => handleViewRecord(record)} size="small">
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          
                          {status === 'pending' && (
                            <Tooltip title="Review Request">
                              <IconButton 
                                color="warning" 
                                size="small"
                                onClick={() => handleApprovalDialog(record)}
                              >
                                <ExecuteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                          
                          {(status === 'approved' || status === 'assigned') && (
                            <Tooltip title="Assign Seedling">
                              <IconButton 
                                color="primary" 
                                size="small"
                                onClick={() => handleAssignSeedling(record)}
                              >
                                <TreeIcon />
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
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={filteredRecords.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </Paper>

          {/* Approval Dialog */}
          <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ bgcolor: 'warning.main', color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ExecuteIcon /> Review Planting Request
              </Box>
            </DialogTitle>
            {selectedRecord && (
              <DialogContent sx={{ pt: 3 }}>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Please review this planting request carefully before making a decision.
                </Alert>
                
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>Request Details</Typography>
                    <Typography variant="body1"><strong>Request ID:</strong> {selectedRecord.record_id}</Typography>
                    <Typography variant="body1"><strong>Planter:</strong> {getPlanterDetails(selectedRecord.user_id).displayName || selectedRecord.user_id}</Typography>
                    <Typography variant="body1"><strong>Location:</strong> {getLocationDetails(selectedRecord.location_id).location_name || selectedRecord.location_id}</Typography>
                    <Typography variant="body1"><strong>Proposed Date:</strong> {formatDate(selectedRecord.record_datePlanted)}</Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>Recommended Actions</Typography>
                    {(() => {
                      const recommendedSeedlings = getRecommendedSeedlings(selectedRecord.location_id);
                      const priority = getPriorityLevel(selectedRecord);
                      
                      return (
                        <Box>
                          <Typography variant="body2" sx={{ mb: 1 }}>
                            <strong>Priority Level:</strong> {priority.label}
                          </Typography>
                          {recommendedSeedlings.length > 0 ? (
                            <Typography variant="body2" color="success.main">
                              ✓ Suitable seedlings available for this location
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="warning.main">
                              ⚠ No specific recommendations found for this location
                            </Typography>
                          )}
                        </Box>
                      );
                    })()}
                  </Grid>
                </Grid>
              </DialogContent>
            )}
            <DialogActions sx={{ p: 2, gap: 1 }}>
              <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
              <Button 
                variant="outlined" 
                color="error"
                startIcon={<RejectIcon />}
                onClick={() => handleApproveRequest(false)}
              >
                Reject Request
              </Button>
              <Button 
                variant="contained" 
                color="success"
                startIcon={<ApproveIcon />}
                onClick={() => handleApproveRequest(true)}
              >
                Approve Request
              </Button>
            </DialogActions>
          </Dialog>

          {/* Enhanced Record Detail Dialog */}
          <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="lg" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
            {selectedRecord && (
              <>
                <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TaskIcon /> Planting Request Details - {selectedRecord.record_id}
                    <Chip 
                      label={getStatusLabel(getRecordStatus(selectedRecord))} 
                      color={getStatusColor(getRecordStatus(selectedRecord))}
                      size="small"
                      sx={{ ml: 'auto', bgcolor: 'white', color: 'primary.main' }}
                    />
                  </Box>
                </DialogTitle>
                <DialogContent>
                  <Grid container spacing={3} sx={{ mt: 1, p: 1 }}>
                    {/* Request Timeline */}
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <TimeIcon sx={{ mr: 1 }} /> Request Timeline
                      </Typography>
                      <Stepper activeStep={getRecordStatus(selectedRecord) === 'pending' ? 0 : 
                                          getRecordStatus(selectedRecord) === 'approved' ? 1 :
                                          getRecordStatus(selectedRecord) === 'assigned' ? 2 : 0} 
                               orientation="horizontal">
                        <Step>
                          <StepLabel>Submitted</StepLabel>
                        </Step>
                        <Step>
                          <StepLabel>Approved</StepLabel>
                        </Step>
                        <Step>
                          <StepLabel>Seedling Assigned</StepLabel>
                        </Step>
                      </Stepper>
                    </Grid>

                    <Grid item xs={12}>
                      <Divider />
                    </Grid>

                    {/* Planter Information */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <PersonIcon sx={{ mr: 1 }} /> Planter Information
                      </Typography>
                      {(() => {
                        const planter = getPlanterDetails(selectedRecord.user_id);
                        return (
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {planter.displayName || planter.email || selectedRecord.user_id}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {planter.role || 'Community Member'} • {planter.phoneNumber || 'No phone'}
                            </Typography>
                            <Typography variant="body2">
                              {planter.address || 'No address provided'}
                            </Typography>
                            {planter.experienceLevel && (
                              <Typography variant="body2" color="primary">
                                Experience: {planter.experienceLevel}
                              </Typography>
                            )}
                          </Box>
                        );
                      })()}
                    </Grid>

                    {/* Location Details */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <LocationIcon sx={{ mr: 1 }} /> Location Details
                      </Typography>
                      {(() => {
                        const location = getLocationDetails(selectedRecord.location_id);
                        return (
                          <Box>
                            <Typography variant="body1" fontWeight="medium">
                              {location.location_name || selectedRecord.location_id}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {location.location_type || 'Planting site'}
                            </Typography>
                            {location.location_coordinates && (
                              <Typography variant="body2">
                                <GpsIcon sx={{ fontSize: 14, mr: 0.5 }} />
                                {location.location_coordinates.latitude}, {location.location_coordinates.longitude}
                              </Typography>
                            )}
                            {location.area && (
                              <Typography variant="body2">
                                Area: {location.area} hectares
                              </Typography>
                            )}
                          </Box>
                        );
                      })()}
                    </Grid>

                    <Grid item xs={12}>
                      <Divider />
                    </Grid>

                    {/* Planting Schedule */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <CalendarIcon sx={{ mr: 1 }} /> Planting Schedule
                      </Typography>
                      <Box>
                        <Typography variant="body1" fontWeight="medium">
                          Proposed Date: {formatDate(selectedRecord.record_datePlanted)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Priority: {getPriorityLevel(selectedRecord).label}
                        </Typography>
                        <Typography variant="body2">
                          Submitted: {selectedRecord.created_at 
                            ? formatDate(selectedRecord.created_at.toDate())
                            : 'N/A'}
                        </Typography>
                        {selectedRecord.approval_date && (
                          <Typography variant="body2" color="success.main">
                            Approved: {formatDate(selectedRecord.approval_date.toDate())}
                          </Typography>
                        )}
                      </Box>
                    </Grid>

                    {/* Seedling Information */}
                    <Grid item xs={12} md={6}>
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                        <TreeIcon sx={{ mr: 1 }} /> Seedling Assignment
                      </Typography>
                      {(() => {
                        const seedling = getSeedlingDetails(selectedRecord.seedling_id);
                        return (
                          <Box>
                            {seedling.id ? (
                              <>
                                <Typography variant="body1" fontWeight="medium">
                                  {seedling.seedling_commonName || seedling.id}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {seedling.seedling_scientificName || 'No scientific name'}
                                </Typography>
                                {selectedRecord.assignment_date && (
                                  <Typography variant="body2" color="success.main">
                                    Assigned: {formatDate(selectedRecord.assignment_date.toDate())}
                                  </Typography>
                                )}
                              </>
                            ) : (
                              <Box>
                                <Typography variant="body2" color="text.secondary">
                                  No seedling assigned yet
                                </Typography>
                                <Button 
                                  size="small" 
                                  color="primary" 
                                  onClick={() => {
                                    handleCloseDialog();
                                    handleAssignSeedling(selectedRecord);
                                  }}
                                  disabled={getRecordStatus(selectedRecord) !== 'approved'}
                                  sx={{ mt: 1 }}
                                >
                                  Assign Seedling
                                </Button>
                              </Box>
                            )}
                          </Box>
                        );
                      })()}
                    </Grid>

                    {/* Recommendations */}
                    <Grid item xs={12}>
                      <Divider />
                      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                        <SeedlingIcon sx={{ mr: 1 }} /> Location-Based Recommendations
                      </Typography>
                      {(() => {
                        const recommendedSeedlings = getRecommendedSeedlings(selectedRecord.location_id);
                        
                        if (recommendedSeedlings.length === 0) {
                          return (
                            <Alert severity="info">
                              No specific recommendations found for this location. Manual seedling selection required.
                            </Alert>
                          );
                        }

                        return (
                          <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              Based on environmental conditions and soil analysis:
                            </Typography>
                            <Grid container spacing={1}>
                              {recommendedSeedlings.map((seedling, index) => (
                                <Grid item xs={12} md={4} key={index}>
                                  <Card variant="outlined" sx={{ p: 2, height: '100%' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                      <Box sx={{ flex: 1 }}>
                                        <Typography variant="body2" fontWeight="medium">
                                          {seedling.commonName || 'Unknown Species'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" display="block">
                                          {seedling.scientificName || 'No scientific name'}
                                        </Typography>
                                      </Box>
                                      <Chip 
                                        size="small" 
                                        label={`${Math.round(seedling.confidence * 100)}%`}
                                        color="success"
                                        variant="outlined"
                                      />
                                    </Box>
                                  </Card>
                                </Grid>
                              ))}
                            </Grid>
                          </Box>
                        );
                      })()}
                    </Grid>
                  </Grid>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                  <Button onClick={handleCloseDialog}>Close</Button>
                  {getRecordStatus(selectedRecord) === 'pending' && (
                    <>
                      <Button 
                        variant="outlined" 
                        color="error"
                        startIcon={<RejectIcon />}
                        onClick={() => {
                          handleCloseDialog();
                          handleApprovalDialog(selectedRecord);
                        }}
                      >
                        Review Request
                      </Button>
                    </>
                  )}
                  {getRecordStatus(selectedRecord) === 'approved' && (
                    <Button 
                      variant="contained" 
                      color="primary"
                      startIcon={<TreeIcon />}
                      onClick={() => {
                        handleCloseDialog();
                        handleAssignSeedling(selectedRecord);
                      }}
                    >
                      Assign Seedling
                    </Button>
                  )}
                </DialogActions>
              </>
            )}
          </Dialog>

          {/* Enhanced Seedling Assignment Dialog */}
          <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="md" fullWidth>
            <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TreeIcon /> Assign Seedling to Approved Request
              </Box>
            </DialogTitle>
            <DialogContent>
              {selectedRecord && (
                <Box sx={{ mt: 2 }}>
                  <Alert severity="success" sx={{ mb: 3 }}>
                    This request has been approved and is ready for seedling assignment.
                  </Alert>
                  
                  <Grid container spacing={3}>
                    <Grid item xs={12}>
                      <Typography variant="body1" gutterBottom>
                        <strong>Request:</strong> {selectedRecord.record_id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Planter: {getPlanterDetails(selectedRecord.user_id).displayName || selectedRecord.user_id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Location: {getLocationDetails(selectedRecord.location_id).location_name || selectedRecord.location_id}
                      </Typography>
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        Recommended Seedlings for this Location
                      </Typography>
                      {(() => {
                        const recommendedSeedlings = getRecommendedSeedlings(selectedRecord.location_id);
                        
                        if (recommendedSeedlings.length === 0) {
                          return (
                            <Alert severity="info" sx={{ mb: 2 }}>
                              No specific recommendations found for this location. Please select from available seedlings below.
                            </Alert>
                          );
                        }

                        return (
                          <Box sx={{ mb: 2 }}>
                            {recommendedSeedlings.map((seedling, index) => (
                              <Card key={index} variant="outlined" sx={{ mb: 1, p: 2 }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <Box>
                                    <Typography variant="body1" fontWeight="medium">
                                      {seedling.commonName || 'Unknown Species'}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                      {seedling.scientificName || 'No scientific name'}
                                    </Typography>
                                    <Typography variant="caption" display="block">
                                      Suitability Score: {Math.round(seedling.confidence * 100)}%
                                    </Typography>
                                  </Box>
                                  <Button 
                                    size="small" 
                                    onClick={() => setSelectedSeedling(seedling.seedling_id || seedling.id)}
                                    variant={selectedSeedling === (seedling.seedling_id || seedling.id) ? "contained" : "outlined"}
                                    color="success"
                                  >
                                    {selectedSeedling === (seedling.seedling_id || seedling.id) ? "Selected" : "Select"}
                                  </Button>
                                </Box>
                              </Card>
                            ))}
                          </Box>
                        );
                      })()}
                    </Grid>

                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        All Available Seedlings
                      </Typography>
                      <FormControl fullWidth>
                        <InputLabel>Select Seedling</InputLabel>
                        <Select
                          value={selectedSeedling}
                          label="Select Seedling"
                          onChange={(e) => setSelectedSeedling(e.target.value)}
                        >
                          <MenuItem value="">
                            <em>Choose a seedling...</em>
                          </MenuItem>
                          {seedlings.map((seedling) => (
                            <MenuItem key={seedling.id} value={seedling.id}>
                              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                <Typography variant="body2">
                                  {seedling.seedling_commonName || seedling.id}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {seedling.seedling_scientificName}
                                </Typography>
                              </Box>
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
              <Button 
                variant="contained" 
                color="success"
                startIcon={<TreeIcon />}
                onClick={handleSaveSeedlingAssignment}
                disabled={!selectedSeedling}
              >
                Assign Seedling
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Box>
    </Box>
  );
};

export default TaskPage;