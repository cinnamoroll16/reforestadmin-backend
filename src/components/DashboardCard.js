import React from 'react';
import { Card, CardContent, Typography, Box, Badge } from '@mui/material';

function DashboardCard({ title, description, icon, notificationCount }) {
  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'transform 0.2s',
        '&:hover': {
          transform: 'scale(1.02)',
          boxShadow: 3
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
        <Box sx={{ position: 'relative' }}>
          {notificationCount > 0 && (
            <Badge 
              badgeContent={notificationCount} 
              color="secondary"
              sx={{
                position: 'absolute',
                top: -10,
                right: -10
              }}
            >
              {icon}
            </Badge>
          )}
          {notificationCount === 0 && icon}
        </Box>
        <Typography variant="h5" component="h2" gutterBottom sx={{ mt: 2 }}>
          {title}
        </Typography>
        <Typography color="textSecondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default DashboardCard;