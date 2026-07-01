// src/components/leaves/LeaveBalanceCard.jsx

import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, Grid } from '@mui/material';

const LeaveBalanceCard = ({ balance, loading }) => {
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

    return (
        <Card>
            <CardContent>
                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                    {balance.leave_type}
                    <span style={{ marginLeft: 8, fontSize: '0.75rem' }}>
                        ({balance.leave_code})
                    </span>
                </Typography>

                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="h5" fontWeight="bold">
                        {balance.remaining_days || 0}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        / {balance.total_entitlement || 0} days
                    </Typography>
                </Box>

                <LinearProgress
                    variant="determinate"
                    value={Math.min(percentage, 100)}
                    color={percentage > 80 ? 'error' : percentage > 60 ? 'warning' : 'success'}
                    sx={{ mt: 1, height: 6, borderRadius: 3 }}
                />

                <Box display="flex" justifyContent="space-between" mt={1}>
                    <Typography variant="caption" color="textSecondary">
                        Used: {balance.used_days || 0}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                        Pending: {balance.pending_days || 0}
                    </Typography>
                </Box>
            </CardContent>
        </Card>
    );
};

export default LeaveBalanceCard;