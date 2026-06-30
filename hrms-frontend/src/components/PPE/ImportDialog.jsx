// src/components/PPE/ImportDialog.jsx

import React from 'react';
import {
  Box, Button, Typography, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, Divider
} from '@mui/material';

// PASTIKAN ADA export default
export default function ImportDialog({ 
  open, 
  onClose, 
  onDownloadTemplate, 
  onImport, 
  importFile, 
  setImportFile, 
  importing, 
  importResult 
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>📥 Import PPE from Excel</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2" fontWeight="bold">Step 1: Download Template</Typography>
          <Typography variant="body2">Download the template, fill in your PPE data, then upload.</Typography>
          <Button variant="outlined" onClick={onDownloadTemplate} sx={{ mt: 1 }} size="small">
            📥 Download Template
          </Button>
        </Alert>

        <Divider sx={{ my: 2 }} />

        <Typography variant="body2" fontWeight="bold" gutterBottom>Step 2: Upload Filled Template</Typography>
        <Button variant="outlined" component="label" fullWidth sx={{ py: 2, borderStyle: 'dashed' }} disabled={importing}>
          {importFile ? `✅ ${importFile.name}` : '📁 Choose Excel File (.xlsx)'}
          <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={e => setImportFile(e.target.files[0])} />
        </Button>

        {importResult && (
          <Box sx={{ mt: 2 }}>
            {importResult.status === 'success' || importResult.success_count !== undefined ? (
              <Alert severity="success">
                <Typography variant="body2"><strong>Import Complete!</strong></Typography>
                <Typography variant="body2">✅ Success: {importResult.success_count || 0}</Typography>
                <Typography variant="body2">❌ Failed: {importResult.fail_count || 0}</Typography>
                {importResult.errors?.length > 0 && (
                  <Box sx={{ mt: 1, maxHeight: 150, overflow: 'auto' }}>
                    {importResult.errors.map((err, i) => (
                      <Typography key={i} variant="caption" color="error" display="block">{err}</Typography>
                    ))}
                  </Box>
                )}
              </Alert>
            ) : (
              <Alert severity="error">
                <Typography variant="body2">{importResult.message}</Typography>
                {importResult.errors?.map((err, i) => (
                  <Typography key={i} variant="caption" display="block">• {err}</Typography>
                ))}
              </Alert>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={importing}>Close</Button>
        <Button variant="contained" onClick={onImport} disabled={!importFile || importing}>
          {importing ? 'Importing...' : 'Import Now'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}