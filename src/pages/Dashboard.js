// src/pages/Dashboard.js
import React, { useState } from 'react';
import {
  Box,
  Toolbar,
  useMediaQuery,
  useTheme,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Paper,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  TrendingUp,
  Sensors,
  Lightbulb,
  Warning,
  Refresh,
  NotificationsActive,
  Grass, // Replaced Eco with Grass
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import ReForestAppBar from "../pages/AppBar.js";
import Navigation from "./Navigation.js";
import { useAuth } from '../context/AuthContext.js';

// Tab panel component
function TabPanel({ children, value, index, ...other }) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`dashboard-tabpanel-${index}`}
      aria-labelledby={`dashboard-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

// Mock data for demonstration
const mockAnalytics = {
  overview: {
    totalProjects: 12,
    activeSensors: 45,
    alerts: 3,
    efficiency: 87
  },
  sensors: {
    online: 42,
    offline: 3,
    critical: 2,
    data: [
      { id: 1, name: 'Soil Moisture A', status: 'online', value: '65%', trend: 'up' },
      { id: 2, name: 'Temperature B', status: 'online', value: '24°C', trend: 'stable' },
      { id: 3, name: 'Humidity C', status: 'critical', value: '15%', trend: 'down' },
      { id: 4, name: 'pH Sensor D', status: 'offline', value: 'N/A', trend: 'none' }
    ]
  },
  recommendations: [
    { id: 1, type: 'irrigation', priority: 'high', message: 'Increase watering frequency for Zone 4', action: 'pending' },
    { id: 2, type: 'maintenance', priority: 'medium', message: 'Schedule sensor calibration', action: 'completed' },
    { id: 3, type: 'optimization', priority: 'low', message: 'Consider adding sensors in north sector', action: 'pending' }
  ]
};

function Dashboard() {
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleRefresh = () => {
    setLastUpdated(new Date());
    // In real app, this would trigger data refetch
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'success';
      case 'offline': return 'default';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ display: "flex", minHeight: '100vh' }}>
      {/* Top App Bar */}
      <ReForestAppBar
        handleDrawerToggle={handleDrawerToggle}
        user={user}
        onLogout={handleLogout}
      />

      {/* Side Navigation */}
      <Navigation
        mobileOpen={mobileOpen}
        handleDrawerToggle={handleDrawerToggle}
        isMobile={isMobile}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, md: 3 },
          width: { md: `calc(100% - 240px)` },
          backgroundColor: '#f5f5f5'
        }}
      >
        <Toolbar /> {/* Push content below AppBar */}
        
        {/* Header Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
                Analytics Dashboard
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Welcome back, {user?.name || 'Admin'}! Here's your project overview.
              </Typography>
            </Box>
            <IconButton onClick={handleRefresh} color="primary" sx={{ mb: 1 }}>
              <Refresh />
            </IconButton>
          </Box>
          <Typography variant="caption" color="text.secondary">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </Typography>
        </Box>

        {/* Alert Banner */}
        {mockAnalytics.overview.alerts > 0 && (
          <Alert 
            severity="warning" 
            sx={{ mb: 3 }}
            action={
              <IconButton color="inherit" size="small">
                <NotificationsActive />
              </IconButton>
            }
          >
            {mockAnalytics.overview.alerts} critical alerts require your attention
          </Alert>
        )}

        {/* Overview Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <CardContent sx={{ color: 'white' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h3" component="div" fontWeight="bold">
                      {mockAnalytics.overview.totalProjects}
                    </Typography>
                    <Typography variant="body2">Active Projects</Typography>
                  </Box>
                  <Grass sx={{ fontSize: 40, opacity: 0.8 }} /> {/* Replaced Eco with Grass */}
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h3" component="div" fontWeight="bold" color="primary">
                      {mockAnalytics.overview.activeSensors}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Active Sensors</Typography>
                  </Box>
                  <Sensors color="primary" sx={{ fontSize: 40 }} />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(mockAnalytics.sensors.online / mockAnalytics.overview.activeSensors) * 100} 
                  sx={{ mt: 2 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {mockAnalytics.sensors.online} online
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h3" component="div" fontWeight="bold" color="warning.main">
                      {mockAnalytics.overview.alerts}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">Critical Alerts</Typography>
                  </Box>
                  <Warning color="warning" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box>
                    <Typography variant="h3" component="div" fontWeight="bold" color="success.main">
                      {mockAnalytics.overview.efficiency}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">System Efficiency</Typography>
                  </Box>
                  <TrendingUp color="success" sx={{ fontSize: 40 }} />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={mockAnalytics.overview.efficiency} 
                  sx={{ mt: 2 }}
                  color="success"
                />
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Analytics Tabs */}
        <Paper sx={{ width: '100%', mb: 3 }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab icon={<Sensors />} label="Sensor Analytics" />
            <Tab icon={<Lightbulb />} label="Recommendations" />
            <Tab icon={<DashboardIcon />} label="Project Overview" /> {/* Replaced TrendingUp with DashboardIcon */}
          </Tabs>

          {/* Sensor Analytics Tab */}
          <TabPanel value={activeTab} index={0}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="h6" gutterBottom>Sensor Status Overview</Typography>
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item>
                    <Chip label={`Online: ${mockAnalytics.sensors.online}`} color="success" variant="outlined" />
                  </Grid>
                  <Grid item>
                    <Chip label={`Offline: ${mockAnalytics.sensors.offline}`} color="default" variant="outlined" />
                  </Grid>
                  <Grid item>
                    <Chip label={`Critical: ${mockAnalytics.sensors.critical}`} color="error" variant="outlined" />
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>Sensor Details</Typography>
                <Grid container spacing={2}>
                  {mockAnalytics.sensors.data.map((sensor) => (
                    <Grid item xs={12} sm={6} md={3} key={sensor.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                            <Typography variant="subtitle2">{sensor.name}</Typography>
                            <Chip 
                              label={sensor.status} 
                              size="small" 
                              color={getStatusColor(sensor.status)}
                            />
                          </Box>
                          <Typography variant="h6">{sensor.value}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Current reading
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </TabPanel>

          {/* Recommendations Tab */}
          <TabPanel value={activeTab} index={1}>
            <Typography variant="h6" gutterBottom>Active Recommendations</Typography>
            <Grid container spacing={2}>
              {mockAnalytics.recommendations.map((rec) => (
                <Grid item xs={12} key={rec.id}>
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box>
                          <Chip 
                            label={rec.priority} 
                            size="small" 
                            color={getPriorityColor(rec.priority)}
                            sx={{ mb: 1 }}
                          />
                          <Typography variant="body1" gutterBottom>
                            {rec.message}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Type: {rec.type} • Action: {rec.action}
                          </Typography>
                        </Box>
                        <IconButton size="small">
                          <Lightbulb />
                        </IconButton>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </TabPanel>

          {/* Project Overview Tab */}
          <TabPanel value={activeTab} index={2}>
            <Typography variant="h6" gutterBottom>Project Performance</Typography>
            <Typography color="text.secondary">
              Detailed project analytics and performance metrics will be displayed here.
              This section can include charts, graphs, and comparative analysis.
            </Typography>
            {/* Placeholder for charts */}
            <Box sx={{ height: 200, background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
              <Typography color="text.secondary">Charts and Graphs Area</Typography>
            </Box>
          </TabPanel>
        </Paper>
      </Box>
    </Box>
  );
}

export default Dashboard;