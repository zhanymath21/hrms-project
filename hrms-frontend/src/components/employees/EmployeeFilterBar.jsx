// src/components/employees/EmployeeFilterBar.jsx

import React, { useState } from 'react';
import {
  Box, Paper, Grid, TextField, FormControl, InputLabel, Select,
  MenuItem, Chip, IconButton, Button, InputAdornment, Collapse, Stack,
  Typography
} from '@mui/material';
import {
  Search as SearchIcon,
  Clear as ClearIcon,
  DateRange as DateRangeIcon,
} from '@mui/icons-material';
import { DATE_FILTER_OPTIONS, STATUS_OPTIONS, EMPLOYMENT_TYPE_OPTIONS } from '../../constants/employeeConstants';
import { calculateDateRange } from '../../utils/employeeUtils';

export const EmployeeFilterBar = ({
  filters,
  onFilterChange,
  onClearFilters,
  loading,
}) => {
  const [showDateFilter, setShowDateFilter] = useState(false);

  const {
    searchTerm,
    filterStatus,
    filterEmploymentType,
    filterDepartment,
    startDate,
    endDate,
    datePreset,
  } = filters;

  const hasActiveFilters = searchTerm || filterStatus || filterEmploymentType || 
                          filterDepartment || startDate || endDate;

  const handleDatePreset = (value) => {
    if (value === 'custom') {
      onFilterChange({ ...filters, datePreset: value });
      return;
    }
    const { startDate: start, endDate: end } = calculateDateRange(value);
    onFilterChange({
      ...filters,
      startDate: start,
      endDate: end,
      datePreset: value,
    });
  };

  const handleClearDateFilter = () => {
    onFilterChange({
      ...filters,
      startDate: '',
      endDate: '',
      datePreset: '',
    });
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Grid container spacing={2}>
        {/* Search */}
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by name, email, ID..."
            value={searchTerm}
            onChange={(e) => onFilterChange({ ...filters, searchTerm: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: searchTerm && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => onFilterChange({ ...filters, searchTerm: '' })}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }}
          />
        </Grid>

        {/* Status */}
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select
              value={filterStatus}
              label="Status"
              onChange={(e) => onFilterChange({ ...filters, filterStatus: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              {STATUS_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Employment Type */}
        <Grid item xs={12} sm={6} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Employment Type</InputLabel>
            <Select
              value={filterEmploymentType}
              label="Employment Type"
              onChange={(e) => onFilterChange({ ...filters, filterEmploymentType: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Department */}
        <Grid item xs={12} sm={6} md={2}>
          <TextField
            fullWidth
            size="small"
            label="Department"
            value={filterDepartment}
            onChange={(e) => onFilterChange({ ...filters, filterDepartment: e.target.value })}
            placeholder="Filter by department..."
          />
        </Grid>

        {/* Date Filter Button */}
        <Grid item xs={12} sm={6} md={1}>
          <Button
            fullWidth
            variant="outlined"
            color={startDate || endDate ? 'primary' : 'inherit'}
            size="large"
            onClick={() => setShowDateFilter(!showDateFilter)}
            startIcon={<DateRangeIcon />}
          >
            📅
          </Button>
        </Grid>

        {/* Clear Button */}
        <Grid item xs={12} sm={6} md={1}>
          <Button
            fullWidth
            variant="outlined"
            size="large"
            onClick={onClearFilters}
            disabled={!hasActiveFilters || loading}
            color={hasActiveFilters ? 'error' : 'inherit'}
          >
            Clear
          </Button>
        </Grid>
      </Grid>

      {/* Date Filter Section */}
      <Collapse in={showDateFilter}>
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DateRangeIcon fontSize="small" />
                Date Filter (Hire Date)
                {(startDate || endDate) && (
                  <Chip
                    label={`${startDate || '...'} → ${endDate || '...'}`}
                    size="small"
                    color="primary"
                    onDelete={handleClearDateFilter}
                  />
                )}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Quick Select</InputLabel>
                <Select
                  label="Quick Select"
                  value={datePreset}
                  onChange={(e) => handleDatePreset(e.target.value)}
                >
                  <MenuItem value="">Custom Range</MenuItem>
                  {DATE_FILTER_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                size="small"
                value={startDate}
                onChange={(e) => onFilterChange({
                  ...filters,
                  startDate: e.target.value,
                  datePreset: '',
                })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                size="small"
                value={endDate}
                onChange={(e) => onFilterChange({
                  ...filters,
                  endDate: e.target.value,
                  datePreset: '',
                })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} sm={3}>
              <Stack direction="row" spacing={1}>
                <Button variant="contained" size="small" onClick={() => setShowDateFilter(false)}>
                  Apply
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  onClick={handleClearDateFilter}
                  disabled={!startDate && !endDate}
                >
                  Clear
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Collapse>

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #f0f0f0' }}>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {searchTerm && (
              <Chip
                label={`Search: ${searchTerm}`}
                size="small"
                onDelete={() => onFilterChange({ ...filters, searchTerm: '' })}
              />
            )}
            {filterStatus && (
              <Chip
                label={`Status: ${filterStatus}`}
                size="small"
                onDelete={() => onFilterChange({ ...filters, filterStatus: '' })}
              />
            )}
            {filterEmploymentType && (
              <Chip
                label={`Type: ${filterEmploymentType.replace('_', ' ')}`}
                size="small"
                onDelete={() => onFilterChange({ ...filters, filterEmploymentType: '' })}
              />
            )}
            {filterDepartment && (
              <Chip
                label={`Department: ${filterDepartment}`}
                size="small"
                onDelete={() => onFilterChange({ ...filters, filterDepartment: '' })}
              />
            )}
            {startDate && (
              <Chip
                label={`From: ${new Date(startDate).toLocaleDateString()}`}
                size="small"
                onDelete={handleClearDateFilter}
              />
            )}
            {endDate && (
              <Chip
                label={`To: ${new Date(endDate).toLocaleDateString()}`}
                size="small"
                onDelete={handleClearDateFilter}
              />
            )}
          </Stack>
        </Box>
      )}
    </Paper>
  );
};