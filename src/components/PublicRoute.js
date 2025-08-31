// src/components/PublicRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, CircularProgress } from '@mui/material';

// const PublicRoute = ({ children }) => {
//   const { user, loading } = useAuth();

//   if (loading) {
//     return (
//       <Box
//         sx={{
//           display: 'flex',
//           justifyContent: 'center',
//           alignItems: 'center',
//           minHeight: '100vh',
//           bgcolor: '#f8f9fa',
//         }}
//       >
//         <CircularProgress size={40} sx={{ color: '#2e7d32' }} />
//       </Box>
//     );
//   }

//   if (user) {
//     return <Navigate to="/dashboard" replace />;
//   }

//   return children;
// };
// src/components/PublicRoute.js
const PublicRoute = ({ children }) => {
  // your public route logic
  return children;
};

export default PublicRoute; // ← This must be present