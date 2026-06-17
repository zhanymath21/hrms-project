// src/pages/employees/EmployeeDetails.jsx
import React, { useState, useEffect } from 'react';
import { useEmployee } from '../contexts/EmployeeContext';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  Chip,
  Avatar,
  Stack,
  Divider,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Work as WorkIcon,
  Badge as BadgeIcon,
  AttachMoney as AttachMoneyIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { formatDate } from '../../utils/dateFormat';

const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getEmployeeById, loading } = useEmployee();
  const [employee, setEmployee] = useState(null);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchEmployee();
    }
  }, [id]);

  const fetchEmployee = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching employee with ID:', id);
      const data = await getEmployeeById(parseInt(id));
      console.log('Employee data received:', data);
      
      if (data && data.id) {
        setEmployee(data);
      } else {
        setError('Employee not found');
      }
    } catch (err) {
      console.error('Error in fetchEmployee:', err);
      setError(err.message || 'Failed to load employee details');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle loading state
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  // Handle error state
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/employees')}>
              Back to List
            </Button>
          }
        >
          {error}
        </Alert>
      </Container>
    );
  }

  // Handle no employee
  if (!employee) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert 
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={() => navigate('/employees')}>
              Back to List
            </Button>
          }
        >
          Employee not found. The employee may have been deleted or you don't have access.
        </Alert>
      </Container>
    );
  }

  const InfoRow = ({ label, value, icon: Icon }) => (
    <Box sx={{ mb: 2 }}>
      <Typography variant="caption" color="textSecondary" gutterBottom display="flex" alignItems="center" gap={0.5}>
        {Icon && <Icon sx={{ fontSize: 14 }} />}
        {label}
      </Typography>
      <Typography variant="body1">{value || '-'}</Typography>
    </Box>
  );

  const SectionCard = ({ title, children }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
          {title}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        {children}
      </CardContent>
    </Card>
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return 'success';
      case 'inactive': return 'default';
      case 'suspended': return 'warning';
      case 'terminated': return 'error';
      default: return 'default';
    }
  };

  const getEmploymentTypeLabel = (type) => {
    const types = {
      full_time: 'Full Time',
      part_time: 'Part Time',
      contract: 'Contract',
      intern: 'Intern',
    };
    return types[type] || type;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/employees')}
          variant="outlined"
        >
          Back to Employees
        </Button>
        <Button
          startIcon={<EditIcon />}
          onClick={() => navigate(`/employees/${employee.id}/edit`)}
          variant="contained"
          color="primary"
        >
          Edit Employee
        </Button>
      </Box>

      {/* Profile Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={3} alignItems="center" flexWrap="wrap">
          <Avatar
            sx={{ width: 100, height: 100, bgcolor: 'primary.main', fontSize: 40 }}
          >
            {employee.first_name?.[0]}{employee.last_name?.[0]}
          </Avatar>
          <Box flex={1}>
            <Typography variant="h4" fontWeight="bold">
              {employee.first_name} {employee.last_name}
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 1 }}>
              <Chip
                label={employee.employee_id}
                variant="outlined"
                size="small"
              />
              <Chip
                label={employee.status?.toUpperCase()}
                color={getStatusColor(employee.status)}
                size="small"
              />
              <Chip
                label={getEmploymentTypeLabel(employee.employment_type)}
                variant="outlined"
                size="small"
              />
            </Stack>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Box display="flex" alignItems="center" gap={0.5}>
                <EmailIcon fontSize="small" color="action" />
                <Typography variant="body2">{employee.email}</Typography>
              </Box>
              {employee.phone && (
                <Box display="flex" alignItems="center" gap={0.5}>
                  <PhoneIcon fontSize="small" color="action" />
                  <Typography variant="body2">{employee.phone}</Typography>
                </Box>
              )}
            </Stack>
          </Box>
        </Stack>
      </Paper>

      {/* Details Grid */}
      <Grid container spacing={3}>
        {/* Personal Information */}
        <Grid item xs={12} md={6}>
          <SectionCard title="Personal Information">
            <InfoRow label="Full Name" value={`${employee.first_name} ${employee.last_name}`} icon={PeopleIcon} />
            <InfoRow label="Employee ID" value={employee.employee_id} icon={BadgeIcon} />
            <InfoRow label="Email" value={employee.email} icon={EmailIcon} />
            <InfoRow label="Phone" value={employee.phone} icon={PhoneIcon} />
            <InfoRow label="National ID" value={employee.national_id} icon={BadgeIcon} />
          </SectionCard>
        </Grid>

        {/* Employment Information */}
        <Grid item xs={12} md={6}>
          <SectionCard title="Employment Information">
            <InfoRow label="Department" value={employee.department?.name || `ID: ${employee.department_id}`} icon={WorkIcon} />
            <InfoRow label="Position" value={employee.position?.title || `ID: ${employee.position_id}`} icon={WorkIcon} />
            <InfoRow label="Employment Type" value={getEmploymentTypeLabel(employee.employment_type)} />
            <InfoRow label="Hire Date" value={formatDate(employee.hire_date)} />
            <InfoRow label="Salary" value={employee.salary ? `USD ${parseFloat(employee.salary).toLocaleString()}` : '-'} icon={AttachMoneyIcon} />
            <InfoRow label="Manager" value={employee.manager?.first_name ? `${employee.manager.first_name} ${employee.manager.last_name}` : `ID: ${employee.manager_id}`} />
          </SectionCard>
        </Grid>
      </Grid>
    </Container>
  );
};

export default EmployeeDetails;