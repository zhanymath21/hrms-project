// src/components/employees/ExportDialog.jsx

import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Dialog, DialogTitle, DialogContent,
  DialogActions, Grid, TextField, FormControl, InputLabel, Select,
  MenuItem, Chip, IconButton, Stack, Alert, Divider, Paper,CircularProgress,
  LinearProgress
} from '@mui/material';
import {
  FileDownload as FileDownloadIcon,
  FilterList as FilterListIcon,
  DateRange as DateRangeIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { STATUS_OPTIONS, EMPLOYMENT_TYPE_OPTIONS } from '../../constants/employeeConstants';

const ExportDialog = ({ open, onClose, onExport, loading, filters = {}, setFilters }) => {
  const [localFilters, setLocalFilters] = useState({
    start_date: '',
    end_date: '',
    status: '',
    employment_type: '',
    department_id: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setLocalFilters({
        start_date: filters.start_date || '',
        end_date: filters.end_date || '',
        status: filters.status || '',
        employment_type: filters.employment_type || '',
        department_id: filters.department_id || '',
      });
      setError('');
    }
  }, [open, filters]);

  const handleExport = () => {
    if (localFilters.start_date && localFilters.end_date) {
      if (new Date(localFilters.start_date) > new Date(localFilters.end_date)) {
        setError('Start date must be before end date');
        return;
      }
    }
    setError('');
    onExport(localFilters);
  };

  const handleClearFilters = () => {
    const empty = {
      start_date: '',
      end_date: '',
      status: '',
      employment_type: '',
      department_id: '',
    };
    setLocalFilters(empty);
    setFilters(empty);
    setError('');
  };

  const activeFilterCount = Object.values(localFilters).filter(v => v !== '').length;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <FileDownloadIcon color="primary" />
            <Typography variant="h6">Export Employees</Typography>
            {activeFilterCount > 0 && (
              <Chip
                label={`${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''} active`}
                size="small"
                color="primary"
              />
            )}
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            Export employee data with filters. Leave fields empty to export all data.
          </Typography>
        </Alert>

        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DateRangeIcon fontSize="small" />
              Date Range (Optional)
            </Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Start Date"
              value={localFilters.start_date}
              onChange={e => setLocalFilters({ ...localFilters, start_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="End Date"
              value={localFilters.end_date}
              onChange={e => setLocalFilters({ ...localFilters, end_date: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>

          <Grid item xs={12}>
            <Divider sx={{ my: 1 }}>
              <Chip label="Additional Filters" size="small" icon={<FilterListIcon />} />
            </Divider>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={localFilters.status}
                onChange={e => setLocalFilters({ ...localFilters, status: e.target.value })}
              >
                <MenuItem value="">All Status</MenuItem>
                {STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Employment Type</InputLabel>
              <Select
                label="Employment Type"
                value={localFilters.employment_type}
                onChange={e => setLocalFilters({ ...localFilters, employment_type: e.target.value })}
              >
                <MenuItem value="">All Types</MenuItem>
                {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              size="small"
              label="Department"
              placeholder="Search department..."
              value={localFilters.department_id}
              onChange={e => setLocalFilters({ ...localFilters, department_id: e.target.value })}
            />
          </Grid>

          {activeFilterCount > 0 && (
            <Grid item xs={12}>
              <Paper variant="outlined" sx={{ p: 1.5, bgcolor: '#f5f5f5' }}>
                <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
                  <strong>Active Filters:</strong>
                </Typography>
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  {localFilters.start_date && (
                    <Chip
                      label={`From: ${new Date(localFilters.start_date).toLocaleDateString()}`}
                      size="small"
                      onDelete={() => setLocalFilters({ ...localFilters, start_date: '' })}
                    />
                  )}
                  {localFilters.end_date && (
                    <Chip
                      label={`To: ${new Date(localFilters.end_date).toLocaleDateString()}`}
                      size="small"
                      onDelete={() => setLocalFilters({ ...localFilters, end_date: '' })}
                    />
                  )}
                  {localFilters.status && (
                    <Chip
                      label={`Status: ${localFilters.status}`}
                      size="small"
                      onDelete={() => setLocalFilters({ ...localFilters, status: '' })}
                    />
                  )}
                  {localFilters.employment_type && (
                    <Chip
                      label={`Type: ${localFilters.employment_type.replace('_', ' ')}`}
                      size="small"
                      onDelete={() => setLocalFilters({ ...localFilters, employment_type: '' })}
                    />
                  )}
                  {localFilters.department_id && (
                    <Chip
                      label={`Department: ${localFilters.department_id}`}
                      size="small"
                      onDelete={() => setLocalFilters({ ...localFilters, department_id: '' })}
                    />
                  )}
                </Stack>
              </Paper>
            </Grid>
          )}

          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error}</Alert>
            </Grid>
          )}

          {loading && (
            <Grid item xs={12}>
              <LinearProgress />
              <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                Generating export file...
              </Typography>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
        <Button onClick={handleClearFilters} disabled={loading || activeFilterCount === 0}>
          Clear Filters
        </Button>
        <Box>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleExport}
            disabled={loading}
            startIcon={<FileDownloadIcon />}
            sx={{ ml: 1 }}
          >
            {loading ? 'Exporting...' : 'Export Now'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default ExportDialog; // <-- PASTIKAN INI