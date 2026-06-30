// src/components/PPE/FilterBar.jsx

import React, { useState } from 'react';
import {
  Paper, Grid, TextField, FormControl, InputLabel, Select, 
  MenuItem, IconButton, Button, InputAdornment, Box, Collapse, Chip, Typography,Stack
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import DateRangeIcon from '@mui/icons-material/DateRange';
import { STATUS_OPTIONS, CONDITION_OPTIONS, DATE_FILTER_OPTIONS } from '../../constants/ppeConstants';

export default function FilterBar({ filters, setFilters, categories, onClear }) {
  const [showDateFilter, setShowDateFilter] = useState(false);
  
  // Count active filters (excluding date filters)
  const count = Object.keys(filters).filter(key => {
    if (['start_date', 'end_date', 'date_preset'].includes(key)) return false;
    return filters[key] && filters[key] !== '';
  }).length;

  const hasDateFilter = filters.start_date || filters.end_date;

  const handleDatePreset = (value) => {
    if (value === 'custom') {
      setFilters({ ...filters, date_preset: value });
      return;
    }
    
    const now = new Date();
    let startDate = '';
    let endDate = '';
    
    switch(value) {
      case 'today':
        const today = new Date();
        startDate = today.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'yesterday':
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = yesterday.toISOString().split('T')[0];
        endDate = yesterday.toISOString().split('T')[0];
        break;
      case 'this_week':
        const startOfWeek = new Date(now);
        const day = now.getDay() || 7;
        startOfWeek.setDate(now.getDate() - day + 1);
        startDate = startOfWeek.toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
        break;
      case 'last_week':
        const startLastWeek = new Date(now);
        const dayLast = now.getDay() || 7;
        startLastWeek.setDate(now.getDate() - dayLast - 6);
        const endLastWeek = new Date(now);
        endLastWeek.setDate(now.getDate() - dayLast);
        startDate = startLastWeek.toISOString().split('T')[0];
        endDate = endLastWeek.toISOString().split('T')[0];
        break;
      case 'this_month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
        break;
      case 'last_month':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
        endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
        break;
      case 'this_year':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
        endDate = new Date().toISOString().split('T')[0];
        break;
      default:
        startDate = '';
        endDate = '';
    }
    
    setFilters({ 
      ...filters, 
      date_preset: value,
      start_date: startDate,
      end_date: endDate
    });
  };

  const handleClearDate = () => {
    setFilters({ 
      ...filters, 
      date_preset: '',
      start_date: '',
      end_date: ''
    });
  };

  return (
    <Paper sx={{ p: 2, mb: 2, borderRadius: 2 }}>
      <Grid container spacing={2} alignItems="center">
        {/* Search */}
        <Grid item xs={12} sm={6} md={2.5}>
          <TextField 
            fullWidth 
            size="small" 
            placeholder="Search name, code, holder..."
            value={filters.search || ''} 
            onChange={e => setFilters({ ...filters, search: e.target.value })}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
              endAdornment: filters.search && (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setFilters({ ...filters, search: '' })}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            }} 
          />
        </Grid>

        {/* Category */}
        <Grid item xs={6} sm={4} md={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Category</InputLabel>
            <Select 
              label="Category" 
              value={filters.category_id || ''} 
              onChange={e => setFilters({ ...filters, category_id: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              {(categories || []).map(c => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Status */}
        <Grid item xs={6} sm={4} md={1.5}>
          <FormControl fullWidth size="small">
            <InputLabel>Status</InputLabel>
            <Select 
              label="Status" 
              value={filters.status || ''} 
              onChange={e => setFilters({ ...filters, status: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              {STATUS_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Condition */}
        <Grid item xs={6} sm={4} md={1.5}>
          <FormControl fullWidth size="small">
            <InputLabel>Condition</InputLabel>
            <Select 
              label="Condition" 
              value={filters.condition || ''} 
              onChange={e => setFilters({ ...filters, condition: e.target.value })}
            >
              <MenuItem value="">All</MenuItem>
              {CONDITION_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        {/* Location */}
        <Grid item xs={6} sm={4} md={1.5}>
          <TextField 
            fullWidth 
            size="small" 
            label="Location" 
            value={filters.location || ''} 
            onChange={e => setFilters({ ...filters, location: e.target.value })} 
          />
        </Grid>

        {/* Actions */}
        <Grid item xs={6} sm={4} md={1}>
          <Stack direction="row" spacing={0.5}>
            <Button 
              variant={hasDateFilter ? "contained" : "outlined"}
              size="small" 
              onClick={() => setShowDateFilter(!showDateFilter)}
              color={hasDateFilter ? 'primary' : 'inherit'}
              startIcon={<DateRangeIcon />}
              sx={{ minWidth: 'auto', px: 1 }}
            >
              {hasDateFilter ? '📅' : '📅'}
            </Button>
            {(count > 0 || hasDateFilter) && (
              <Button 
                variant="outlined" 
                color="error" 
                size="small" 
                onClick={onClear} 
                startIcon={<ClearIcon />}
                sx={{ minWidth: 'auto', px: 1 }}
              >
                ✕
              </Button>
            )}
          </Stack>
        </Grid>
      </Grid>

      {/* Date Filter Section */}
      <Collapse in={showDateFilter}>
        <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DateRangeIcon fontSize="small" />
                Date Filter
                {hasDateFilter && (
                  <Chip 
                    label={`${filters.start_date || '...'} → ${filters.end_date || '...'}`} 
                    size="small" 
                    color="primary" 
                    onDelete={handleClearDate}
                  />
                )}
              </Typography>
            </Grid>

            {/* Date Preset */}
            <Grid item xs={12} sm={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Quick Select</InputLabel>
                <Select 
                  label="Quick Select" 
                  value={filters.date_preset || ''} 
                  onChange={e => handleDatePreset(e.target.value)}
                >
                  <MenuItem value="">Custom Range</MenuItem>
                  {DATE_FILTER_OPTIONS.map(o => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Start Date */}
            <Grid item xs={12} sm={3}>
              <TextField 
                fullWidth 
                type="date" 
                label="Start Date" 
                size="small"
                value={filters.start_date || ''} 
                onChange={e => setFilters({ 
                  ...filters, 
                  start_date: e.target.value,
                  date_preset: '' 
                })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* End Date */}
            <Grid item xs={12} sm={3}>
              <TextField 
                fullWidth 
                type="date" 
                label="End Date" 
                size="small"
                value={filters.end_date || ''} 
                onChange={e => setFilters({ 
                  ...filters, 
                  end_date: e.target.value,
                  date_preset: '' 
                })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Date Actions */}
            <Grid item xs={12} sm={3}>
              <Stack direction="row" spacing={1}>
                <Button 
                  variant="contained" 
                  size="small" 
                  onClick={() => setShowDateFilter(false)}
                >
                  Apply
                </Button>
                <Button 
                  variant="outlined" 
                  size="small" 
                  color="error"
                  onClick={handleClearDate}
                  disabled={!hasDateFilter}
                >
                  Clear
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Collapse>

      {/* Active Filters Summary */}
      {(count > 0 || hasDateFilter) && (
        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #f0f0f0' }}>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {filters.search && <Chip label={`Search: ${filters.search}`} size="small" onDelete={() => setFilters({ ...filters, search: '' })} />}
            {filters.category_id && <Chip label={`Category: ${categories.find(c => c.id === filters.category_id)?.name}`} size="small" onDelete={() => setFilters({ ...filters, category_id: '' })} />}
            {filters.status && <Chip label={`Status: ${STATUS_OPTIONS.find(o => o.value === filters.status)?.label}`} size="small" onDelete={() => setFilters({ ...filters, status: '' })} />}
            {filters.condition && <Chip label={`Condition: ${CONDITION_OPTIONS.find(o => o.value === filters.condition)?.label}`} size="small" onDelete={() => setFilters({ ...filters, condition: '' })} />}
            {filters.location && <Chip label={`Location: ${filters.location}`} size="small" onDelete={() => setFilters({ ...filters, location: '' })} />}
            {filters.start_date && <Chip label={`From: ${new Date(filters.start_date).toLocaleDateString()}`} size="small" onDelete={handleClearDate} />}
            {filters.end_date && <Chip label={`To: ${new Date(filters.end_date).toLocaleDateString()}`} size="small" onDelete={handleClearDate} />}
          </Stack>
        </Box>
      )}
    </Paper>
  );
}