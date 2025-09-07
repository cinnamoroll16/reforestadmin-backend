// src/pages/AppBar.js
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
} from '@mui/icons-material';
import { useState } from 'react';
import { useNavigate } from "react-router-dom";

function ReForestAppBar({ handleDrawerToggle, user, onLogout }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  
  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    handleMenuClose();
    onLogout();
  };

  // Navigate to notifications page
  const handleNotificationClick = () => {
    navigate("/notifications");
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - 240px)` },
        ml: { md: `240px` },
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={handleDrawerToggle}
          sx={{ mr: 2, display: { md: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
          Admin Dashboard
        </Typography>
        
        {/* Notifications Icon - Click to navigate to notifications page */}
        <IconButton 
          color="inherit" 
          onClick={handleNotificationClick}
          aria-label="notifications"
        >
          <Badge badgeContent={1} color="secondary">
            <NotificationsIcon />
          </Badge>
        </IconButton>
        
        {/* Avatar Icon - Click to open user menu */}
        <IconButton 
          color="inherit" 
          sx={{ ml: 1 }}
          onClick={handleMenuOpen}
          aria-label="user menu"
        >
          <Avatar sx={{ width: 32, height: 32 }}>
            {user?.name ? user.name.charAt(0).toUpperCase() : 'A'}
          </Avatar>
        </IconButton>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
        >
          <MenuItem disabled>{user?.email || 'user@example.com'}</MenuItem>
          <MenuItem onClick={handleLogout}>Logout</MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

export default ReForestAppBar;