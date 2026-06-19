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
  LinearProgress,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Person as PersonIcon,
  Work as WorkIcon,
  CalendarToday as CalendarIcon,
  CheckCircle as CheckCircleIcon,
  Pending as PendingIcon,
  Cancel as CancelIcon,
  History as HistoryIcon,
  Close as CloseIcon,
  Add as AddIcon,
  DeleteOutline as DeleteOutlineIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/axios';
import { formatDate } from '../../utils/dateFormat';

// Status Configuration
const STATUS_CONFIG = {
  pending: { label: 'Pending', bgColor: '#f59e0b', textColor: '#ffffff', icon: <PendingIcon /> },
  in_progress: { label: 'In Progress', bgColor: '#3b82f6', textColor: '#ffffff', icon: <PendingIcon /> },
  completed: { label: 'Completed', bgColor: '#10b981', textColor: '#ffffff', icon: <CheckCircleIcon /> },
  cancelled: { label: 'Cancelled', bgColor: '#ef4444', textColor: '#ffffff', icon: <CancelIcon /> },
  on_hold: { label: 'On Hold', bgColor: '#8b5cf6', textColor: '#ffffff', icon: <PendingIcon /> },
};

const OnboardingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [updating, setUpdating] = useState(false);
  
  // History Dialog
  const [historyDialog, setHistoryDialog] = useState(false);
  const [statusHistory, setStatusHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Task Dialog
  const [taskDialog, setTaskDialog] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [editingTaskIndex, setEditingTaskIndex] = useState(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');

  useEffect(() => {
    fetchOnboarding();
  }, [id]);

  const fetchOnboarding = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/onboarding/${id}`);

      if (response.data?.status === 'success') {
        setOnboarding(response.data.data);
      } else {
        setError('Onboarding record not found');
      }
    } catch (err) {
      console.error('Error fetching onboarding:', err);
      setError(err.response?.data?.message || 'Failed to fetch onboarding');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatusHistory = async () => {
    try {
      setLoadingHistory(true);
      const response = await api.get(`/onboarding/${id}/history`);
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
    if (!window.confirm('Are you sure you want to delete this onboarding record?')) return;
    
    try {
      await api.delete(`/onboarding/${id}`);
      navigate('/onboarding');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleStatusUpdate = async (status) => {
    const notes = window.prompt('Add note for this status change (optional):');

    try {
      setUpdating(true);
      await api.put(`/onboarding/${id}/status`, {
        status,
        notes: notes || '',
      });
      await fetchOnboarding();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleTask = async (index) => {
    if (onboarding.status === 'completed' || onboarding.status === 'cancelled') {
      alert('Cannot modify tasks for completed or cancelled onboarding');
      return;
    }

    try {
      setLoading(true);
      const response = await api.put(`/onboarding/${id}/tasks/${index}/toggle`);
      console.log('✅ Task toggled:', response.data);
      await fetchOnboarding();
    } catch (err) {
      console.error('Error toggling task:', err);
      alert('Failed to toggle task. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) {
      alert('Please enter a task description');
      return;
    }

    try {
      setLoading(true);
      const currentTasks = onboarding?.tasks || [];
      const updatedTasks = [...currentTasks, { title: newTask.trim(), completed: false }];
      
      await api.put(`/onboarding/${id}/tasks`, { tasks: updatedTasks });
      setNewTask('');
      setTaskDialog(false);
      await fetchOnboarding();
    } catch (err) {
      console.error('Error adding task:', err);
      alert('Failed to add task');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (index) => {
    if (!window.confirm('Delete this task?')) return;
    
    try {
      setLoading(true);
      const currentTasks = onboarding?.tasks || [];
      const updatedTasks = currentTasks.filter((_, i) => i !== index);
      
      await api.put(`/onboarding/${id}/tasks`, { tasks: updatedTasks });
      await fetchOnboarding();
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Failed to delete task');
    } finally {
      setLoading(false);
    }
  };

  const handleEditTask = async (index) => {
    if (!editingTaskTitle.trim()) {
      alert('Please enter a task description');
      return;
    }
    
    try {
      setLoading(true);
      const currentTasks = onboarding?.tasks || [];
      const updatedTasks = [...currentTasks];
      updatedTasks[index].title = editingTaskTitle.trim();
      
      await api.put(`/onboarding/${id}/tasks`, { tasks: updatedTasks });
      setEditingTaskIndex(null);
      setEditingTaskTitle('');
      await fetchOnboarding();
    } catch (err) {
      console.error('Error editing task:', err);
      alert('Failed to edit task');
    } finally {
      setLoading(false);
    }
  };

  const renderStatusChip = (status) => {
    const config = STATUS_CONFIG[status];
    if (!config) {
      return <Chip label={status || 'Unknown'} size="medium" />;
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
          <Typography color="textSecondary">No status history found</Typography>
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

              {item.old_progress !== undefined && item.new_progress !== undefined && (
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Typography variant="caption" color="textSecondary">
                    Progress: {item.old_progress || 0}% → {item.new_progress || 0}%
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

  if (error || !onboarding) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>{error || 'Onboarding record not found'}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/onboarding')}>
          Back to Onboarding
        </Button>
      </Box>
    );
  }

  const candidate = onboarding.candidate || {};
  const isDisabled = onboarding.status === 'completed' || onboarding.status === 'cancelled';

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Box display="flex" alignItems="center" gap={2}>
          <IconButton onClick={() => navigate('/onboarding')}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" component="h1" fontWeight="bold">
            Onboarding Details
          </Typography>
          {renderStatusChip(onboarding.status)}
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
            onClick={() => navigate(`/onboarding/${id}/edit`)}
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
          {/* Progress Card */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Progress
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2" color="textSecondary">
                  Overall Progress
                </Typography>
                <Typography variant="h5" fontWeight="bold" color="primary">
                  {onboarding.progress || 0}%
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={onboarding.progress || 0} 
                sx={{ height: 12, borderRadius: 6 }}
              />
            </Box>
          </Paper>

          {/* Tasks Card */}
          <Paper sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6" fontWeight="bold">
                Tasks ({onboarding?.tasks?.length || 0})
              </Typography>
              <span>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={() => setTaskDialog(true)}
                  disabled={isDisabled}
                >
                  Add Task
                </Button>
              </span>
            </Box>
            <Divider sx={{ mb: 2 }} />

            {(!onboarding.tasks || onboarding.tasks.length === 0) ? (
              <Box textAlign="center" py={3}>
                <Typography color="textSecondary">No tasks added yet</Typography>
              </Box>
            ) : (
              <List>
                {onboarding.tasks.map((task, index) => (
                  <ListItem
                    key={index}
                    dense
                    sx={{
                      borderBottom: '1px solid #f3f4f6',
                      '&:last-child': { borderBottom: 'none' },
                    }}
                  >
                    {editingTaskIndex === index ? (
                      <Box display="flex" gap={1} flex={1}>
                        <TextField
                          size="small"
                          fullWidth
                          value={editingTaskTitle}
                          onChange={(e) => setEditingTaskTitle(e.target.value)}
                          autoFocus
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              handleEditTask(index);
                            }
                          }}
                        />
                        <Button size="small" variant="contained" onClick={() => handleEditTask(index)}>
                          Save
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setEditingTaskIndex(null);
                            setEditingTaskTitle('');
                          }}
                        >
                          Cancel
                        </Button>
                      </Box>
                    ) : (
                      <>
                        <ListItemIcon>
                          <span>
                            <Checkbox
                              edge="start"
                              checked={task.completed || false}
                              onChange={() => handleToggleTask(index)}
                              disabled={isDisabled}
                            />
                          </span>
                        </ListItemIcon>
                        <ListItemText
                          primary={task.title}
                          sx={{
                            textDecoration: task.completed ? 'line-through' : 'none',
                            opacity: task.completed ? 0.6 : 1,
                          }}
                        />
                        <Box>
                          <Tooltip title="Edit Task">
                            <span>
                              <IconButton
                                size="small"
                                onClick={() => {
                                  setEditingTaskIndex(index);
                                  setEditingTaskTitle(task.title);
                                }}
                                disabled={isDisabled}
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Delete Task">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleDeleteTask(index)}
                                disabled={isDisabled}
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </Box>
                      </>
                    )}
                  </ListItem>
                ))}
              </List>
            )}
          </Paper>
        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Candidate Info */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box display="flex" alignItems="center" gap={1} mb={2}>
                <PersonIcon color="primary" />
                <Typography variant="subtitle1" fontWeight="bold">
                  Candidate
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Avatar sx={{ width: 48, height: 48, bgcolor: '#6366f1' }}>
                  {candidate.first_name?.[0]}{candidate.last_name?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="body1" fontWeight="medium">
                    {candidate.first_name} {candidate.last_name}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {candidate.email}
                  </Typography>
                </Box>
              </Box>

              <Stack spacing={1}>
                <Box display="flex" alignItems="center" gap={1}>
                  <EmailIcon fontSize="small" color="action" />
                  <Typography variant="body2">{candidate.email || '-'}</Typography>
                </Box>
                <Box display="flex" alignItems="center" gap={1}>
                  <PhoneIcon fontSize="small" color="action" />
                  <Typography variant="body2">{candidate.phone || '-'}</Typography>
                </Box>
              </Stack>

              <Button
                variant="outlined"
                size="small"
                fullWidth
                sx={{ mt: 2 }}
                onClick={() => navigate(`/candidates/${candidate.id}`)}
              >
                View Candidate Profile
              </Button>
            </CardContent>
          </Card>

          {/* Onboarding Details */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Onboarding Details
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Position
                  </Typography>
                  <Typography variant="body2" fontWeight="medium">
                    {onboarding.position_title || '-'}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Start Date
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(onboarding.start_date)}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Expected End Date
                  </Typography>
                  <Typography variant="body2">
                    {onboarding.expected_end_date ? formatDate(onboarding.expected_end_date) : '-'}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Actual End Date
                  </Typography>
                  <Typography variant="body2">
                    {onboarding.actual_end_date ? formatDate(onboarding.actual_end_date) : '-'}
                  </Typography>
                </Box>

                {onboarding.notes && (
                  <Box>
                    <Typography variant="caption" color="textSecondary">
                      Notes
                    </Typography>
                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                      {onboarding.notes}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>

          {/* Status Update Card */}
          <Card>
            <CardContent>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Update Status
              </Typography>
              {updating && (
                <Box display="flex" justifyContent="center" my={1}>
                  <CircularProgress size={24} />
                </Box>
              )}
              <Grid container spacing={1}>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <Grid item xs={6} key={key}>
                    <Button
                      variant={onboarding.status === key ? 'contained' : 'outlined'}
                      size="small"
                      fullWidth
                      onClick={() => handleStatusUpdate(key)}
                      disabled={updating || onboarding.status === key}
                      sx={{
                        textTransform: 'capitalize',
                        fontSize: '0.65rem',
                        backgroundColor:
                          onboarding.status === key ? config.bgColor : 'transparent',
                        borderColor: config.bgColor,
                        color: onboarding.status === key ? '#ffffff' : config.bgColor,
                        '&:hover': {
                          backgroundColor:
                            onboarding.status === key
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

      {/* Add Task Dialog */}
      <Dialog open={taskDialog} onClose={() => setTaskDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add New Task</DialogTitle>
        <DialogContent dividers>
          <TextField
            autoFocus
            fullWidth
            label="Task Description"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddTask();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTaskDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddTask} disabled={!newTask.trim()}>
            <SaveIcon sx={{ mr: 1 }} /> Add Task
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OnboardingDetail;