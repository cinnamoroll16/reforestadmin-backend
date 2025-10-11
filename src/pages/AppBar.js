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
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, firestore } from "../firebase.js";

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

  const handleSettings = () => {
    handleMenuClose();
    navigate("/settings");
  };

  // Navigate to notifications page
  const handleNotificationClick = () => {
    navigate("/notifications");
  };

  // Helper function to get current page title
  const getCurrentPageTitle = () => {
    const path = location.pathname;
    switch (path) {
      case '/dashboard':
        return 'Dashboard';
      case '/sensor':
        return 'Sensor Data';
      case '/recommendations':
        return 'Recommendations';
      case '/tasks':
        return 'Planting Tasks';
      case '/notifications':
        return 'Notifications';
      case '/profile':
        return 'Profile';
      case '/settings':
        return 'Settings';
      default:
        return 'Admin Dashboard';
    }
  };

  // Fetch notification count from Firestore
  useEffect(() => {
    const notificationsRef = collection(firestore, 'Notification');
    const q = query(
      notificationsRef,
      where('status', '==', 'unread')
    );

    // Real-time listener for notification count
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      setNotificationCount(querySnapshot.size);
    }, (error) => {
      console.error('Error fetching notification count:', error);
      setNotificationCount(0);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Helper function to get user initials
  const getUserInitials = (user) => {
    if (user?.displayName) {
      const names = user.displayName.trim().split(' ');
      if (names.length >= 2) {
        return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
      }
      return names[0].charAt(0).toUpperCase();
    }
    if (user?.name) {
      const names = user.name.trim().split(' ');
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

  // Helper function to get display name
  const getDisplayName = (user) => {
    return user?.displayName || user?.name || 'User';
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
          {getCurrentPageTitle()}
        </Typography>
        
        {/* Notifications Icon with Enhanced Badge */}
        <IconButton 
          color="inherit" 
          onClick={handleNotificationClick}
          aria-label="notifications"
          sx={{ 
            mr: 1,
            position: 'relative',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              transform: 'scale(1.05)',
              transition: 'all 0.2s ease-in-out'
            }
          }}
        >
          <Badge 
            badgeContent={notificationCount} 
            color="error"
            max={99}
            showZero={false}
            overlap="rectangular"
            anchorOrigin={{
              vertical: 'top',
              horizontal: 'right',
            }}
            sx={{
              '& .MuiBadge-badge': {
                backgroundColor: '#ff3030',
                color: '#ffffff',
                fontWeight: '700',
                fontSize: '0.65rem',
                minWidth: '18px',
                height: '18px',
                borderRadius: '50%',
                border: '2px solid #ffffff',
                boxShadow: '0 2px 8px rgba(255, 48, 48, 0.4), 0 0 0 2px rgba(255, 48, 48, 0.1)',
                right: -2,
                top: -2,
                transform: 'scale(1)',
                animation: notificationCount > 0 ? 'notification-pulse 2s ease-in-out infinite' : 'none',
                '@keyframes notification-pulse': {
                  '0%': {
                    transform: 'scale(1)',
                    boxShadow: '0 2px 8px rgba(255, 48, 48, 0.4), 0 0 0 2px rgba(255, 48, 48, 0.1)'
                  },
                  '50%': {
                    transform: 'scale(1.1)',
                    boxShadow: '0 4px 12px rgba(255, 48, 48, 0.6), 0 0 0 4px rgba(255, 48, 48, 0.2)'
                  },
                  '100%': {
                    transform: 'scale(1)',
                    boxShadow: '0 2px 8px rgba(255, 48, 48, 0.4), 0 0 0 2px rgba(255, 48, 48, 0.1)'
                  },
                },
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: '-4px',
                  left: '-4px',
                  right: '-4px',
                  bottom: '-4px',
                  borderRadius: '50%',
                  background: 'linear-gradient(45deg, rgba(255, 48, 48, 0.2), rgba(255, 100, 100, 0.1))',
                  animation: notificationCount > 0 ? 'notification-glow 3s ease-in-out infinite' : 'none',
                  zIndex: -1,
                },
                '@keyframes notification-glow': {
                  '0%, 100%': {
                    opacity: 0.3,
                    transform: 'scale(1)'
                  },
                  '50%': {
                    opacity: 0.7,
                    transform: 'scale(1.2)'
                  }
                }
              }
            }}
          >
            <NotificationsIcon 
              sx={{ 
                fontSize: '1.4rem',
                filter: notificationCount > 0 ? 'drop-shadow(0 0 2px rgba(255, 255, 255, 0.3))' : 'none',
                transition: 'all 0.3s ease'
              }} 
            />
          </Badge>
        </IconButton>
        
        {/* Avatar Icon - Click to open user menu */}
        <IconButton 
          color="inherit" 
          sx={{ ml: 1 }}
          onClick={handleMenuOpen}
          aria-label="user menu"
        >
          <Avatar 
            sx={{ 
              width: 32, 
              height: 32,
              bgcolor: 'secondary.main',
              fontSize: '0.875rem'
            }}
            src={user?.photoURL} // Use profile picture if available
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
              mt: 1,
              minWidth: 200,
            }
          }}
        >
          {/* User Info Header */}
          <MenuItem disabled sx={{ opacity: 1 }}>
            <Avatar 
              sx={{ 
                mr: 2, 
                width: 40, 
                height: 40,
                bgcolor: 'secondary.main'
              }}
              src={user?.photoURL}
            >
              {getUserInitials(user)}
            </Avatar>
            <div>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                {getDisplayName(user)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email || 'user@example.com'}
              </Typography>
            </div>
          </MenuItem>
          
          <Divider />
          
          {/* Menu Actions */}
          <MenuItem onClick={handleProfile}>
            <PersonIcon sx={{ mr: 2 }} />
            Profile
          </MenuItem>
          <MenuItem onClick={handleSettings}>
            <SettingsIcon sx={{ mr: 2 }} />
            Settings
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
}

export default ReForestAppBar;