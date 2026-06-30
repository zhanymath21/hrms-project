// src/utils/employeeUtils.js

export const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const getStatusColor = (status) => {
  const colors = {
    active: 'success',
    inactive: 'default',
    suspended: 'warning',
    terminated: 'error',
    resigned: 'warning',
  };
  return colors[status] || 'default';
};

export const getStatusLabel = (status) => {
  const labels = {
    active: 'Active',
    inactive: 'Inactive',
    suspended: 'Suspended',
    terminated: 'Terminated',
    resigned: 'Resigned',
  };
  return labels[status] || status;
};

export const getEmploymentTypeLabel = (type) => {
  const labels = {
    full_time: 'Full Time',
    part_time: 'Part Time',
    contract: 'Contract',
    intern: 'Intern'
  };
  return labels[type] || type;
};

export const calculateDateRange = (preset) => {
  const now = new Date();
  let start = '';
  let end = '';

  switch (preset) {
    case 'today':
      const today = new Date();
      start = today.toISOString().split('T')[0];
      end = today.toISOString().split('T')[0];
      break;
    case 'yesterday':
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      start = yesterday.toISOString().split('T')[0];
      end = yesterday.toISOString().split('T')[0];
      break;
    case 'this_week':
      const startOfWeek = new Date(now);
      const day = now.getDay() || 7;
      startOfWeek.setDate(now.getDate() - day + 1);
      start = startOfWeek.toISOString().split('T')[0];
      end = new Date().toISOString().split('T')[0];
      break;
    case 'last_week':
      const startLastWeek = new Date(now);
      const dayLast = now.getDay() || 7;
      startLastWeek.setDate(now.getDate() - dayLast - 6);
      const endLastWeek = new Date(now);
      endLastWeek.setDate(now.getDate() - dayLast);
      start = startLastWeek.toISOString().split('T')[0];
      end = endLastWeek.toISOString().split('T')[0];
      break;
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      end = new Date().toISOString().split('T')[0];
      break;
    case 'last_month':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
      end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
      break;
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
      end = new Date().toISOString().split('T')[0];
      break;
    default:
      start = '';
      end = '';
  }

  return { startDate: start, endDate: end };
};