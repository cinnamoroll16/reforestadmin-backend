// src/pages/Navigation.js
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  Toolbar,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
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
  Forest as ForestIcon,
} from '@mui/icons-material';

function Navigation({ mobileOpen, handleDrawerToggle, isMobile }) {
  const navigate = useNavigate(); // ✅ Use React Router navigate
  const location = useLocation(); // ✅ Use React Router location

  // ✅ FIXED PATHS - all lowercase, matching your actual routes
  const navItems = [
    { text: 'Dashboard', icon: <HomeIcon />, path: '/' }, // ✅ Changed from /dashboard
    { text: 'View Sensor', icon: <SensorsIcon />, path: '/sensors' }, // ✅ Changed from /sensor to /sensors (plural)
    { text: 'Recommendation Logs', icon: <ListAltIcon />, path: '/recommendations' },
    { text: 'Task', icon: <AssignmentIcon />, path: '/tasks' },
    { text: 'Notification', icon: <NotificationsIcon />, path: '/notifications' },
    { text: 'My Profile', icon: <PersonIcon />, path: '/profile' },
  ];

  const handleNavigation = (path) => {
    navigate(path); // ✅ Use React Router navigation instead of window.location
    if (isMobile) {
      handleDrawerToggle();
    }
  };

  // ✅ Get current path from React Router
  const currentPath = location.pathname;

  const drawer = (
    <div>
      <Toolbar sx={{ backgroundColor: 'primary.main', color: 'white' }}>
        <ForestIcon sx={{ mr: 2 }} />
        <Typography variant="h6" noWrap component="div" fontWeight="bold">
          ReForest
        </Typography>
      </Toolbar>
      <List>
        {navItems.map((item) => (
          <ListItem 
            key={item.text}
            disablePadding
            sx={{
              backgroundColor: currentPath === item.path ? 'rgba(46, 125, 50, 0.1)' : 'transparent',
            }}
          >
            <ListItemButton 
              onClick={() => handleNavigation(item.path)}
              selected={currentPath === item.path}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: 'rgba(46, 125, 50, 0.15)',
                  borderLeft: '4px solid #2e7d32',
                  '&:hover': {
                    backgroundColor: 'rgba(46, 125, 50, 0.2)',
                  }
                },
                '&:hover': {
                  backgroundColor: 'rgba(46, 125, 50, 0.08)',
                }
              }}
            >
              <ListItemIcon 
                sx={{ 
                  color: currentPath === item.path ? 'primary.main' : 'inherit' 
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText 
                primary={item.text}
                primaryTypographyProps={{
                  fontWeight: currentPath === item.path ? 600 : 400,
                  color: currentPath === item.path ? 'primary.main' : 'inherit',
                }}
              />
            </ListItemButton>
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