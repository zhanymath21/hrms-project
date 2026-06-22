// src/layouts/MainLayout.jsx
import React, { useState } from 'react';
import {
  AppBar,
  Box,
  CssBaseline,
  Drawer,
  IconButton,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  Avatar,
  Menu,
  MenuItem,
  Divider,
  Tooltip,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  Work,
  Settings,
  AccountCircle,
  Logout,
  ChevronLeft,
  ChevronRight,
  Brightness4,
  Brightness7,
  Search,
  EventNote as AttendanceIcon,
  Schedule as ScheduleIcon,
  LocationOn as LocationOnIcon,
  Assessment as ReportIcon,
  Umbrella as LeaveIcon,
  Business as DepartmentIcon,
  BadgeOutlined as PositionIcon,
  TrendingDown as TrendingDownIcon,
  Inventory as InventoryIcon,
  Description as DocumentIcon,
  Add as AddIcon,
  Shield as ShieldIcon,
  Category as CategoryIcon,
  PersonAdd as PersonAddIcon,
  Article as ArticleIcon,
  FileCopy as FileCopyIcon,
  HowToReg as HowToRegIcon,
  ReportProblem as IncidentIcon, 
  Warning as WarningIcon, 
   Healing as HealingIcon, 
  WarningAmber as WarningAmberIcon, 
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import NotificationBell from '../pages/components/NotificationBell';

const drawerWidth = 280;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/', color: '#6366f1' },
  { 
    text: 'Employees', 
    icon: <People />, 
    path: '/employees', 
    color: '#10b981',
    children: [
      { text: '👥 All Employees', path: '/employees', icon: <People /> },
      { text: '➕ Add Employee', path: '/employees/create', icon: <AddIcon /> },
      { text: '📦 Assets & Documents', path: '/employee-assets', icon: <InventoryIcon /> },
      { text: '📊 Turnover', path: '/turnover', icon: <TrendingDownIcon /> },
    ]
  },
  { 
    text: 'Departments', 
    icon: <DepartmentIcon />, 
    path: '/departments', 
    color: '#f59e0b',
    children: [
      { text: 'All Departments', path: '/departments', icon: <DepartmentIcon /> },
      { text: 'Positions', path: '/positions', icon: <PositionIcon /> },
    ]
  },
  {
    text: 'Attendance',
    icon: <AttendanceIcon />,
    color: '#3b82f6',
    children: [
      { text: 'Attendance', icon: <AttendanceIcon />, path: '/attendance', color: '#3b82f6' },
      { text: 'Attendance Report', icon: <ReportIcon />, path: '/attendance-report', color: '#8b5cf6' },
      { text: 'Work Schedules', icon: <ScheduleIcon />, path: '/schedules', color: '#8b5cf6' },
      { text: 'Office Locations', icon: <LocationOnIcon />, path: '/locations', color: '#f59e0b' },
      { text: 'Leave', icon: <LeaveIcon />, path: '/leave', color: '#ef4444' },
    ],
  },
  {
    text: 'Recruitment',
    icon: <PersonAddIcon />,
    color: '#ec4899',
    children: [
      { text: 'Candidates', icon: <PersonAddIcon />, path: '/candidates', color: '#ec4899' },
      { text: 'Candidate CV', icon: <DocumentIcon />, path: '/candidates/cv', color: '#f59e0b' },
      { text: 'Job Vacancies', icon: <ArticleIcon />, path: '/vacancies', color: '#3b82f6' },
      { text: 'Applications', icon: <FileCopyIcon />, path: '/applications', color: '#8b5cf6' },
      { text: 'Onboarding', icon: <HowToRegIcon />, path: '/onboarding', color: '#10b981' },
    ],
  },
  { 
    text: 'PPE Management', 
    icon: <ShieldIcon />, 
    path: '/ppe', 
    color: '#f59e0b',
    children: [
      { text: 'PPE List', path: '/ppe', icon: <ShieldIcon /> },
      { text: 'PPE Categories', path: '/ppe/categories', icon: <CategoryIcon /> },
    ]
  },
    { 
    text: 'Safety',
    icon: <HealingIcon />,
    color: '#ef4444',
    children: [
      { text: 'All Incidents', path: '/incident-reports', icon: <WarningIcon /> },
      { text: 'Report Incident', path: '/incident-reports/create', icon: <AddIcon /> },
      { text: 'Lost Time Injury', path: '/lost-time-injuries', icon: <HealingIcon /> },
    ]
  },
  { text: 'Settings', icon: <Settings />, path: '/settings', color: '#8b5cf6' },
];

const MainLayout = ({ children }) => {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const handleDrawerOpen = () => setOpen(true);
  const handleDrawerClose = () => setOpen(false);
  const handleMenuOpen = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('device_type');
    navigate('/login');
  };

  const handleSubmenuToggle = (text) => {
    setExpandedMenu(expandedMenu === text ? null : text);
  };

  const isMenuActive = (item) => {
    if (item.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(item.path);
  };

  const isAdmin = true;

  const filteredMenuItems = menuItems.filter(item => {
    if (!isAdmin && (item.path === '/schedules' || item.path === '/locations' || item.path === '/attendance-report')) {
      return false;
    }
    return true;
  });

  // 🔥 Safe alpha function
  const getAlphaColor = (color, opacity) => {
    if (!color) return `rgba(99, 102, 241, ${opacity})`;
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return color;
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* 🔥 APP BAR - Tanpa styled */}
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{
          backgroundColor: '#6366f1',
          background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
          zIndex: 1200,
          width: { sm: `calc(100% - ${open ? drawerWidth : 80}px)` },
          ml: { sm: `${open ? drawerWidth : 80}px` },
          transition: 'all 0.3s ease',
        }}
      >
        <Toolbar sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton color="inherit" onClick={handleDrawerOpen} edge="start"
              sx={{ mr: 2, display: { xs: 'block', md: open ? 'none' : 'block' } }}>
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap sx={{ fontWeight: 700 }}>HRMS System</Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Search"><IconButton color="inherit"><Search /></IconButton></Tooltip>
            <Tooltip title={darkMode ? 'Light Mode' : 'Dark Mode'}>
              <IconButton color="inherit" onClick={() => setDarkMode(!darkMode)}>
                {darkMode ? <Brightness7 /> : <Brightness4 />}
              </IconButton>
            </Tooltip>
            <NotificationBell />
            <Tooltip title="Account">
              <IconButton onClick={handleMenuOpen} sx={{ p: 0.5 }}>
                <Avatar sx={{ width: 40, height: 40, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>A</Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}
        PaperProps={{ sx: { mt: 1.5, width: 200, borderRadius: 2 } }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}>
        <MenuItem onClick={() => { navigate('/profile'); handleMenuClose(); }}>
          <AccountCircle sx={{ mr: 1 }} /> Profile
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}><Logout sx={{ mr: 1 }} /> Logout</MenuItem>
      </Menu>

      {/* 🔥 DRAWER - Tanpa styled */}
      <Drawer 
        variant="permanent" 
        open={open}
        sx={{
          width: open ? drawerWidth : 80,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : 80,
            boxSizing: 'border-box',
            transition: 'all 0.3s ease',
            overflowX: 'hidden',
            borderRight: 'none',
            background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,250,252,0.98) 100%)',
            boxShadow: '2px 0 12px rgba(0,0,0,0.05)',
          },
        }}
      >
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          minHeight: 64,
          px: 2,
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {open && (
              <Typography variant="h6" sx={{ 
                fontWeight: 800, 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}>
                HRMS Portal
              </Typography>
            )}
            <IconButton onClick={handleDrawerClose} size="small">
              {open ? <ChevronLeft /> : <ChevronRight />}
            </IconButton>
          </Box>
        </Box>
        
        <Divider sx={{ mx: 2, mb: 2 }} />
        
        <List sx={{ px: 2 }}>
          {filteredMenuItems.map((item) => {
            const isActive = isMenuActive(item);
            const hasChildren = item.children && item.children.length > 0;
            const isExpanded = expandedMenu === item.text;

            return (
              <React.Fragment key={item.text}>
                <ListItem disablePadding sx={{ mb: 0.5 }}>
                  <ListItemButton
                    onClick={() => hasChildren ? handleSubmenuToggle(item.text) : navigate(item.path)}
                    sx={{
                      borderRadius: 2,
                      py: 1.5,
                      px: 2,
                      minHeight: 48,
                      justifyContent: open ? 'initial' : 'center',
                      backgroundColor: isActive ? getAlphaColor(item.color, 0.1) : 'transparent',
                      color: isActive ? item.color : '#1e293b',
                      '&:hover': { 
                        backgroundColor: getAlphaColor(item.color, 0.08),
                        transform: 'translateX(4px)',
                        transition: 'all 0.2s ease',
                      },
                    }}
                  >
                    <Box sx={{ 
                      minWidth: 0, 
                      mr: open ? 2 : 'auto',
                      display: 'flex',
                      justifyContent: 'center',
                      color: isActive ? item.color : 'inherit',
                    }}>
                      {item.icon}
                    </Box>
                    {open && (
                      <>
                        <ListItemText 
                          primary={item.text} 
                          primaryTypographyProps={{ 
                            sx: { 
                              fontWeight: isActive ? 700 : 500,
                              fontSize: '0.9rem',
                            } 
                          }} 
                        />
                        {hasChildren && (
                          <Box sx={{ 
                            fontSize: 18,
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s',
                          }}>
                            <ChevronRight />
                          </Box>
                        )}
                      </>
                    )}
                  </ListItemButton>
                </ListItem>

                {hasChildren && isExpanded && open && (
                  <Box sx={{ pl: 4, mb: 1 }}>
                    {item.children.map((child) => {
                      const isChildActive = location.pathname === child.path;
                      return (
                        <ListItem key={child.text} disablePadding sx={{ mb: 0.5 }}>
                          <ListItemButton 
                            onClick={() => navigate(child.path)}
                            sx={{
                              borderRadius: 2,
                              py: 1,
                              px: 2,
                              backgroundColor: isChildActive ? getAlphaColor(item.color, 0.08) : 'transparent',
                              '&:hover': { backgroundColor: getAlphaColor(item.color, 0.05) },
                            }}
                          >
                            <Box sx={{ minWidth: 24, color: isChildActive ? item.color : '#64748b' }}>
                              {child.icon || <ChevronRight fontSize="small" />}
                            </Box>
                            <ListItemText 
                              primary={child.text}
                              primaryTypographyProps={{
                                sx: {
                                  fontSize: '0.82rem',
                                  fontWeight: isChildActive ? 600 : 400,
                                  color: isChildActive ? item.color : '#64748b',
                                }
                              }}
                            />
                          </ListItemButton>
                        </ListItem>
                      );
                    })}
                  </Box>
                )}
              </React.Fragment>
            );
          })}
        </List>

        <Box sx={{ flexGrow: 1 }} />
        
        {open && (
          <Box sx={{ p: 2, m: 1, borderRadius: 2, bgcolor: 'rgba(99, 102, 241, 0.05)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: '#6366f1' }}>A</Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Admin User</Typography>
                <Typography variant="caption" color="text.secondary">Administrator</Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* 🔥 MAIN CONTENT */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { xs: '100%', md: `calc(100% - ${open ? drawerWidth : 80}px)` },
          transition: 'all 0.3s ease',
          minHeight: '100vh',
          bgcolor: '#f8fafc',
          mt: '64px',
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout;