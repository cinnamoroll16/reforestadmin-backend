// components/UploadDataset.js
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  LinearProgress,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import { CloudUpload, CheckCircle, Error } from '@mui/icons-material';

const UploadDataset = () => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please select an Excel file (.xlsx or .xls)');
      return;
    }

    setUploading(true);
    setProgress(0);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append('dataset', file); // Field name must be 'dataset'

    try {
      const response = await fetch('/api/ml/upload-dataset', {
        method: 'POST',
        body: formData,
        // Don't set Content-Type header - browser will set it with boundary
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed');
      }

      setResult(data);
      setProgress(100);
      
    } catch (err) {
      setError(err.message);
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, margin: 'auto', mt: 4 }}>
      <Card>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Upload Tree Dataset
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Upload your Excel file (Tree_Seedling_Dataset.xlsx) to enable ML recommendations
          </Typography>

          <input
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            id="dataset-upload"
            type="file"
            onChange={handleFileUpload}
            disabled={uploading}
          />
          <label htmlFor="dataset-upload">
            <Button
              variant="contained"
              component="span"
              disabled={uploading}
              startIcon={<CloudUpload />}
              sx={{ mb: 2 }}
            >
              Select Excel File
            </Button>
          </label>

          {uploading && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                Uploading dataset... {progress}%
              </Typography>
              <LinearProgress variant="determinate" value={progress} />
            </Box>
          )}

          {result && (
            <Alert 
              severity="success" 
              icon={<CheckCircle />}
              sx={{ mt: 2 }}
            >
              <Typography variant="subtitle2">
                Dataset uploaded successfully!
              </Typography>
              <Typography variant="body2">
                Loaded {result.speciesCount} tree species
              </Typography>
            </Alert>
          )}

          {error && (
            <Alert 
              severity="error" 
              icon={<Error />}
              sx={{ mt: 2 }}
            >
              {error}
            </Alert>
          )}

          {result && (
            <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="subtitle2">Upload Details:</Typography>
              <Typography variant="body2">File: {result.file}</Typography>
              <Typography variant="body2">Species Count: {result.speciesCount}</Typography>
              <Typography variant="body2">Timestamp: {new Date(result.timestamp).toLocaleString()}</Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default UploadDataset;