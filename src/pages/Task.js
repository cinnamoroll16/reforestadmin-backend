import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, Tab, Tabs, Dialog, DialogTitle,
  DialogContent, DialogActions, Grid, Card, CardContent, Alert, useMediaQuery, useTheme
} from '@mui/material';
import { 
  getFirestore, collection, getDocs, doc, updateDoc, addDoc,
  query, where, onSnapshot 
} from 'firebase/firestore';
import { auth, firestore } from "../firebase.js"; // Your Firebase configuration
import ReForestAppBar from './AppBar.js';
import Navigation from './Navigation.js';


const TaskPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [plantingRequests, setPlantingRequests] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [plantingTasks, setPlantingTasks] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState({ name: 'Admin User', role: 'Administrator' }); // Mock user data

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    // Implement logout functionality
    console.log('Logout clicked');
  };

  // Fetch data from Firestore
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Planting Requests
        const requestsQuery = query(
          collection(firestore, 'PlantingRequest'), 
          where('request_status', '==', 'pending')
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        const requestsData = requestsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPlantingRequests(requestsData);

        // Fetch Recommendations
        const recoQuery = collection(firestore, 'Recommendation');
        const recoSnapshot = await getDocs(recoQuery);
        const recoData = recoSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setRecommendations(recoData);

        // Fetch Planting Tasks
        const tasksQuery = collection(firestore, 'PlantingTask');
        const tasksSnapshot = await getDocs(tasksQuery);
        const tasksData = tasksSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPlantingTasks(tasksData);

        setLoading(false);
      } catch (error) {
        console.error('Error fetching data:', error);
        setLoading(false);
      }
    };

    fetchData();

    // Real-time listener for planting requests
    const unsubscribe = onSnapshot(
      query(collection(firestore, 'PlantingRequest'), where('request_status', '==', 'pending')),
      (snapshot) => {
        const updatedRequests = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPlantingRequests(updatedRequests);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleApproveRequest = async (request) => {
    setSelectedRequest(request);
    setDialogOpen(true);
  };

  const handleConfirmApproval = async (selectedReco) => {
    try {
      // Update the request status to approved
      const requestRef = doc(firestore, 'PlantingRequest', selectedRequest.id);
      await updateDoc(requestRef, {
        request_status: 'approved',
        request_remarks: 'Approved by admin'
      });

      // Create a new planting task
      await addDoc(collection(firestore, 'PlantingTask'), {
        user_id: selectedRequest.user_id,
        reco_id: selectedReco.id,
        location_id: selectedRequest.location_id,
        task_status: 'assigned',
        task_date: new Date().toISOString().split('T')[0]
      });

      // Create planting record (for history)
      await addDoc(collection(firestore, 'PlantingRecord'), {
        user_id: selectedRequest.user_id,
        location_id: selectedRequest.location_id,
        seedling_id: selectedReco.seedling_Id1, // Using the first recommended seedling
        record_datePlanted: new Date().toISOString().split('T')[0]
      });

      setDialogOpen(false);
      setSelectedRequest(null);
    } catch (error) {
      console.error('Error approving request:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'completed': return 'info';
      default: return 'default';
    }
  };

  if (loading) {
    return <Typography>Loading data...</Typography>;
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
        <Typography variant="h4" gutterBottom>
          Task Management Panel
        </Typography>
        <Typography variant="body1" color="textSecondary" paragraph>
          Manage planting requests, view recommendations, and coordinate reforestation activities.
        </Typography>

        <Paper sx={{ width: '100%', mb: 2 }}>
          <Tabs value={activeTab} onChange={handleTabChange} indicatorColor="primary">
            <Tab label="Planting Requests" />
            <Tab label="Recommendations" />
            <Tab label="Planting Tasks" />
          </Tabs>

          {/* Planting Requests Tab */}
          {activeTab === 0 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Request ID</TableCell>
                    <TableCell>Planter ID</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Preferred Date</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {plantingRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>{request.request_id}</TableCell>
                      <TableCell>{request.user_id}</TableCell>
                      <TableCell>{request.location_id}</TableCell>
                      <TableCell>{request.preferred_date}</TableCell>
                      <TableCell>
                        <Chip 
                          label={request.request_status} 
                          color={getStatusColor(request.request_status)} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="contained" 
                          color="primary"
                          onClick={() => handleApproveRequest(request)}
                          disabled={request.request_status !== 'pending'}
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

          {/* Recommendations Tab */}
          {activeTab === 1 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Recommendation ID</TableCell>
                    <TableCell>Sensor Data ID</TableCell>
                    <TableCell>Recommended Seedlings</TableCell>
                    <TableCell>Confidence Score</TableCell>
                    <TableCell>Generated At</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recommendations.map((reco) => (
                    <TableRow key={reco.id}>
                      <TableCell>{reco.reco_id}</TableCell>
                      <TableCell>{reco.sensorData_id}</TableCell>
                      <TableCell>
                        {[reco.seedling_Id1, reco.seedling_Id2, reco.seedling_Id3]
                          .filter(Boolean)
                          .join(', ')}
                      </TableCell>
                      <TableCell>{reco.reco_confidenceScore}</TableCell>
                      <TableCell>
                        {reco.reco_generatedAtDATETIME && 
                         new Date(reco.reco_generatedAtDATETIME?.toDate()).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {/* Planting Tasks Tab */}
          {activeTab === 2 && (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Task ID</TableCell>
                    <TableCell>Planter ID</TableCell>
                    <TableCell>Recommendation ID</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Task Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {plantingTasks.map((task) => (
                    <TableRow key={task.id}>
                      <TableCell>{task.task_id}</TableCell>
                      <TableCell>{task.user_id}</TableCell>
                      <TableCell>{task.reco_id}</TableCell>
                      <TableCell>{task.location_id}</TableCell>
                      <TableCell>
                        <Chip 
                          label={task.task_status} 
                          color={getStatusColor(task.task_status)} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell>{task.task_date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>

        {/* Recommendation Selection Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Approve Planting Request for {selectedRequest?.user_id}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body1" paragraph>
              Location: {selectedRequest?.location_id} | 
              Preferred Date: {selectedRequest?.preferred_date}
            </Typography>
            
            <Typography variant="h6" gutterBottom>
              Available Recommendations
            </Typography>
            
            <Grid container spacing={2}>
              {recommendations.map((reco) => (
                <Grid item xs={12} md={6} key={reco.id}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="subtitle1">
                        Recommendation ID: {reco.reco_id}
                      </Typography>
                      <Typography variant="body2">
                        Seedlings: {[reco.seedling_Id1, reco.seedling_Id2, reco.seedling_Id3]
                          .filter(Boolean)
                          .join(', ')}
                      </Typography>
                      <Typography variant="body2">
                        Confidence: {reco.reco_confidenceScore}
                      </Typography>
                      <Button 
                        variant="contained" 
                        color="primary"
                        onClick={() => handleConfirmApproval(reco)}
                        sx={{ mt: 1 }}
                      >
                        Select This Recommendation
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>

        {plantingRequests.length === 0 && activeTab === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No pending planting requests at this time.
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default TaskPage;