// src/components/LegalDocumentsCard.jsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

const LegalDocumentsCard = ({ open, onClose, documentType }) => {
  const getTitle = () => {
    return documentType === 'terms' ? 'Terms of Service' : 'Privacy Policy';
  };

  const getContent = () => {
    if (documentType === 'terms') {
      return (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600 }}>
            1. Acceptance of Terms
          </Typography>
          <Typography variant="body2" paragraph>
            By accessing and using ReForest, you accept and agree to be bound by the terms and provision of this agreement.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600, mt: 2 }}>
            2. Use of Service
          </Typography>
          <Typography variant="body2" paragraph>
            ReForest provides IoT-based soil analysis and tree recommendation services for reforestation efforts. 
            You agree to use this service only for lawful purposes and in accordance with environmental conservation goals.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600, mt: 2 }}>
            3. User Responsibilities
          </Typography>
          <Typography variant="body2" paragraph>
            Users are responsible for:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <Typography component="li" variant="body2">Maintaining the confidentiality of account credentials</Typography>
            <Typography component="li" variant="body2">Ensuring accurate data input for soil analysis</Typography>
            <Typography component="li" variant="body2">Following recommended planting guidelines</Typography>
            <Typography component="li" variant="body2">Reporting any system issues or data discrepancies</Typography>
          </Box>

          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600, mt: 2 }}>
            4. Data Accuracy
          </Typography>
          <Typography variant="body2" paragraph>
            While we strive to provide accurate soil analysis and tree recommendations, ReForest does not guarantee 
            100% accuracy. Users should use professional judgment and consult with local agricultural experts when necessary.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600, mt: 2 }}>
            5. Limitation of Liability
          </Typography>
          <Typography variant="body2" paragraph>
            ReForest shall not be liable for any direct, indirect, incidental, special, or consequential damages 
            resulting from the use or inability to use our service.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600, mt: 2 }}>
            6. Modifications to Service
          </Typography>
          <Typography variant="body2" paragraph>
            ReForest reserves the right to modify or discontinue the service at any time without prior notice.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600, mt: 2 }}>
            7. Governing Law
          </Typography>
          <Typography variant="body2" paragraph>
            These terms shall be governed by and construed in accordance with the laws of the Philippines, 
            specifically under environmental protection and data privacy regulations.
          </Typography>
        </Box>
      );
    } else {
      return (
        <Box>
          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600 }}>
            1. Information We Collect
          </Typography>
          <Typography variant="body2" paragraph>
            ReForest collects the following types of information:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <Typography component="li" variant="body2">
              <strong>Personal Information:</strong> Name, email address, role/organization
            </Typography>
            <Typography component="li" variant="body2">
              <strong>Environmental Data:</strong> Soil moisture, temperature, pH levels, location coordinates
            </Typography>
            <Typography component="li" variant="body2">
              <strong>Usage Data:</strong> Login times, features accessed, planting records
            </Typography>
          </Box>

          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600, mt: 2 }}>
            2. How We Use Your Information
          </Typography>
          <Typography variant="body2" paragraph>
            We use collected information to:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <Typography component="li" variant="body2">Provide personalized tree recommendations</Typography>
            <Typography component="li" variant="body2">Monitor and analyze soil conditions</Typography>
            <Typography component="li" variant="body2">Generate reforestation reports and statistics</Typography>
            <Typography component="li" variant="body2">Improve our service and user experience</Typography>
            <Typography component="li" variant="body2">Communicate with users about system updates</Typography>
          </Box>

          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600, mt: 2 }}>
            3. Data Storage and Security
          </Typography>
          <Typography variant="body2" paragraph>
            Your data is stored securely using Firebase cloud services with industry-standard encryption. 
            We implement appropriate technical and organizational measures to protect your information 
            against unauthorized access, alteration, disclosure, or destruction.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600, mt: 2 }}>
            4. Data Sharing
          </Typography>
          <Typography variant="body2" paragraph>
            ReForest does not sell or rent your personal information. We may share data with:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <Typography component="li" variant="body2">DENR and authorized environmental agencies for reforestation monitoring</Typography>
            <Typography component="li" variant="body2">Research institutions for environmental studies (anonymized data only)</Typography>
            <Typography component="li" variant="body2">Legal authorities when required by law</Typography>
          </Box>

          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600, mt: 2 }}>
            5. Your Rights
          </Typography>
          <Typography variant="body2" paragraph>
            Under the Data Privacy Act of 2012 (Philippines), you have the right to:
          </Typography>
          <Box component="ul" sx={{ pl: 3, mb: 2 }}>
            <Typography component="li" variant="body2">Access your personal data</Typography>
            <Typography component="li" variant="body2">Correct inaccurate information</Typography>
            <Typography component="li" variant="body2">Request deletion of your data</Typography>
            <Typography component="li" variant="body2">Object to data processing</Typography>
            <Typography component="li" variant="body2">Data portability</Typography>
          </Box>

          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600, mt: 2 }}>
            6. Cookies and Tracking
          </Typography>
          <Typography variant="body2" paragraph>
            ReForest uses essential cookies for authentication and session management. 
            We do not use third-party tracking or advertising cookies.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600, mt: 2 }}>
            7. Children's Privacy
          </Typography>
          <Typography variant="body2" paragraph>
            ReForest is not intended for users under 13 years of age. We do not knowingly collect 
            personal information from children under 13.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600, mt: 2 }}>
            8. Changes to Privacy Policy
          </Typography>
          <Typography variant="body2" paragraph>
            We may update this Privacy Policy from time to time. We will notify users of any material 
            changes via email or through the application.
          </Typography>

          <Typography variant="h6" gutterBottom sx={{ color: '#2e7d32', fontWeight: 600, mt: 2 }}>
            9. Contact Us
          </Typography>
          <Typography variant="body2" paragraph>
            For questions about this Privacy Policy or your data, contact us at: reforest@support.com
          </Typography>
        </Box>
      );
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: '90vh'
        }
      }}
    >
      <DialogTitle sx={{ 
        m: 0, 
        p: 2, 
        backgroundColor: '#f5f5f5',
        borderBottom: '1px solid #e0e0e0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <Typography variant="h5" component="div" sx={{ fontWeight: 600, color: '#2e7d32' }}>
          {getTitle()}
        </Typography>
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            color: 'grey.500',
            '&:hover': { backgroundColor: 'grey.200' }
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ p: 3, backgroundColor: '#fff' }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3, fontStyle: 'italic' }}>
          Last updated: June 2025
        </Typography>
        {getContent()}
      </DialogContent>
      
      <Divider />
      
      <DialogActions sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
        <Button 
          onClick={onClose}
          variant="contained"
          sx={{
            backgroundColor: '#2e7d32',
            '&:hover': { backgroundColor: '#1b5e20' },
            textTransform: 'none',
            px: 3,
            borderRadius: 1.5
          }}
        >
          I Understand
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LegalDocumentsCard;