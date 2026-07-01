// src/components/leaves/LeaveBalanceCard.jsx

import React from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    LinearProgress,
    Grid,
    Chip,
    Tooltip,
} from '@mui/material';
import {
    CheckCircle as CheckCircleIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
} from '@mui/icons-material';

const LeaveBalanceCard = ({ balance, loading = false }) => {
    if (loading) {
        return (
            <Card>
                <CardContent>
                    <Typography variant="body2" color="textSecondary">Loading...</Typography>
                </CardContent>
            </Card>
        );
    }

    const percentage = balance.total_entitlement > 0
        ? (balance.used_days / balance.total_entitlement) * 100
        : 0;

    const getStatusColor = () => {
        if (percentage >= 90) return 'error';
        if (percentage >= 70) return 'warning';
        return 'success';
    };

    const getStatusIcon = () => {
        if (percentage >= 90) return <ErrorIcon fontSize="small" />;
        if (percentage >= 70) return <WarningIcon fontSize="small" />;
        return <CheckCircleIcon fontSize="small" />;
    };

    const getStatusText = () => {
        if (percentage >= 90) return 'Critical';
        if (percentage >= 70) return 'Low';
        return 'Good';
    };

    return (
        <Card sx={{ height: '100%', position: 'relative' }}>
            <CardContent>
                {/* Header */}
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight="bold">
                        {balance.leave_type}
                    </Typography>
                    <Chip
                        label={balance.leave_code}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.65rem' }}
                    />
                </Box>

                {/* Remaining Days */}
                <Box display="flex" alignItems="baseline" gap={1} mb={0.5}>
                    <Typography variant="h4" fontWeight="bold">
                        {balance.remaining_days || 0}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        / {balance.total_entitlement || 0} days
                    </Typography>
                </Box>

                {/* Progress Bar */}
                <Box sx={{ position: 'relative' }}>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(percentage, 100)}
                        color={getStatusColor()}
                        sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Box
                        sx={{
                            position: 'absolute',
                            top: -4,
                            right: 0,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                        }}
                    >
                        {getStatusIcon()}
                        <Typography variant="caption" color={getStatusColor()}>
                            {getStatusText()}
                        </Typography>
                    </Box>
                </Box>

                {/* Details */}
                <Grid container spacing={1} sx={{ mt: 2 }}>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">
                            Used
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                            {balance.used_days || 0}
                        </Typography>
                    </Grid>
                    <Grid item xs={6}>
                        <Typography variant="caption" color="textSecondary">
                            Pending
                        </Typography>
                        <Typography variant="body2" fontWeight="medium">
                            {balance.pending_days || 0}
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
                                    <Typography variant="caption" fontWeight="bold">
                                        +{balance.carry_forward}
                                    </Typography>
                                </Grid>
                            )}
                            {balance.seniority_bonus > 0 && (
                                <Grid item xs={4}>
                                    <Typography variant="caption" color="textSecondary">
                                        Seniority
                                    </Typography>
                                    <Typography variant="caption" fontWeight="bold">
                                        +{balance.seniority_bonus}
                                    </Typography>
                                </Grid>
                            )}
                            {balance.replacement_days > 0 && (
                                <Grid item xs={4}>
                                    <Typography variant="caption" color="textSecondary">
                                        Replacement
                                    </Typography>
                                    <Typography variant="caption" fontWeight="bold">
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