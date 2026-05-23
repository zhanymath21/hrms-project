// src/pages/leave/components/LeaveBalanceCard.jsx
import React from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, Stack, Chip, Tooltip, Divider } from '@mui/material';
import { BeachAccess, LocalHospital, EmojiEvents, Info, TrendingUp, ArrowForward } from '@mui/icons-material';

const LeaveBalanceCard = ({ balance }) => {
  const getIcon = () => {
    switch(balance.leave_code) {
      case 'AL': return <BeachAccess sx={{ fontSize: 40, color: '#10b981', opacity: 0.7 }} />;
      case 'SL': return <LocalHospital sx={{ fontSize: 40, color: '#3b82f6', opacity: 0.7 }} />;
      case 'SPL': return <EmojiEvents sx={{ fontSize: 40, color: '#f59e0b', opacity: 0.7 }} />;
      default: return <BeachAccess sx={{ fontSize: 40, color: '#10b981', opacity: 0.7 }} />;
    }
  };

  const getColor = () => {
    switch(balance.leave_code) {
      case 'AL': return '#10b981';
      case 'SL': return '#3b82f6';
      case 'SPL': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const getTitle = () => {
    switch(balance.leave_code) {
      case 'AL': return 'Annual Leave';
      case 'SL': return 'Sick Leave';
      case 'SPL': return 'Special Leave';
      default: return balance.leave_type;
    }
  };

  const percentage = (balance.used_days / balance.total_entitlement) * 100;
  const color = getColor();

  return (
    <Card sx={{ 
      borderLeft: `4px solid ${color}`, 
      height: '100%',
      transition: 'transform 0.2s, box-shadow 0.2s',
      '&:hover': { transform: 'translateY(-4px)', boxShadow: 3 }
    }}>
      <CardContent>
        {/* Header */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              {getTitle()}
            </Typography>
            <Chip 
              label={balance.leave_code} 
              size="small" 
              sx={{ bgcolor: color, color: 'white', fontSize: '10px', height: 20, fontWeight: 'bold' }}
            />
          </Box>
          {getIcon()}
        </Stack>
        
        {/* Remaining Days */}
        <Box sx={{ my: 2, textAlign: 'center' }}>
          <Typography variant="h2" component="div" sx={{ fontWeight: 'bold', color: color }}>
            {Math.floor(balance.remaining_days)}
            <Typography component="span" variant="h6" color="textSecondary">
              .{(balance.remaining_days % 1).toFixed(1).substring(2)} days
            </Typography>
          </Typography>
          <Typography variant="body2" color="textSecondary">
            remaining from {balance.total_entitlement} days
          </Typography>
        </Box>

        {/* Progress Bar */}
        <LinearProgress 
          variant="determinate" 
          value={Math.min(percentage, 100)} 
          sx={{ height: 8, borderRadius: 4, bgcolor: `${color}20`, '& .MuiLinearProgress-bar': { bgcolor: color } }} 
        />

        {/* Usage Summary */}
        <Stack direction="row" justifyContent="space-between" sx={{ mt: 2 }}>
          <Tooltip title="Already taken">
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="caption" color="textSecondary">Used</Typography>
              <Typography variant="h6" color="error.main">{balance.used_days}</Typography>
            </Box>
          </Tooltip>
          <Tooltip title="Waiting for approval">
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="caption" color="textSecondary">Pending</Typography>
              <Typography variant="h6" color="warning.main">{balance.pending_days}</Typography>
            </Box>
          </Tooltip>
          <Tooltip title="Base entitlement per year">
            <Box sx={{ textAlign: 'center', flex: 1 }}>
              <Typography variant="caption" color="textSecondary">Base</Typography>
              <Typography variant="h6">{balance.base_entitlement}</Typography>
            </Box>
          </Tooltip>
        </Stack>

        {/* Bonus Details - Only for Annual Leave */}
        {(balance.seniority_bonus > 0 || balance.carry_forward > 0 || balance.replacement_days > 0) && (
          <>
            <Divider sx={{ my: 1.5 }} />
            <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Info fontSize="small" /> Bonus Breakdown:
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }} flexWrap="wrap">
              {balance.seniority_bonus > 0 && (
                <Tooltip title={`+${balance.seniority_bonus} day from ${balance.years_of_service}+ years service`}>
                  <Chip icon={<TrendingUp />} label={`+${balance.seniority_bonus} seniority`} size="small" color="primary" variant="outlined" />
                </Tooltip>
              )}
              {balance.carry_forward > 0 && (
                <Tooltip title="Carried forward from last year (max 6 days)">
                  <Chip icon={<ArrowForward />} label={`+${balance.carry_forward} carry forward`} size="small" color="info" variant="outlined" />
                </Tooltip>
              )}
              {balance.replacement_days > 0 && (
                <Tooltip title="From working on holidays/weekends">
                  <Chip label={`+${balance.replacement_days} replacement`} size="small" color="warning" variant="outlined" />
                </Tooltip>
              )}
              {balance.manual_adjustment !== 0 && (
                <Tooltip title="Manually adjusted by HR">
                  <Chip 
                    label={`Adjustment: ${balance.manual_adjustment > 0 ? '+' : ''}${balance.manual_adjustment}`}
                    size="small" 
                    color={balance.manual_adjustment > 0 ? 'success' : 'error'}
                    variant="outlined"
                  />
                </Tooltip>
              )}
            </Stack>
          </>
        )}

        {/* Warning for expiring leave */}
        {balance.leave_code === 'AL' && balance.remaining_days > 6 && (
          <Typography variant="caption" color="warning.main" sx={{ mt: 1, display: 'block' }}>
            ⚠️ Only 6 days can be carried forward to next year. {balance.remaining_days - 6} days will expire!
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};

export default LeaveBalanceCard;