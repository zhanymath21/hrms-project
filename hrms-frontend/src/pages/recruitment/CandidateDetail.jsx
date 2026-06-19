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
  History as HistoryIcon, // 🔥 TAMBAHKAN
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';
import CandidateHistory from './CandidateHistory'; // 🔥 IMPORT

// 🔥 STATUS CONFIG - Warna Hardcoded (Tanpa Theme)
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

const CandidateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [candidate, setCandidate] = useState(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // 🔥 TAMBAHKAN: State untuk history dialog
  const [historyDialog, setHistoryDialog] = useState({
    open: false,
    candidateId: null,
    candidateName: '',
  });

  useEffect(() => {
    fetchCandidate();
  }, [id]);

  const fetchCandidate = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/candidates/${id}`);

      if (response.data?.status === 'success') {
        setCandidate(response.data.data);
      } else {
        setError('Candidate not found');
      }
    } catch (err) {
      console.error('Error fetching candidate:', err);
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

  // 🔥 PERBAIKAN: handleStatusUpdate dengan notes
  const handleStatusUpdate = async (status) => {
    const notes = window.prompt('Add note for this status change (optional):');

    try {
      setUpdatingStatus(true);
      await api.put(`/candidates/${id}/status`, {
        status,
        notes: notes || '',
      });
      await fetchCandidate();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  // 🔥 Status Chip dengan warna hardcoded
  const renderStatusChip = (status) => {
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
          mt: 1,
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

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/candidates')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Candidate Details
          </Typography>
        </Box>

        {/* 🔥 TAMBAHKAN: Tombol History di Header */}
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<HistoryIcon />}
            onClick={() =>
              setHistoryDialog({
                open: true,
                candidateId: candidate.id,
                candidateName: `${candidate.first_name} ${candidate.last_name}`,
              })
            }
            sx={{ color: '#6366f1', borderColor: '#6366f1' }}
          >
            History
          </Button>
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
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={3}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              mb={3}
            >
              <Avatar sx={{ width: 80, height: 80, bgcolor: '#ec4899', fontSize: 32 }}>
                {candidate.first_name?.[0]}
                {candidate.last_name?.[0]}
              </Avatar>
              <Box>
                <Typography variant="h5" fontWeight="bold">
                  {candidate.first_name} {candidate.last_name}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {candidate.position_applied || 'No position specified'}
                </Typography>
                {renderStatusChip(candidate.status)}
              </Box>
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
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
                  Applied Date
                </Typography>
                <Typography>
                  {formatDate(candidate.created_at, 'dd/MM/yyyy HH:mm')}
                </Typography>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">
                  Years of Experience
                </Typography>
                <Typography>{candidate.experience_years || '-'} years</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">
                  Expected Salary
                </Typography>
                <Typography>
                  {candidate.expected_salary ? `$${candidate.expected_salary}` : '-'}
                </Typography>
              </Grid>
            </Grid>

            {candidate.notes && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="caption" color="textSecondary">
                  Notes
                </Typography>
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
              {candidate.cv_url || candidate.cv_file_path ? (
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
                      onClick={() => {
                        const url =
                          candidate.cv_url || `/storage/${candidate.cv_file_path}`;
                        window.open(url, '_blank');
                      }}
                    >
                      View
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<DownloadIcon />}
                      fullWidth
                      href={candidate.cv_url || `/storage/${candidate.cv_file_path}`}
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
              {updatingStatus && (
                <Box display="flex" justifyContent="center" my={1}>
                  <CircularProgress size={24} />
                </Box>
              )}
              <Grid container spacing={1}>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <Grid item xs={6} key={key}>
                    <Button
                      variant={candidate.status === key ? 'contained' : 'outlined'}
                      size="small"
                      fullWidth
                      onClick={() => handleStatusUpdate(key)}
                      disabled={updatingStatus || candidate.status === key}
                      sx={{
                        textTransform: 'capitalize',
                        fontSize: '0.65rem',
                        backgroundColor:
                          candidate.status === key ? config.bgColor : 'transparent',
                        borderColor: config.bgColor,
                        color: candidate.status === key ? '#ffffff' : config.bgColor,
                        '&:hover': {
                          backgroundColor:
                            candidate.status === key
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

      {/* 🔥 TAMBAHKAN: History Dialog */}
      <CandidateHistory
        open={historyDialog.open}
        onClose={() =>
          setHistoryDialog({ open: false, candidateId: null, candidateName: '' })
        }
        candidateId={historyDialog.candidateId}
        candidateName={historyDialog.candidateName}
      />
    </Box>
  );
};

export default CandidateDetail;