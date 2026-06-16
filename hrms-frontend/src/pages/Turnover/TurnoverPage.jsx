import React, { useState, useEffect } from 'react';
import {
  Box, Button, Typography, Grid, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, Chip,
  MenuItem, TextField, Stack, Alert, Skeleton, Card, CardContent
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PeopleIcon from '@mui/icons-material/People';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import PercentIcon from '@mui/icons-material/Percent';
import turnoverService from '../../services/turnoverService';

// ==========================================
// STAT CARD COMPONENT
// ==========================================
function StatCard({ icon, title, value, subtitle, color, bgColor }) {
  return (
    <Card sx={{ height: '100%', borderRadius: 2 }}>
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="body2" color="textSecondary">{title}</Typography>
            <Typography variant="h4" fontWeight="bold" sx={{ my: 1 }}>{value}</Typography>
            <Typography variant="caption" color="textSecondary">{subtitle}</Typography>
          </Box>
          <Box sx={{ 
            backgroundColor: bgColor || `${color}20`, 
            borderRadius: '50%', 
            width: 56, 
            height: 56, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            {icon}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

// ==========================================
// MAIN PAGE
// ==========================================
function TurnoverPage() {
  const currentYear = new Date().getFullYear();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Filters
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  
  // Data
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({
    total_employees: 0,
    resigned_count: 0,
    turnover_rate: 0,
    previous_rate: 0,
    active_employees: 0,
  });
  const [resignedEmployees, setResignedEmployees] = useState([]);
  const [byDepartment, setByDepartment] = useState([]);
  const [byMonth, setByMonth] = useState([]);

  useEffect(() => {
    loadAllData();
  }, [selectedYear, selectedDepartment]);

  const loadAllData = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        year: selectedYear,
        department_id: selectedDepartment !== 'all' ? selectedDepartment : undefined,
      };

      const [deptData, statsData, resignedData, deptTurnover, monthTurnover] = await Promise.all([
        turnoverService.getDepartments(),
        turnoverService.getTurnoverStats(params),
        turnoverService.getResignedEmployees(params),
        turnoverService.getTurnoverByDepartment(selectedYear),
        turnoverService.getTurnoverByMonth(selectedYear),
      ]);

      setDepartments(deptData || []);
      setStats(statsData || {});
      setResignedEmployees(resignedData || []);
      setByDepartment(deptTurnover || []);
      setByMonth(monthTurnover || []);
    } catch (err) {
      setError('Failed to load turnover data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = () => {
    if (stats.turnover_rate < stats.previous_rate) {
      return <TrendingDownIcon sx={{ color: '#4caf50' }} />;
    }
    return <TrendingUpIcon sx={{ color: '#f44336' }} />;
  };

  const getTrendText = () => {
    const diff = stats.turnover_rate - stats.previous_rate;
    if (diff < 0) return `${Math.abs(diff).toFixed(1)}% lower than last year`;
    if (diff > 0) return `${diff.toFixed(1)}% higher than last year`;
    return 'Same as last year';
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', month: 'short', day: 'numeric' 
    });
  };

  const getRateColor = (rate) => {
    if (rate <= 5) return '#4caf50';
    if (rate <= 10) return '#ff9800';
    return '#f44336';
  };

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="text" width={300} height={60} />
        <Grid container spacing={3} sx={{ mt: 1 }}>
          {[1,2,3,4].map(i => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Skeleton variant="rounded" height={140} />
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* HEADER */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            📊 Employee Turnover Report
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
            Analyze employee resignation and turnover rates
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            select
            size="small"
            label="Year"
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            sx={{ width: 120 }}
          >
            {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map(y => (
              <MenuItem key={y} value={y}>{y}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Department"
            value={selectedDepartment}
            onChange={e => setSelectedDepartment(e.target.value)}
            sx={{ width: 180 }}
          >
            <MenuItem value="all">All Departments</MenuItem>
            {departments.map(dept => (
              <MenuItem key={dept.id} value={dept.id}>{dept.name}</MenuItem>
            ))}
          </TextField>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={loadAllData}>
            Refresh
          </Button>
        </Stack>
      </Box>

      {/* MESSAGES */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      {/* STATS CARDS */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PeopleIcon sx={{ color: '#1976d2', fontSize: 28 }} />}
            title="Total Employees"
            value={stats.total_employees || 0}
            subtitle="At start of period"
            color="#1976d2"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PersonOffIcon sx={{ color: '#f44336', fontSize: 28 }} />}
            title="Resigned"
            value={stats.resigned_count || 0}
            subtitle={`In ${selectedYear}`}
            color="#f44336"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={<PercentIcon sx={{ color: '#ff9800', fontSize: 28 }} />}
            title="Turnover Rate"
            value={`${stats.turnover_rate || 0}%`}
            subtitle={getTrendText()}
            color="#ff9800"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            icon={getTrendIcon()}
            title="Active Employees"
            value={stats.active_employees || 0}
            subtitle="Currently active"
            color={stats.turnover_rate < stats.previous_rate ? '#4caf50' : '#f44336'}
          />
        </Grid>
      </Grid>

      {/* TURNOVER BY DEPARTMENT */}
      <Typography variant="h6" sx={{ mb: 2 }}>📈 Turnover Rate by Department</Typography>
      <TableContainer component={Paper} sx={{ mb: 4, borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell><strong>Department</strong></TableCell>
              <TableCell align="center"><strong>Total Employees</strong></TableCell>
              <TableCell align="center"><strong>Resigned</strong></TableCell>
              <TableCell align="center"><strong>Turnover Rate</strong></TableCell>
              <TableCell><strong>Rate Bar</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {byDepartment.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  No data available
                </TableCell>
              </TableRow>
            ) : byDepartment.map((dept, index) => (
              <TableRow key={index} hover>
                <TableCell><strong>{dept.name || dept.department_name}</strong></TableCell>
                <TableCell align="center">{dept.total_employees || 0}</TableCell>
                <TableCell align="center">{dept.resigned_count || 0}</TableCell>
                <TableCell align="center">
                  <Chip 
                    label={`${dept.turnover_rate || 0}%`}
                    size="small"
                    sx={{ 
                      bgcolor: `${getRateColor(dept.turnover_rate)}20`,
                      color: getRateColor(dept.turnover_rate),
                      fontWeight: 'bold'
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ 
                      flex: 1, 
                      height: 8, 
                      borderRadius: 4, 
                      bgcolor: '#e0e0e0',
                      overflow: 'hidden'
                    }}>
                      <Box sx={{ 
                        width: `${Math.min(dept.turnover_rate || 0, 100)}%`,
                        height: '100%',
                        bgcolor: getRateColor(dept.turnover_rate),
                        borderRadius: 4,
                        transition: 'width 0.5s ease'
                      }} />
                    </Box>
                    <Typography variant="caption">{dept.turnover_rate || 0}%</Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* MONTHLY TREND */}
      <Typography variant="h6" sx={{ mb: 2 }}>📅 Monthly Turnover Trend ({selectedYear})</Typography>
      <Paper sx={{ p: 3, mb: 4, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1, height: 200 }}>
          {months.map((month, index) => {
            const data = byMonth.find(m => m.month == (index + 1));
            const count = data?.resigned_count || 0;
            const maxCount = Math.max(...byMonth.map(m => m.resigned_count || 0), 1);
            const height = (count / maxCount) * 150;
            
            return (
              <Box key={month} sx={{ flex: 1, textAlign: 'center' }}>
                <Typography variant="caption" fontWeight="bold">
                  {count}
                </Typography>
                <Box sx={{ 
                  height: height || 4, 
                  bgcolor: count > 3 ? '#f44336' : count > 1 ? '#ff9800' : '#4caf50',
                  borderRadius: '4px 4px 0 0',
                  mx: '2px',
                  transition: 'height 0.3s ease',
                  minWidth: 20
                }} />
                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                  {month}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Paper>

      {/* RESIGNED EMPLOYEES TABLE */}
      <Typography variant="h6" sx={{ mb: 2 }}>👋 Resigned Employees ({resignedEmployees.length})</Typography>
      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: '#f5f5f5' }}>
              <TableCell><strong>Employee</strong></TableCell>
              <TableCell><strong>Department</strong></TableCell>
              <TableCell><strong>Position</strong></TableCell>
              <TableCell><strong>Join Date</strong></TableCell>
              <TableCell><strong>Resign Date</strong></TableCell>
              <TableCell><strong>Duration</strong></TableCell>
              <TableCell><strong>Reason</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {resignedEmployees.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="textSecondary">No resigned employees found</Typography>
                </TableCell>
              </TableRow>
            ) : resignedEmployees.map((emp, index) => (
              <TableRow key={emp.id || index} hover>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{ 
                      width: 36, height: 36, 
                      borderRadius: '50%', 
                      bgcolor: '#f4433620',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#f44336',
                      fontWeight: 'bold',
                      fontSize: 14
                    }}>
                      {emp.employee_name?.charAt(0) || '?'}
                    </Box>
                    <Box>
                      <Typography fontWeight="bold">{emp.employee_name}</Typography>
                      <Typography variant="caption" color="textSecondary">{emp.employee_id || emp.nik}</Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>{emp.department_name || '-'}</TableCell>
                <TableCell>{emp.position_title || '-'}</TableCell>
                <TableCell>{formatDate(emp.join_date || emp.hire_date)}</TableCell>
                <TableCell>{formatDate(emp.resign_date || emp.resignation_date)}</TableCell>
                <TableCell>{emp.duration || '-'}</TableCell>
                <TableCell>
                  <Chip 
                    label={emp.reason || 'Not specified'} 
                    size="small" 
                    variant="outlined"
                    sx={{ maxWidth: 200 }}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

export default TurnoverPage;