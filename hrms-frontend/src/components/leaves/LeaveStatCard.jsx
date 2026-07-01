// src/components/leaves/LeaveStatCard.jsx

import React from 'react';
import { Card, CardContent, Typography, Box, CircularProgress } from '@mui/material';

const LeaveStatCard = ({ 
    title, 
    value, 
    color = 'primary', 
    icon = null, 
    loading = false,
    subtitle = null,
}) => {
    return (
        <Card sx={{ height: '100%', position: 'relative', overflow: 'visible' }}>
            <CardContent>
                {loading ? (
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight={60}>
                        <CircularProgress size={24} />
                    </Box>
                ) : (
                    <>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                {title}
                            </Typography>
                            {icon && (
                                <Box color={`${color}.main`}>
                                    {icon}
                                </Box>
                            )}
                        </Box>
                        <Typography 
                            variant="h4" 
                            component="div" 
                            color={`${color}.main`}
                            fontWeight="bold"
                        >
                            {value || 0}
                        </Typography>
                        {subtitle && (
                            <Typography variant="caption" color="textSecondary">
                                {subtitle}
                            </Typography>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default LeaveStatCard;