// src/pages/contexts/NotificationContext.jsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import api from '../../services/axios';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Check auth token
  const checkAuth = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      console.log('No token found, skipping notification fetch');
      return false;
    }
    return true;
  };

  const fetchNotifications = async () => {
    if (!checkAuth()) return;
    
    try {
      const response = await api.get('/notifications');
      if (response.data.status === 'success') {
        setNotifications(response.data.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      if (err.response?.status !== 401) {
        // Only log non-auth errors
        console.error('Error details:', err.response?.data);
      }
    }
  };

  const fetchUnreadCount = async () => {
    if (!checkAuth()) return;
    
    try {
      const response = await api.get('/notifications/unread-count');
      if (response.data.status === 'success') {
        setUnreadCount(response.data.data.unread_count || 0);
      }
    } catch (err) {
      console.error('Failed to fetch unread count:', err);
      if (err.response?.status !== 401) {
        console.error('Error details:', err.response?.data);
      }
    }
  };

  const markAsRead = async (id) => {
    if (!checkAuth()) return;
    
    try {
      await api.put(`/notifications/${id}/read`);
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const markAllAsRead = async () => {
    if (!checkAuth()) return;
    
    try {
      await api.put('/notifications/read-all');
      await fetchNotifications();
      await fetchUnreadCount();
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  // Only fetch if token exists
  useEffect(() => {
    if (checkAuth()) {
      fetchNotifications();
      fetchUnreadCount();
      
      // Poll every 30 seconds
      const interval = setInterval(() => {
        if (checkAuth()) {
          fetchUnreadCount();
        }
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      fetchNotifications,
      fetchUnreadCount,
      markAsRead,
      markAllAsRead,
    }}>
      {children}
    </NotificationContext.Provider>
  );
};