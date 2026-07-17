// src/utils/dateFormat.js

import { format } from 'date-fns';

export const formatDate = (date, formatStr = 'yyyy-MM-dd') => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return format(d, formatStr);
};

export const formatDateTime = (date) => {
  if (!date) return '-';
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return format(d, 'yyyy-MM-dd HH:mm:ss');
};

export const formatTime = (time) => {
  if (!time) return '-';
  // Handle time string (HH:MM:SS)
  if (typeof time === 'string') {
    // Remove seconds if present
    const parts = time.split(':');
    if (parts.length >= 2) {
      return `${parts[0]}:${parts[1]}`;
    }
    return time;
  }
  // Handle Date object
  if (time instanceof Date) {
    return format(time, 'HH:mm');
  }
  return '-';
};

export const formatCurrency = (amount, currency = 'IDR') => {
  if (!amount && amount !== 0) return '-';
  
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatUSD = (amount) => {
  if (!amount && amount !== 0) return '-';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatPhoneNumber = (phone) => {
  if (!phone) return '-';
  // Format Indonesian phone number
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+62' + cleaned.substring(1);
  }
  return cleaned;
};

export const getRelativeTime = (date) => {
  if (!date) return '-';
  const now = new Date();
  const past = new Date(date);
  const diffInSeconds = Math.floor((now - past) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(date);
};

export const parseTimeString = (timeStr) => {
  if (!timeStr) return null;
  const parts = timeStr.split(':');
  if (parts.length >= 2) {
    return {
      hours: parseInt(parts[0]),
      minutes: parseInt(parts[1]),
      seconds: parts[2] ? parseInt(parts[2]) : 0
    };
  }
  return null;
};

export const timeToMinutes = (timeStr) => {
  const parsed = parseTimeString(timeStr);
  if (!parsed) return 0;
  return (parsed.hours * 60) + parsed.minutes;
};

export const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

// ✅ TAMBAHKAN FUNGSI INI
export const getWorkingDays = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  let count = 0;
  const current = new Date(start);
  
  // Reset time to avoid timezone issues
  current.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // Not Sunday (0) or Saturday (6)
      count++;
    }
    current.setDate(current.getDate() + 1);
  }
  
  return count;
};

// ✅ TAMBAHKAN FUNGSI INI
export const getDaysBetween = (startDate, endDate) => {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1;
};

// ✅ TAMBAHKAN FUNGSI INI
export const isWeekend = (date) => {
  if (!date) return false;
  const d = new Date(date);
  const day = d.getDay();
  return day === 0 || day === 6;
};

// ✅ TAMBAHKAN FUNGSI INI
export const addDays = (date, days) => {
  if (!date) return null;
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};