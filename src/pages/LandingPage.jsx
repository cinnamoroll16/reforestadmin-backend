// src/pages/LandingPage.jsx
import React, { useState } from 'react';
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
  Drawer,
  List,
  ListItem,
  ListItemText,
  Avatar,
  Chip,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  PlayArrow,
  Close,
  Forest, // ✅ Changed from Eco to Nature
  Speed,
  Science,
  Groups,
  TrendingUp,
  CheckCircle,
  Sensors,
  Analytics,
  CloudQueue,
  Security,
  Phone,
  Email,
  LocationOn,
  Facebook,
  Twitter,
  Instagram,
  LinkedIn,
} from '@mui/icons-material';

const LandingPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogin = () => {
    navigate('/login');
  };

  const handleGetStarted = () => {
    navigate('/register');
  };

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  // Features data
  const features = [
    {
      icon: <Sensors sx={{ fontSize: 40 }} />,
      title: 'IoT Soil Analysis',
      description: 'Real-time monitoring of soil moisture, temperature, and pH levels using advanced IoT sensors.',
      color: '#2196f3',
    },
    {
      icon: <Science sx={{ fontSize: 40 }} />,
      title: 'AI Recommendations',
      description: 'Machine learning algorithms analyze data to suggest optimal tree species for your location.',
      color: '#9c27b0',
    },
    {
      icon: <Analytics sx={{ fontSize: 40 }} />,
      title: 'Data Analytics',
      description: 'Comprehensive dashboard with insights and analytics for informed decision-making.',
      color: '#ff9800',
    },
    {
      icon: <CloudQueue sx={{ fontSize: 40 }} />,
      title: 'Cloud Integration',
      description: 'Secure cloud storage for all your reforestation data with 99.9% uptime guarantee.',
      color: '#00bcd4',
    },
    {
      icon: <Groups sx={{ fontSize: 40 }} />,
      title: 'Team Collaboration',
      description: 'Work together with your team, assign tasks, and track progress in real-time.',
      color: '#4caf50',
    },
    {
      icon: <Security sx={{ fontSize: 40 }} />,
      title: 'Enterprise Security',
      description: 'Bank-level encryption and security protocols to protect your sensitive data.',
      color: '#f44336',
    },
  ];

  // Stats data
  const stats = [
    { value: '10K+', label: 'Trees Planted' },
    { value: '500+', label: 'Active Users' },
    { value: '50+', label: 'Locations' },
    { value: '95%', label: 'Success Rate' },
  ];

  // Benefits data
  const benefits = [
    'Increase tree survival rate by up to 40%',
    'Reduce planting costs with data-driven decisions',
    'Monitor multiple sites from one dashboard',
    'Get instant alerts for environmental changes',
    'Access historical data and trend analysis',
    'Collaborate with teams across locations',
  ];

  return (
    <Box sx={{ bgcolor: '#f8f9fa' }}>
      {/* Navigation */}
      <AppBar
        position="sticky"
        sx={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid',
          borderColor: 'grey.200',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Forest sx={{ color: '#2e7d32', fontSize: 32 }} /> {/* ✅ Changed from Eco */}
            <Typography
              variant="h5"
              component="div"
              sx={{
                fontWeight: 'bold',
                background: 'linear-gradient(90deg, #2e7d32 0%, #4caf50 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              REFOREST
            </Typography>
          </Box>

          {!isMobile ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Button
                color="inherit"
                href="#features"
                sx={{
                  color: 'grey.700',
                  fontWeight: '500',
                  '&:hover': { color: '#2e7d32', backgroundColor: 'transparent' },
                }}
              >
                Features
              </Button>
              <Button
                color="inherit"
                href="#about"
                sx={{
                  color: 'grey.700',
                  fontWeight: '500',
                  '&:hover': { color: '#2e7d32', backgroundColor: 'transparent' },
                }}
              >
                About
              </Button>
              <Button
                color="inherit"
                href="#contact"
                sx={{
                  color: 'grey.700',
                  fontWeight: '500',
                  '&:hover': { color: '#2e7d32', backgroundColor: 'transparent' },
                }}
              >
                Contact
              </Button>
              <Button
                variant="outlined"
                onClick={handleLogin}
                sx={{
                  borderColor: '#2e7d32',
                  color: '#2e7d32',
                  px: 3,
                  borderRadius: 2,
                  fontWeight: '600',
                  '&:hover': {
                    borderColor: '#1b5e20',
                    backgroundColor: 'rgba(46, 125, 50, 0.04)',
                  },
                }}
              >
                Log In
              </Button>
              <Button
                variant="contained"
                onClick={handleGetStarted}
                sx={{
                  background: 'linear-gradient(90deg, #2e7d32 0%, #4caf50 100%)',
                  color: 'white',
                  px: 3,
                  borderRadius: 2,
                  fontWeight: '600',
                  '&:hover': {
                    background: 'linear-gradient(90deg, #1b5e20 0%, #388e3c 100%)',
                    boxShadow: '0 8px 16px rgba(46, 125, 50, 0.3)',
                  },
                }}
              >
                Get Started Free
              </Button>
            </Box>
          ) : (
            <IconButton onClick={toggleMobileMenu} sx={{ color: 'grey.700' }}>
              <MenuIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile Menu Drawer */}
      <Drawer anchor="right" open={mobileMenuOpen} onClose={toggleMobileMenu}>
        <Box sx={{ width: 280, p: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <IconButton onClick={toggleMobileMenu}>
              <Close />
            </IconButton>
          </Box>
          <List>
            <ListItem button onClick={() => { toggleMobileMenu(); window.location.href = '#features'; }}>
              <ListItemText primary="Features" />
            </ListItem>
            <ListItem button onClick={() => { toggleMobileMenu(); window.location.href = '#about'; }}>
              <ListItemText primary="About" />
            </ListItem>
            <ListItem button onClick={() => { toggleMobileMenu(); window.location.href = '#contact'; }}>
              <ListItemText primary="Contact" />
            </ListItem>
            <Divider sx={{ my: 2 }} />
            <ListItem>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleLogin}
                sx={{ borderColor: '#2e7d32', color: '#2e7d32', mb: 1 }}
              >
                Log In
              </Button>
            </ListItem>
            <ListItem>
              <Button
                fullWidth
                variant="contained"
                onClick={handleGetStarted}
                sx={{ background: 'linear-gradient(90deg, #2e7d32 0%, #4caf50 100%)' }}
              >
                Get Started
              </Button>
            </ListItem>
          </List>
        </Box>
      </Drawer>

      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #0a5c36 0%, #2e7d32 50%, #4caf50 100%)',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1) 0%, transparent 50%)',
            pointerEvents: 'none',
          },
        }}
      >
        <Container maxWidth="lg" sx={{ py: { xs: 8, md: 12 }, position: 'relative', zIndex: 1 }}>
          <Grid container spacing={4} alignItems="center">
            <Grid item xs={12} md={6}>
              <Box sx={{ animation: 'fadeInUp 1s ease' }}>
                <Chip
                  label="🌱 Now Supporting IoT Integration"
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    mb: 3,
                    fontWeight: '600',
                    backdropFilter: 'blur(10px)',
                  }}
                />
                <Typography
                  variant="h2"
                  sx={{
                    fontWeight: 'bold',
                    color: 'white',
                    mb: 3,
                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                    lineHeight: 1.2,
                  }}
                >
                  Plant Smarter,{' '}
                  <Typography
                    component="span"
                    sx={{
                      color: '#c8e6c9',
                      fontWeight: 'bold',
                      fontSize: 'inherit',
                    }}
                  >
                    Grow Faster
                  </Typography>
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    color: 'rgba(255,255,255,0.9)',
                    mb: 4,
                    lineHeight: 1.6,
                    fontSize: { xs: '1.1rem', md: '1.25rem' },
                  }}
                >
                  Transform your reforestation efforts with AI-powered soil analysis and data-driven tree recommendations. Increase survival rates by 40% and reduce costs significantly.
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={handleGetStarted}
                    sx={{
                      bgcolor: 'white',
                      color: '#2e7d32',
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      fontWeight: '700',
                      fontSize: '1.1rem',
                      '&:hover': {
                        bgcolor: '#f5f5f5',
                        boxShadow: '0 12px 24px rgba(0,0,0,0.2)',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s ease',
                    }}
                  >
                    Start Planting Now
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    startIcon={<PlayArrow />}
                    onClick={() => window.open('https://www.youtube.com/watch?v=0OG8MddO8OM', '_blank')}
                    sx={{
                      borderColor: 'white',
                      color: 'white',
                      px: 4,
                      py: 1.5,
                      borderRadius: 2,
                      fontWeight: '600',
                      fontSize: '1.1rem',
                      '&:hover': {
                        bgcolor: 'rgba(255,255,255,0.1)',
                        borderColor: 'white',
                      },
                    }}
                  >
                    Watch Demo
                  </Button>
                </Box>
                <Box sx={{ display: 'flex', gap: 4, mt: 4, flexWrap: 'wrap' }}>
                  {['Planting service', 'Request to plant tree', '24/7 Support'].map((text) => (
                    <Box key={text} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircle sx={{ color: '#c8e6c9', fontSize: 20 }} />
                      <Typography sx={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.9rem' }}>
                        {text}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  animation: 'float 6s ease-in-out infinite',
                  '@keyframes float': {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                  },
                }}
              >
                <Card
                  sx={{
                    bgcolor: 'rgba(255,255,255,0.95)',
                    backdropFilter: 'blur(10px)',
                    borderRadius: 4,
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    p: 3,
                  }}
                >
                  <Box sx={{ textAlign: 'center' }}>
                    <Forest sx={{ fontSize: 100, color: '#2e7d32', mb: 2 }} />
                    <Typography variant="h5" fontWeight="bold" color="#2e7d32" gutterBottom>
                      Dashboard Preview
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      Monitor soil conditions in real-time
                    </Typography>
                    <Grid container spacing={2}>
                      {['Soil Moisture: 65%', 'Temperature: 28°C', 'pH Level: 6.5', 'Status: Optimal'].map((stat) => (
                        <Grid item xs={6} key={stat}>
                          <Box
                            sx={{
                              p: 2,
                              bgcolor: '#f5f5f5',
                              borderRadius: 2,
                              border: '2px solid #e0e0e0',
                            }}
                          >
                            <Typography variant="body2" fontWeight="600">
                              {stat}
                            </Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                  </Box>
                </Card>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* Stats Section */}
      <Box sx={{ py: 6, bgcolor: 'white' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            {stats.map((stat) => (
              <Grid item xs={6} md={3} key={stat.label}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography
                    variant="h3"
                    sx={{
                      fontWeight: 'bold',
                      background: 'linear-gradient(90deg, #2e7d32 0%, #4caf50 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                      mb: 1,
                    }}
                  >
                    {stat.value}
                  </Typography>
                  <Typography variant="body1" color="text.secondary" fontWeight="500">
                    {stat.label}
                  </Typography>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Features Section */}
      <Box id="features" sx={{ py: 10, bgcolor: '#f8f9fa' }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 8 }}>
            <Chip label="FEATURES" color="success" sx={{ mb: 2, fontWeight: '600' }} />
            <Typography variant="h3" fontWeight="bold" gutterBottom>
              Everything You Need for{' '}
              <Typography component="span" sx={{ color: '#2e7d32', fontSize: 'inherit', fontWeight: 'bold' }}>
                Successful Reforestation
              </Typography>
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700, mx: 'auto', mt: 2 }}>
              Powerful tools and insights to help you make data-driven decisions for optimal tree growth
            </Typography>
          </Box>

          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={4} key={index}>
                <Card
                  sx={{
                    p: 4,
                    height: '100%',
                    borderRadius: 3,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 24px rgba(0,0,0,0.15)',
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 70,
                      height: 70,
                      borderRadius: 2,
                      bgcolor: `${feature.color}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: feature.color,
                      mb: 3,
                    }}
                  >
                    {feature.icon}
                  </Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    {feature.title}
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    {feature.description}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Benefits Section */}
      <Box sx={{ py: 10, bgcolor: 'white' }}>
        <Container maxWidth="lg">
          <Grid container spacing={6} alignItems="center">
            <Grid item xs={12} md={6}>
              <Chip label="BENEFITS" color="success" sx={{ mb: 2, fontWeight: '600' }} />
              <Typography variant="h3" fontWeight="bold" gutterBottom>
                Why Choose ReForest?
              </Typography>
              <Typography variant="h6" color="text.secondary" paragraph>
                Join thousands of organizations worldwide using ReForest to achieve their sustainability goals
              </Typography>
              <Box sx={{ mt: 4 }}>
                {benefits.map((benefit, index) => (
                  <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <CheckCircle sx={{ color: '#2e7d32', mt: 0.5 }} />
                    <Typography variant="body1">{benefit}</Typography>
                  </Box>
                ))}
              </Box>
              <Button
                variant="contained"
                size="large"
                onClick={handleGetStarted}
                sx={{
                  mt: 4,
                  background: 'linear-gradient(90deg, #2e7d32 0%, #4caf50 100%)',
                  px: 4,
                  py: 1.5,
                }}
              >
                Start Now
              </Button>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  bgcolor: '#f5f5f5',
                  borderRadius: 4,
                  p: 4,
                  textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                }}
              >
                <TrendingUp sx={{ fontSize: 120, color: '#2e7d32', mb: 2 }} />
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                  40% Higher
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  Tree Survival Rate with Our System
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box
        sx={{
          py: 10,
          background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
          textAlign: 'center',
        }}
      >
        <Container maxWidth="md">
          <Typography variant="h3" fontWeight="bold" color="white" gutterBottom>
            Ready to Transform Your Reforestation?
          </Typography>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.9)', mb: 4 }}>
            Start your plan for reforestation. Save the Earth in the future.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleGetStarted}
              sx={{
                bgcolor: 'white',
                color: '#2e7d32',
                px: 5,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: '700',
                '&:hover': {
                  bgcolor: '#f5f5f5',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
                },
              }}
            >
              Get Started Now
            </Button>
            <Button
              variant="outlined"
              size="large"
              onClick={handleLogin}
              sx={{
                borderColor: 'white',
                color: 'white',
                px: 5,
                py: 2,
                fontSize: '1.1rem',
                fontWeight: '600',
                '&:hover': {
                  bgcolor: 'rgba(255,255,255,0.1)',
                  borderColor: 'white',
                },
              }}
            >
              Sign In
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box id="contact" sx={{ py: 8, bgcolor: '#1a1a1a', color: 'white' }}>
        <Container maxWidth="lg">
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Forest sx={{ fontSize: 32 }} /> {/* ✅ Changed from Eco */}
                <Typography variant="h5" fontWeight="bold">
                  REFOREST
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
                Empowering sustainable reforestation through innovative IoT technology and AI-driven insights.
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {[Facebook, Twitter, Instagram, LinkedIn].map((Icon, index) => (
                  <IconButton key={index} sx={{ color: 'white', bgcolor: 'rgba(255,255,255,0.1)' }}>
                    <Icon />
                  </IconButton>
                ))}
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Contact Us
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Phone fontSize="small" />
                  <Typography variant="body2">+63 123 456 7890</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Email fontSize="small" />
                  <Typography variant="body2">support@reforest.com</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <LocationOn fontSize="small" />
                  <Typography variant="body2">
                    University of Cebu - Banilad<br />
                    Cebu City, Philippines
                  </Typography>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Quick Links
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {['Features', 'Pricing', 'Documentation', 'API', 'Support', 'Privacy Policy'].map((link) => (
                  <Button
                    key={link}
                    sx={{
                      color: 'rgba(255,255,255,0.7)',
                      justifyContent: 'flex-start',
                      textTransform: 'none',
                      '&:hover': { color: 'white' },
                    }}
                  >
                    {link}
                  </Button>
                ))}
              </Box>
            </Grid>
          </Grid>
          <Divider sx={{ my: 4, bgcolor: 'rgba(255,255,255,0.1)' }} />
          <Typography variant="body2" sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
            © 2025 ReForest. All rights reserved. Built with 🌱 for a greener future.
          </Typography>
        </Container>
      </Box>

      {/* Keyframe animations */}
      <style>
        {`
          @keyframes fadeInUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </Box>
  );
};

export default LandingPage;