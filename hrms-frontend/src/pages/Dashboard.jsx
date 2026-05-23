// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  LinearProgress,
  useTheme,
  alpha,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Button,
  Tab,
  Tabs,
  Paper,
  Tooltip,
} from '@mui/material';
import {
  People,
  Work,
  EventNote,
  TrendingUp,
  TrendingDown,
  MoreVert,
  ArrowUpward,
  ArrowDownward,
  CheckCircle,
  Pending,
  Cancel,
  AttachMoney,
  Assignment,
  Schedule,
  BeachAccess,
  Sick,
  Favorite,
  Refresh,
  Download,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ChartTooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useNavigate } from 'react-router-dom';

const attendanceData = [
  { name: 'Mon', present: 85, absent: 15, late: 5 },
  { name: 'Tue', present: 88, absent: 12, late: 4 },
  { name: 'Wed', present: 92, absent: 8, late: 3 },
  { name: 'Thu', present: 90, absent: 10, late: 4 },
  { name: 'Fri', present: 86, absent: 14, late: 6 },
  { name: 'Sat', present: 45, absent: 55, late: 2 },
];

const departmentData = [
  { name: 'IT', employees: 45, color: '#6366f1' },
  { name: 'HR', employees: 28, color: '#10b981' },
  { name: 'Finance', employees: 32, color: '#f59e0b' },
  { name: 'Marketing', employees: 25, color: '#ef4444' },
  { name: 'Operations', employees: 38, color: '#8b5cf6' },
];

const leaveData = [
  { name: 'Annual Leave', value: 35, color: '#6366f1', icon: <BeachAccess /> },
  { name: 'Sick Leave', value: 18, color: '#10b981', icon: <Sick /> },
  { name: 'Special Leave', value: 12, color: '#f59e0b', icon: <Favorite /> },
  { name: 'Unpaid Leave', value: 8, color: '#ef4444', icon: <Cancel /> },
];

const recentActivities = [
  {
    id: 1,
    user: 'John Doe',
    action: 'requested leave',
    type: 'Annual Leave',
    days: 3,
    time: '2 hours ago',
    avatar: 'JD',
    status: 'pending',
  },
  {
    id: 2,
    user: 'Jane Smith',
    action: 'was hired',
    position: 'Software Engineer',
    time: '5 hours ago',
    avatar: 'JS',
    status: 'completed',
  },
  {
    id: 3,
    user: 'Mike Johnson',
    action: 'submitted timesheet',
    hours: 40,
    time: '1 day ago',
    avatar: 'MJ',
    status: 'completed',
  },
  {
    id: 4,
    user: 'Sarah Williams',
    action: 'completed training',
    training: 'Leadership Course',
    time: '2 days ago',
    avatar: 'SW',
    status: 'completed',
  },
];

const Dashboard = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [statsAnchor, setStatsAnchor] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Simulate loading data
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const statsCards = [
    { 
      title: 'Total Employees', 
      value: '156', 
      icon: <People />, 
      color: '#6366f1',
      bgColor: alpha('#6366f1', 0.1),
      trend: '+12%',
      trendUp: true,
      subtitle: 'vs last month',
    },
    { 
      title: 'Departments', 
      value: '8', 
      icon: <Work />, 
      color: '#10b981',
      bgColor: alpha('#10b981', 0.1),
      trend: '+2%',
      trendUp: true,
      subtitle: 'vs last month',
    },
    { 
      title: 'On Leave Today', 
      value: '12', 
      icon: <EventNote />, 
      color: '#f59e0b',
      bgColor: alpha('#f59e0b', 0.1),
      trend: '-5%',
      trendUp: false,
      subtitle: 'vs yesterday',
    },
    { 
      title: 'Attendance Rate', 
      value: '94%', 
      icon: <TrendingUp />, 
      color: '#ef4444',
      bgColor: alpha('#ef4444', 0.1),
      trend: '+3%',
      trendUp: true,
      subtitle: 'vs last week',
    },
  ];

  const upcomingHolidays = [
    { name: 'Independence Day', date: 'August 17, 2024', daysLeft: 12 },
    { name: 'New Year', date: 'January 1, 2025', daysLeft: 45 },
    { name: 'Chinese New Year', date: 'February 10, 2025', daysLeft: 75 },
  ];

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  const handleExport = () => {
    console.log('Export data');
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, mb: 0.5 }}>
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Welcome back! Here's what's happening with your workforce today.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Refresh">
            <IconButton onClick={handleRefresh}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Tooltip title="Export Report">
            <IconButton onClick={handleExport}>
              <Download />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Welcome Banner */}
      <Card
        sx={{
          mb: 4,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: 'white',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                Welcome back, Admin! 👋
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Here's your daily workforce summary for {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </Typography>
            </Box>
            <Button 
              variant="contained" 
              sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
              startIcon={<Assignment />}
            >
              View Full Report
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statsCards.map((stat, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
            <Card sx={{ position: 'relative', overflow: 'hidden', cursor: 'pointer', '&:hover': { transform: 'translateY(-4px)' } }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: stat.bgColor, color: stat.color, width: 48, height: 48 }}>
                    {stat.icon}
                  </Avatar>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {stat.trendUp ? (
                      <ArrowUpward sx={{ fontSize: 16, color: 'success.main' }} />
                    ) : (
                      <ArrowDownward sx={{ fontSize: 16, color: 'error.main' }} />
                    )}
                    <Typography variant="caption" sx={{ color: stat.trendUp ? 'success.main' : 'error.main', fontWeight: 600 }}>
                      {stat.trend}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="h3" sx={{ fontWeight: 700, mb: 0.5 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  {stat.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {stat.subtitle}
                </Typography>
                <LinearProgress 
                  variant="determinate" 
                  value={Math.random() * 100} 
                  sx={{ mt: 2, height: 4, borderRadius: 2, bgcolor: stat.bgColor, '& .MuiLinearProgress-bar': { bgcolor: stat.color } }}
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {/* Attendance Chart */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Attendance Overview
                </Typography>
                <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ minHeight: 32 }}>
                  <Tab label="Weekly" sx={{ minHeight: 32, py: 0 }} />
                  <Tab label="Monthly" sx={{ minHeight: 32, py: 0 }} />
                  <Tab label="Yearly" sx={{ minHeight: 32, py: 0 }} />
                </Tabs>
              </Box>
              <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={attendanceData}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorAbsent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Area type="monotone" dataKey="present" stackId="1" stroke="#6366f1" fill="url(#colorPresent)" />
                  <Area type="monotone" dataKey="absent" stackId="1" stroke="#ef4444" fill="url(#colorAbsent)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Department Distribution */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Department Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={departmentData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="employees"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {departmentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
              <Box sx={{ mt: 2 }}>
                {departmentData.map((dept) => (
                  <Box key={dept.name} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: dept.color }} />
                      <Typography variant="body2">{dept.name}</Typography>
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>{dept.employees} employees</Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Bottom Section */}
      <Grid container spacing={3}>
        {/* Leave Distribution */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 3 }}>
                Leave Distribution
              </Typography>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={leaveData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <ChartTooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {leaveData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 1 }}>
                {leaveData.map((item) => (
                  <Chip
                    key={item.name}
                    icon={item.icon}
                    label={`${item.name}: ${item.value}`}
                    size="small"
                    sx={{ bgcolor: alpha(item.color, 0.1), color: item.color, borderColor: item.color }}
                    variant="outlined"
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activities */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Recent Activities
                </Typography>
                <Button size="small" onClick={() => navigate('/activities')}>
                  View All
                </Button>
              </Box>
              <List sx={{ maxHeight: 350, overflow: 'auto' }}>
                {recentActivities.map((activity) => (
                  <React.Fragment key={activity.id}>
                    <ListItem sx={{ px: 0 }}>
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main }}>
                          {activity.avatar}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {activity.user}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {activity.action}
                            </Typography>
                            {activity.type && (
                              <Chip 
                                label={activity.type} 
                                size="small" 
                                icon={activity.type === 'Annual Leave' ? <BeachAccess /> : activity.type === 'Sick Leave' ? <Sick /> : <Favorite />}
                                sx={{ height: 20, fontSize: '0.7rem' }}
                              />
                            )}
                            {activity.position && (
                              <Chip label={activity.position} size="small" variant="outlined" />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {activity.time}
                          </Typography>
                        }
                      />
                      {activity.status && (
                        <ListItemSecondaryAction>
                          <Chip 
                            label={activity.status} 
                            size="small" 
                            color={activity.status === 'pending' ? 'warning' : 'success'}
                            sx={{ height: 20, fontSize: '0.7rem' }}
                          />
                        </ListItemSecondaryAction>
                      )}
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Upcoming Holidays */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Upcoming Holidays 🎉
              </Typography>
              {upcomingHolidays.map((holiday) => (
                <Box key={holiday.name} sx={{ mb: 2, p: 1.5, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
                  <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                    {holiday.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" display="block">
                    {holiday.date}
                  </Typography>
                  <Chip 
                    label={`${holiday.daysLeft} days left`} 
                    size="small" 
                    color="primary" 
                    sx={{ mt: 1, height: 20, fontSize: '0.7rem' }}
                  />
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Actions */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                {[
                  { title: 'Add Employee', icon: <People />, color: '#6366f1', path: '/employees/create' },
                  { title: 'Request Leave', icon: <EventNote />, color: '#10b981', path: '/leave/request' },
                  { title: 'View Reports', icon: <Assignment />, color: '#f59e0b', path: '/reports' },
                  { title: 'Settings', icon: <Work />, color: '#ef4444', path: '/settings' },
                ].map((action) => (
                  <Grid size={{ xs: 6, sm: 3 }} key={action.title}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => navigate(action.path)}
                      sx={{
                        py: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1,
                        borderColor: alpha(action.color, 0.3),
                        '&:hover': {
                          borderColor: action.color,
                          bgcolor: alpha(action.color, 0.05),
                        },
                      }}
                    >
                      <Avatar sx={{ bgcolor: alpha(action.color, 0.1), color: action.color }}>
                        {action.icon}
                      </Avatar>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {action.title}
                      </Typography>
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

export default Dashboard;