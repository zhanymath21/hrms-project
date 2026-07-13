// src/components/leaves/LeaveBalanceCard.jsx

import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, Grid, Chip, Tooltip } from '@mui/material';
import { CheckCircle, Warning, Error, Info } from '@mui/icons-material';

const LeaveBalanceCard = ({ balance, loading = false }) => {
    if (loading) {
        return (
            <Card sx={{ height: '100%' }}>
                <CardContent>
                    <Typography variant="body2" color="textSecondary">Loading...</Typography>
                </CardContent>
            </Card>
        );
    }

    const percentage = balance.total_entitlement > 0
        ? (balance.used_days / balance.total_entitlement) * 100
        : 0;

    const getStatus = () => {
        if (percentage >= 90) {
            return { 
                color: 'error', 
                icon: <Error fontSize="small" />, 
                label: 'Critical',
                description: 'Balance is critically low'
            };
        }
        if (percentage >= 70) {
            return { 
                color: 'warning', 
                icon: <Warning fontSize="small" />, 
                label: 'Low',
                description: 'Balance is running low'
            };
        }
        return { 
            color: 'success', 
            icon: <CheckCircle fontSize="small" />, 
            label: 'Good',
            description: 'Balance is healthy'
        };
    };

    const status = getStatus();

    return (
        <Card sx={{ height: '100%', position: 'relative', '&:hover': { boxShadow: 6 } }}>
            <CardContent>
                {/* Header */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight="bold" color="textPrimary">
                        {balance.leave_type || 'Leave Type'}
                    </Typography>
                    <Tooltip title={`${balance.leave_code} - ${balance.leave_type}`}>
                        <Chip 
                            label={balance.leave_code || 'N/A'} 
                            size="small" 
                            variant="outlined" 
                            sx={{ fontSize: '0.65rem' }}
                        />
                    </Tooltip>
                </Box>

                {/* Remaining Days */}
                <Box display="flex" alignItems="baseline" gap={1} mb={0.5}>
                    <Typography variant="h4" fontWeight="bold" color="primary.main">
                        {balance.remaining_days || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        / {balance.total_entitlement || 0} days
                    </Typography>
                </Box>

                {/* Progress Bar */}
                <Box sx={{ position: 'relative', mb: 1 }}>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(percentage, 100)}
                        color={status.color}
                        sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                        {status.icon}
                        <Typography variant="caption" color={`${status.color}.main`}>
                            {status.label}
                        </Typography>
                        <Typography variant="caption" color="textSecondary" sx={{ ml: 'auto' }}>
                            {percentage.toFixed(0)}% used
                        </Typography>
                    </Box>
                </Box>

                {/* Details */}
                <Grid container spacing={1} sx={{ mt: 1 }}>
                    <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">Used</Typography>
                        <Typography variant="body2" fontWeight="medium" color="error.main">
                            {balance.used_days || 0}
                        </Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">Pending</Typography>
                        <Typography variant="body2" fontWeight="medium" color="warning.main">
                            {balance.pending_days || 0}
                        </Typography>
                    </Grid>
                    <Grid item xs={4}>
                        <Typography variant="caption" color="textSecondary">Remaining</Typography>
                        <Typography variant="body2" fontWeight="bold" color="success.main">
                            {balance.remaining_days || 0}
                        </Typography>
                    </Grid>
                </Grid>

                {/* Extra Info */}
                {(balance.carry_forward > 0 || balance.seniority_bonus > 0 || balance.replacement_days > 0) && (
                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #e0e0e0' }}>
                        <Grid container spacing={1}>
                            {balance.carry_forward > 0 && (
                                <Grid item xs={4}>
                                    <Typography variant="caption" color="textSecondary">
                                        Carry Forward
                                    </Typography>
                                    <Typography variant="caption" fontWeight="bold" color="info.main">
                                        +{balance.carry_forward}
                                    </Typography>
                                </Grid>
                            )}
                            {balance.seniority_bonus > 0 && (
                                <Grid item xs={4}>
                                    <Typography variant="caption" color="textSecondary">
                                        Seniority
                                    </Typography>
                                    <Typography variant="caption" fontWeight="bold" color="success.main">
                                        +{balance.seniority_bonus}
                                    </Typography>
                                </Grid>
                            )}
                            {balance.replacement_days > 0 && (
                                <Grid item xs={4}>
                                    <Typography variant="caption" color="textSecondary">
                                        Replacement
                                    </Typography>
                                    <Typography variant="caption" fontWeight="bold" color="warning.main">
                                        +{balance.replacement_days}
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default LeaveBalanceCard;