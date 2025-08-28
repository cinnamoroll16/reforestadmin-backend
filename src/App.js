import { useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, useMediaQuery } from '@mui/material';
import theme from './theme/theme';
import ReForestAppBar from './components/AppBar';
import Navigation from './components/Navigation';
import Dashboard from './components/Dashboard';

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <ReForestAppBar handleDrawerToggle={handleDrawerToggle} />
        <Navigation 
          mobileOpen={mobileOpen} 
          handleDrawerToggle={handleDrawerToggle} 
          isMobile={isMobile} 
        />
        <Dashboard />
      </Box>
    </ThemeProvider>
  );
}

export default App;