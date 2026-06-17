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
  alpha,
  useTheme,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  People,
  Work,
  EventNote,
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
  EventNote as LeaveIcon,
  Business as DepartmentIcon,        
  BadgeOutlined as PositionIcon,   
  TrendingDown as TrendingDownIcon,
  Inventory as InventoryIcon,       // ✅ Untuk Assets
  Description as DocumentIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
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
      { text: '👥 All Employees', path: '/employees' },
      { text: '➕ Add Employee', path: '/employees/create' },
      // { text: '🏢 Departments & Positions', path: '/departments' },
      { text: '📦 Assets & Documents', path: '/employee-assets' },
      { text: '📊 Turnover', path: '/turnover' },
    ]
  },
  { 
    text: 'Departments', 
    icon: <DepartmentIcon />, 
    path: '/departments', 
    color: '#f59e0b',
    children: [
      { text: 'All Departments', path: '/departments', icon: <DepartmentIcon /> },
      { text: 'Positions', path: '/departments?tab=positions', icon: <PositionIcon /> },
    ]
  },
  { text: 'Attendance', icon: <AttendanceIcon />, path: '/attendance', color: '#3b82f6' },
  { text: 'Attendance Report', icon: <ReportIcon />, path: '/attendance-report', color: '#8b5cf6' },
  { text: 'Work Schedules', icon: <ScheduleIcon />, path: '/schedules', color: '#8b5cf6' },
  { text: 'Office Locations', icon: <LocationOnIcon />, path: '/locations', color: '#f59e0b' },
  { text: 'Leave', icon: <LeaveIcon />, path: '/leave', color: '#ef4444' },
  { text: 'Settings', icon: <Settings />, path: '/settings', color: '#8b5cf6' },
];

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
}));

const GlassAppBar = styled(AppBar)(({ theme }) => ({
  background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.9)} 0%, ${alpha(
    theme.palette.primary.dark,
    0.9
  )} 100%)`,
  backdropFilter: 'blur(10px)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
}));

const MainLayout = ({ children }) => {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [expandedMenu, setExpandedMenu] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();

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

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      
      <GlassAppBar position="fixed" elevation={0}>
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
      </GlassAppBar>

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

      <Drawer variant="permanent" open={open}
        sx={{
          width: open ? drawerWidth : 80, flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : 80, boxSizing: 'border-box',
            transition: theme.transitions.create('width', {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            overflowX: 'hidden', borderRight: 'none',
            background: `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.98)} 0%, ${alpha(theme.palette.background.default, 0.98)} 100%)`,
            boxShadow: '2px 0 12px rgba(0,0,0,0.05)',
          },
        }}>
        <DrawerHeader sx={{ justifyContent: 'center', py: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {open && (
              <Typography variant="h6" sx={{ fontWeight: 800, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                HRMS Portal
              </Typography>
            )}
            <IconButton onClick={handleDrawerClose} size="small">
              {open ? <ChevronLeft /> : <ChevronRight />}
            </IconButton>
          </Box>
        </DrawerHeader>
        
        <Divider sx={{ mx: 2, mb: 2 }} />
        
        {/* MENU LIST */}
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
                      borderRadius: 2, py: 1.5, px: 2, minHeight: 48,
                      justifyContent: open ? 'initial' : 'center',
                      backgroundColor: isActive ? alpha(item.color, 0.1) : 'transparent',
                      color: isActive ? item.color : 'text.primary',
                      '&:hover': { backgroundColor: alpha(item.color, 0.08), transform: 'translateX(4px)', transition: 'all 0.2s ease' },
                    }}>
                    <ListItemIcon sx={{ minWidth: 0, mr: open ? 2 : 'auto', justifyContent: 'center', color: isActive ? item.color : 'inherit' }}>
                      {item.icon}
                    </ListItemIcon>
                    {open && (
                      <>
                        <ListItemText primary={item.text} primaryTypographyProps={{ sx: { fontWeight: isActive ? 700 : 500, fontSize: '0.9rem' } }} />
                        {hasChildren && (
                          <ChevronRight sx={{ fontSize: 18, transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
                        )}
                      </>
                    )}
                  </ListItemButton>
                </ListItem>

                {/* SUBMENU */}
                {hasChildren && isExpanded && open && (
                  <Box sx={{ pl: 4, mb: 1 }}>
                    {item.children.map((child) => {
                      const isChildActive = location.pathname === child.path;
                      return (
                        <ListItem key={child.text} disablePadding sx={{ mb: 0.5 }}>
                          <ListItemButton onClick={() => navigate(child.path)}
                            sx={{
                              borderRadius: 2, py: 1, px: 2,
                              backgroundColor: isChildActive ? alpha(item.color, 0.08) : 'transparent',
                              '&:hover': { backgroundColor: alpha(item.color, 0.05) },
                            }}>
                            <ListItemIcon sx={{ minWidth: 24, color: isChildActive ? item.color : 'text.secondary' }}>
                              {/* ✅ GUNAKAN CHILD.ICON */}
                              {child.icon || <ChevronRight fontSize="small" />}
                            </ListItemIcon>
                            <ListItemText primary={child.text}
                              primaryTypographyProps={{
                                sx: { fontSize: '0.82rem', fontWeight: isChildActive ? 600 : 400, color: isChildActive ? item.color : 'text.secondary' }
                              }} />
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
          <Box sx={{ p: 2, m: 1, borderRadius: 2, bgcolor: alpha(theme.palette.primary.main, 0.05) }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Avatar sx={{ width: 40, height: 40, bgcolor: 'primary.main' }}>A</Avatar>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>Admin User</Typography>
                <Typography variant="caption" color="text.secondary">Administrator</Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Drawer>

      <Box component="main"
        sx={{
          flexGrow: 1, p: 3,
          width: { xs: '100%', md: `calc(100% - ${open ? drawerWidth : 80}px)` },
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          minHeight: '100vh', bgcolor: 'background.default',
        }}>
        <DrawerHeader />
        {children}
      </Box>
    </Box>
  );
};

export default MainLayout;