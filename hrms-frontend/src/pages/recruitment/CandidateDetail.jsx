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
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationOnIcon,
  Description as DescriptionIcon,
  Download as DownloadIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

const STATUS_CONFIG = {
  new: { label: 'New', color: 'info' },
  screening: { label: 'Screening', color: 'primary' },
  interview: { label: 'Interview', color: 'warning' },
  technical_test: { label: 'Technical Test', color: 'secondary' },
  hr_interview: { label: 'HR Interview', color: 'info' },
  offer: { label: 'Offer', color: 'success' },
  hired: { label: 'Hired', color: 'success' },
  rejected: { label: 'Rejected', color: 'error' },
  withdrawn: { label: 'Withdrawn', color: 'default' },
};

const CandidateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [candidate, setCandidate] = useState(null);

  useEffect(() => {
    fetchCandidate();
  }, [id]);

  const fetchCandidate = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/candidates/${id}`);
      if (response.data?.status === 'success') {
        setCandidate(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch candidate');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this candidate?')) {
      try {
        await api.delete(`/candidates/${id}`);
        navigate('/candidates');
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete candidate');
      }
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !candidate) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Candidate not found'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/candidates')}>
          Back to Candidates
        </Button>
      </Box>
    );
  }

  const status = STATUS_CONFIG[candidate.status] || { label: candidate.status, color: 'default' };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/candidates')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Candidate Details
          </Typography>
        </Box>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => navigate(`/candidates/${id}/edit`)}
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
            <Stack direction="row" spacing={3} alignItems="center" mb={3}>
              <Avatar sx={{ width: 80, height: 80, bgcolor: '#ec4899', fontSize: 32 }}>
                {candidate.first_name?.[0]}{candidate.last_name?.[0]}
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {candidate.first_name} {candidate.last_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {candidate.position_applied || 'No position specified'}
                </Typography>
                <Chip
                  label={status.label}
                  color={status.color}
                  size="small"
                  sx={{ mt: 1 }}
                />
              </Box>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">Email</Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <EmailIcon fontSize="small" color="action" />
                  <Typography>{candidate.email}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">Phone</Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <PhoneIcon fontSize="small" color="action" />
                  <Typography>{candidate.phone || '-'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">Location</Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <LocationOnIcon fontSize="small" color="action" />
                  <Typography>{candidate.location || '-'}</Typography>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">Applied Date</Typography>
                <Typography>{formatDate(candidate.created_at)}</Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">Years of Experience</Typography>
                <Typography>{candidate.experience_years || '-'} years</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">Expected Salary</Typography>
                <Typography>
                  {candidate.expected_salary ? `$${candidate.expected_salary}` : '-'}
                </Typography>
              </Grid>
            </Grid>

            {candidate.notes && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="textSecondary">Notes</Typography>
                <Typography variant="body2">{candidate.notes}</Typography>
              </>
            )}
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* CV Card */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                📄 CV / Resume
              </Typography>
              {candidate.cv_url ? (
                <Stack spacing={2}>
                  <Box display="flex" alignItems="center" gap={1}>
                    <DescriptionIcon color="primary" />
                    <Typography variant="body2" noWrap>
                      {candidate.cv_file_name || 'CV.pdf'}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<DescriptionIcon />}
                      fullWidth
                      onClick={() => window.open(candidate.cv_url, '_blank')}
                    >
                      View
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<DownloadIcon />}
                      fullWidth
                      href={candidate.cv_url}
                      download
                    >
                      Download
                    </Button>
                  </Stack>
                </Stack>
              ) : (
                <Typography color="textSecondary">No CV uploaded</Typography>
              )}
            </CardContent>
          </Card>

          {/* Status Update Card */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Update Status
              </Typography>
              <Grid container spacing={1}>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <Grid item xs={6} key={key}>
                    <Button
                      variant={candidate.status === key ? 'contained' : 'outlined'}
                      color={config.color}
                      size="small"
                      fullWidth
                      onClick={async () => {
                        try {
                          await api.put(`/candidates/${id}`, { status: key });
                          fetchCandidate();
                        } catch (err) {
                          alert('Failed to update status');
                        }
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

export default CandidateDetail;