import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  Typography,
  IconButton,
  Chip,
  Avatar,
  Stack,
  Alert,
  CircularProgress,
  Tooltip,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Visibility as VisibilityIcon,
  Description as DescriptionIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  PictureAsPdf as PdfIcon,
  InsertDriveFile as FileIcon,
} from '@mui/icons-material';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

const CandidateCVList = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/candidates', {
        params: { has_cv: true, per_page: 50 }
      });
      
      if (response.data?.status === 'success') {
        setCandidates(response.data.data.data || []);
      }
    } catch (err) {
      console.error('Error fetching candidates:', err);
      setError(err.response?.data?.message || 'Failed to fetch candidates');
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = candidates.filter(c => {
    const search = searchTerm.toLowerCase();
    return (
      c.first_name?.toLowerCase().includes(search) ||
      c.last_name?.toLowerCase().includes(search) ||
      c.email?.toLowerCase().includes(search) ||
      c.position_applied?.toLowerCase().includes(search)
    );
  });

  const getFileIcon = (fileType) => {
    if (fileType?.includes('pdf')) return <PdfIcon color="error" />;
    return <FileIcon color="primary" />;
  };

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" component="h1" fontWeight="bold">
            📄 Candidate CVs
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Manage and view candidate resumes and CVs
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={fetchCandidates}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Search */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by name, email, position..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            endAdornment: searchTerm && (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearchTerm('')}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* CV Grid */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      ) : filteredCandidates.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <DescriptionIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
          <Typography color="textSecondary">
            {searchTerm ? 'No CVs match your search' : 'No CVs uploaded yet'}
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredCandidates.map((candidate) => (
            <Grid item xs={12} sm={6} md={4} key={candidate.id}>
              <Card sx={{ height: '100%', '&:hover': { boxShadow: 4 } }}>
                <CardContent>
                  <Stack spacing={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar sx={{ bgcolor: '#ec4899', width: 48, height: 48 }}>
                        {candidate.first_name?.[0]}{candidate.last_name?.[0]}
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {candidate.first_name} {candidate.last_name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {candidate.position_applied || 'No position'}
                        </Typography>
                      </Box>
                    </Box>

                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        Email: {candidate.email}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        Applied: {formatDate(candidate.created_at)}
                      </Typography>
                    </Box>

                    <Box display="flex" alignItems="center" gap={1}>
                      {getFileIcon(candidate.cv_file_type)}
                      <Typography variant="body2" noWrap flex={1}>
                        {candidate.cv_file_name || 'CV.pdf'}
                      </Typography>
                      <Chip
                        label={candidate.cv_file_size ? `${(candidate.cv_file_size / 1024).toFixed(1)} KB` : '-'}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    <Stack direction="row" spacing={1}>
                      <Tooltip title="View CV">
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => {
                            setSelectedCandidate(candidate);
                            setPreviewOpen(true);
                          }}
                          fullWidth
                        >
                          View
                        </Button>
                      </Tooltip>
                      <Tooltip title="Download CV">
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<DownloadIcon />}
                          href={candidate.cv_url}
                          download
                          fullWidth
                        >
                          Download
                        </Button>
                      </Tooltip>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          CV - {selectedCandidate?.first_name} {selectedCandidate?.last_name}
          <IconButton
            onClick={() => setPreviewOpen(false)}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <ClearIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {selectedCandidate?.cv_url ? (
            <Box sx={{ height: 500, width: '100%' }}>
              <iframe
                src={selectedCandidate.cv_url}
                title="CV Preview"
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </Box>
          ) : (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <DescriptionIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
              <Typography color="textSecondary">No CV available</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selectedCandidate?.cv_url && (
            <Button
              startIcon={<DownloadIcon />}
              href={selectedCandidate.cv_url}
              download
              variant="contained"
            >
              Download CV
            </Button>
          )}
          <Button onClick={() => setPreviewOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CandidateCVList;