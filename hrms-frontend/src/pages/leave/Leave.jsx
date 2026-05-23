import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Stack,
  CircularProgress,
  Alert,
  Tabs,
  Tab,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Avatar,
  LinearProgress,
} from '@mui/material';  // ✅ Pastikan semua import ini ada
import {
  EventNote as EventIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  Assignment as AssignmentIcon,
  Refresh as RefreshIcon,
  TrendingUp as TrendingUpIcon,
  Work as WorkIcon,
  HolidayVillage as HolidayIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { useLeave } from '../contexts/LeaveContext';
import { useAuth } from '../contexts/AuthContext';
import { formatDate } from '../../utils/dateFormat';
import LeaveBalanceCard from './components/LeaveBalanceCard';
import LeaveRequestForm from './components/LeaveRequestForm';
import LeaveList from './components/LeaveList';
import ReplacementLeave from './components/ReplacementLeave';
import AdminLeaveBalances from './components/AdminLeaveBalances';

const Leave = () => {
  const { user } = useAuth();
  const { 
    leaveBalances, 
    leaves,
    loading,
    error,
    fetchLeaveTypes,
    fetchMyBalance,
    fetchLeaves,
  } = useLeave();
  
  const [tabValue, setTabValue] = useState(0);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const isAdmin = user?.position?.title?.includes('HR') || user?.position?.title?.includes('Admin');

  useEffect(() => {
    initializeLeave();
  }, []);

  const initializeLeave = async () => {
    await fetchLeaveTypes();
    await fetchMyBalance();
    await fetchLeaves();
  };

  const handleRefresh = () => {
    fetchMyBalance();
    fetchLeaves();
  };

  const getLeaveTypeColor = (code) => {
    const colors = {
      AL: '#10b981',
      SL: '#3b82f6',
      SPL: '#f59e0b',
      ML: '#ec4899',
      UL: '#8b5cf6',
    };
    return colors[code] || '#6b7280';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'approved': return <CheckCircleIcon />;
      case 'pending': return <PendingIcon />;
      case 'rejected': return <CancelIcon />;
      default: return <AssignmentIcon />;
    }
  };

  if (loading && !leaveBalances.length) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" fontWeight="bold">
          Leave Management
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={handleRefresh}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => window.location.reload()}>
          {error}
        </Alert>
      )}

      {/* Leave Balance Cards */}
      <Typography variant="h6" gutterBottom sx={{ mt: 2, mb: 2 }}>
        Leave Balance
      </Typography>
      
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {leaveBalances.map((balance) => (
          <Grid item xs={12} sm={6} md={3} key={balance.id}>
            <LeaveBalanceCard 
              balance={balance}
              color={getLeaveTypeColor(balance.leave_code)}
            />
          </Grid>
        ))}
      </Grid>

      {/* Action Buttons */}
      <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setRequestDialogOpen(true)}
        >
          Request Leave
        </Button>
      </Stack>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={(e, v) => setTabValue(v)} 
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}
        >
          <Tab label="My Leave Requests" />
          <Tab label="Replacement Leave" />
          {isAdmin && <Tab label="Admin - All Balances" />}
          {isAdmin && <Tab label="Admin - All Requests" />}
        </Tabs>
      </Paper>

      {/* Tab 1: My Leave Requests */}
      {tabValue === 0 && <LeaveList leaves={leaves} isAdmin={false} />}

      {/* Tab 2: Replacement Leave */}
      {tabValue === 1 && <ReplacementLeave />}

      {/* Tab 3: Admin - All Balances */}
      {tabValue === 2 && isAdmin && <AdminLeaveBalances />}

      {/* Tab 4: Admin - All Requests */}
      {tabValue === 3 && isAdmin && <LeaveList leaves={leaves} isAdmin={true} />}

      {/* Request Leave Dialog */}
      <LeaveRequestForm 
        open={requestDialogOpen}
        onClose={() => setRequestDialogOpen(false)}
        leaveBalances={leaveBalances}
      />
    </Box>
  );
};

export default Leave;