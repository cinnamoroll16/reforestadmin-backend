import { Container, Grid, Typography, Box, Toolbar } from '@mui/material';
import {
  Sensors as SensorsIcon,
  ListAlt as ListAltIcon,
  Assignment as AssignmentIcon,
  Nature as NatureIcon,
} from '@mui/icons-material';
import DashboardCard from './DashboardCard';

function Dashboard() {
  const dashboardCards = [
    {
      title: 'View Sensor Data',
      description: 'Monitor real-time sensor data for environmental metrics',
      icon: <SensorsIcon sx={{ fontSize: 40 }} />,
      path: '/sensor-data',
      notificationCount: 0
    },
    {
      title: 'Pending Activities',
      description: 'Track and complete pending nursery tasks',
      icon: <ListAltIcon sx={{ fontSize: 40 }} />,
      path: '/pending-activities',
      notificationCount: 5
    },
    {
      title: 'Recommendation Log',
      description: 'Get suggestions on tree species best suited for the nursery',
      icon: <NatureIcon sx={{ fontSize: 40 }} />, // Changed from EcoIcon to NatureIcon
      path: '/recommendation-log',
      notificationCount: 2
    },
    {
      title: 'Planting Task',
      description: 'Delegate daily activities and monitor progress',
      icon: <AssignmentIcon sx={{ fontSize: 40 }} />,
      path: '/planting-task',
      notificationCount: 3
    },
  ];

  return (
    <Box
      component="main"
      sx={{ flexGrow: 1, p: 3, width: { md: `calc(100% - 240px)` } }}
    >
      <Toolbar />
      <Container maxWidth="lg">
        <Typography variant="h4" gutterBottom sx={{ mt: 2, mb: 4 }}>
          Welcome to Admin
        </Typography>

        <Grid container spacing={4}>
          {dashboardCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={6} key={index}>
              <DashboardCard 
                title={card.title}
                description={card.description}
                icon={card.icon}
                notificationCount={card.notificationCount}
              />
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
}

export default Dashboard;