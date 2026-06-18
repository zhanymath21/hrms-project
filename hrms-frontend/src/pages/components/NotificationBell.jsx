// src/pages/components/NotificationBell.jsx
import React, { useState } from 'react';
import {
  IconButton,
  Badge,
  Menu,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Divider,
  Button,
  Chip,
  Tooltip,
  CircularProgress,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Pending as PendingIcon,
  Delete as DeleteIcon,
  DoneAll as DoneAllIcon,
} from '@mui/icons-material';
import { useNotification } from '../contexts/NotificationContext';
import { formatDate } from '../../utils/dateFormat';
import { useNavigate } from 'react-router-dom';

const NotificationBell = () => {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, fetchNotifications } = useNotification();
  const [anchorEl, setAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleOpen = async (event) => {
    setAnchorEl(event.currentTarget);
    setLoading(true);
    try {
      await fetchNotifications();
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationClick = async (notification) => {
    try {
      if (!notification.is_read) {
        await markAsRead(notification.id);
      }
      
      // Navigate based on notification type
      if (notification.type === 'leave_request' || notification.type === 'leave_approved' || notification.type === 'leave_rejected') {
        navigate('/leave');
      } else if (notification.type === 'attendance') {
        navigate('/attendance');
      } else if (notification.type === 'employee') {
        navigate('/employees');
      }
      
      handleClose();
    } catch (error) {
      console.error('Error handling notification click:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch(type) {
      case 'leave_approved':
        return <CheckCircleIcon sx={{ color: '#10b981' }} />;
      case 'leave_rejected':
        return <CancelIcon sx={{ color: '#ef4444' }} />;
      case 'leave_request':
        return <PendingIcon sx={{ color: '#f59e0b' }} />;
      default:
        return <NotificationsIcon sx={{ color: '#6366f1' }} />;
    }
  };

  const getNotificationColor = (type) => {
    switch(type) {
      case 'leave_approved': return '#10b981';
      case 'leave_rejected': return '#ef4444';
      case 'leave_request': return '#f59e0b';
      default: return '#6366f1';
    }
  };

  // 🔥 PERBAIKAN: Handle jika notifications undefined
  const safeNotifications = Array.isArray(notifications) ? notifications : [];
  const safeUnreadCount = typeof unreadCount === 'number' ? unreadCount : 0;

  return (
    <>
      <Tooltip title="Notifications">
        <IconButton color="inherit" onClick={handleOpen}>
          <Badge badgeContent={safeUnreadCount} color="error">
            <NotificationsIcon />
          </Badge>
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            width: 380,
            maxHeight: 500,
            mt: 1.5,
            borderRadius: 2,
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
          },
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Notifications
          </Typography>
          {safeUnreadCount > 0 && (
            <Button 
              size="small" 
              startIcon={<DoneAllIcon />} 
              onClick={async () => {
                try {
                  await markAllAsRead();
                } catch (error) {
                  console.error('Error marking all as read:', error);
                }
              }}
            >
              Mark all read
            </Button>
          )}
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : safeNotifications.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
            <Typography color="textSecondary">No notifications</Typography>
          </Box>
        ) : (
          <List sx={{ p: 0 }}>
            {safeNotifications.map((notification, index) => (
              <React.Fragment key={notification.id || index}>
                <ListItem
                  onClick={() => handleNotificationClick(notification)}
                  sx={{
                    bgcolor: notification.is_read ? 'transparent' : 'action.hover',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: 'action.selected' },
                    py: 1.5,
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: `${getNotificationColor(notification.type)}15` }}>
                      {getNotificationIcon(notification.type)}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Typography variant="body2" sx={{ fontWeight: notification.is_read ? 400 : 600 }}>
                        {notification.title || 'Notification'}
                      </Typography>
                    }
                    secondary={
                      <>
                        <Typography variant="caption" color="textSecondary" component="span">
                          {notification.message || 'No message'}
                        </Typography>
                        <br />
                        <Typography variant="caption" color="textSecondary">
                          {notification.created_at ? formatDate(notification.created_at) : ''}
                        </Typography>
                      </>
                    }
                  />
                  {!notification.is_read && (
                    <Chip label="New" size="small" color="primary" sx={{ height: 20, fontSize: 10 }} />
                  )}
                </ListItem>
                {index < safeNotifications.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}

        <Box sx={{ p: 1, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
          <Button 
            size="small" 
            onClick={() => {
              navigate('/notifications');
              handleClose();
            }}
          >
            View All Notifications
          </Button>
        </Box>
      </Menu>
    </>
  );
};

export default NotificationBell;