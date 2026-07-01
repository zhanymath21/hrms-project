// src/components/leaves/LeaveStatusBadge.jsx

import React from 'react';
import { Chip } from '@mui/material';
import { LEAVE_STATUS_LABELS, LEAVE_STATUS_COLORS } from '../../constants/leaveConstants';

const LeaveStatusBadge = ({ status, size = 'small' }) => {
    const label = LEAVE_STATUS_LABELS[status] || status;
    const color = LEAVE_STATUS_COLORS[status] || 'default';

    return <Chip label={label} color={color} size={size} />;
};

export default LeaveStatusBadge;