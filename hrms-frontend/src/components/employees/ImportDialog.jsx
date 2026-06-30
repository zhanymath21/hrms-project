// src/components/employees/ImportDialog.jsx

import React, { useState } from 'react';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, Divider, LinearProgress, IconButton,
  Paper, List, ListItem, ListItemText, ListItemIcon, Chip
} from '@mui/material';
import {
  Upload as UploadIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import employeeService from '../../services/employeeService';

const ImportDialog = ({ open, onClose, onImport, loading }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [templateLoading, setTemplateLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ['.xlsx', '.xls', '.csv'];
      const extension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.'));
      if (!validTypes.includes(extension)) {
        setError('Please upload Excel or CSV file');
        return;
      }
      
      // Check file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size exceeds 10MB limit');
        return;
      }
      
      setFile(selectedFile);
      setError('');
      setImportResult(null);
    }
  };

  const handleDownloadTemplate = async () => {
    setTemplateLoading(true);
    setError('');
    setImportResult(null);
    try {
      await employeeService.downloadTemplate();
    } catch (err) {
      setError(err.message || 'Failed to download template');
      console.error('Download template error:', err);
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }
    
    setImportResult(null);
    setError('');
    
    try {
      const result = await onImport(file);
      setImportResult(result);
      
      // Auto close on success
      if (result.success_count > 0 && result.fail_count === 0) {
        setTimeout(() => {
          onClose();
          setFile(null);
          setImportResult(null);
        }, 3000);
      }
    } catch (err) {
      setError(err.message || 'Import failed');
    }
  };

  const handleClose = () => {
    setFile(null);
    setError('');
    setImportResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <UploadIcon color="primary" />
            <Typography variant="h6">Import Employees</Typography>
            {importResult && (
              <Chip
                label={`${importResult.success_count || 0} imported`}
                color={importResult.fail_count === 0 ? 'success' : 'warning'}
                size="small"
              />
            )}
          </Box>
          <IconButton onClick={handleClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        {/* Instructions */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" fontWeight="bold">
            📋 Import Instructions:
          </Typography>
          <Typography variant="body2" sx={{ fontSize: '0.875rem' }}>
            <ol style={{ margin: '8px 0', paddingLeft: '20px' }}>
              <li>Download the template file below</li>
              <li>Fill in employee data (required fields marked with *)</li>
              <li>Upload the filled file</li>
              <li>Review import results</li>
            </ol>
          </Typography>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
            <strong>Supported formats:</strong> .xlsx, .xls, .csv | <strong>Max size:</strong> 10MB
          </Typography>
        </Alert>

        {/* Download Template */}
        <Paper variant="outlined" sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <DownloadIcon color="primary" />
              <Box>
                <Typography variant="body2" fontWeight="bold">
                  Step 1: Download Template
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  Get the Excel template with all required fields
                </Typography>
              </Box>
            </Box>
            <Button
              variant="outlined"
              onClick={handleDownloadTemplate}
              disabled={templateLoading}
              startIcon={templateLoading ? <CircularProgress size={16} /> : <DownloadIcon />}
              size="small"
            >
              {templateLoading ? 'Downloading...' : 'Download'}
            </Button>
          </Box>
        </Paper>

        <Divider sx={{ my: 2 }} />

        {/* Upload File */}
        <Box>
          <Typography variant="body2" fontWeight="bold" gutterBottom>
            Step 2: Upload Filled Template
          </Typography>
          
          <Button
            variant="outlined"
            component="label"
            fullWidth
            sx={{
              py: 3,
              borderStyle: 'dashed',
              borderWidth: 2,
              '&:hover': { borderStyle: 'dashed', borderWidth: 2 },
            }}
            disabled={loading}
          >
            {file ? (
              <Box>
                <Typography variant="body2" color="success.main">
                  ✅ {file.name}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {(file.size / 1024).toFixed(2)} KB
                </Typography>
              </Box>
            ) : (
              <Box>
                <UploadIcon sx={{ fontSize: 40, color: 'text.secondary', display: 'block', mx: 'auto', mb: 1 }} />
                <Typography variant="body2" color="textSecondary">
                  Click to choose Excel file (.xlsx, .xls, .csv)
                </Typography>
              </Box>
            )}
            <input
              type="file"
              hidden
              accept=".xlsx,.xls,.csv"
              onChange={handleFileChange}
            />
          </Button>
        </Box>

        {/* Error Display */}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        {/* Import Result Display */}
        {importResult && (
          <Paper variant="outlined" sx={{ mt: 2, p: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
              Import Results
            </Typography>
            
            <Box display="flex" gap={2} mb={2}>
              <Box flex={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <CheckCircleIcon color="success" />
                  <Typography variant="body2">
                    <strong>Success:</strong> {importResult.success_count || 0}
                  </Typography>
                </Box>
              </Box>
              <Box flex={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <ErrorIcon color="error" />
                  <Typography variant="body2">
                    <strong>Failed:</strong> {importResult.fail_count || 0}
                  </Typography>
                </Box>
              </Box>
            </Box>

            {importResult.errors && importResult.errors.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                  Error Details:
                </Typography>
                <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
                  <List dense disablePadding>
                    {importResult.errors.slice(0, 10).map((err, idx) => (
                      <ListItem key={idx} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 24 }}>
                          <ErrorIcon fontSize="small" color="error" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={err}
                          primaryTypographyProps={{ 
                            variant: 'caption',
                            color: 'error',
                            sx: { whiteSpace: 'pre-wrap' }
                          }}
                        />
                      </ListItem>
                    ))}
                    {importResult.errors.length > 10 && (
                      <ListItem>
                        <ListItemText 
                          primary={`... and ${importResult.errors.length - 10} more errors`}
                          primaryTypographyProps={{ variant: 'caption', color: 'textSecondary' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>
              </>
            )}
          </Paper>
        )}

        {/* Loading */}
        {loading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
              Importing employees... Please wait.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button onClick={handleClose} disabled={loading}>
          {importResult?.success_count > 0 && importResult?.fail_count === 0 ? 'Close' : 'Cancel'}
        </Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!file || loading}
          startIcon={loading ? <CircularProgress size={20} /> : <UploadIcon />}
        >
          {loading ? 'Importing...' : 'Import Now'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportDialog;