// src/components/employees/ImportDialog.jsx

import React, { useState } from 'react';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent,
  DialogActions, Alert, Divider, LinearProgress, IconButton
} from '@mui/material';
import { Upload as UploadIcon, Close as CloseIcon } from '@mui/icons-material';
import employeeService from '../../services/employeeService';

const ImportDialog = ({ open, onClose, onImport, loading }) => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [templateLoading, setTemplateLoading] = useState(false);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ['.xlsx', '.xls', '.csv'];
      const extension = selectedFile.name.substring(selectedFile.name.lastIndexOf('.'));
      if (!validTypes.includes(extension)) {
        setError('Please upload Excel or CSV file');
        return;
      }
      setFile(selectedFile);
      setError('');
    }
  };

  const handleDownloadTemplate = async () => {
    setTemplateLoading(true);
    setError('');
    try {
      await employeeService.downloadTemplate();
    } catch (err) {
      setError(err.message || 'Failed to download template');
      console.error('Download template error:', err);
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleImport = () => {
    if (!file) {
      setError('Please select a file');
      return;
    }
    onImport(file);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">📥 Import Employees</Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Step 1:</strong> Download the template file<br />
            <strong>Step 2:</strong> Fill in employee data<br />
            <strong>Step 3:</strong> Upload the filled file
          </Typography>
        </Alert>

        <Button
          variant="outlined"
          fullWidth
          onClick={handleDownloadTemplate}
          disabled={templateLoading}
          sx={{ mb: 2 }}
        >
          {templateLoading ? '⏳ Downloading...' : '📥 Download Template'}
        </Button>

        <Divider sx={{ my: 2 }} />

        <Button
          variant="outlined"
          component="label"
          fullWidth
          sx={{ py: 2, borderStyle: 'dashed' }}
          disabled={loading}
        >
          {file ? `✅ ${file.name}` : '📁 Choose Excel File (.xlsx, .csv)'}
          <input
            type="file"
            hidden
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
          />
        </Button>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {loading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
            <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
              Importing employees...
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleImport}
          disabled={!file || loading}
          startIcon={<UploadIcon />}
        >
          {loading ? 'Importing...' : 'Import Now'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ImportDialog;