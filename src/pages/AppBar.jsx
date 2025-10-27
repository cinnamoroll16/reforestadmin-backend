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
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Person as PersonIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from "react-router-dom";

// Backend API URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ReForestAppBar({ handleDrawerToggle, user, onLogout }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const navigate = useNavigate();
  const location = useLocation();
  
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

  const handleProfile = () => {
    handleMenuClose();
    navigate("/profile");
  };

  const handleNotificationClick = () => {
    navigate("/notifications");
  };

  // Helper function to get current page title
  const getCurrentPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return 'Dashboard';
      case '/sensors':
        return 'Sensors';
      case '/locations':
        return 'Locations';
      case '/tree-seedlings':
        return 'Tree Seedlings';
      case '/recommendations':
        return 'Recommendations';
      case '/planting-tasks':
        return 'Planting Tasks';
      case '/notifications':
        return 'Notifications';
      case '/profile':
        return 'Profile';
      default:
        return 'ReForest Dashboard';
    }
  };

  // Fetch notification count from your backend API
  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const token = localStorage.getItem('token'); // Assuming you store JWT token
        if (!token) return;

        const response = await fetch(`${API_URL}/api/notifications/count/unread`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          setNotificationCount(data.unreadCount || 0);
        } else {
          console.error('Failed to fetch notification count');
          setNotificationCount(0);
        }
      } catch (error) {
        console.error('Error fetching notification count:', error);
        setNotificationCount(0);
      }
    };

    fetchNotificationCount();

    // Optional: Set up polling for real-time updates
    const interval = setInterval(fetchNotificationCount, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Helper function to get user initials from backend user data
  const getUserInitials = (user) => {
    if (user?.user_firstname && user?.user_lastname) {
      return `${user.user_firstname.charAt(0)}${user.user_lastname.charAt(0)}`.toUpperCase();
    }
    if (user?.displayName) {
      const names = user.displayName.trim().split(' ');
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
      }
      return names[0].charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  // Helper function to get display name from backend user data
  const getDisplayName = (user) => {
    if (user?.user_firstname && user?.user_lastname) {
      return `${user.user_firstname} ${user.user_lastname}`;
    }
    return user?.displayName || user?.email || 'User';
  };

  // Helper function to get user role display name
  const getUserRole = (user) => {
    const role = user?.roleRef?.split('/').pop();
    switch (role) {
      case 'admin':
        return 'Administrator';
      case 'officer':
        return 'DENR Officer';
      case 'user':
        return 'User';
      default:
        return 'User';
    }
  };

  return (
    <AppBar
      position="fixed"
      sx={{
        width: { md: `calc(100% - 240px)` },
        ml: { md: `240px` },
        backgroundColor: '#2e7d32',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
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
        <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
          {getCurrentPageTitle()}
        </Typography>
        
        {/* Notifications Icon */}
        <IconButton 
          color="inherit" 
          onClick={handleNotificationClick}
          aria-label="notifications"
          sx={{ 
            mr: 1,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          <Badge 
            badgeContent={notificationCount} 
            color="error"
            max={99}
            showZero={false}
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: '#ff4444',
                color: '#ffffff',
                fontWeight: '600',
                fontSize: '0.7rem',
                minWidth: '20px',
                height: '20px',
              }
            }}
          >
            <NotificationsIcon />
          </Badge>
        </IconButton>
        
        {/* User Menu */}
        <IconButton 
          color="inherit" 
          onClick={handleMenuOpen}
          aria-label="user menu"
          sx={{ 
            ml: 1,
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            }
          }}
        >
          <Avatar 
            sx={{ 
              width: 36, 
              height: 36,
              bgcolor: 'rgba(255, 255, 255, 0.2)',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}
          >
            {getUserInitials(user)}
          </Avatar>
        </IconButton>
        
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: {
              mt: 1.5,
              minWidth: 220,
              borderRadius: 2,
              boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            }
          }}
        >
          {/* User Info Header */}
          <MenuItem disabled sx={{ opacity: 1, py: 2 }}>
            <Avatar 
              sx={{ 
                mr: 2, 
                width: 40, 
                height: 40,
                bgcolor: '#2e7d32',
                fontSize: '1rem',
                fontWeight: '600'
              }}
            >
              {getUserInitials(user)}
            </Avatar>
            <div>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1a1a1a' }}>
                {getDisplayName(user)}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                {getUserRole(user)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email || user?.user_email}
              </Typography>
            </div>
          </MenuItem>
          
          <Divider />
          
          {/* Menu Actions */}
          <MenuItem onClick={handleProfile} sx={{ py: 1.5 }}>
            <PersonIcon sx={{ mr: 2, fontSize: '1.2rem' }} />
            <Typography variant="body2">My Profile</Typography>
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: '#d32f2f' }}>
            <LogoutIcon sx={{ mr: 2, fontSize: '1.2rem' }} />
            <Typography variant="body2" fontWeight="600">Logout</Typography>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

export default ReForestAppBar;