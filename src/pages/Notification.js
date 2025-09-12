import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Grid, Card, CardContent, Alert, IconButton,
  Badge, useMediaQuery, useTheme
} from '@mui/material';
import { 
  collection, getDocs, doc, updateDoc, addDoc,
  query, where, onSnapshot, orderBy, Timestamp
} from 'firebase/firestore';
import { auth, firestore } from "../firebase.js";
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import VisibilityIcon from '@mui/icons-material/Visibility';

const NotificationPanel = () => {
  const [plantingRequests, setPlantingRequests] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState({ name: 'Admin User', role: 'Administrator' });

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    console.log('Logout clicked');
  };

  // Fetch planting requests from Firestore
  useEffect(() => {
    const fetchPlantingRequests = async () => {
      try {
        console.log("Fetching planting requests...");
        
        // Query for ALL planting requests first to see what we have
        const requestsQuery = query(
          collection(firestore, 'PlantingRequest')
        );
        
        const unsubscribe = onSnapshot(requestsQuery, 
          (snapshot) => {
            console.log("Received snapshot with", snapshot.docs.length, "documents");
            
            // Log all documents to see what fields they have
            snapshot.docs.forEach(doc => {
              console.log("Document ID:", doc.id, "Data:", doc.data());
            });
            
            // Get all documents and filter manually to see what's happening
            const allRequests = snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            console.log("All requests:", allRequests);
            
            // Filter for pending requests manually
            const pendingRequests = allRequests.filter(req => 
              req.request_status === 'pending' || 
              req.status === 'pending' || // Check for alternative field names
              !req.request_status // Include if status field is missing
            );
            
            console.log("Pending requests:", pendingRequests);
            
            setPlantingRequests(pendingRequests);
            setLoading(false);
          },
          (error) => {
            console.error('Error in snapshot listener:', error);
            setLoading(false);
          }
        );

        return () => unsubscribe();
      } catch (error) {
        console.error('Error setting up planting requests query:', error);
        setLoading(false);
      }
    };

    fetchPlantingRequests();
  }, []);

  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setDetailDialogOpen(true);
  };

  const handleApprove = (request) => {
    setSelectedRequest(request);
    setApprovalDialogOpen(true);
  };

  const handleReject = (request) => {
    setSelectedRequest(request);
    setRejectionDialogOpen(true);
  };

  const confirmApprove = async () => {
    try {
      // Update the request status to approved
      const requestRef = doc(firestore, 'PlantingRequest', selectedRequest.id);
      await updateDoc(requestRef, {
        request_status: 'approved',
        request_remarks: rejectionReason || 'Request approved by administrator'
      });

      setApprovalDialogOpen(false);
      setSelectedRequest(null);
      setRejectionReason('');
      alert('Request approved successfully!');
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Error approving request: ' + error.message);
    }
  };

  const confirmReject = async () => {
    try {
      // Update the request status to rejected
      const requestRef = doc(firestore, 'PlantingRequest', selectedRequest.id);
      await updateDoc(requestRef, {
        request_status: 'rejected',
        request_remarks: rejectionReason || 'Request rejected by administrator'
      });

      setRejectionDialogOpen(false);
      setRejectionReason('');
      setSelectedRequest(null);
      alert('Request rejected successfully!');
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Error rejecting request: ' + error.message);
    }
  };

  const getStatusColor = (status) => {
    if (!status) return 'default';
    
    switch (status.toLowerCase()) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    
    try {
      if (date instanceof Timestamp) {
        return date.toDate().toLocaleDateString();
      }
      if (typeof date === 'string') {
        // Handle both "2023-11-10" format and "September 20, 2023 at 12:00:00 AM UTC+8" format
        if (date.includes('September') || date.includes('UTC')) {
          return new Date(date).toLocaleDateString();
        } else {
          return new Date(date + 'T00:00:00').toLocaleDateString();
        }
      }
      if (date.toDate) {
        return date.toDate().toLocaleDateString();
      }
      return 'Invalid Date';
    } catch (error) {
      console.error('Error formatting date:', error, date);
      return 'Invalid Date';
    }
  };

  const getStatusText = (request) => {
    return request.request_status || request.status || 'unknown';
  };

  const pendingCount = plantingRequests.filter(req => 
    (req.request_status === 'pending' || req.status === 'pending') && 
    req.request_status !== 'approved' && 
    req.request_status !== 'rejected'
  ).length;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />
        <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />
        <Box component="main" sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - 240px)` }, ml: { md: '240px' }, mt: '64px' }}>
          <Typography>Loading planting requests...</Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* App Bar */}
      <ReForestAppBar handleDrawerToggle={handleDrawerToggle} user={user} onLogout={handleLogout} />

      {/* Side Navigation */}
      <Navigation mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} isMobile={isMobile} />

      {/* Main Content */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          p: 3, 
          width: { md: `calc(100% - 240px)` },
          ml: { md: '240px' },
          mt: '64px'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Badge badgeContent={pendingCount} color="error" sx={{ mr: 2 }}>
            <NotificationsIcon color="action" fontSize="large" />
          </Badge>
          <Typography variant="h4">
            Notification Panel
          </Typography>
        </Box>
        
        <Typography variant="body1" color="textSecondary" paragraph>
          Review and respond to planting requests from planters. Monitor pending approvals and take action to coordinate reforestation activities.
        </Typography>

        {/* Debug information - remove in production */}
        <Alert severity="info" sx={{ mb: 2 }}>
          Debug: Found {plantingRequests.length} requests. Check console for details.
        </Alert>

        {plantingRequests.length === 0 ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            No planting requests found. All requests have been processed.
          </Alert>
        ) : (
          <Paper sx={{ width: '100%', mb: 2, overflow: 'hidden' }}>
            <TableContainer sx={{ maxHeight: 600 }}>
              <Table stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Request ID</TableCell>
                    <TableCell>Planter ID</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Preferred Date</TableCell>
                    <TableCell>Request Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {plantingRequests.map((request) => {
                    const status = getStatusText(request);
                    const isPending = status === 'pending';
                    
                    return (
                      <TableRow 
                        key={request.id} 
                        sx={{ 
                          '&:last-child td, &:last-child th': { border: 0 },
                          bgcolor: isPending ? '#fffde7' : 'inherit'
                        }}
                      >
                        <TableCell component="th" scope="row">
                          {request.request_id || request.id}
                        </TableCell>
                        <TableCell>{request.user_id}</TableCell>
                        <TableCell>{request.location_id}</TableCell>
                        <TableCell>{formatDate(request.preferred_date)}</TableCell>
                        <TableCell>{formatDate(request.request_date)}</TableCell>
                        <TableCell>
                          <Chip 
                            label={status} 
                            color={getStatusColor(status)} 
                            size="small" 
                          />
                        </TableCell>
                        <TableCell align="center">
                          <IconButton 
                            color="info" 
                            onClick={() => handleViewDetails(request)}
                            title="View details"
                          >
                            <VisibilityIcon />
                          </IconButton>
                          {isPending && (
                            <>
                              <IconButton 
                                color="success" 
                                onClick={() => handleApprove(request)}
                                title="Approve request"
                              >
                                <CheckCircleIcon />
                              </IconButton>
                              <IconButton 
                                color="error" 
                                onClick={() => handleReject(request)}
                                title="Reject request"
                              >
                                <CancelIcon />
                              </IconButton>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        )}

        {/* Request Details Dialog */}
        <Dialog open={detailDialogOpen} onClose={() => setDetailDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Planting Request Details
          </DialogTitle>
          <DialogContent>
            {selectedRequest && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="textSecondary">Request ID</Typography>
                      <Typography variant="body1" gutterBottom>{selectedRequest.request_id || selectedRequest.id}</Typography>
                      
                      <Typography variant="subtitle2" color="textSecondary">Planter ID</Typography>
                      <Typography variant="body1" gutterBottom>{selectedRequest.user_id}</Typography>
                      
                      <Typography variant="subtitle2" color="textSecondary">Location</Typography>
                      <Typography variant="body1" gutterBottom>{selectedRequest.location_id}</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle2" color="textSecondary">Preferred Date</Typography>
                      <Typography variant="body1" gutterBottom>{formatDate(selectedRequest.preferred_date)}</Typography>
                      
                      <Typography variant="subtitle2" color="textSecondary">Request Date</Typography>
                      <Typography variant="body1" gutterBottom>{formatDate(selectedRequest.request_date)}</Typography>
                      
                      <Typography variant="subtitle2" color="textSecondary">Status</Typography>
                      <Chip 
                        label={getStatusText(selectedRequest)} 
                        color={getStatusColor(getStatusText(selectedRequest))} 
                        size="small" 
                      />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Remarks</Typography>
                  <Typography variant="body1">
                    {selectedRequest.request_remarks || 'No remarks provided'}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="textSecondary">Document ID</Typography>
                  <Typography variant="body2" color="textSecondary">
                    {selectedRequest.id}
                  </Typography>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Approval Confirmation Dialog */}
        <Dialog open={approvalDialogOpen} onClose={() => setApprovalDialogOpen(false)}>
          <DialogTitle>Confirm Approval</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to approve this planting request from {selectedRequest?.user_id}?
            </Typography>
            <TextField
              autoFocus
              margin="dense"
              label="Approval Notes (Optional)"
              fullWidth
              variant="outlined"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setApprovalDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmApprove} color="success" variant="contained">
              Approve
            </Button>
          </DialogActions>
        </Dialog>

        {/* Rejection Dialog */}
        <Dialog open={rejectionDialogOpen} onClose={() => setRejectionDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Reject Planting Request</DialogTitle>
          <DialogContent>
            <Typography gutterBottom>
              Please provide a reason for rejecting this request from {selectedRequest?.user_id}:
            </Typography>
            <TextField
              autoFocus
              margin="dense"
              label="Rejection Reason"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setRejectionDialogOpen(false)}>Cancel</Button>
            <Button onClick={confirmReject} color="error" variant="contained">
              Reject Request
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Box>
  );
};

export default NotificationPanel;