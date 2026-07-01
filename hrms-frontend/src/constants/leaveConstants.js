// src/constants/leaveConstants.js

export const LEAVE_STATUS = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    CANCELLED: 'cancelled',
};

export const LEAVE_STATUS_LABELS = {
    [LEAVE_STATUS.PENDING]: 'Pending',
    [LEAVE_STATUS.APPROVED]: 'Approved',
    [LEAVE_STATUS.REJECTED]: 'Rejected',
    [LEAVE_STATUS.CANCELLED]: 'Cancelled',
};

export const LEAVE_STATUS_COLORS = {
    [LEAVE_STATUS.PENDING]: 'warning',
    [LEAVE_STATUS.APPROVED]: 'success',
    [LEAVE_STATUS.REJECTED]: 'error',
    [LEAVE_STATUS.CANCELLED]: 'default',
};

export const LEAVE_STATUS_ICONS = {
    [LEAVE_STATUS.PENDING]: '⏳',
    [LEAVE_STATUS.APPROVED]: '✅',
    [LEAVE_STATUS.REJECTED]: '❌',
    [LEAVE_STATUS.CANCELLED]: '🚫',
};

export const WORK_DAY_TYPES = [
    { value: 'weekend', label: 'Weekend' },
    { value: 'public_holiday', label: 'Public Holiday' },
];

export const EMPLOYMENT_TYPES = [
    { value: 'full_time', label: 'Full Time' },
    { value: 'part_time', label: 'Part Time' },
    { value: 'contract', label: 'Contract' },
    { value: 'intern', label: 'Intern' },
];