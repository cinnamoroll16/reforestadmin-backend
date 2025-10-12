// src/pages/LandingPage.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Button,
  Container,
  Grid,
  Card,
  CardContent,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  PlayArrow,
  CorporateFare,
  Code,
  LinkedIn,
} from '@mui/icons-material';

const LandingPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleLogin = () => {
    navigate('/login');
  };

  const handleGetStarted = () => {
    navigate('/register');
  };

  // Fallback background colors if images don't load
  const mainBackground = {
    backgroundColor: '#0a5c36',
    backgroundImage: 'linear-gradient(135deg, #0a5c36 0%, #1b7e4d 100%)',
    minHeight: '100vh',
  };

  const heroBackground = {
    backgroundColor: '#2d7a53',
    backgroundImage: 'linear-gradient(135deg, #2d7a53 0%, #4ca771 100%)',
    minHeight: '100vh',
  };

  return (
    <Box sx={mainBackground}>
      {/* Navigation */}
      <AppBar
        position="sticky"
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid',
          borderColor: 'grey.100',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
          <Typography
            variant="h4"
            component="div"
            sx={{
              fontWeight: 'bold',
              background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            REFOREST
          </Typography>

          {!isMobile ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Button
                color="inherit"
                sx={{
                  color: 'grey.700',
                  fontWeight: '500',
                  '&:hover': {
                    color: 'green.600',
                    backgroundColor: 'transparent',
                  },
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: -2,
                    left: 0,
                    width: 0,
                    height: 2,
                    backgroundColor: 'green.500',
                    transition: 'width 0.3s ease',
                  },
                  '&:hover::after': {
                    width: '100%',
                  },
                }}
              >
                About Us
              </Button>
              <Button
                color="inherit"
                sx={{
                  color: 'grey.700',
                  fontWeight: '500',
                  '&:hover': {
                    color: 'green.600',
                    backgroundColor: 'transparent',
                  },
                  position: 'relative',
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: -2,
                    left: 0,
                    width: 0,
                    height: 2,
                    backgroundColor: 'green.500',
                    transition: 'width 0.3s ease',
                  },
                  '&:hover::after': {
                    width: '100%',
                  },
                }}
              >
                Contact
              </Button>
              <Button
                variant="contained"
                onClick={handleLogin}
                sx={{
                  background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                  color: 'white',
                  px: 4,
                  py: 1,
                  borderRadius: 2,
                  fontWeight: '600',
                  fontSize: '1rem',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #16a34a 0%, #15803d 100%)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2)',
                    transform: 'translateY(-2px)',
                  },
                  transition: 'all 0.3s ease',
                }}
              >
                Log In
              </Button>
            </Box>
          ) : (
            <IconButton 
              color="inherit" 
              sx={{ color: 'grey.700' }}
            >
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Hero Section */}
      <Box sx={heroBackground}>
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 } }}>
          <Grid container spacing={6} alignItems="center" justifyContent="center">
            <Grid item xs={12} md={8} lg={6}>
              <Card
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
                  borderRadius: 4,
                  p: { xs: 3, md: 4 },
                  mx: 'auto',
                  animation: 'fadeIn 1s ease forwards',
                  '@keyframes fadeIn': {
                    from: {
                      opacity: 0,
                      transform: 'translateY(30px)',
                    },
                    to: {
                      opacity: 1,
                      transform: 'translateY(0)',
                    },
                  },
                }}
              >
                <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {/* Main Heading */}
                    <Box>
                      <Typography
                        variant="h3"
                        component="h1"
                        sx={{
                          fontWeight: 'bold',
                          color: 'grey.900',
                          lineHeight: 1.2,
                          fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
                          textAlign: { xs: 'center', md: 'left' },
                        }}
                      >
                        Plant the Right Tree, in the{' '}
                        <Typography
                          component="span"
                          sx={{
                            background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            color: 'transparent',
                            fontWeight: 'bold',
                            fontSize: 'inherit',
                            display: 'inline-block',
                          }}
                        >
                          Right Time
                        </Typography>
                      </Typography>
                    </Box>

                    {/* Subtitle */}
                    <Typography
                      variant="h6"
                      sx={{
                        color: 'grey.600',
                        fontSize: { xs: '1rem', md: '1.1rem' },
                        textAlign: { xs: 'center', md: 'left' },
                        lineHeight: 1.6,
                      }}
                    >
                      Focus on choosing suitable tree species for specific environments 
                      to maximize growth and sustainability.
                    </Typography>

                    {/* Buttons */}
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: 2,
                        pt: 2,
                        justifyContent: { xs: 'center', md: 'flex-start' },
                      }}
                    >
                      <Button
                        variant="contained"
                        size="large"
                        onClick={handleGetStarted}
                        sx={{
                          background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                          color: 'white',
                          px: { xs: 4, md: 6 },
                          py: 2,
                          borderRadius: 3,
                          fontWeight: '600',
                          fontSize: '1.1rem',
                          minWidth: { xs: '200px', sm: 'auto' },
                          '&:hover': {
                            background: 'linear-gradient(90deg, #16a34a 0%, #15803d 100%)',
                            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
                            transform: 'translateY(-2px)',
                          },
                          transition: 'all 0.3s ease',
                        }}
                      >
                        Get Started
                      </Button>

                      <Button
                        variant="outlined"
                        size="large"
                        startIcon={<PlayArrow />}
                        sx={{
                          border: '2px solid',
                          borderColor: 'green.500',
                          color: 'green.700',
                          px: { xs: 4, md: 6 },
                          py: 2,
                          borderRadius: 3,
                          fontWeight: '600',
                          fontSize: '1.1rem',
                          minWidth: { xs: '200px', sm: 'auto' },
                          '&:hover': {
                            background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
                            color: 'white',
                            borderColor: 'transparent',
                            transform: 'translateY(-2px)',
                          },
                          transition: 'all 0.3s ease',
                        }}
                        onClick={() => window.open('https://www.youtube.com/watch?v=0OG8MddO8OM', '_blank')}
                      >
                        Learn More
                      </Button>
                    </Box>

                    {/* Trusted By Section */}
                    <Box 
                      sx={{ 
                        display: 'flex', 
                        flexDirection: { xs: 'column', sm: 'row' },
                        alignItems: 'center', 
                        gap: 3, 
                        pt: 4,
                        justifyContent: { xs: 'center', md: 'flex-start' },
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            backgroundColor: 'green.100',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'green.600',
                            border: '2px solid white',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          }}
                        >
                          <CorporateFare />
                        </Box>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            backgroundColor: 'blue.100',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'blue.600',
                            border: '2px solid white',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            ml: -1,
                          }}
                        >
                          <Code />
                        </Box>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: '50%',
                            backgroundColor: 'blue.50',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'blue.500',
                            border: '2px solid white',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                            ml: -1,
                          }}
                        >
                          <LinkedIn />
                        </Box>
                      </Box>
                      <Typography 
                        variant="body1" 
                        color="grey.600"
                        sx={{ textAlign: { xs: 'center', sm: 'left' } }}
                      >
                        Trusted by{' '}
                        <Typography
                          component="span"
                          sx={{ fontWeight: 'bold', color: 'grey.900' }}
                        >
                          4000+
                        </Typography>{' '}
                        companies worldwide
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;