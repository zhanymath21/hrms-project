// src/components/leaves/LeaveStatusBadge.jsx

import React from 'react';
import { Chip, Box, Typography } from '@mui/material';
import { 
    Pending as PendingIcon, 
    CheckCircle as CheckCircleIcon, 
    Cancel as CancelIcon, 
    Block as BlockIcon,
    HourglassEmpty as HourglassIcon,
} from '@mui/icons-material';

const STATUS_CONFIG = {
    pending: { 
        label: 'Pending', 
        color: 'warning', 
        icon: <PendingIcon fontSize="small" />,
        description: 'Waiting for approval'
    },
    approved: { 
        label: 'Approved', 
        color: 'success', 
        icon: <CheckCircleIcon fontSize="small" />,
        description: 'Approved'
    },
    rejected: { 
        label: 'Rejected', 
        color: 'error', 
        icon: <CancelIcon fontSize="small" />,
        description: 'Rejected'
    },
    cancelled: { 
        label: 'Cancelled', 
        color: 'default', 
        icon: <BlockIcon fontSize="small" />,
        description: 'Cancelled'
    },
    'in-progress': {
        label: 'In Progress',
        color: 'info',
        icon: <HourglassIcon fontSize="small" />,
        description: 'In progress'
    }
};

const LeaveStatusBadge = ({ 
    status, 
    size = 'small', 
    showIcon = true, 
    showTooltip = false,
    variant = 'filled',
    sx = {},
}) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

    const chip = (
        <Chip
            label={config.label}
            color={config.color}
            size={size}
            icon={showIcon ? config.icon : undefined}
            variant={variant}
            sx={{
                fontWeight: 'medium',
                '& .MuiChip-icon': {
                    fontSize: size === 'small' ? '0.875rem' : '1.25rem',
                },
                ...sx,
            }}
        />
    );

    if (showTooltip) {
        return (
            <Tooltip title={config.description}>
                {chip}
            </Tooltip>
        );
    }

    return chip;
};

export default LeaveStatusBadge;