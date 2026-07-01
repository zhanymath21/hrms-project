// src/components/leaves/LeaveStatusBadge.jsx

import React from 'react';
import { Chip, Box, Typography } from '@mui/material';
import {
    Pending as PendingIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Block as BlockIcon,
} from '@mui/icons-material';
import { LEAVE_STATUS_LABELS, LEAVE_STATUS_COLORS } from '../../constants/leaveConstants';

const LeaveStatusBadge = ({ status, size = 'small', showIcon = true, variant = 'filled' }) => {
    const label = LEAVE_STATUS_LABELS[status] || status;
    const color = LEAVE_STATUS_COLORS[status] || 'default';

    const getIcon = () => {
        switch (status) {
            case 'pending':
                return <PendingIcon fontSize={size === 'small' ? 'small' : 'medium'} />;
            case 'approved':
                return <CheckCircleIcon fontSize={size === 'small' ? 'small' : 'medium'} />;
            case 'rejected':
                return <CancelIcon fontSize={size === 'small' ? 'small' : 'medium'} />;
            case 'cancelled':
                return <BlockIcon fontSize={size === 'small' ? 'small' : 'medium'} />;
            default:
                return null;
        }
    };

    return (
        <Chip
            label={label}
            color={color}
            size={size}
            variant={variant}
            icon={showIcon ? getIcon() : undefined}
            sx={{
                fontWeight: 'medium',
                '& .MuiChip-icon': {
                    fontSize: size === 'small' ? '0.875rem' : '1.25rem',
                },
            }}
        />
    );
};

export default LeaveStatusBadge;