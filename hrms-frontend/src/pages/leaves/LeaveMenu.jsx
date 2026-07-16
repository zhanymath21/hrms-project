// src/pages/leaves/LeaveMenu.jsx

import React from 'react';
import {
    Box,
    Grid,
    Card,
    CardContent,
    Typography,
    Avatar,
    Button,
    Paper,
    Stack,
    Chip,
} from '@mui/material';
import {
    BeachAccess,
    Add,
    History,
    Pending,
    CheckCircle,
    Cancel,
    People,
    Settings,
    SwapHoriz,
    Dashboard as DashboardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useLeave } from '../../contexts/LeaveContext';

const LeaveMenu = () => {
    const navigate = useNavigate();
    const { balances, leaves, pendingLeaves } = useLeave();

    const totalLeaves = leaves?.data?.length || 0;
    const pendingCount = pendingLeaves?.data?.length || 0;
    const approvedCount = leaves?.data?.filter(l => l.status === 'approved').length || 0;
    const rejectedCount = leaves?.data?.filter(l => l.status === 'rejected').length || 0;

    const menuItems = [
        {
            title: 'Dashboard',
            icon: <DashboardIcon />,
            color: '#6366f1',
            bgColor: '#eef2ff',
            path: '/leaves/dashboard',
            description: 'Overview of leave activities',
        },
        {
            title: 'Request Leave',
            icon: <Add />,
            color: '#10b981',
            bgColor: '#d1fae5',
            path: '/leaves/create',
            description: 'Submit a new leave request',
        },
        {
            title: 'My Requests',
            icon: <History />,
            color: '#3b82f6',
            bgColor: '#eff6ff',
            path: '/leaves/list',
            description: 'View all your leave requests',
            badge: totalLeaves,
        },
        {
            title: 'Pending Approvals',
            icon: <Pending />,
            color: '#f59e0b',
            bgColor: '#fef3c7',
            path: '/leaves/approval',
            description: 'Review pending leave requests',
            badge: pendingCount,
        },
        {
            title: 'My Balance',
            icon: <BeachAccess />,
            color: '#8b5cf6',
            bgColor: '#f3e8ff',
            path: '/leaves/balance',
            description: 'Check your leave balance',
        },
        {
            title: 'All Balances',
            icon: <People />,
            color: '#ec4899',
            bgColor: '#fce7f3',
            path: '/leaves/all-balances',
            description: 'Manage employee balances',
        },
        {
            title: 'Replacement Leave',
            icon: <SwapHoriz />,
            color: '#f97316',
            bgColor: '#ffedd5',
            path: '/leaves/replacement',
            description: 'Manage replacement leave',
        },
        {
            title: 'Approval Flow',
            icon: <Settings />,
            color: '#6b7280',
            bgColor: '#f3f4f6',
            path: '/approval-flow',
            description: 'Configure approval levels',
        },
    ];

    return (
        <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
            {/* Header */}
            <Paper 
                elevation={0}
                sx={{ 
                    p: 3, 
                    mb: 3, 
                    bgcolor: '#f8fafc',
                    borderRadius: 2,
                    border: '1px solid #e5e7eb'
                }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
                    <Box>
                        <Typography variant="h4" fontWeight="bold" sx={{ color: '#1e293b' }}>
                            🏖️ Leave Management
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            Manage leave requests, approvals, and balances
                        </Typography>
                    </Box>
                    <Box display="flex" gap={1}>
                        <Chip label={`${pendingCount} Pending`} color="warning" size="small" icon={<Pending />} />
                        <Chip label={`${approvedCount} Approved`} color="success" size="small" icon={<CheckCircle />} />
                        <Chip label={`${rejectedCount} Rejected`} color="error" size="small" icon={<Cancel />} />
                    </Box>
                </Box>
            </Paper>

            {/* Stats */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3} md={2.4}>
                    <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2 }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" color="textSecondary">Total Requests</Typography>
                            <Typography variant="h5" fontWeight="bold">{totalLeaves}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3} md={2.4}>
                    <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, bgcolor: '#fef3c7' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" sx={{ color: '#f59e0b' }}>Pending</Typography>
                            <Typography variant="h5" fontWeight="bold" sx={{ color: '#f59e0b' }}>{pendingCount}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3} md={2.4}>
                    <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, bgcolor: '#d1fae5' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" sx={{ color: '#10b981' }}>Approved</Typography>
                            <Typography variant="h5" fontWeight="bold" sx={{ color: '#10b981' }}>{approvedCount}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3} md={2.4}>
                    <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, bgcolor: '#fee2e2' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" sx={{ color: '#ef4444' }}>Rejected</Typography>
                            <Typography variant="h5" fontWeight="bold" sx={{ color: '#ef4444' }}>{rejectedCount}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={6} sm={3} md={2.4}>
                    <Card elevation={0} sx={{ border: '1px solid #e5e7eb', borderRadius: 2, bgcolor: '#f3e8ff' }}>
                        <CardContent sx={{ py: 1.5 }}>
                            <Typography variant="caption" sx={{ color: '#8b5cf6' }}>Balance</Typography>
                            <Typography variant="h5" fontWeight="bold" sx={{ color: '#8b5cf6' }}>
                                {balances?.reduce((sum, b) => sum + (b.remaining_days || 0), 0)?.toFixed(1) || 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Menu Grid */}
            <Grid container spacing={2}>
                {menuItems.map((item) => (
                    <Grid item xs={12} sm={6} md={4} lg={3} key={item.title}>
                        <Card 
                            elevation={0}
                            sx={{ 
                                border: '1px solid #e5e7eb',
                                borderRadius: 2,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                height: '100%',
                                '&:hover': {
                                    borderColor: item.color,
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                    transform: 'translateY(-2px)',
                                }
                            }}
                            onClick={() => navigate(item.path)}
                        >
                            <CardContent sx={{ p: 2 }}>
                                <Box display="flex" alignItems="center" gap={1.5}>
                                    <Avatar sx={{ bgcolor: item.bgColor, color: item.color, width: 40, height: 40 }}>
                                        {item.icon}
                                    </Avatar>
                                    <Box flex={1}>
                                        <Typography variant="subtitle1" fontWeight="bold" fontSize="0.95rem">
                                            {item.title}
                                        </Typography>
                                        <Typography variant="caption" color="textSecondary" display="block">
                                            {item.description}
                                        </Typography>
                                    </Box>
                                    {item.badge !== undefined && item.badge > 0 && (
                                        <Chip 
                                            label={item.badge}
                                            size="small"
                                            sx={{ bgcolor: item.color, color: '#fff', fontWeight: 600, fontSize: '0.7rem', height: 20 }}
                                        />
                                    )}
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Quick Actions */}
            <Paper 
                elevation={0}
                sx={{ 
                    mt: 3,
                    p: 2,
                    border: '1px solid #e5e7eb',
                    borderRadius: 2,
                    bgcolor: '#f8fafc'
                }}
            >
                <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1 }}>
                    💡 Quick Actions
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Button 
                        size="small" 
                        variant="contained" 
                        startIcon={<Add />}
                        onClick={() => navigate('/leaves/create')}
                        sx={{ textTransform: 'none' }}
                    >
                        Request Leave
                    </Button>
                    <Button 
                        size="small" 
                        variant="outlined" 
                        startIcon={<History />}
                        onClick={() => navigate('/leaves/list')}
                        sx={{ textTransform: 'none' }}
                    >
                        View History
                    </Button>
                    <Button 
                        size="small" 
                        variant="outlined" 
                        startIcon={<BeachAccess />}
                        onClick={() => navigate('/leaves/balance')}
                        sx={{ textTransform: 'none' }}
                    >
                        Check Balance
                    </Button>
                    {pendingCount > 0 && (
                        <Button 
                            size="small" 
                            variant="contained" 
                            color="warning"
                            startIcon={<Pending />}
                            onClick={() => navigate('/leaves/approval')}
                            sx={{ textTransform: 'none' }}
                        >
                            {pendingCount} Pending Approval{pendingCount > 1 ? 's' : ''}
                        </Button>
                    )}
                </Stack>
            </Paper>
        </Box>
    );
};

export default LeaveMenu;