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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  LocationOn as LocationOnIcon,
  CalendarToday as CalendarIcon,
  Description as DescriptionIcon,
  History as HistoryIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  Download as DownloadIcon,
  Assignment as AssignmentIcon,
  Category as CategoryIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

const STATUS_CONFIG = {
  reported: { label: 'Reported', bgColor: '#f59e0b', textColor: '#ffffff', icon: <PendingIcon /> },
  under_investigation: { label: 'Under Investigation', bgColor: '#3b82f6', textColor: '#ffffff', icon: <PendingIcon /> },
  in_review: { label: 'In Review', bgColor: '#8b5cf6', textColor: '#ffffff', icon: <PendingIcon /> },
  resolved: { label: 'Resolved', bgColor: '#10b981', textColor: '#ffffff', icon: <CheckCircleIcon /> },
  closed: { label: 'Closed', bgColor: '#6b7280', textColor: '#ffffff', icon: <CheckCircleIcon /> },
  rejected: { label: 'Rejected', bgColor: '#ef4444', textColor: '#ffffff', icon: <CancelIcon /> },
};

const SEVERITY_CONFIG = {
  low: { label: 'Low', color: '#10b981' },
  medium: { label: 'Medium', color: '#f59e0b' },
  high: { label: 'High', color: '#f97316' },
  critical: { label: 'Critical', color: '#ef4444' },
};

const APPROVAL_STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#f59e0b' },
  in_progress: { label: 'In Progress', color: '#3b82f6' },
  approved: { label: 'Approved', color: '#10b981' },
  rejected: { label: 'Rejected', color: '#ef4444' },
  partially_approved: { label: 'Partially Approved', color: '#8b5cf6' },
};

const IncidentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [incident, setIncident] = useState(null);
  const [updating, setUpdating] = useState(false);
  
  // History Dialog
  const [historyDialog, setHistoryDialog] = useState(false);
  const [statusHistory, setStatusHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Status Update Dialog
  const [statusDialog, setStatusDialog] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');

  // Approval Dialog
  const [approvalDialog, setApprovalDialog] = useState(false);
  const [approvalFlow, setApprovalFlow] = useState([]);
  const [selectedManagers, setSelectedManagers] = useState([]);
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    fetchIncident();
    fetchEmployees();
  }, [id]);

  const fetchIncident = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/incident-reports/${id}`);

      if (response.data?.status === 'success') {
        setIncident(response.data.data);
        // Set approval flow if exists
        if (response.data.data.approval_flow) {
          setApprovalFlow(JSON.parse(response.data.data.approval_flow) || []);
        }
      } else {
        setError('Incident not found');
      }
    } catch (err) {
      console.error('Error fetching incident:', err);
      setError(err.response?.data?.message || 'Failed to fetch incident');
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
      const response = await api.get(`/incident-reports/${id}/history`);
      if (response.data?.status === 'success') {
        setStatusHistory(response.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenHistory = async () => {
    setHistoryDialog(true);
    await fetchStatusHistory();
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this incident report?')) return;
    
    try {
      await api.delete(`/incident-reports/${id}`);
      navigate('/incident-reports');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleStatusUpdate = async () => {
    try {
      setUpdating(true);
      await api.put(`/incident-reports/${id}/status`, {
        status: newStatus,
        notes: statusNotes,
      });
      setStatusDialog(false);
      setNewStatus('');
      setStatusNotes('');
      await fetchIncident();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleSetApprovalFlow = async () => {
    try {
      setUpdating(true);
      await api.post(`/incident-reports/${id}/approval-flow`, {
        approval_flow: selectedManagers,
      });
      setApprovalDialog(false);
      setSelectedManagers([]);
      await fetchIncident();
    } catch (err) {
      console.error('Error setting approval flow:', err);
      alert('Failed to set approval flow');
    } finally {
      setUpdating(false);
    }
  };

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

  const getCategoryLabel = (category) => {
    const labels = {
      safety: 'Safety',
      security: 'Security',
      health: 'Health',
      property_damage: 'Property Damage',
      environmental: 'Environmental',
      harassment: 'Harassment',
      discrimination: 'Discrimination',
      fraud: 'Fraud',
      theft: 'Theft',
      data_breach: 'Data Breach',
      policy_violation: 'Policy Violation',
      workplace_violence: 'Workplace Violence',
      accident: 'Accident',
      near_miss: 'Near Miss',
      other: 'Other',
    };
    return labels[category] || category;
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

              {item.old_approval_status && item.new_approval_status && (
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="caption" color="textSecondary">
                    Approval: {item.old_approval_status} → {item.new_approval_status}
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

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !incident) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Incident not found'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/incident-reports')}>
          Back to Incidents
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/incident-reports')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Incident #{incident.id}
          </Typography>
          {renderStatusChip(incident.status)}
        </Box>

        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={handleOpenHistory}
            sx={{ color: '#6366f1', borderColor: '#6366f1' }}
          >
            History
          </Button>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/incident-reports/${id}/edit`)}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<DeleteIcon />}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Incident Details */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Incident Details
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Stack spacing={3}>
              <Box>
                <Typography variant="caption" color="textSecondary">Title</Typography>
                <Typography variant="h6">{incident.title}</Typography>
              </Box>

              <Box>
                <Typography variant="caption" color="textSecondary">Description</Typography>
                <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                  {incident.description}
                </Typography>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Category</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CategoryIcon fontSize="small" color="action" />
                    <Typography>{getCategoryLabel(incident.category)}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Severity</Typography>
                  <Box>{renderSeverityChip(incident.severity)}</Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Location</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <LocationOnIcon fontSize="small" color="action" />
                    <Typography>{incident.location || 'Not specified'}</Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" color="textSecondary">Incident Date</Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <CalendarIcon fontSize="small" color="action" />
                    <Typography>
                      {formatDate(incident.incident_date)}
                      {incident.incident_time && ` at ${incident.incident_time.substring(0, 5)}`}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {incident.resolution_notes && (
                <Box>
                  <Typography variant="caption" color="textSecondary">Resolution Notes</Typography>
                  <Typography variant="body2" sx={{ mt: 1, whiteSpace: 'pre-wrap' }}>
                    {incident.resolution_notes}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>

          {/* Witnesses */}
          {incident.witnesses && incident.witnesses.length > 0 && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Witnesses
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                {incident.witnesses.map((witness, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="body1" fontWeight="medium">
                          {witness.name}
                        </Typography>
                        {witness.contact && (
                          <Typography variant="caption" color="textSecondary">
                            Contact: {witness.contact}
                          </Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {/* Attachments */}
          {incident.file_path && (
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Attachments
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                href={incident.file_path}
                download={incident.file_name}
              >
                {incident.file_name || 'Download Attachment'}
              </Button>
            </Paper>
          )}
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Reported By */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Reported By
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" alignItems="center" gap={2}>
                <Avatar sx={{ bgcolor: '#6366f1' }}>
                  {incident.reported_by?.first_name?.[0]}
                  {incident.reported_by?.last_name?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    {incident.reported_by?.first_name} {incident.reported_by?.last_name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {formatDate(incident.created_at, 'dd/MM/yyyy HH:mm')}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Assignment */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Assignment
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box display="flex" alignItems="center" gap={2}>
                <AssignmentIcon color="action" />
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Assigned To
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {incident.assigned_to ? 
                      `${incident.assigned_to.first_name} ${incident.assigned_to.last_name}` : 
                      'Unassigned'}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Approval Status */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Approval Status
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Box mb={2}>
                <Chip
                  label={APPROVAL_STATUS_CONFIG[incident.approval_status]?.label || incident.approval_status}
                  sx={{
                    backgroundColor: APPROVAL_STATUS_CONFIG[incident.approval_status]?.color || '#6b7280',
                    color: '#ffffff',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                />
              </Box>
              
              {approvalFlow.length > 0 && (
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Approval Progress
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={incident.approval_progress || 0}
                    sx={{ height: 8, borderRadius: 4, mt: 1 }}
                  />
                  <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                    {incident.approval_progress || 0}% complete
                  </Typography>
                </Box>
              )}

              <Button
                variant="outlined"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => setApprovalDialog(true)}
                disabled={incident.approval_status === 'approved' || incident.approval_status === 'rejected'}
              >
                {approvalFlow.length > 0 ? 'Update Approval Flow' : 'Set Approval Flow'}
              </Button>
            </CardContent>
          </Card>

          {/* Update Status Button */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Update Status
              </Typography>
              <Button
                variant="contained"
                fullWidth
                onClick={() => setStatusDialog(true)}
                disabled={updating}
                startIcon={updating ? <CircularProgress size={20} /> : null}
              >
                Change Status
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Status Update Dialog */}
      <Dialog open={statusDialog} onClose={() => setStatusDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Incident Status</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <InputLabel>New Status</InputLabel>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                label="New Status"
              >
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <MenuItem key={key} value={key}>{config.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Notes (Optional)"
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
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Approval Flow Dialog */}
      <Dialog open={approvalDialog} onClose={() => setApprovalDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {approvalFlow.length > 0 ? 'Update Approval Flow' : 'Set Approval Flow'}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <Typography variant="body2" color="textSecondary">
              Select up to 4 managers who need to approve this incident report.
            </Typography>
            <FormControl fullWidth>
              <InputLabel>Select Managers</InputLabel>
              <Select
                multiple
                value={selectedManagers.length > 0 ? selectedManagers : approvalFlow}
                onChange={(e) => setSelectedManagers(e.target.value)}
                label="Select Managers"
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
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApprovalDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSetApprovalFlow}
            disabled={selectedManagers.length === 0 || updating}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* History Dialog */}
      <Dialog
        open={historyDialog}
        onClose={() => setHistoryDialog(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 2, maxHeight: '80vh' } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5e7eb', pb: 2 }}>
          <Box display="flex" alignItems="center" gap={1}>
            <HistoryIcon sx={{ color: '#6366f1' }} />
            <Typography variant="h6" fontWeight="bold">Status History</Typography>
          </Box>
          <IconButton onClick={() => setHistoryDialog(false)} size="small">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {renderHistoryContent()}
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default IncidentDetail;