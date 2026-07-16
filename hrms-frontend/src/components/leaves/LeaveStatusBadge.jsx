// src/components/leave/LeaveStatusBadge.jsx

import React from 'react';
import { Chip } from '@mui/material';
import {
    Pending as PendingIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    HourglassEmpty as HourglassEmptyIcon,
} from '@mui/icons-material';

const STATUS_CONFIG = {
    pending: {
        label: 'Pending',
        color: '#f59e0b',
        bgColor: '#fef3c7',
        icon: <PendingIcon />,
    },
    approved: {
        label: 'Approved',
        color: '#10b981',
        bgColor: '#d1fae5',
        icon: <CheckCircleIcon />,
    },
    rejected: {
        label: 'Rejected',
        color: '#ef4444',
        bgColor: '#fee2e2',
        icon: <CancelIcon />,
    },
    cancelled: {
        label: 'Cancelled',
        color: '#6b7280',
        bgColor: '#f3f4f6',
        icon: <CancelIcon />,
    },
    in_progress: {
        label: 'In Progress',
        color: '#3b82f6',
        bgColor: '#dbeafe',
        icon: <HourglassEmptyIcon />,
    },
};

const LeaveStatusBadge = ({ status, showIcon = true, size = 'medium', variant = 'default' }) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

    if (variant === 'dot') {
        return (
            <Box display="flex" alignItems="center" gap={1}>
                <Box
                    sx={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        bgcolor: config.color,
                        display: 'inline-block',
                    }}
                />
                <Typography variant="caption" sx={{ color: config.color, fontWeight: 500 }}>
                    {config.label}
                </Typography>
            </Box>
        );
    }

    return (
        <Chip
            label={config.label}
            size={size}
            sx={{
                bgcolor: config.bgColor,
                color: config.color,
                fontWeight: 600,
                '& .MuiChip-icon': { color: config.color },
            }}
            icon={showIcon ? config.icon : undefined}
        />
    );
};

export default LeaveStatusBadge;