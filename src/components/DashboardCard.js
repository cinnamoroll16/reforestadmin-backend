import { Card, CardContent, Typography, Box, Badge, Button, Chip } from '@mui/material';
import { ArrowForward as ArrowForwardIcon } from '@mui/icons-material';

function DashboardCard({ title, description, icon, notificationCount, onClick }) {
  return (
    <Card 
      sx={{ 
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.3s ease-in-out',
        borderRadius: 2,
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e9ecef',
        position: 'relative',
        overflow: 'visible',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)',
          '& .action-button': {
            opacity: 1,
            transform: 'translateY(0)',
          }
        }
      }}
    >
      {/* Notification badge */}
      {notificationCount > 0 && (
        <Chip 
          label={notificationCount}
          color="error"
          size="small"
          sx={{
            position: 'absolute',
            top: -10,
            right: -10,
            fontWeight: 'bold',
            fontSize: '0.75rem',
            minWidth: 24,
            height: 24,
            zIndex: 1,
          }}
        />
      )}
      
      <CardContent sx={{ 
        flexGrow: 1, 
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center'
      }}>
        {/* Icon container with background */}
        <Box 
          sx={{
            width: 70,
            height: 70,
            borderRadius: '50%',
            backgroundColor: 'primary.light',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mb: 3,
            color: 'primary.contrastText',
            position: 'relative',
            '&::before': {
              content: '""',
              position: 'absolute',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.2)',
              transform: 'scale(1.1)',
            }
          }}
        >
          <Box sx={{ 
            fontSize: 32,
            zIndex: 1,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))'
          }}>
            {icon}
          </Box>
        </Box>

        {/* Title */}
        <Typography 
          variant="h6" 
          component="h3" 
          gutterBottom 
          sx={{ 
            fontWeight: 600,
            color: 'text.primary',
            mb: 2,
            fontSize: '1.25rem'
          }}
        >
          {title}
        </Typography>
        
        {/* Description */}
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{ 
            mb: 3,
            lineHeight: 1.5,
            fontSize: '0.9rem'
          }}
        >
          {description}
        </Typography>
        
        {/* Action button that appears on hover */}
        <Button
          className="action-button"
          variant="contained"
          endIcon={<ArrowForwardIcon />}
          onClick={onClick}
          sx={{
            opacity: 0,
            transform: 'translateY(10px)',
            transition: 'all 0.3s ease-in-out',
            borderRadius: 2,
            px: 3,
            py: 1,
            fontSize: '0.875rem',
            fontWeight: 500,
            textTransform: 'none',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            '&:hover': {
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            }
          }}
        >
          View Details
        </Button>
      </CardContent>
    </Card>
  );
}

export default DashboardCard;