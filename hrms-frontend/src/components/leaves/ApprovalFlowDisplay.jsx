// src/components/leave/ApprovalFlowDisplay.jsx

import React from 'react';
import {
    Box,
    Stepper,
    Step,
    StepLabel,
    Typography,
    Chip,
    Avatar,
    Paper,
    StepConnector,
    stepConnectorClasses,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import {
    CheckCircle as CheckCircleIcon,
    Pending as PendingIcon,
    Cancel as CancelIcon,
    Person as PersonIcon,
} from '@mui/icons-material';

const StyledConnector = styled(StepConnector)(({ theme }) => ({
    [`&.${stepConnectorClasses.alternativeLabel}`]: {
        top: 10,
        left: 'calc(-50% + 16px)',
        right: 'calc(50% + 16px)',
    },
    [`& .${stepConnectorClasses.line}`]: {
        borderColor: '#e5e7eb',
        borderWidth: 2,
    },
}));

const ApprovalFlowDisplay = ({ flow, currentLevel, title = 'Approval Flow' }) => {
    if (!flow || flow.length === 0) {
        return (
            <Paper sx={{ p: 2, bgcolor: '#fef3c7', border: '1px solid #f59e0b' }}>
                <Typography variant="body2" color="warning.main">
                    ⚠️ No approval flow configured. Request will be sent to HR Manager directly.
                </Typography>
            </Paper>
        );
    }

    return (
        <Box>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
                📋 {title}
            </Typography>
            <Stepper 
                orientation="vertical" 
                activeStep={currentLevel || 0}
                connector={<StyledConnector />}
            >
                {flow.map((stage, index) => {
                    const isActive = index === currentLevel;
                    const isCompleted = index < currentLevel;
                    const isPending = index > currentLevel;
                    const isRejected = stage.status === 'rejected';

                    return (
                        <Step key={index} active={isActive || isCompleted}>
                            <StepLabel
                                StepIconComponent={() => (
                                    <StepIcon 
                                        status={isRejected ? 'rejected' : isCompleted ? 'completed' : isActive ? 'active' : 'pending'}
                                    />
                                )}
                            >
                                <Box>
                                    <Typography variant="body2" fontWeight={isActive ? 'bold' : 'normal'}>
                                        {stage.stage_name || stage.name || `Level ${index + 1}`}
                                        {isRejected && ' ❌'}
                                    </Typography>
                                    <Box display="flex" alignItems="center" gap={1} sx={{ mt: 0.5, flexWrap: 'wrap' }}>
                                        <Avatar sx={{ width: 20, height: 20, bgcolor: '#6366f1', fontSize: 10 }}>
                                            <PersonIcon sx={{ fontSize: 12 }} />
                                        </Avatar>
                                        <Typography variant="caption" color="textSecondary">
                                            {stage.approver_name || stage.approver?.name || 'Not Assigned'}
                                        </Typography>
                                        {stage.approver_position && (
                                            <Chip 
                                                label={stage.approver_position}
                                                size="small"
                                                sx={{ height: 18, fontSize: '0.6rem' }}
                                            />
                                        )}
                                        {isActive && !isRejected && (
                                            <Chip 
                                                label="Waiting" 
                                                size="small" 
                                                color="warning"
                                                sx={{ height: 18, fontSize: '0.6rem' }}
                                            />
                                        )}
                                        {isCompleted && !isRejected && (
                                            <Chip 
                                                label="✓ Approved" 
                                                size="small" 
                                                color="success"
                                                sx={{ height: 18, fontSize: '0.6rem' }}
                                            />
                                        )}
                                        {isRejected && (
                                            <Chip 
                                                label="✗ Rejected" 
                                                size="small" 
                                                color="error"
                                                sx={{ height: 18, fontSize: '0.6rem' }}
                                            />
                                        )}
                                    </Box>
                                    {stage.comment && (
                                        <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                                            💬 {stage.comment}
                                        </Typography>
                                    )}
                                </Box>
                            </StepLabel>
                        </Step>
                    );
                })}
            </Stepper>
            {flow.length === 1 && (
                <Paper sx={{ p: 1.5, mt: 2, bgcolor: '#f0fdf4', border: '1px solid #86efac' }}>
                    <Typography variant="caption" color="success.main">
                        ✅ This request will be approved by a single manager
                    </Typography>
                </Paper>
            )}
        </Box>
    );
};

const StepIcon = ({ status }) => {
    if (status === 'completed') {
        return <CheckCircleIcon sx={{ color: '#10b981', fontSize: 24 }} />;
    }
    if (status === 'rejected') {
        return <CancelIcon sx={{ color: '#ef4444', fontSize: 24 }} />;
    }
    if (status === 'active') {
        return <PendingIcon sx={{ color: '#6366f1', fontSize: 24 }} />;
    }
    return <PendingIcon sx={{ color: '#d1d5db', fontSize: 24 }} />;
};

export default ApprovalFlowDisplay;