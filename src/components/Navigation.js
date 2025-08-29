import {
  Drawer,
  Toolbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
} from '@mui/material';
import {
  Home as HomeIcon,
  Sensors as SensorsIcon,
  ListAlt as ListAltIcon,
  Assignment as AssignmentIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Nature as NatureIcon,
} from '@mui/icons-material';

function Navigation({ mobileOpen, handleDrawerToggle, isMobile }) {
  const navItems = [
    { text: 'Home', icon: <HomeIcon />, path: '/Dashboard' },
    { text: 'View Sensor', icon: <SensorsIcon />, path: '/Sensor' },
    { text: 'Recommendation Logs', icon: <ListAltIcon />, path: '/recommendations' },
    { text: 'Task', icon: <AssignmentIcon />, path: '/tasks' },
    { text: 'Notification', icon: <NotificationsIcon />, path: '/notifications' },
    { text: 'My Profile', icon: <PersonIcon />, path: '/profile' },
  ];

  const handleNavigation = (path) => {
    window.location.href = path; // Use window.location for navigation
    if (isMobile) {
      handleDrawerToggle();
    }
  };

  // Get current path for highlighting
  const currentPath = window.location.pathname;

  const drawer = (
    <div>
      <Toolbar sx={{ backgroundColor: 'primary.main', color: 'white' }}>
        <NatureIcon sx={{ mr: 2 }} />
        <Typography variant="h6" noWrap component="div">
          ReForest
        </Typography>
      </Toolbar>
      <List>
        {navItems.map((item) => (
          <ListItem 
            button 
            key={item.text}
            onClick={() => handleNavigation(item.path)}
            selected={currentPath === item.path}
            sx={{
              '&.Mui-selected': {
                backgroundColor: 'primary.light',
                color: 'white',
                '&:hover': {
                  backgroundColor: 'primary.main',
                }
              }
            }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
    </div>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { md: 240 }, flexShrink: { md: 0 } }}
    >
      {isMobile ? (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
          }}
        >
          {drawer}
        </Drawer>
      ) : (
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
          }}
          open
        >
          {drawer}
        </Drawer>
      )}
    </Box>
  );
}

export default Navigation;