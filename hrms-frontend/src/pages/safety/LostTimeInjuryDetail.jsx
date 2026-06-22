// src/pages/safety/LostTimeInjuryDetail.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Chip,
  Button,
  IconButton,
  Divider,
  Avatar,
  Stack,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  DialogActions,
  LinearProgress,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  LocationOn as LocationOnIcon,
  CalendarToday as CalendarIcon,
  History as HistoryIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon,
  Assignment as AssignmentIcon,
  Healing as HealingIcon,
  MedicalInformation as MedicalIcon,
  AccessTime as AccessTimeIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

// ✅ Daftar Role Admin/HR/Manager
const ADMIN_ROLES = [
  'admin',
  'hr',
  'hr-manager',
  'super_admin',
  'HR Manager',
  'HR Officer',
  'HR Assistant',
  'System Admin',
  'IT Manager',
  'Finance Manager',
  'Marketing Manager',
  'Sales Manager',
  'Operations Manager',
  'Manager',
];

const STATUS_CONFIG = {
  reported: { label: 'Reported', bgColor: '#f59e0b', textColor: '#ffffff', icon: <PendingIcon /> },
  under_investigation: { label: 'Under Investigation', bgColor: '#3b82f6', textColor: '#ffffff', icon: <PendingIcon /> },
  in_review: { label: 'In Review', bgColor: '#8b5cf6', textColor: '#ffffff', icon: <PendingIcon /> },
  resolved: { label: 'Resolved', bgColor: '#10b981', textColor: '#ffffff', icon: <CheckCircleIcon /> },
  closed: { label: 'Closed', bgColor: '#6b7280', textColor: '#ffffff', icon: <CheckCircleIcon /> },
  rejected: { label: 'Rejected', bgColor: '#ef4444', textColor: '#ffffff', icon: <CancelIcon /> },
};

const SEVERITY_CONFIG = {
  minor: { label: 'Minor', color: '#10b981' },
  moderate: { label: 'Moderate', color: '#f59e0b' },
  severe: { label: 'Severe', color: '#f97316' },
  critical: { label: 'Critical', color: '#ef4444' },
};

const APPROVAL_STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#f59e0b' },
  in_progress: { label: 'In Progress', color: '#3b82f6' },
  approved: { label: 'Approved', color: '#10b981' },
  rejected: { label: 'Rejected', color: '#ef4444' },
  partially_approved: { label: 'Partially Approved', color: '#8b5cf6' },
};

// ============ HELPER FUNCTIONS ============
const parseWitnesses = (witnesses) => {
  if (!witnesses) return [];
  if (Array.isArray(witnesses)) return witnesses;
  if (typeof witnesses === 'string') {
    try {
      const parsed = JSON.parse(witnesses);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error('Error parsing witnesses:', e);
      return [];
    }
  }
  return [];
};



const getBodyPartLabel = (bodyPart) => {
  const labels = {
    head: 'Head',
    neck: 'Neck',
    shoulder: 'Shoulder',
    arm: 'Arm',
    elbow: 'Elbow',
    wrist: 'Wrist',
    hand: 'Hand',
    finger: 'Finger',
    chest: 'Chest',
    back: 'Back',
    spine: 'Spine',
    hip: 'Hip',
    leg: 'Leg',
    knee: 'Knee',
    ankle: 'Ankle',
    foot: 'Foot',
    toe: 'Toe',
    multiple: 'Multiple',
  };
  return labels[bodyPart] || bodyPart || '-';
};

const getInjuryTypeLabel = (injuryType) => {
  const labels = {
    fracture: 'Fracture',
    sprain: 'Sprain',
    strain: 'Strain',
    cut: 'Cut/Laceration',
    burn: 'Burn',
    bruise: 'Bruise/Contusion',
    amputation: 'Amputation',
    crush: 'Crush Injury',
    concussion: 'Concussion',
    other: 'Other',
  };
  return labels[injuryType] || injuryType || '-';
};

const formatTime = (value) => {
  if (!value) return '';

  const date = new Date(value);

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
};

// ============ MAIN COMPONENT ============
const LostTimeInjuryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lti, setLti] = useState(null);
  const [updating, setUpdating] = useState(false);
  
  const [historyDialog, setHistoryDialog] = useState(false);
  const [statusHistory, setStatusHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  const [statusDialog, setStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalFlow, setApprovalFlow] = useState([]);
  const [selectedManagers, setSelectedManagers] = useState([]);
  const [employees, setEmployees] = useState([]);

  // ✅ Get current user
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = currentUser?.role || '';
  const isAdmin = ADMIN_ROLES.includes(userRole);

  // ============ FETCH DATA ============
  useEffect(() => {
    fetchLti();
    fetchEmployees();
  }, [id]);

  const fetchLti = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/lost-time-injuries/${id}`);

      if (response.data?.status === 'success') {
        const data = response.data.data;
        const witnessesData = parseWitnesses(data.witnesses);
        setLti({ ...data, witnesses: witnessesData });
        
        if (data.approval_flow) {
          const flow = typeof data.approval_flow === 'string' 
            ? JSON.parse(data.approval_flow) 
            : data.approval_flow;
          setApprovalFlow(Array.isArray(flow) ? flow : []);
        }
      } else {
        setError('Record not found');
      }
    } catch (err) {
      console.error('Error fetching:', err);
      setError(err.response?.data?.message || 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees', { params: { per_page: 100 } });
      let data = [];
      if (response.data?.status === 'success') {
        if (response.data.data?.data && Array.isArray(response.data.data.data)) {
          data = response.data.data.data;
        } else if (Array.isArray(response.data.data)) {
          data = response.data.data;
        }
      }
      setEmployees(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const fetchStatusHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await api.get(`/lost-time-injuries/${id}/history`);
      if (response.data?.status === 'success') {
        setStatusHistory(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ============ HANDLERS ============
  const handleOpenHistory = async () => {
    setHistoryDialog(true);
    await fetchStatusHistory();
  };

  const handleDelete = async () => {
    if (!isAdmin) {
      alert('Only Admin, HR, or Manager can delete this record.');
      return;
    }

    const finalStatuses = ['resolved', 'closed', 'rejected'];
    if (finalStatuses.includes(lti.status)) {
      alert(`Cannot delete this record. Status is already ${lti.status}.`);
      return;
    }

    if (!window.confirm('Are you sure you want to delete this record? This action cannot be undone.')) return;
    
    try {
      await api.delete(`/lost-time-injuries/${id}`);
      navigate('/lost-time-injuries');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleStatusUpdate = async () => {
    if (!newStatus) {
      alert('Please select a status');
      return;
    }

    try {
      setUpdating(true);
      
      const payload = {
        status: newStatus,
        notes: statusNotes || '',
      };
      
      console.log('📤 Updating status:', payload);
      
      const response = await api.put(`/lost-time-injuries/${id}/status`, payload);
      
      console.log('✅ Status updated:', response.data);
      
      setStatusDialog(false);
      setNewStatus('');
      setStatusNotes('');
      await fetchLti();
    } catch (err) {
      console.error('❌ Error updating status:', err);
      console.error('❌ Error response:', err.response?.data);
      
      let errorMessage = 'Failed to update status';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.errors) {
        const errors = Object.values(err.response.data.errors).flat().join('\n');
        errorMessage = errors;
      }
      alert(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleSetApprovalFlow = async () => {
    try {
      setUpdating(true);
      await api.post(`/lost-time-injuries/${id}/approval-flow`, {
        approval_flow: selectedManagers,
      });
      setApprovalDialog(false);
      setSelectedManagers([]);
      await fetchLti();
    } catch (err) {
      console.error('Error setting approval flow:', err);
      alert('Failed to set approval flow');
    } finally {
      setUpdating(false);
    }
  };

  const handleManagerApprove = async (managerLevel, action) => {
    const notes = window.prompt(`Enter notes for ${action} (optional):`);
    
    try {
      setUpdating(true);
      await api.put(`/lost-time-injuries/${id}/approve/${managerLevel}`, {
        status: action,
        notes: notes || '',
      });
      await fetchLti();
    } catch (err) {
      console.error('Error in manager approval:', err);
      alert('Failed to process approval. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // ============ RENDER FUNCTIONS ============
  const renderStatusChip = (status) => {
    const config = STATUS_CONFIG[status];
    if (!config) return <Chip label={status || 'Unknown'} size="medium" />;
    return (
      <Chip
        label={config.label}
        size="medium"
        icon={config.icon}
        sx={{
          backgroundColor: config.bgColor,
          color: config.textColor,
          fontWeight: 600,
          '& .MuiChip-icon': { color: config.textColor },
        }}
      />
    );
  };

  const renderSeverityChip = (severity) => {
    const config = SEVERITY_CONFIG[severity];
    if (!config) return <Chip label={severity || 'Unknown'} size="small" />;
    return (
      <Chip
        label={config.label}
        size="small"
        sx={{
          backgroundColor: config.color,
          color: '#ffffff',
          fontWeight: 600,
        }}
      />
    );
  };

  const renderHistoryContent = () => {
    if (loadingHistory) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      );
    }

    if (statusHistory.length === 0) {
      return (
        <Box p={3} textAlign="center">
          <HistoryIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
          <Typography color="textSecondary">No history found</Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ p: 2 }}>
        {statusHistory.map((item, index) => (
          <Paper
            key={item.id || index}
            elevation={0}
            sx={{
              p: 2,
              mb: 2,
              backgroundColor: index === 0 ? '#f0fdf4' : '#f9fafb',
              border: index === 0 ? '1px solid #86efac' : '1px solid #e5e7eb',
              borderRadius: 2,
            }}
          >
            <Box>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={1}>
                <Typography variant="body2" fontWeight="bold" color="textSecondary">
                  Status changed
                </Typography>
                {item.old_status ? (
                  <Chip 
                    label={STATUS_CONFIG[item.old_status]?.label || item.old_status}
                    size="small"
                    sx={{
                      backgroundColor: STATUS_CONFIG[item.old_status]?.bgColor || '#6b7280',
                      color: '#ffffff',
                      fontWeight: 500,
                    }}
                  />
                ) : (
                  <Chip label="New" size="small" sx={{ backgroundColor: '#9ca3af', color: '#ffffff' }} />
                )}
                <Typography variant="body2" fontWeight="bold" color="textSecondary">→</Typography>
                {renderStatusChip(item.new_status)}
                {index === 0 && <Chip label="Latest" size="small" color="success" />}
              </Box>

              {item.old_days_lost !== undefined && item.new_days_lost !== undefined && (
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="caption" color="textSecondary">
                    Days Lost: {item.old_days_lost || 0} → {item.new_days_lost || 0}
                  </Typography>
                </Box>
              )}

              {item.notes && (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                  <strong>Note:</strong> {item.notes}
                </Typography>
              )}

              <Box mt={1} display="flex" gap={2} flexWrap="wrap">
                <Typography variant="caption" color="textSecondary">
                  <PersonIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                  {item.changed_by || 'System'}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  <CalendarIcon sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                  {formatDate(item.created_at, 'dd/MM/yyyy HH:mm')}
                </Typography>
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>
    );
  };

  // ============ LOADING & ERROR STATES ============
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !lti) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Record not found'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/lost-time-injuries')}>
          Back to List
        </Button>
      </Box>
    );
  }

  // ============ AUTHORIZATION ============
  const isReporter = lti?.reported_by?.id === currentUser?.id;
  const isManagerInFlow = approvalFlow.includes(currentUser?.id);
  const finalStatuses = ['resolved', 'closed', 'rejected'];
  const isFinal = finalStatuses.includes(lti.status);
  const witnessesData = Array.isArray(lti.witnesses) ? lti.witnesses : [];

  return (
    <Box>
      {/* ===== HEADER ===== */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
          <IconButton onClick={() => navigate('/lost-time-injuries')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Lost Time Injury #{lti.id}
          </Typography>
          {renderStatusChip(lti.status)}
          {isReporter && <Chip label="📢 Reporter" size="small" color="primary" sx={{ fontWeight: 600 }} />}
          {isManagerInFlow && !isReporter && <Chip label="📋 Manager" size="small" color="secondary" sx={{ fontWeight: 600 }} />}
        </Box>

        <Box display="flex" gap={1} flexWrap="wrap">
          <Button variant="outlined" startIcon={<HistoryIcon />} onClick={handleOpenHistory} sx={{ color: '#6366f1', borderColor: '#6366f1' }}>
            History
          </Button>
          <Tooltip title={isFinal ? 'Cannot edit - Record is ' + lti.status : 'Edit'}>
            <span>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/lost-time-injuries/${id}/edit`)}
                disabled={isFinal}
              >
                Edit
              </Button>
            </span>
          </Tooltip>
          <Tooltip title={!isAdmin ? 'Only Admin/HR/Manager can delete' : isFinal ? 'Cannot delete - Record is ' + lti.status : 'Delete'}>
            <span>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
                disabled={!isAdmin || isFinal}
              >
                Delete
              </Button>
            </span>
          </Tooltip>
        </Box>
      </Box>

      {/* ===== MAIN CONTENT ===== */}
      <Grid container spacing={3}>
        {/* ===== LEFT COLUMN ===== */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Injury Details
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Stack spacing={3}>
              <Box>
                <Typography variant="caption" color="textSecondary">Title</Typography>
                <Typography variant="h6">{lti.title}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary">Description</Typography>
                <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                  {lti.description}
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Employee</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <PersonIcon fontSize="small" color="action" />
                    <Typography>{lti.employee?.first_name} {lti.employee?.last_name}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Location</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LocationOnIcon fontSize="small" color="action" />
                    <Typography>{lti.location || 'Not specified'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Injury Date</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography>{formatDate(lti.injury_date)}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Injury Time</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <AccessTimeIcon fontSize="small" color="action" />
                    <Typography>{formatTime(lti.injury_time)}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Severity</Typography>
                  <Box>{renderSeverityChip(lti.severity)}</Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Body Part</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <HealingIcon fontSize="small" color="action" />
                    <Typography>{getBodyPartLabel(lti.body_part)}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Injury Type</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <MedicalIcon fontSize="small" color="action" />
                    <Typography>{getInjuryTypeLabel(lti.injury_type)}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Days Lost</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <AccessTimeIcon fontSize="small" color="action" />
                    <Typography fontWeight="bold">{lti.days_lost || 0} days</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Medical Treatment</Typography>
                  <Chip label={lti.medical_treatment ? 'Yes' : 'No'} color={lti.medical_treatment ? 'success' : 'default'} size="small" />
                </Grid>
                {lti.return_to_work_date && (
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Return to Work Date</Typography>
                    <Typography>{formatDate(lti.return_to_work_date)}</Typography>
                  </Grid>
                )}
              </Grid>

              {lti.medical_notes && (
                <Box>
                  <Typography variant="caption" color="textSecondary">Medical Notes</Typography>
                  <Typography variant="body2" sx={{ mt: 1 }}>{lti.medical_notes}</Typography>
                </Box>
              )}

              {lti.resolution_notes && (
                <Box>
                  <Typography variant="caption" color="textSecondary">Resolution Notes</Typography>
                  <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                    {lti.resolution_notes}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>

          {/* ===== WITNESSES ===== */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Witnesses ({witnessesData.length})
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            {witnessesData.length === 0 ? (
              <Typography variant="body2" color="textSecondary">No witnesses recorded for this incident.</Typography>
            ) : (
              <Grid container spacing={2}>
                {witnessesData.map((witness, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Card variant="outlined" sx={{ bgcolor: '#f8fafc' }}>
                      <CardContent>
                        <Typography variant="body1" fontWeight="medium">{witness.name}</Typography>
                        {witness.contact && (
                          <Typography variant="caption" color="textSecondary">📞 {witness.contact}</Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>

          {/* ===== ATTACHMENTS ===== */}
          {lti.file_path && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">Attachments</Typography>
              <Divider sx={{ mb: 2 }} />
              <Button variant="outlined" startIcon={<DownloadIcon />} href={lti.file_path} download={lti.file_name}>
                {lti.file_name || 'Download Attachment'}
              </Button>
            </Paper>
          )}
        </Grid>

        {/* ===== RIGHT COLUMN ===== */}
        <Grid item xs={12} md={4}>
          {/* ===== REPORTED BY ===== */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Reported By</Typography>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: '#6366f1' }}>
                  {lti.reported_by?.first_name?.[0]}{lti.reported_by?.last_name?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    {lti.reported_by?.first_name} {lti.reported_by?.last_name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {formatDate(lti.created_at, 'dd/MM/yyyy HH:mm')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* ===== MANAGER APPROVALS ===== */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Manager Approvals</Typography>
              <Divider sx={{ mb: 2 }} />
              
              {approvalFlow.length === 0 ? (
                <Typography variant="body2" color="textSecondary">
                  No approval flow configured.
                  {isReporter && !isFinal && ' Click below to set up approval flow.'}
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {approvalFlow.map((managerId, index) => {
                    const manager = employees.find(e => e.id === managerId);
                    const level = index + 1;
                    const statusField = `manager${level}_status`;
                    const status = lti[statusField] || 'pending';
                    const isApproved = status === 'approved';
                    const isRejected = status === 'rejected';
                    const isPending = status === 'pending';
                    const isCurrentUserManager = currentUser?.id === managerId;
                    
                    return (
                      <Box key={managerId} sx={{ 
                        p: 1.5, 
                        borderRadius: 1, 
                        bgcolor: isApproved ? '#f0fdf4' : isRejected ? '#fef2f2' : '#f9fafb', 
                        border: '1px solid', 
                        borderColor: isApproved ? '#86efac' : isRejected ? '#fecaca' : '#e5e7eb' 
                      }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Box display="flex" alignItems="center" gap={1}>
                            <Avatar sx={{ width: 28, height: 28, bgcolor: '#6366f1' }}>
                              {manager?.first_name?.[0]}{manager?.last_name?.[0]}
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight="medium">
                                Manager {level}: {manager?.first_name} {manager?.last_name}
                              </Typography>
                              <Typography variant="caption" color="textSecondary">
                                {isApproved ? `✅ Approved` : isRejected ? '❌ Rejected' : isCurrentUserManager ? '📌 Action Required' : '⏳ Pending'}
                              </Typography>
                            </Box>
                          </Box>
                          {isPending && isCurrentUserManager && !isFinal && (
                            <Box display="flex" gap={0.5}>
                              <Button 
                                size="small" 
                                color="success" 
                                onClick={() => handleManagerApprove(level, 'approved')} 
                                startIcon={<CheckCircleIcon />}
                                disabled={updating}
                              >
                                Approve
                              </Button>
                              <Button 
                                size="small" 
                                color="error" 
                                onClick={() => handleManagerApprove(level, 'rejected')} 
                                startIcon={<CancelIcon />}
                                disabled={updating}
                              >
                                Reject
                              </Button>
                            </Box>
                          )}
                          {isApproved && (
                            <Chip label="Approved" size="small" color="success" />
                          )}
                          {isRejected && (
                            <Chip label="Rejected" size="small" color="error" />
                          )}
                          {isPending && !isCurrentUserManager && (
                            <Chip label="Waiting" size="small" color="warning" />
                          )}
                        </Box>
                        {lti[`manager${level}_notes`] && (
                          <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                            📝 Note: {lti[`manager${level}_notes`]}
                          </Typography>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              )}
            </CardContent>
          </Card>

          {/* ===== APPROVAL STATUS ===== */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Approval Status</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box mb={2}>
                <Chip
                  label={APPROVAL_STATUS_CONFIG[lti.approval_status]?.label || lti.approval_status}
                  sx={{ 
                    backgroundColor: APPROVAL_STATUS_CONFIG[lti.approval_status]?.color || '#6b7280', 
                    color: '#ffffff', 
                    fontWeight: 600 
                  }}
                />
              </Box>
              
              {approvalFlow.length > 0 && (
                <Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={lti.approval_progress || 0} 
                    sx={{ height: 8, borderRadius: 4 }} 
                  />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                    {lti.approval_progress || 0}% complete
                  </Typography>
                </Box>
              )}
              
              <Button
                variant="outlined"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => setApprovalDialog(true)}
                disabled={!isReporter || isFinal || lti.approval_status === 'approved' || lti.approval_status === 'rejected'}
              >
                {isReporter ? (approvalFlow.length > 0 ? 'Update Approval Flow' : 'Set Approval Flow') : 'View Only'}
              </Button>
            </CardContent>
          </Card>

          {/* ===== UPDATE STATUS ===== */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Update Status</Typography>
              
              {isFinal && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  This record is already <strong>{STATUS_CONFIG[lti.status]?.label}</strong>. Status cannot be changed.
                </Alert>
              )}
              
              <Button
                variant="contained"
                fullWidth
                onClick={() => setStatusDialog(true)}
                disabled={isFinal || updating}
                startIcon={updating ? <CircularProgress size={20} /> : null}
              >
                {updating ? 'Updating...' : 'Change Status'}
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ===== STATUS UPDATE DIALOG ===== */}
      <Dialog open={statusDialog} onClose={() => setStatusDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Status</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Alert severity="info">
              Current Status: <strong>{STATUS_CONFIG[lti.status]?.label || lti.status}</strong>
              {lti.approval_status === 'approved' && <Chip label="Approved" size="small" color="success" sx={{ ml: 1 }} />}
            </Alert>
            
            {lti.approval_status !== 'approved' && (
              <Alert severity="warning">
                <strong>Note:</strong> Status can only be changed to <strong>Closed</strong> or <strong>Rejected</strong> after approval.
              </Alert>
            )}
            
            <FormControl fullWidth>
              <InputLabel>New Status</InputLabel>
              <Select 
                value={newStatus} 
                onChange={(e) => setNewStatus(e.target.value)} 
                label="New Status"
              >
                {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                  // Check if this status is allowed
                  const isClosedOrRejected = key === 'closed' || key === 'rejected';
                  const requiresApproval = isClosedOrRejected && lti.approval_status !== 'approved';
                  const isCurrent = key === lti.status;
                  
                  return (
                    <MenuItem 
                      key={key} 
                      value={key} 
                      disabled={isCurrent || requiresApproval}
                    >
                      {config.label}
                      {requiresApproval && ' (requires approval)'}
                      {isCurrent && ' (current)'}
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            
            <TextField 
              fullWidth 
              label="Notes" 
              multiline 
              rows={3} 
              value={statusNotes} 
              onChange={(e) => setStatusNotes(e.target.value)} 
              placeholder="Add notes about this status change..." 
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleStatusUpdate} 
            disabled={!newStatus || updating}
          >
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== APPROVAL FLOW DIALOG ===== */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalFlow.length > 0 ? 'Update Approval Flow' : 'Set Approval Flow'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="textSecondary">
              Select up to 4 managers who need to approve this record.
            </Typography>
            
            {!isReporter && (
              <Alert severity="warning">
                Only the reporter can set or update the approval flow.
              </Alert>
            )}
            
            <FormControl fullWidth>
              <InputLabel>Select Managers</InputLabel>
              <Select
                multiple
                value={selectedManagers.length > 0 ? selectedManagers : approvalFlow}
                onChange={(e) => setSelectedManagers(e.target.value)}
                label="Select Managers"
                disabled={!isReporter}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((id) => {
                      const emp = employees.find(e => e.id === id);
                      return emp ? (
                        <Chip 
                          key={id} 
                          label={`${emp.first_name} ${emp.last_name}`} 
                          size="small" 
                        />
                      ) : null;
                    })}
                  </Box>
                )}
              >
                {employees.map(emp => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {emp.first_name} {emp.last_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {selectedManagers.length > 0 && (
              <Typography variant="caption" color="textSecondary">
                Selected {selectedManagers.length} manager(s)
              </Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleSetApprovalFlow} 
            disabled={selectedManagers.length === 0 || updating || !isReporter}
          >
            Save Approval Flow
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== HISTORY DIALOG ===== */}
      <Dialog 
        open={historyDialog} 
        onClose={() => setHistoryDialog(false)} 
        maxWidth="md" 
        fullWidth
        PaperProps={{ sx: { maxHeight: '80vh' } }}
      >
        <DialogTitle sx={{ borderBottom: '1px solid #e5e7eb', pb: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center" gap={1}>
              <HistoryIcon sx={{ color: '#6366f1' }} />
              <Typography variant="h6" fontWeight="bold">Status History</Typography>
            </Box>
            <IconButton onClick={() => setHistoryDialog(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {renderHistoryContent()}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default LostTimeInjuryDetail;