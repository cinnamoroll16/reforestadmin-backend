// src/pages/Dashboard.js
import React from 'react';
import {
  Container,
  Typography,
  Box,
  Paper,
  Button,
  Grid
} from '@mui/material';
import { Nature } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user, logout } = useAuth();

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" color="primary">
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Nature sx={{ mr: 1, fontSize: 40 }} />
            ReForest Dashboard
          </Box>
        </Typography>
        <Button variant="outlined" onClick={logout}>
          Sign Out
        </Button>
      </Box>

      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Welcome, {user?.name}!
        </Typography>
        <Typography variant="body1" color="text.secondary">
          You are logged in as a {user?.role}. 
          {user?.role === 'planter' && ' Track your tree planting progress and initiatives.'}
          {user?.role === 'officer' && ' Monitor and verify reforestation projects.'}
          {user?.role === 'stakeholder' && ' Support and fund conservation initiatives.'}
        </Typography>
      </Paper>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Projects
            </Typography>
            <Typography variant="h4" color="primary">
              12
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Trees Planted
            </Typography>
            <Typography variant="h4" color="primary">
              1,254
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="h6" gutterBottom>
              Impact
            </Typography>
            <Typography variant="h4" color="primary">
              85%
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;