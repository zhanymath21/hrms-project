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
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationOnIcon,
  Work as WorkIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  CalendarToday as CalendarIcon,
  Description as DescriptionIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  History as HistoryIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

// Status Configuration
const STATUS_CONFIG = {
  new: { label: 'New', bgColor: '#3b82f6', textColor: '#ffffff', icon: <PendingIcon /> },
  screening: { label: 'Screening', bgColor: '#6366f1', textColor: '#ffffff', icon: <PendingIcon /> },
  interview: { label: 'Interview', bgColor: '#f59e0b', textColor: '#ffffff', icon: <PendingIcon /> },
  technical_test: { label: 'Technical Test', bgColor: '#8b5cf6', textColor: '#ffffff', icon: <PendingIcon /> },
  hr_interview: { label: 'HR Interview', bgColor: '#3b82f6', textColor: '#ffffff', icon: <PendingIcon /> },
  offer: { label: 'Offer', bgColor: '#10b981', textColor: '#ffffff', icon: <CheckCircleIcon /> },
  hired: { label: 'Hired', bgColor: '#10b981', textColor: '#ffffff', icon: <CheckCircleIcon /> },
  rejected: { label: 'Rejected', bgColor: '#ef4444', textColor: '#ffffff', icon: <CancelIcon /> },
  withdrawn: { label: 'Withdrawn', bgColor: '#6b7280', textColor: '#ffffff', icon: <CancelIcon /> },
};

const ApplicationDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [application, setApplication] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    fetchApplication();
  }, [id]);

  const fetchApplication = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/applications/${id}`);

      if (response.data?.status === 'success') {
        setApplication(response.data.data);
      } else {
        setError('Application not found');
      }
    } catch (err) {
      console.error('Error fetching application:', err);
      setError(err.response?.data?.message || 'Failed to fetch application');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this application?')) {
      try {
        await api.delete(`/applications/${id}`);
        navigate('/applications');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete application');
      }
    }
  };

  const handleStatusUpdate = async (status) => {
    const notes = window.prompt('Add note for this status change (optional):');

    try {
      setUpdatingStatus(true);
      await api.put(`/applications/${id}/status`, {
        status,
        notes: notes || '',
      });
      await fetchApplication();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const renderStatusChip = (status) => {
    const config = STATUS_CONFIG[status];
    if (!config) {
      return <Chip label={status || 'Unknown'} size="small" />;
    }
    return (
      <Chip
        label={config.label}
        size="medium"
        icon={config.icon}
        sx={{
          backgroundColor: config.bgColor,
          color: config.textColor,
          fontWeight: 600,
          '& .MuiChip-icon': {
            color: config.textColor,
          },
          '&:hover': { opacity: 0.8 },
        }}
      />
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !application) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Application not found'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/applications')}>
          Back to Applications
        </Button>
      </Box>
    );
  }

  const candidate = application.candidate || {};
  const vacancy = application.vacancy || {};

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/applications')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Application Details
          </Typography>
          {renderStatusChip(application.status)}
        </Box>

        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/applications/${id}/edit`)}
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
        {/* Main Info */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Application Information
            </Typography>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              {/* Application ID & Date */}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">
                  Application ID
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  #{application.id}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">
                  Applied Date
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDate(application.created_at, 'dd/MM/yyyy HH:mm')}
                </Typography>
              </Grid>

              {/* Interview Date */}
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">
                  Interview Date
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {application.interview_date ? 
                    formatDate(application.interview_date, 'dd/MM/yyyy HH:mm') : 
                    'Not scheduled'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">
                  Last Updated
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDate(application.updated_at, 'dd/MM/yyyy HH:mm')}
                </Typography>
              </Grid>
            </Grid>

            {application.notes && (
              <>
                <Divider sx={{ my: 3 }} />
                <Typography variant="caption" color="textSecondary">
                  Notes
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {application.notes}
                </Typography>
              </>
            )}
          </Paper>

          {/* Candidate Info */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box display="flex" alignItems="center" gap={2} mb={2}>
              <PersonIcon color="primary" />
              <Typography variant="h6" fontWeight="bold">
                Candidate Information
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ width: 64, height: 64, bgcolor: '#6366f1' }}>
                    {candidate.first_name?.[0]}{candidate.last_name?.[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {candidate.first_name} {candidate.last_name}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {candidate.position_applied || 'No position specified'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">
                  Email
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <EmailIcon fontSize="small" color="action" />
                  <Typography>{candidate.email || '-'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">
                  Phone
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <PhoneIcon fontSize="small" color="action" />
                  <Typography>{candidate.phone || '-'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">
                  Location
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <LocationOnIcon fontSize="small" color="action" />
                  <Typography>{candidate.location || '-'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">
                  Experience
                </Typography>
                <Typography>
                  {candidate.experience_years || 0} years
                </Typography>
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PersonIcon />}
                  onClick={() => navigate(`/candidates/${candidate.id}`)}
                >
                  View Candidate Profile
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Vacancy Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <WorkIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">
                  Vacancy Details
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Position
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {vacancy.title || 'N/A'}
                  </Typography>
                </Box>
                
                {vacancy.department && (
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Department
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <BusinessIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {vacancy.department.name}
                      </Typography>
                    </Box>
                  </Box>
                )}
                
                {vacancy.location && (
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Location
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <LocationOnIcon fontSize="small" color="action" />
                      <Typography variant="body2">
                        {vacancy.location}
                      </Typography>
                    </Box>
                  </Box>
                )}
                
                {vacancy.status && (
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Vacancy Status
                    </Typography>
                    <Chip 
                      label={vacancy.status}
                      size="small"
                      color={vacancy.status === 'open' ? 'success' : 'default'}
                      sx={{ mt: 0.5 }}
                    />
                  </Box>
                )}
                
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<WorkIcon />}
                  onClick={() => navigate(`/vacancies/${vacancy.id}`)}
                >
                  View Vacancy
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {/* Status Update Card */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Update Status
              </Typography>
              {updatingStatus && (
                <Box display="flex" justifyContent="center" my={1}>
                  <CircularProgress size={24} />
                </Box>
              )}
              <Grid container spacing={1}>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <Grid item xs={6} key={key}>
                    <Button
                      variant={application.status === key ? 'contained' : 'outlined'}
                      size="small"
                      fullWidth
                      onClick={() => handleStatusUpdate(key)}
                      disabled={updatingStatus || application.status === key}
                      sx={{
                        textTransform: 'capitalize',
                        fontSize: '0.65rem',
                        backgroundColor:
                          application.status === key ? config.bgColor : 'transparent',
                        borderColor: config.bgColor,
                        color: application.status === key ? '#ffffff' : config.bgColor,
                        '&:hover': {
                          backgroundColor:
                            application.status === key
                              ? config.bgColor
                              : `${config.bgColor}20`,
                          borderColor: config.bgColor,
                        },
                      }}
                    >
                      {config.label}
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ApplicationDetail;