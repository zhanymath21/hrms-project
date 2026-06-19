import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Paper,
  Divider,
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
// Import Timeline components from @mui/lab
import Timeline from '@mui/lab/Timeline';
import TimelineItem from '@mui/lab/TimelineItem';
import TimelineSeparator from '@mui/lab/TimelineSeparator';
import TimelineConnector from '@mui/lab/TimelineConnector';
import TimelineContent from '@mui/lab/TimelineContent';
import TimelineDot from '@mui/lab/TimelineDot';
import TimelineOppositeContent from '@mui/lab/TimelineOppositeContent';

import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

// 🔥 STATUS CONFIG (sama dengan di CandidateDetail)
const STATUS_CONFIG = {
  new: { label: 'New', bgColor: '#3b82f6', textColor: '#ffffff' },
  screening: { label: 'Screening', bgColor: '#6366f1', textColor: '#ffffff' },
  interview: { label: 'Interview', bgColor: '#f59e0b', textColor: '#ffffff' },
  technical_test: { label: 'Technical Test', bgColor: '#8b5cf6', textColor: '#ffffff' },
  hr_interview: { label: 'HR Interview', bgColor: '#3b82f6', textColor: '#ffffff' },
  offer: { label: 'Offer', bgColor: '#10b981', textColor: '#ffffff' },
  hired: { label: 'Hired', bgColor: '#10b981', textColor: '#ffffff' },
  rejected: { label: 'Rejected', bgColor: '#ef4444', textColor: '#ffffff' },
  withdrawn: { label: 'Withdrawn', bgColor: '#6b7280', textColor: '#ffffff' },
};

const CandidateHistory = ({ open, onClose, candidateId, candidateName }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (open && candidateId) {
      fetchHistory();
    }
  }, [open, candidateId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/candidates/${candidateId}/history`);

      if (response.data?.status === 'success') {
        setHistory(response.data.data || []);
      } else {
        setError('Failed to load history');
      }
    } catch (err) {
      console.error('Error fetching history:', err);
      setError(err.response?.data?.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusChip = (status) => {
    const config = STATUS_CONFIG[status];
    if (!config) {
      return <Chip label={status || 'Unknown'} size="small" />;
    }
    return (
      <Chip
        label={config.label}
        size="small"
        sx={{
          backgroundColor: config.bgColor,
          color: config.textColor,
          fontWeight: 600,
        }}
      />
    );
  };

  const getStatusIcon = (status) => {
    if (status === 'hired') return <CheckCircleIcon />;
    if (status === 'rejected' || status === 'withdrawn') return <CancelIcon />;
    return <PendingIcon />;
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2, maxHeight: '80vh' },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #e5e7eb',
          pb: 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <TimelineIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Status History
          </Typography>
          {candidateName && (
            <Typography variant="body2" color="textSecondary" sx={{ ml: 1 }}>
              - {candidateName}
            </Typography>
          )}
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, overflow: 'auto' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box p={3}>
            <Alert severity="error">{error}</Alert>
          </Box>
        ) : history.length === 0 ? (
          <Box p={3}>
            <Alert severity="info">No history records found for this candidate.</Alert>
          </Box>
        ) : (
          <Timeline position="right" sx={{ p: 0, m: 0 }}>
            {history.map((item, index) => {
              const isFirst = index === 0;
              const isLast = index === history.length - 1;
              const config = STATUS_CONFIG[item.new_status];

              return (
                <TimelineItem key={item.id || index}>
                  <TimelineOppositeContent
                    sx={{
                      flex: 0.2,
                      py: 2,
                      px: 2,
                      color: 'text.secondary',
                    }}
                  >
                    <Typography variant="caption" color="textSecondary">
                      {formatDate(item.created_at, 'dd/MM/yyyy HH:mm')}
                    </Typography>
                    <Typography variant="caption" display="block" color="textSecondary">
                      by {item.changed_by || 'System'}
                    </Typography>
                  </TimelineOppositeContent>

                  <TimelineSeparator>
                    <TimelineDot
                      sx={{
                        backgroundColor: config?.bgColor || '#6b7280',
                        color: config?.textColor || '#ffffff',
                        width: 40,
                        height: 40,
                      }}
                    >
                      {getStatusIcon(item.new_status)}
                    </TimelineDot>
                    {!isLast && <TimelineConnector />}
                  </TimelineSeparator>

                  <TimelineContent sx={{ py: 2, px: 2 }}>
                    <Paper
                      elevation={0}
                      sx={{
                        p: 2,
                        backgroundColor: isFirst ? '#f0fdf4' : '#f9fafb',
                        border: isFirst ? '1px solid #86efac' : '1px solid #e5e7eb',
                        borderRadius: 2,
                      }}
                    >
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="body2" fontWeight="bold">
                          Status changed from
                        </Typography>
                        {getStatusChip(item.old_status)}
                        <Typography variant="body2" fontWeight="bold">
                          →
                        </Typography>
                        {getStatusChip(item.new_status)}
                        {isFirst && (
                          <Chip
                            label="Latest"
                            size="small"
                            color="success"
                            sx={{ ml: 1 }}
                          />
                        )}
                      </Box>

                      {item.notes && (
                        <>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="body2" color="textSecondary">
                            <strong>Note:</strong> {item.notes}
                          </Typography>
                        </>
                      )}

                      <Box mt={1} display="flex" gap={2}>
                        {item.changed_by && (
                          <Typography variant="caption" color="textSecondary">
                            <PersonIcon sx={{ fontSize: 14, mr: 0.5 }} />
                            {item.changed_by}
                          </Typography>
                        )}
                        {item.ip_address && (
                          <Typography variant="caption" color="textSecondary">
                            IP: {item.ip_address}
                          </Typography>
                        )}
                      </Box>
                    </Paper>
                  </TimelineContent>
                </TimelineItem>
              );
            })}
          </Timeline>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CandidateHistory;