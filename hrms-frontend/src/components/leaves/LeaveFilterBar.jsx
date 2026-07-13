// src/components/leaves/LeaveFilterBar.jsx

import React, { useState } from 'react';
import {
    Paper,
    Grid,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    IconButton,
    InputAdornment,
    Chip,
    Box,
    Stack,
    Collapse,
    Typography,
    Divider,
} from '@mui/material';
import {
    Search as SearchIcon,
    Clear as ClearIcon,
    FilterList as FilterListIcon,
    DateRange as DateRangeIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { LEAVE_STATUS_LABELS } from '../../constants/leaveConstants';

const LeaveFilterBar = ({ 
    filters, 
    setFilters, 
    leaveTypes = [],
    onClear,
    loading = false,
    showDateFilter = true,
    showLeaveTypeFilter = true,
    showStatusFilter = true,
}) => {
    const [showAdvanced, setShowAdvanced] = useState(false);

    const handleChange = (field, value) => {
        setFilters((prev) => ({ ...prev, [field]: value }));
    };

    const handleClear = () => {
        if (onClear) {
            onClear();
        } else {
            setFilters({
                search: '',
                status: '',
                leave_type_id: '',
                start_date: '',
                end_date: '',
            });
        }
    };

    const hasActiveFilters = () => {
        return Object.values(filters).some((v) => v && v !== '');
    };

    const activeFilterCount = () => {
        return Object.values(filters).filter((v) => v && v !== '').length;
    };

    return (
        <Paper sx={{ p: 2, mb: 2 }}>
            <Grid container spacing={2} alignItems="center">
                {/* Search */}
                <Grid item xs={12} md={showStatusFilter && showLeaveTypeFilter ? 4 : 6}>
                    <TextField
                        fullWidth
                        size="small"
                        placeholder="Search by employee name, ID, or reason..."
                        value={filters.search || ''}
                        onChange={(e) => handleChange('search', e.target.value)}
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <SearchIcon fontSize="small" />
                                </InputAdornment>
                            ),
                            endAdornment: filters.search && (
                                <InputAdornment position="end">
                                    <IconButton 
                                        size="small" 
                                        onClick={() => handleChange('search', '')}
                                    >
                                        <ClearIcon fontSize="small" />
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                </Grid>

                {/* Status Filter */}
                {showStatusFilter && (
                    <Grid item xs={12} sm={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={filters.status || ''}
                                label="Status"
                                onChange={(e) => handleChange('status', e.target.value)}
                            >
                                <MenuItem value="">All Status</MenuItem>
                                {Object.entries(LEAVE_STATUS_LABELS).map(([key, label]) => (
                                    <MenuItem key={key} value={key}>{label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                )}

                {/* Leave Type Filter */}
                {showLeaveTypeFilter && (
                    <Grid item xs={12} sm={6} md={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Leave Type</InputLabel>
                            <Select
                                value={filters.leave_type_id || ''}
                                label="Leave Type"
                                onChange={(e) => handleChange('leave_type_id', e.target.value)}
                            >
                                <MenuItem value="">All Types</MenuItem>
                                {leaveTypes.map((type) => (
                                    <MenuItem key={type.id} value={type.id}>
                                        {type.name} ({type.code})
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                )}

                {/* Actions */}
                <Grid item xs={12} sm={6} md={2}>
                    <Stack direction="row" spacing={1}>
                        {showDateFilter && (
                            <Button
                                variant="outlined"
                                size="small"
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                startIcon={<FilterListIcon />}
                                color={showAdvanced ? 'primary' : 'inherit'}
                                fullWidth
                            >
                                {showAdvanced ? 'Hide' : 'Advanced'}
                                {activeFilterCount() > 0 && (
                                    <Chip 
                                        label={activeFilterCount()} 
                                        size="small" 
                                        color="primary"
                                        sx={{ ml: 0.5 }}
                                    />
                                )}
                            </Button>
                        )}
                        {hasActiveFilters() && (
                            <Button
                                variant="outlined"
                                size="small"
                                color="error"
                                onClick={handleClear}
                                startIcon={<ClearIcon />}
                            >
                                Clear
                            </Button>
                        )}
                    </Stack>
                </Grid>
            </Grid>

            {/* Advanced Filters - Date Range */}
            {showDateFilter && (
                <Collapse in={showAdvanced}>
                    <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
                        <Grid container spacing={2} alignItems="center">
                            <Grid item xs={12}>
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                    <DateRangeIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                                    Date Range
                                </Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="Start Date"
                                    size="small"
                                    value={filters.start_date || ''}
                                    onChange={(e) => handleChange('start_date', e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    type="date"
                                    label="End Date"
                                    size="small"
                                    value={filters.end_date || ''}
                                    onChange={(e) => handleChange('end_date', e.target.value)}
                                    InputLabelProps={{ shrink: true }}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </Collapse>
            )}

            {/* Active Filters Chips */}
            {hasActiveFilters() && (
                <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #f0f0f0' }}>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                        {filters.search && (
                            <Chip
                                label={`Search: ${filters.search}`}
                                size="small"
                                onDelete={() => handleChange('search', '')}
                            />
                        )}
                        {filters.status && (
                            <Chip
                                label={`Status: ${LEAVE_STATUS_LABELS[filters.status]}`}
                                size="small"
                                onDelete={() => handleChange('status', '')}
                            />
                        )}
                        {filters.leave_type_id && (
                            <Chip
                                label={`Type: ${leaveTypes.find(t => t.id === Number(filters.leave_type_id))?.name}`}
                                size="small"
                                onDelete={() => handleChange('leave_type_id', '')}
                            />
                        )}
                        {filters.start_date && (
                            <Chip
                                label={`From: ${new Date(filters.start_date).toLocaleDateString()}`}
                                size="small"
                                onDelete={() => handleChange('start_date', '')}
                            />
                        )}
                        {filters.end_date && (
                            <Chip
                                label={`To: ${new Date(filters.end_date).toLocaleDateString()}`}
                                size="small"
                                onDelete={() => handleChange('end_date', '')}
                            />
                        )}
                    </Stack>
                </Box>
            )}
        </Paper>
    );
};

export default LeaveFilterBar;